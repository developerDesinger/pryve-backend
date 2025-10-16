# 🤖 AI Chat System - Proper File Processing Flow

## 📋 **Correct Flow Overview**

### **Step 1: Upload & Process Media**
1. **Upload file** to `/api/v1/chats/media/process-image` (or audio/video)
2. **File processed** with appropriate OpenAI API
3. **Get processed result** with media URL and AI analysis
4. **Use the URL** in chat message

### **Step 2: Send Message with Media**
1. **Send message** to `/api/v1/chats/:chatId/messages/media`
2. **Include media URL** from step 1
3. **AI processes** the media using OpenAI APIs
4. **Both messages saved** to database

---

## 🔄 **Detailed Flow Examples**

### **Image Processing Flow:**

#### **1. Process Image:**
```bash
POST /api/v1/chats/media/process-image
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

Body:
- file: image.jpg
- prompt: "What do you see in this image?"
```

**Response:**
```json
{
  "message": "Image processed successfully.",
  "success": true,
  "data": {
    "success": true,
    "imageUrl": "https://dummy-image-url.com/1234567890.jpg",
    "analysis": "I can see a beautiful sunset over mountains...",
    "tokensUsed": 45,
    "model": "gpt-4-vision-preview"
  }
}
```

#### **2. Send Message with Image:**
```bash
POST /api/v1/chats/:chatId/messages/media
Authorization: Bearer <jwt-token>

Body:
{
  "content": "What do you think about this image?",
  "imageUrl": "https://dummy-image-url.com/1234567890.jpg"
}
```

**Response:**
```json
{
  "message": "Message sent successfully.",
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_123",
      "content": "What do you think about this image?",
      "type": "IMAGE",
      "imageUrl": "https://dummy-image-url.com/1234567890.jpg",
      "isFromAI": false
    },
    "aiResponse": {
      "id": "msg_124",
      "content": "This is a stunning sunset image with vibrant colors...",
      "type": "TEXT",
      "isFromAI": true,
      "aiModel": "gpt-4-vision-preview",
      "tokensUsed": 45
    }
  }
}
```

---

### **Audio Processing Flow:**

#### **1. Process Audio:**
```bash
POST /api/v1/chats/media/process-audio
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

Body:
- file: audio.mp3
- prompt: "Please transcribe and analyze this audio."
```

**Response:**
```json
{
  "message": "Audio processed successfully.",
  "success": true,
  "data": {
    "success": true,
    "audioUrl": "https://dummy-audio-url.com/1234567890.mp3",
    "transcription": "Hello, this is a test recording...",
    "analysis": "The audio contains a clear voice speaking...",
    "tokensUsed": 120,
    "model": "whisper-1 + gpt-3.5-turbo"
  }
}
```

#### **2. Send Message with Audio:**
```bash
POST /api/v1/chats/:chatId/messages/media
Authorization: Bearer <jwt-token>

Body:
{
  "content": "Can you summarize what was said?",
  "audioUrl": "https://dummy-audio-url.com/1234567890.mp3"
}
```

---

### **Text Message Flow:**

#### **Send Text Message:**
```bash
POST /api/v1/chats/:chatId/messages
Authorization: Bearer <jwt-token>

Body:
{
  "content": "Hello! Can you help me with machine learning?"
}
```

---

## 🎯 **Key Benefits of This Flow:**

### **1. Separation of Concerns:**
- ✅ **Media processing** is separate from chat
- ✅ **File uploads** handled independently
- ✅ **Chat API** focuses on conversation flow

### **2. Real OpenAI Integration:**
- ✅ **Vision API** for image analysis
- ✅ **Whisper API** for audio transcription
- ✅ **GPT models** for text analysis
- ✅ **Proper error handling** for each API

### **3. Flexible Usage:**
- ✅ **Process media** without sending to chat
- ✅ **Reuse processed media** in multiple chats
- ✅ **Get immediate results** from media processing
- ✅ **Store both user and AI messages** in database

### **4. Scalable Architecture:**
- ✅ **Easy to add S3** integration later
- ✅ **Easy to add more** media types
- ✅ **Easy to add** more AI models
- ✅ **Easy to add** caching layer

---

## 📊 **API Endpoints Summary:**

### **Media Processing:**
- `POST /api/v1/chats/media/process-image` - Process image with Vision API
- `POST /api/v1/chats/media/process-audio` - Process audio with Whisper API  
- `POST /api/v1/chats/media/process-video` - Process video (placeholder)

### **Chat Management:**
- `POST /api/v1/chats` - Create new chat
- `GET /api/v1/chats` - Get user's chats
- `GET /api/v1/chats/:chatId` - Get chat details
- `PATCH /api/v1/chats/:chatId` - Update chat settings
- `DELETE /api/v1/chats/:chatId` - Delete chat

### **Messages:**
- `POST /api/v1/chats/:chatId/messages` - Send text message
- `POST /api/v1/chats/:chatId/messages/media` - Send message with media URL
- `GET /api/v1/chats/:chatId/messages` - Get chat messages

### **AI Models:**
- `GET /api/v1/chats/ai/models` - Get available AI models

---

## ⚠️ **Current Implementation Notes:**

### **Dummy URLs:**
- Media URLs are currently dummy URLs
- Ready for S3 integration
- OpenAI APIs will work with real URLs

### **File Upload:**
- File upload handling is prepared
- Multer integration ready
- S3 integration can be added easily

### **Error Handling:**
- Comprehensive error handling for OpenAI APIs
- Graceful fallbacks for failed requests
- Proper HTTP status codes

---

## 🚀 **Next Steps:**

1. **Add S3 integration** for real file storage
2. **Implement multer** for file uploads
3. **Add file validation** (size, type, etc.)
4. **Add rate limiting** for API calls
5. **Add caching** for processed results
6. **Add real-time streaming** for AI responses
