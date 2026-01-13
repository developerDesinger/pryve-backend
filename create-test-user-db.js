/**
 * Create Test User Directly in Database
 * Bypasses OTP verification for testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function createTestUserInDB() {
  console.log('🔧 Creating Test User Directly in Database');
  console.log('=' .repeat(60));
  
  try {
    // Test user data
    const testUserData = {
      email: 'speedtest@postman.com',
      password: 'TestPassword123!',
      fullName: 'Speed Test User',
      firstName: 'Speed',
      lastName: 'Test',
      userName: 'speedtest_user'
    };
    
    console.log('📧 Email:', testUserData.email);
    console.log('🔑 Password:', testUserData.password);
    
    // Check if user already exists
    console.log('\n1️⃣ Checking if user exists...');
    const existingUser = await prisma.user.findUnique({
      where: { email: testUserData.email }
    });
    
    let user;
    
    if (existingUser) {
      console.log('✅ User already exists, using existing user');
      user = existingUser;
      
      // Update user to be active if not already
      if (user.status !== 'ACTIVE') {
        console.log('🔄 Activating existing user...');
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            status: 'ACTIVE',
            queryCount: 50 // Give some queries for testing
          }
        });
      }
    } else {
      console.log('👤 Creating new user...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(testUserData.password, 10);
      
      // Create user directly in database (bypassing OTP)
      user = await prisma.user.create({
        data: {
          email: testUserData.email,
          password: hashedPassword,
          fullName: testUserData.fullName,
          firstName: testUserData.firstName,
          lastName: testUserData.lastName,
          userName: testUserData.userName,
          role: 'CLIENT',
          status: 'ACTIVE', // Set as active directly
          loginType: 'EMAIL',
          profilePhoto: 'default-profile.png',
          queryCount: 50, // Give some queries for testing
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ User created successfully!');
    }
    
    console.log('\n2️⃣ Generating JWT Token...');
    
    // Generate JWT token (same as login process)
    const tokenPayload = {
      id: user.id,
      role: user.role
    };
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log('\n🎉 SUCCESS! User and Token Created');
    console.log('=' .repeat(60));
    console.log('👤 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Query Count: ${user.queryCount}`);
    console.log('');
    console.log('🔑 JWT Token:');
    console.log(`   ${token}`);
    console.log('');
    console.log('📋 Login Credentials for Postman:');
    console.log(`   Email: ${testUserData.email}`);
    console.log(`   Password: ${testUserData.password}`);
    console.log('');
    console.log('🚀 Ready to Test!');
    console.log('=' .repeat(60));
    console.log('1. Use this token directly in Postman Authorization header');
    console.log('2. OR use login endpoint with the credentials above');
    console.log('3. Then run the speed optimization tests');
    
    return {
      user,
      token,
      credentials: {
        email: testUserData.email,
        password: testUserData.password
      }
    };
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    if (error.code === 'P2002') {
      console.log('💡 User might already exist with this email');
      console.log('   Try using the login endpoint with existing credentials');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createTestUserInDB()
    .then((result) => {
      console.log('\n✅ Database user creation completed!');
      console.log('🔑 Copy this token for immediate use:');
      console.log(result.token);
    })
    .catch((error) => {
      console.error('❌ Failed to create user:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestUserInDB };