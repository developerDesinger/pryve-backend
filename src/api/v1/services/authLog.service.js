const prisma = require("../../../lib/prisma");

class AuthLogService {
  /**
   * Log an authentication event
   * @param {Object} logData - Log data object
   * @param {String} logData.eventType - REGISTER, LOGIN, SOCIAL_LOGIN, VERIFY_OTP
   * @param {String} logData.status - SUCCESS, FAILED
   * @param {String} logData.loginType - EMAIL, GOOGLE, APPLE, FACEBOOK (optional)
   * @param {String} logData.userId - User ID (optional for failed attempts)
   * @param {String} logData.email - User email (optional)
   * @param {String} logData.userName - Username (optional)
   * @param {String} logData.provider - Provider name for social login (optional)
   * @param {String} logData.providerId - Provider ID for social login (optional)
   * @param {String} logData.ipAddress - IP address (optional)
   * @param {String} logData.userAgent - User agent (optional)
   * @param {String} logData.errorMessage - Error message for failed attempts (optional)
   * @param {String} logData.errorCode - Error code for failed attempts (optional)
   * @param {Object} logData.metadata - Additional metadata (optional)
   */
  static async logAuthEvent(logData) {
    try {
      const {
        eventType,
        status,
        loginType,
        userId,
        email,
        userName,
        provider,
        providerId,
        ipAddress,
        userAgent,
        errorMessage,
        errorCode,
        metadata,
      } = logData;

      // Validate required fields
      if (!eventType || !status) {
        console.error("[AUTH LOG] Missing required fields:", { eventType, status });
        return;
      }

      // Create log entry
      await prisma.authLog.create({
        data: {
          eventType,
          status,
          loginType: loginType || null,
          userId: userId || null,
          email: email || null,
          userName: userName || null,
          provider: provider || null,
          providerId: providerId || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          errorMessage: errorMessage || null,
          errorCode: errorCode || null,
          metadata: metadata || null,
        },
      });
    } catch (error) {
      // Don't throw error - logging should not break the auth flow
      console.error("[AUTH LOG] Failed to log authentication event:", error.message);
    }
  }

  /**
   * Get authentication logs with pagination and filters
   * @param {Object} query - Query parameters
   * @param {Number} query.page - Page number (default: 1)
   * @param {Number} query.limit - Items per page (default: 50)
   * @param {String} query.eventType - Filter by event type (optional)
   * @param {String} query.status - Filter by status (optional)
   * @param {String} query.email - Filter by email (optional)
   * @param {String} query.userId - Filter by user ID (optional)
   * @param {String} query.startDate - Start date filter (ISO string, optional)
   * @param {String} query.endDate - End date filter (ISO string, optional)
   */
  static async getAuthLogs(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.email) {
      where.email = query.email;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Get total count
    const total = await prisma.authLog.count({ where });

    // Get logs
    const logs = await prisma.authLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        limit,
      },
    };
  }

  /**
   * Get authentication statistics
   */
  static async getAuthStats() {
    try {
      const [
        totalLogs,
        successLogs,
        failedLogs,
        registerCount,
        loginCount,
        socialLoginCount,
        verifyOtpCount,
        recentLogs,
      ] = await Promise.all([
        prisma.authLog.count(),
        prisma.authLog.count({ where: { status: "SUCCESS" } }),
        prisma.authLog.count({ where: { status: "FAILED" } }),
        prisma.authLog.count({ where: { eventType: "REGISTER" } }),
        prisma.authLog.count({ where: { eventType: "LOGIN" } }),
        prisma.authLog.count({ where: { eventType: "SOCIAL_LOGIN" } }),
        prisma.authLog.count({ where: { eventType: "VERIFY_OTP" } }),
        prisma.authLog.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return {
        success: true,
        stats: {
          totalLogs,
          successLogs,
          failedLogs,
          successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0,
          eventTypeCounts: {
            register: registerCount,
            login: loginCount,
            socialLogin: socialLoginCount,
            verifyOtp: verifyOtpCount,
          },
        },
        recentLogs,
      };
    } catch (error) {
      console.error("[AUTH LOG] Failed to get auth stats:", error.message);
      throw error;
    }
  }
}

module.exports = AuthLogService;

