const OpenAI = require('openai');

class PromptChunkingService {
  static openai = null;

  /**
   * Initialize OpenAI client
   */
  static initializeOpenAI() {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in environment variables');
      }
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.openai;
  }

  /**
   * Split text into chunks with overlap
   * @param {string} text - The text to chunk
   * @param {number} chunkSize - Number of words per chunk (default: 1000)
   * @param {number} overlap - Number of words to overlap between chunks (default: 200)
   * @returns {Array<{text: string, index: number}>} Array of text chunks
   */
  static splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Split text into words
    const words = text.trim().split(/\s+/);
    const chunks = [];

    if (words.length <= chunkSize) {
      // If text is smaller than chunk size, return as single chunk
      return [{ text: text.trim(), index: 0 }];
    }

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + chunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkText = chunkWords.join(' ');

      chunks.push({
        text: chunkText.trim(),
        index: chunkIndex,
      });

      // Move start index forward, accounting for overlap
      startIndex = endIndex - overlap;
      chunkIndex++;

      // Prevent infinite loop if overlap is too large
      if (overlap >= chunkSize) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Generate embedding for a text chunk using OpenAI
   * @param {string} text - The text to generate embedding for
   * @param {string} model - Embedding model to use (default: text-embedding-3-small)
   * @returns {Promise<number[]>} Array of embedding values (1536 dimensions)
   */
  static async generateEmbedding(text, model = 'text-embedding-3-small') {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text must be a non-empty string');
    }

    const openai = this.initializeOpenAI();

    try {
      const response = await openai.embeddings.create({
        model: model,
        input: text.trim(),
      });

      if (!response.data || !response.data[0] || !response.data[0].embedding) {
        throw new Error('Invalid response from OpenAI embeddings API');
      }

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks (batch processing)
   * @param {Array<string>} texts - Array of texts to generate embeddings for
   * @param {string} model - Embedding model to use
   * @param {number} batchSize - Number of texts to process in each batch (default: 100)
   * @returns {Promise<Array<number[]>>} Array of embedding arrays
   */
  static async generateEmbeddingsBatch(texts, model = 'text-embedding-3-small', batchSize = 3) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const openai = this.initializeOpenAI();
    const embeddings = [];

    // Process in very small batches (3 at a time) to avoid memory issues
    // Also add delay between batches to prevent rate limits
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        console.log(`  Generating embeddings for batch ${i + 1}-${Math.min(i + batchSize, texts.length)} of ${texts.length}...`);
        
        const response = await openai.embeddings.create({
          model: model,
          input: batch,
        });

        if (response.data) {
          const batchEmbeddings = response.data.map(item => item.embedding);
          embeddings.push(...batchEmbeddings);
          
          // Clear response from memory immediately
          response.data = null;
          batch.length = 0;
        }
        
        // Force garbage collection hint and delay between batches
        if (global.gc) {
          global.gc();
        }
        
        // Small delay between batches to prevent rate limits and reduce memory pressure
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch ${i}-${i + batch.length}:`, error);
        // Continue with next batch even if one fails
      }
    }

    return embeddings;
  }

  /**
   * Process a large prompt: chunk it and generate embeddings
   * @param {string} promptText - The full prompt text
   * @param {Object} options - Chunking and embedding options
   * @returns {Promise<Array<{text: string, index: number, embedding: number[]}>>}
   */
  static async processPrompt(promptText, options = {}) {
    const {
      chunkSize = 1000,
      overlap = 200,
      model = 'text-embedding-3-small',
      batchSize = 3, // Very small batch size (3) to prevent memory issues
    } = options;

    // Step 1: Split into chunks
    const chunks = this.splitIntoChunks(promptText, chunkSize, overlap);
    
    if (chunks.length === 0) {
      return [];
    }

    console.log(`📦 Split prompt into ${chunks.length} chunks`);

    // Step 2: Generate embeddings for all chunks (in very small batches)
    const texts = chunks.map(chunk => chunk.text);
    const embeddings = await this.generateEmbeddingsBatch(texts, model, batchSize);

    // Clear texts array immediately after use
    texts.length = 0;

    if (embeddings.length !== chunks.length) {
      throw new Error(`Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`);
    }

    // Step 3: Combine chunks with embeddings
    const processedChunks = chunks.map((chunk, index) => ({
      text: chunk.text,
      index: chunk.index,
      embedding: embeddings[index],
    }));

    // Clear large arrays from memory immediately
    chunks.length = 0;
    embeddings.length = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log(`✅ Generated embeddings for ${processedChunks.length} chunks`);

    return processedChunks;
  }
}

module.exports = PromptChunkingService;

