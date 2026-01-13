/**
 * Response caching service for AI chatbot responses
 * Uses semantic similarity to find cached responses for similar queries
 * OPTIMIZATION: Reduces API calls and improves response time
 */

const cacheService = require("../utils/cache.service");
const PromptChunkingService = require("./promptChunking.service");

class ResponseCacheService {
  constructor() {
    this.cachePrefix = "ai_response:";
    this.similarityThreshold = 0.85; // 85% similarity to use cached response
    this.cacheTTL = 60 * 60 * 1000; // 1 hour
    this.maxCacheSize = 1000; // Maximum number of cached responses
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} Similarity score (0-1)
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
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
   * Generate cache key from query and context
   * @param {string} query - User query
   * @param {string} chatId - Chat ID for context
   * @returns {string} Cache key
   */
  generateCacheKey(query, chatId) {
    const normalizedQuery = query.trim().toLowerCase().substring(0, 100);
    return `${this.cachePrefix}${chatId}:${normalizedQuery}`;
  }

  /**
   * Get cached response if similar query exists
   * @param {string} query - User query
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Cached response or null
   */
  async getCachedResponse(query, chatId, userId) {
    try {
      // For now, use simple exact match caching (fast lookup)
      // Full semantic similarity requires maintaining an index which is complex with in-memory cache
      // In production with Redis, implement full semantic search
      const cacheKey = this.generateCacheKey(query, chatId);
      const cached = cacheService.get(cacheKey);

      if (cached && cached.userId === userId) {
        console.log(`✅ Cache hit! Exact match for query`);
        return {
          ...cached.response,
          fromCache: true,
          similarity: 1.0,
        };
      }

      // TODO: Implement full semantic similarity search with Redis
      // For now, exact match only provides immediate benefit
      return null;
    } catch (error) {
      console.error("Error getting cached response:", error);
      return null;
    }
  }

  /**
   * Store response in cache
   * @param {string} query - User query
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {object} response - AI response data
   * @returns {Promise<void>}
   */
  async setCachedResponse(query, chatId, userId, response) {
    try {
      // Generate cache key (exact match for now)
      const cacheKey = this.generateCacheKey(query, chatId);

      // Store in cache (without embedding for now - saves memory)
      // In production with Redis, store embeddings for semantic search
      cacheService.set(
        cacheKey,
        {
          response,
          timestamp: Date.now(),
          userId,
          query: query.substring(0, 200), // Store query preview for debugging
        },
        this.cacheTTL
      );

      console.log(`💾 Response cached for query: "${query.substring(0, 50)}..."`);

      // Clean up old cache entries if needed
      this.cleanupCache(chatId);
    } catch (error) {
      console.error("Error caching response:", error);
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Get all cache keys for a chat
   * @param {string} chatId - Chat ID
   * @returns {string[]} Array of cache keys
   * Note: In-memory cache limitation - we can't efficiently list all keys
   * In production, use Redis with pattern matching for better performance
   */
  getAllCacheKeys(chatId) {
    // For in-memory cache, we'll use a different approach:
    // Store cache entries with a hash-based key and maintain a lookup index
    // For now, return empty - we'll use direct embedding comparison
    return [];
  }

  /**
   * Clean up old cache entries
   * @param {string} chatId - Chat ID
   */
  cleanupCache(chatId) {
    // Clean expired entries (handled by cache service)
    cacheService.cleanExpired();
  }

  /**
   * Clear all cached responses for a chat
   * @param {string} chatId - Chat ID
   */
  clearChatCache(chatId) {
    // In production with Redis, use pattern matching
    // For in-memory cache, this is limited
    cacheService.cleanExpired();
  }

  /**
   * Clear all cached responses
   */
  clearAllCache() {
    cacheService.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    return cacheService.getStats();
  }
}

module.exports = new ResponseCacheService();

