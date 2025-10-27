const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");

class AIConfigService {
  static async createOrUpdateAIConfig(data) {
    const {
      systemPrompt,
      systemPromptActive,
      contextNeededMessage,
      contextNeededActive,
      technicalErrorMessage,
      technicalErrorActive,
    } = data;

    // Check if AI config already exists (assuming there's only one global config)
    const existingConfig = await prisma.aIConfig.findFirst();

    let aiConfig;

    if (existingConfig) {
      // Update existing config
      aiConfig = await prisma.aIConfig.update({
        where: { id: existingConfig.id },
        data: {
          systemPrompt,
          systemPromptActive,
          contextNeededMessage,
          contextNeededActive,
          technicalErrorMessage,
          technicalErrorActive,
        },
      });
    } else {
      // Create new config
      aiConfig = await prisma.aIConfig.create({
        data: {
          systemPrompt,
          systemPromptActive,
          contextNeededMessage,
          contextNeededActive,
          technicalErrorMessage,
          technicalErrorActive,
        },
      });
    }

    return {
      message: "AI configuration updated successfully.",
      success: true,
      aiConfig,
    };
  }

  static async getAIConfig() {
    const aiConfig = await prisma.aIConfig.findFirst();

    if (!aiConfig) {
      // Return default config if none exists
      return {
        message: "No AI configuration found. Using defaults.",
        success: true,
        aiConfig: {
          systemPrompt: null,
          systemPromptActive: false,
          contextNeededMessage: null,
          contextNeededActive: false,
          technicalErrorMessage: null,
          technicalErrorActive: false,
        },
      };
    }

    return {
      message: "AI configuration retrieved successfully.",
      success: true,
      aiConfig,
    };
  }

  static async deleteAIConfig() {
    const aiConfig = await prisma.aIConfig.findFirst();

    if (!aiConfig) {
      throw new AppError(
        "AI configuration not found.",
        HttpStatusCodes.NOT_FOUND
      );
    }

    await prisma.aIConfig.delete({
      where: { id: aiConfig.id },
    });

    return {
      message: "AI configuration deleted successfully.",
      success: true,
    };
  }
}

module.exports = AIConfigService;
