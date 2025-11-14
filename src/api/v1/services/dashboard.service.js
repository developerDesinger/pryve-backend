const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");

class DashboardService {
  /**
   * Get User Activity Trends
   * Returns daily active users and message volume for a given period
   * GET /api/v1/dashboard/activity-trends
   */
  static async getUserActivityTrends(period = "monthly") {
    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate;
      
      switch (period.toLowerCase()) {
        case "daily":
          startDate = new Date(now.setDate(now.getDate() - 7)); // Last 7 days
          break;
        case "weekly":
          startDate = new Date(now.setDate(now.getDate() - 30)); // Last 30 days
          break;
        case "monthly":
          startDate = new Date(now.setDate(now.getDate() - 90)); // Last 90 days
          break;
        case "yearly":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1)); // Last year
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 90)); // Default to 90 days
      }

      // Get all messages in the period
      const messages = await prisma.message.findMany({
        where: {
          createdAt: { gte: startDate },
          isDeleted: false,
          isFromAI: false,
        },
        select: {
          createdAt: true,
          senderId: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Group by date
      const dailyStats = {};
      messages.forEach((msg) => {
        const dateKey = new Date(msg.createdAt).toISOString().split("T")[0];
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            date: dateKey,
            activeUsers: new Set(),
            messageCount: 0,
          };
        }
        dailyStats[dateKey].activeUsers.add(msg.senderId);
        dailyStats[dateKey].messageCount += 1;
      });

      // Format data for chart
      const trends = Object.values(dailyStats)
        .map((stat) => ({
          date: stat.date,
          activeUsers: stat.activeUsers.size,
          messageVolume: stat.messageCount,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate totals
      const totalActiveUsers = await prisma.user.count({
        where: {
          status: "ACTIVE",
          isDeleted: false,
        },
      });

      const totalMessages = await prisma.message.count({
        where: {
          createdAt: { gte: startDate },
          isDeleted: false,
        },
      });

      return {
        success: true,
        message: "User activity trends fetched successfully.",
        data: {
          period,
          trends,
          summary: {
            totalActiveUsers,
            totalMessages,
            averageDailyActiveUsers: trends.length > 0 
              ? Math.round(trends.reduce((sum, t) => sum + t.activeUsers, 0) / trends.length)
              : 0,
            averageDailyMessages: trends.length > 0
              ? Math.round(trends.reduce((sum, t) => sum + t.messageVolume, 0) / trends.length)
              : 0,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching user activity trends:", error);
      throw new AppError(
        "Failed to fetch user activity trends.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get User Engagement
   * Returns active vs inactive users breakdown
   * GET /api/v1/dashboard/user-engagement
   */
  static async getUserEngagement() {
    try {
      // Get user counts by status
      const [activeUsers, inactiveUsers, totalUsers] = await Promise.all([
        prisma.user.count({
          where: {
            status: "ACTIVE",
            isDeleted: false,
          },
        }),
        prisma.user.count({
          where: {
            status: "INACTIVE",
            isDeleted: false,
          },
        }),
        prisma.user.count({
          where: {
            isDeleted: false,
          },
        }),
      ]);

      // Get users with recent activity (active in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersWithRecentActivity = await prisma.user.count({
        where: {
          isDeleted: false,
          chats: {
            some: {
              messages: {
                some: {
                  createdAt: { gte: thirtyDaysAgo },
                  isDeleted: false,
                  isFromAI: false,
                },
              },
            },
          },
        },
      });

      const engagementRate = totalUsers > 0 
        ? Math.round((usersWithRecentActivity / totalUsers) * 100)
        : 0;

      return {
        success: true,
        message: "User engagement data fetched successfully.",
        data: {
          breakdown: {
            activeUsers,
            inactiveUsers,
            totalUsers,
          },
          recentActivity: {
            usersWithActivityLast30Days: usersWithRecentActivity,
            engagementRate: `${engagementRate}%`,
          },
          percentages: {
            activePercentage: totalUsers > 0 
              ? Math.round((activeUsers / totalUsers) * 100)
              : 0,
            inactivePercentage: totalUsers > 0
              ? Math.round((inactiveUsers / totalUsers) * 100)
              : 0,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching user engagement:", error);
      throw new AppError(
        "Failed to fetch user engagement data.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Emotional Topics Analysis
   * Returns AI-detected emotional themes from user conversations
   * GET /api/v1/dashboard/emotional-topics
   */
  static async getEmotionalTopicsAnalysis() {
    try {
      // Map emotions to topics (you can customize this mapping)
      const emotionToTopicMap = {
        joy: "Self Confidence",
        surprise: "Career Transitions",
        sadness: "Relationship Issues",
        anger: "Anxiety & Stress",
        fear: "Anxiety & Stress",
        disgust: "Family Dynamics",
        neutral: "Work-Life Balance",
      };

      // Get all messages with emotions
      const messagesWithEmotions = await prisma.message.findMany({
        where: {
          isDeleted: false,
          isFromAI: false,
          emotion: { not: null },
          emotionConfidence: { gte: 0.5 }, // Only confident detections
        },
        select: {
          emotion: true,
          emotionConfidence: true,
          senderId: true,
          createdAt: true,
        },
      });

      // Group by topic
      const topicStats = {};
      const uniqueUsersByTopic = {};

      messagesWithEmotions.forEach((msg) => {
        const topic = emotionToTopicMap[msg.emotion] || "Other";
        
        if (!topicStats[topic]) {
          topicStats[topic] = {
            topic,
            mentions: 0,
            members: new Set(),
            positiveCount: 0,
          };
        }

        topicStats[topic].mentions += 1;
        topicStats[topic].members.add(msg.senderId);
        
        // Count positive emotions (joy, surprise)
        if (["joy", "surprise"].includes(msg.emotion)) {
          topicStats[topic].positiveCount += 1;
        }
      });

      // Convert to array and format
      const topics = Object.values(topicStats).map((stat) => ({
        topic: stat.topic,
        mentions: stat.mentions,
        members: stat.members.size,
        positiveCount: stat.positiveCount,
      }));

      // Sort by mentions (descending)
      topics.sort((a, b) => b.mentions - a.mentions);

      // Calculate totals
      const totalMentions = messagesWithEmotions.length;
      const positiveTopics = topics.filter(
        (t) => t.positiveCount > 0 && t.positiveCount / t.mentions > 0.3
      ).length;

      // Calculate average growth (comparing last 30 days to previous 30 days)
      const now = new Date();
      const last30Days = new Date(now.setDate(now.getDate() - 30));
      const previous30Days = new Date(now.setDate(now.getDate() - 60));

      const [recentMessages, previousMessages] = await Promise.all([
        prisma.message.count({
          where: {
            createdAt: { gte: last30Days },
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
          },
        }),
        prisma.message.count({
          where: {
            createdAt: {
              gte: previous30Days,
              lt: last30Days,
            },
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
          },
        }),
      ]);

      const avgGrowth = previousMessages > 0
        ? Math.round(((recentMessages - previousMessages) / previousMessages) * 100)
        : recentMessages > 0 ? 100 : 0;

      return {
        success: true,
        message: "Emotional topics analysis fetched successfully.",
        data: {
          summary: {
            totalMentions,
            positiveTopics,
            avgGrowth: `${avgGrowth}%`,
          },
          topics: topics.map((t) => ({
            ...t,
            // Calculate percentage for progress bar
            percentage: totalMentions > 0
              ? Math.round((t.mentions / totalMentions) * 100)
              : 0,
          })),
        },
      };
    } catch (error) {
      console.error("Error fetching emotional topics analysis:", error);
      throw new AppError(
        "Failed to fetch emotional topics analysis.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Recent Activity
   * Returns list of recent user actions and events
   * GET /api/v1/dashboard/recent-activity
   */
  static async getRecentActivity(limit = 10) {
    try {
      const activityLimit = Math.min(parseInt(limit) || 10, 50); // Max 50

      // Get recent user registrations
      const recentUsers = await prisma.user.findMany({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          loginType: true,
        },
        orderBy: { createdAt: "desc" },
        take: activityLimit,
      });

      // Get recent premium upgrades (from RevenueCat payments)
      const recentUpgrades = await prisma.revenueCatPayment.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          productId: true,
          purchaseDate: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { purchaseDate: "desc" },
        take: activityLimit,
      });

      // Get users with heavy usage (25+ messages in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const heavyUsers = await prisma.user.findMany({
        where: {
          isDeleted: false,
          chats: {
            some: {
              messages: {
                some: {
                  createdAt: { gte: sevenDaysAgo },
                  isDeleted: false,
                  isFromAI: false,
                },
              },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          chats: {
            select: {
              messages: {
                where: {
                  createdAt: { gte: sevenDaysAgo },
                  isDeleted: false,
                  isFromAI: false,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      // Format activities
      const activities = [];

      // Add user registrations
      recentUsers.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: "user_registration",
          user: {
            id: user.id,
            name: user.fullName || user.email,
            email: user.email,
          },
          description: `New user registration via ${user.loginType || "Email"}`,
          timestamp: user.createdAt,
          impact: "Medium",
        });
      });

      // Add premium upgrades
      recentUpgrades.forEach((payment) => {
        activities.push({
          id: `upgrade-${payment.id}`,
          type: "premium_upgrade",
          user: {
            id: payment.user.id,
            name: payment.user.fullName || payment.user.email,
            email: payment.user.email,
          },
          description: `Upgraded to premium after trial`,
          timestamp: payment.purchaseDate,
          impact: "High Impact",
        });
      });

      // Add heavy usage
      heavyUsers.forEach((user) => {
        const messageCount = user.chats.reduce(
          (sum, chat) => sum + chat.messages.length,
          0
        );
        if (messageCount >= 25) {
          activities.push({
            id: `usage-${user.id}`,
            type: "heavy_usage",
            user: {
              id: user.id,
              name: user.fullName || user.email,
              email: user.email,
            },
            description: `Heavy usage - ${messageCount} messages`,
            timestamp: new Date(),
            impact: "High Impact",
          });
        }
      });

      // Add subscription cancellations (if you have this data)
      // This would require tracking cancellations in your database

      // Sort by timestamp (most recent first) and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const limitedActivities = activities.slice(0, activityLimit);

      return {
        success: true,
        message: "Recent activity fetched successfully.",
        data: {
          activities: limitedActivities,
          total: limitedActivities.length,
        },
      };
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw new AppError(
        "Failed to fetch recent activity.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get Complete Dashboard Data
   * Returns all dashboard metrics in one call
   * GET /api/v1/dashboard
   */
  static async getDashboardData(period = "monthly", activityLimit = 10) {
    try {
      const [activityTrends, userEngagement, emotionalTopics, recentActivity] =
        await Promise.all([
          this.getUserActivityTrends(period),
          this.getUserEngagement(),
          this.getEmotionalTopicsAnalysis(),
          this.getRecentActivity(activityLimit),
        ]);

      return {
        success: true,
        message: "Dashboard data fetched successfully.",
        data: {
          userActivityTrends: activityTrends.data,
          userEngagement: userEngagement.data,
          emotionalTopicsAnalysis: emotionalTopics.data,
          recentActivity: recentActivity.data,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw new AppError(
        "Failed to fetch dashboard data.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

module.exports = DashboardService;

