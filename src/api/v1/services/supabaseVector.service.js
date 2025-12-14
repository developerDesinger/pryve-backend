const { getSupabaseClient } = require('../../../lib/supabase');
const PromptChunkingService = require('./promptChunking.service');

class SupabaseVectorService {
  static supabase = null;
  static tableName = 'prompt_chunks';

  /**
   * Initialize Supabase client
   */
  static initialize() {
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    return this.supabase;
  }

  /**
   * Generate embedding for user query
   * @param {string} text - User query text
   * @returns {Promise<number[]>} Embedding vector
   */
  static async generateEmbedding(text) {
    return await PromptChunkingService.generateEmbedding(text);
  }

  /**
   * Store prompt chunks in Supabase Vector DB
   * @param {string} promptText - Full prompt text
   * @param {Object} metadata - Metadata to store with chunks
   * @param {string} sourceId - Optional source ID for tracking
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Array>} Array of stored chunk IDs
   */
  static async storePromptChunks(promptText, metadata = {}, sourceId = null, progressCallback = null) {
    console.log(`[SupabaseVectorService] ==========================================`);
    console.log(`[SupabaseVectorService] storePromptChunks called`);
    console.log(`[SupabaseVectorService] sourceId: ${sourceId}`);
    console.log(`[SupabaseVectorService] progressCallback: ${progressCallback ? 'EXISTS' : 'NULL'}`);
    console.log(`[SupabaseVectorService] progressCallback type: ${typeof progressCallback}`);
    console.log(`[SupabaseVectorService] progressCallback is function: ${typeof progressCallback === 'function'}`);
    
    // Store callback reference to ensure it's not lost
    const storedCallback = progressCallback;
    
    if (!storedCallback) {
      console.warn(`[SupabaseVectorService] ⚠️ WARNING: No progress callback provided!`);
    }
    console.log(`  🔧 Initializing Supabase client...`);
    this.initialize();
    console.log(`  ✅ Supabase client initialized`);

    if (!promptText || promptText.trim().length === 0) {
      throw new Error('Prompt text cannot be empty');
    }

    // Check if table exists first
    console.log(`  🔍 Checking if table '${this.tableName}' exists...`);
    try {
      const checkStartTime = Date.now();
      const { error: checkError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .limit(1);
      const checkDuration = Date.now() - checkStartTime;
      
      if (checkError && checkError.code === 'PGRST205') {
        console.error(`  ❌ Table '${this.tableName}' does not exist in Supabase`);
        throw new Error(
          `Table '${this.tableName}' does not exist in Supabase. ` +
          `Please create it first using the SQL script in SUPABASE_SETUP_QUICK_START.md`
        );
      }
      console.log(`  ✅ Table check completed (${checkDuration}ms)`);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw error;
      }
      // Other errors are fine, table might exist
      console.log(`  ⚠️  Table check had non-critical error: ${error.message}`);
    }

    // Calculate total chunks first (without storing them)
    console.log(`  📊 Calculating chunk count...`);
    console.log(`  📝 Prompt text info: ${typeof promptText}, length: ${promptText ? promptText.length : 0} chars`);
    
    // Quick word count estimate without full split (to avoid blocking)
    if (promptText && promptText.length > 0) {
      const sampleSize = Math.min(1000, promptText.length);
      const sample = promptText.substring(0, sampleSize);
      const sampleWords = sample.split(/\s+/).length;
      const estimatedWords = Math.floor((sampleWords / sampleSize) * promptText.length);
      console.log(`  📝 Estimated word count: ~${estimatedWords} words (from sample)`);
    }
    
    const chunkCountStartTime = Date.now();
    
    // Call the synchronous function - if it hangs, we'll see it in the logs
    let totalChunks;
    try {
      totalChunks = PromptChunkingService.calculateChunkCount(promptText, 10000, 0);
    } catch (error) {
      console.error(`  ❌ Error calculating chunk count:`, error);
      throw error;
    }
    
    const chunkCountDuration = Date.now() - chunkCountStartTime;
    console.log(`  ✅ Will create ${totalChunks} chunks (calculation took ${chunkCountDuration}ms)`);
    
    if (totalChunks === 0) {
      throw new Error('No chunks generated from prompt');
    }

    // Optimized batch sizes for maximum speed
    const batchSize = totalChunks > 2000 ? 300 : totalChunks > 1000 ? 200 : 100; // Process 100-300 chunks per batch
    const embeddingBatchSize = 1500; // OpenAI supports up to 2048, using 1500 for safety and speed
    
    console.log(`📦 Processing prompt for vector storage (will create ${totalChunks} chunks)`);
    console.log(`🔄 Processing in batches: ${batchSize} chunks per batch, ${embeddingBatchSize} embeddings per OpenAI call`);
    console.log(`⏱️  Estimated batches: ${Math.ceil(totalChunks / batchSize)} (much faster than one-by-one!)\n`);

    // Notify progress: chunking started
    if (storedCallback) {
      console.log(`[SupabaseVectorService] ✅ Calling initial progress callback (chunking started)`);
      try {
        storedCallback({
          status: 'chunking',
          message: `Calculated ${totalChunks} chunks. Starting upload...`,
          totalChunks,
          processedChunks: 0,
          progress: 0,
          currentBatch: 0,
          totalBatches: Math.ceil(totalChunks / batchSize),
        });
        console.log(`[SupabaseVectorService] ✅ Initial progress callback executed successfully`);
      } catch (error) {
        console.error(`[SupabaseVectorService] ❌ Error in initial progress callback:`, error);
      }
    } else {
      console.log(`[SupabaseVectorService] ⚠️ No progress callback available at start`);
    }

    const insertedIds = [];
    let chunkIndex = 0;
    const overallStartTime = Date.now();
    
    // Use streaming generator - process batches as they come (memory efficient)
    const chunkGenerator = PromptChunkingService.splitIntoChunksStream(promptText, 10000, 0);
    
    // Clear promptText reference immediately to free memory
    promptText = null;

    // Process chunks in batches directly from generator (streaming approach)
    let batch = [];
    let batchNumber = 0;
    const totalBatches = Math.ceil(totalChunks / batchSize);
    
    console.log(`  🔄 Processing chunks in streaming batches (no pre-collection)...\n`);
    
    for (const chunk of chunkGenerator) {
      batch.push(chunk);
      
      // Process batch when it reaches batchSize
      if (batch.length >= batchSize) {
        batchNumber++;
        const batchStartIndex = chunkIndex;
        await this.processBatch(
          batch,
          batchNumber,
          totalBatches,
          totalChunks,
          metadata,
          sourceId,
          embeddingBatchSize,
          insertedIds,
          batchStartIndex,
          storedCallback
        );
        
        chunkIndex += batch.length;
        batch = []; // Clear batch immediately
        
        // Update progress after batch completion
        if (storedCallback) {
          const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
          console.log(`[SupabaseVectorService] ✅ Calling progress callback after batch ${batchNumber}/${totalBatches}:`, {
            progressPercent: `${progressPercent}%`,
            chunkIndex,
            totalChunks,
            currentBatch: batchNumber,
            totalBatches,
          });
          try {
            storedCallback({
              status: 'uploading',
              message: `Uploaded ${chunkIndex} of ${totalChunks} chunks...`,
              totalChunks,
              processedChunks: chunkIndex,
              currentBatch: batchNumber,
              totalBatches,
              progress: progressPercent,
            });
            console.log(`[SupabaseVectorService] ✅ Progress callback executed successfully`);
          } catch (error) {
            console.error(`[SupabaseVectorService] ❌ Error in progress callback:`, error);
          }
        } else {
          console.log(`[SupabaseVectorService] ⚠️ No progress callback available for batch ${batchNumber} (storedCallback is ${storedCallback ? 'EXISTS' : 'NULL'})`);
        }
        
        // Force garbage collection every 10 batches
        if (global.gc && batchNumber % 10 === 0) {
          console.log(`    🗑️  Running garbage collection...`);
          global.gc();
        }
        
        // No delay - process batches as fast as possible
      }
    }
    
    // Process remaining chunks in final batch
    if (batch.length > 0) {
      batchNumber++;
      const batchStartIndex = chunkIndex;
      await this.processBatch(
        batch,
        batchNumber,
        totalBatches,
        totalChunks,
        metadata,
        sourceId,
        embeddingBatchSize,
        insertedIds,
        batchStartIndex,
        storedCallback
      );
      chunkIndex += batch.length;
      batch = [];
      
      // Update progress after final batch
      if (storedCallback) {
        const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
        storedCallback({
          status: 'uploading',
          message: `Uploaded ${chunkIndex} of ${totalChunks} chunks...`,
          totalChunks,
          processedChunks: chunkIndex,
          currentBatch: batchNumber,
          totalBatches,
          progress: progressPercent,
        });
      }
    }

    // Send completion status
    if (storedCallback) {
      console.log(`[SupabaseVectorService] ✅ Calling completion progress callback`);
      try {
        storedCallback({
          status: 'completed',
          message: `Successfully uploaded ${insertedIds.length} of ${totalChunks} chunks!`,
          totalChunks,
          processedChunks: insertedIds.length,
          currentBatch: totalBatches,
          totalBatches,
          progress: 100,
        });
      } catch (error) {
        console.error(`[SupabaseVectorService] ❌ Error in completion progress callback:`, error);
      }
    }

    const overallDuration = Date.now() - overallStartTime;
    const avgTimePerChunk = totalChunks > 0 ? (overallDuration / totalChunks / 1000).toFixed(2) : 0;
    
    console.log(`\n✅ Successfully stored ${insertedIds.length} of ${totalChunks} chunks in Supabase Vector DB`);
    console.log(`⏱️  Total time: ${(overallDuration / 1000).toFixed(2)}s (avg ${avgTimePerChunk}s per chunk)`);
    if (insertedIds.length < totalChunks) {
      console.warn(`⚠️  Warning: ${totalChunks - insertedIds.length} chunks failed to store`);
    }
    return insertedIds;
  }

  /**
   * Process a batch of chunks: generate embeddings and insert into Supabase
   * @private
   */
  static async processBatch(batch, batchNumber, totalBatches, totalChunks, metadata, sourceId, embeddingBatchSize, insertedIds, chunkIndex, progressCallback = null) {
    const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
    console.log(`\n  📦 Batch ${batchNumber}/${totalBatches} (${progressPercent}%): Processing ${batch.length} chunks...`);
    
    try {
      // Step 1: Extract texts for embedding generation
      const batchTexts = batch.map(chunk => chunk.text);
      
      // Step 2: Generate embeddings in batches (OpenAI batch API)
      console.log(`    🤖 Generating embeddings for ${batchTexts.length} chunks...`);
      if (progressCallback) {
        const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
        progressCallback({
          status: 'generating_embeddings',
          message: `Generating embeddings for batch ${batchNumber}/${totalBatches}...`,
          totalChunks,
          processedChunks: chunkIndex,
          currentBatch: batchNumber,
          totalBatches,
          progress: progressPercent,
        });
      }
      const embeddingStartTime = Date.now();
      const embeddings = await PromptChunkingService.generateEmbeddingsBatch(
        batchTexts,
        'text-embedding-3-small',
        embeddingBatchSize
      );
      const embeddingDuration = Date.now() - embeddingStartTime;
      console.log(`    ✅ Generated ${embeddings.length} embeddings (${embeddingDuration}ms)`);
      
      if (embeddings.length !== batch.length) {
        throw new Error(`Mismatch: ${batch.length} chunks but ${embeddings.length} embeddings`);
      }
      
      // Filter out any null embeddings (from failed batches)
      const validChunks = [];
      const validEmbeddings = [];
      
      for (let idx = 0; idx < embeddings.length; idx++) {
        if (embeddings[idx] !== null && embeddings[idx] !== undefined) {
          validChunks.push(batch[idx]);
          validEmbeddings.push(embeddings[idx]);
        }
      }
      
      if (validChunks.length === 0) {
        throw new Error(`No valid embeddings generated for this batch`);
      }
      
      if (validChunks.length < batch.length) {
        console.warn(`    ⚠️  Only ${validChunks.length} of ${batch.length} embeddings are valid, skipping invalid ones`);
      }
      
      // Step 3: Prepare chunks for batch insert (only valid ones)
      const chunksToInsert = validChunks.map((chunk, idx) => ({
        content: chunk.text,
        chunk_index: chunk.index,
        embedding: validEmbeddings[idx],
        metadata: {
          ...metadata,
          // Removed chunk_count and created_at (redundant with table columns)
        },
        source_id: sourceId,
        is_active: true,
        usage_count: 0,
      }));
      
      // Step 4: Batch insert into Supabase
      console.log(`    💾 Inserting ${chunksToInsert.length} chunks into Supabase...`);
      if (progressCallback) {
        const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
        progressCallback({
          status: 'uploading',
          message: `Uploading batch ${batchNumber}/${totalBatches} to database...`,
          totalChunks,
          processedChunks: chunkIndex,
          currentBatch: batchNumber,
          totalBatches,
          progress: progressPercent,
        });
      }
      const insertStartTime = Date.now();
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(chunksToInsert)
        .select('id');
      const insertDuration = Date.now() - insertStartTime;
      
      if (error) {
        console.error(`    ❌ Supabase batch insert error:`, error);
        throw new Error(`Failed to store batch: ${error.message}`);
      }
      
      if (data && data.length > 0) {
        insertedIds.push(...data.map(item => item.id));
        console.log(`    ✅ Stored ${data.length} chunks successfully (${insertDuration}ms, avg ${(insertDuration / data.length).toFixed(0)}ms per chunk)`);
        
        // Update progress after successful insert
        if (progressCallback) {
          const newChunkIndex = chunkIndex + data.length;
          const progressPercent = Math.min(Math.round((newChunkIndex / totalChunks) * 100), 99);
          console.log(`[SupabaseVectorService] ✅ Calling progress callback after insert (batch ${batchNumber}):`, {
            progressPercent: `${progressPercent}%`,
            newChunkIndex,
            totalChunks,
          });
          try {
            progressCallback({
              status: 'uploading',
              message: `Uploaded ${newChunkIndex} of ${totalChunks} chunks...`,
              totalChunks,
              processedChunks: newChunkIndex,
              currentBatch: batchNumber,
              totalBatches,
              progress: progressPercent,
            });
          } catch (error) {
            console.error(`[SupabaseVectorService] ❌ Error in progress callback after insert:`, error);
          }
        }
      }
      
      // Clear batch from memory
      batchTexts.length = 0;
      embeddings.length = 0;
      chunksToInsert.length = 0;
      
      // No delay - process batches as fast as possible
    } catch (error) {
      console.error(`\n  ❌ Error processing batch ${batchNumber}/${totalBatches}:`, error.message);
      if (error.stack) {
        console.error(`  Stack trace:`, error.stack);
      }
      // Don't throw - let caller continue with next batch
    }
  }

  /**
   * Find relevant chunks using vector similarity search
   * @param {number[]} queryEmbedding - Query embedding vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of relevant chunks with similarity scores
   */
  static async findRelevantChunks(queryEmbedding, options = {}) {
    this.initialize();

    const {
      topK = 3,
      minSimilarity = 0.5,
      onlyRecent = true,
      recentLimit = parseInt(process.env.RECENT_PROMPTS_LIMIT) || 1000,
    } = options;

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error('Query embedding must be a non-empty array');
    }

    try {
      // Use Supabase RPC function for vector similarity search
      const { data, error } = await this.supabase.rpc('match_prompt_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: minSimilarity,
        match_count: topK,
        filter_active: onlyRecent,
        recent_limit: recentLimit,
      });

      if (error) {
        console.error('Error in vector similarity search:', error);
        // Fallback to direct query if RPC function doesn't exist
        return await this.findRelevantChunksFallback(queryEmbedding, options);
      }

      return data || [];
    } catch (error) {
      console.error('Error finding relevant chunks:', error);
      return await this.findRelevantChunksFallback(queryEmbedding, options);
    }
  }

  /**
   * Fallback method using direct SQL query (if RPC function not available)
   */
  static async findRelevantChunksFallback(queryEmbedding, options = {}) {
    const {
      topK = 3,
      minSimilarity = 0.5,
      onlyRecent = true,
    } = options;

    // Build query
    let query = this.supabase
      .from(this.tableName)
      .select('id, content, chunk_index, metadata, created_at, is_active')
      .eq('is_active', onlyRecent)
      .order('created_at', { ascending: false })
      .limit(topK * 10); // Get more results to filter by similarity

    const { data, error } = await query;

    if (error) {
      console.error('Fallback query error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Calculate similarity manually (cosine similarity)
    const results = data.map((chunk) => {
      // Note: This requires embedding to be stored as array
      // For production, use the RPC function which handles vector operations
      const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding || []);
      return {
        ...chunk,
        similarity,
      };
    })
    .filter((chunk) => chunk.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} Similarity score (0-1)
   */
  static calculateCosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get relevant prompt context for a user query
   * @param {string} userQuery - User's query text
   * @param {number} topK - Number of chunks to retrieve
   * @param {number} minSimilarity - Minimum similarity threshold
   * @returns {Promise<string|null>} Combined context string or null
   */
  static async getRelevantPromptContext(userQuery, topK = 3, minSimilarity = 0.5) {
    if (!userQuery || userQuery.trim().length === 0) {
      return null;
    }

    try {
      // Generate embedding for user query
      const queryEmbedding = await this.generateEmbedding(userQuery);

      // Find relevant chunks
      const chunks = await this.findRelevantChunks(queryEmbedding, {
        topK,
        minSimilarity,
        onlyRecent: true,
      });

      if (!chunks || chunks.length === 0) {
        return null;
      }

      // Update usage tracking for retrieved chunks
      await this.updateChunkUsage(chunks.map(chunk => chunk.id));

      // Combine chunks into context
      const context = chunks
        .map((chunk) => chunk.content)
        .join('\n\n---\n\n');

      return context;
    } catch (error) {
      console.error('Error getting relevant prompt context:', error);
      return null;
    }
  }

  /**
   * Update usage tracking for chunks
   * @param {Array<string>} chunkIds - Array of chunk IDs
   */
  static async updateChunkUsage(chunkIds) {
    if (!chunkIds || chunkIds.length === 0) {
      return;
    }

    this.initialize();

    try {
      // Update each chunk individually (Supabase doesn't support increment in update)
      for (const chunkId of chunkIds) {
        // First get current usage_count
        const { data: chunk } = await this.supabase
          .from(this.tableName)
          .select('usage_count')
          .eq('id', chunkId)
          .single();

        if (chunk) {
          await this.supabase
            .from(this.tableName)
            .update({
              last_used_at: new Date().toISOString(),
              usage_count: (chunk.usage_count || 0) + 1,
            })
            .eq('id', chunkId);
        }
      }
    } catch (error) {
      console.error('Error updating chunk usage:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Check if chunks exist in Supabase
   * @returns {Promise<boolean>}
   */
  static async hasChunks() {
    this.initialize();

    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      console.error('Error checking chunks:', error);
      return false;
    }

    return (count || 0) > 0;
  }

  /**
   * Get count of active chunks
   * @returns {Promise<number>}
   */
  static async getChunkCount() {
    this.initialize();

    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      console.error('Error getting chunk count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get count of chunks for a specific source (for verification after deletion)
   * @param {string} sourceId - Source ID to check
   * @returns {Promise<number>} Number of chunks for this source
   */
  static async getChunkCountBySource(sourceId) {
    if (!sourceId) {
      return 0;
    }

    this.initialize();

    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('source_id', sourceId);

      if (error) {
        console.error(`Error getting chunk count for source ${sourceId}:`, error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error(`Error getting chunk count for source ${sourceId}:`, error);
      return 0;
    }
  }

  /**
   * Archive old prompts (mark as inactive)
   * @param {number} daysOld - Archive prompts older than this many days
   * @returns {Promise<number>} Number of archived prompts
   */
  static async archiveOldPrompts(daysOld = 30) {
    this.initialize();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ is_active: false })
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_active', true)
      .select('id');

    if (error) {
      console.error('Error archiving prompts:', error);
      return 0;
    }

    return data ? data.length : 0;
  }

  /**
   * Delete archived prompts older than specified days
   * @param {number} daysOld - Delete prompts older than this many days
   * @returns {Promise<number>} Number of deleted prompts
   */
  static async deleteOldPrompts(daysOld = 90) {
    this.initialize();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_active', false)
      .select('id');

    if (error) {
      console.error('Error deleting old prompts:', error);
      return 0;
    }

    return data ? data.length : 0;
  }

  /**
   * Delete all chunks for a specific source (useful when updating prompts)
   * @param {string} sourceId - Source ID to delete chunks for
   * @returns {Promise<number>} Number of deleted chunks
   */
  static async deleteChunksBySource(sourceId) {
    if (!sourceId) {
      console.log(`    ⚠️  No sourceId provided, skipping deletion`);
      return 0;
    }

    console.log(`    🔧 Initializing Supabase for deletion (sourceId: ${sourceId})...`);
    this.initialize();
    console.log(`    ✅ Supabase initialized`);

    try {
      console.log(`    🗑️  Deleting chunks from table '${this.tableName}' where source_id = ${sourceId}...`);
      const deleteStartTime = Date.now();
      const { data, error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('source_id', sourceId)
        .select('id');
      const deleteDuration = Date.now() - deleteStartTime;

      if (error) {
        // If table doesn't exist, that's okay - just log and continue
        if (error.code === 'PGRST205') {
          console.log(`    ℹ️ Table '${this.tableName}' does not exist yet. Skipping deletion.`);
          return 0;
        }
        console.error(`    ❌ Error deleting chunks by source:`, error);
        return 0;
      }

      const deletedCount = data ? data.length : 0;
      console.log(`    ✅ Deleted ${deletedCount} chunks (${deleteDuration}ms)`);
      return deletedCount;
    } catch (error) {
      // Non-critical error - table might not exist yet
      console.log(`    ⚠️ Could not delete chunks by source (table may not exist): ${error.message}`);
      return 0;
    }
  }
}

module.exports = SupabaseVectorService;

