/**
 * Email Delivery Status Checker
 * 
 * This utility helps check email delivery status using Message ID
 */

/**
 * Get instructions for checking email delivery status
 * @param {string} messageId - The message ID from email send response
 * @returns {object} Instructions and links for checking status
 */
const getEmailStatusCheckInstructions = (messageId) => {
  const cleanMessageId = messageId.replace(/[<>]/g, '');
  
  return {
    messageId: cleanMessageId,
    methods: {
      webUI: {
        url: 'https://admin.exchange.microsoft.com/#/messagetrace',
        instructions: [
          '1. Go to Office365 Exchange Admin Center',
          '2. Navigate to Mail flow → Message trace',
          `3. Search for Message ID: ${cleanMessageId}`,
          '4. Check the Status column for delivery status'
        ]
      },
      powershell: {
        command: `Get-MessageTrace -MessageId "${messageId}"`,
        instructions: [
          '1. Connect to Exchange Online:',
          '   Connect-ExchangeOnline -UserPrincipalName your_admin@yourdomain.com',
          `2. Run: Get-MessageTrace -MessageId "${messageId}"`,
          '3. Check the Status field in results'
        ]
      },
      nodeScript: {
        command: `node check-email-status.js "${messageId}"`,
        instructions: [
          `Run: node check-email-status.js "${messageId}"`,
          'This will provide detailed instructions for checking status'
        ]
      }
    },
    statusMeanings: {
      'Delivered': '✅ Email was successfully delivered to recipient',
      'Failed': '❌ Email delivery failed - check error message',
      'Pending': '⏳ Email is still being processed',
      'Filtered': '🚫 Email was filtered by recipient server (check spam)',
      'Sent': '📤 Email was sent but delivery status unknown'
    }
  };
};

/**
 * Format message ID for display
 * @param {string} messageId - The message ID
 * @returns {string} Formatted message ID
 */
const formatMessageId = (messageId) => {
  if (!messageId) return 'N/A';
  return messageId.replace(/[<>]/g, '');
};

/**
 * Log email status check instructions
 * @param {string} messageId - The message ID
 * @param {string} recipientEmail - The recipient email address
 */
const logStatusCheckInstructions = (messageId, recipientEmail) => {
  const instructions = getEmailStatusCheckInstructions(messageId);
  
  console.log(`\n📋 [EMAIL STATUS] Delivery Status Check Instructions:`);
  console.log(`   Message ID: ${instructions.messageId}`);
  console.log(`   Recipient: ${recipientEmail}`);
  console.log(`\n   Quick Check:`);
  console.log(`   ${instructions.methods.nodeScript.command}`);
  console.log(`\n   Or visit: ${instructions.methods.webUI.url}`);
  console.log(`   Search for Message ID: ${instructions.messageId}\n`);
};

module.exports = {
  getEmailStatusCheckInstructions,
  formatMessageId,
  logStatusCheckInstructions
};

