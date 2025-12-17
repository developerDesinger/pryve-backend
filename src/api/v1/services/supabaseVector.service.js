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
    console.log(`[storePromptChunks] Starting for sourceId: ${sourceId}`);
    
    const storedCallback = progressCallback;
    this.initialize();

    if (!promptText || promptText.trim().length === 0) {
      throw new Error('Prompt text cannot be empty');
    }

    // Check if table exists first
    try {
      const { error: checkError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === 'PGRST205') {
        throw new Error(
          `Table '${this.tableName}' does not exist in Supabase. ` +
          `Please create it first using the SQL script in SUPABASE_SETUP_QUICK_START.md`
        );
      }
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw error;
      }
    }
    
    // Dynamic, meaningful chunk configuration
    // Adjust chunk size based on prompt length so short prompts still get
    // multiple useful chunks and huge prompts are capped.
    const MAX_CHUNKS = 20000;     // Hard upper bound for safety
    const MIN_CHUNK_SIZE = 400;   // Avoid ultra-tiny chunks
    const MAX_CHUNK_SIZE = 2000;  // Avoid overly huge chunks

    // Rough word count for the whole prompt
    const totalWords = promptText.trim().split(/\s+/).length;

    // Target chunks: aim for ~800 words per chunk, but respect MAX_CHUNKS
    let targetChunks = Math.ceil(totalWords / 800);
    if (targetChunks < 1) targetChunks = 1;
    if (targetChunks > MAX_CHUNKS) targetChunks = MAX_CHUNKS;

    // Derive effective chunk size from text length and targetChunks
    let effectiveChunkSize = Math.ceil(totalWords / targetChunks);
    if (effectiveChunkSize < MIN_CHUNK_SIZE) effectiveChunkSize = MIN_CHUNK_SIZE;
    if (effectiveChunkSize > MAX_CHUNK_SIZE) effectiveChunkSize = MAX_CHUNK_SIZE;

    // Final values used for chunking
    const CHUNK_SIZE = effectiveChunkSize;
    const CHUNK_OVERLAP = Math.round(CHUNK_SIZE * 0.15); // ~15% overlap

    console.log(`[storePromptChunks] totalWords=${totalWords}, CHUNK_SIZE=${CHUNK_SIZE}, CHUNK_OVERLAP=${CHUNK_OVERLAP}`);

    // Calculate total chunks
    let totalChunks;
    try {
      totalChunks = PromptChunkingService.calculateChunkCount(promptText, CHUNK_SIZE, CHUNK_OVERLAP);
    } catch (error) {
      console.error(`[storePromptChunks] Error calculating chunk count:`, error);
      throw error;
    }

    // Safety cap
    if (totalChunks > MAX_CHUNKS) {
      totalChunks = MAX_CHUNKS;
    }
    
    if (totalChunks === 0) {
      throw new Error('No chunks generated from prompt');
    }

    console.log(`[storePromptChunks] Will create ${totalChunks} chunks`);

    const batchSize = totalChunks > 2000 ? 300 : totalChunks > 1000 ? 200 : 100;
    const embeddingBatchSize = 1500;

    // Notify progress
    if (storedCallback) {
      storedCallback({
        status: 'chunking',
        message: `Calculated ${totalChunks} chunks. Starting upload...`,
        totalChunks,
        processedChunks: 0,
        progress: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(totalChunks / batchSize),
      });
    }

    const insertedIds = [];
    let chunkIndex = 0;
    const overallStartTime = Date.now();
    
    // Use streaming generator
    const chunkGenerator = PromptChunkingService.splitIntoChunksStream(promptText, CHUNK_SIZE, CHUNK_OVERLAP);
    promptText = null;

    let batch = [];
    let batchNumber = 0;
    const totalBatches = Math.ceil(totalChunks / batchSize);
    
    for (const chunk of chunkGenerator) {
      if (chunkIndex >= totalChunks) break;
      batch.push(chunk);
      
      if (batch.length >= batchSize) {
        batchNumber++;
        await this.processBatch(batch, batchNumber, totalBatches, totalChunks, metadata, sourceId, embeddingBatchSize, insertedIds, chunkIndex, storedCallback);
        chunkIndex += batch.length;
        batch = [];
        
        if (storedCallback) {
          storedCallback({
            status: 'uploading',
            message: `Uploaded ${chunkIndex} of ${totalChunks} chunks...`,
            totalChunks,
            processedChunks: chunkIndex,
            currentBatch: batchNumber,
            totalBatches,
            progress: Math.round((chunkIndex / totalChunks) * 100),
          });
        }
        
        if (global.gc && batchNumber % 10 === 0) global.gc();
      }
    }
    
    // Process remaining chunks
    if (batch.length > 0) {
      batchNumber++;
      await this.processBatch(batch, batchNumber, totalBatches, totalChunks, metadata, sourceId, embeddingBatchSize, insertedIds, chunkIndex, storedCallback);
      chunkIndex += batch.length;
      batch = [];
      
      if (storedCallback) {
        storedCallback({
          status: 'uploading',
          message: `Uploaded ${chunkIndex} of ${totalChunks} chunks...`,
          totalChunks,
          processedChunks: chunkIndex,
          currentBatch: batchNumber,
          totalBatches,
          progress: Math.round((chunkIndex / totalChunks) * 100),
        });
      }
    }

    // Completion
    if (storedCallback) {
      storedCallback({
        status: 'completed',
        message: `Successfully uploaded ${insertedIds.length} of ${totalChunks} chunks!`,
        totalChunks,
        processedChunks: insertedIds.length,
        currentBatch: totalBatches,
        totalBatches,
        progress: 100,
      });
    }

    const overallDuration = Date.now() - overallStartTime;
    console.log(`[storePromptChunks] Done: ${insertedIds.length}/${totalChunks} chunks in ${(overallDuration / 1000).toFixed(2)}s`);
    return insertedIds;
  }

  /**
   * Process a batch of chunks: generate embeddings and insert into Supabase
   * @private
   */
  static async processBatch(batch, batchNumber, totalBatches, totalChunks, metadata, sourceId, embeddingBatchSize, insertedIds, chunkIndex, progressCallback = null) {
    console.log(`[processBatch] Batch ${batchNumber}/${totalBatches}: ${batch.length} chunks`);
    
    try {
      const batchTexts = batch.map(chunk => chunk.text);
      
      // Generate embeddings
      if (progressCallback) {
        progressCallback({
          status: 'generating_embeddings',
          message: `Generating embeddings for batch ${batchNumber}/${totalBatches}...`,
          totalChunks,
          processedChunks: chunkIndex,
          currentBatch: batchNumber,
          totalBatches,
          progress: Math.round((chunkIndex / totalChunks) * 100),
        });
      }
      
      const embeddings = await PromptChunkingService.generateEmbeddingsBatch(batchTexts, 'text-embedding-3-small', embeddingBatchSize);
      
      if (embeddings.length !== batch.length) {
        throw new Error(`Mismatch: ${batch.length} chunks but ${embeddings.length} embeddings`);
      }
      
      // Filter valid embeddings
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
      
      // Prepare chunks for insert
      const chunksToInsert = validChunks.map((chunk, idx) => ({
        content: chunk.text,
        chunk_index: chunk.index,
        embedding: validEmbeddings[idx],
        metadata: { ...metadata },
        source_id: sourceId,
        is_active: true,
        usage_count: 0,
      }));
      
      // ============================================================
      // DEBUG: Log exactly what chunks are going into Supabase
      // ============================================================
      console.log(`\n[DEBUG] ========== CHUNKS GOING TO SUPABASE (Batch ${batchNumber}) ==========`);
      chunksToInsert.forEach((c, i) => {
        console.log(`[DEBUG] Chunk ${c.chunk_index}:`);
        console.log(`        HEAD: "${c.content.slice(0, 100)}..."`);
        console.log(`        TAIL: "...${c.content.slice(-100)}"`);
        console.log(`        LENGTH: ${c.content.length} chars`);
      });
      console.log(`[DEBUG] ==============================================================\n`);
      
      // Insert into Supabase
      if (progressCallback) {
        progressCallback({
          status: 'uploading',
          message: `Uploading batch ${batchNumber}/${totalBatches} to database...`,
          totalChunks,
          processedChunks: chunkIndex,
          currentBatch: batchNumber,
          totalBatches,
          progress: Math.round((chunkIndex / totalChunks) * 100),
        });
      }
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(chunksToInsert)
        .select('id');
      
      if (error) {
        console.error(`[processBatch] Supabase insert error:`, error);
        throw new Error(`Failed to store batch: ${error.message}`);
      }
      
      if (data && data.length > 0) {
        insertedIds.push(...data.map(item => item.id));
        console.log(`[processBatch] Stored ${data.length} chunks`);
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
      console.log('\n' + '🔍'.repeat(40));
      console.log('🔍 VECTOR DB QUERY - Starting chunk retrieval...');
      console.log('🔍'.repeat(40));
      console.log(`📝 User Query: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"`);
      console.log(`⚙️  Settings: topK=${topK}, minSimilarity=${minSimilarity}`);

      // Generate embedding for user query
      const queryEmbedding = await this.generateEmbedding(userQuery);
      console.log(`✅ Query embedding generated (${queryEmbedding.length} dimensions)`);

      // Find relevant chunks
      const chunks = await this.findRelevantChunks(queryEmbedding, {
        topK,
        minSimilarity,
        onlyRecent: true,
      });

      if (!chunks || chunks.length === 0) {
        console.log('⚠️  No relevant chunks found! Falling back to full prompt.');
        console.log('🔍'.repeat(40) + '\n');
        return null;
      }

      // DEBUG: Log each retrieved chunk
      console.log(`\n✅ Found ${chunks.length} relevant chunks:`);
      console.log('-'.repeat(60));
      chunks.forEach((chunk, idx) => {
        console.log(`\n📦 CHUNK ${idx + 1} (index: ${chunk.chunk_index || 'N/A'}):`);
        console.log(`   Similarity: ${(chunk.similarity * 100).toFixed(1)}%`);
        console.log(`   Content preview: "${chunk.content.substring(0, 150)}..."`);
        console.log(`   Content length: ${chunk.content.length} chars`);
      });
      console.log('-'.repeat(60));

      // Update usage tracking for retrieved chunks
      await this.updateChunkUsage(chunks.map(chunk => chunk.id));

      // Combine chunks into context
      const context = chunks
        .map((chunk) => chunk.content)
        .join('\n\n---\n\n');

      console.log(`\n📊 Total context length: ${context.length} characters`);
      console.log('🔍'.repeat(40) + '\n');

      return context;
    } catch (error) {
      console.error('❌ Error getting relevant prompt context:', error);
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

