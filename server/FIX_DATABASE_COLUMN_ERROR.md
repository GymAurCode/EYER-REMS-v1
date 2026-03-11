# Fix "Database column not found" Error

## Problem
When listing properties, you see the error:
```
Database column not found. Please run database migrations.
```

## Root Cause
This error (Prisma error code P2022) occurs when:
1. The database schema is out of sync with the Prisma schema
2. A migration hasn't been applied to the database
3. Prisma Client is out of sync with the database

## Solution

### Step 1: Check Which Column is Missing

Run the diagnostic script:
```bash
cd server
npm run check-migration
```

This will show you exactly which columns are missing.

### Step 2: Apply the Migration

**Option A: Use Prisma Migrate (Recommended)**
```bash
cd server
npx prisma migrate deploy
```

**Option B: Use the Fix Script**
```bash
cd server
npm run fix-properties-error
```

**Option C: Apply Migration SQL Manually**
If the above don't work, you can apply the migration SQL directly:
```bash
cd server
# Connect to your database and run:
psql $DATABASE_URL -f prisma/migrations/20251230000000_add_tid_columns/migration.sql
```

### Step 3: Regenerate Prisma Client

**Important:** Stop your server first, then:
```bash
cd server
npx prisma generate
```

If you get a permission error (EPERM):
1. Stop your server completely (Ctrl+C)
2. Wait 2-3 seconds
3. Close any terminals running the server
4. Try again: `npx prisma generate`

### Step 4: Restart Your Server

```bash
cd server
npm run dev
```

## Common Issues

### Issue: "Can't reach database server"
- Check your `.env` file has the correct `DATABASE_URL`
- Ensure your database server is running
- Check network connectivity

### Issue: "EPERM: operation not permitted" when generating Prisma Client
- Your server is still running and has locked the Prisma Client files
- Solution: Stop the server, wait a few seconds, then regenerate

### Issue: Migration says "already applied" but column still missing
- The migration may have failed partially
- Solution: Check the migration SQL file and apply it manually

## Verification

After applying the fix, verify:
1. The properties page loads without errors
2. Check server logs for any column-related errors
3. Run the diagnostic script again to confirm all columns exist

## Most Likely Missing Column: `tid`

The most common missing column is `tid` (Transaction ID). The migration file `20251230000000_add_tid_columns/migration.sql` adds this column to:
- `Property` table
- `Client` table  
- `Deal` table

## Quick Fix Command

If you just want to try the automated fix:
```bash
cd server
npm run fix-properties-error
```

This script will:
1. Check if `tid` columns exist
2. Apply the migration if needed
3. Regenerate Prisma Client (if possible)
4. Provide clear next steps

## Still Having Issues?

1. Check the server logs for the exact error message
2. The improved error handler now shows which column is missing
3. Check the Prisma schema (`prisma/schema.prisma`) matches your database
4. Verify all migrations have been applied: `npx prisma migrate status`

