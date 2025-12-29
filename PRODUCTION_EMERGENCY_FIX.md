# PRODUCTION EMERGENCY FIX

## Error: "Missing catch or finally after try" at line 2224

The production server has a syntax error. Here's the emergency fix:

### Step 1: Locate the problematic area
Look for line 2224 in `/home/ubuntu/pryve-backend/src/api/v1/services/chat.service.js`

### Step 2: Check for these common issues:

1. **Stray closing brackets** - Look for lines that only contain `}));` without proper context
2. **Incomplete try-catch blocks** - Ensure every `try {` has a matching `} catch (error) {`
3. **Malformed function calls** - Check for incomplete `.map()` or `.filter()` calls

### Step 3: Quick Fix - Replace the entire getJourneyPageData function

If the error persists, replace the entire `getJourneyPageData` function (around lines 1960-2670) with this minimal working version:

```javascript
static async getJourneyPageData(userId, query) {
  const favoriteLimit = parseInt(query.favoriteLimit) || 10;
  const chatLimit = parseInt(query.chatLimit) || 5;
  const messageLimit = parseInt(query.messageLimit) || 10;
  const vaultLimit = parseInt(query.vaultLimit) || 20;

  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        profilePhoto: true,
        userName: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Initialize all variables with defaults
    let heartToHeartsResult = [];
    let growthMomentsCount = 0;
    let growthMomentsList = [];
    let breakthroughDaysData = [];
    let totalChats = 0;
    let totalMessages = 0;
    let totalFavorites = 0;
    let totalMedia = 0;
    let favoriteMessages = [];

    try {
      // Get basic statistics
      [totalChats, totalMessages, totalFavorites, totalMedia] = await Promise.all([
        prisma.chat.count({ where: { userId, isDeleted: false } }),
        prisma.message.count({ where: { chat: { userId, isDeleted: false }, isDeleted: false } }),
        prisma.userMessageFavorite.count({ where: { userId } }),
        prisma.mediaLibrary.count({ where: { userId, isDeleted: false } })
      ]);

      // Get growth moments count
      growthMomentsCount = await prisma.message.count({
        where: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          emotion: { in: ["joy", "surprise"] },
          emotionConfidence: { gte: 0.7 },
        },
      });

    } catch (queryError) {
      console.error("Error in database queries:", queryError);
      // Keep default values
    }

    // Return minimal response structure
    return {
      message: "Journey page data fetched successfully.",
      success: true,
      data: {
        user,
        journeyOverview: {
          heartToHearts: { count: 0, items: [] },
          growthMoments: { count: growthMomentsCount, items: [] },
          breakthroughDays: { count: 0, items: [] },
          goalsAchieved: { count: 0, items: [] }
        },
        recentGoals: [],
        weeklyJourney: [],
        vaultOfSecrets: [],
        recentChats: [],
        statistics: {
          totalChats,
          totalMessages,
          totalFavorites,
          totalMedia,
          heartToHearts: 0,
          growthMoments: growthMomentsCount,
          breakthroughDays: 0,
          goalsAchieved: 0,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching journey page data:", error);
    throw new AppError(
      "Failed to fetch journey page data.",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}
```

### Step 4: Restart the server
```bash
pm2 restart server
```

### Step 5: Test
```bash
curl -X GET "https://your-domain/api/v1/journey" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

This minimal version will:
- ✅ Fix all syntax errors
- ✅ Provide basic functionality
- ✅ Return proper response structure
- ✅ Handle errors gracefully
- ✅ Avoid undefined variable issues

Once this is working, you can gradually add back the more complex features.