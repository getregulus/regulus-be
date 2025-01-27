/*
  Warnings:

  - You are about to drop the column `userId` on the `plans` table. All the data in the column will be lost.
  - The `features` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `condition` on the `rules` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `rules` table. All the data in the column will be lost.
  - Added the required column `field` to the `rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operator` to the `rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `rules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "transaction_field" AS ENUM ('amount', 'currency', 'country', 'user_id', 'transaction_id');

-- CreateEnum
CREATE TYPE "rule_operator" AS ENUM ('GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'EQUAL', 'NOT_EQUAL', 'IN');

-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_userId_fkey";

-- DropForeignKey
ALTER TABLE "rules" DROP CONSTRAINT "rules_organizationId_fkey";

-- DropIndex
DROP INDEX "plans_userId_key";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "userId",
ALTER COLUMN "type" DROP DEFAULT,
DROP COLUMN "features",
ADD COLUMN     "features" JSONB;

-- AlterTable
ALTER TABLE "rules" DROP COLUMN "condition",
DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "field" "transaction_field" NULL,
ADD COLUMN     "operator" "rule_operator" NULL,
ADD COLUMN     "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "value" TEXT NULL;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
