# Message Favorites API Documentation

This document describes the message favorites functionality in the Pryve application. Users can now save and manage their favorite messages across all chats.

## Overview

The favorites feature allows users to:
- Add messages to favorites
- Remove messages from favorites
- Toggle favorite status
- View all favorite messages
- View favorite messages within a specific chat

## Database Schema

A new `UserMessageFavorite` model tracks which messages users have favorited:

```prisma
model UserMessageFavorite {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  messageId String
  userId    String
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([messageId, userId])
  @@map("user_message_favorites")
}
```

## API Endpoints

### 1. Add Message to Favorites

**Endpoint:** `POST /api/v1/chats/:chatId/messages/:messageId/favorite`

**Authentication:** Required (Bearer Token)

**Description:** Adds a message to the authenticated user's favorites.

**Parameters:**
- `chatId` (path): The ID of the chat containing the message
- `messageId` (path): The ID of the message to favorite

**Request:**
```bash
POST /api/v1/chats/chat123/messages/msg456/favorite
Authorization: Bearer <token>
```

**Response (Success - New Favorite):**
```json
{
  "message": "Message added to favorites.",
  "success": true,
  "isFavorite": true
}
```

**Response (Success - Already Favorited):**
```json
{
  "message": "Message already in favorites.",
  "success": true,
  "isFavorite": true
}
```

**Response (Error):**
```json
{
  "message": "Unauthorized access.",
  "success": false
}
```

---

### 2. Remove Message from Favorites

**Endpoint:** `DELETE /api/v1/chats/:chatId/messages/:messageId/favorite`

**Authentication:** Required (Bearer Token)

**Description:** Removes a message from the authenticated user's favorites.

**Parameters:**
- `chatId` (path): The ID of the chat containing the message
- `messageId` (path): The ID of the message to unfavorite

**Request:**
```bash
DELETE /api/v1/chats/chat123/messages/msg456/favorite
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "message": "Message removed from favorites.",
  "success": true,
  "isFavorite": false
}
```

---

### 3. Toggle Message Favorite Status

**Endpoint:** `POST /api/v1/chats/:chatId/messages/:messageId/toggle-favorite`

**Authentication:** Required (Bearer Token)

**Description:** Toggles the favorite status of a message. If the message is favorited, it removes it; if not favorited, it adds it.

**Parameters:**
- `chatId` (path): The ID of the chat containing the message
- `messageId` (path): The ID of the message to toggle

**Request:**
```bash
POST /api/v1/chats/chat123/messages/msg456/toggle-favorite
Authorization: Bearer <token>
```

**Response (Added to Favorites):**
```json
{
  "message": "Message added to favorites.",
  "success": true,
  "isFavorite": true
}
```

**Response (Removed from Favorites):**
```json
{
  "message": "Message removed from favorites.",
  "success": true,
  "isFavorite": false
}
```

---

### 4. Get All Favorite Messages

**Endpoint:** `GET /api/v1/chats/favorites/messages`

**Authentication:** Required (Bearer Token)

**Description:** Retrieves all favorite messages for the authenticated user across all chats, with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Request:**
```bash
GET /api/v1/chats/favorites/messages?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Favorite messages fetched successfully.",
  "success": true,
  "data": [
    {
      "id": "msg456",
      "content": "This is a favorite message",
      "type": "TEXT",
      "createdAt": "2024-01-15T10:30:00Z",
      "sender": {
        "id": "user123",
        "fullName": "John Doe",
        "profilePhoto": "https://...",
        "userName": "johndoe"
      },
      "chat": {
        "id": "chat123",
        "name": "My Chat",
        "type": "PERSONAL_AI"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "limit": 20
  }
}
```

---

### 5. Get Favorite Messages for a Specific Chat

**Endpoint:** `GET /api/v1/chats/:chatId/favorites`

**Authentication:** Required (Bearer Token)

**Description:** Retrieves all favorite messages within a specific chat.

**Parameters:**
- `chatId` (path): The ID of the chat

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20)

**Request:**
```bash
GET /api/v1/chats/chat123/favorites?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Favorite messages fetched successfully.",
  "success": true,
  "data": [
    {
      "id": "msg456",
      "content": "Favorite message in this chat",
      "type": "TEXT",
      "createdAt": "2024-01-15T10:30:00Z",
      "sender": {
        "id": "user123",
        "fullName": "John Doe",
        "profilePhoto": "https://...",
        "userName": "johndoe"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15,
    "limit": 20
  }
}
```

---

## Security Considerations

1. **Authentication Required:** All endpoints require authentication
2. **Ownership Verification:** Users can only favorite messages from chats they own
3. **Unique Constraints:** Each user can only favorite a message once (enforced by unique constraint)
4. **Cascade Deletion:** Favorites are automatically deleted when a user or message is deleted

## Usage Examples

### Using cURL

```bash
# Add message to favorites
curl -X POST http://localhost:3000/api/v1/chats/chat123/messages/msg456/favorite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Remove from favorites
curl -X DELETE http://localhost:3000/api/v1/chats/chat123/messages/msg456/favorite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Toggle favorite
curl -X POST http://localhost:3000/api/v1/chats/chat123/messages/msg456/toggle-favorite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get all favorites
curl http://localhost:3000/api/v1/chats/favorites/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get chat favorites
curl http://localhost:3000/api/v1/chats/chat123/favorites \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript (fetch)

```javascript
// Add to favorites
const addToFavorites = async (chatId, messageId, token) => {
  const response = await fetch(
    `/api/v1/chats/${chatId}/messages/${messageId}/favorite`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return await response.json();
};

// Toggle favorite
const toggleFavorite = async (chatId, messageId, token) => {
  const response = await fetch(
    `/api/v1/chats/${chatId}/messages/${messageId}/toggle-favorite`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return await response.json();
};

// Get all favorites
const getFavorites = async (token, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/chats/favorites/messages?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return await response.json();
};
```

## Migration Steps

To add this feature to your database:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_message_favorites
```

## Notes

- Favorites are user-specific (each user has their own favorites)
- The `UserMessageFavorite` table uses a composite unique constraint on `messageId` and `userId`
- Favorites are automatically removed when users or messages are deleted
- The toggle endpoint is idempotent and safe to call multiple times

