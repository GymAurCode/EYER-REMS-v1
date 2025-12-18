# Resolving Failed Migration

## Problem
Migration `20251218112310_latestmigration` failed because the index `Client_tid_key` already exists. This migration needs to be resolved before new migrations can be applied.

## Solution Options

### Option 1: Mark Migration as Applied (if indexes already exist)

If the indexes already exist in your database, mark the migration as applied:

```bash
cd server
npx prisma migrate resolve --applied 20251218112310_latestmigration
```

Then continue with:
```bash
npx prisma migrate deploy
```

### Option 2: Rollback and Re-apply (if indexes don't exist correctly)

If the indexes don't exist or are incorrect:

1. **Mark migration as rolled back:**
```bash
npx prisma migrate resolve --rolled-back 20251218112310_latestmigration
```

2. **The migration file has been fixed** to be idempotent (uses IF NOT EXISTS and checks if columns exist)

3. **Re-apply migrations:**
```bash
npx prisma migrate deploy
```

### Option 3: Manual Fix (if needed)

If you need to manually check/fix the database:

1. **Check if indexes exist:**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('Client', 'Deal', 'Property') 
AND indexname LIKE '%tid%';
```

2. **Drop indexes if they exist incorrectly:**
```sql
DROP INDEX IF EXISTS "Client_tid_key";
DROP INDEX IF EXISTS "Deal_tid_key";
DROP INDEX IF EXISTS "Property_tid_key";
```

3. **Then mark migration as rolled back and re-apply:**
```bash
npx prisma migrate resolve --rolled-back 20251218112310_latestmigration
npx prisma migrate deploy
```

## Current Status

The migration file `20251218112310_latestmigration/migration.sql` has been updated to:
- Check if `tid` columns exist before creating indexes
- Use `IF NOT EXISTS` to prevent duplicate index errors
- Use partial indexes (WHERE "tid" IS NOT NULL) to allow multiple NULLs

This makes the migration safe to re-run.

