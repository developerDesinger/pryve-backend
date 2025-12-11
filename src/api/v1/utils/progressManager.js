/**
 * Progress Manager for SSE (Server-Sent Events)
 * Manages progress tracking for long-running operations like chunk uploads
 */
class ProgressManager {
  constructor() {
    // Store active SSE connections by sessionId
    this.connections = new Map();
    // Store progress data by sessionId
    this.progressData = new Map();
    // Cleanup interval
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }

  /**
   * Initialize a new session for progress tracking
   * @param {string} sessionId - Unique session identifier
   */
  initSession(sessionId) {
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
    });

    console.log(`[ProgressManager] Initialized session: ${sessionId}`);
  }

  /**
   * Update progress for a session
   * @param {string} sessionId - Session identifier
   * @param {Object} progress - Progress data
   */
  updateProgress(sessionId, progress) {
    if (!sessionId) {
      console.warn('[ProgressManager] updateProgress called without sessionId');
      return;
    }

    const existingData = this.progressData.get(sessionId) || {};
    const updatedData = {
      ...existingData,
      ...progress,
      updatedAt: Date.now(),
    };

    this.progressData.set(sessionId, updatedData);

    // Send progress to all connected clients for this session
    this.sendProgress(sessionId, updatedData);
  }

  /**
   * Send progress update to connected clients
   * @param {string} sessionId - Session identifier
   * @param {Object} progressData - Progress data to send
   */
  sendProgress(sessionId, progressData) {
    const connections = this.connections.get(sessionId) || [];

    if (connections.length === 0) {
      // No connections yet, but store the progress for when they connect
      console.log(`[ProgressManager] No connections for session ${sessionId}, storing progress data`);
      // Store progress data so it can be sent when connection is established
      this.progressData.set(sessionId, progressData);
      return;
    }

    const data = JSON.stringify(progressData);
    console.log(`[ProgressManager] Sending progress to ${connections.length} connection(s) for session ${sessionId}:`, {
      status: progressData.status,
      progress: progressData.progress,
      processedChunks: progressData.processedChunks,
      totalChunks: progressData.totalChunks,
      message: progressData.message,
    });

    // Filter out dead connections and send to valid ones
    const validConnections = [];
    connections.forEach((res, index) => {
      try {
        // Check if response is still writable
        if (!res.writable || res.destroyed) {
          console.log(`[ProgressManager] Connection ${index} is not writable, skipping`);
          return;
        }

        res.write(`data: ${data}\n\n`);
        validConnections.push(res);
        console.log(`[ProgressManager] Successfully sent progress to connection ${index}`);
      } catch (error) {
        console.error(`[ProgressManager] Error sending progress to connection ${index}:`, error.message);
      }
    });

    // Update connections map with only valid connections
    if (validConnections.length > 0) {
      this.connections.set(sessionId, validConnections);
    } else {
      this.connections.delete(sessionId);
      console.log(`[ProgressManager] No valid connections remaining for session ${sessionId}`);
    }
  }

  /**
   * Add a new SSE connection for a session
   * @param {string} sessionId - Session identifier
   * @param {Object} res - Express response object
   */
  addConnection(sessionId, res) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Get or create connections array for this session
    const connections = this.connections.get(sessionId) || [];
    connections.push(res);
    this.connections.set(sessionId, connections);

    console.log(`[ProgressManager] Added connection for session: ${sessionId} (total: ${connections.length})`);

    // Send initial progress if available
    const existingProgress = this.progressData.get(sessionId);
    if (existingProgress) {
      console.log(`[ProgressManager] Sending existing progress to new connection for session ${sessionId}`);
      setTimeout(() => {
        this.sendProgress(sessionId, existingProgress);
      }, 200);
    } else {
      // Send a welcome message to confirm connection
      console.log(`[ProgressManager] Sending welcome message to new connection for session ${sessionId}`);
      setTimeout(() => {
        const welcomeData = {
          status: 'connected',
          progress: 0,
          totalChunks: 0,
          processedChunks: 0,
          currentBatch: 0,
          totalBatches: 0,
          message: 'Connected. Waiting for upload to start...',
        };
        this.sendProgress(sessionId, welcomeData);
      }, 200);
    }

    // Send heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        if (res.writable && !res.destroyed) {
          res.write(': heartbeat\n\n');
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch (error) {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30 seconds

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(heartbeatInterval);
      const conns = this.connections.get(sessionId) || [];
      const index = conns.indexOf(res);
      if (index > -1) {
        conns.splice(index, 1);
      }
      if (conns.length === 0) {
        this.connections.delete(sessionId);
      } else {
        this.connections.set(sessionId, conns);
      }
      console.log(`[ProgressManager] Connection closed for session: ${sessionId} (remaining: ${conns.length})`);
    });

    // Handle response errors
    res.on('error', (error) => {
      console.error(`[ProgressManager] Response error for session ${sessionId}:`, error.message);
      clearInterval(heartbeatInterval);
      const conns = this.connections.get(sessionId) || [];
      const index = conns.indexOf(res);
      if (index > -1) {
        conns.splice(index, 1);
      }
      if (conns.length === 0) {
        this.connections.delete(sessionId);
      } else {
        this.connections.set(sessionId, conns);
      }
    });
  }

  /**
   * Close a session and all its connections
   * @param {string} sessionId - Session identifier
   */
  closeSession(sessionId) {
    const connections = this.connections.get(sessionId) || [];
    
    // Send completion message
    const finalData = {
      status: 'completed',
      progress: 100,
      message: 'Upload completed successfully',
      completedAt: Date.now(),
    };

    console.log(`[ProgressManager] Closing session ${sessionId} with ${connections.length} connection(s)`);
    
    connections.forEach((res, index) => {
      try {
        if (res.writable && !res.destroyed) {
          res.write(`data: ${JSON.stringify(finalData)}\n\n`);
          // Give time for message to be sent before closing
          setTimeout(() => {
            try {
              res.end();
            } catch (error) {
              // Ignore errors when closing
            }
          }, 100);
        }
      } catch (error) {
        console.error(`[ProgressManager] Error closing connection ${index}:`, error.message);
      }
    });

    // Clean up connections immediately
    this.connections.delete(sessionId);
    
    // Keep progress data for a short while in case client reconnects
    setTimeout(() => {
      this.progressData.delete(sessionId);
      console.log(`[ProgressManager] Cleaned up progress data for session: ${sessionId}`);
    }, 5000); // Keep for 5 seconds instead of 1 minute

    console.log(`[ProgressManager] Closed session: ${sessionId}`);
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
const progressManager = new ProgressManager();

module.exports = progressManager;
