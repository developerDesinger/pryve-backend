# Journey Page API Documentation

This document describes the journey page API that provides a comprehensive overview of a user's activity in the Pryve application.

## Overview

The journey page API aggregates multiple types of data to give users a complete overview of their engagement, including:
- User profile information
- Favorite messages
- Recent chats
- Recent messages across all chats
- Usage statistics

## API Endpoint

### Get Journey Page Data

**Endpoint:** `GET /api/v1/chats/journey`

**Authentication:** Required (Bearer Token)

**Description:** Retrieves a comprehensive overview of the authenticated user's activity, including favorite messages, recent chats, recent messages, and statistics.

**Query Parameters:**
- `favoriteLimit` (optional): Number of favorite messages to return (default: 10)
- `chatLimit` (optional): Number of recent chats to return (default: 5)
- `messageLimit` (optional): Number of recent messages to return (default: 10)

**Request:**
```bash
GET /api/v1/chats/journey?favoriteLimit=10&chatLimit=5&messageLimit=10
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "message": "Journey page data fetched successfully.",
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "fullName": "John Doe",
      "email": "john@example.com",
      "profilePhoto": "https://...",
      "userName": "johndoe",
      "bio": "I love using AI to improve my productivity!",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "favoriteMessages": [
      {
        "id": "msg456",
        "content": "This is a really important insight...",
        "type": "TEXT",
        "isFromAI": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "sender": {
          "id": "user123",
          "fullName": "John Doe",
          "profilePhoto": "https://...",
          "userName": "johndoe"
        },
        "chat": {
          "id": "chat123",
          "name": "Productivity Chat",
          "type": "PERSONAL_AI"
        },
        "favoritedAt": "2024-01-16T08:00:00Z"
      }
    ],
    "recentChats": [
      {
        "id": "chat123",
        "name": "Productivity Chat",
        "description": "AI assistant for productivity",
        "type": "PERSONAL_AI",
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-15T14:30:00Z",
        "lastMessage": "Thanks for the help!",
        "lastMessageAt": "2024-01-15T14:30:00Z",
        "messageCount": 45
      }
    ],
    "recentMessages": [
      {
        "id": "msg789",
        "content": "I need help with this problem",
        "type": "TEXT",
        "isFromAI": false,
        "createdAt": "2024-01-15T15:00:00Z",
        "chat": {
          "id": "chat123",
          "name": "Productivity Chat",
          "type": "PERSONAL_AI"
        },
        "sender": {
          "id": "user123",
          "fullName": "John Doe",
          "profilePhoto": "https://...",
          "userName": "johndoe"
        }
      }
    ],
    "statistics": {
      "totalChats": 12,
      "totalMessages": 456,
      "totalFavorites": 23,
      "totalMedia": 15
    }
  }
}
```

## Data Structure

### User Data
Returns essential user profile information:
- `id`: User ID
- `fullName`: User's full name
- `email`: Email address
- `profilePhoto`: Profile photo URL
- `userName`: Username
- `bio`: User biography
- `createdAt`: Account creation date

### Favorite Messages
Returns the most recently favorited messages with:
- Full message details
- Sender information
- Associated chat information
- `favoritedAt`: When the message was favorited

### Recent Chats
Returns the most recently updated chats with:
- Chat details (name, description, type)
- Timestamps (created, updated)
- Last message preview
- Message count

### Recent Messages
Returns the most recent messages across all chats with:
- Message content
- Message type
- Associated chat information
- Sender information

### Statistics
Provides aggregate counts:
- `totalChats`: Total number of chats
- `totalMessages`: Total number of messages
- `totalFavorites`: Total number of favorited messages
- `totalMedia`: Total number of media files

## Implementation Details

### Service Layer (`chat.service.js`)

The `getJourneyPageData` method:
1. Retrieves user profile data
2. Fetches favorite messages (configurable limit)
3. Fetches recent chats (configurable limit)
4. Fetches recent messages across all chats (configurable limit)
5. Calculates usage statistics
6. Returns all data in a structured format

### Data Filtering

All queries exclude deleted records:
- `chat.isDeleted: false`
- `message.isDeleted: false`
- `mediaLibrary.isDeleted: false`

### Performance Optimization

Uses `Promise.all` to fetch statistics in parallel:
```javascript
const [totalChats, totalMessages, totalFavorites, totalMedia] = await Promise.all([...]);
```

## Usage Examples

### Using cURL

```bash
# Get journey page data with default limits
curl http://localhost:3000/api/v1/chats/journey \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get journey page data with custom limits
curl "http://localhost:3000/api/v1/chats/journey?favoriteLimit=20&chatLimit=10&messageLimit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript (fetch)

```javascript
const getJourneyData = async (token, options = {}) => {
  const params = new URLSearchParams({
    favoriteLimit: options.favoriteLimit || 10,
    chatLimit: options.chatLimit || 5,
    messageLimit: options.messageLimit || 10,
  });
  
  const response = await fetch(
    `/api/v1/chats/journey?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return await response.json();
};

// Usage
const journeyData = await getJourneyData(token, {
  favoriteLimit: 20,
  chatLimit: 10,
  messageLimit: 30,
});

console.log('Favorite messages:', journeyData.data.favoriteMessages);
console.log('Statistics:', journeyData.data.statistics);
```

### Using React

```jsx
import { useEffect, useState } from 'react';

const JourneyPage = ({ token }) => {
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJourneyData = async () => {
      try {
        const response = await fetch('/api/v1/chats/journey', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setJourneyData(data.data);
      } catch (error) {
        console.error('Error fetching journey data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJourneyData();
  }, [token]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {journeyData.user.fullName}!</h1>
      
      <div>
        <h2>Statistics</h2>
        <p>Total Chats: {journeyData.statistics.totalChats}</p>
        <p>Total Messages: {journeyData.statistics.totalMessages}</p>
        <p>Favorites: {journeyData.statistics.totalFavorites}</p>
        <p>Media Files: {journeyData.statistics.totalMedia}</p>
      </div>

      <div>
        <h2>Favorite Messages</h2>
        {journeyData.favoriteMessages.map(msg => (
          <div key={msg.id}>
            <p>{msg.content}</p>
            <small>From: {msg.chat.name}</small>
          </div>
        ))}
      </div>

      <div>
        <h2>Recent Chats</h2>
        {journeyData.recentChats.map(chat => (
          <div key={chat.id}>
            <h3>{chat.name}</h3>
            <p>{chat.lastMessage}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Security Considerations

1. **Authentication Required:** All requests require a valid JWT token
2. **User Isolation:** Returns only data belonging to the authenticated user
3. **Deleted Data Filtering:** Automatically excludes deleted records
4. **Configurable Limits:** Prevents excessive data retrieval

## Error Handling

**Response (Error - User Not Found):**
```json
{
  "message": "User not found",
  "success": false,
  "statusCode": 404
}
```

**Response (Error - Authentication):**
```json
{
  "message": "Unauthorized. Please provide a valid token.",
  "success": false,
  "statusCode": 401
}
```

## Notes

- Default limits are designed to provide a quick overview without overwhelming the response
- Adjust limits based on your UI requirements
- Statistics are calculated on-the-fly to ensure accuracy
- All timestamps are in ISO 8601 format
- Favorites are ordered by most recently added

