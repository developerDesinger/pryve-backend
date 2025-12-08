# Supabase Vector DB Setup Guide

This guide explains how to set up Supabase Vector DB for storing and retrieving relevant parts of your 250K-word prompts.

## Overview

Instead of sending the entire 250K-word prompt to OpenAI every time, the system now:
1. Splits your prompt into smaller chunks (1000 words per chunk)
2. Generates embeddings (vector representations) for each chunk using OpenAI
3. Stores chunks with embeddings in **Supabase Vector DB**
4. Retrieves only relevant chunks using **vector similarity search** (only recent/active prompts)
5. Uses only those chunks as context (instead of full prompt)

## Prerequisites

1. **Supabase Account** - Sign up at https://supabase.com
2. **OpenAI API Key** - Required for generating embeddings
3. **Supabase Project** - Create a new project or use existing one

---

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (keep this secret!)
   - **Anon Key** (public key)

4. Add these to your `.env` file:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Step 2: Enable pgvector Extension in Supabase

Supabase uses PostgreSQL with pgvector extension. You need to enable it:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Navigate to **Database** → **Extensions**
3. Search for `vector`
4. Click **Enable** on the `vector` extension

### Option B: Using SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Verify it's enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Step 3: Create the prompt_chunks Table

Go to **SQL Editor** in Supabase and run this SQL:

```sql
-- Create prompt_chunks table
CREATE TABLE IF NOT EXISTS prompt_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  
  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  source_id TEXT,
  
  -- Recent prompts management
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_chunks_active ON prompt_chunks(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_chunks_source ON prompt_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_prompt_chunks_usage ON prompt_chunks(last_used_at DESC);

-- Create vector index for similarity search (IMPORTANT!)
CREATE INDEX IF NOT EXISTS prompt_chunks_embedding_idx 
ON prompt_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Note:** The vector index (`ivfflat`) is crucial for fast similarity searches. It may take a few minutes to build if you have many chunks.

---

## Step 4: Create Vector Similarity Search Function

Create an RPC function for efficient vector similarity search. Run this in **SQL Editor**:

```sql
-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_prompt_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 3,
  filter_active boolean DEFAULT true,
  recent_limit int DEFAULT 1000
)
RETURNS TABLE (
  id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float,
  created_at timestamptz,
  is_active boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.content,
    pc.chunk_index,
    pc.metadata,
    -- Calculate cosine similarity (1 - cosine distance)
    1 - (pc.embedding <=> query_embedding) as similarity,
    pc.created_at,
    pc.is_active
  FROM prompt_chunks pc
  WHERE 
    -- Filter only active prompts if requested
    (filter_active = false OR pc.is_active = true)
    -- Minimum similarity threshold
    AND (1 - (pc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY 
    -- Order by similarity (most similar first)
    pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**What this function does:**
- Takes a query embedding (user's question as vector)
- Finds chunks with similar embeddings (cosine similarity)
- Filters by minimum similarity threshold
- Returns only active/recent prompts
- Orders by similarity (most relevant first)

---

## Step 5: Set Up Row Level Security (RLS) - Optional

If you want to secure the table, you can enable RLS:

```sql
-- Enable RLS
ALTER TABLE prompt_chunks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to do everything
-- (Service role key bypasses RLS, but this is good practice)
CREATE POLICY "Service role can do everything"
ON prompt_chunks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

**Note:** Since we're using the Service Role Key in the application, RLS is bypassed. This is fine for server-side operations.

---

## Step 6: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check if vector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'prompt_chunks'
);

-- Check if function exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'match_prompt_chunks'
);

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prompt_chunks';
```

---

## Step 7: Test the Setup

After setting up your `.env` file and running the SQL scripts, test the setup:

1. **Install dependencies:**
```bash
npm install
```

2. **Save a test prompt** via your API:
```bash
POST /api/v1/ai-config
{
  "systemPrompt": "Your 250K word prompt here...",
  "systemPromptActive": true
}
```

3. **Check Supabase** to see if chunks were created:
```sql
SELECT COUNT(*) FROM prompt_chunks;
SELECT * FROM prompt_chunks LIMIT 5;
```

4. **Send a chat message** and check logs for:
   - `✅ USING SUPABASE VECTOR DB - RELEVANT CHUNKS RETRIEVED`

---

## How It Works

### When Saving a Prompt

1. You save a prompt via `AIConfigService.createOrUpdateAIConfig()`
2. If prompt is active and >500 words:
   - System splits prompt into chunks (1000 words each, 200 word overlap)
   - Generates embeddings for each chunk using OpenAI
   - Stores chunks in Supabase `prompt_chunks` table
3. Full prompt is still saved in PostgreSQL `AIConfig` table (fallback)

### When Chatting

1. User sends a message: "How do I handle anxiety?"
2. System generates embedding for user query using OpenAI
3. System calls `match_prompt_chunks()` function in Supabase:
   - Searches for chunks with similar embeddings
   - Filters to only active/recent prompts
   - Returns top 3 most relevant chunks
4. System uses only those chunks as context (not full 250K prompt)
5. If no chunks found, falls back to full prompt

### Recent Prompts Management

- All prompts are stored in Supabase
- Only `is_active = true` prompts are searched
- System tracks `last_used_at` and `usage_count`
- Old prompts can be archived (`is_active = false`)
- Very old archived prompts can be deleted

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Vector DB Settings
SUPABASE_VECTOR_DB_TABLE=prompt_chunks
SUPABASE_VECTOR_DIMENSION=1536
SUPABASE_EMBEDDING_MODEL=text-embedding-3-small

# Recent Prompts Configuration
RECENT_PROMPTS_LIMIT=1000
PROMPT_RETENTION_DAYS=30
```

### Chunk Size

Default: 1000 words per chunk with 200 word overlap

To change, modify `PromptChunkingService.splitIntoChunks()`:
```javascript
static splitIntoChunks(text, chunkSize = 1000, overlap = 200)
```

### Retrieval Settings

In `chat.service.js`, you can adjust:
- `topK`: Number of chunks to retrieve (default: 3)
- `minSimilarity`: Minimum similarity threshold (default: 0.5)

```javascript
const relevantContext = await SupabaseVectorService.getRelevantPromptContext(
  content,
  3,    // topK
  0.5   // minSimilarity
);
```

---

## Maintenance

### Archive Old Prompts

Run this periodically (e.g., daily cron job):

```sql
-- Archive prompts older than 30 days
UPDATE prompt_chunks 
SET is_active = false 
WHERE created_at < NOW() - INTERVAL '30 days' 
AND is_active = true;
```

### Delete Very Old Prompts

```sql
-- Delete archived prompts older than 90 days
DELETE FROM prompt_chunks 
WHERE created_at < NOW() - INTERVAL '90 days' 
AND is_active = false;
```

### Check Statistics

```sql
-- Total chunks
SELECT COUNT(*) as total_chunks FROM prompt_chunks;

-- Active chunks
SELECT COUNT(*) as active_chunks FROM prompt_chunks WHERE is_active = true;

-- Most used chunks
SELECT content, usage_count, last_used_at 
FROM prompt_chunks 
ORDER BY usage_count DESC 
LIMIT 10;

-- Chunks by source
SELECT source_id, COUNT(*) as chunk_count 
FROM prompt_chunks 
GROUP BY source_id;
```

---

## Troubleshooting

### No Chunks Found

If system falls back to full prompt:
- Check if chunks exist: `SELECT COUNT(*) FROM prompt_chunks;`
- Verify prompt is active: Check `is_active = true`
- Check Supabase connection: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### Vector Search Not Working

- Verify pgvector extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- Check if vector index exists: `SELECT * FROM pg_indexes WHERE tablename = 'prompt_chunks';`
- Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'match_prompt_chunks';`

### Low Similarity Scores

If retrieved chunks have low similarity (< 0.5):
- Lower the `minSimilarity` threshold in code
- Increase `topK` to get more context
- Consider adjusting chunk size for better granularity

### Embedding Generation Errors

- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI API rate limits
- Ensure prompt text is not empty

### Connection Errors

- Verify Supabase URL format: `https://xxxxx.supabase.co` (no trailing slash)
- Check Service Role Key is correct (not Anon Key)
- Ensure Supabase project is active and not paused

---

## Performance Tips

1. **Vector Index**: The `ivfflat` index is crucial for performance. It may take time to build initially.

2. **Batch Operations**: When storing many chunks, they're inserted in batches of 100.

3. **Recent Prompts**: Filtering by `is_active = true` significantly improves search speed.

4. **Index Maintenance**: Rebuild index if performance degrades:
```sql
REINDEX INDEX prompt_chunks_embedding_idx;
```

---

## Next Steps

1. ✅ Set up Supabase project and get credentials
2. ✅ Enable pgvector extension
3. ✅ Create `prompt_chunks` table
4. ✅ Create `match_prompt_chunks` function
5. ✅ Add Supabase credentials to `.env`
6. ✅ Install npm dependencies: `npm install`
7. ✅ Test by saving a prompt via API
8. ✅ Test by sending a chat message

---

## Support

For issues:
- Check Supabase logs in dashboard
- Check application logs for errors
- Verify all SQL scripts ran successfully
- Test Supabase connection using Supabase dashboard

---

## Summary

**What you need to do in Supabase:**

1. ✅ Enable `vector` extension
2. ✅ Run SQL to create `prompt_chunks` table
3. ✅ Run SQL to create `match_prompt_chunks` function
4. ✅ Copy Supabase credentials to `.env` file
5. ✅ Test the setup

**The application will automatically:**
- Store prompt chunks when you save a prompt
- Retrieve relevant chunks when users chat
- Manage recent/active prompts
- Fall back to full prompt if vector DB unavailable

