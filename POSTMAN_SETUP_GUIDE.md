# 📮 Postman Collection Setup Guide

## 🚀 **Quick Setup**

### **1. Import Collection**
1. Open Postman
2. Click **Import** button
3. Select `AI_Chat_API.postman_collection.json`
4. Collection imported successfully! ✅

### **2. Set Environment Variables**
1. Click **Environments** tab
2. Create new environment: `AI Chat Local`
3. Add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:3000/api/v1` | API base URL |
| `jwt_token` | `your_actual_jwt_token` | JWT token from login |
| `chat_id` | `your_chat_id` | Chat ID for testing |

### **3. Get JWT Token**
1. Run **Login User** request
2. Copy `token` from response
3. Set `jwt_token` variable with this value

---

## 🔄 **Complete Flow Testing**

### **Step 1: Authentication**
```bash
POST /api/v1/users/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
```

### **Step 2: Create Chat**
```bash
POST /api/v1/chats
Body: {
  "name": "My AI Assistant",
  "description": "Personal AI chat",
  "aiModel": "gpt-3.5-turbo",
  "systemPrompt": "You are a helpful AI assistant.",
  "temperature": 0.7
}
```

### **Step 3: Test Text Message**
```bash
POST /api/v1/chats/:chatId/messages
Body: {
  "content": "Hello! Can you help me with machine learning?"
}
```

### **Step 4: Test Image Processing**
```bash
POST /api/v1/chats/:chatId/messages
Body: (form-data)
- content: "What do you see in this image?"
- file: image.jpg
```

### **Step 5: Test Audio Processing**
```bash
POST /api/v1/chats/:chatId/messages
Body: (form-data)
- content: "Can you transcribe and analyze this audio?"
- file: audio.mp3
```

---

## 📋 **Request Examples**

### **Create Chat Request:**
```json
{
  "name": "My AI Assistant",
  "description": "Personal AI chat for help and questions",
  "aiModel": "gpt-3.5-turbo",
  "systemPrompt": "You are a helpful AI assistant. Be friendly and informative.",
  "temperature": 0.7
}
```

### **Send Text Message:**
```json
{
  "content": "Hello! Can you help me understand machine learning?"
}
```

### **Send Image Message:**
```json
Form Data:
- content: "What do you see in this image?"
- file: [image file]
```

### **Send Audio Message:**
```json
Form Data:
- content: "Can you transcribe and analyze this audio?"
- file: [audio file]
```

---

## 📊 **Expected Responses**

### **Create Chat Response:**
```json
{
  "message": "Chat created successfully.",
  "success": true,
  "chat": {
    "id": "chat_123",
    "name": "My AI Assistant",
    "description": "Personal AI chat for help and questions",
    "aiModel": "gpt-3.5-turbo",
    "systemPrompt": "You are a helpful AI assistant. Be friendly and informative.",
    "temperature": 0.7,
    "userId": "user_123",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

### **Send Message Response:**
```json
{
  "message": "Message sent successfully.",
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_123",
      "content": "Hello! Can you help me understand machine learning?",
      "type": "TEXT",
      "isFromAI": false,
      "createdAt": "2024-01-01T10:00:00Z"
    },
    "aiResponse": {
      "id": "msg_124",
      "content": "I'd be happy to help you understand machine learning! Machine learning is a subset of artificial intelligence...",
      "type": "TEXT",
      "isFromAI": true,
      "aiModel": "gpt-3.5-turbo",
      "tokensUsed": 45,
      "processingTime": 1200,
      "createdAt": "2024-01-01T10:00:01Z"
    }
  }
}
```

### **Send Image Message Response:**
```json
{
  "message": "Message sent successfully.",
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_123",
      "content": "What do you see in this image?",
      "type": "IMAGE",
      "mediaType": "image/jpeg",
      "mediaName": "image.jpg",
      "isFromAI": false
    },
    "aiResponse": {
      "id": "msg_124",
      "content": "I can see a beautiful sunset over mountains with vibrant orange and pink colors in the sky.",
      "type": "TEXT",
      "isFromAI": true,
      "aiModel": "gpt-4-vision-preview",
      "tokensUsed": 45
    }
  }
}
```

### **Send Audio Message Response:**
```json
{
  "message": "Message sent successfully.",
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_125",
      "content": "Can you transcribe and analyze this audio?",
      "type": "AUDIO",
      "mediaType": "audio/mpeg",
      "mediaName": "audio.mp3",
      "isFromAI": false
    },
    "aiResponse": {
      "id": "msg_126",
      "content": "The audio contains a clear voice speaking about machine learning concepts. The speaker is discussing basic ML principles and their applications.",
      "type": "TEXT",
      "isFromAI": true,
      "aiModel": "gpt-3.5-turbo",
      "tokensUsed": 120
    }
  }
}
```

---

## ⚠️ **Important Notes**

### **Authentication:**
- All requests (except login/register) require JWT token
- Set `jwt_token` variable after login
- Token expires after 7 days (configurable)

### **File Uploads:**
- Use `form-data` for file uploads
- Single endpoint handles text, image, audio, and video
- Supported formats:
  - **Images**: jpg, jpeg, png, gif, webp
  - **Audio**: mp3, wav, m4a, ogg
  - **Video**: mp4, avi, mov, webm
- File size limit: 25MB (OpenAI's limit)

### **Error Handling:**
- Check `success` field in responses
- Error messages in `message` field
- HTTP status codes indicate success/failure

### **Rate Limiting:**
- OpenAI API has rate limits
- Large files may take longer to process
- Check `processingTime` in responses

---

## 🎯 **Testing Checklist**

- [ ] Import Postman collection
- [ ] Set environment variables
- [ ] Test user login
- [ ] Create a new chat
- [ ] Send text message
- [ ] Process image file
- [ ] Send image to chat
- [ ] Process audio file
- [ ] Send audio to chat
- [ ] Get chat messages
- [ ] Update chat settings
- [ ] Get available AI models

---

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **401 Unauthorized**
   - Check JWT token is set correctly
   - Token may have expired

2. **404 Not Found**
   - Check `base_url` variable
   - Ensure server is running on port 3000

3. **File Upload Errors**
   - Check file format is supported
   - Ensure file size is reasonable

4. **OpenAI API Errors**
   - Check `OPENAI_API_KEY` is set in server
   - Verify API key is valid

5. **Database Errors**
   - Ensure PostgreSQL is running
   - Check database connection

---

## 🚀 **Next Steps**

1. **Test all endpoints** with the collection
2. **Add S3 integration** for real file storage
3. **Implement file validation** (size, type)
4. **Add rate limiting** for API calls
5. **Add real-time streaming** for AI responses
