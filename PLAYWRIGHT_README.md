# Playwright E2E Tests for REMS/ERP Application

## Overview
This project includes end-to-end tests for the REMS/ERP web application using Playwright. Tests cover CRUD operations for all major modules: Property, Employee, Dealer, Lead, Client, and Deals.

## Prerequisites
- Node.js installed
- Application running locally (frontend on http://localhost:3000, backend on http://localhost:3001)
- Database seeded with admin user (email: admin@realestate.com, password: admin123)
- Start the app before running tests:
  ```bash
  # Terminal 1: Start backend
  cd server && npm run dev

  # Terminal 2: Start frontend
  npm run dev
  ```

## Installation
Playwright is already installed. If needed, reinstall with:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

## Configuration
- `playwright.config.ts`: Main configuration with global setup for authentication
- `tests/global-setup.ts`: Logs in once and saves auth state for all tests
- `tests/helpers/`: Reusable helpers for navigation and API validation

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/property-crud.spec.ts
```

### Run Tests in UI Mode (for debugging)
```bash
npx playwright test --ui
```

### Run Tests with HTML Report
```bash
npx playwright test --reporter=html
```

### Run Tests Headed (visible browser)
```bash
npx playwright test --headed
```

### Run Specific Test
```bash
npx playwright test --grep "Create Property"
```

## Test Structure
- **Property CRUD**: Fully implemented with UI and API validation
- **Other Modules**: Skeleton tests ready for implementation

Each CRUD test includes:
- Create: Verify success via UI + API response (2xx status)
- Update: Verify updated value appears in UI
- Delete: Verify item removed from UI + API returns 404

## Reading Test Failures

### Common Failure Types

1. **Authentication Failures**
   - Check if app is running on correct ports
   - Verify admin credentials in global-setup.ts
   - Ensure database is seeded

2. **Selector Failures**
   - UI changed: Update selectors in test files
   - Use data-testid attributes for stable selectors

3. **API Failures**
   - Check backend logs for errors
   - Verify API endpoints match expectations
   - Ensure test data doesn't conflict with existing data

4. **Timeout Failures**
   - Increase timeouts in playwright.config.ts if needed
   - Check for slow network/API responses

### Debugging Steps
1. Run test with `--headed` to see browser actions
2. Use `--debug` flag for step-by-step execution
3. Check HTML report for screenshots and traces
4. Verify selectors with browser dev tools

### Error Messages
- Tests log clear error messages when CRUD operations fail
- API responses are validated for non-2xx status codes
- Network requests are intercepted to verify backend responses

## Test Data
Tests create temporary data with unique identifiers (timestamps) to avoid conflicts. Data is cleaned up during delete tests.

## Browser Support
Tests run on Chromium by default. Configured for Firefox and WebKit as well.

## CI/CD Integration
Configuration includes settings for CI environments (retries, parallel execution).