# Settings API Documentation

## Overview

The Settings API provides endpoints for managing feature toggles and system settings like language configuration. This allows you to enable/disable features and configure system-wide settings.

## Base URL

All endpoints are prefixed with: `/api/v1/settings`

## Authentication

All settings endpoints require authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Endpoints

### 1. Get Complete Settings

Returns all settings (feature toggles, system settings, and system language) in one call.

**Endpoint:** `GET /api/v1/settings`

**Response:**
```json
{
  "success": true,
  "message": "Settings retrieved successfully.",
  "data": {
    "featureToggles": [...],
    "systemSettings": [...],
    "systemLanguage": {...}
  }
}
```

---

### 2. Feature Toggles

#### Get All Feature Toggles

**Endpoint:** `GET /api/v1/settings/feature-toggles`

**Response:**
```json
{
  "success": true,
  "message": "Feature toggles retrieved successfully.",
  "data": [
    {
      "id": "cmgs8fxkl0000ujxgtk16pecv",
      "name": "ADVANCED_ANALYTICS",
      "displayName": "Advanced Analytics",
      "description": "Enhanced user behavior tracking and insights.",
      "category": "ANALYTICS",
      "isEnabled": true,
      "status": "ACTIVE",
      "icon": null,
      "order": 1,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "cmgs8fxkl0000ujxgtk16pecw",
      "name": "AI_VOICE_CHAT",
      "displayName": "AI Voice Chat",
      "description": "Voice-based conversations with AI companion.",
      "category": "COMMUNICATION",
      "isEnabled": false,
      "status": "COMING_SOON",
      "icon": null,
      "order": 2,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Feature Toggle by Name

**Endpoint:** `GET /api/v1/settings/feature-toggles/:name`

**Parameters:**
- `name` - Feature name (e.g., `ADVANCED_ANALYTICS`, `AI_VOICE_CHAT`)

**Example:**
```bash
GET /api/v1/settings/feature-toggles/ADVANCED_ANALYTICS
```

#### Update Feature Toggle

**Endpoint:** `PATCH /api/v1/settings/feature-toggles/:name`

**Request Body:**
```json
{
  "isEnabled": true,
  "status": "ACTIVE"
}
```

**Fields:**
- `isEnabled` (optional): Enable/disable the feature
- `status` (optional): Feature status (`ACTIVE`, `COMING_SOON`, `DEPRECATED`)

**Note:** Cannot enable features marked as `COMING_SOON`.

#### Toggle Feature On/Off

**Endpoint:** `PATCH /api/v1/settings/feature-toggles/:name/toggle`

Quickly toggle a feature on or off.

**Response:**
```json
{
  "success": true,
  "message": "Feature enabled successfully.",
  "data": {
    "id": "cmgs8fxkl0000ujxgtk16pecv",
    "name": "ADVANCED_ANALYTICS",
    "isEnabled": true,
    ...
  }
}
```

#### Initialize Default Feature Toggles

**Endpoint:** `POST /api/v1/settings/feature-toggles/initialize`

Creates default feature toggles in the database. Safe to call multiple times - only creates missing toggles.

**Default Features:**
- Advanced Analytics (enabled, ACTIVE)
- AI Voice Chat (disabled, COMING_SOON)
- Group Therapy Sessions (disabled, COMING_SOON)
- Custom Branding (disabled, COMING_SOON)
- Multilingual Support (disabled, COMING_SOON)
- Crisis Intervention (disabled, COMING_SOON)

---

### 3. System Language

#### Get System Language

**Endpoint:** `GET /api/v1/settings/system-language`

**Response:**
```json
{
  "success": true,
  "message": "System language retrieved successfully.",
  "data": {
    "key": "SYSTEM_LANGUAGE",
    "value": "English",
    "displayName": "System Language",
    "description": "The default language for the application",
    "category": "LOCALIZATION",
    "dataType": "STRING",
    "availableOptions": [
      { "value": "English", "label": "English" },
      { "value": "Spanish", "label": "Spanish" },
      { "value": "French", "label": "French" },
      { "value": "German", "label": "German" },
      { "value": "Italian", "label": "Italian" },
      { "value": "Portuguese", "label": "Portuguese" },
      { "value": "Chinese", "label": "Chinese" },
      { "value": "Japanese", "label": "Japanese" },
      { "value": "Korean", "label": "Korean" },
      { "value": "Arabic", "label": "Arabic" }
    ]
  }
}
```

#### Update System Language

**Endpoint:** `PATCH /api/v1/settings/system-language`

**Request Body:**
```json
{
  "language": "Spanish"
}
```

**Available Languages:**
- English
- Spanish
- French
- German
- Italian
- Portuguese
- Chinese
- Japanese
- Korean
- Arabic

**Response:**
```json
{
  "success": true,
  "message": "System language updated successfully.",
  "data": {
    "id": "cmgs8fxkl0000ujxgtk16pecv",
    "key": "SYSTEM_LANGUAGE",
    "value": "Spanish",
    "displayName": "System Language",
    ...
  }
}
```

---

### 4. System Settings

#### Get All System Settings

**Endpoint:** `GET /api/v1/settings/system`

Returns all system settings (language, theme, timezone, etc.).

---

## Feature Toggle Names

Available feature toggle names:
- `ADVANCED_ANALYTICS` - Advanced Analytics
- `AI_VOICE_CHAT` - AI Voice Chat
- `GROUP_THERAPY_SESSIONS` - Group Therapy Sessions
- `CUSTOM_BRANDING` - Custom Branding
- `MULTILINGUAL_SUPPORT` - Multilingual Support
- `CRISIS_INTERVENTION` - Crisis Intervention

## Feature Status Values

- `ACTIVE` - Feature is available and can be enabled
- `COMING_SOON` - Feature is in development, cannot be enabled yet
- `DEPRECATED` - Feature is deprecated and will be removed

## Usage Examples

### Get All Feature Toggles
```bash
curl -X GET "http://localhost:3000/api/v1/settings/feature-toggles" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Enable Advanced Analytics
```bash
curl -X PATCH "http://localhost:3000/api/v1/settings/feature-toggles/ADVANCED_ANALYTICS" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isEnabled": true}'
```

### Toggle Feature
```bash
curl -X PATCH "http://localhost:3000/api/v1/settings/feature-toggles/ADVANCED_ANALYTICS/toggle" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get System Language
```bash
curl -X GET "http://localhost:3000/api/v1/settings/system-language" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update System Language
```bash
curl -X PATCH "http://localhost:3000/api/v1/settings/system-language" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "Spanish"}'
```

### Initialize Default Feature Toggles
```bash
curl -X POST "http://localhost:3000/api/v1/settings/feature-toggles/initialize" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Migration

After adding the models to your schema, run:

```bash
# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_settings_models
```

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
- `400` - Bad Request (validation errors, cannot enable COMING_SOON features)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (feature toggle not found)
- `500` - Internal server error

---

## Notes

1. **Coming Soon Features**: Features marked as `COMING_SOON` cannot be enabled. They will automatically become available when their status changes to `ACTIVE`.

2. **Feature Initialization**: Run the initialize endpoint once to set up default feature toggles in your database.

3. **System Language**: The system language setting is created automatically when first updated. Default is "English".

4. **Ordering**: Feature toggles are returned in order (by the `order` field) for consistent UI display.

