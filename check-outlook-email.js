/**
 * Helper script to check if email was delivered to Outlook mailbox
 * 
 * This provides instructions for checking Outlook Web App
 */

require('dotenv').config();

const checkOutlookMailbox = (messageId, recipientEmail) => {
  console.log('📧 Checking Outlook Mailbox for Email Delivery...\n');
  console.log(`📧 Message ID: ${messageId}`);
  console.log(`📧 Recipient: ${recipientEmail}\n`);

  const cleanMessageId = messageId.replace(/[<>]/g, '');

  console.log('🔍 Step-by-Step Instructions to Check Outlook:\n');

  console.log('1️⃣ CHECK JUNK EMAIL FOLDER (MOST IMPORTANT!)');
  console.log('   - Click on "Junk Email" in the left folder list');
  console.log('   - Look for emails from: contact@pryvegroup.com');
  console.log('   - Look for emails with subject: "Verify Your Email" or "OTP"\n');

  console.log('2️⃣  CHECK "OTHER" TAB');
  console.log('   - Your inbox has "Focused" and "Other" tabs');
  console.log('   - Click on "Other" tab (next to "Focused")');
  console.log('   - New senders often go to "Other" tab\n');

  console.log('3️⃣  SEARCH IN OUTLOOK');
  console.log('   - Click in the search box at the top');
  console.log('   - Search for: from:contact@pryvegroup.com');
  console.log('   - Or search for: pryve');
  console.log('   - Or search for: OTP or verification');
  console.log('   - Make sure to search "All Mail" or "All Folders"\n');

  console.log('4️⃣  CHECK ALL FOLDERS');
  console.log('   - Inbox (both Focused and Other tabs)');
  console.log('   - Junk Email ⚠️  (most likely location!)');
  console.log('   - Archive');
  console.log('   - Deleted Items');
  console.log('   - All Mail (if available)\n');

  console.log('5️⃣  IF EMAIL IS IN JUNK FOLDER:');
  console.log('   - Open the email');
  console.log('   - Click "Not junk" or "Report as not junk"');
  console.log('   - This will move it to Inbox and help future emails\n');

  console.log('6️⃣  CREATE FILTER (Optional):');
  console.log('   - Find the email (even if in Junk)');
  console.log('   - Right-click → "Create rule"');
  console.log('   - Choose: Always move to Inbox, Never send to Junk\n');

  console.log('📋 Quick Search Commands for Outlook:\n');
  console.log('   from:contact@pryvegroup.com');
  console.log('   pryve');
  console.log('   OTP');
  console.log('   verification');
  console.log('   subject:"Verify Your Email"\n');

  console.log('🔍 Verify Delivery Status:\n');
  console.log('   Option 1: Office365 Message Trace (if you have admin access)');
  console.log(`   Go to: https://admin.exchange.microsoft.com/#/messagetrace`);
  console.log(`   Search for Message ID: ${cleanMessageId}`);
  console.log(`   Or search for recipient: ${recipientEmail}\n`);

  console.log('   Option 2: Use PowerShell (if you have admin access)');
  console.log(`   Get-MessageTrace -MessageId "${messageId}" | Format-List\n`);

  console.log('💡 Most Likely Locations:\n');
  console.log('   1. Junk Email folder ⚠️  (check this first!)');
  console.log('   2. Other tab (switch from Focused)');
  console.log('   3. Archive folder');
  console.log('   4. Search results (use search box)\n');

  console.log('📊 Expected Status in Message Trace:\n');
  console.log('   ✅ Delivered = Email reached your mailbox (check Junk/Other)');
  console.log('   ❌ Failed = Delivery failed (check error)');
  console.log('   ⏳ Pending = Still processing (wait a few minutes)');
  console.log('   🚫 Filtered = Email was filtered (likely in Junk)\n');
};

// Main execution
const main = () => {
  const messageId = process.argv[2];
  const recipientEmail = process.argv[3] || 'shuraimk@outlook.com';

  if (!messageId) {
    console.log('❌ Error: Message ID is required\n');
    console.log('Usage:');
    console.log('  node check-outlook-email.js <message-id> [recipient-email]\n');
    console.log('Example:');
    console.log('  node check-outlook-email.js "<5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>" "shuraimk@outlook.com"\n');
    process.exit(1);
  }

  checkOutlookMailbox(messageId, recipientEmail);
};

main();

