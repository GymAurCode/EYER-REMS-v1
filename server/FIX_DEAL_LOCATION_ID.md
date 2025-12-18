# Fix: Deal.locationId Column Missing

## Issue
The error `Invalid prisma.deal.findMany() invocation: The column Deal.locationId does not exist in the current database` occurs because the Prisma schema defines `locationId` in the Deal model, but the database column hasn't been created yet.

## Solution

### Option 1: Run Prisma Migrate (Recommended)
If you have database access, run:
```bash
cd server
npx prisma migrate deploy
```

This will apply all pending migrations including the one that adds `locationId` to the Deal table.

### Option 2: Run the SQL Script Manually
If you have direct database access, you can run the SQL script:

**Using psql:**
```bash
cd server
psql $DATABASE_URL -f prisma/migrations/fix_deal_location_id.sql
```

**Using a database GUI tool:**
1. Open your database client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open and execute the file: `server/prisma/migrations/fix_deal_location_id.sql`

### Option 3: Copy-Paste SQL
If you prefer, you can copy the SQL from `server/prisma/migrations/fix_deal_location_id.sql` and execute it directly in your database client.

## What This Migration Does
- Adds `locationId` column to the Deal table (nullable TEXT)
- Adds `subsidiaryOptionId` column to the Deal table (nullable TEXT)
- Creates indexes on both columns for better query performance
- Adds foreign key constraints linking to Location and SubsidiaryOption tables

## Verification
After running the migration, verify the columns exist:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Deal' 
AND column_name IN ('locationId', 'subsidiaryOptionId');
```

You should see 2 rows returned.

## Notes
- The migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times
- Existing Deal records will have NULL values for these columns (which is expected)
- The columns are optional (nullable) in both the schema and database

