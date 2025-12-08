# Authentication Logging Implementation

## Overview
This document describes the authentication logging system that tracks all login, register, and social login events in the database.

## Features Implemented

### 1. Database Schema
- **New Model**: `AuthLog` in Prisma schema
- **Fields**:
  - `eventType`: REGISTER, LOGIN, SOCIAL_LOGIN, VERIFY_OTP
  - `status`: SUCCESS, FAILED
  - `loginType`: EMAIL, GOOGLE, APPLE, FACEBOOK
  - User information (userId, email, userName)
  - Provider information (provider, providerId) for social logins
  - Request metadata (ipAddress, userAgent)
  - Error information (errorMessage, errorCode) for failed attempts
  - Additional metadata (JSON field)

### 2. Logging Service
- **File**: `src/api/v1/services/authLog.service.js`
- **Methods**:
  - `logAuthEvent()`: Logs authentication events
  - `getAuthLogs()`: Retrieves logs with pagination and filters
  - `getAuthStats()`: Returns authentication statistics

### 3. Logged Events

#### Registration (createUser)
- ✅ Successful registration
- ✅ Failed registration (user already exists)

#### OTP Verification (verifyOtp)
- ✅ Successful OTP verification
- ✅ Failed OTP verification (invalid OTP, expired OTP, user not found)

#### Login (loginUser)
- ✅ Successful login
- ✅ Failed login (invalid credentials, account deleted, account inactive)

#### Social Login (socialLogin)
- ✅ Successful social login (Google, Apple, Facebook)
- ✅ Failed social login (with error details)

### 4. API Endpoints (No Authentication Required)

#### Get Authentication Logs
```
GET /api/v1/auth-logs
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `eventType` (optional): Filter by event type (REGISTER, LOGIN, SOCIAL_LOGIN, VERIFY_OTP)
- `status` (optional): Filter by status (SUCCESS, FAILED)
- `email` (optional): Filter by email
- `userId` (optional): Filter by user ID
- `startDate` (optional): Start date filter (ISO string)
- `endDate` (optional): End date filter (ISO string)

**Example**:
```
GET /api/v1/auth-logs?page=1&limit=20&eventType=LOGIN&status=SUCCESS
```

#### Get Authentication Statistics
```
GET /api/v1/auth-logs/stats
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalLogs": 1000,
    "successLogs": 850,
    "failedLogs": 150,
    "successRate": "85.00",
    "eventTypeCounts": {
      "register": 200,
      "login": 500,
      "socialLogin": 250,
      "verifyOtp": 50
    }
  },
  "recentLogs": [...]
}
```

## Database Migration

To apply the schema changes, run:

```bash
npx prisma migrate dev --name add_auth_logging
```

Or if using Prisma Studio:
```bash
npx prisma db push
```

## Implementation Details

### Request Metadata Extraction
- IP address extraction handles proxies and load balancers
- User agent extraction from request headers
- Utility function: `src/api/v1/utils/requestMetadata.js`

### Error Handling
- Logging failures don't break authentication flow
- Errors are logged to console but don't throw exceptions
- Failed log attempts are silently handled

### Indexes
The AuthLog model includes indexes on:
- `userId`
- `email`
- `eventType`
- `status`
- `createdAt`

This ensures fast queries even with large log tables.

## Usage Examples

### View all login attempts
```
GET /api/v1/auth-logs?eventType=LOGIN
```

### View failed authentication attempts
```
GET /api/v1/auth-logs?status=FAILED
```

### View logs for a specific user
```
GET /api/v1/auth-logs?userId=clx123456789
```

### View logs for a specific email
```
GET /api/v1/auth-logs?email=user@example.com
```

### View logs within a date range
```
GET /api/v1/auth-logs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
```

## Security Note

⚠️ **Important**: The auth log endpoints are publicly accessible (no authentication required) as per requirements. Consider adding:
- Rate limiting
- IP whitelisting
- Admin authentication (if needed in the future)

## Files Modified/Created

### Created Files:
1. `src/api/v1/services/authLog.service.js` - Logging service
2. `src/api/v1/controller/AuthLogController.js` - Log controller
3. `src/api/v1/routes/authLog.js` - Log routes
4. `src/api/v1/utils/requestMetadata.js` - Request metadata utility

### Modified Files:
1. `prisma/schema.prisma` - Added AuthLog model and enums
2. `src/api/v1/services/user.service.js` - Added logging calls
3. `src/api/v1/controller/UserController.js` - Added request metadata extraction
4. `app.js` - Added auth log routes and trust proxy setting

## Testing

After running migrations, test the endpoints:

1. **Register a user** - Check logs:
   ```bash
   GET /api/v1/auth-logs?eventType=REGISTER
   ```

2. **Login** - Check logs:
   ```bash
   GET /api/v1/auth-logs?eventType=LOGIN
   ```

3. **Social Login** - Check logs:
   ```bash
   GET /api/v1/auth-logs?eventType=SOCIAL_LOGIN
   ```

4. **View Statistics**:
   ```bash
   GET /api/v1/auth-logs/stats
   ```

## Future Enhancements

Potential improvements:
- Add admin authentication to log viewing endpoints
- Add log retention policies
- Add log export functionality
- Add real-time log streaming
- Add alerting for suspicious patterns

