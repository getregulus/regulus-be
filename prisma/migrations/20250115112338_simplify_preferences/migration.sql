/*
  Warnings:

  - You are about to drop the column `language` on the `preferences` table. All the data in the column will be lost.
  - You are about to drop the column `pushNotifications` on the `preferences` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `preferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "preferences" DROP COLUMN "language",
DROP COLUMN "pushNotifications",
DROP COLUMN "theme";
