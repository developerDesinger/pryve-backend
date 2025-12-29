// PRODUCTION SYNTAX FIX
// This is the corrected section that should replace the problematic area in production

// Around line 1985-2160, replace the entire try-catch block with this:

      // Calculate all metrics in parallel
      let heartToHeartsResult, growthMomentsCount, growthMomentsList, breakthroughDaysData;
      let totalChats, totalMessages, totalFavorites, totalMedia, favoriteMessages;
      
      try {
        [
          // 1. Heart-to-hearts: Optimized query with aggregation
          heartToHeartsResult,
          // 2. Growth Moments: Direct count and detail list
          growthMomentsCount,
          growthMomentsList,
          // 3. Breakthrough Days: Optimized with date grouping
          breakthroughDaysData,
          // 4. Statistics
          totalChats,
          totalMessages,
          totalFavorites,
          totalMedia,
          // 5. Favorite messages for vault
          favoriteMessages,
        ] = await Promise.all([
          // Heart-to-hearts: Count chats with >= 3 emotional messages
          prisma.chat.findMany({
            where: {
              userId,
              isDeleted: false,
            },
            select: {
              id: true,
              name: true,
              type: true,
              updatedAt: true,  // FIXED: was lastUpdatedAt
              _count: {
                select: {
                  messages: {
                    where: {
                      isDeleted: false,
                      isFromAI: false,
                      emotion: { not: null },
                      emotionConfidence: { gte: 0.6 },
                    },
                  },
                },
              },
            },
          }),

          // Growth Moments - Count
          prisma.message.count({
            where: {
              chat: { userId, isDeleted: false },
              isDeleted: false,
              isFromAI: false,
              emotion: { in: ["joy", "surprise"] },
              emotionConfidence: { gte: 0.7 },
            },
          }),

          // Growth Moments - Detail List
          prisma.message.findMany({
            where: {
              chat: { userId, isDeleted: false },
              isDeleted: false,
              isFromAI: false,
              emotion: { in: ["joy", "surprise"] },
              emotionConfidence: { gte: 0.7 },
            },
            select: {
              id: true,
              content: true,
              emotion: true,
              emotionConfidence: true,
              createdAt: true,
              chat: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: messageLimit,
          }),

          // Breakthrough Days: Get messages grouped by date
          prisma.message.findMany({
            where: {
              chat: { userId, isDeleted: false },
              isDeleted: false,
              isFromAI: false,
              emotion: { not: null },
              emotionConfidence: { gte: 0.7 },
            },
            select: {
              createdAt: true,
              emotion: true,
            },
            // Limit to prevent memory issues
            take: 1000,
          }),

          // Statistics
          prisma.chat.count({
            where: { userId, isDeleted: false },
          }),
          prisma.message.count({
            where: {
              chat: { userId, isDeleted: false },
              isDeleted: false,
            },
          }),
          prisma.userMessageFavorite.count({
            where: { userId },
          }),
          prisma.mediaLibrary.count({
            where: { userId, isDeleted: false },
          }),

          // Favorite messages for vault
          prisma.userMessageFavorite.findMany({
            where: { userId },
            include: {
              message: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  chatId: true,
                  emotion: true,
                  emotionConfidence: true,
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      profilePhoto: true,
                      userName: true,
                    },
                  },
                  chat: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                    },
                  },
                },
              },
            },
          }),
        ]);
      } catch (promiseError) {
        console.error("Error in Promise.all execution:", promiseError);
        // Set default values if Promise.all fails
        heartToHeartsResult = [];
        growthMomentsCount = 0;
        growthMomentsList = [];
        breakthroughDaysData = [];
        totalChats = 0;
        totalMessages = 0;
        totalFavorites = 0;
        totalMedia = 0;
        favoriteMessages = [];
      }

      // Ensure all variables are defined with fallbacks
      heartToHeartsResult = heartToHeartsResult || [];
      growthMomentsCount = growthMomentsCount || 0;
      growthMomentsList = growthMomentsList || [];
      breakthroughDaysData = breakthroughDaysData || [];
      totalChats = totalChats || 0;
      totalMessages = totalMessages || 0;
      totalFavorites = totalFavorites || 0;
      totalMedia = totalMedia || 0;
      favoriteMessages = favoriteMessages || [];

// CONTINUE WITH THE REST OF THE FUNCTION...

// Also ensure this section is correct (around line 2200):
      // Heart-to-hearts: Filter chats with >= 3 emotional messages
      const heartToHearts = heartToHeartsResult
        .filter((chat) => chat._count.messages >= 3)
        .map((chat) => ({
          chatId: chat.id,
          chatName: chat.name,
          chatType: chat.type,
          emotionalMessageCount: chat._count.messages,
          lastUpdatedAt: chat.updatedAt,  // FIXED: was chat.lastUpdatedAt
        }));

      // Process growth moments - keep existing count, add detail list
      const growthMomentsDetailList = Array.isArray(growthMomentsList) 
        ? growthMomentsList.map((msg) => ({
          id: msg.id,
          content: msg.content,
          emotion: msg.emotion,
          emotionConfidence: msg.emotionConfidence,
          createdAt: msg.createdAt,
          chat: {
            id: msg.chat.id,
            name: msg.chat.name,
            type: msg.chat.type,
          },
        }))
        : [];

// REMOVE ANY STRAY })); LINES THAT MIGHT EXIST

// And ensure the statistics section has proper fallbacks:
          statistics: {
            totalChats,
            totalMessages,
            totalFavorites,
            totalMedia,
            heartToHearts: heartToHearts,
            growthMoments: growthMomentsCount || 0,  // FIXED: added || 0
            breakthroughDays,
            goalsAchieved,
          },

// And in the journey overview:
            growthMoments: {
              count: growthMomentsCount || 0,        // FIXED: added || 0
              items: growthMomentsDetailList || [],  // FIXED: added || []
            },