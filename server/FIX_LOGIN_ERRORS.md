# Fix Login Errors - Properties & Finance Stats

## Errors Fixed

### 1. Properties Endpoint - 400 Bad Request
**Error:** `Database column not found. Please run database migrations.`
**Cause:** Missing `tid` column in Property, Client, or Deal tables

### 2. Finance Revenue vs Expense - 500 Internal Server Error  
**Error:** `Failed to fetch revenue vs expense data`
**Cause:** Missing `transactionType` column in FinanceLedger table

## Quick Fix

Run this command to fix all missing columns:

```bash
cd server
npm run fix-missing-columns
```

This script will:
1. ✅ Add `tid` column to Property, Client, and Deal tables (if missing)
2. ✅ Add `subsidiaryOptionId` column to Property table (if missing)
3. ✅ Add `transactionType` and `purpose` columns to FinanceLedger (if missing)
4. ✅ Create necessary indexes and foreign key constraints
5. ✅ Set default values for existing data

## After Running the Fix

1. **Regenerate Prisma Client:**
   ```bash
   cd server
   npx prisma generate
   ```
   ⚠️ **Important:** Stop your server first if you get a permission error!

2. **Restart your server:**
   ```bash
   npm run dev
   ```

3. **Test the endpoints:**
   - Properties page should load without errors
   - Finance stats should display correctly

## Manual Fix (If Script Doesn't Work)

If the script fails, you can manually apply the migrations:

```bash
cd server
npx prisma migrate deploy
```

Then regenerate Prisma Client:
```bash
npx prisma generate
```

## What Was Changed

### Code Changes:
1. **Error Handler** (`server/src/utils/error-handler.ts`)
   - Improved error messages to show which column is missing
   - Added helpful hints about running migrations

2. **Stats Route** (`server/src/routes/stats.ts`)
   - Added check for `transactionType` column before querying
   - Returns empty data with helpful message if column is missing
   - Better error handling for column not found errors

3. **Properties Route** (`server/src/routes/properties.ts`)
   - Already had error handling for missing `tid` column
   - Will now show better error messages

### New Scripts:
- `fix-missing-columns.ts` - Comprehensive script to fix all missing columns (includes tid, subsidiaryOptionId, transactionType, purpose)
- `check-and-fix-migration.ts` - Diagnostic script to check column status
- `fix-subsidiary-option-id.sql` - Quick SQL fix for subsidiaryOptionId column

## Verification

After applying the fix, verify:

1. ✅ Properties page loads without 400 errors
2. ✅ Finance revenue vs expense chart displays data (or empty array if no data)
3. ✅ No "column not found" errors in server logs

## Still Having Issues?

1. Check server logs for the exact error message
2. Run the diagnostic script: `npm run check-migration`
3. Verify database connection in `.env` file
4. Ensure all migrations have been applied: `npx prisma migrate status`

