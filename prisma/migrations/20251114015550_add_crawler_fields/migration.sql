-- CreateEnum
CREATE TYPE "rule_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "jurisdictions" JSONB,
ADD COLUMN     "crawlerSettings" JSONB;

-- AlterTable
ALTER TABLE "rules" ADD COLUMN     "status" "rule_status" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "crawledAt" TIMESTAMP(3),
ADD COLUMN     "ruleHash" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "rules_status_idx" ON "rules"("status");

-- CreateIndex
CREATE INDEX "rules_jurisdiction_idx" ON "rules"("jurisdiction");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "rules_ruleHash_organizationId_key" ON "rules"("ruleHash", "organizationId");

