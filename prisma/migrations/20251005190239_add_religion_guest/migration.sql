-- AlterEnum
ALTER TYPE "public"."CardType" ADD VALUE 'RFID';

-- AlterTable
ALTER TABLE "public"."guests" ADD COLUMN     "religion" TEXT;
