/*
  Warnings:

  - A unique constraint covering the columns `[tid]` on the table `Buyer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Lease` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Property` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tid]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PropertySubsidiary" DROP CONSTRAINT "PropertySubsidiary_locationId_fkey";

-- DropIndex
DROP INDEX "Account_accountType_idx";

-- DropIndex
DROP INDEX "Account_cashFlowCategory_idx";

-- DropIndex
DROP INDEX "Account_isPostable_idx";

-- DropIndex
DROP INDEX "Account_level_idx";

-- DropIndex
DROP INDEX "Account_normalBalance_idx";

-- DropIndex
DROP INDEX "Account_trustFlag_idx";

-- AlterTable
ALTER TABLE "Buyer" ADD COLUMN     "tid" TEXT;

-- AlterTable
ALTER TABLE "Dealer" ADD COLUMN     "tid" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "tid" TEXT,
ALTER COLUMN "salary" SET DEFAULT 0,
ALTER COLUMN "joinDate" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "tid" TEXT;

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "tid" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "tid" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "tid" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "tid" TEXT;

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Sequence_prefix_key" ON "Sequence"("prefix");

-- Drop potential conflicting indexes from manual migrations
DROP INDEX IF EXISTS "Buyer_tid_key";
DROP INDEX IF EXISTS "Client_tid_key";
DROP INDEX IF EXISTS "Deal_tid_key";
DROP INDEX IF EXISTS "Lead_tid_key";
DROP INDEX IF EXISTS "Lease_tid_key";
DROP INDEX IF EXISTS "Property_tid_key";
DROP INDEX IF EXISTS "Sale_tid_key";
DROP INDEX IF EXISTS "Unit_tid_key";

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_tid_key" ON "Buyer"("tid");

-- CreateIndex
CREATE INDEX "Buyer_tid_idx" ON "Buyer"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tid_key" ON "Client"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_tid_key" ON "Deal"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tid_key" ON "Lead"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_tid_key" ON "Lease"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Property_tid_key" ON "Property"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_tid_key" ON "Sale"("tid");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_tid_key" ON "Unit"("tid");
