# Properties API 400 Error Analysis

## Error Description
The `/api/properties` endpoint was returning a 400 (Bad Request) error without clear error messages, making it difficult to diagnose the issue.

## Root Causes

The 400 error can occur due to several validation failures:

### 1. **Invalid Pagination Parameters** (Most Common)
- **Issue**: The `parsePaginationQuery` function validates `page` and `limit` query parameters using Zod
- **Requirements**:
  - `page`: Must be a positive integer (defaults to 1)
  - `limit`: Must be a positive integer between 1-100 (defaults to 10)
- **What causes 400**:
  - Non-numeric values (e.g., `page=abc`)
  - Negative numbers (e.g., `page=-1`)
  - Zero or empty strings
  - `limit` exceeding 100

### 2. **Invalid locationId Format**
- **Issue**: If `locationId` is provided, it must be a valid UUID format
- **What causes 400**:
  - Invalid UUID format (e.g., `locationId=123` instead of a proper UUID)
  - The location doesn't exist in the database
  - Database query fails when fetching subtree

### 3. **Zod Validation Errors**
- Any ZodError from `parsePaginationQuery` gets caught and returns a 400 status
- The error details were not being properly logged or returned to the client

## Fix Applied

Enhanced error handling in `server/src/routes/properties.ts`:

1. **Better Pagination Error Handling**:
   - Wrapped `parsePaginationQuery` in try-catch
   - Returns specific error message about pagination requirements
   - Logs the invalid query parameters for debugging

2. **locationId Validation**:
   - Validates UUID format before calling `getSubtreeIds`
   - Returns clear error message if locationId is invalid
   - Handles database errors when fetching subtree

3. **Improved Logging**:
   - Logs validation errors with context
   - Helps identify the exact parameter causing the issue

## How to Debug

### Check Browser Network Tab
1. Open browser DevTools → Network tab
2. Find the failed `/api/properties` request
3. Check the **Request URL** to see what query parameters were sent
4. Check the **Response** tab to see the error message

### Common Issues to Check

1. **Invalid page/limit values**:
   ```
   ❌ /api/properties?page=-1
   ❌ /api/properties?limit=200
   ❌ /api/properties?page=abc
   ✅ /api/properties?page=1&limit=10
   ```

2. **Invalid locationId**:
   ```
   ❌ /api/properties?locationId=123
   ❌ /api/properties?locationId=invalid-uuid
   ✅ /api/properties?locationId=550e8400-e29b-41d4-a716-446655440000
   ```

3. **Check Frontend Code**:
   - Look at `lib/api.ts` - `properties.getAll()` function
   - Ensure it's not sending invalid parameters
   - Check if URLSearchParams is encoding values correctly

## Testing the Fix

After the fix, the API will return more descriptive error messages:

```json
{
  "success": false,
  "error": "Invalid pagination parameters. Page and limit must be positive integers. Limit cannot exceed 100.",
  "details": [
    {
      "path": "page",
      "message": "Expected number, received string"
    }
  ]
}
```

Or for invalid locationId:

```json
{
  "success": false,
  "error": "Invalid locationId format. Expected a valid UUID, but received: 123"
}
```

## Next Steps

1. **Check the actual request** being made from the frontend
2. **Verify query parameters** in the browser Network tab
3. **Check server logs** for detailed error information
4. **Update frontend code** if it's sending invalid parameters

## Related Files

- `server/src/routes/properties.ts` - Main route handler (updated)
- `server/src/utils/pagination.ts` - Pagination validation
- `lib/api.ts` - Frontend API client
- `server/src/utils/error-handler.ts` - Error response formatting

