# Fix Production Database Error (P2022)

## Error
```
Database error: P2022
Invalid prisma.deal.findMany() invocation: The column Deal.locationId does not exist in the current database.
```

## Root Cause
The Prisma schema includes `locationId` and `subsidiaryOptionId` columns in the Deal model, but these columns haven't been added to your production database yet.

## Solution: Apply Migration to Railway Database

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   cd server
   railway link
   ```

4. **Run the migration**:
   ```bash
   railway run npx prisma migrate deploy
   ```

   Or run the SQL directly:
   ```bash
   railway run psql $DATABASE_URL -f prisma/migrations/fix_deal_location_id.sql
   ```

### Option 2: Using Railway Web Console

1. Go to your Railway project dashboard
2. Click on your **PostgreSQL service**
3. Go to the **Data** or **Connect** tab
4. Click **Open in Postgres** or use the **Query** tab
5. Copy and paste the SQL from `server/prisma/migrations/fix_deal_location_id.sql`
6. Execute the SQL

### Option 3: Direct Database Connection

If you have the database connection string:

1. **Using psql**:
   ```bash
   psql $DATABASE_URL -f server/prisma/migrations/fix_deal_location_id.sql
   ```

2. **Using any PostgreSQL client**:
   - Connect to your Railway database
   - Execute the SQL from `server/prisma/migrations/fix_deal_location_id.sql`

## Quick SQL Fix (Copy-Paste This)

If you need to run it manually, here's the SQL:

```sql
-- Add locationId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Deal' AND column_name = 'locationId'
    ) THEN
        ALTER TABLE "Deal" ADD COLUMN "locationId" TEXT;
    END IF;
END $$;

-- Add subsidiaryOptionId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Deal' AND column_name = 'subsidiaryOptionId'
    ) THEN
        ALTER TABLE "Deal" ADD COLUMN "subsidiaryOptionId" TEXT;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Deal_locationId_idx" ON "Deal"("locationId");
CREATE INDEX IF NOT EXISTS "Deal_subsidiaryOptionId_idx" ON "Deal"("subsidiaryOptionId");

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Deal_locationId_fkey'
    ) THEN
        ALTER TABLE "Deal" ADD CONSTRAINT "Deal_locationId_fkey" 
        FOREIGN KEY ("locationId") 
        REFERENCES "Location"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'SubsidiaryOption'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Deal_subsidiaryOptionId_fkey'
    ) THEN
        ALTER TABLE "Deal" ADD CONSTRAINT "Deal_subsidiaryOptionId_fkey" 
        FOREIGN KEY ("subsidiaryOptionId") 
        REFERENCES "SubsidiaryOption"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Deal' 
AND column_name IN ('locationId', 'subsidiaryOptionId');
```

You should see 2 rows returned.

## After Migration

1. **Regenerate Prisma Client** (if needed):
   ```bash
   cd server
   npx prisma generate
   ```

2. **Restart your application** to ensure the new schema is loaded.

## Notes

- The migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times
- Existing Deal records will have NULL values for these columns (which is expected)
- The columns are optional (nullable) in both the schema and database
- This fix is needed because the Prisma schema was updated but the database migration wasn't applied to production

