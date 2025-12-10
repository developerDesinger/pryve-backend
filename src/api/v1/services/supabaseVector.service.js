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
   * @returns {Promise<Array>} Array of stored chunk IDs
   */
  static async storePromptChunks(promptText, metadata = {}, sourceId = null) {
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
      totalChunks = PromptChunkingService.calculateChunkCount(promptText, 1000, 200);
    } catch (error) {
      console.error(`  ❌ Error calculating chunk count:`, error);
      throw error;
    }
    
    const chunkCountDuration = Date.now() - chunkCountStartTime;
    console.log(`  ✅ Will create ${totalChunks} chunks (calculation took ${chunkCountDuration}ms)`);
    
    if (totalChunks === 0) {
      throw new Error('No chunks generated from prompt');
    }

    console.log(`📦 Processing prompt for vector storage (will create ${totalChunks} chunks)`);
    console.log(`🔄 Processing chunks one at a time using streaming (generate → store → clear)...`);
    console.log(`⏱️  Estimated time: ~${Math.ceil(totalChunks * 2)} seconds (2s per chunk average)\n`);

    const insertedIds = [];
    let chunkIndex = 0;
    const overallStartTime = Date.now();

    // Use streaming generator to process chunks one at a time WITHOUT storing all chunks in memory
    const chunkGenerator = PromptChunkingService.splitIntoChunksStream(promptText, 1000, 200);
    
    // Clear promptText reference immediately after creating generator to free memory
    promptText = null;

    // Process each chunk as it's generated (true streaming)
    for (const chunk of chunkGenerator) {
      chunkIndex++;
      
      try {
        const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
        const chunkWordCount = chunk.text.trim().split(/\s+/).length;
        console.log(`\n  [${chunkIndex}/${totalChunks}] (${progressPercent}%) Processing chunk...`);
        console.log(`    Chunk size: ${chunk.text.length} chars, ${chunkWordCount} words`);
        
        // Generate embedding for this single chunk only
        const embedding = await PromptChunkingService.generateEmbedding(chunk.text);
        
        // Prepare chunk for insertion (with embedding)
        const chunkToInsert = {
          content: chunk.text,
          chunk_index: chunk.index,
          embedding: embedding,
          metadata: {
            ...metadata,
            chunk_count: totalChunks,
            created_at: new Date().toISOString(),
          },
          source_id: sourceId,
          is_active: true,
          usage_count: 0,
        };

        // Store immediately (single insert)
        console.log(`    💾 Inserting into Supabase...`);
        const insertStartTime = Date.now();
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(chunkToInsert)
          .select('id');
        const insertDuration = Date.now() - insertStartTime;

        if (error) {
          console.error(`    ❌ Supabase insert error:`, error);
          throw new Error(`Failed to store chunk: ${error.message}`);
        }

        if (data && data[0]) {
          insertedIds.push(data[0].id);
          console.log(`    ✅ Chunk stored successfully (ID: ${data[0].id}, ${insertDuration}ms)`);
        }

        // Clear everything from memory immediately
        chunk.text = null;
        chunkToInsert.content = null;
        chunkToInsert.embedding = null;
        embedding.length = 0;
        
        // Force garbage collection every 10 chunks
        if (global.gc && chunkIndex % 10 === 0 && chunkIndex > 0) {
          console.log(`    🗑️  Running garbage collection...`);
          global.gc();
        }
        
        // Small delay between chunks to prevent memory pressure and rate limits
        if (chunkIndex < totalChunks) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`\n  ❌ Error processing chunk ${chunkIndex}/${totalChunks}:`, error.message);
        if (error.stack) {
          console.error(`  Stack trace:`, error.stack);
        }
        // Continue with next chunk
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

