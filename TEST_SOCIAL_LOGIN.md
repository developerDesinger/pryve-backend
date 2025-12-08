# Social Login Test Suite Documentation

## Overview

This test suite contains comprehensive test cases for the social login functionality, covering all scenarios including happy paths, error cases, edge cases, and integration scenarios.

## Test File

**File:** `test-social-login.js`

## Running the Tests

### Prerequisites

1. Ensure your `.env` file is configured with a valid `DATABASE_URL`
2. Make sure your database is accessible
3. Run database migrations if needed: `npm run db:migrate`

### Run All Tests

```bash
node test-social-login.js
```

### Run Specific Test Categories

You can also import and run specific test categories programmatically:

```javascript
const { testInputValidation, testNewUserCreation } = require('./test-social-login');

// Run specific category
testInputValidation();
```

## Test Categories

### Category 1: Input Validation (3 tests)
- **TC-SL-001**: Missing provider
- **TC-SL-002**: Missing providerId
- **TC-SL-003**: Empty strings vs null handling

### Category 2: New User Creation - Happy Path (6 tests)
- **TC-SL-005**: Create Google user with complete data
- **TC-SL-006**: Create Apple user with complete data
- **TC-SL-007**: Create Facebook user
- **TC-SL-008**: Create user without email (Apple privacy)
- **TC-SL-009**: Create user without userName
- **TC-SL-010**: Create user with minimal data (only required fields)

### Category 3: Existing User Login - Happy Path (4 tests)
- **TC-SL-011**: Login existing user by email
- **TC-SL-012**: Login existing user by providerId
- **TC-SL-013**: Login and update profile info
- **TC-SL-014**: Login with same data (no updates)

### Category 4: Email Conflict Scenarios (2 tests)
- **TC-SL-015**: Email exists with different provider
- **TC-SL-016**: Email exists with same provider

### Category 5: ProviderId Conflict Scenarios (2 tests)
- **TC-SL-018**: ProviderId belongs to different user
- **TC-SL-019**: ProviderId update for existing user

### Category 6: Account Status Scenarios (3 tests)
- **TC-SL-021**: Login with inactive account
- **TC-SL-022**: Login with deleted account
- **TC-SL-023**: Login with active account

### Category 7: Provider Switching Scenarios (1 test)
- **TC-SL-024**: Switch from Google to Apple

### Category 8: UserName Scenarios (3 tests)
- **TC-SL-026**: Multiple users with same userName (after removing unique constraint)
- **TC-SL-027**: Update userName to existing value
- **TC-SL-028**: Empty userName handling

### Category 9: Edge Cases and Race Conditions (2 tests)
- **TC-SL-030**: Special characters in userName
- **TC-SL-032**: Unicode characters in userName

### Category 10: Response Validation (3 tests)
- **TC-SL-033**: Response structure validation
- **TC-SL-034**: JWT token validation
- **TC-SL-035**: Payment data included

## Test Statistics

- **Total Test Cases**: 29 implemented tests
- **Coverage**: 
  - Input validation
  - User creation flows
  - User login flows
  - Conflict resolution
  - Account status handling
  - Provider switching
  - UserName handling (non-unique)
  - Edge cases
  - Response validation

## Test Data Management

### Automatic Cleanup

The test suite automatically:
- Creates test users as needed
- Tracks created user IDs
- Cleans up test users after each category
- Handles cleanup errors gracefully

### Test Isolation

Each test category:
- Uses unique identifiers (timestamps) to avoid conflicts
- Cleans up its own test data
- Doesn't interfere with other test categories

## Expected Output

### Successful Test Run

```
🚀 STARTING SOCIAL LOGIN TEST SUITE
============================================================
Test Metadata: { ... }
============================================================

📋 CATEGORY 1: INPUT VALIDATION TESTS
============================================================
🧪 TC-SL-001: Missing provider... ✅ PASSED
🧪 TC-SL-002: Missing providerId... ✅ PASSED
...

============================================================
📊 TEST SUMMARY
============================================================
Total Tests: 29
✅ Passed: 29
❌ Failed: 0
Success Rate: 100.00%

============================================================
🎉 ALL TESTS PASSED!
============================================================
```

### Failed Test Example

```
🧪 TC-SL-015: Email exists with different provider... ❌ FAILED: Should have thrown conflict error

============================================================
❌ FAILED TESTS:
1. TC-SL-015: Email exists with different provider
   Error: Should have thrown conflict error
```

## Important Notes

### Database Requirements

- Tests require a **test database** or a database you're comfortable modifying
- Tests will create and delete users
- Ensure you have proper database permissions

### Environment Variables

Make sure these are set in your `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- Other required environment variables for the application

### Test Metadata

Tests use mock request metadata:
```javascript
{
  ipAddress: '127.0.0.1',
  userAgent: 'Test-Agent/1.0'
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify `DATABASE_URL` in `.env`
   - Ensure database is running
   - Check network connectivity

2. **Prisma Client Not Generated**
   - Run: `npm run db:generate`

3. **Migration Issues**
   - Run: `npm run db:migrate`
   - Ensure schema is up to date

4. **Test Failures**
   - Check test output for specific error messages
   - Verify database state
   - Ensure no conflicting data exists

## Extending Tests

To add new test cases:

1. Add test function in appropriate category
2. Use `runTest()` helper for consistent reporting
3. Track created user IDs for cleanup
4. Follow existing test patterns

Example:
```javascript
await runTest('TC-SL-XXX: Test name', async () => {
  // Setup
  const testUser = await createTestUser({ ... });
  
  // Test
  const result = await UserService.socialLogin({ ... }, testMetadata);
  
  // Assertions
  if (!result.success) throw new Error('Expected success');
  
  // Cleanup
  createdUserIds.push(testUser.id);
});
```

## Test Coverage

The test suite covers:

✅ Input validation  
✅ User creation (all providers)  
✅ User login (all scenarios)  
✅ Conflict resolution  
✅ Account status checks  
✅ Provider switching  
✅ UserName handling (non-unique)  
✅ Edge cases  
✅ Response validation  

## Future Enhancements

Potential additions:
- Race condition tests (concurrent requests)
- Performance tests
- Load tests
- Integration with external services (mock)
- Auth logging verification
- Payment data validation (detailed)

