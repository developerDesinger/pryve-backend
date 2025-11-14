const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const { encrypt, decrypt, maskKey } = require("../utils/encryption");

class ApiKeyService {
  /**
   * Create or update API key
   * POST /api/v1/api-keys
   */
  static async createOrUpdateApiKey(data) {
    const { name, apiType, keyValue, description, environment } = data;

    // Validate required fields
    if (!name || !apiType || !keyValue) {
      throw new AppError(
        "Name, API type, and key value are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate API type
    const validApiTypes = ["OPENAI", "STRIPE", "SENDGRID", "FIREBASE", "AWS", "OTHER"];
    if (!validApiTypes.includes(apiType.toUpperCase())) {
      throw new AppError(
        `Invalid API type. Must be one of: ${validApiTypes.join(", ")}`,
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(keyValue);

    // Check if API key already exists for this type and environment
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        apiType: apiType.toUpperCase(),
        environment: environment || null,
      },
    });

    let apiKey;

    if (existingKey) {
      // Update existing key
      apiKey = await prisma.apiKey.update({
        where: { id: existingKey.id },
        data: {
          name,
          keyValue: encryptedKey,
          description,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new key
      apiKey = await prisma.apiKey.create({
        data: {
          name,
          apiType: apiType.toUpperCase(),
          keyValue: encryptedKey,
          description,
          environment: environment || null,
          isActive: true,
        },
      });
    }

    // Return masked key for security
    const maskedKey = maskKey(keyValue);

    return {
      message: existingKey
        ? "API key updated successfully."
        : "API key created successfully.",
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        apiType: apiKey.apiType,
        description: apiKey.description,
        environment: apiKey.environment,
        isActive: apiKey.isActive,
        maskedKey, // Show masked version
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      },
    };
  }

  /**
   * Get all API keys (with masked values)
   * GET /api/v1/api-keys
   */
  static async getAllApiKeys() {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Decrypt and mask keys for display
    const maskedKeys = apiKeys.map((key) => {
      try {
        const decrypted = decrypt(key.keyValue);
        return {
          id: key.id,
          name: key.name,
          apiType: key.apiType,
          description: key.description,
          environment: key.environment,
          isActive: key.isActive,
          maskedKey: maskKey(decrypted),
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
        };
      } catch (error) {
        console.error(`Error decrypting key ${key.id}:`, error);
        return {
          id: key.id,
          name: key.name,
          apiType: key.apiType,
          description: key.description,
          environment: key.environment,
          isActive: key.isActive,
          maskedKey: "***",
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
        };
      }
    });

    return {
      message: "API keys retrieved successfully.",
      success: true,
      data: maskedKeys,
    };
  }

  /**
   * Get API key by ID (with masked value)
   * GET /api/v1/api-keys/:id
   */
  static async getApiKeyById(id) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new AppError("API key not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Decrypt and mask key
    let maskedKey = "***";
    try {
      const decrypted = decrypt(apiKey.keyValue);
      maskedKey = maskKey(decrypted);
    } catch (error) {
      console.error(`Error decrypting key ${id}:`, error);
    }

    return {
      message: "API key retrieved successfully.",
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        apiType: apiKey.apiType,
        description: apiKey.description,
        environment: apiKey.environment,
        isActive: apiKey.isActive,
        maskedKey,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      },
    };
  }

  /**
   * Get decrypted API key by type (for internal use)
   * This should only be used internally, not exposed via API
   */
  static async getDecryptedKeyByType(apiType, environment = null) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        apiType: apiType.toUpperCase(),
        environment: environment || null,
        isActive: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    try {
      const decrypted = decrypt(apiKey.keyValue);
      
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      return decrypted;
    } catch (error) {
      console.error(`Error decrypting key for ${apiType}:`, error);
      return null;
    }
  }

  /**
   * Update API key
   * PATCH /api/v1/api-keys/:id
   */
  static async updateApiKey(id, data) {
    const { name, keyValue, description, isActive } = data;

    const existingKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!existingKey) {
      throw new AppError("API key not found.", HttpStatusCodes.NOT_FOUND);
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (keyValue) {
      // Encrypt new key value
      updateData.keyValue = encrypt(keyValue);
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
    });

    // Return masked key
    let maskedKey = "***";
    if (keyValue) {
      maskedKey = maskKey(keyValue);
    } else {
      try {
        const decrypted = decrypt(updatedKey.keyValue);
        maskedKey = maskKey(decrypted);
      } catch (error) {
        console.error(`Error decrypting key ${id}:`, error);
      }
    }

    return {
      message: "API key updated successfully.",
      success: true,
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        apiType: updatedKey.apiType,
        description: updatedKey.description,
        environment: updatedKey.environment,
        isActive: updatedKey.isActive,
        maskedKey,
        lastUsedAt: updatedKey.lastUsedAt,
        createdAt: updatedKey.createdAt,
        updatedAt: updatedKey.updatedAt,
      },
    };
  }

  /**
   * Delete API key
   * DELETE /api/v1/api-keys/:id
   */
  static async deleteApiKey(id) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new AppError("API key not found.", HttpStatusCodes.NOT_FOUND);
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return {
      message: "API key deleted successfully.",
      success: true,
    };
  }

  /**
   * Toggle API key active status
   * PATCH /api/v1/api-keys/:id/toggle
   */
  static async toggleApiKeyStatus(id) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new AppError("API key not found.", HttpStatusCodes.NOT_FOUND);
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        isActive: !apiKey.isActive,
      },
    });

    return {
      message: `API key ${updatedKey.isActive ? "activated" : "deactivated"} successfully.`,
      success: true,
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        apiType: updatedKey.apiType,
        isActive: updatedKey.isActive,
      },
    };
  }
}

module.exports = ApiKeyService;

