# Email Delivery Troubleshooting Guide

## Current Status
✅ Office365 is accepting emails successfully (250 OK response)
❌ Emails are not arriving at Gmail inbox

## Critical Issue: Email Address Typo
**Your email address in logs:** `deisgnercoo@gmail.com`
**Possible correct address:** `designercoo@gmail.com`

**Please verify the email address is correct!**

## Step-by-Step Troubleshooting

### 1. Verify Email Address
- Double-check the email address you're using
- Look for typos in the domain (gmail.com, not gmail.co or gmial.com)
- Check the username part of the email

### 2. Check Spam/Junk Folder
- Gmail often filters emails from new senders
- Check your **Spam** folder
- Check **All Mail** folder
- Check **Promotions** tab (if using Gmail tabs)

### 3. Check Office365 Message Trace (MOST IMPORTANT)

This will tell you exactly what happened to your email:

1. **Log into Office365 Admin Center**
   - Go to https://admin.microsoft.com
   - Sign in with your Office365 admin account

2. **Navigate to Exchange Admin Center**
   - Click on **Admin centers** → **Exchange**
   - Or go directly to: https://admin.exchange.microsoft.com

3. **Open Message Trace**
   - In the left menu, go to **Mail flow** → **Message trace**
   - Or use: https://admin.exchange.microsoft.com/#/messagetrace

4. **Search for Your Email**
   - Enter the recipient email: `deisgnercoo@gmail.com`
   - Select date range (last 7 days)
   - Click **Search**

5. **Check Delivery Status**
   - Look for your email in the results
   - Check the **Status** column:
     - ✅ **Delivered** = Email reached Gmail (check spam folder)
     - ❌ **Failed** = Gmail rejected it (check reason)
     - ⏳ **Pending** = Still being processed
     - 🚫 **Filtered** = Gmail filtered it

6. **Check Delivery Details**
   - Click on the email to see detailed information
   - Look for error messages or rejection reasons
   - Check if Gmail provided a bounce message

### 4. Check Gmail Settings

1. **Check Blocked Senders**
   - Go to Gmail Settings → Filters and Blocked Addresses
   - Check if `contact@pryvegroup.com` is blocked

2. **Check Spam Settings**
   - Go to Gmail Settings → Spam
   - Check if emails are being automatically filtered

3. **Search Gmail**
   - Search for: `from:contact@pryvegroup.com`
   - Search for: `pryve`
   - Search for: `OTP` or `verification`

### 5. Test with Different Email Address

Try sending to a different email provider:
- Outlook.com
- Yahoo.com
- Another Gmail account
- Your work email

This will help determine if it's a Gmail-specific issue.

### 6. Check Office365 Sending Limits

1. **Check Account Status**
   - Go to Office365 Admin Center → Users → Active users
   - Find `contact@pryvegroup.com`
   - Check if account is restricted or has sending limits

2. **Check Sending Limits**
   - Office365 typically allows 10,000 emails per day
   - Check if you've exceeded limits

### 7. Wait for Delivery

- Some emails can take 5-15 minutes to arrive
- Office365 may queue emails during high traffic
- Wait at least 15 minutes before assuming it failed

## Common Gmail Filtering Reasons

Gmail may filter emails if:
1. **New Sender** - Gmail filters emails from senders you haven't interacted with
2. **No SPF/DKIM/DMARC** - Missing email authentication records
3. **Suspicious Content** - Keywords like "OTP", "verification" can trigger filters
4. **Low Reputation** - New domain or sending account has low reputation
5. **User Complaints** - Previous emails marked as spam

## Solutions

### Immediate Actions:
1. ✅ **Verify email address is correct** (check for typos)
2. ✅ **Check spam folder thoroughly**
3. ✅ **Check Office365 message trace** (most important!)
4. ✅ **Wait 15 minutes** and check again
5. ✅ **Try a different email address**

### Long-term Solutions:
1. **Set up SPF Record** (if not already done)
   - Add to DNS: `v=spf1 include:spf.protection.outlook.com ~all`

2. **Set up DKIM** (if not already done)
   - Configure in Office365 admin center

3. **Set up DMARC** (if not already done)
   - Add to DNS: `v=DMARC1; p=none; rua=mailto:contact@pryvegroup.com`

4. **Warm up the sending domain**
   - Send regular emails to build reputation
   - Start with small volumes and increase gradually

5. **Use a dedicated sending domain**
   - Consider using a subdomain like `noreply@pryvegroup.com` or `mail@pryvegroup.com`

## Quick Test Commands

```bash
# Test email sending
node diagnose-email-delivery.js your-email@gmail.com

# Test with correct email (if typo was the issue)
node diagnose-email-delivery.js designercoo@gmail.com
```

## Next Steps

1. **First Priority:** Check Office365 message trace to see delivery status
2. **Second Priority:** Verify email address is correct (no typos)
3. **Third Priority:** Check spam folder and wait 15 minutes
4. **Fourth Priority:** Try sending to a different email address

## Need Help?

If emails are still not arriving after checking all the above:
1. Share the Office365 message trace results
2. Confirm the correct email address
3. Try sending to a different email provider to isolate the issue

