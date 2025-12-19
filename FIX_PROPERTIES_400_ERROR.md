# Fix: Properties API 400 Error - Database Column Not Found

## Problem
When loading the properties page, you're getting:
- **400 Bad Request** error from `/api/properties`
- Error message: "Database column not found. Please run database migrations."

## Root Cause
The Prisma schema includes a `tid` (Transaction ID) column in the Property model, but this column doesn't exist in the production database yet. When Prisma tries to query properties, it attempts to select all columns including `tid`, which causes a P2022 error (column not found).

## Solution

### Quick Fix (Recommended)

Run the comprehensive fix script that handles everything:
```bash
cd server
npm run fix-properties-error
```

This script will:
1. Check if `tid` columns exist
2. Apply migration if needed
3. Regenerate Prisma Client
4. Provide next steps

**After running the script, restart your server!**

### Manual Fix Steps

If you prefer to do it manually:

**Step 1: Run the Database Migration**

The migration file already exists at: `server/prisma/migrations/20251230000000_add_tid_columns/migration.sql`

**Option A: Using the migration script**
```bash
cd server
npm run apply-tid-migration
```

**Option B: Using Prisma Migrate Deploy**
```bash
cd server
npx prisma migrate deploy
```

**Option C: If deployed on Railway**
```bash
cd server
railway run npx prisma migrate deploy
```

**Step 2: Regenerate Prisma Client**

This is critical! After running the migration, you must regenerate Prisma Client:
```bash
cd server
npx prisma generate
```

**Step 3: Restart Your Server**

After regenerating Prisma Client, restart your server for the changes to take effect.

**Step 4: Verify the Migration**

After running the migration, verify the columns exist:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('Property', 'Client', 'Deal') 
AND column_name = 'tid';
```

You should see 3 rows (one for each table).

## What Was Fixed

1. **Improved Error Handling**: Enhanced the error handling in `server/src/routes/properties.ts` to:
   - Check if `tid` column exists before querying
   - Use `select` to exclude `tid` if it doesn't exist (workaround)
   - Better detect missing column errors
   - Provide clearer error messages
   - Log detailed information for debugging

2. **Migration Scripts**: 
   - `server/scripts/apply-tid-migration.ts` - Applies the migration
   - `server/scripts/fix-properties-error.ts` - Comprehensive fix (migration + Prisma Client regeneration)

3. **Documentation**: Updated `server/MIGRATION_INSTRUCTIONS.md` with clear instructions

## After Running the Fix

Once the fix is applied:
- The `tid` column will exist in Property, Client, and Deal tables
- Prisma Client will be regenerated with the updated schema
- The properties API will work correctly (with or without `tid` column)
- The properties page will load without errors

**Important**: The code now includes a workaround that allows the API to work even if the `tid` column doesn't exist yet. However, you should still run the migration to ensure full functionality.

## Notes

- The `tid` field is optional (nullable), so existing data won't be affected
- The migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times
- The migration adds unique indexes on `tid` (allowing multiple NULLs)

## Troubleshooting

If you still get the error after running the fix:

1. **Check if Prisma Client was regenerated**: 
   ```bash
   cd server
   npx prisma generate
   ```

2. **Restart your server** - Prisma Client changes require a server restart

3. **Check server logs** - Look for detailed error messages about which column is missing

4. **Verify migration was applied**:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'Property' AND column_name = 'tid';
   ```

5. **If on Railway**, make sure the migration runs during deployment:
   - Check Railway logs for migration output
   - Ensure `prisma migrate deploy` is in your build script

## Related Files

- `server/src/routes/properties.ts` - Properties API route (error handling improved with workaround)
- `server/prisma/migrations/20251230000000_add_tid_columns/migration.sql` - Migration file
- `server/scripts/apply-tid-migration.ts` - Migration script
- `server/scripts/fix-properties-error.ts` - Comprehensive fix script
- `server/MIGRATION_INSTRUCTIONS.md` - Detailed migration instructions

