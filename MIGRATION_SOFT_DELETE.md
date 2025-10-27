# Soft Delete Migration Guide

This document describes the database migration required to add the `isDeleted` and `deletedAt` fields to the User, Chat, Message, and MediaLibrary models.

## Migration Overview

The soft delete feature adds two fields to track deleted records:
- `isDeleted` (Boolean, default: false)
- `deletedAt` (DateTime, nullable)

These fields are added to the following models:
- User
- Chat
- Message
- MediaLibrary

## Running the Migration

### Step 1: Generate Prisma Client

```bash
npx prisma generate
```

### Step 2: Create and Apply Migration

```bash
npx prisma migrate dev --name add_soft_delete_fields
```

Or if you want to apply the migration to production:

```bash
npx prisma migrate deploy
```

## What Changed

### Database Schema Changes

```prisma
model User {
  // ... existing fields
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  // ... rest of fields
}

model Chat {
  // ... existing fields
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  // ... rest of fields
}

model Message {
  // ... existing fields
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  // ... rest of fields
}

model MediaLibrary {
  // ... existing fields
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  // ... rest of fields
}
```

### Code Changes

1. **Service Layer** (`user.service.js`):
   - Updated `deleteOwnAccount` to perform soft delete
   - Added transaction to mark all related data as deleted
   - Added check in `loginUser` to prevent login for deleted accounts

2. **Authentication**:
   - Login now checks `isDeleted` flag
   - Deleted accounts cannot log in

## Important Notes

1. **Existing Records**: All existing records will have `isDeleted: false` by default
2. **No Data Loss**: No data is removed, only new fields are added
3. **Rollback**: If needed, you can rollback this migration with:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

## After Migration

- The soft delete feature will be fully functional
- Users can delete their accounts via `DELETE /api/v1/user/delete-account`
- Deleted accounts cannot log in
- Deleted records are preserved for potential recovery

## Testing

After migration, test the account deletion:

```bash
curl -X DELETE http://localhost:3000/api/v1/user/delete-account \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Verify that:
1. Account cannot log in after deletion
2. All related data is marked with `isDeleted: true`
3. Data is preserved in the database

