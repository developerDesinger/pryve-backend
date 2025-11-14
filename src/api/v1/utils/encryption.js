const crypto = require("crypto");

/**
 * Encryption utility for API keys
 * Uses AES-256-GCM encryption
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate a default
 * In production, use a strong key from environment variables
 */
const getEncryptionKey = () => {
  const key = process.env.API_KEY_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!key) {
    throw new Error("API_KEY_ENCRYPTION_KEY or JWT_SECRET must be set in environment");
  }
  // Derive a 32-byte key from the secret
  return crypto.pbkdf2Sync(key, "api-key-salt", 100000, KEY_LENGTH, "sha512");
};

/**
 * Encrypt API key
 * @param {string} text - Plain text API key to encrypt
 * @returns {string} Encrypted string (format: iv:salt:tag:encrypted)
 */
const encrypt = (text) => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag();
    
    // Return format: iv:salt:tag:encrypted
    return `${iv.toString("hex")}:${salt.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt API key");
  }
};

/**
 * Decrypt API key
 * @param {string} encryptedText - Encrypted string (format: iv:salt:tag:encrypted)
 * @returns {string} Decrypted plain text API key
 */
const decrypt = (encryptedText) => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted format");
    }
    
    const [ivHex, saltHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt API key");
  }
};

/**
 * Mask API key for display (show only first and last few characters)
 * @param {string} key - API key to mask
 * @param {number} visibleChars - Number of characters to show at start and end
 * @returns {string} Masked key (e.g., "sk-...xyz")
 */
const maskKey = (key, visibleChars = 4) => {
  if (!key || key.length <= visibleChars * 2) {
    return "***";
  }
  const start = key.substring(0, visibleChars);
  const end = key.substring(key.length - visibleChars);
  return `${start}...${end}`;
};

module.exports = {
  encrypt,
  decrypt,
  maskKey,
};

