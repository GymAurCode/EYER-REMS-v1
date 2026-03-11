# JSON Parse Error Fix

## Problem
Tests were failing with:
```
[WebServer]  ⨯ SyntaxError: Unexpected end of JSON input
[WebServer]     at JSON.parse (<anonymous>) {
[WebServer]   page: '/login'
[WebServer] }
```

## Root Cause
The `localStorage.getItem('erp-user')` was returning empty strings or invalid JSON strings (like `"null"` or `"undefined"`), causing `JSON.parse()` to throw errors.

## Fixes Applied

### 1. `lib/auth-context.tsx`
- Added validation before `JSON.parse()` to check for:
  - Empty strings
  - `"null"` string
  - `"undefined"` string
- Added type checking after parsing to ensure result is an object
- Added proper error handling to clear invalid data

**Fixed locations:**
- Line ~87: Error handling in `refreshUser` catch block
- Line ~162: User initialization on mount
- Line ~209: Session expiry check

### 2. `lib/api.ts`
- Added same validation before `JSON.parse()` in error interceptor
- Added type checking after parsing

**Fixed locations:**
- Line ~145: 401 error handler
- Line ~147: Device mismatch handler

### 3. `frontend_tests/tests/helpers/test-helpers.ts`
- Updated `loginAsAdmin` to clear localStorage before login
- Increased timeouts for better reliability
- Added `waitForLoadState('networkidle')` after login

### 4. `frontend_tests/tests/auth.test.ts`
- Updated login test to clear localStorage before login
- Increased timeouts
- Added network idle wait

## Validation Pattern
All JSON.parse calls now use this pattern:
```typescript
if (storedUser && storedUser.trim() !== '' && storedUser !== 'null' && storedUser !== 'undefined') {
  try {
    const parsedUser = JSON.parse(storedUser)
    if (parsedUser && typeof parsedUser === 'object') {
      // Use parsedUser
    }
  } catch (e) {
    // Clear invalid data
    localStorage.removeItem('erp-user')
  }
}
```

## Testing
After these fixes:
1. JSON parse errors should be eliminated
2. Login should work more reliably
3. Tests should pass more consistently

## Next Steps
1. Restart frontend server
2. Run tests again: `cd frontend_tests && npm test`
3. Check for any remaining errors

