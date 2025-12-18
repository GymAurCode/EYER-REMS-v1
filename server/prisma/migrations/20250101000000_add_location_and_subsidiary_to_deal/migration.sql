-- AlterTable: Add locationId and subsidiaryOptionId to Deal
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "locationId" TEXT,
ADD COLUMN IF NOT EXISTS "subsidiaryOptionId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_locationId_idx" ON "Deal"("locationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_subsidiaryOptionId_idx" ON "Deal"("subsidiaryOptionId");

-- AddForeignKey: Deal.locationId -> Location.id
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

-- AddForeignKey: Deal.subsidiaryOptionId -> SubsidiaryOption.id (only if table exists)
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
