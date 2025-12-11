const AIConfigService = require("../services/aiConfig.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");
const progressManager = require("../utils/progressManager");
const jwt = require("jsonwebtoken");

class AIConfigController {
  /**
   * GET endpoint for progress tracking (polling)
   * GET /api/v1/ai-config/progress/:sessionId?token=...
   */
  static getAIConfigProgress = catchAsyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        error: 'Session ID is required' 
      });
    }

    // Verify token
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
          return res.status(401).json({ 
            success: false,
            error: 'Invalid or expired token' 
          });
        }
      } catch (error) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid or expired token' 
        });
      }
    }

    // Set CORS headers
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Get progress data for this session
    const progressData = progressManager.progressData.get(sessionId);
    
    // If session doesn't exist yet, return empty progress (polling will continue)
    // This happens when polling starts before the PATCH request that creates the session
    if (!progressData) {
      return res.status(200).json({ 
        success: true,
        status: 'initializing',
        progress: 0,
        totalChunks: 0,
        processedChunks: 0,
        currentBatch: 0,
        totalBatches: 0,
        message: 'Waiting for upload to start...'
      });
    }

    console.log(`[AIConfigController] Progress requested for session: ${sessionId}`, {
      status: progressData.status,
      progress: progressData.progress,
      processedChunks: progressData.processedChunks,
      totalChunks: progressData.totalChunks,
    });

    return res.status(200).json({
      success: true,
      ...progressData
    });
  });

  static updateAIConfig = catchAsyncHandler(async (req, res) => {
    const sessionId = req.query.sessionId || null;
    console.log(`[AIConfigController] ==========================================`);
    console.log(`[AIConfigController] updateAIConfig called`);
    console.log(`[AIConfigController] sessionId from query: ${sessionId || 'NULL'}`);
    console.log(`[AIConfigController] Query params:`, JSON.stringify(req.query));

    // Create progress callback using closure to ensure sessionId is always available
    let progressCallback = null;
    if (sessionId) {
      // For now, create callback synchronously - connection wait happens in callback creation
      // This ensures the callback is always created even if connection isn't ready
      progressCallback = (progress) => {
        try {
          console.log(`[AIConfigController] 📊 Progress callback invoked for session ${sessionId}:`, {
            status: progress.status,
            progress: `${progress.progress}%`,
            processedChunks: progress.processedChunks,
            totalChunks: progress.totalChunks,
          });
          progressManager.updateProgress(sessionId, progress);
        } catch (error) {
          console.error(`[AIConfigController] ❌ Error in progress callback:`, error);
        }
      };

      // Initialize session
      if (!progressManager.progressData.has(sessionId)) {
        console.log(`[AIConfigController] Initializing session: ${sessionId}`);
        progressManager.initSession(sessionId);
      }

      console.log(`[AIConfigController] ✅ Progress callback created successfully`);
    } else {
      console.log(`[AIConfigController] ⚠️ No sessionId provided, progress callback will be null`);
    }

    console.log(`[AIConfigController] Calling AIConfigService.createOrUpdateAIConfig`);
    console.log(`[AIConfigController] progressCallback type: ${typeof progressCallback}`);
    console.log(`[AIConfigController] progressCallback is function: ${typeof progressCallback === 'function'}`);
    
    const result = await AIConfigService.createOrUpdateAIConfig(
      req.body,
      sessionId,
      progressCallback
    );

    // Close session after completion
    if (sessionId) {
      setTimeout(() => {
        console.log(`[AIConfigController] Closing session: ${sessionId}`);
        progressManager.closeSession(sessionId);
      }, 2000); // Give more time for final progress update
    }

    console.log(`[AIConfigController] ==========================================`);
    return res.status(200).json(result);
  });

  static getAIConfig = catchAsyncHandler(async (req, res) => {
    const result = await AIConfigService.getAIConfig();
    return res.status(200).json(result);
  });

  static deleteAIConfig = catchAsyncHandler(async (req, res) => {
    const result = await AIConfigService.deleteAIConfig();
    return res.status(200).json(result);
  });
}

module.exports = AIConfigController;
