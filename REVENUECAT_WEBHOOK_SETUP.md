# RevenueCat Webhook Integration

This document describes the RevenueCat webhook integration that has been set up to receive and store payment/subscription details from RevenueCat.

## Overview

The integration includes:
1. **Database Model**: `RevenueCatPayment` model to store payment/subscription details
2. **Webhook Endpoint**: Receives webhook events from RevenueCat
3. **Service Layer**: Processes and saves payment data
4. **API Endpoints**: Get user payment history and active subscriptions

## Database Model

The `RevenueCatPayment` model stores:
- User relationship (links to User model)
- Event type (INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.)
- Product and subscription details
- Transaction information
- Purchase and expiration dates
- Subscription status
- Pricing information
- Raw webhook data (complete payload stored as JSON)

## API Endpoints

### Webhook Endpoint (RevenueCat calls this)
- **POST** `/api/v1/webhooks/revenuecat/webhook`
  - No authentication required (RevenueCat will call this)
  - Receives webhook payload from RevenueCat
  - Processes and saves payment data
  - Returns 200 status to acknowledge receipt

### User Payment Endpoints (Authenticated)
- **GET** `/api/v1/webhooks/revenuecat/payments`
  - Requires authentication
  - Returns all payment records for the authenticated user

- **GET** `/api/v1/webhooks/revenuecat/active-subscription`
  - Requires authentication
  - Returns active subscription details for the authenticated user

## Setup Instructions

### 1. Database Migration

After adding the new model, you need to run a Prisma migration:

```bash
# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_revenuecat_payment_model
```

### 2. Configure RevenueCat Webhook

1. Go to your RevenueCat dashboard
2. Navigate to **Integrations** → **Webhooks**
3. Click **Add new configuration**
4. Configure the webhook:
   - **Name**: Your webhook name (e.g., "Pryve Payment Webhook")
   - **URL**: `https://your-domain.com/api/v1/webhooks/revenuecat/webhook`
   - **Authorization Header** (Optional): Set a secret token for security
   - **Environment**: Choose Production, Sandbox, or Both
   - **App**: Select specific app or all apps
   - **Events**: Select which events to receive (or leave default to receive all)

### 3. User Identification

The webhook service looks up users by:
1. **Email** (primary): If RevenueCat's `app_user_id` is the user's email
2. **User ID** (fallback): If `app_user_id` is the user's ID

**Important**: Make sure the `app_user_id` you set in RevenueCat matches either:
- The user's email address in your database, OR
- The user's ID in your database

You can configure this in RevenueCat when identifying users:
```javascript
// Example: Set app_user_id to user email
Purchases.setEmail(user.email);
Purchases.logIn(user.email); // or user.id
```

### 4. (Optional) Add Webhook Authentication

If you set an Authorization Header in RevenueCat, you can add middleware to validate it:

```javascript
// src/api/v1/middlewares/revenuecatAuth.middleware.js
const validateRevenueCatWebhook = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;
  
  if (!expectedToken || authHeader === `Bearer ${expectedToken}`) {
    return next();
  }
  
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};
```

Then update the route:
```javascript
router.post("/webhook", validateRevenueCatWebhook, RevenueCatController.handleWebhook);
```

## Webhook Event Types

RevenueCat sends various event types. The integration handles:
- `INITIAL_PURCHASE` - First purchase
- `RENEWAL` - Subscription renewal
- `CANCELLATION` - Subscription cancelled
- `UNCANCELLATION` - Subscription reactivated
- `NON_RENEWING_PURCHASE` - One-time purchase
- `SUBSCRIPTION_PAUSED` - Subscription paused
- `EXPIRATION` - Subscription expired
- And more...

All events are saved to the database with full details.

## Testing

### Test Webhook Locally

1. Use a tool like [ngrok](https://ngrok.com/) to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Use the ngrok URL in RevenueCat webhook configuration

3. Test with RevenueCat's test webhook feature or make a purchase

### Manual Test

You can test the webhook endpoint manually:

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/revenuecat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "user@example.com",
      "product_id": "premium_monthly",
      "transaction_id": "test_transaction_123",
      "purchased_at_ms": 1640995200000,
      "expires_at_ms": 1643673600000,
      "store": "APP_STORE",
      "price": 9.99,
      "currency": "USD"
    }
  }'
```

## Troubleshooting

### User Not Found Error

If you see "User not found for app_user_id", check:
1. The `app_user_id` in RevenueCat matches a user's email or ID in your database
2. The user exists in your database
3. You're using the correct identifier when setting up RevenueCat

### Payment Not Saved

Check:
1. Server logs for any errors
2. Database connection is working
3. Prisma migration was run successfully
4. Webhook payload structure matches expected format

## Files Created/Modified

- `prisma/schema.prisma` - Added RevenueCatPayment model
- `src/api/v1/services/revenuecat.service.js` - Webhook processing service
- `src/api/v1/controller/RevenueCatController.js` - Webhook controller
- `src/api/v1/routes/revenuecat.js` - Webhook routes
- `app.js` - Registered webhook routes

## Next Steps

1. Run database migration: `npx prisma migrate dev --name add_revenuecat_payment_model`
2. Configure webhook in RevenueCat dashboard
3. Test with a purchase
4. (Optional) Add webhook authentication middleware
5. Monitor webhook logs for successful processing

