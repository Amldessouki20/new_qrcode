/*
  Warnings:

  - You are about to drop the column `checkOutDate` on the `guests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."guests" DROP COLUMN "checkOutDate",
ADD COLUMN     "expiredDate" TIMESTAMP(3);
