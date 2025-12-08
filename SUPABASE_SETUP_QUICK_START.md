# Supabase Setup - Quick Start Guide

## ✅ What's Already Done

1. ✅ Code implementation complete
2. ✅ Supabase client installed (`@supabase/supabase-js`)
3. ✅ Services created and integrated
4. ✅ Environment variables added to `env.example`

## 🚀 What You Need to Do in Supabase

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (secret key - use this one!)
   - **Anon Key** (public key)

5. Add to your `.env` file:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Step 2: Enable pgvector Extension

1. In Supabase dashboard, go to **Database** → **Extensions**
2. Search for `vector`
3. Click **Enable** ✅

**OR** use SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### Step 3: Create the Table

Go to **SQL Editor** in Supabase and run this:

```sql
-- Create prompt_chunks table
CREATE TABLE IF NOT EXISTS prompt_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  source_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompt_chunks_active ON prompt_chunks(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_chunks_source ON prompt_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_prompt_chunks_usage ON prompt_chunks(last_used_at DESC);

-- Create vector index (IMPORTANT for fast searches!)
CREATE INDEX IF NOT EXISTS prompt_chunks_embedding_idx 
ON prompt_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

### Step 4: Create the Search Function

Still in **SQL Editor**, run this:

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
    1 - (pc.embedding <=> query_embedding) as similarity,
    pc.created_at,
    pc.is_active
  FROM prompt_chunks pc
  WHERE 
    (filter_active = false OR pc.is_active = true)
    AND (1 - (pc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### Step 5: Verify Setup

Run these checks in SQL Editor:

```sql
-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'prompt_chunks'
);

-- Check function exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'match_prompt_chunks'
);
```

All should return `true` or show results.

---

### Step 6: Test It!

1. **Restart your server:**
```bash
npm run dev
```

2. **Save a prompt via API** (or dashboard):
```bash
POST /api/v1/ai-config
{
  "systemPrompt": "Your large prompt here...",
  "systemPromptActive": true
}
```

3. **Check Supabase** - Go to **Table Editor** → `prompt_chunks`:
   - You should see chunks being created!

4. **Send a chat message** and check server logs:
   - Look for: `✅ USING SUPABASE VECTOR DB - RELEVANT CHUNKS RETRIEVED`

---

## 📋 Summary Checklist

- [ ] Get Supabase credentials (URL, Service Role Key, Anon Key)
- [ ] Add credentials to `.env` file
- [ ] Enable `vector` extension in Supabase
- [ ] Run SQL to create `prompt_chunks` table
- [ ] Run SQL to create `match_prompt_chunks` function
- [ ] Verify setup with test queries
- [ ] Test by saving a prompt
- [ ] Test by sending a chat message

---

## 🆘 Troubleshooting

**Error: Cannot find module**
- ✅ Fixed! The import path has been corrected.

**Error: Function match_prompt_chunks does not exist**
- Make sure you ran the SQL function creation script
- Check SQL Editor for any errors

**No chunks being created**
- Check `.env` file has correct Supabase credentials
- Check server logs for errors
- Verify prompt is >500 words and `systemPromptActive = true`

**Vector search not working**
- Verify `vector` extension is enabled
- Check if vector index was created: `SELECT * FROM pg_indexes WHERE tablename = 'prompt_chunks';`

---

## 📚 Full Documentation

See `SUPABASE_VECTOR_SETUP.md` for complete documentation.

---

**That's it! Once you complete these steps in Supabase, your application will automatically:**
- ✅ Store prompt chunks when you save prompts
- ✅ Retrieve relevant chunks when users chat
- ✅ Use only recent/active prompts for faster searches

