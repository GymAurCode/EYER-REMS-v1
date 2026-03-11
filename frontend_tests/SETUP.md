# Frontend Test Setup Guide

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd server
   npm run dev
   ```
   Server should be running on `http://localhost:3001`

2. **Frontend Server Running**
   ```bash
   npm run dev
   ```
   Frontend should be running on `http://localhost:3000`

3. **Database Seeded**
   ```bash
   cd server
   npm run prisma:seed
   ```
   This creates the default admin user:
   - Email: `admin@realestate.com`
   - Password: `admin123`

## Installation

1. Navigate to frontend_tests directory:
   ```bash
   cd frontend_tests
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run tests with UI (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

### Generate Report
```bash
# Run tests and generate report
npm test
node generate-report.js

# Or use Playwright's built-in HTML report
npm run test:all
npm run test:report
```

## Test Structure

```
frontend_tests/
├── tests/
│   ├── helpers/
│   │   └── test-helpers.ts      # Common utilities
│   ├── auth.test.ts             # Authentication tests
│   ├── properties.test.ts       # Properties module
│   ├── units.test.ts            # Units module
│   ├── finance.test.ts         # Finance module
│   ├── hr.test.ts              # HR module
│   ├── crm.test.ts             # CRM module
│   ├── tenant-portal.test.ts   # Tenant portal
│   ├── navigation.test.ts       # Navigation tests
│   ├── toast-notifications.test.ts  # Toast tests
│   ├── calculations.test.ts    # Calculation tests
│   └── edge-cases.test.ts      # Edge case tests
├── playwright.config.ts
├── package.json
└── README.md
```

## Configuration

### Environment Variables

Set in `playwright.config.ts` or via environment:

- `FRONTEND_URL`: Frontend URL (default: `http://localhost:3000`)
- `API_URL`: Backend API URL (default: `http://localhost:3001/api`)

### Test Credentials

Default credentials in `tests/helpers/test-helpers.ts`:
- Email: `admin@realestate.com`
- Password: `admin123`

## Troubleshooting

### Tests fail with "ECONNREFUSED"
- Ensure frontend server is running: `npm run dev`
- Check port 3000 is available

### Tests fail with authentication errors
- Ensure backend server is running: `cd server && npm run dev`
- Ensure database is seeded: `cd server && npm run prisma:seed`

### Browser not found
- Run: `npx playwright install`

### Tests are slow
- Tests run in parallel by default
- Use `--workers=1` to run sequentially if needed

## Test Coverage

The test suite covers:

✅ **All UI Pages and Modules**
- Dashboard
- Properties
- Units
- Finance
- HR
- CRM
- Tenant Portal
- Settings
- Notifications

✅ **Form Validation**
- Required fields
- Data type validation
- Format validation (email, dates, numbers)
- Max length validation

✅ **User Interactions**
- Buttons
- Modals/Dialogs
- Dropdowns
- Date pickers
- File uploads

✅ **Auto-Sync Verification**
- Property status updates
- Tenant assignment sync
- Payment updates invoice
- Expense syncs to finance ledger

✅ **Calculations**
- Occupancy rate
- Revenue totals
- Invoice tax/discount
- Payroll net pay
- Commission calculations

✅ **Toast Notifications**
- Success toasts
- Error toasts
- Validation toasts
- Auto-dismiss
- Multiple toast stacking

✅ **Navigation**
- All module links
- URL routing
- No console errors

✅ **Edge Cases**
- Empty states
- Max limits
- Overlapping data
- Network errors
- Invalid inputs

## Generating Reports

After running tests:

```bash
# Generate markdown report
node generate-report.js

# View HTML report
npm run test:report
```

The HTML report includes:
- Test results (pass/fail)
- Screenshots of failures
- Video recordings
- Execution timeline

