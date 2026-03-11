# API Test Suite Documentation

## Overview

This comprehensive test suite covers all backend API endpoints with automated testing for authentication, authorization, validation, error handling, and business logic. The tests are designed to catch common issues like 400/401/403 errors and ensure API reliability.

## Test Structure

### Test Files

```
server/src/__tests__/
├── api/
│   ├── auth.test.ts          # Authentication endpoints
│   ├── crm.test.ts           # CRM (leads, clients, deals)
│   ├── properties.test.ts    # Properties, units, blocks
│   ├── tenants.test.ts       # Tenant management
│   ├── finance.test.ts       # Finance, accounting
│   └── employees.test.ts     # HR, payroll, attendance
├── helpers/
│   ├── test-app.ts           # Express app setup
│   ├── test-data.ts          # Test data utilities
│   └── test-config.ts        # Configuration
├── setup.ts                  # Jest setup
└── run-all-tests.ts         # Test runner
```

## Test Coverage

### 1. Authentication API (`auth.test.ts`)

**Endpoints Tested:**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/role-login` - Role-based login
- `POST /api/auth/invite-login` - Invite token login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info

**Test Scenarios:**
- ✅ Successful login with valid credentials
- ❌ Invalid credentials (401)
- ❌ Non-admin users trying admin login (403)
- ❌ Missing/invalid fields (400)
- ✅ Token refresh with valid refresh token
- ❌ Invalid refresh token (401)
- ✅ Logout with valid session
- ✅ Get current user info
- ❌ Access without authentication (401)

### 2. CRM API (`crm.test.ts`)

**Endpoints Tested:**
- `GET/POST/PUT/DELETE /api/crm/leads`
- `GET/POST/PUT/DELETE /api/crm/clients`
- `GET/POST/PUT/DELETE /api/crm/deals`
- `POST /api/crm/communications`

**Test Scenarios:**
- ✅ Create lead/client/deal with valid data
- ❌ Invalid data validation (400)
- ❌ Duplicate email/unique constraints (400)
- ❌ Missing permissions (403)
- ❌ Invalid foreign keys (400)
- ✅ Pagination and filtering
- ✅ Search functionality
- ✅ Update operations
- ❌ Non-existent resources (404)

### 3. Properties API (`properties.test.ts`)

**Endpoints Tested:**
- `GET/POST/PUT/DELETE /api/properties`
- `GET/POST/PUT/DELETE /api/units`
- `GET/POST/PUT/DELETE /api/blocks`

**Test Scenarios:**
- ✅ Create property with all fields
- ❌ Required field validation (400)
- ❌ Invalid enum values (400)
- ❌ Invalid URL formats (400)
- ❌ Duplicate property names (400)
- ✅ Property listing with filters
- ✅ Property details with units/blocks
- ✅ Unit creation and management
- ❌ Duplicate unit numbers (400)
- ❌ Delete property with active tenants (400)

### 4. Tenants API (`tenants.test.ts`)

**Endpoints Tested:**
- `GET/POST/PUT/DELETE /api/tenants`
- `POST /api/tenants/payments`
- `POST /api/tenants/convert-from-client/:id`

**Test Scenarios:**
- ✅ Create tenant with lease details
- ❌ Tenant for occupied unit (400)
- ❌ Invalid unit ID (400)
- ✅ Tenant listing and filtering
- ✅ Tenant details with payment history
- ✅ Record tenant payments
- ❌ Invalid payment amounts (400)
- ✅ Convert client to tenant
- ❌ Convert to occupied unit (400)

### 5. Finance API (`finance.test.ts`)

**Endpoints Tested:**
- `GET/POST/PUT /api/finance/accounts`
- `GET/POST /api/finance/transactions`
- `GET/POST/PUT /api/finance/invoices`
- `GET/POST /api/finance/journal-entries`

**Test Scenarios:**
- ✅ Create accounts with different types
- ❌ Invalid account types (400)
- ❌ Duplicate account codes (400)
- ✅ Record transactions with balance updates
- ❌ Invalid transaction amounts (400)
- ✅ Create invoices with line items
- ❌ Empty invoice items (400)
- ❌ Incorrect amount calculations (400)
- ✅ Create balanced journal entries
- ❌ Unbalanced entries (400)
- ✅ Post journal entries with balance updates

### 6. Employees API (`employees.test.ts`)

**Endpoints Tested:**
- `GET/POST/PUT /api/employees`
- `GET/POST /api/attendance`
- `GET/POST /api/payroll`
- `GET/POST/PUT /api/leave/requests`

**Test Scenarios:**
- ✅ Create employee with full details
- ❌ Invalid email/salary validation (400)
- ❌ Duplicate employee emails (400)
- ✅ Record attendance with check-in/out
- ❌ Duplicate attendance for same date (400)
- ✅ Generate payroll with calculations
- ❌ Incorrect salary calculations (400)
- ✅ Create leave requests
- ❌ Insufficient leave balance (400)
- ✅ Approve/reject leave requests

## Authorization Testing

Every test file includes comprehensive authorization tests:

- ❌ **No Authentication**: Requests without Bearer token (401)
- ❌ **Invalid Token**: Malformed or expired tokens (401)
- ❌ **Insufficient Permissions**: Users without required permissions (403)
- ❌ **Missing CSRF Token**: POST/PUT/DELETE without CSRF token (403)

## Error Scenarios Covered

### 400 Bad Request
- Invalid JSON payload
- Missing required fields
- Invalid field formats (email, UUID, dates)
- Invalid enum values
- Business logic violations
- Unique constraint violations
- Foreign key constraint violations

### 401 Unauthorized
- Missing Authorization header
- Invalid/expired JWT tokens
- Invalid refresh tokens

### 403 Forbidden
- Missing CSRF token for state-changing operations
- Insufficient role permissions
- Resource access restrictions

### 404 Not Found
- Non-existent resource IDs
- Invalid route endpoints

### 500 Internal Server Error
- Database connection issues
- Unhandled exceptions

## Running Tests

### Prerequisites

1. **Database Setup**:
   ```bash
   # Set up test database
   export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
   
   # Run migrations
   cd server
   npx prisma migrate deploy
   ```

2. **Environment Variables**:
   ```bash
   NODE_ENV=test
   JWT_SECRET=test-secret-key-for-jwt-signing-very-long-and-secure
   DATABASE_URL=postgresql://test:test@localhost:5432/test_db
   ```

### Running Individual Test Suites

```bash
# Run specific test file
npm test auth.test.ts
npm test crm.test.ts
npm test properties.test.ts
npm test tenants.test.ts
npm test finance.test.ts
npm test employees.test.ts

# Run with verbose output
npm test auth.test.ts -- --verbose

# Run with coverage
npm test auth.test.ts -- --coverage
```

### Running All Tests

```bash
# Run all API tests
npm test -- --testPathPattern=api

# Run all tests with coverage
npm run test:coverage

# Run comprehensive test suite with detailed report
npx tsx src/__tests__/run-all-tests.ts
```

### Watch Mode (Development)

```bash
# Run tests in watch mode
npm run test:watch

# Watch specific test file
npm run test:watch -- auth.test.ts
```

## Test Output Interpretation

### Successful Test Run
```
✅ auth: 25/25 passed (2.1s)
✅ crm: 32/32 passed (3.4s)
✅ properties: 28/28 passed (2.8s)
✅ tenants: 24/24 passed (2.2s)
✅ finance: 35/35 passed (4.1s)
✅ employees: 30/30 passed (3.2s)

🎉 ALL TESTS PASSED! Your API is working correctly.
```

### Failed Test Run
```
❌ crm: 30/32 passed, 2 failed (3.4s)
   - POST /api/crm/clients returns 400 for duplicate email
   - PUT /api/crm/deals/:id validates foreign key constraints

⚠️ 2 TESTS FAILED. Please review and fix the issues above.
```

### Coverage Report
```
📈 CODE COVERAGE:
  Statements: 85.2%
  Branches: 78.9%
  Functions: 92.1%
  Lines: 84.7%
```

## Common Issues and Solutions

### 1. Database Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and TEST_DATABASE_URL is correct.

### 2. Authentication Failures
```
Error: Authentication required
```
**Solution**: Check JWT_SECRET environment variable and token generation.

### 3. Permission Errors
```
Error: Insufficient permissions
```
**Solution**: Verify role permissions in test data setup.

### 4. CSRF Token Issues
```
Error: CSRF token required
```
**Solution**: Ensure CSRF tokens are included in POST/PUT/DELETE requests.

### 5. Validation Errors
```
Error: Validation error - name is required
```
**Solution**: Check request payload matches API schema requirements.

## Test Data Management

### Automatic Cleanup
- Each test file automatically cleans up data before/after tests
- Database is reset between test suites
- No test pollution between runs

### Test Data Factories
```typescript
// Create test user with role
const user = await createTestUser({
  email: 'test@example.com',
  password: 'password123',
  roleId: role.id,
});

// Create test property
const property = await createTestProperty({
  name: 'Test Property',
  type: 'residential',
  address: '123 Test St',
});
```

## Performance Monitoring

Tests include performance monitoring:
- API response times (< 5 seconds)
- Database query times (< 1 second)
- Memory usage tracking
- Slow test identification

## CI/CD Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
        env:
          TEST_DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
```

## Extending Tests

### Adding New Test Files
1. Create new test file in `src/__tests__/api/`
2. Follow existing patterns for setup/teardown
3. Include authorization tests
4. Add to test runner if needed

### Adding New Test Cases
```typescript
describe('New Feature API', () => {
  it('should handle new scenario', async () => {
    const response = await request(app)
      .post('/api/new-endpoint')
      .set(authHeaders)
      .send(testData);
    
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        // expected fields
      }),
    });
  });
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe the scenario
3. **Comprehensive Coverage**: Test both success and failure cases
4. **Real Data**: Use realistic test data that matches production
5. **Performance Awareness**: Monitor test execution times
6. **Error Handling**: Test all error conditions thoroughly
7. **Authorization**: Always test permission scenarios
8. **Cleanup**: Ensure proper data cleanup between tests

## Troubleshooting

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test auth.test.ts

# Run single test with full output
npm test auth.test.ts -- --verbose --no-coverage
```

### Database Inspection
```bash
# Connect to test database
psql postgresql://test:test@localhost:5432/test_db

# Check test data
SELECT * FROM users WHERE email LIKE '%test%';
```

### Log Analysis
Check server logs for detailed error information:
```bash
tail -f server/logs/test.log
```

This comprehensive test suite ensures your API is robust, secure, and handles all edge cases properly. Run these tests regularly to catch issues early and maintain API reliability.