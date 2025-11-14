# Dashboard API Documentation

## Overview

The Dashboard API provides comprehensive analytics and insights for the Pryve application, including user activity trends, engagement metrics, emotional topics analysis, and recent activity tracking.

## Base URL

All endpoints are prefixed with: `/api/v1/dashboard`

## Authentication

All dashboard endpoints require authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Endpoints

### 1. Get Complete Dashboard Data

Returns all dashboard metrics in a single API call.

**Endpoint:** `GET /api/v1/dashboard`

**Query Parameters:**
- `period` (optional): Time period for activity trends. Options: `daily`, `weekly`, `monthly`, `yearly`. Default: `monthly`
- `activityLimit` (optional): Number of recent activities to return. Default: `10`, Max: `50`

**Example Request:**
```bash
GET /api/v1/dashboard?period=monthly&activityLimit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data fetched successfully.",
  "data": {
    "userActivityTrends": { ... },
    "userEngagement": { ... },
    "emotionalTopicsAnalysis": { ... },
    "recentActivity": { ... }
  }
}
```

---

### 2. User Activity Trends

Returns daily active users and message volume for a given period.

**Endpoint:** `GET /api/v1/dashboard/activity-trends`

**Query Parameters:**
- `period` (optional): Time period. Options: `daily`, `weekly`, `monthly`, `yearly`. Default: `monthly`

**Example Request:**
```bash
GET /api/v1/dashboard/activity-trends?period=monthly
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User activity trends fetched successfully.",
  "data": {
    "period": "monthly",
    "trends": [
      {
        "date": "2025-01-01",
        "activeUsers": 45,
        "messageVolume": 234
      },
      {
        "date": "2025-01-02",
        "activeUsers": 52,
        "messageVolume": 287
      }
    ],
    "summary": {
      "totalActiveUsers": 1250,
      "totalMessages": 15234,
      "averageDailyActiveUsers": 48,
      "averageDailyMessages": 256
    }
  }
}
```

---

### 3. User Engagement

Returns active vs inactive users breakdown and engagement metrics.

**Endpoint:** `GET /api/v1/dashboard/user-engagement`

**Example Request:**
```bash
GET /api/v1/dashboard/user-engagement
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User engagement data fetched successfully.",
  "data": {
    "breakdown": {
      "activeUsers": 1250,
      "inactiveUsers": 350,
      "totalUsers": 1600
    },
    "recentActivity": {
      "usersWithActivityLast30Days": 980,
      "engagementRate": "61%"
    },
    "percentages": {
      "activePercentage": 78,
      "inactivePercentage": 22
    }
  }
}
```

---

### 4. Emotional Topics Analysis

Returns AI-detected emotional themes from user conversations.

**Endpoint:** `GET /api/v1/dashboard/emotional-topics`

**Example Request:**
```bash
GET /api/v1/dashboard/emotional-topics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Emotional topics analysis fetched successfully.",
  "data": {
    "summary": {
      "totalMentions": 847,
      "positiveTopics": 8,
      "avgGrowth": "14%"
    },
    "topics": [
      {
        "topic": "Relationship Issues",
        "mentions": 328,
        "members": 245,
        "positiveCount": 45,
        "percentage": 39
      },
      {
        "topic": "Family Dynamics",
        "mentions": 245,
        "members": 189,
        "positiveCount": 32,
        "percentage": 29
      },
      {
        "topic": "Anxiety & Stress",
        "mentions": 81,
        "members": 67,
        "positiveCount": 8,
        "percentage": 10
      },
      {
        "topic": "Self Confidence",
        "mentions": 76,
        "members": 58,
        "positiveCount": 23,
        "percentage": 9
      },
      {
        "topic": "Career Transitions",
        "mentions": 64,
        "members": 52,
        "positiveCount": 15,
        "percentage": 8
      },
      {
        "topic": "Work-Life Balance",
        "mentions": 23,
        "members": 18,
        "positiveCount": 5,
        "percentage": 3
      }
    ]
  }
}
```

**Topic Mapping:**
- `joy` → "Self Confidence"
- `surprise` → "Career Transitions"
- `sadness` → "Relationship Issues"
- `anger` → "Anxiety & Stress"
- `fear` → "Anxiety & Stress"
- `disgust` → "Family Dynamics"
- `neutral` → "Work-Life Balance"

---

### 5. Recent Activity

Returns list of recent user actions and events.

**Endpoint:** `GET /api/v1/dashboard/recent-activity`

**Query Parameters:**
- `limit` (optional): Number of activities to return. Default: `10`, Max: `50`

**Example Request:**
```bash
GET /api/v1/dashboard/recent-activity?limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Recent activity fetched successfully.",
  "data": {
    "activities": [
      {
        "id": "upgrade-abc123",
        "type": "premium_upgrade",
        "user": {
          "id": "user_123",
          "name": "Emma Johnson",
          "email": "emma@example.com"
        },
        "description": "Upgraded to premium after trial",
        "timestamp": "2025-01-15T10:30:00Z",
        "impact": "High Impact"
      },
      {
        "id": "user-xyz789",
        "type": "user_registration",
        "user": {
          "id": "user_456",
          "name": "Sara Chen",
          "email": "sara@example.com"
        },
        "description": "New user registration via Google",
        "timestamp": "2025-01-15T09:15:00Z",
        "impact": "Medium"
      },
      {
        "id": "usage-def456",
        "type": "heavy_usage",
        "user": {
          "id": "user_789",
          "name": "Alex Rivera",
          "email": "alex@example.com"
        },
        "description": "Heavy usage - 25 messages",
        "timestamp": "2025-01-15T08:45:00Z",
        "impact": "High Impact"
      }
    ],
    "total": 10
  }
}
```

**Activity Types:**
- `user_registration` - New user signups
- `premium_upgrade` - Users upgrading to premium
- `heavy_usage` - Users with 25+ messages in last 7 days
- `subscription_cancellation` - Users canceling subscriptions (if tracked)

**Impact Levels:**
- `High Impact` - Significant actions (upgrades, heavy usage)
- `Medium` - Standard actions (registrations)
- `Low` - Minor actions (cancellations)

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
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `500` - Internal server error

---

## Usage Examples

### Fetch Complete Dashboard
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard?period=monthly&activityLimit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Fetch Activity Trends Only
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/activity-trends?period=weekly" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Fetch User Engagement
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/user-engagement" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Fetch Emotional Topics
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/emotional-topics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Fetch Recent Activity
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/recent-activity?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

1. **Performance**: The complete dashboard endpoint (`GET /api/v1/dashboard`) may take longer to respond as it fetches all metrics. Consider using individual endpoints for better performance.

2. **Data Freshness**: Activity trends and recent activity are calculated in real-time. Emotional topics analysis may take a few seconds for large datasets.

3. **Period Options**: 
   - `daily` - Last 7 days
   - `weekly` - Last 30 days
   - `monthly` - Last 90 days
   - `yearly` - Last 365 days

4. **Rate Limiting**: Dashboard endpoints may be rate-limited. Check response headers for rate limit information.

5. **Admin Access**: Currently, all authenticated users can access dashboard data. To restrict to admins only, uncomment the `restrictTo("ADMIN")` middleware in `src/api/v1/routes/dashboard.js`.

