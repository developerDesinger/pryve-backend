/**
 * Socket.IO Progress Manager
 * Manages progress tracking for chunk uploads using Socket.IO for real-time updates
 */
class SocketProgressManager {
  constructor() {
    // Store progress data by sessionId
    this.progressData = new Map();
    // Cleanup interval
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }

  /**
   * Get Socket.IO instance from app
   */
  getIO() {
    const app = require('../../../app');
    return app.get('io');
  }

  /**
   * Initialize a new session for progress tracking
   * @param {string} sessionId - Unique session identifier
   * @param {string} userId - User ID for room-based updates
   */
  initSession(sessionId, userId = null) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Initialize progress data
    this.progressData.set(sessionId, {
      status: 'initializing',
      progress: 0,
      totalChunks: 0,
      processedChunks: 0,
      currentBatch: 0,
      totalBatches: 0,
      message: 'Initializing...',
      startTime: Date.now(),
      userId: userId,
    });

    console.log(`[SocketProgressManager] Initialized session: ${sessionId} for user: ${userId || 'unknown'}`);
  }

  /**
   * Update progress for a session and emit via Socket.IO
   * @param {string} sessionId - Session identifier
   * @param {Object} progress - Progress data
   */
  updateProgress(sessionId, progress) {
    if (!sessionId) {
      console.warn('[SocketProgressManager] updateProgress called without sessionId');
      return;
    }

    const existingData = this.progressData.get(sessionId) || {};
    const updatedData = {
      ...existingData,
      ...progress,
      updatedAt: Date.now(),
    };

    this.progressData.set(sessionId, updatedData);

    // Emit progress via Socket.IO
    this.emitProgress(sessionId, updatedData);
  }

  /**
   * Emit progress update via Socket.IO
   * @param {string} sessionId - Session identifier
   * @param {Object} progressData - Progress data to emit
   */
  emitProgress(sessionId, progressData) {
    const io = this.getIO();
    if (!io) {
      console.warn('[SocketProgressManager] Socket.IO not available');
      return;
    }

    const userId = progressData.userId;
    
    console.log(`[SocketProgressManager] Emitting progress for ${sessionId}:`, {
      status: progressData.status,
      progress: progressData.progress,
      processedChunks: progressData.processedChunks,
      totalChunks: progressData.totalChunks,
    });

    // Emit to specific user room if userId is provided
    if (userId) {
      io.to(userId).emit('chunk-upload-progress', {
        sessionId,
        ...progressData,
      });
    } else {
      // Emit to all connected clients (fallback)
      io.emit('chunk-upload-progress', {
        sessionId,
        ...progressData,
      });
    }
  }

  /**
   * Get current progress for a session
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Progress data or null if not found
   */
  getProgress(sessionId) {
    return this.progressData.get(sessionId) || null;
  }

  /**
   * Close a session
   * @param {string} sessionId - Session identifier
   */
  closeSession(sessionId) {
    const progressData = this.progressData.get(sessionId);
    
    if (progressData) {
      // Send completion message
      const finalData = {
        ...progressData,
        status: 'completed',
        progress: 100,
        message: 'Upload completed successfully',
        completedAt: Date.now(),
      };

      this.emitProgress(sessionId, finalData);

      // Keep progress data for a while in case client reconnects
      setTimeout(() => {
        this.progressData.delete(sessionId);
      }, 60000); // Keep for 1 minute

      console.log(`[SocketProgressManager] Closed session: ${sessionId}`);
    }
  }

  /**
   * Cleanup old sessions and progress data
   */
  cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, progressData] of this.progressData.entries()) {
      const age = now - (progressData.updatedAt || progressData.startTime || 0);
      
      if (age > maxAge) {
        // Close session if it's old
        this.closeSession(sessionId);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      return;
    }

    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 2 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
const socketProgressManager = new SocketProgressManager();

module.exports = socketProgressManager;

