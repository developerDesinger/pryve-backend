# API Key Storage API Documentation

## Overview

The API Key Storage system allows you to securely store and manage API keys (OpenAI, Stripe, etc.) in the database instead of environment variables. All keys are encrypted using AES-256-GCM encryption before storage.

## Base URL

All endpoints are prefixed with: `/api/v1/api-keys`

## Authentication

All API key endpoints require authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Security Features

- **Encryption**: All API keys are encrypted using AES-256-GCM before storage
- **Masked Display**: Keys are never returned in full - only masked versions (e.g., "sk-...xyz")
- **Environment Support**: Store different keys for different environments (PRODUCTION, DEVELOPMENT, STAGING)
- **Usage Tracking**: Tracks when keys were last used

## Endpoints

### 1. Create or Update API Key

Creates a new API key or updates an existing one if it already exists for the same type and environment.

**Endpoint:** `POST /api/v1/api-keys`

**Request Body:**
```json
{
  "name": "OpenAI API Key",
  "apiType": "OPENAI",
  "keyValue": "sk-...your-actual-key...",
  "description": "Required for AI conversation capabilities",
  "environment": "PRODUCTION"
}
```

**Fields:**
- `name` (required): Display name for the key
- `apiType` (required): Type of API. Valid values: `OPENAI`, `STRIPE`, `SENDGRID`, `FIREBASE`, `AWS`, `OTHER`
- `keyValue` (required): The actual API key value (will be encrypted)
- `description` (optional): Description of what this key is used for
- `environment` (optional): Environment type (`PRODUCTION`, `DEVELOPMENT`, `STAGING`)

**Response:**
```json
{
  "message": "API key created successfully.",
  "success": true,
  "data": {
    "id": "cmgs8fxkl0000ujxgtk16pecv",
    "name": "OpenAI API Key",
    "apiType": "OPENAI",
    "description": "Required for AI conversation capabilities",
    "environment": "PRODUCTION",
    "isActive": true,
    "maskedKey": "sk-...xyz",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### 2. Get All API Keys

Retrieves all stored API keys with masked values.

**Endpoint:** `GET /api/v1/api-keys`

**Response:**
```json
{
  "message": "API keys retrieved successfully.",
  "success": true,
  "data": [
    {
      "id": "cmgs8fxkl0000ujxgtk16pecv",
      "name": "OpenAI API Key",
      "apiType": "OPENAI",
      "description": "Required for AI conversation capabilities",
      "environment": "PRODUCTION",
      "isActive": true,
      "maskedKey": "sk-...xyz",
      "lastUsedAt": "2025-01-15T09:00:00Z",
      "createdAt": "2025-01-10T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "cmgs8fxkl0000ujxgtk16pecw",
      "name": "Stripe Secret Key",
      "apiType": "STRIPE",
      "description": "Required for payment processing and subscriptions",
      "environment": "PRODUCTION",
      "isActive": true,
      "maskedKey": "sk_...abc",
      "lastUsedAt": null,
      "createdAt": "2025-01-12T14:20:00Z",
      "updatedAt": "2025-01-12T14:20:00Z"
    }
  ]
}
```

---

### 3. Get API Key by ID

Retrieves a specific API key by ID with masked value.

**Endpoint:** `GET /api/v1/api-keys/:id`

**Response:**
```json
{
  "message": "API key retrieved successfully.",
  "success": true,
  "data": {
    "id": "cmgs8fxkl0000ujxgtk16pecv",
    "name": "OpenAI API Key",
    "apiType": "OPENAI",
    "description": "Required for AI conversation capabilities",
    "environment": "PRODUCTION",
    "isActive": true,
    "maskedKey": "sk-...xyz",
    "lastUsedAt": "2025-01-15T09:00:00Z",
    "createdAt": "2025-01-10T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### 4. Update API Key

Updates an existing API key. Only provided fields will be updated.

**Endpoint:** `PATCH /api/v1/api-keys/:id`

**Request Body:**
```json
{
  "name": "Updated OpenAI API Key",
  "keyValue": "sk-...new-key...",
  "description": "Updated description",
  "isActive": true
}
```

**Fields (all optional):**
- `name`: Update display name
- `keyValue`: Update the API key (will be re-encrypted)
- `description`: Update description
- `isActive`: Enable/disable the key

**Response:**
```json
{
  "message": "API key updated successfully.",
  "success": true,
  "data": {
    "id": "cmgs8fxkl0000ujxgtk16pecv",
    "name": "Updated OpenAI API Key",
    "apiType": "OPENAI",
    "description": "Updated description",
    "environment": "PRODUCTION",
    "isActive": true,
    "maskedKey": "sk-...new",
    "lastUsedAt": "2025-01-15T09:00:00Z",
    "createdAt": "2025-01-10T10:30:00Z",
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

---

### 5. Delete API Key

Permanently deletes an API key from the database.

**Endpoint:** `DELETE /api/v1/api-keys/:id`

**Response:**
```json
{
  "message": "API key deleted successfully.",
  "success": true
}
```

---

### 6. Toggle API Key Status

Activates or deactivates an API key without deleting it.

**Endpoint:** `PATCH /api/v1/api-keys/:id/toggle`

**Response:**
```json
{
  "message": "API key activated successfully.",
  "success": true,
  "data": {
    "id": "cmgs8fxkl0000ujxgtk16pecv",
    "name": "OpenAI API Key",
    "apiType": "OPENAI",
    "isActive": true
  }
}
```

---

## Usage Examples

### Create OpenAI API Key
```bash
curl -X POST "http://localhost:3000/api/v1/api-keys" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI API Key",
    "apiType": "OPENAI",
    "keyValue": "sk-your-actual-openai-key",
    "description": "Required for AI conversation capabilities",
    "environment": "PRODUCTION"
  }'
```

### Create Stripe Secret Key
```bash
curl -X POST "http://localhost:3000/api/v1/api-keys" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stripe Secret Key",
    "apiType": "STRIPE",
    "keyValue": "sk_live_your-actual-stripe-key",
    "description": "Required for payment processing and subscriptions",
    "environment": "PRODUCTION"
  }'
```

### Get All API Keys
```bash
curl -X GET "http://localhost:3000/api/v1/api-keys" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update API Key
```bash
curl -X PATCH "http://localhost:3000/api/v1/api-keys/KEY_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyValue": "sk-new-key-value",
    "isActive": true
  }'
```

### Delete API Key
```bash
curl -X DELETE "http://localhost:3000/api/v1/api-keys/KEY_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Using Stored Keys in Your Code

To use stored API keys instead of environment variables, use the `ApiKeyService.getDecryptedKeyByType()` method:

```javascript
const ApiKeyService = require("./services/apiKey.service");

// Get OpenAI API key from database
const openaiKey = await ApiKeyService.getDecryptedKeyByType("OPENAI", "PRODUCTION");

// Use the key
if (openaiKey) {
  // Use openaiKey instead of process.env.OPENAI_API_KEY
  const openai = new OpenAI({ apiKey: openaiKey });
} else {
  // Fallback to environment variable
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
```

---

## Database Migration

After adding the `ApiKey` model to your schema, run:

```bash
# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_api_key_model
```

---

## Environment Variables

The encryption uses `API_KEY_ENCRYPTION_KEY` from environment variables, or falls back to `JWT_SECRET`. Make sure one of these is set:

```env
API_KEY_ENCRYPTION_KEY=your-strong-encryption-key-here
# OR
JWT_SECRET=your-jwt-secret-here
```

---

## Security Notes

1. **Never expose full keys**: The API always returns masked keys (e.g., "sk-...xyz")
2. **Encryption**: Keys are encrypted using AES-256-GCM before storage
3. **Access Control**: Consider restricting API key management to ADMIN role only
4. **Backup**: Encrypted keys are stored in the database - ensure database backups are secure
5. **Rotation**: Regularly rotate API keys and update them in the database

---

## API Types

Supported API types:
- `OPENAI` - OpenAI API keys
- `STRIPE` - Stripe secret keys
- `SENDGRID` - SendGrid API keys
- `FIREBASE` - Firebase service account keys
- `AWS` - AWS access keys
- `OTHER` - Other API keys

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (API key not found)
- `500` - Internal server error

