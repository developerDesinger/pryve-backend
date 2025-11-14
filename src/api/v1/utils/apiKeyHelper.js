/**
 * Helper utility to get API keys from database
 * Falls back to environment variables if not found in database
 */

const ApiKeyService = require("../services/apiKey.service");

/**
 * Get API key from database or environment variable
 * @param {string} apiType - Type of API (OPENAI, STRIPE, etc.)
 * @param {string} environment - Environment (PRODUCTION, DEVELOPMENT, etc.)
 * @param {string} envFallback - Environment variable name to fallback to
 * @returns {Promise<string|null>} API key or null
 */
const getApiKey = async (apiType, environment = null, envFallback = null) => {
  try {
    // Try to get from database first
    const key = await ApiKeyService.getDecryptedKeyByType(apiType, environment);
    if (key) {
      return key;
    }

    // Fallback to environment variable
    if (envFallback && process.env[envFallback]) {
      return process.env[envFallback];
    }

    return null;
  } catch (error) {
    console.error(`Error getting API key for ${apiType}:`, error);
    
    // Fallback to environment variable on error
    if (envFallback && process.env[envFallback]) {
      return process.env[envFallback];
    }

    return null;
  }
};

/**
 * Get OpenAI API key
 * @param {string} environment - Environment (default: PRODUCTION)
 * @returns {Promise<string|null>} OpenAI API key
 */
const getOpenAIKey = async (environment = "PRODUCTION") => {
  return getApiKey("OPENAI", environment, "OPENAI_API_KEY");
};

/**
 * Get Stripe secret key
 * @param {string} environment - Environment (default: PRODUCTION)
 * @returns {Promise<string|null>} Stripe secret key
 */
const getStripeKey = async (environment = "PRODUCTION") => {
  return getApiKey("STRIPE", environment, "STRIPE_SECRET_KEY");
};

/**
 * Get SendGrid API key
 * @param {string} environment - Environment (default: PRODUCTION)
 * @returns {Promise<string|null>} SendGrid API key
 */
const getSendGridKey = async (environment = "PRODUCTION") => {
  return getApiKey("SENDGRID", environment, "SENDGRID_API_KEY");
};

module.exports = {
  getApiKey,
  getOpenAIKey,
  getStripeKey,
  getSendGridKey,
};

