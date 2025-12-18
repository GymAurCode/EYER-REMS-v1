# Resolve Failed Migration P3009

## Issue
Migration `20251218112310_latestmigration` failed, blocking all new migrations.

## Solution Steps

### Step 1: Mark the Failed Migration as Rolled Back

Since the migration was trying to create indexes on columns that may not exist, we can safely mark it as rolled back:

```bash
cd server
railway run npx prisma migrate resolve --rolled-back 20251218112310_latestmigration
```

### Step 2: Apply the locationId Fix Directly

Instead of relying on migrations (which may have other issues), run the SQL fix directly:

```bash
railway run psql $DATABASE_URL -f prisma/migrations/fix_deal_location_id.sql
```

Or manually execute the SQL from `fix_deal_location_id.sql` in Railway's database console.

### Alternative: Skip Migrations and Use Direct SQL

If migrations continue to cause issues, you can:
1. Run the SQL fix directly (it's idempotent)
2. The application will work immediately
3. Deal with migrations later when you have time

