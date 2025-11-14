# 📮 Postman Collections Setup Guide - Dashboard & Settings APIs

## 🚀 Quick Setup

### 1. Import Collections

1. Open Postman
2. Click **Import** button
3. Select both collection files:
   - `Pryve_Dashboard_API.postman_collection.json`
   - `Pryve_Settings_API.postman_collection.json`
4. Collections imported successfully! ✅

### 2. Set Environment Variables

1. Click **Environments** tab in Postman
2. Create new environment: `Pryve Dashboard & Settings`
3. Add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `baseUrl` | `http://localhost:3000` | API base URL (change for production) |
| `token` | `your_jwt_token` | JWT token from login (auto-set after login) |
| `apiKeyId` | `your_api_key_id` | API key ID (set after creating a key) |

### 3. Get JWT Token

1. Use the **Pryve Auth API** collection to login
2. Run **Login** request
3. Copy `token` from response
4. Set `token` variable in your environment

---

## 📊 Dashboard API Collection

### Available Endpoints

#### 1. **Get Complete Dashboard**
- **GET** `/api/v1/dashboard?period=monthly&activityLimit=10`
- Returns all dashboard metrics in one call
- Query params:
  - `period`: `daily`, `weekly`, `monthly`, `yearly` (default: `monthly`)
  - `activityLimit`: Number of activities (default: `10`, max: `50`)

#### 2. **User Activity Trends**
- **GET** `/api/v1/dashboard/activity-trends?period=monthly`
- Returns daily active users and message volume
- Pre-configured requests for:
  - Monthly (last 90 days)
  - Weekly (last 30 days)
  - Daily (last 7 days)
  - Yearly (last 365 days)

#### 3. **User Engagement**
- **GET** `/api/v1/dashboard/user-engagement`
- Returns active vs inactive users breakdown
- Includes engagement rate and percentages

#### 4. **Emotional Topics Analysis**
- **GET** `/api/v1/dashboard/emotional-topics`
- Returns AI-detected emotional themes
- Includes topics, mentions, member counts, and growth metrics

#### 5. **Recent Activity**
- **GET** `/api/v1/dashboard/recent-activity?limit=10`
- Returns recent user actions
- Pre-configured requests for:
  - Default (10 items)
  - 20 items
  - Maximum (50 items)

### Testing Dashboard APIs

1. **Set your token** in environment variables
2. **Run "Get Complete Dashboard"** to see all metrics
3. **Try individual endpoints** to see specific data
4. **Test different periods** for activity trends

---

## ⚙️ Settings API Collection (API Keys)

### Available Endpoints

#### 1. **Get All API Keys**
- **GET** `/api/v1/api-keys`
- Returns all stored API keys (masked for security)

#### 2. **Get API Key by ID**
- **GET** `/api/v1/api-keys/:id`
- Returns specific API key (masked)
- Use `{{apiKeyId}}` variable

#### 3. **Create or Update API Keys**
Pre-configured requests for:
- **OpenAI API Key** - For AI conversations
- **Stripe Secret Key** - For payments
- **SendGrid API Key** - For emails
- **Firebase API Key** - For Firebase services
- **AWS API Key** - For AWS services
- **Development Environment Key** - Example for dev environment

#### 4. **Update API Key**
- **PATCH** `/api/v1/api-keys/:id`
- Update key value, name, description, or status
- Pre-configured requests:
  - Update key value only
  - Update name and description
  - Deactivate key
  - Activate key

#### 5. **Toggle API Key Status**
- **PATCH** `/api/v1/api-keys/:id/toggle`
- Quickly activate/deactivate a key

#### 6. **Delete API Key**
- **DELETE** `/api/v1/api-keys/:id`
- Permanently delete a key (cannot be undone)

### Testing Settings APIs

#### Step 1: Create an API Key
1. Run **"Create/Update OpenAI API Key"** request
2. Replace `sk-your-actual-openai-api-key-here` with your real key
3. Copy the `id` from response
4. Set `{{apiKeyId}}` variable with this ID

#### Step 2: View All Keys
1. Run **"Get All API Keys"** request
2. See all stored keys with masked values

#### Step 3: Update a Key
1. Use the `{{apiKeyId}}` variable
2. Run **"Update Key Value Only"** or other update requests

#### Step 4: Manage Keys
1. Use **"Toggle API Key Status"** to activate/deactivate
2. Use **"Delete API Key"** to remove (careful!)

---

## 🔐 Security Notes

### API Keys
- **Never share full keys**: The API only returns masked keys (e.g., "sk-...xyz")
- **Encryption**: All keys are encrypted using AES-256-GCM before storage
- **Environment Variables**: Set `API_KEY_ENCRYPTION_KEY` in your `.env` file

### Authentication
- All endpoints require Bearer token authentication
- Token expires based on `JWT_EXPIRES_IN` setting
- Re-login if token expires

---

## 📝 Example Workflows

### Workflow 1: Setup API Keys for First Time

1. **Login** (using Auth collection)
2. **Create OpenAI Key**: Run "Create/Update OpenAI API Key"
3. **Create Stripe Key**: Run "Create/Update Stripe Secret Key"
4. **Verify**: Run "Get All API Keys" to see stored keys

### Workflow 2: View Dashboard Metrics

1. **Login** (using Auth collection)
2. **Get Complete Dashboard**: See all metrics at once
3. **Drill Down**: Use individual endpoints for specific data
4. **Compare Periods**: Try different periods for activity trends

### Workflow 3: Update API Key

1. **Get All Keys**: Find the key you want to update
2. **Copy Key ID**: Set `{{apiKeyId}}` variable
3. **Update Key**: Run "Update Key Value Only" with new key
4. **Verify**: Run "Get API Key by ID" to confirm

---

## 🎯 Quick Reference

### Dashboard Endpoints
```
GET  /api/v1/dashboard                    # Complete dashboard
GET  /api/v1/dashboard/activity-trends    # Activity trends
GET  /api/v1/dashboard/user-engagement    # User engagement
GET  /api/v1/dashboard/emotional-topics   # Emotional topics
GET  /api/v1/dashboard/recent-activity    # Recent activity
```

### Settings Endpoints
```
GET    /api/v1/api-keys           # Get all keys
GET    /api/v1/api-keys/:id       # Get key by ID
POST   /api/v1/api-keys           # Create/update key
PATCH  /api/v1/api-keys/:id       # Update key
PATCH  /api/v1/api-keys/:id/toggle # Toggle status
DELETE /api/v1/api-keys/:id       # Delete key
```

---

## 🐛 Troubleshooting

### "Unauthorized" Error
- **Solution**: Make sure `{{token}}` is set in environment variables
- **Fix**: Re-login and update token

### "API key not found"
- **Solution**: Check that `{{apiKeyId}}` is set correctly
- **Fix**: Run "Get All API Keys" to find the correct ID

### "Invalid API type"
- **Solution**: Use valid API types: `OPENAI`, `STRIPE`, `SENDGRID`, `FIREBASE`, `AWS`, `OTHER`
- **Fix**: Check the API type in your request body

### Keys not encrypting
- **Solution**: Set `API_KEY_ENCRYPTION_KEY` in `.env` file
- **Fix**: Restart server after adding encryption key

---

## 📚 Additional Resources

- **Dashboard API Documentation**: See `DASHBOARD_API_DOCUMENTATION.md`
- **Settings API Documentation**: See `API_KEY_STORAGE_DOCUMENTATION.md`
- **Auth Collection**: Use `Pryve_Auth.postman_collection.json` for authentication

---

## ✅ Checklist

- [ ] Imported both Postman collections
- [ ] Created environment with `baseUrl` and `token`
- [ ] Logged in and set token variable
- [ ] Tested "Get Complete Dashboard" endpoint
- [ ] Created at least one API key
- [ ] Verified keys are masked in responses
- [ ] Tested update and delete operations

---

## 🎉 You're All Set!

You can now:
- ✅ View dashboard metrics and analytics
- ✅ Manage API keys securely
- ✅ Test all endpoints easily
- ✅ Use variables for dynamic testing

Happy testing! 🚀

