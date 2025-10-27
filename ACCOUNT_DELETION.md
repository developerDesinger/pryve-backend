# Account Deletion Feature

This document describes the account deletion functionality implemented in the Pryve application.

## Overview

Users can now delete their own accounts. This feature performs a **soft delete**, marking all user data as deleted while preserving it for recovery purposes. This includes:
- User profile (marked as deleted)
- All chats (marked as deleted and inactive)
- All messages (marked as deleted)
- All media files (marked as deleted but files remain on disk)
- All related records (marked as deleted)

## API Endpoint

### Delete Own Account

**Endpoint:** `DELETE /api/v1/user/delete-account`

**Authentication:** Required (Bearer Token)

**Description:** Soft deletes the authenticated user's account and all associated data by setting `isDeleted` flag to `true`.

**Request:**
```bash
DELETE /api/v1/user/delete-account
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "message": "Account deleted successfully.",
  "success": true
}
```

**Response (Error - Not Authenticated):**
```json
{
  "message": "Unauthorized. Please provide a valid token.",
  "success": false
}
```

**Response (Error - User Not Found):**
```json
{
  "message": "User not found",
  "success": false
}
```

## Implementation Details

### Service Layer (`user.service.js`)

The `deleteOwnAccount` method:
1. Retrieves the user and checks if already deleted
2. Uses a database transaction to ensure data consistency
3. Marks the user as deleted (`isDeleted: true, status: INACTIVE`)
4. Marks all chats as deleted (`isDeleted: true, isActive: false`)
5. Marks all messages as deleted (`isDeleted: true`)
6. Marks all media files as deleted (`isDeleted: true`)
7. Sets `deletedAt` timestamp for audit trail
8. Returns success message or error

### Database Changes

The following fields are added to track deletions:
- `User`: `isDeleted` (Boolean), `deletedAt` (DateTime)
- `Chat`: `isDeleted` (Boolean), `deletedAt` (DateTime)
- `Message`: `isDeleted` (Boolean), `deletedAt` (DateTime)
- `MediaLibrary`: `isDeleted` (Boolean), `deletedAt` (DateTime)

### Soft Delete Benefits

1. **Data Recovery:** Deleted accounts can be recovered if needed
2. **Audit Trail:** `deletedAt` timestamp tracks when deletion occurred
3. **File Preservation:** Media files remain on disk for potential recovery
4. **Transaction Safety:** All related data is marked in a single transaction
5. **Data Integrity:** No risk of orphaned records from cascade issues

## Security Considerations

1. **Authentication Required:** Only authenticated users can delete accounts
2. **Self-Deletion Only:** Users can only delete their own account (enforced by JWT token)
3. **Soft Delete:** Data is marked as deleted but preserved in database
4. **Status Change:** User status is set to INACTIVE upon deletion
5. **Idempotent:** Deleting an already deleted account returns an error

## Data Recovery

Since this is a soft delete implementation, deleted accounts can potentially be recovered by:
1. Setting `isDeleted: false` on the User record
2. Updating related records (Chats, Messages, etc.) similarly
3. Restoring user status to ACTIVE

## Differences from Admin Delete

The existing `DELETE /api/v1/user/:id` endpoint (admin delete) performs a basic soft delete by setting status to "INACTIVE". The new `delete-account` endpoint performs a **comprehensive soft delete** by marking all related data (chats, messages, media files) with `isDeleted: true` and timestamps.

## Usage Example

### Using cURL
```bash
curl -X DELETE http://localhost:3000/api/v1/user/delete-account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman
1. Set method to `DELETE`
2. Set URL to `/api/v1/user/delete-account`
3. Add header: `Authorization: Bearer <your_token>`
4. Send request

### Using JavaScript (fetch)
```javascript
fetch('/api/v1/user/delete-account', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

## Error Handling

The implementation includes comprehensive error handling:
- User not found errors
- File deletion errors (non-blocking)
- Database errors
- Authentication errors

## Notes

- This uses soft delete - data is preserved but marked as deleted
- Files remain on disk for potential recovery
- Deleted accounts cannot log in or be accessed
- Consider implementing a permanent purge job for old deleted accounts (e.g., after 90 days)
- Queries should filter out `isDeleted: true` records for normal operations
- Recommend implementing a confirmation step in the frontend

