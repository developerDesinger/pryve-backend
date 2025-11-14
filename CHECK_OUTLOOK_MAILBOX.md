# How to Check if Email Was Delivered in Outlook

## Quick Steps to Find Your Email

### Step 1: Check Junk Email Folder ⚠️ MOST IMPORTANT
Based on your screenshot, you have **3 emails in Junk Email** folder. The email might be there!

1. Click on **"Junk Email"** in the left folder list
2. Look for emails from `contact@pryvegroup.com`
3. Look for emails with subject containing "OTP", "Verification", or "Pryve"

### Step 2: Check "Other" Tab
Your inbox has two tabs: "Focused" and "Other"

1. Click on **"Other"** tab (next to "Focused")
2. Emails from new senders often go to "Other" tab
3. Look for your email there

### Step 3: Search for the Email
Use Outlook's search function:

1. Click in the **"Q Search"** box at the top
2. Search for: `from:contact@pryvegroup.com`
3. Or search for: `pryve`
4. Or search for: `OTP` or `verification`
5. Make sure to search in **"All Mail"** or **"All Folders"**

### Step 4: Check All Folders
Check these locations:

- ✅ **Inbox** (both Focused and Other tabs)
- ✅ **Junk Email** (you have 3 emails there!)
- ✅ **Archive**
- ✅ **Deleted Items** (in case it was accidentally deleted)
- ✅ **All Mail** (if available)

### Step 5: Check Email Filters
1. Click on **Settings** (gear icon)
2. Go to **View all Outlook settings**
3. Check **Mail** → **Rules** - see if any rules are moving emails
4. Check **Mail** → **Junk email** - see if sender is blocked

## Using the Message ID to Verify

If you have the Message ID from your logs, you can verify it was delivered:

1. **Search in Outlook:**
   - Use the search box
   - Search for part of the Message ID (e.g., `5ff5771c-006b-1af5`)

2. **Check Office365 Message Trace:**
   - Go to: https://admin.exchange.microsoft.com/#/messagetrace
   - Search for the Message ID
   - This will show if it was delivered to your mailbox

## Most Likely Locations

Based on your screenshot:

1. **Junk Email folder** (3 emails) - Most likely location!
2. **Other tab** - New senders often go here
3. **Archive** - If auto-archived

## If Email is in Junk Email

1. **Open the email**
2. Click **"Not junk"** or **"Report as not junk"**
3. This will:
   - Move it to Inbox
   - Help future emails from this sender go to Inbox
   - Add sender to safe senders list

## Create a Filter to Always Deliver

To ensure future emails go to Inbox:

1. Find the email (even if in Junk)
2. Right-click on it
3. Select **"Create rule"** or **"Always move messages from"**
4. Choose to:
   - Always move to Inbox
   - Never send to Junk
   - Mark as important

## Quick Search Commands

In Outlook search box, try:

```
from:contact@pryvegroup.com
```

```
pryve
```

```
OTP
```

```
verification
```

```
subject:"Verify Your Email"
```

## Check Message Trace (Admin Required)

If you have Office365 admin access:

1. Go to: https://admin.exchange.microsoft.com/#/messagetrace
2. Search for recipient: `shuraimk@outlook.com`
3. Or search for Message ID: `5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com`
4. Check the Status column:
   - **Delivered** = Email reached your mailbox (check Junk/Other)
   - **Failed** = Delivery failed
   - **Pending** = Still processing

## Summary

**Based on your screenshot, check these first:**

1. ✅ **Junk Email folder** (you have 3 emails there!)
2. ✅ **Other tab** (switch from Focused to Other)
3. ✅ **Search** using `from:contact@pryvegroup.com`
4. ✅ **All Mail** view if available

The email is most likely in your **Junk Email folder** since you have 3 emails there and it's not visible in the main inbox!

