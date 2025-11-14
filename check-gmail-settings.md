# How to Check if Gmail is Blocking Your Emails

## Quick Gmail Checks

### 1. Search Gmail for the Email
1. Open Gmail
2. In the search box, type: `from:contact@pryvegroup.com`
3. Press Enter
4. Check **All Mail** (not just Inbox)

### 2. Search for Keywords
Try searching for:
- `pryve`
- `OTP`
- `verification`
- `123456` (if you used test OTP)

### 3. Check All Gmail Tabs
- **Primary** tab
- **Promotions** tab
- **Social** tab
- **Updates** tab
- **Spam** folder

### 4. Check Gmail Settings

#### A. Check Blocked Senders
1. Go to Gmail Settings (gear icon → See all settings)
2. Click **Filters and Blocked Addresses** tab
3. Scroll down to **Blocked addresses**
4. Check if `contact@pryvegroup.com` or `pryvegroup.com` is blocked
5. If blocked, click **Unblock**

#### B. Check Spam Settings
1. Go to Gmail Settings
2. Click **Spam** tab
3. Check if there are any filters that might be blocking emails

#### C. Check Filters
1. Go to Gmail Settings → **Filters and Blocked Addresses**
2. Check if any filters are automatically deleting or archiving emails from `pryvegroup.com`

### 5. Add to Contacts (Recommended)
1. Go to Google Contacts: https://contacts.google.com
2. Click **Create contact**
3. Add:
   - Name: `Pryve`
   - Email: `contact@pryvegroup.com`
4. Save
5. This helps Gmail trust emails from this address

### 6. Check Gmail Security Settings
1. Go to: https://myaccount.google.com/security
2. Check **2-Step Verification** settings
3. Check **Less secure app access** (if applicable)

### 7. Check Gmail Forwarding
1. Go to Gmail Settings → **Forwarding and POP/IMAP**
2. Check if emails are being forwarded elsewhere
3. Check if filters are forwarding emails

## If Email is in Spam

### Mark as Not Spam
1. Find the email in Spam folder
2. Select it
3. Click **Not spam** button
4. Future emails should go to Inbox

### Create Filter to Always Deliver
1. Find the email (even if in Spam)
2. Click the three dots (⋮) → **Filter messages like this**
3. Check **Never send it to Spam**
4. Click **Create filter**

## Gmail Delivery Issues - Common Causes

### 1. New Sender Reputation
- Gmail filters emails from new/unfamiliar senders
- Solution: Add sender to contacts, mark as not spam

### 2. Missing Email Authentication
- SPF, DKIM, or DMARC records not properly configured
- Solution: Configure these in Office365/DNS

### 3. Suspicious Content
- Keywords like "OTP", "verification", "password" can trigger filters
- Solution: Use plain language, avoid spam trigger words

### 4. Low Sender Reputation
- Domain or IP has low reputation
- Solution: Build reputation over time, use dedicated sending domain

### 5. User Complaints
- Previous emails marked as spam
- Solution: Ensure users want to receive emails

## Test if Gmail is the Problem

Send test emails to:
1. **Your Gmail** - Check if it arrives
2. **Outlook/Hotmail** - Check if it arrives
3. **Yahoo** - Check if it arrives
4. **Work email** - Check if it arrives

If emails arrive at other providers but not Gmail, it's a Gmail-specific filtering issue.

## Office365 Message Trace (Most Important)

This shows exactly what happened:

1. Go to: https://admin.exchange.microsoft.com/#/messagetrace
2. Sign in with Office365 admin account
3. Search for recipient email address
4. Check **Status** column:
   - ✅ **Delivered** = Email reached Gmail (check spam)
   - ❌ **Failed** = Gmail rejected it (see error)
   - ⏳ **Pending** = Still processing
   - 🚫 **Filtered** = Gmail filtered it

5. Click on the email to see detailed delivery information

## Still Not Working?

If emails are still not arriving after checking all the above:

1. **Check Office365 Message Trace** - This is the most important step
2. **Try a different email provider** - Test with Outlook, Yahoo, etc.
3. **Check DNS/Email Authentication** - SPF, DKIM, DMARC records
4. **Contact Gmail Support** - If message trace shows Gmail is rejecting
5. **Consider using a transactional email service** - SendGrid, Mailgun, AWS SES for better deliverability

