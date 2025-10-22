# AI Chat System APIs

## 🤖 **AI Chat Management APIs**

### 1. **Create AI Chat**
- **POST** `/api/v1/chats`
- **Purpose**: Create a new AI chat conversation
- **Body**: `{ name?, description?, aiModel?, systemPrompt?, temperature? }`

### 2. **Get User AI Chats**
- **GET** `/api/v1/chats`
- **Purpose**: Get all AI chats for the authenticated user
- **Query**: `?page=1&limit=20&type=PERSONAL_AI`

### 3. **Get Chat Details**
- **GET** `/api/v1/chats/:chatId`
- **Purpose**: Get specific chat details with message history

### 4. **Update Chat Settings**
- **PATCH** `/api/v1/chats/:chatId`
- **Purpose**: Update chat name, AI model, system prompt, temperature
- **Body**: `{ name?, description?, aiModel?, systemPrompt?, temperature? }`

### 5. **Delete Chat**
- **DELETE** `/api/v1/chats/:chatId`
- **Purpose**: Delete an AI chat conversation

---

## 💬 **AI Message APIs**

### 6. **Send Message to AI**
- **POST** `/api/v1/chats/:chatId/messages`
- **Purpose**: Send message to AI and get response
- **Body**: `{ content, replyToId? }`
- **Response**: `{ userMessage, aiResponse }`

### 7. **Send Media Message to AI**
- **POST** `/api/v1/chats/:chatId/messages/media`
- **Purpose**: Send image/audio/video to AI for analysis
- **Body**: `{ type, imageFile?, audioFile?, videoFile?, prompt? }`
- **Note**: File upload to S3, then send to OpenAI Vision/Audio API
- **Response**: `{ userMessage, aiResponse, imageUrl?, audioUrl?, videoUrl? }`

### 8. **Get Chat Messages**
- **GET** `/api/v1/chats/:chatId/messages`
- **Purpose**: Get message history with AI responses
- **Query**: `?page=1&limit=50&before=messageId`

### 9. **Regenerate AI Response**
- **POST** `/api/v1/messages/:messageId/regenerate`
- **Purpose**: Regenerate AI response for a specific message
- **Body**: `{ temperature? }`

### 10. **Edit Message**
- **PATCH** `/api/v1/messages/:messageId`
- **Purpose**: Edit user message and regenerate AI response
- **Body**: `{ content }`

### 11. **Delete Message**
- **DELETE** `/api/v1/messages/:messageId`
- **Purpose**: Delete message (both user and AI messages)

---

## 🎨 **AI Features APIs**

### 12. **Continue Conversation**
- **POST** `/api/v1/chats/:chatId/continue`
- **Purpose**: Continue AI response if it was cut off
- **Body**: `{ messageId }`

### 13. **Stop AI Generation**
- **POST** `/api/v1/chats/:chatId/stop`
- **Purpose**: Stop AI response generation
- **Body**: `{ messageId }`

### 14. **Get AI Models**
- **GET** `/api/v1/ai/models`
- **Purpose**: Get available AI models (GPT-4, GPT-3.5, etc.)

### 15. **Update AI Settings**
- **PATCH** `/api/v1/chats/:chatId/ai-settings`
- **Purpose**: Update AI model, temperature, system prompt
- **Body**: `{ aiModel?, temperature?, systemPrompt? }`

---

## 📱 **Media Upload APIs**

### 16. **Upload Chat Image**
- **POST** `/api/v1/chat/upload-image`
- **Purpose**: Upload image for AI analysis
- **Body**: `{ imageFile, prompt? }`
- **Returns**: `{ imageUrl, aiAnalysis }`

### 17. **Upload Chat Audio**
- **POST** `/api/v1/chat/upload-audio`
- **Purpose**: Upload audio for AI transcription/analysis
- **Body**: `{ audioFile, prompt? }`
- **Returns**: `{ audioUrl, transcription, aiAnalysis }`

### 18. **Upload Chat Video**
- **POST** `/api/v1/chat/upload-video`
- **Purpose**: Upload video for AI analysis
- **Body**: `{ videoFile, prompt? }`
- **Returns**: `{ videoUrl, aiAnalysis }`

---

## 🔍 **Search & History APIs**

### 19. **Search Conversations**
- **GET** `/api/v1/chats/search`
- **Purpose**: Search across all user's chats and messages
- **Query**: `?q=searchTerm&type=all&page=1&limit=20`
- **Type Options**: `all` (default), `chats`, `messages`
- **Response**: Returns both matching chats and messages with pagination

### 21. **Get Chat History**
- **GET** `/api/v1/chats/:chatId/history`
- **Purpose**: Get formatted chat history for export
- **Query**: `?format=json&includeMetadata=true`

---

## 📊 **Analytics & Usage APIs**

### 22. **Get Chat Statistics**
- **GET** `/api/v1/chats/:chatId/stats`
- **Purpose**: Get message count, tokens used, etc.

### 23. **Get User AI Usage**
- **GET** `/api/v1/users/ai-usage`
- **Purpose**: Get user's AI usage statistics
- **Query**: `?period=month&includeCosts=true`

### 24. **Get Token Usage**
- **GET** `/api/v1/chats/:chatId/tokens`
- **Purpose**: Get token usage for specific chat

---

## ⚡ **Real-time APIs**

### 25. **Stream AI Response**
- **POST** `/api/v1/chats/:chatId/stream`
- **Purpose**: Stream AI response in real-time
- **Body**: `{ content }`
- **Response**: Server-Sent Events stream

### 26. **Get AI Status**
- **GET** `/api/v1/chats/:chatId/ai-status`
- **Purpose**: Get current AI processing status

---

## 🎯 **Implementation Priority**

### **Phase 1 (Core AI Chat)**
- APIs: 1, 2, 3, 6, 8, 14, 15

### **Phase 2 (Enhanced Features)**
- APIs: 4, 5, 7, 9, 10, 11, 16, 17, 18

### **Phase 3 (Advanced Features)**
- APIs: 12, 13, 19, 20, 21, 22, 23, 24

### **Phase 4 (Real-time & Analytics)**
- APIs: 25, 26

---

## 📋 **Message Data Structure Examples**

### **Text Message:**
```json
{
  "id": "msg_123",
  "content": "Hello, can you help me with this image?",
  "type": "TEXT",
  "isFromAI": false,
  "createdAt": "2024-01-01T10:00:00Z",
  "senderId": "user_123",
  "chatId": "chat_456"
}
```

### **Image Message:**
```json
{
  "id": "msg_124",
  "content": "What do you see in this image?",
  "type": "IMAGE",
  "isFromAI": false,
  "imageUrl": "https://s3.amazonaws.com/bucket/images/image-123.jpg",
  "mediaType": "image/jpeg",
  "mediaSize": 1024000,
  "mediaName": "photo.jpg",
  "createdAt": "2024-01-01T10:01:00Z",
  "senderId": "user_123",
  "chatId": "chat_456"
}
```

### **Audio Message:**
```json
{
  "id": "msg_125",
  "content": "Can you transcribe this audio?",
  "type": "AUDIO",
  "isFromAI": false,
  "audioUrl": "https://s3.amazonaws.com/bucket/audio/audio-123.mp3",
  "mediaType": "audio/mpeg",
  "mediaSize": 2048000,
  "mediaDuration": 30,
  "mediaName": "recording.mp3",
  "createdAt": "2024-01-01T10:02:00Z",
  "senderId": "user_123",
  "chatId": "chat_456"
}
```

### **AI Response Message:**
```json
{
  "id": "msg_126",
  "content": "I can see a beautiful sunset over mountains in this image. The colors are vibrant with orange and pink hues.",
  "type": "TEXT",
  "isFromAI": true,
  "aiModel": "gpt-4-vision-preview",
  "tokensUsed": 45,
  "processingTime": 1200,
  "createdAt": "2024-01-01T10:01:30Z",
  "senderId": "ai_assistant",
  "chatId": "chat_456"
}
```

### **Search Conversations Response:**
```json
{
  "message": "Search results fetched successfully.",
  "success": true,
  "data": {
    "chats": [
      {
        "id": "chat_123",
        "name": "Python Programming Help",
        "description": "Chat about Python coding questions",
        "lastMessageAt": "2024-01-01T10:00:00Z",
        "messageCount": 15,
        "_count": { "messages": 15 }
      }
    ],
    "messages": [
      {
        "id": "msg_456",
        "content": "How do I create a Python function?",
        "type": "TEXT",
        "isFromAI": false,
        "createdAt": "2024-01-01T09:30:00Z",
        "chat": {
          "id": "chat_123",
          "name": "Python Programming Help",
          "lastMessageAt": "2024-01-01T10:00:00Z"
        }
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 45,
    "limit": 20
  }
}
```
