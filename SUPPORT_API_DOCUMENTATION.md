# Support API Documentation

This document describes the support message functionality in the Pryve application. Users can create support tickets, and admins can view and manage all support messages.

## Overview

The support feature allows:
- **Clients**: Create, view, update, and delete their own support messages
- **Admins**: View all support messages, update status, and manage any message

## Database Schema

The `SupportMessage` model tracks support requests:

```prisma
model SupportMessage {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Message content
  subject     String
  message     String   @db.Text
  
  // User relationship
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Status tracking
  status      SupportStatus @default(PENDING)
  
  // Additional metadata
  category    String?  // e.g., "TECHNICAL", "BILLING", "FEATURE_REQUEST", "BUG_REPORT"
  
  @@map("support_messages")
}

enum SupportStatus {
  PENDING
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

## API Endpoints

### 1. Create Support Message

**Endpoint:** `POST /api/v1/support`

**Authentication:** Required (Bearer Token)

**Description:** Creates a new support message. Only clients can create messages.

**Request Body:**
```json
{
  "subject": "Need help with account settings",
  "message": "I'm having trouble updating my profile picture. Can you please help?",
  "category": "TECHNICAL"
}
```

**Fields:**
- `subject` (required): Subject of the support message
- `message` (required): Detailed message content
- `category` (optional): Category like "TECHNICAL", "BILLING", "FEATURE_REQUEST", "BUG_REPORT"

**Response (Success):**
```json
{
  "message": "Support message created successfully.",
  "success": true,
  "data": {
    "id": "clx123...",
    "subject": "Need help with account settings",
    "message": "I'm having trouble updating my profile picture...",
    "category": "TECHNICAL",
    "status": "PENDING",
    "userId": "user123...",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "user": {
      "id": "user123...",
      "email": "user@example.com",
      "fullName": "John Doe",
      "userName": "johndoe"
    }
  }
}
```

---

### 2. Get All Support Messages

**Endpoint:** `GET /api/v1/support`

**Authentication:** Required (Bearer Token)

**Description:** 
- **Admins**: Get all support messages from all users
- **Clients**: Get only their own support messages

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, RESOLVED, CLOSED)
- `category` (optional): Filter by category

**Request:**
```bash
GET /api/v1/support?page=1&limit=20&status=PENDING
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Support messages fetched successfully.",
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "subject": "Need help with account settings",
      "message": "I'm having trouble...",
      "category": "TECHNICAL",
      "status": "PENDING",
      "userId": "user123...",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "user": {
        "id": "user123...",
        "email": "user@example.com",
        "fullName": "John Doe",
        "userName": "johndoe",
        "profilePhoto": "default-profile.png"
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

### 3. Get Single Support Message

**Endpoint:** `GET /api/v1/support/:id`

**Authentication:** Required (Bearer Token)

**Description:** Get a single support message by ID. Clients can only view their own messages.

**Parameters:**
- `id` (path): The ID of the support message

**Request:**
```bash
GET /api/v1/support/clx123...
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Support message fetched successfully.",
  "success": true,
  "data": {
    "id": "clx123...",
    "subject": "Need help with account settings",
    "message": "I'm having trouble...",
    "category": "TECHNICAL",
    "status": "PENDING",
    "userId": "user123...",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "user": {
      "id": "user123...",
      "email": "user@example.com",
      "fullName": "John Doe",
      "userName": "johndoe",
      "profilePhoto": "default-profile.png"
    }
  }
}
```

---

### 4. Update Support Message

**Endpoint:** `PATCH /api/v1/support/:id`

**Authentication:** Required (Bearer Token)

**Description:** Update a support message. 
- **Clients**: Can update their own messages (subject, message, category)
- **Admins**: Can update status of any message

**Parameters:**
- `id` (path): The ID of the support message to update

**Request Body (Client):**
```json
{
  "subject": "Updated subject",
  "message": "Updated message content",
  "category": "BILLING"
}
```

**Request Body (Admin - Update Status):**
```json
{
  "status": "IN_PROGRESS"
}
```

**Valid Status Values:**
- `PENDING` - Message is waiting for response
- `IN_PROGRESS` - Message is being handled
- `RESOLVED` - Issue has been resolved
- `CLOSED` - Message is closed

**Response:**
```json
{
  "message": "Support message updated successfully.",
  "success": true,
  "data": {
    "id": "clx123...",
    "subject": "Updated subject",
    "message": "Updated message content",
    "category": "BILLING",
    "status": "IN_PROGRESS",
    "userId": "user123...",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z",
    "user": {
      "id": "user123...",
      "email": "user@example.com",
      "fullName": "John Doe",
      "userName": "johndoe"
    }
  }
}
```

---

### 5. Delete Support Message

**Endpoint:** `DELETE /api/v1/support/:id`

**Authentication:** Required (Bearer Token)

**Description:** Delete a support message. Clients can only delete their own messages, admins can delete any message.

**Parameters:**
- `id` (path): The ID of the support message to delete

**Request:**
```bash
DELETE /api/v1/support/clx123...
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Support message deleted successfully.",
  "success": true
}
```

---

## Usage Examples

### Using cURL

**Create Support Message:**
```bash
curl -X POST http://localhost:3000/api/v1/support \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Need help with account",
    "message": "I cannot log in to my account",
    "category": "TECHNICAL"
  }'
```

**Get All Support Messages (Admin):**
```bash
curl -X GET "http://localhost:3000/api/v1/support?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Update Support Message Status (Admin):**
```bash
curl -X PATCH http://localhost:3000/api/v1/support/clx123... \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESOLVED"
  }'
```

### Using JavaScript (fetch)

**Create Support Message:**
```javascript
const createSupportMessage = async (subject, message, category, token) => {
  const response = await fetch('/api/v1/support', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject,
      message,
      category
    })
  });
  
  return await response.json();
};
```

**Get All Support Messages:**
```javascript
const getSupportMessages = async (token, page = 1, limit = 20, filters = {}) => {
  const queryParams = new URLSearchParams({
    page,
    limit,
    ...filters
  });
  
  const response = await fetch(`/api/v1/support?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Subject and message are required.",
  "success": false
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized. Please provide a valid token.",
  "success": false
}
```

### 403 Forbidden
```json
{
  "message": "Unauthorized access.",
  "success": false
}
```

### 404 Not Found
```json
{
  "message": "Support message not found.",
  "success": false
}
```

---

## Postman Collection

Import the `Pryve_Support_API.postman_collection.json` file into Postman to test all endpoints.

**Setup:**
1. Import the collection
2. Set the `baseUrl` variable (default: `http://localhost:3000`)
3. Get a token from the login endpoint
4. Set the `token` variable with your JWT token
5. All requests will automatically use the token

---

## Notes

- All endpoints require authentication
- Clients can only access their own messages
- Admins can access all messages
- Status can only be updated by admins
- Messages are soft-deleted (can be recovered if needed)
- Pagination is available for listing endpoints
- Filtering by status and category is supported

