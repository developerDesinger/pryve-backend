# How to Check Email Delivery Status Using Message ID

## Overview

When you send an email, Office365 returns a **Message ID** that you can use to check if the email was delivered. This guide shows you how to check delivery status using the Message ID.

## Quick Start

### Method 1: Using Node.js Script (Easiest)

```bash
node check-email-status.js "<message-id>"
```

**Example:**
```bash
node check-email-status.js "<5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>"
```

This script will provide you with:
- Instructions for checking status via web UI
- PowerShell commands (if you have admin access)
- Status meanings and what to look for

### Method 2: Office365 Message Trace (Web UI)

1. **Go to:** https://admin.exchange.microsoft.com/#/messagetrace
2. **Sign in** with your Office365 admin account
3. **Click "Start a trace"** or use the search box
4. **Enter the Message ID** in the search field
5. **Click Search**
6. **Check the Status column:**
   - ✅ **Delivered** = Email reached recipient (check spam if not in inbox)
   - ❌ **Failed** = Email delivery failed (check error message)
   - ⏳ **Pending** = Still being processed (wait a few minutes)
   - 🚫 **Filtered** = Recipient server filtered it (likely spam)

### Method 3: PowerShell (For Admins)

If you have Exchange Online admin access:

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName your_admin@yourdomain.com

# Check message status
Get-MessageTrace -MessageId "<message-id>" | Format-List
```

Or use the provided PowerShell script:

```powershell
.\check-email-status-powershell.ps1 -MessageId "<message-id>" -AdminEmail "your_admin@yourdomain.com"
```

## Understanding Status Values

| Status | Meaning | Action |
|-------|---------|--------|
| ✅ **Delivered** | Email successfully reached recipient server | Check recipient's inbox and spam folder |
| ❌ **Failed** | Email delivery failed | Check error message for reason |
| ⏳ **Pending** | Email is still being processed | Wait 5-15 minutes and check again |
| 🚫 **Filtered** | Recipient server filtered the email | Likely in spam folder |
| 📤 **Sent** | Email was sent but status unknown | Check recipient's email |

## Example: Checking Status from Logs

When you send an email, you'll see logs like this:

```
✅ [OFFICE365] Email sent successfully
📧 [OFFICE365] Message ID: <5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>
📧 [OFFICE365] Response: 250 2.0.0 OK
```

**To check status, copy the Message ID and run:**

```bash
node check-email-status.js "<5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>"
```

## Programmatic Usage

### In Your Code

The email sending function now returns the message ID:

```javascript
const { sendEmail } = require('./src/api/v1/utils/email');

const result = await sendEmail({
  email: 'user@example.com',
  otp: '123456',
  subject: 'Your OTP Code'
});

// result contains messageId and checkStatusCommand
console.log('Message ID:', result.messageId);
console.log('Check status:', result.checkStatusCommand);
```

### Store Message IDs for Tracking

You can store message IDs in your database to track delivery:

```javascript
// After sending email
const emailLog = await prisma.emailLog.create({
  data: {
    messageId: result.messageId,
    recipientEmail: 'user@example.com',
    status: 'sent',
    sentAt: new Date()
  }
});

// Later, check status
const status = await checkEmailStatus(emailLog.messageId);
```

## Troubleshooting

### Message Trace Not Found

If you can't find the message in trace:

1. **Check date range** - Message trace only keeps data for 7 days
2. **Verify Message ID** - Make sure you copied it correctly
3. **Wait a few minutes** - New messages may take 2-5 minutes to appear

### Status Shows "Delivered" but Email Not Received

If status is "Delivered" but recipient didn't receive:

1. **Check spam/junk folder** - Most common issue
2. **Check all email tabs** - Gmail has Promotions, Social, Updates tabs
3. **Search email** - Search for sender or subject
4. **Check email filters** - Recipient may have filters blocking emails

### Status Shows "Failed"

If status is "Failed":

1. **Check error message** - Click on the message to see details
2. **Common reasons:**
   - Invalid email address
   - Recipient server rejected (spam filter)
   - Recipient mailbox full
   - Domain/IP blocked

## Advanced: Using Microsoft Graph API

For automated status checking, you can use Microsoft Graph API (requires app registration):

1. Register an app in Azure AD
2. Grant Exchange Online admin permissions
3. Use Graph API to query message trace

See `check-email-status.js` for Graph API setup instructions.

## Files Created

- `check-email-status.js` - Node.js script to check status
- `check-email-status-powershell.ps1` - PowerShell script for admins
- `src/api/v1/utils/emailStatus.js` - Utility functions for status checking

## Quick Reference

```bash
# Check status using Message ID
node check-email-status.js "<message-id>"

# Check status using PowerShell (Windows)
.\check-email-status-powershell.ps1 -MessageId "<message-id>"

# Web UI
https://admin.exchange.microsoft.com/#/messagetrace
```

## Tips

1. **Save Message IDs** - Store them when sending emails for later tracking
2. **Check within 7 days** - Message trace only keeps data for 7 days
3. **Wait before checking** - New messages may take 2-5 minutes to appear in trace
4. **Check spam first** - Most "delivered" emails end up in spam folder

