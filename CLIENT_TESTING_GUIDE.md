# 🧪 Journey Categories Testing Guide for Client

## Quick Test Instructions

**Goal**: Test all journey categories by sending messages to AI, favoriting them, and checking endpoints.

### Step 1: Send These Messages to AI (Copy & Paste)

**💝 Heart-to-Hearts Messages** (send 3+ in same chat):
```
I had the most beautiful heart-to-heart conversation with my partner today. We shared our deepest fears and dreams, and I felt so connected and loved.

Just opened up to my best friend about my struggles and they listened with such compassion. I felt truly understood and supported.

Had a meaningful conversation with my family about what really matters in life. My heart feels so full of gratitude and love right now.
```

**🎯 Goals Achieved Messages**:
```
I finally achieved my goal of running a 5K! After months of training, I completed it in under 30 minutes. This accomplishment means so much to me.

Reached a major milestone today - I finished my certification program! This goal took me 6 months to complete, but the sense of achievement is overwhelming.

Completed my savings target of $10,000! This financial goal required discipline but achieving it gives me such a sense of security and success.
```

**🌱 Growth Moments Messages**:
```
Today I had such an amazing breakthrough in understanding myself. I feel so joyful and excited about this new perspective on life.

What a surprising day of discoveries! I learned something that completely changed how I see things. I'm filled with joy and wonder.

Had the most unexpected and delightful surprise today that filled me with pure joy and gratitude for life's beautiful moments.
```

**💡 Breakthrough Days Messages** (send 5+ on same day):
```
What an incredible breakthrough day! I had so many realizations that will change my life. Feeling absolutely amazing!

Today brought such unexpected joy and excitement - everything is falling into place perfectly. I feel so blessed!

Feeling overwhelmed with positive energy and love today. This day has been filled with beautiful moments and surprises!

Had the most inspiring conversations that filled me with hope and motivation. I feel so energized and ready for anything!

This day exceeded all my expectations! So many good things happened and I feel incredibly fortunate and joyful.
```

### Step 2: Favorite All Messages
- Click the ⭐ favorite button on each message you sent
- **Important**: Must favorite at least 3 emotional messages in the same chat for Heart-to-Hearts

### Step 3: Wait 10 seconds
- AI needs time to analyze emotions in your messages

### Step 4: Test Endpoints

**Check Journey Statistics:**
```
GET https://pryve-backend.projectco.space/api/v1/journey
Authorization: Bearer YOUR_TOKEN
```

**Test Each Category:**
```
💝 Heart-to-Hearts:
GET https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10

🌱 Growth Moments:
GET https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=growth-moments&limit=10

🎯 Goals Achieved:
GET https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=goals-achieved&limit=10

💡 Breakthrough Days:
GET https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=breakthrough-days&limit=10
```

### Expected Results:
```
📊 Journey Statistics:
- Total Messages: 14+
- Total Favorites: 14+
- Heart to Hearts: 1+ (chats with ≥3 favorited emotional messages)
- Growth Moments: 6+ (joy/surprise emotions)
- Goals Achieved: 3+ (goal keywords detected)
- Breakthrough Days: 1+ (5+ messages in one day with 2+ positive emotions)
```

### ✅ Success Criteria:
- All endpoints return `"success": true`
- Each category returns `items: [...]` with messages
- Journey statistics show counts > 0 for all categories
- Messages have proper emotions, tags, and metadata

### 🚨 Troubleshooting:
- **Empty results?** → Make sure messages are favorited
- **No emotions?** → Wait longer for AI analysis (up to 30 seconds)
- **Heart-to-hearts empty?** → Need 3+ favorited emotional messages in SAME chat
- **Goals achieved empty?** → Messages must contain words like "goal", "achieved", "completed"

### 📱 Quick Postman Test:
1. Import: `Pryve_Complete_API.postman_collection.json`
2. Set environment variable: `auth_token = YOUR_JWT_TOKEN`
3. Run "Journey" folder tests
4. Check responses for data

**Test complete when all 4 categories return messages! 🎉**