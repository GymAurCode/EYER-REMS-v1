# Testing Guide

## Overview

This project uses Jest for unit and integration testing. Tests are located in `server/src/__tests__/`.

## Test Structure

```
server/src/__tests__/
├── setup.ts                    # Test configuration and setup
├── utils/
│   ├── pagination.test.ts      # Pagination utility tests
│   ├── error-handler.test.ts   # Error handler utility tests
│   └── zod-schemas.test.ts     # Zod schema validation tests
└── integration/
    └── routes.test.ts          # API endpoint integration tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Coverage

### Current Coverage:
- ✅ Pagination utilities (100%)
- ✅ Error handler utilities (100%)
- ✅ Zod schema validation (100%)
- ✅ Integration tests for critical endpoints

### Coverage Goals:
- Target: 80%+ coverage for backend logic
- Focus areas: Route handlers, utilities, services

## Writing Tests

### Unit Test Example
```typescript
import { calculatePagination } from '../../utils/pagination';

describe('calculatePagination', () => {
  it('should calculate pagination correctly', () => {
    const result = calculatePagination(2, 10, 95);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(10);
  });
});
```

### Integration Test Example
```typescript
import request from 'supertest';
import app from '../../index';

describe('GET /api/properties', () => {
  it('should return paginated properties', async () => {
    const response = await request(app)
      .get('/api/properties?page=1&limit=10')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Naming**: Use descriptive test names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Coverage**: Aim for high coverage of critical paths
5. **Mocking**: Mock external dependencies (database, APIs)

## Future Test Additions

### Priority 1: Route Handler Tests
- [ ] Sales routes
- [ ] Tenants routes
- [ ] Leases routes
- [ ] Properties routes
- [ ] Finance routes

### Priority 2: Service Tests
- [ ] Workflow services
- [ ] Alert services
- [ ] Analytics services

### Priority 3: Middleware Tests
- [ ] Authentication middleware
- [ ] RBAC middleware

## Continuous Integration

Tests should run automatically on:
- Pull requests
- Before deployment
- Nightly builds

## Notes

- Tests use a separate test database (configured in setup.ts)
- Test environment variables are set in `setup.ts`
- Mock data should be used for external dependencies

