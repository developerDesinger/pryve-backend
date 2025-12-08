# Social Login Email & Provider Scenarios

## Overview

This document describes the enhanced social login functionality that allows:
1. Apple login with email on first login, then only providerId on subsequent logins
2. EMAIL users (traditional email/password) to add social provider credentials
3. Proper handling of empty/null emails from Apple

## Key Changes

### 1. EMAIL Users Can Add Social Provider Credentials

**Previous Behavior:** EMAIL users were blocked from logging in with social providers.

**New Behavior:** EMAIL users can now add social provider credentials (providerId) to their account while keeping their EMAIL loginType.

**Benefits:**
- Users can login with either email/password OR social provider
- Account remains linked to email
- Password is preserved
- loginType stays as EMAIL

### 2. Apple Login Email Handling

Apple Sign-In behavior:
- **First Login:** Provides email + providerId
- **Subsequent Logins:** Only provides providerId (email is null/empty due to privacy)

The system handles both scenarios:
- First login: Creates/finds user by email, stores providerId
- Subsequent logins: Finds user by providerId, uses existing email

## Test Scenarios

### Category 11: Apple Login Scenarios (Email Handling)

#### TC-SL-040: Apple First Login with Email and ProviderId
- **Scenario:** User logs in with Apple for the first time
- **Input:** `{ provider: 'APPLE', providerId: 'xxx', email: 'user@icloud.com' }`
- **Expected:** User created with email and providerId, loginType = APPLE

#### TC-SL-041: Apple Second Login with Only ProviderId
- **Scenario:** User logs in with Apple again (Apple doesn't provide email)
- **Input:** `{ provider: 'APPLE', providerId: 'xxx', email: null }`
- **Expected:** Existing user found by providerId, email remains from first login

#### TC-SL-042: Apple Login with Empty Email String
- **Scenario:** Apple provides empty string for email
- **Input:** `{ provider: 'APPLE', providerId: 'xxx', email: '' }`
- **Expected:** Email generated as `{providerId}@social.local`

#### TC-SL-043: Apple Login with Null Email
- **Scenario:** Apple provides null for email
- **Input:** `{ provider: 'APPLE', providerId: 'xxx', email: null }`
- **Expected:** Email generated as `{providerId}@social.local`

### Category 12: EMAIL User Adding Social Provider Credentials

#### TC-SL-044: EMAIL User Adds Apple Provider Credentials
- **Scenario:** User registered with email/password, now logs in with Apple
- **Setup:** User exists with `loginType: 'EMAIL'`, `providerId: null`
- **Input:** `{ provider: 'APPLE', providerId: 'xxx', email: 'user@example.com' }`
- **Expected:**
  - Same user returned
  - `loginType` remains `EMAIL` (not changed to APPLE)
  - `providerId` added/updated
  - Password preserved
  - User can now login with either email/password OR Apple

#### TC-SL-045: EMAIL User Adds Google Provider Credentials
- **Scenario:** EMAIL user adds Google credentials
- **Expected:** Same behavior as TC-SL-044 but with Google

#### TC-SL-046: EMAIL User Adds Facebook Provider Credentials
- **Scenario:** EMAIL user adds Facebook credentials
- **Expected:** Same behavior as TC-SL-044 but with Facebook

#### TC-SL-047: EMAIL User Adds Multiple Social Providers
- **Scenario:** EMAIL user adds Apple, then Google
- **Expected:**
  - First login with Apple: providerId set to Apple's providerId
  - Second login with Google: providerId updated to Google's providerId
  - loginType always remains EMAIL

#### TC-SL-048: EMAIL User Switches Social Provider
- **Scenario:** EMAIL user already has Apple, logs in with Google
- **Expected:** providerId updated to Google, loginType remains EMAIL

## Implementation Details

### Code Changes

1. **Removed Block on EMAIL Users:**
   ```javascript
   // OLD: Blocked EMAIL users from social login
   if (user.loginType === 'EMAIL' && provider !== 'EMAIL') {
     throw new AppError(...);
   }
   
   // NEW: Allows EMAIL users to add social credentials
   if (user.loginType === 'EMAIL' && provider !== 'EMAIL') {
     // Continue - providerId will be added
   }
   ```

2. **Preserve EMAIL loginType:**
   ```javascript
   // When updating loginType, keep EMAIL if user has EMAIL loginType
   if (user.loginType === 'EMAIL') {
     // Don't update loginType - keep it as EMAIL
   } else {
     // Update loginType for social provider switching
     updateData.loginType = provider;
   }
   ```

### User Flow Examples

#### Example 1: Traditional User Adds Apple
```
1. User registers: email = "user@example.com", loginType = EMAIL
2. User logs in with Apple: email = "user@example.com", providerId = "apple123"
3. Result: loginType = EMAIL, providerId = "apple123"
4. User can now login with:
   - Email/password (traditional)
   - Apple Sign-In (social)
```

#### Example 2: Apple First Login
```
1. User logs in with Apple: email = "user@icloud.com", providerId = "apple123"
2. Result: User created, loginType = APPLE, email = "user@icloud.com"
```

#### Example 3: Apple Subsequent Login
```
1. User logs in with Apple again: email = null, providerId = "apple123"
2. System finds user by providerId
3. Result: Same user, email remains "user@icloud.com"
```

## Testing

Run the test suite:

```bash
node test-social-login.js
```

The test suite now includes:
- **29 original tests** (Categories 1-10)
- **9 new tests** (Categories 11-12)
- **Total: 38 tests**

## Benefits

1. **Flexibility:** Users can use multiple login methods
2. **Account Linking:** Social providers linked to existing email accounts
3. **Privacy:** Handles Apple's privacy features (empty email on subsequent logins)
4. **Backward Compatibility:** Existing EMAIL users can add social login without losing access
5. **Security:** Password preserved, loginType indicates original registration method

## Migration Notes

- Existing EMAIL users can immediately start using social login
- No database migration required
- Existing social login users unaffected
- All existing tests continue to pass

