# Journey Statistics Criteria & Manual Message Guide

## 📊 Current Statistics Breakdown

```
Total Messages: 6        ✅ Any user message counts
Total Favorites: 3       ✅ Any favorited message counts  
Heart to Hearts: 1       ✅ Chat with ≥3 favorited emotional messages
Growth Moments: 3        ✅ Favorited messages with "joy" or "surprise" emotions
Goals Achieved: 0        ❌ No goal-related messages detected
Breakthrough Days: 0     ❌ Need ≥5 messages with ≥2 positive emotions in one day
```

## 🎯 Criteria for Each Category

### 💝 Heart to Hearts
**Requirement**: Chat must have ≥3 favorited emotional messages
- ✅ **Current**: 1 chat qualifies (3 favorited messages with emotions)
- **Logic**: Groups messages by chat, counts chats with ≥3 favorited emotional messages

### 🌱 Growth Moments  
**Requirement**: Favorited messages with emotions "joy" or "surprise" (confidence ≥0.7)
- ✅ **Current**: 3 messages (all have "joy" emotion with 0.9 confidence)
- **Logic**: Direct count of favorited messages matching emotion criteria

### 🎯 Goals Achieved
**Requirement**: Messages containing goal-related keywords + positive emotions
- ❌ **Current**: 0 (no goal keywords detected)
- **Keywords**: "goal", "achieve", "accomplish", "complete", "finish", "success", "target", "milestone"
- **Logic**: Scans message content for goal keywords + requires positive emotion

### 💡 Breakthrough Days
**Requirement**: Days with ≥5 total messages AND ≥2 positive emotional messages
- ❌ **Current**: 0 (only 6 total messages, need more activity)
- **Logic**: Groups messages by date, finds days meeting both criteria

## 🚀 Quick Manual Message Creation Guide

### Step 1: Get Authentication Token
```bash
# Use our existing token (expires 2026-01-25)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNta2pzM3FycTAwM2xwZXYwZDNxZ3VpdHoiLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzY4NzQzMzE4LCJleHAiOjE3NjkzNDgxMTh9.uF0vS7xdS7G4F3qNBgTgbYZ5apkfhPYfgtlhuLKk1KU"
CHAT_ID="cmkjslxxl003qpev0iabetui8"
BASE_URL="https://pryve-backend.projectco.space/api/v1"
```

### Step 2: Create Goal Achievement Messages
```bash
# Message 1: Goal completion
curl -X POST "$BASE_URL/chats/$CHAT_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I finally achieved my goal of running a 5K! After months of training, I completed it in under 30 minutes. This accomplishment means so much to me and I feel incredibly proud and successful.",
    "type": "text"
  }'

# Message 2: Milestone reached  
curl -X POST "$BASE_URL/chats/$CHAT_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Reached a major milestone today - I finished my certification program! This goal took me 6 months to complete, but the sense of achievement is overwhelming. I feel so accomplished and ready for new challenges.",
    "type": "text"
  }'
```

### Step 3: Favorite Goal Messages
```bash
# Get message IDs from response, then favorite them
curl -X POST "$BASE_URL/chats/$CHAT_ID/messages/{MESSAGE_ID}/favorite" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Create Breakthrough Day (5+ messages in one day)
```bash
# Create multiple messages with positive emotions
for i in {1..3}; do
  curl -X POST "$BASE_URL/chats/$CHAT_ID/messages" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"content\": \"Amazing day $i! I feel so grateful and joyful about all the positive things happening in my life. Every moment feels like a blessing.\",
      \"type\": \"text\"
    }"
done
```

## 📋 Complete Automation Script

Create `add-journey-messages.js`:

```javascript
const https = require('https');

const TOKEN = 'your-token-here';
const BASE_URL = 'https://pryve-backend.projectco.space/api/v1';
const CHAT_ID = 'your-chat-id';

const goalMessages = [
  "I achieved my goal of learning Spanish! After 8 months of daily practice, I can now have conversations fluently. This accomplishment fills me with pride and success.",
  "Completed my fitness goal today - I can finally do 50 push-ups! This milestone represents months of dedication and I feel incredibly strong and accomplished.",
  "Reached my savings target of $5000! This financial goal took discipline but achieving it gives me such a sense of security and success."
];

const breakthroughMessages = [
  "What an incredible day of breakthroughs and realizations!",
  "I feel so grateful for all the amazing opportunities coming my way.",
  "Today brought such joy and excitement - everything is falling into place perfectly.",
  "Feeling overwhelmed with happiness and positive energy today.",
  "This day has been filled with so much love and beautiful moments."
];

async function addJourneyMessages() {
  // Add goal messages
  for (const content of goalMessages) {
    const messageResult = await createMessage(content);
    if (messageResult.messageId) {
      await favoriteMessage(messageResult.messageId);
    }
  }
  
  // Add breakthrough day messages
  for (const content of breakthroughMessages) {
    await createMessage(content);
  }
  
  console.log('✅ All messages added! Check your journey statistics.');
}

// Run: node add-journey-messages.js
```

## 🎯 Expected Results After Adding Messages

```
Total Messages: 14+      (6 existing + 8 new)
Total Favorites: 6+      (3 existing + 3 goal messages)  
Heart to Hearts: 1       (unchanged - still 1 qualifying chat)
Growth Moments: 6+       (3 existing + new joy/surprise messages)
Goals Achieved: 3        (new goal messages with keywords)
Breakthrough Days: 1     (day with 5+ messages including 2+ positive)
```

## 💡 Pro Tips

1. **Emotions are auto-detected** by AI - use emotional language
2. **Goal keywords** must appear in message content
3. **Breakthrough days** need volume (5+ messages) + positivity (2+ emotional)
4. **Heart-to-hearts** count chats, not individual messages
5. **Always favorite important messages** to include them in journey categories

## 🔧 Quick Test Command

```bash
# Test current statistics
curl -X GET "$BASE_URL/journey" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.statistics'
```