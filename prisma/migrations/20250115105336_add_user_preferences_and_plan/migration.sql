/*
  Warnings:

  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "username",
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "permissions" TEXT NOT NULL DEFAULT '["read","write"]',
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'admin',
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- CreateTable
CREATE TABLE "preferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiryDate" TIMESTAMP(3),
    "features" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preferences_userId_key" ON "preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_userId_key" ON "plans"("userId");

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
