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
      // Other errors are fine, table might exist
    }

    // Process prompt in streaming fashion: chunk → embed → store → clear
    // This prevents accumulating all embeddings in memory
    const chunks = PromptChunkingService.splitIntoChunks(promptText, 1000, 200);
    
    if (chunks.length === 0) {
      throw new Error('No chunks generated from prompt');
    }

    console.log(`📦 Split prompt into ${chunks.length} chunks`);
    console.log(`🔄 Processing chunks incrementally (generate → store → clear)...`);

    const insertedIds = [];
    const totalChunks = chunks.length;
    const processBatchSize = 2; // Process 2 chunks at a time: generate embedding → store → clear

    // Process chunks in small batches: generate embedding and store immediately
    for (let i = 0; i < chunks.length; i += processBatchSize) {
      const batch = chunks.slice(i, i + processBatchSize);
      
      try {
        // Generate embeddings for this small batch only
        const texts = batch.map(chunk => chunk.text);
        console.log(`  Processing chunks ${i + 1}-${Math.min(i + processBatchSize, totalChunks)} of ${totalChunks}...`);
        
        const embeddings = await PromptChunkingService.generateEmbeddingsBatch(texts, 'text-embedding-3-small', processBatchSize);
        
        // Clear texts immediately
        texts.length = 0;

        if (embeddings.length !== batch.length) {
          throw new Error(`Mismatch: ${batch.length} chunks but ${embeddings.length} embeddings`);
        }

        // Prepare chunks for insertion (with embeddings)
        const chunksToInsert = batch.map((chunk, idx) => ({
          content: chunk.text,
          chunk_index: chunk.index,
          embedding: embeddings[idx],
          metadata: {
            ...metadata,
            chunk_count: totalChunks,
            created_at: new Date().toISOString(),
          },
          source_id: sourceId,
          is_active: true,
          usage_count: 0,
        }));

        // Store immediately
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(chunksToInsert)
          .select('id');

        if (error) {
          console.error(`Error inserting chunks ${i + 1}-${i + batch.length}:`, error);
          throw new Error(`Failed to store chunks: ${error.message}`);
        }

        if (data) {
          insertedIds.push(...data.map(item => item.id));
        }

        // Clear everything from memory immediately
        batch.length = 0;
        embeddings.length = 0;
        chunksToInsert.length = 0;
        
        // Force garbage collection if available
        if (global.gc && i % 5 === 0) {
          global.gc();
        }
        
        // Small delay between batches
        if (i + processBatchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing batch ${i + 1}-${i + batch.length}:`, error);
        // Continue with next batch
      }
    }

    // Clear chunks array
    chunks.length = 0;

    console.log(`✅ Stored ${insertedIds.length} chunks in Supabase Vector DB`);
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
    this.initialize();

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('source_id', sourceId)
        .select('id');

      if (error) {
        // If table doesn't exist, that's okay - just log and continue
        if (error.code === 'PGRST205') {
          console.log(`ℹ️ Table '${this.tableName}' does not exist yet. Skipping deletion.`);
          return 0;
        }
        console.error('Error deleting chunks by source:', error);
        return 0;
      }

      return data ? data.length : 0;
    } catch (error) {
      // Non-critical error - table might not exist yet
      console.log(`ℹ️ Could not delete chunks by source (table may not exist): ${error.message}`);
      return 0;
    }
  }
}

module.exports = SupabaseVectorService;

