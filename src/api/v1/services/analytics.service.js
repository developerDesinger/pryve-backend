const prisma = require("../../../lib/prisma");

const parseDate = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

class AnalyticsService {
  /**
   * Returns a breakdown of messages grouped by detected emotion.
   * @param {Object} filters
   * @param {string} [filters.userId] - Filter by message sender.
   * @param {string} [filters.chatId] - Filter by chat.
   * @param {string|Date} [filters.startDate] - ISO date string or Date instance.
   * @param {string|Date} [filters.endDate] - ISO date string or Date instance.
   * @param {boolean} [filters.includeAI=false] - Include AI generated messages.
   * @returns {Promise<Object>}
   */
  static async getEmotionSummary(filters = {}) {
    const { userId, chatId, startDate, endDate, includeAI = false } = filters;

    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);

    const baseWhere = {
      isDeleted: false,
    };

    if (!includeAI) {
      baseWhere.isFromAI = false;
    }

    if (userId) {
      baseWhere.senderId = userId;
    }

    if (chatId) {
      baseWhere.chatId = chatId;
    }

    if (parsedStart || parsedEnd) {
      baseWhere.createdAt = {};
      if (parsedStart) {
        baseWhere.createdAt.gte = parsedStart;
      }
      if (parsedEnd) {
        baseWhere.createdAt.lte = parsedEnd;
      }
    }

    const categorizedWhere = {
      ...baseWhere,
      emotion: {
        not: null,
      },
    };

    const [emotionGroups, uncategorizedCount] = await Promise.all([
      prisma.message.groupBy({
        by: ["emotion"],
        where: categorizedWhere,
        _count: {
          _all: true,
        },
      }),
      prisma.message.count({
        where: {
          ...baseWhere,
          emotion: null,
        },
      }),
    ]);

    const totalCategorized = emotionGroups.reduce(
      (sum, row) => sum + row._count._all,
      0
    );
    const totalMessages = totalCategorized + uncategorizedCount;

    const emotions = emotionGroups
      .map((row) => {
        const emotionKey = row.emotion || "unknown";
        return {
          emotion: emotionKey,
          count: row._count._all,
          percentage: totalCategorized
            ? Number(((row._count._all / totalCategorized) * 100).toFixed(2))
            : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    if (uncategorizedCount > 0) {
      emotions.push({
        emotion: "uncategorized",
        count: uncategorizedCount,
        percentage: totalMessages
          ? Number(((uncategorizedCount / totalMessages) * 100).toFixed(2))
          : 0,
      });
    }

    const firstMessageWhere = {
      ...baseWhere,
      isFromAI: false,
    };

    const firstMessagesByChat = await prisma.message.groupBy({
      by: ["chatId"],
      where: firstMessageWhere,
      _min: {
        createdAt: true,
      },
    });

    let firstMessages = [];

    if (firstMessagesByChat.length) {
      const firstMessageConditions = firstMessagesByChat
        .filter((row) => row._min.createdAt)
        .map((row) => ({
          chatId: row.chatId,
          createdAt: row._min.createdAt,
          isFromAI: false,
        }));

      if (firstMessageConditions.length) {
        firstMessages = await prisma.message.findMany({
          where: {
            OR: firstMessageConditions,
          },
          select: {
            id: true,
            content: true,
          },
        });
      }
    }

    const starterCounts = new Map();
    let starterTotal = 0;

    firstMessages.forEach((msg) => {
      const rawContent = (msg.content || "").trim();
      if (!rawContent) {
        return;
      }

      const normalized = rawContent.toLowerCase();
      const existing = starterCounts.get(normalized);
      if (existing) {
        existing.count += 1;
      } else {
        starterCounts.set(normalized, {
          message: rawContent,
          count: 1,
        });
      }
      starterTotal += 1;
    });

    const topFirstMessages = Array.from(starterCounts.values())
      .map((entry) => ({
        message: entry.message,
        count: entry.count,
        percentage: starterTotal
          ? Number(((entry.count / starterTotal) * 100).toFixed(2))
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      success: true,
      message: "Emotion analytics fetched successfully.",
      data: {
        totalMessages,
        totalCategorized,
        includeAI,
        filtersApplied: {
          userId: userId || null,
          chatId: chatId || null,
          startDate: parsedStart || null,
          endDate: parsedEnd || null,
        },
        emotions,
        firstMessageStarters: {
          total: starterTotal,
          items: topFirstMessages,
        },
      },
    };
  }
}

module.exports = AnalyticsService;
