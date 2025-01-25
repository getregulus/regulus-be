/*
  Warnings:

  - You are about to drop the column `target_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `target_type` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `userId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_userId_fkey";

-- DropForeignKey
ALTER TABLE "preferences" DROP CONSTRAINT "preferences_userId_fkey";

-- DropIndex
DROP INDEX "audit_logs_organizationId_idx";

-- DropIndex
DROP INDEX "audit_logs_timestamp_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "target_id",
DROP COLUMN "target_type",
DROP COLUMN "timestamp",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "organizationId" INTEGER,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
