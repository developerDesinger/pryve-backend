const axios = require('axios');
require('dotenv').config();

/**
 * Check email delivery status using Message ID
 * 
 * Usage:
 *   node check-email-status.js <message-id>
 * 
 * Example:
 *   node check-email-status.js "<5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>"
 */

// Method 1: Using Office365 Message Trace (requires admin access)
// This would require OAuth authentication with Microsoft Graph API
// For now, we'll provide a script that can be used with PowerShell or manual check

const checkEmailStatusByMessageId = async (messageId) => {
  console.log('🔍 Checking Email Delivery Status...\n');
  console.log(`📧 Message ID: ${messageId}\n`);

  // Remove angle brackets if present
  const cleanMessageId = messageId.replace(/[<>]/g, '');

  console.log('📋 Available Methods to Check Delivery Status:\n');

  console.log('1️⃣  Office365 Message Trace (Web UI)');
  console.log('   Go to: https://admin.exchange.microsoft.com/#/messagetrace');
  console.log('   Search for Message ID:', cleanMessageId);
  console.log('   This will show delivery status, bounces, and errors\n');

  console.log('2️⃣  PowerShell Command (if you have Exchange Online access)');
  console.log('   Run this command in PowerShell:');
  console.log(`   Connect-ExchangeOnline -UserPrincipalName your_admin@yourdomain.com`);
  console.log(`   Get-MessageTrace -MessageId "${messageId}" | Format-List\n`);

  console.log('3️⃣  Microsoft Graph API (requires app registration)');
  console.log('   This requires OAuth setup. See setup instructions below.\n');

  // If we have Graph API credentials, try to use them
  if (process.env.MICROSOFT_GRAPH_CLIENT_ID && process.env.MICROSOFT_GRAPH_CLIENT_SECRET) {
    try {
      await checkWithGraphAPI(cleanMessageId);
    } catch (error) {
      console.log('⚠️  Graph API check failed. Using alternative methods.\n');
    }
  } else {
    console.log('💡 To use Graph API, add these to your .env file:');
    console.log('   MICROSOFT_GRAPH_CLIENT_ID=your_client_id');
    console.log('   MICROSOFT_GRAPH_CLIENT_SECRET=your_client_secret');
    console.log('   MICROSOFT_GRAPH_TENANT_ID=your_tenant_id\n');
  }

  // Provide manual check instructions
  console.log('📝 Manual Check Instructions:\n');
  console.log('1. Go to Office365 Admin Center');
  console.log('2. Navigate to Exchange Admin Center');
  console.log('3. Go to Mail flow → Message trace');
  console.log(`4. Search for Message ID: ${cleanMessageId}`);
  console.log('5. Check the Status column for delivery status\n');

  // Outlook-specific instructions
  console.log('📧 Check Your Outlook Mailbox:\n');
  console.log('⚠️  IMPORTANT: Check these locations in Outlook:\n');
  console.log('1. Junk Email folder (most likely location!)');
  console.log('2. "Other" tab (switch from "Focused" tab)');
  console.log('3. Search for: from:contact@pryvegroup.com');
  console.log('4. Search for: pryve or OTP or verification');
  console.log('5. Check Archive and Deleted Items folders\n');
  console.log('💡 Run this for detailed Outlook instructions:');
  console.log(`   node check-outlook-email.js "${messageId}"\n`);

  console.log('📊 Expected Status Values:');
  console.log('   ✅ Delivered - Email was successfully delivered');
  console.log('   ❌ Failed - Email delivery failed (check error message)');
  console.log('   ⏳ Pending - Email is still being processed');
  console.log('   🚫 Filtered - Email was filtered by recipient server');
  console.log('   📤 Sent - Email was sent but delivery status unknown\n');
};

// Method 2: Using Microsoft Graph API (requires app registration)
const checkWithGraphAPI = async (messageId) => {
  console.log('🔐 Attempting to check with Microsoft Graph API...\n');

  const tenantId = process.env.MICROSOFT_GRAPH_TENANT_ID;
  const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Graph API credentials not configured');
  }

  try {
    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // Note: Message trace API requires Exchange Online admin access
    // The Graph API doesn't have a direct message trace endpoint
    // You would need to use Exchange Online PowerShell or EWS
    
    console.log('✅ Graph API authentication successful');
    console.log('⚠️  Note: Message trace requires Exchange Online admin access');
    console.log('   Use PowerShell or Exchange Admin Center for message trace\n');

  } catch (error) {
    console.error('❌ Graph API authentication failed:', error.message);
    throw error;
  }
};

// Method 3: Store and check message IDs from database
const checkStoredMessageId = async (messageId) => {
  // This would check if we stored the message ID in our database
  // and provide status if we're tracking it
  console.log('💾 Checking stored message ID in database...\n');
  
  // TODO: Implement database check if you're storing message IDs
  // const prisma = require('./src/lib/prisma');
  // const emailLog = await prisma.emailLog.findUnique({
  //   where: { messageId: cleanMessageId }
  // });
  
  console.log('💡 Tip: Store message IDs when sending emails to track delivery\n');
};

// Main execution
const main = async () => {
  const messageId = process.argv[2];

  if (!messageId) {
    console.log('❌ Error: Message ID is required\n');
    console.log('Usage:');
    console.log('  node check-email-status.js <message-id>\n');
    console.log('Example:');
    console.log('  node check-email-status.js "<5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>"\n');
    console.log('Or without angle brackets:');
    console.log('  node check-email-status.js "5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com"\n');
    process.exit(1);
  }

  await checkEmailStatusByMessageId(messageId);
  await checkStoredMessageId(messageId);
};

main().catch(console.error);

