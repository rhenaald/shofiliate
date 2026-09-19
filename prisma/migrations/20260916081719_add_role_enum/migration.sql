-- Backfill legacy NULL roles before tightening the column
UPDATE "user" SET "role" = 'user' WHERE "role" IS NULL;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user';
