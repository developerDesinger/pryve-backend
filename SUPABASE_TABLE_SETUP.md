# Supabase Table Setup - Quick Fix

## ⚠️ Error You're Seeing

```
Could not find the table 'public.prompt_chunks' in the schema cache
```

This means the `prompt_chunks` table doesn't exist in your Supabase database yet.

## ✅ Quick Fix

### Step 1: Go to Supabase SQL Editor

1. Open your Supabase project: https://app.supabase.com
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Run This SQL Script

Copy and paste this entire script into the SQL Editor:

```sql
-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

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

### Step 3: Click "Run" (or press Ctrl+Enter)

Wait for it to complete - you should see "Success. No rows returned"

### Step 4: Verify Table Was Created

Run this query to verify:

```sql
SELECT COUNT(*) FROM prompt_chunks;
```

You should see `0` (table exists but is empty).

## ✅ That's It!

Now try uploading your prompt again. The table exists, so it should work!

## 🔧 Additional: Memory Fix

I've also fixed the memory issue by:
- Reducing batch sizes for embedding generation (10 instead of 100)
- Processing chunks in smaller batches
- Adding memory cleanup between batches
- Increasing Node.js memory limit to 4GB

The system will now:
- ✅ Process embeddings in smaller batches (prevents memory crashes)
- ✅ Store chunks incrementally (reduces memory usage)
- ✅ Give better error messages if table is missing

## 📝 Next Steps

1. Create the table (steps above)
2. Try uploading your prompt again
3. Check server logs for progress messages
4. You should see: `✅ Stored X chunks in Supabase Vector DB`

