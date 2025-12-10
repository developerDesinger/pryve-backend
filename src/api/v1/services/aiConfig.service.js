const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const SupabaseVectorService = require("./supabaseVector.service");

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

    // Store prompt chunks in Supabase Vector DB if prompt is active and has content
    if (systemPromptActive && systemPrompt && systemPrompt.trim().length > 0) {
      try {
        // Check if prompt is large enough to chunk (>500 words)
        const wordCount = systemPrompt.trim().split(/\s+/).length;
        
        if (wordCount > 500) {
          console.log(`📦 Processing prompt for vector storage (${wordCount} words)...`);
          
          // Delete old chunks for this source if updating
          if (existingConfig) {
            console.log(`🗑️  Deleting old chunks for source ID: ${existingConfig.id}...`);
            const deleteStartTime = Date.now();
            const deletedCount = await SupabaseVectorService.deleteChunksBySource(existingConfig.id);
            const deleteDuration = Date.now() - deleteStartTime;
            console.log(`✅ Deleted ${deletedCount} old chunks (${deleteDuration}ms)`);
          } else {
            console.log(`ℹ️  No existing config found, skipping old chunk deletion`);
          }

          // Store chunks in Supabase Vector DB
          const sourceId = aiConfig.id;
          console.log(`🚀 Starting to store chunks in Supabase Vector DB (sourceId: ${sourceId})...`);
          const storeStartTime = Date.now();
          
          await SupabaseVectorService.storePromptChunks(
            systemPrompt,
            {
              source: 'ai_config',
              version: '1.0',
              prompt_active: systemPromptActive,
              word_count: wordCount,
            },
            sourceId
          );
          
          const storeDuration = Date.now() - storeStartTime;
          console.log(`✅ Prompt chunks stored in Supabase Vector DB (total: ${storeDuration}ms)`);
        } else {
          console.log(`ℹ️ Prompt too small (${wordCount} words), skipping vector storage`);
        }
      } catch (error) {
        console.error('Error storing prompt chunks in Supabase:', error);
        // Don't fail the request if vector storage fails
        // The prompt is still saved in PostgreSQL
      }
    } else if (existingConfig && systemPromptActive === false) {
      // If prompt is being deactivated, archive chunks
      try {
        await SupabaseVectorService.deleteChunksBySource(existingConfig.id);
        console.log(`🗄️ Archived chunks for deactivated prompt`);
      } catch (error) {
        console.error('Error archiving chunks:', error);
      }
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
