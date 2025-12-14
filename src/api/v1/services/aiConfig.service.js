const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const SupabaseVectorService = require("./supabaseVector.service");

class AIConfigService {
  static async createOrUpdateAIConfig(data, sessionId = null, progressCallback = null) {
    console.log(`[AIConfigService] ==========================================`);
    console.log(`[AIConfigService] createOrUpdateAIConfig called`);
    console.log(`[AIConfigService] sessionId: ${sessionId || 'NULL'}`);
    console.log(`[AIConfigService] progressCallback type: ${typeof progressCallback}`);
    console.log(`[AIConfigService] progressCallback is function: ${typeof progressCallback === 'function'}`);
    console.log(`[AIConfigService] progressCallback truthy: ${!!progressCallback}`);
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
          
          // Store chunks in Supabase Vector DB
          const sourceId = aiConfig.id;
          
          // ==========================================
          // STEP 1: ALWAYS DELETE OLD CHUNKS FIRST
          // ==========================================
          // This ensures old chunks are removed before storing new ones
          
          // Delete old chunks for the NEW sourceId (handles updates with same ID)
          console.log(`🗑️  [STEP 1] Deleting existing chunks for source ID: ${sourceId}...`);
          const deleteStartTime = Date.now();
          const deletedCount = await SupabaseVectorService.deleteChunksBySource(sourceId);
          const deleteDuration = Date.now() - deleteStartTime;
          console.log(`✅ [STEP 1] Deleted ${deletedCount} existing chunks for source ${sourceId} (${deleteDuration}ms)`);
          
          // Also delete chunks for OLD sourceId if it's different (handles ID changes)
          if (existingConfig && existingConfig.id !== sourceId) {
            console.log(`🗑️  [STEP 1] Also deleting old chunks for previous source ID: ${existingConfig.id}...`);
            const oldDeleteStartTime = Date.now();
            const oldDeletedCount = await SupabaseVectorService.deleteChunksBySource(existingConfig.id);
            const oldDeleteDuration = Date.now() - oldDeleteStartTime;
            console.log(`✅ [STEP 1] Deleted ${oldDeletedCount} old chunks from previous source (${oldDeleteDuration}ms)`);
          }
          
          // Verify deletion completed (double-check)
          const remainingChunks = await SupabaseVectorService.getChunkCountBySource(sourceId);
          if (remainingChunks > 0) {
            console.warn(`⚠️  [STEP 1] WARNING: ${remainingChunks} chunks still exist for source ${sourceId} after deletion. Retrying...`);
            const retryDeletedCount = await SupabaseVectorService.deleteChunksBySource(sourceId);
            console.log(`✅ [STEP 1] Retry deleted ${retryDeletedCount} additional chunks`);
          } else {
            console.log(`✅ [STEP 1] Verification: No chunks remain for source ${sourceId} - deletion confirmed`);
          }
          
          // ==========================================
          // STEP 2: STORE NEW CHUNKS (only after deletion is confirmed)
          // ==========================================
          console.log(`🚀 [STEP 2] Starting to store NEW chunks in Supabase Vector DB (sourceId: ${sourceId})...`);
          console.log(`[AIConfigService] About to call storePromptChunks`);
          console.log(`[AIConfigService] progressCallback before call: ${progressCallback ? 'EXISTS' : 'NULL'}`);
          console.log(`[AIConfigService] progressCallback type: ${typeof progressCallback}`);
          if (progressCallback) {
            console.log(`[AIConfigService] progressCallback.toString(): ${progressCallback.toString().substring(0, 100)}...`);
          }
          const storeStartTime = Date.now();
          
          // Ensure callback is passed correctly - use a wrapper to ensure it's not lost
          const wrappedCallback = progressCallback ? (progress) => {
            console.log(`[AIConfigService] Wrapped callback invoked, forwarding to original callback`);
            try {
              progressCallback(progress);
            } catch (error) {
              console.error(`[AIConfigService] Error in wrapped callback:`, error);
            }
          } : null;
          
          await SupabaseVectorService.storePromptChunks(
            systemPrompt,
            {
              source: 'ai_config',
              version: '1.0',
              prompt_active: systemPromptActive,
              word_count: wordCount,
            },
            sourceId,
            wrappedCallback || progressCallback // Use wrapped if available, fallback to original
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
