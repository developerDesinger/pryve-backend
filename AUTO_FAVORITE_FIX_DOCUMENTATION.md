# Simplified Journey States Logic

## New Simple Logic (Updated)

The journey states have been simplified to be more intuitive:

### 🎯 **Heart-to-Hearts**
- **Simple Logic**: Total count of favorited messages
- **When user favorites a message**: Heart-to-Hearts count increases by 1
- **No complex filtering**: Every favorited message counts

### 🌱 **Growth Moments** 
- **Logic**: Count of favorited messages with positive emotions (joy/surprise)
- **Criteria**: Favorited messages with emotion = "joy" OR "surprise"

### 🚀 **Breakthrough Days**
- **Logic**: Count of unique days with favorited messages
- **Criteria**: Days where user favorited at least one message

### 🎯 **Goals Achieved**
- **Logic**: Count of favorited messages containing goal-related keywords
- **Criteria**: Favorited messages with goal-related content

## User Experience

**Before (Complex)**:
- User favorites message → Complex calculations based on chat patterns
- Heart-to-Hearts required ≥3 favorited messages per chat
- Confusing for users why their favorites didn't immediately reflect

**After (Simple)**:
- User favorites message → Heart-to-Hearts count increases immediately
- Direct 1:1 relationship: 1 favorite = +1 Heart-to-Heart
- Intuitive and predictable for users

## Implementation Changes

### Journey Page Data (`getJourneyPageData`)
```javascript
// OLD: Complex chat-based calculation
const chatsWithFavorites = new Set();
// ... complex logic

// NEW: Simple total count
const heartToHearts = totalFavorites; // Direct mapping
```

### Heart-to-Hearts Messages (`getJourneyMessages`)
```javascript
// OLD: Only messages from chats with ≥3 favorites
const qualifiedChats = Array.from(chatMap.values())
  .filter(item => item.messages.length >= 3);

// NEW: All favorited messages
const favorites = await prisma.userMessageFavorite.findMany({
  where: { userId, message: { isDeleted: false, isFromAI: false } }
});
```

## Expected Behavior

1. **User favorites any message** → Heart-to-Hearts +1
2. **User favorites joy/surprise message** → Growth Moments +1, Heart-to-Hearts +1  
3. **User favorites on new day** → Breakthrough Days +1, Heart-to-Hearts +1
4. **User favorites goal-related message** → Goals Achieved +1, Heart-to-Hearts +1

## Testing

Run the test to verify the new logic:
```bash
node test-simplified-heart-to-hearts.js
```

The test will:
1. Check initial stats
2. Send and favorite a message  
3. Verify Heart-to-Hearts equals Total Favorites
4. Confirm immediate reflection of favorites