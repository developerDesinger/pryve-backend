# Vector Prompt Setup Guide

This guide explains how to set up and use **pgvector** (PostgreSQL vector database extension) for storing and retrieving relevant parts of your large system prompts.

## Overview

Instead of sending the entire 250k-word prompt to OpenAI every time, the system now:
1. Splits your prompt into smaller chunks
2. Generates embeddings (vector representations) for each chunk using OpenAI
3. Stores chunks with **pgvector** (native vector type) in PostgreSQL
4. Retrieves only relevant chunks using **pgvector's native vector similarity search** (not JavaScript)

**Important:** This implementation uses **pgvector** for actual vector database operations, not JSON storage with JavaScript calculations.

## Prerequisites

1. **PostgreSQL Database** - Already set up ✓
2. **OpenAI API Key** - Required for generating embeddings
3. **pgvector Extension** - PostgreSQL extension for vector database operations (REQUIRED)

**Note:** Without pgvector extension, the system will fall back to JavaScript-based similarity search (slower, less efficient).

## Step-by-Step Setup

### Quick Setup (Recommended)

**All-in-one setup** - runs all steps automatically:

```bash
npm run setup:vector-db
```

This will:
1. Enable pgvector extension
2. Run Prisma migration (creates `prompt_chunks` table)
3. Convert embeddings to vector type
4. Create vector index

**Note:** Scripts automatically read `DATABASE_URL` from your `.env` file. Works in both development and production!

### Manual Setup (Step by Step)

If you prefer to run steps individually:

#### 1. Enable pgvector Extension (REQUIRED)

**This is essential** - without pgvector, you'll be using JSON storage with JavaScript calculations (slow).

**Using npm script (reads from .env):**
```bash
npm run setup:pgvector
```

**Or manually with SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Or using psql:**
```bash
psql -d your_database_name -f scripts/setup-pgvector.sql
```

**Verify it's installed:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### 2. Run Prisma Migration

Create and apply the database migration:

```bash
npm run db:migrate
# or
npx prisma migrate dev --name add_prompt_chunks_vector
```

This will create the `prompt_chunks` table.

#### 3. Convert Embedding Column to Vector Type (REQUIRED)

**This is required** to use pgvector for vector database operations.

**Using npm script (reads from .env):**
```bash
npm run convert:pgvector
```

**Or manually with SQL:**
```sql
-- Convert JSON embeddings to vector type
ALTER TABLE prompt_chunks 
ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;

-- Create index for faster vector searches
CREATE INDEX prompt_chunks_embedding_idx 
ON prompt_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Or using psql:**
```bash
psql -d your_database_name -f scripts/convert-to-pgvector.sql
```

**Note:** Without this conversion, embeddings are stored as JSON and similarity is calculated in JavaScript (much slower). With pgvector, PostgreSQL handles all vector operations natively.

### 4. Migrate Existing Prompts

If you already have a system prompt saved in the `AIConfig` table, migrate it to vector format:

```bash
npm run migrate:prompt-vector
```

Or directly:
```bash
node scripts/migrate-prompt-to-vector.js
```

This script will:
- Read your existing system prompt from the database (reads `DATABASE_URL` from `.env`)
- Split it into chunks (1000 words per chunk with 200 word overlap)
- Generate embeddings for each chunk using OpenAI (reads `OPENAI_API_KEY` from `.env`)
- Store chunks in the `prompt_chunks` table as vector type

### 5. Save New Prompts

When you save a new system prompt through the API (or directly in the database), the system will automatically:
- Save the full prompt in `AIConfig.systemPrompt`
- Create vector chunks if the prompt is active and large enough (>500 words)

## How It Works

### When Saving a Prompt

1. You save a prompt via `AIConfigService.createOrUpdateAIConfig()`
2. If the prompt is active and has content, it automatically creates vector chunks
3. Chunks are stored with embeddings in the `prompt_chunks` table

### When Chatting

1. User sends a message
2. System checks if vector chunks exist
3. If chunks exist and prompt is active:
   - Generates embedding for user's query using OpenAI
   - **Uses pgvector SQL query** to find top 3 most relevant chunks
   - PostgreSQL performs vector similarity search using `<=>` operator
   - Uses only those chunks as context (instead of full prompt)
4. If no chunks exist or prompt is inactive:
   - Falls back to using the full prompt
5. If pgvector query fails:
   - Falls back to JavaScript-based similarity search (slower)

## Configuration

### Chunk Size

Default: 1000 words per chunk with 200 word overlap

To change, modify `VectorPromptService.splitIntoChunks()`:
```javascript
static splitIntoChunks(text, chunkSize = 1000, overlap = 200)
```

### Retrieval Settings

In `chat.service.js`, you can adjust:
- `maxChunks`: Number of chunks to retrieve (default: 3)
- `minSimilarity`: Minimum similarity threshold (default: 0.5)

```javascript
const relevantContext = await VectorPromptService.getRelevantPromptContext(
  content,
  3,    // maxChunks
  0.5   // minSimilarity
);
```

### Embedding Model

Current model: `text-embedding-3-small` (1536 dimensions)

To change, modify `VectorPromptService.generateEmbedding()`:
```javascript
model: "text-embedding-3-small" // or "text-embedding-ada-002"
```

## API Usage

### Check if Vector Chunks Exist

```javascript
const hasChunks = await VectorPromptService.hasChunks();
const count = await VectorPromptService.getChunkCount();
```

### Manually Create Chunks

```javascript
const chunks = await VectorPromptService.storePromptChunks(
  promptText,
  { source: "manual", version: "1.0" },
  sourceId // optional
);
```

### Find Relevant Chunks

```javascript
const relevantChunks = await VectorPromptService.findRelevantChunks(
  userQuery,
  5,    // topK
  0.5   // minSimilarity
);
```

## Benefits

1. **Reduced Token Usage**: Only relevant parts of the prompt are sent to OpenAI
2. **Better Context**: More focused context leads to better responses
3. **Cost Savings**: Fewer tokens = lower API costs
4. **Scalability**: Can handle prompts of any size
5. **Performance**: Faster responses with smaller context windows
6. **Vector Database Operations**: Uses pgvector for native PostgreSQL vector operations (not JavaScript calculations)
7. **Indexed Search**: IVFFlat index enables fast similarity searches even with millions of vectors

## pgvector Implementation Details

**This implementation uses pgvector for actual vector database operations:**

- ✅ **Storage**: Embeddings stored as `vector(1536)` type (not JSON)
- ✅ **Search**: Uses pgvector's `<=>` operator for cosine distance
- ✅ **Indexing**: IVFFlat index for fast similarity searches
- ✅ **Database-level**: All vector operations happen in PostgreSQL
- ✅ **Fallback**: JavaScript fallback if pgvector is unavailable

**SQL Query Used:**
```sql
SELECT 
  id, content, chunk_index, metadata,
  1 - (embedding <=> $1::vector) as similarity
FROM prompt_chunks
WHERE 1 - (embedding <=> $1::vector) >= $2
ORDER BY embedding <=> $1::vector
LIMIT $3
```

This is **real vector database** usage, not JSON storage with JavaScript calculations.

## Troubleshooting

### No Chunks Found

If the system falls back to full prompt:
- Check if chunks exist: `SELECT COUNT(*) FROM prompt_chunks;`
- Verify prompt is active: `SELECT systemPromptActive FROM ai_configs;`
- Run migration script: `npm run migrate:prompt-vector`

### Low Similarity Scores

If retrieved chunks have low similarity (< 0.5):
- Lower the `minSimilarity` threshold
- Increase `maxChunks` to get more context
- Consider adjusting chunk size for better granularity

### Embedding Generation Errors

- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI API rate limits
- Ensure prompt text is not empty

### pgvector Extension Not Found

**Error:** `could not open extension control file "vector.control": No such file or directory`

This means pgvector is not installed on your PostgreSQL server. You need to install it first.

#### Windows Installation

**Option 1: Using Pre-built Binaries (Easiest)**

1. Download pgvector for your PostgreSQL version from:
   - https://github.com/pgvector/pgvector/releases
   - Look for `pgvector-vX.X.X-pg10-windows-x64.zip` (for PostgreSQL 10)

2. Extract the files:
   - Copy `vector.dll` to `C:\Program Files\PostgreSQL\10\lib\`
   - Copy `vector.control` and `vector--*.sql` files to `C:\Program Files\PostgreSQL\10\share\extension\`

3. Restart PostgreSQL service:
   ```powershell
   # Run as Administrator
   Restart-Service postgresql-x64-10
   ```

**Option 2: Build from Source**

1. Install Visual Studio Build Tools (C++ compiler)
2. Install Git
3. Clone and build:
   ```powershell
   git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
   cd pgvector
   # Follow Windows build instructions in README
   ```

**Option 3: Upgrade PostgreSQL (Recommended)**

PostgreSQL 10 is quite old. Consider upgrading to PostgreSQL 12+ which has better pgvector support:

1. Install newer PostgreSQL version (12, 13, 14, or 15)
2. pgvector installation is easier on newer versions
3. Update your `DATABASE_URL` in `.env`

**Verify Installation:**

After installing, verify pgvector is available:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

If it shows up, then run:
```bash
npm run setup:pgvector
```

#### Linux/macOS Installation

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-XX-pgvector
# Replace XX with your PostgreSQL version (e.g., 14 for PostgreSQL 14)
```

**macOS:**
```bash
brew install pgvector
```

**After Installation:**

Once pgvector is installed, run the setup again:
```bash
npm run setup:vector-db
```

## Database Schema

```prisma
model PromptChunk {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  content     String   @db.Text
  chunkIndex  Int
  metadata    Json?
  embedding   Json     // Array of floats (1536 dimensions)
  sourceId    String?
  
  @@index([chunkIndex])
  @@map("prompt_chunks")
}
```

## Next Steps

### For New Setup:

1. **Quick setup (recommended):**
   ```bash
   npm run setup:vector-db
   ```

2. **Or step by step:**
   ```bash
   npm run setup:pgvector      # Enable pgvector extension
   npm run db:migrate           # Create prompt_chunks table
   npm run convert:pgvector     # Convert to vector type
   ```

3. **Migrate existing prompts (if any):**
   ```bash
   npm run migrate:prompt-vector
   ```

4. **Test:** Save a prompt via API/dashboard, then send a chat message and check logs for "USING VECTOR RETRIEVAL"

### For Production:

All scripts read from `.env` file automatically. Just make sure:
- `DATABASE_URL` is set in your production `.env`
- `OPENAI_API_KEY` is set (for generating embeddings)
- Run the same npm commands in your production environment

**Note:** Scripts work the same way in development and production - they read connection details from environment variables.

## Support

For issues or questions:
- Check logs for "USING VECTOR RETRIEVAL" to confirm it's working
- Verify chunks exist: `SELECT COUNT(*) FROM prompt_chunks;`
- Check embedding generation: Look for OpenAI API errors in logs

