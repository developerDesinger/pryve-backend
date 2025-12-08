# Memory Optimization Fixes

## Changes Made

### 1. Reduced Batch Sizes
- **Embedding batch size**: Reduced from 10 to **3** (processes 3 chunks at a time)
- **Insert batch size**: Already reduced to 20 (kept as is)
- This dramatically reduces memory usage during embedding generation

### 2. Increased Memory Limit
- **Previous**: 4GB (`--max-old-space-size=4096`)
- **New**: 6GB (`--max-old-space-size=6144`)
- Added `--expose-gc` flag to enable manual garbage collection

### 3. Aggressive Memory Cleanup
- Clear arrays immediately after use (`array.length = 0`)
- Clear response data from OpenAI API immediately
- Added manual garbage collection hints (`global.gc()`)
- Increased delays between batches (200ms instead of 100ms)

### 4. Fixed Nodemon Command
- Changed from `NODE_OPTIONS` environment variable to direct `--exec` flag
- This ensures nodemon properly passes memory flags to Node.js

## Updated Commands

### Development
```bash
npm run dev
```
Now uses: `node --max-old-space-size=6144 --expose-gc server.js`

### Production
```bash
npm start
```
Now uses: `node --max-old-space-size=6144 --expose-gc server.js`

## What This Fixes

1. **Memory crashes** - Smaller batches prevent heap overflow
2. **Memory leaks** - Aggressive cleanup prevents accumulation
3. **Process stability** - Higher memory limit provides buffer
4. **Garbage collection** - Manual GC hints help free memory faster

## Testing

After restarting your server, try uploading your prompt again. You should see:
- `📦 Processing prompt for vector storage...`
- `📦 Split prompt into X chunks`
- `Generating embeddings for batch 1-3 of X...` (small batches)
- `✅ Generated embeddings for X chunks`
- `✅ Stored X chunks in Supabase Vector DB`

## If Still Having Issues

If you still get memory errors:

1. **Check available RAM**: Make sure your system has at least 8GB RAM
2. **Reduce batch size further**: Change `batchSize: 3` to `batchSize: 1` in `promptChunking.service.js`
3. **Process chunks one at a time**: Modify code to process and store chunks individually instead of batching

## Performance Impact

- **Slower processing**: Smaller batches mean more API calls (but prevents crashes)
- **More reliable**: Won't crash on large prompts
- **Better for production**: Handles edge cases better

The trade-off is worth it - slower processing is better than crashes!

