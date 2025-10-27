# Message Favorites Migration Guide

This document describes the database migration required to add the favorites feature.

## Migration Overview

The favorites feature adds a new `UserMessageFavorite` model to track which messages users have favorited.

## Running the Migration

### Step 1: Generate Prisma Client

```bash
npx prisma generate
```

### Step 2: Create and Apply Migration

```bash
npx prisma migrate dev --name add_message_favorites
```

Or if you want to apply the migration to production:

```bash
npx prisma migrate deploy
```

## What Changed

### Database Schema Changes

Added a new `UserMessageFavorite` model:

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

Updated relationships in `User` and `Message` models:

```prisma
model User {
  // ... existing fields
  favoriteMessages UserMessageFavorite[]
  // ... rest of fields
}

model Message {
  // ... existing fields
  favoritedBy  UserMessageFavorite[]
  // ... rest of fields
}
```

### Code Changes

1. **Service Layer** (`chat.service.js`):
   - `addToFavorites()` - Add message to favorites
   - `removeFromFavorites()` - Remove message from favorites
   - `toggleFavorite()` - Toggle favorite status
   - `getFavoriteMessages()` - Get all user favorites
   - `getChatFavorites()` - Get favorites for a specific chat

2. **Controller Layer** (`ChatController.js`):
   - Added corresponding controller methods

3. **Routes** (`chat.js`):
   - Added 5 new routes for favorites management

## Important Notes

1. **Existing Records**: No impact on existing data
2. **No Data Loss**: Only adds new table and relationships
3. **Cascade Deletion**: Favorites are automatically deleted with users or messages
4. **Unique Constraint**: Each user can only favorite a message once

## Testing

After migration, test the favorites feature:

```bash
# Add to favorites
curl -X POST http://localhost:3000/api/v1/chats/<chatId>/messages/<messageId>/favorite \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get favorites
curl http://localhost:3000/api/v1/chats/favorites/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rollback

If needed, you can rollback this migration:

```bash
npx prisma migrate resolve --rolled-back add_message_favorites
```

