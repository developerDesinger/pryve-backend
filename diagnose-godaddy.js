const nodemailer = require("nodemailer");
require('dotenv').config();

// Diagnostic script to check what's wrong with GoDaddy SMTP
const diagnoseGoDaddy = async () => {
  console.log('🔍 Diagnosing GoDaddy SMTP Issues...\n');

  // Test 1: Check if we can connect to the server
  console.log('📡 Test 1: Checking server connectivity...');
  try {
    const transporter1 = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 587,
      secure: false,
      // No auth - just test connection
    });
    
    await transporter1.verify();
    console.log('✅ Server is reachable');
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    return;
  }

  // Test 2: Check authentication with different methods
  console.log('\n🔐 Test 2: Testing authentication methods...');
  
  const authTests = [
    {
      name: 'Standard Auth (contact@pryvegroup.com)',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
          user: 'contact@pryvegroup.com',
          pass: 'Pryvemvp1!'
        },
        name: 'mail.pryvegroup.com'
      }
    },
    {
      name: 'Without domain name',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
          user: 'contact@pryvegroup.com',
          pass: 'Pryvemvp1!'
        }
      }
    },
    {
      name: 'With different domain (pryvegroup.com)',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
          user: 'contact@pryvegroup.com',
          pass: 'Pryvemvp1!'
        },
        name: 'pryvegroup.com'
      }
    },
    {
      name: 'Port 465 with SSL',
      config: {
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        auth: {
          user: 'contact@pryvegroup.com',
          pass: 'Pryvemvp1!'
        },
        name: 'mail.pryvegroup.com'
      }
    }
  ];

  for (const test of authTests) {
    try {
      console.log(`\n🔄 Testing: ${test.name}`);
      const transporter = nodemailer.createTransport(test.config);
      await transporter.verify();
      console.log(`✅ ${test.name} - SUCCESS!`);
      
      // If successful, try sending a test email
      console.log('📤 Sending test email...');
      const info = await transporter.sendMail({
        to: 'shami.pydevs@gmail.com',
        from: 'contact@pryvegroup.com',
        subject: `Test Email - ${test.name}`,
        html: `<p>This email was sent using: ${test.name}</p>`
      });
      console.log('✅ Test email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      return; // Exit on first success
      
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED:`, error.message);
    }
  }

  // Test 3: Check if it's a password issue
  console.log('\n🔑 Test 3: Password verification suggestions...');
  console.log('💡 Try these steps:');
  console.log('1. Verify password by logging into https://outlook.office365.com');
  console.log('2. Check if account has 2FA enabled (needs app password)');
  console.log('3. Verify SMTP is enabled in GoDaddy dashboard');
  console.log('4. Check if account is suspended or restricted');
  console.log('5. Try different password variations:');
  console.log('   - Pryvemvp1! (current)');
  console.log('   - Pryvemvp1 (without exclamation)');
  console.log('   - Your actual email password');
  console.log('   - App password if 2FA is enabled');

  // Test 4: Check alternative GoDaddy servers
  console.log('\n🌐 Test 4: Testing alternative GoDaddy servers...');
  const alternativeServers = [
    'smtpout.secureserver.net',
    'relay-hosting.secureserver.net',
    'smtp.secureserver.net'
  ];

  for (const server of alternativeServers) {
    try {
      console.log(`\n🔄 Testing server: ${server}`);
      const transporter = nodemailer.createTransport({
        host: server,
        port: 587,
        secure: false,
        auth: {
          user: 'contact@pryvegroup.com',
          pass: 'Pryvemvp1!'
        },
        name: 'mail.pryvegroup.com'
      });
      
      await transporter.verify();
      console.log(`✅ ${server} - Server is reachable and auth works!`);
    } catch (error) {
      console.log(`❌ ${server} - Failed:`, error.message);
    }
  }
};

diagnoseGoDaddy();
