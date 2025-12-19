# Debugging "Database column unknown not found" Error

## Problem
You're seeing: `Database column "unknown" not found in table "unknown"`

This means the error handler couldn't extract the column/table name from the Prisma error.

## What Was Fixed

The error handler has been improved to:
1. ✅ Parse Prisma error messages to extract column/table names
2. ✅ Check multiple error message patterns
3. ✅ Log full Prisma error details for debugging

## How to Debug

### Step 1: Check Server Logs
Look at your server logs (usually in `server/logs/error.log` or console output) for the full error details. You should see:
- The original Prisma error message
- The error meta information
- The path and method that caused the error

### Step 2: Run the Fix Script
Even if we don't know the exact column, run the fix script to add all common missing columns:

```bash
cd server
npm run fix-missing-columns
```

This will add:
- `tid` to Property, Client, Deal
- `transactionType` and `purpose` to FinanceLedger

### Step 3: Check Which Endpoint is Failing
The error log will show the `path` and `method`. Common endpoints that fail:
- `/api/properties` - likely missing `tid` column
- `/api/stats/finance/revenue-vs-expense` - likely missing `transactionType` column
- Other endpoints - check logs for the specific path

### Step 4: Manual Column Check
If you want to check which columns are missing manually:

```bash
cd server
npm run check-migration
```

## Common Missing Columns

Based on the codebase, these columns are commonly missing:

1. **Property table:**
   - `tid` (Transaction ID)

2. **FinanceLedger table:**
   - `transactionType` (credit/debit)
   - `purpose` (booking, installment, etc.)

3. **Client table:**
   - `tid` (Transaction ID)

4. **Deal table:**
   - `tid` (Transaction ID)

## Quick Fix

Run this to fix all known missing columns:

```bash
cd server
npm run fix-missing-columns
npx prisma generate
```

Then restart your server.

## If Error Persists

1. **Check the server logs** for the full Prisma error
2. **Share the error details** - the improved logging will show:
   - Original Prisma error message
   - Error meta information
   - Which endpoint caused it

3. **Run diagnostic:**
   ```bash
   cd server
   npm run check-migration
   ```

The improved error handler will now show better error messages once it can parse the Prisma error correctly.

