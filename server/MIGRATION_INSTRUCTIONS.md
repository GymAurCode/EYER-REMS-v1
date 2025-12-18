# Database Migration Instructions - TID Columns

## Issue
The Prisma schema has been updated to include `tid` (Transaction ID) fields on Property, Deal, and Client models. However, the database migration needs to be applied to production.

## Migration File
The migration file is located at: `prisma/migrations/20251230000000_add_tid_columns/migration.sql`

This migration:
- Adds `tid` column to Property, Client, and Deal tables (nullable)
- Creates unique indexes on `tid` (allowing multiple NULLs)
- Creates regular indexes on `tid` for faster searches

## Apply Migration to Production

### Option 1: Using Railway CLI (if deployed on Railway)
```bash
cd server
railway run npx prisma migrate deploy
```

### Option 2: Using Prisma Migrate Deploy
```bash
cd server
npx prisma migrate deploy
```

### Option 3: Manual SQL Execution
If you have direct database access, you can execute the SQL file:
```bash
psql $DATABASE_URL -f prisma/migrations/20251230000000_add_tid_columns/migration.sql
```

## Verification
After applying the migration, verify the columns exist:
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('Property', 'Client', 'Deal') 
AND column_name = 'tid';
```

You should see 3 rows (one for each table).

## Notes
- The `tid` field is optional (nullable) in the database
- The validation schemas have been updated to make `tid` optional
- The migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times

