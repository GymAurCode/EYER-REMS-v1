# Frontend E2E Test Suite

Comprehensive end-to-end testing for the Property Management Software frontend using Playwright.

## Overview

This test suite covers:
- ✅ All UI pages and modules
- ✅ Form inputs, validations, and required fields
- ✅ Buttons, modals, and dialog boxes
- ✅ Auto-sync updates from backend
- ✅ Real-time calculations (rent, revenue, occupancy, payroll, commissions)
- ✅ Floor and unit mapping
- ✅ Toast notifications for every action
- ✅ Navigation between modules
- ✅ Edge cases (empty states, max limits, overlapping data)

## Prerequisites

1. **Backend server must be running** on `http://localhost:3001`
   ```bash
   cd server
   npm run dev
   ```

2. **Frontend server must be running** on `http://localhost:3000`
   ```bash
   # From project root
   npm run dev
   ```
   **Note:** Playwright will automatically start the frontend server if it's not running, but it's recommended to start it manually.

3. **Database must be seeded** with test data
   ```bash
   cd server
   npm run prisma:seed
   ```

## Setup

1. Install dependencies:
```bash
cd frontend_tests
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in UI mode (interactive):
```bash
npm run test:ui
```

### Run tests in headed mode (see browser):
```bash
npm run test:headed
```

### Run tests in debug mode:
```bash
npm run test:debug
```

### Run specific test file:
```bash
npx playwright test tests/auth.test.ts
```

### Run tests and generate HTML report:
```bash
npm run test:all
npm run test:report
```

## Test Structure

```
frontend_tests/
├── tests/
│   ├── helpers/
│   │   └── test-helpers.ts    # Common test utilities
│   ├── auth.test.ts           # Authentication tests
│   ├── properties.test.ts     # Properties module tests
│   ├── units.test.ts          # Units module tests
│   ├── finance.test.ts        # Finance module tests
│   ├── navigation.test.ts     # Navigation tests
│   ├── toast-notifications.test.ts  # Toast notification tests
│   ├── calculations.test.ts   # Calculation verification tests
│   └── edge-cases.test.ts     # Edge case tests
├── playwright.config.ts       # Playwright configuration
├── package.json
└── README.md
```

## Test Coverage

### Authentication Module
- ✅ Login form validation
- ✅ Successful login
- ✅ Invalid credentials handling
- ✅ Logout functionality
- ✅ Toast notifications

### Properties Module
- ✅ Property CRUD operations
- ✅ Form validation
- ✅ Auto-sync (status updates)
- ✅ Property dashboard calculations
- ✅ Toast notifications

### Units Module
- ✅ Unit CRUD operations
- ✅ Floor mapping display
- ✅ Form validation
- ✅ Toast notifications

### Finance Module
- ✅ Invoice creation with tax calculations
- ✅ Payment processing
- ✅ Finance summary calculations
- ✅ Auto-sync (payment updates invoice)
- ✅ Toast notifications

### Navigation
- ✅ All module links work
- ✅ No console errors on navigation
- ✅ Proper URL routing

### Toast Notifications
- ✅ Success toasts for all actions
- ✅ Error toasts for failures
- ✅ Validation error toasts
- ✅ Multiple toast stacking
- ✅ Auto-dismiss functionality

### Calculations
- ✅ Occupancy rate display
- ✅ Revenue calculations
- ✅ Invoice tax calculations
- ✅ Payroll net pay calculations
- ✅ Commission calculations

### Edge Cases
- ✅ Empty states
- ✅ Max length validation
- ✅ Overlapping date ranges
- ✅ Negative value validation
- ✅ Network error handling

## Configuration

### Environment Variables

Set in `playwright.config.ts` or via environment:

- `FRONTEND_URL`: Frontend server URL (default: `http://localhost:3000`)
- `API_URL`: Backend API URL (default: `http://localhost:3001/api`)

### Test Credentials

Default test credentials in `tests/helpers/test-helpers.ts`:
- Email: `admin@realestate.com`
- Password: `admin123`

## Troubleshooting

### Tests fail with connection errors
- Ensure backend server is running: `cd server && npm run dev`
- Ensure frontend server is running: `npm run dev`
- Check ports: Backend (3001), Frontend (3000)

### Tests fail with authentication errors
- Ensure database is seeded: `cd server && npm run prisma:seed`
- Verify test credentials match seeded data

### Tests are slow
- Run tests in parallel: Already configured in `playwright.config.ts`
- Use `--workers=1` to run sequentially if needed

### Browser not found
- Run: `npx playwright install`

## Generating Reports

After running tests, generate HTML report:
```bash
npm run test:report
```

The report will open in your browser showing:
- Test results (pass/fail)
- Screenshots of failures
- Video recordings of failed tests
- Test execution timeline

## Continuous Integration

For CI/CD pipelines, tests will:
- Run in headless mode
- Retry failed tests (2 retries)
- Generate HTML and JSON reports
- Capture screenshots and videos on failure

## Next Steps

1. Add more module-specific tests (HR, CRM, Tenant Portal)
2. Add visual regression testing
3. Add performance testing
4. Add accessibility testing
5. Add mobile responsive testing

