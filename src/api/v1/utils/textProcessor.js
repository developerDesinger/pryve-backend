/**
 * Text processing utilities for cleaning and filtering message content
 */

// Common meaningless short words to filter out
const MEANINGLESS_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Prepositions
  'in', 'on', 'at', 'by', 'for', 'of', 'to', 'up', 'as', 'or', 'with', 'from', 'into', 'about',
  // Conjunctions
  'and', 'but', 'or', 'so', 'if', 'yet', 'nor',
  // Pronouns
  'i', 'me', 'my', 'we', 'us', 'you', 'he', 'she', 'it', 'they', 'them', 'him', 'her', 'his', 'hers', 'its', 'our', 'your', 'their',
  // Common verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'done', 'has', 'have', 'had', 'can', 'could', 'will', 'would', 'should', 'shall',
  // Other short words
  'hi', 'ok', 'oh', 'ah', 'um', 'uh', 'yes', 'no', 'yeah', 'yep', 'nah', 'hey', 'well', 'now', 'then', 'just', 'like', 'get', 'got', 'go', 'went', 'come', 'came',
  // Additional meaningless words
  'really', 'very', 'quite', 'pretty', 'kind', 'sort', 'type', 'way', 'thing', 'stuff', 'things'
]);

/**
 * Remove meaningless short words from text while preserving meaningful content
 * @param {string} text - The text to process
 * @param {number} minWordLength - Minimum word length to keep (default: 3)
 * @returns {string} - Cleaned text
 */
function removeShortMeaninglessWords(text, minWordLength = 3) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Split text into words, preserving punctuation context
  const words = text.toLowerCase().split(/\s+/);
  
  const filteredWords = words.filter(word => {
    // Remove punctuation for checking but keep original word
    const cleanWord = word.replace(/[^\w]/g, '');
    
    // Skip empty words
    if (!cleanWord) return false;
    
    // Remove if it's in the meaningless words list
    if (MEANINGLESS_WORDS.has(cleanWord)) return false;
    
    // Keep word if:
    // 1. It's longer than minimum length, OR
    // 2. It contains numbers or special characters (likely meaningful)
    return (
      cleanWord.length >= minWordLength ||
      /\d/.test(cleanWord) ||
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(word)
    );
  });

  // Rejoin and clean up extra spaces
  let result = filteredWords.join(' ').trim();
  
  // If result is too short or empty, return first few words of original
  if (result.length < 10) {
    const originalWords = text.split(/\s+/);
    result = originalWords.slice(0, Math.min(5, originalWords.length)).join(' ');
  }
  
  return result;
}

/**
 * Create a clean title from message content
 * @param {string} content - The message content
 * @param {number} maxLength - Maximum title length (default: 100)
 * @returns {string} - Clean title
 */
function createCleanTitle(content, maxLength = 100) {
  if (!content) return content;
  
  // First remove meaningless words
  let cleanContent = removeShortMeaninglessWords(content);
  
  // Truncate if too long
  if (cleanContent.length > maxLength) {
    cleanContent = cleanContent.substring(0, maxLength).trim();
    // Try to end at a word boundary
    const lastSpace = cleanContent.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      cleanContent = cleanContent.substring(0, lastSpace);
    }
    cleanContent += '...';
  }
  
  return cleanContent;
}

module.exports = {
  removeShortMeaninglessWords,
  createCleanTitle,
  MEANINGLESS_WORDS
};