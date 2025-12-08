require('dotenv').config();
const UserService = require('./src/api/v1/services/user.service');
const prisma = require('./src/lib/prisma');
const AppError = require('./src/api/v1/utils/AppError');
const HttpStatusCodes = require('./src/api/v1/enums/httpStatusCode');

// Test metadata for logging
const testMetadata = {
  ipAddress: '127.0.0.1',
  userAgent: 'Test-Agent/1.0',
};

// Helper function to create test user
async function createTestUser(userData) {
  return await prisma.user.create({
    data: {
      email: userData.email || `test_${Date.now()}@example.com`,
      password: userData.password || null,
      loginType: userData.loginType || 'EMAIL',
      providerId: userData.providerId || null,
      userName: userData.userName || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profilePhoto: userData.profilePhoto || 'default-profile.png',
      role: userData.role || 'CLIENT',
      status: userData.status || 'ACTIVE',
      isDeleted: userData.isDeleted || false,
      queryCount: userData.queryCount || 20,
    },
  });
}

// Helper function to delete test user
async function deleteTestUser(userId) {
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    // User might already be deleted
    console.log(`⚠️ Could not delete user ${userId}:`, error.message);
  }
}

// Helper function to cleanup test users
async function cleanupTestUsers(userIds) {
  for (const userId of userIds) {
    await deleteTestUser(userId);
  }
}

// Test result tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  failures: [],
};

// Test runner helper
async function runTest(testName, testFn) {
  testResults.total++;
  process.stdout.write(`\n🧪 ${testName}... `);
  
  try {
    await testFn();
    testResults.passed++;
    console.log('✅ PASSED');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.failures.push({ test: testName, error: error.message });
    console.log(`❌ FAILED: ${error.message}`);
    return false;
  }
}

// ============================================================================
// CATEGORY 1: INPUT VALIDATION TESTS
// ============================================================================

async function testInputValidation() {
  console.log('\n📋 CATEGORY 1: INPUT VALIDATION TESTS');
  console.log('='.repeat(60));

  // TC-SL-001: Missing provider
  await runTest('TC-SL-001: Missing provider', async () => {
    try {
      await UserService.socialLogin({
        providerId: 'test123',
        email: 'test@example.com',
      }, testMetadata);
      throw new Error('Should have thrown error for missing provider');
    } catch (error) {
      if (error.message.includes('provider') && error.message.includes('required')) {
        return; // Expected error
      }
      throw error;
    }
  });

  // TC-SL-002: Missing providerId
  await runTest('TC-SL-002: Missing providerId', async () => {
    try {
      await UserService.socialLogin({
        provider: 'GOOGLE',
        email: 'test@example.com',
      }, testMetadata);
      throw new Error('Should have thrown error for missing providerId');
    } catch (error) {
      if (error.message.includes('providerId') && error.message.includes('required')) {
        return; // Expected error
      }
      throw error;
    }
  });

  // TC-SL-003: Empty strings handling
  await runTest('TC-SL-003: Empty strings vs null', async () => {
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `test_${Date.now()}`,
      email: '',
      userName: '',
    }, testMetadata);
    
    if (!result.success) {
      throw new Error('Login should succeed with empty strings');
    }
    if (result.user.userName !== null && result.user.userName !== '') {
      throw new Error('Empty userName should be converted to null');
    }
  });
}

// ============================================================================
// CATEGORY 2: NEW USER CREATION (HAPPY PATH)
// ============================================================================

async function testNewUserCreation() {
  console.log('\n📋 CATEGORY 2: NEW USER CREATION (HAPPY PATH)');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-005: Create user with Google (complete data)
  await runTest('TC-SL-005: Create Google user with complete data', async () => {
    const providerId = `google_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
      email: `test_${Date.now()}@gmail.com`,
      userName: 'JohnDoe',
      firstName: 'John',
      lastName: 'Doe',
      profilePhoto: 'https://photo.jpg',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'GOOGLE') throw new Error('LoginType should be GOOGLE');
    if (result.user.status !== 'ACTIVE') throw new Error('Status should be ACTIVE');
    if (result.user.queryCount !== 20) throw new Error('QueryCount should be 20');
    if (!result.token) throw new Error('Token should be returned');
    if (!result.paymentData) throw new Error('PaymentData should be returned');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-006: Create user with Apple (complete data)
  await runTest('TC-SL-006: Create Apple user with complete data', async () => {
    const providerId = `apple_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email: `test_${Date.now()}@icloud.com`,
      userName: 'JaneSmith',
      firstName: 'Jane',
      lastName: 'Smith',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'APPLE') throw new Error('LoginType should be APPLE');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-007: Create user with Facebook
  await runTest('TC-SL-007: Create Facebook user', async () => {
    const providerId = `fb_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'FACEBOOK',
      providerId,
      email: `test_${Date.now()}@facebook.com`,
      userName: 'fbuser',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'FACEBOOK') throw new Error('LoginType should be FACEBOOK');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-008: Create user without email
  await runTest('TC-SL-008: Create user without email (Apple privacy)', async () => {
    const providerId = `apple_noemail_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email: null,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (!result.user.email.includes('@social.local')) {
      throw new Error('Email should be generated from providerId');
    }
    if (result.user.email !== `${providerId}@social.local`) {
      throw new Error('Generated email format incorrect');
    }

    createdUserIds.push(result.user.id);
  });

  // TC-SL-009: Create user without userName
  await runTest('TC-SL-009: Create user without userName', async () => {
    const providerId = `google_nousername_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
      email: `test_${Date.now()}@gmail.com`,
      userName: null,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.userName !== null) {
      throw new Error('UserName should be null, not empty string');
    }

    createdUserIds.push(result.user.id);
  });

  // TC-SL-010: Create user with minimal data
  await runTest('TC-SL-010: Create user with minimal data (only required fields)', async () => {
    const providerId = `minimal_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (!result.user.email) throw new Error('Email should be generated');

    createdUserIds.push(result.user.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 3: EXISTING USER LOGIN (HAPPY PATH)
// ============================================================================

async function testExistingUserLogin() {
  console.log('\n📋 CATEGORY 3: EXISTING USER LOGIN (HAPPY PATH)');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-011: Login existing user by email
  await runTest('TC-SL-011: Login existing user by email', async () => {
    const testUser = await createTestUser({
      email: `test_email_${Date.now()}@gmail.com`,
      loginType: 'GOOGLE',
      providerId: `google_existing_${Date.now()}`,
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: testUser.providerId,
      email: testUser.email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== testUser.id) throw new Error('Should return existing user');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-012: Login existing user by providerId
  await runTest('TC-SL-012: Login existing user by providerId', async () => {
    const providerId = `providerid_${Date.now()}`;
    const testUser = await createTestUser({
      loginType: 'GOOGLE',
      providerId,
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== testUser.id) throw new Error('Should return existing user');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-013: Login and update profile info
  await runTest('TC-SL-013: Login and update profile info', async () => {
    const testUser = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `update_${Date.now()}`,
      firstName: 'OldName',
      profilePhoto: 'old-photo.jpg',
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: testUser.providerId,
      firstName: 'NewName',
      profilePhoto: 'new-photo.jpg',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.firstName !== 'NewName') throw new Error('FirstName should be updated');
    if (result.user.profilePhoto !== 'new-photo.jpg') throw new Error('ProfilePhoto should be updated');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-014: Login with same data (no updates)
  await runTest('TC-SL-014: Login with same data (no updates)', async () => {
    const testUser = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `same_${Date.now()}`,
      firstName: 'John',
      lastName: 'Doe',
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: testUser.providerId,
      firstName: 'John',
      lastName: 'Doe',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== testUser.id) throw new Error('Should return existing user');

    createdUserIds.push(testUser.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 4: EMAIL USER SCENARIOS
// ============================================================================

async function testEmailConflicts() {
  console.log('\n📋 CATEGORY 4: EMAIL USER SCENARIOS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-015: EMAIL user can add social provider credentials (no conflict)
  await runTest('TC-SL-015: EMAIL user can add social provider credentials', async () => {
    const email = `email_add_social_${Date.now()}@example.com`;
    const testUser = await createTestUser({
      email,
      loginType: 'EMAIL',
      providerId: null,
    });

    // EMAIL user should be able to login with social provider
    const providerId = `google_add_social_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
      email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== testUser.id) throw new Error('Should return same user');
    if (result.user.loginType !== 'EMAIL') throw new Error('LoginType should remain EMAIL');
    if (result.user.providerId !== providerId) throw new Error('ProviderId should be added');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-016: Email exists with same provider
  await runTest('TC-SL-016: Email exists with same provider', async () => {
    const email = `same_provider_${Date.now()}@gmail.com`;
    const providerId = `google_same_${Date.now()}`;
    const testUser = await createTestUser({
      email,
      loginType: 'GOOGLE',
      providerId,
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
      email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== testUser.id) throw new Error('Should return existing user');

    createdUserIds.push(testUser.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 5: PROVIDERID CONFLICT SCENARIOS
// ============================================================================

async function testProviderIdConflicts() {
  console.log('\n📋 CATEGORY 5: PROVIDERID CONFLICT SCENARIOS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-018: ProviderId belongs to different user
  await runTest('TC-SL-018: ProviderId belongs to different user', async () => {
    const providerId = `switch_${Date.now()}`;
    const userA = await createTestUser({
      email: `usera_${Date.now()}@gmail.com`,
      loginType: 'GOOGLE',
      providerId: null,
    });
    const userB = await createTestUser({
      loginType: 'GOOGLE',
      providerId,
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
      email: userA.email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== userB.id) {
      throw new Error('Should switch to user with matching providerId');
    }

    createdUserIds.push(userA.id, userB.id);
  });

  // TC-SL-019: ProviderId update for existing user
  await runTest('TC-SL-019: ProviderId update for existing user', async () => {
    const testUser = await createTestUser({
      email: `noprovider_${Date.now()}@gmail.com`,
      loginType: 'GOOGLE',
      providerId: null,
    });

    const newProviderId = `new_provider_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: newProviderId,
      email: testUser.email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.providerId !== newProviderId) {
      throw new Error('ProviderId should be updated');
    }

    createdUserIds.push(testUser.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 6: ACCOUNT STATUS SCENARIOS
// ============================================================================

async function testAccountStatus() {
  console.log('\n📋 CATEGORY 6: ACCOUNT STATUS SCENARIOS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-021: Login with inactive account
  await runTest('TC-SL-021: Login with inactive account', async () => {
    const testUser = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `inactive_${Date.now()}`,
      status: 'INACTIVE',
    });

    try {
      await UserService.socialLogin({
        provider: 'GOOGLE',
        providerId: testUser.providerId,
      }, testMetadata);
      throw new Error('Should have thrown unauthorized error');
    } catch (error) {
      if (error.statusCode === HttpStatusCodes.UNAUTHORIZED) {
        if (!error.message.includes('inactive')) {
          throw new Error('Error message should mention inactive account');
        }
        return; // Expected error
      }
      throw error;
    } finally {
      createdUserIds.push(testUser.id);
    }
  });

  // TC-SL-022: Login with deleted account
  await runTest('TC-SL-022: Login with deleted account', async () => {
    const testUser = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `deleted_${Date.now()}`,
      isDeleted: true,
    });

    try {
      await UserService.socialLogin({
        provider: 'GOOGLE',
        providerId: testUser.providerId,
      }, testMetadata);
      throw new Error('Should have thrown unauthorized error');
    } catch (error) {
      if (error.statusCode === HttpStatusCodes.UNAUTHORIZED) {
        if (!error.message.includes('deleted')) {
          throw new Error('Error message should mention deleted account');
        }
        return; // Expected error
      }
      throw error;
    } finally {
      createdUserIds.push(testUser.id);
    }
  });

  // TC-SL-023: Login with active account
  await runTest('TC-SL-023: Login with active account', async () => {
    const testUser = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `active_${Date.now()}`,
      status: 'ACTIVE',
      isDeleted: false,
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: testUser.providerId,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.status !== 'ACTIVE') throw new Error('Status should be ACTIVE');

    createdUserIds.push(testUser.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 7: PROVIDER SWITCHING SCENARIOS
// ============================================================================

async function testProviderSwitching() {
  console.log('\n📋 CATEGORY 7: PROVIDER SWITCHING SCENARIOS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-024: Switch from Google to Apple
  await runTest('TC-SL-024: Switch from Google to Apple', async () => {
    const testUser = await createTestUser({
      email: `switch_${Date.now()}@gmail.com`,
      loginType: 'GOOGLE',
      providerId: `google_switch_${Date.now()}`,
    });

    const appleProviderId = `apple_switch_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId: appleProviderId,
      email: testUser.email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'APPLE') throw new Error('LoginType should be updated to APPLE');
    if (result.user.providerId !== appleProviderId) throw new Error('ProviderId should be updated');

    createdUserIds.push(testUser.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 8: USERNAME SCENARIOS (AFTER REMOVING UNIQUE CONSTRAINT)
// ============================================================================

async function testUserNameScenarios() {
  console.log('\n📋 CATEGORY 8: USERNAME SCENARIOS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-026: Multiple users with same userName
  await runTest('TC-SL-026: Multiple users with same userName', async () => {
    const userName = `shared_${Date.now()}`;
    const user1 = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `user1_${Date.now()}`,
      userName,
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `user2_${Date.now()}`,
      userName,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.userName !== userName) throw new Error('UserName should be set');
    if (result.user.id === user1.id) throw new Error('Should create new user, not reuse existing');

    createdUserIds.push(user1.id, result.user.id);
  });

  // TC-SL-027: Update userName to existing value
  await runTest('TC-SL-027: Update userName to existing value', async () => {
    const userName = `update_${Date.now()}`;
    const user1 = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `user1_update_${Date.now()}`,
      userName,
    });

    const user2 = await createTestUser({
      loginType: 'GOOGLE',
      providerId: `user2_update_${Date.now()}`,
      userName: 'DifferentName',
    });

    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: user2.providerId,
      userName,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.userName !== userName) throw new Error('UserName should be updated');

    createdUserIds.push(user1.id, user2.id);
  });

  // TC-SL-028: Empty userName handling
  await runTest('TC-SL-028: Empty userName handling', async () => {
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `empty_username_${Date.now()}`,
      userName: '',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.userName !== null) {
      throw new Error('Empty userName should be converted to null');
    }

    createdUserIds.push(result.user.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 9: EDGE CASES AND RACE CONDITIONS
// ============================================================================

async function testEdgeCases() {
  console.log('\n📋 CATEGORY 9: EDGE CASES AND RACE CONDITIONS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-030: Special characters in userName
  await runTest('TC-SL-030: Special characters in userName', async () => {
    const userName = `John@123!$%_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `special_${Date.now()}`,
      userName,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.userName !== userName) throw new Error('UserName with special chars should be stored');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-032: Unicode characters in userName
  await runTest('TC-SL-032: Unicode characters in userName', async () => {
    const userName = `조니_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `unicode_${Date.now()}`,
      userName,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.userName !== userName) throw new Error('Unicode userName should be stored correctly');

    createdUserIds.push(result.user.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 10: RESPONSE VALIDATION
// ============================================================================

async function testResponseValidation() {
  console.log('\n📋 CATEGORY 10: RESPONSE VALIDATION');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-033: Response structure validation
  await runTest('TC-SL-033: Response structure validation', async () => {
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `response_${Date.now()}`,
      email: `test_${Date.now()}@gmail.com`,
    }, testMetadata);

    if (!result.success) throw new Error('Success should be true');
    if (!result.message) throw new Error('Message should be present');
    if (!result.user) throw new Error('User object should be present');
    if (!result.token) throw new Error('Token should be present');
    if (!result.paymentData) throw new Error('PaymentData should be present');

    // Validate user object structure
    if (!result.user.id) throw new Error('User should have id');
    if (!result.user.email) throw new Error('User should have email');
    if (result.user.status !== 'ACTIVE') throw new Error('User should have ACTIVE status');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-034: JWT token validation
  await runTest('TC-SL-034: JWT token validation', async () => {
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `token_${Date.now()}`,
    }, testMetadata);

    if (!result.token) throw new Error('Token should be returned');
    if (typeof result.token !== 'string') throw new Error('Token should be a string');
    if (result.token.split('.').length !== 3) {
      throw new Error('Token should be a valid JWT (3 parts separated by dots)');
    }

    createdUserIds.push(result.user.id);
  });

  // TC-SL-035: Payment data included
  await runTest('TC-SL-035: Payment data included', async () => {
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: `payment_${Date.now()}`,
    }, testMetadata);

    if (!result.paymentData) throw new Error('PaymentData should be present');
    if (typeof result.paymentData.hasActiveSubscription !== 'boolean') {
      throw new Error('PaymentData should have hasActiveSubscription boolean');
    }

    createdUserIds.push(result.user.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 11: APPLE LOGIN SCENARIOS (EMAIL HANDLING)
// ============================================================================

async function testAppleLoginScenarios() {
  console.log('\n📋 CATEGORY 11: APPLE LOGIN SCENARIOS (EMAIL HANDLING)');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-040: Apple first login with email and providerId
  await runTest('TC-SL-040: Apple first login with email and providerId', async () => {
    const email = `apple_first_${Date.now()}@icloud.com`;
    const providerId = `apple_first_${Date.now()}`;
    
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email,
      firstName: 'John',
      lastName: 'Apple',
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.email !== email) throw new Error('Email should match');
    if (result.user.providerId !== providerId) throw new Error('ProviderId should match');
    if (result.user.loginType !== 'APPLE') throw new Error('LoginType should be APPLE');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-041: Apple second login with only providerId (no email)
  await runTest('TC-SL-041: Apple second login with only providerId (no email)', async () => {
    // First login with email
    const email = `apple_second_${Date.now()}@icloud.com`;
    const providerId = `apple_second_${Date.now()}`;
    
    const firstLogin = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email,
    }, testMetadata);

    if (!firstLogin.success) throw new Error('First login should succeed');

    // Second login with only providerId (Apple privacy - no email)
    const secondLogin = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email: null, // Apple doesn't provide email on subsequent logins
    }, testMetadata);

    if (!secondLogin.success) throw new Error('Second login should succeed');
    if (secondLogin.user.id !== firstLogin.user.id) throw new Error('Should return same user');
    if (secondLogin.user.email !== email) throw new Error('Email should remain from first login');
    if (secondLogin.user.providerId !== providerId) throw new Error('ProviderId should match');

    createdUserIds.push(firstLogin.user.id);
  });

  // TC-SL-042: Apple login with empty email string
  await runTest('TC-SL-042: Apple login with empty email string', async () => {
    const providerId = `apple_empty_email_${Date.now()}`;
    
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email: '', // Empty string
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (!result.user.email.includes('@social.local')) {
      throw new Error('Email should be generated from providerId');
    }
    if (result.user.providerId !== providerId) throw new Error('ProviderId should match');

    createdUserIds.push(result.user.id);
  });

  // TC-SL-043: Apple login with null email
  await runTest('TC-SL-043: Apple login with null email', async () => {
    const providerId = `apple_null_email_${Date.now()}`;
    
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email: null, // Null email
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (!result.user.email.includes('@social.local')) {
      throw new Error('Email should be generated from providerId');
    }

    createdUserIds.push(result.user.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// CATEGORY 12: EMAIL USER ADDING SOCIAL PROVIDER CREDENTIALS
// ============================================================================

async function testEmailUserAddingSocialProvider() {
  console.log('\n📋 CATEGORY 12: EMAIL USER ADDING SOCIAL PROVIDER CREDENTIALS');
  console.log('='.repeat(60));

  let createdUserIds = [];

  // TC-SL-044: EMAIL user adds Apple provider credentials
  await runTest('TC-SL-044: EMAIL user adds Apple provider credentials', async () => {
    // Create user with EMAIL loginType
    const email = `email_user_${Date.now()}@example.com`;
    const testUser = await createTestUser({
      email,
      loginType: 'EMAIL',
      password: '$2b$10$test', // Hashed password
      providerId: null, // No providerId initially
    });

    // User logs in with Apple
    const providerId = `apple_for_email_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'APPLE',
      providerId,
      email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.id !== testUser.id) throw new Error('Should return same user');
    if (result.user.email !== email) throw new Error('Email should remain same');
    if (result.user.loginType !== 'EMAIL') {
      throw new Error('LoginType should remain EMAIL (not changed to APPLE)');
    }
    if (result.user.providerId !== providerId) {
      throw new Error('ProviderId should be added');
    }
    if (!result.user.password) throw new Error('Password should remain (not deleted)');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-045: EMAIL user adds Google provider credentials
  await runTest('TC-SL-045: EMAIL user adds Google provider credentials', async () => {
    const email = `email_google_${Date.now()}@example.com`;
    const testUser = await createTestUser({
      email,
      loginType: 'EMAIL',
      password: '$2b$10$test',
      providerId: null,
    });

    const providerId = `google_for_email_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId,
      email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'EMAIL') throw new Error('LoginType should remain EMAIL');
    if (result.user.providerId !== providerId) throw new Error('ProviderId should be added');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-046: EMAIL user adds Facebook provider credentials
  await runTest('TC-SL-046: EMAIL user adds Facebook provider credentials', async () => {
    const email = `email_fb_${Date.now()}@example.com`;
    const testUser = await createTestUser({
      email,
      loginType: 'EMAIL',
      password: '$2b$10$test',
      providerId: null,
    });

    const providerId = `fb_for_email_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'FACEBOOK',
      providerId,
      email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'EMAIL') throw new Error('LoginType should remain EMAIL');
    if (result.user.providerId !== providerId) throw new Error('ProviderId should be added');

    createdUserIds.push(testUser.id);
  });

  // TC-SL-047: EMAIL user adds multiple social providers (Apple then Google)
  await runTest('TC-SL-047: EMAIL user adds multiple social providers', async () => {
    const email = `email_multi_${Date.now()}@example.com`;
    const testUser = await createTestUser({
      email,
      loginType: 'EMAIL',
      password: '$2b$10$test',
      providerId: null,
    });

    // Add Apple
    const appleProviderId = `apple_multi_${Date.now()}`;
    const appleResult = await UserService.socialLogin({
      provider: 'APPLE',
      providerId: appleProviderId,
      email,
    }, testMetadata);

    if (appleResult.user.providerId !== appleProviderId) throw new Error('Apple providerId should be added');

    // Add Google (should update providerId)
    const googleProviderId = `google_multi_${Date.now()}`;
    const googleResult = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: googleProviderId,
      email,
    }, testMetadata);

    if (googleResult.user.loginType !== 'EMAIL') throw new Error('LoginType should remain EMAIL');
    if (googleResult.user.providerId !== googleProviderId) {
      throw new Error('ProviderId should be updated to Google');
    }

    createdUserIds.push(testUser.id);
  });

  // TC-SL-048: EMAIL user with existing Apple providerId logs in with Google
  await runTest('TC-SL-048: EMAIL user switches social provider', async () => {
    const email = `email_switch_${Date.now()}@example.com`;
    const appleProviderId = `apple_switch_${Date.now()}`;
    
    const testUser = await createTestUser({
      email,
      loginType: 'EMAIL',
      password: '$2b$10$test',
      providerId: appleProviderId, // Already has Apple
    });

    // Login with Google - should update providerId but keep EMAIL loginType
    const googleProviderId = `google_switch_${Date.now()}`;
    const result = await UserService.socialLogin({
      provider: 'GOOGLE',
      providerId: googleProviderId,
      email,
    }, testMetadata);

    if (!result.success) throw new Error('Login should succeed');
    if (result.user.loginType !== 'EMAIL') throw new Error('LoginType should remain EMAIL');
    if (result.user.providerId !== googleProviderId) {
      throw new Error('ProviderId should be updated to Google');
    }

    createdUserIds.push(testUser.id);
  });

  // Cleanup
  await cleanupTestUsers(createdUserIds);
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n🚀 STARTING SOCIAL LOGIN TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Test Metadata: ${JSON.stringify(testMetadata, null, 2)}`);
  console.log('='.repeat(60));

  try {
    // Run all test categories
    await testInputValidation();
    await testNewUserCreation();
    await testExistingUserLogin();
    await testEmailConflicts();
    await testProviderIdConflicts();
    await testAccountStatus();
    await testProviderSwitching();
    await testUserNameScenarios();
    await testEdgeCases();
    await testResponseValidation();
    await testAppleLoginScenarios();
    await testEmailUserAddingSocialProvider();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    if (testResults.failures.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.test}`);
        console.log(`   Error: ${failure.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    if (testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log(`⚠️ ${testResults.failed} test(s) failed. Please review the errors above.`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    throw error;
  } finally {
    // Disconnect Prisma
    await prisma.$disconnect();
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      process.exit(testResults.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testInputValidation,
  testNewUserCreation,
  testExistingUserLogin,
  testEmailConflicts,
  testProviderIdConflicts,
  testAccountStatus,
  testProviderSwitching,
  testUserNameScenarios,
  testEdgeCases,
  testResponseValidation,
  testAppleLoginScenarios,
  testEmailUserAddingSocialProvider,
};

