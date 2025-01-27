/*
  Warnings:

  - Made the column `field` on table `rules` required. This step will fail if there are existing NULL values in that column.
  - Made the column `operator` on table `rules` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `rules` required. This step will fail if there are existing NULL values in that column.
  - Made the column `value` on table `rules` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "rules" ALTER COLUMN "field" SET NOT NULL,
ALTER COLUMN "operator" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "value" SET NOT NULL;
