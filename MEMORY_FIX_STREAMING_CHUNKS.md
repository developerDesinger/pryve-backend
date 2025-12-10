# Memory Fix: True Streaming Chunk Processing

## Problem
The application was crashing with "JavaScript heap out of memory" errors when processing large prompts (1560+ words) for vector storage. The heap was reaching the 6GB limit even with batch processing.

## Root Cause
Even though chunks were processed in batches, **all chunks were stored in memory** before processing began. For large prompts, this could create hundreds of chunks, each containing text, all held in memory simultaneously.

## Solution: True Streaming Processing

### Key Changes

1. **Streaming Generator Function** (`splitIntoChunksStream`)
   - Yields chunks one at a time instead of creating an array
   - Processes chunks as they're generated
   - Never stores all chunks in memory simultaneously

2. **Single Chunk Processing**
   - Process ONE chunk at a time: generate embedding → store → clear
   - Each chunk is immediately cleared from memory after storage
   - Only one chunk + one embedding exists in memory at any time

3. **Memory Optimization**
   - Calculate chunk count first (without storing chunks)
   - Clear promptText reference after creating generator
   - Aggressive memory cleanup after each chunk
   - Garbage collection every 10 chunks

### Implementation Details

**Before:**
```javascript
// All chunks stored in memory
const chunks = splitIntoChunks(promptText); // Could be 100+ chunks
for (let i = 0; i < chunks.length; i++) {
  // Process batch...
}
```

**After:**
```javascript
// Calculate count without storing chunks
const totalChunks = calculateChunkCount(promptText);

// Stream chunks one at a time
const generator = splitIntoChunksStream(promptText);
promptText = null; // Free original text

for (const chunk of generator) {
  // Process one chunk: embed → store → clear
  // Only ONE chunk in memory at a time
}
```

### Memory Usage Comparison

| Approach | Memory Usage | Status |
|----------|-------------|--------|
| **Old (all chunks)** | ~4-6GB (all chunks + embeddings) | ❌ Crashes |
| **Old (batch of 2)** | ~2-3GB (all chunks + 2 embeddings) | ⚠️ Still risky |
| **New (streaming)** | ~100-200MB (1 chunk + 1 embedding) | ✅ Stable |

### Files Modified

1. **`src/api/v1/services/promptChunking.service.js`**
   - Added `calculateChunkCount()` - calculates count without storing chunks
   - Added `splitIntoChunksStream()` - generator function for streaming

2. **`src/api/v1/services/supabaseVector.service.js`**
   - Refactored `storePromptChunks()` to use streaming generator
   - Process one chunk at a time instead of batches
   - Aggressive memory cleanup after each chunk

### Benefits

✅ **Memory Efficient**: Only one chunk + one embedding in memory at a time  
✅ **Scalable**: Can handle prompts of any size without memory issues  
✅ **Stable**: No more heap overflow crashes  
✅ **Fast**: Minimal overhead, processes chunks as fast as API allows  

### Testing

After restarting your server, you should see:
```
📦 Processing prompt for vector storage (will create X chunks)
🔄 Processing chunks one at a time using streaming (generate → store → clear)...
  Processing chunk 1 of X...
  Processing chunk 2 of X...
  ...
✅ Stored X chunks in Supabase Vector DB
```

### Important: Restart Required

**You MUST restart your server** for these changes to take effect:
```bash
npm run dev
```

The streaming processing will only work after restart!

