-- AlterTable
ALTER TABLE "public"."scan_logs" ADD COLUMN     "matchedMealTimeId" TEXT;

-- CreateTable
CREATE TABLE "public"."_CardAllowedMeals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CardAllowedMeals_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CardAllowedMeals_B_index" ON "public"."_CardAllowedMeals"("B");

-- AddForeignKey
ALTER TABLE "public"."scan_logs" ADD CONSTRAINT "scan_logs_matchedMealTimeId_fkey" FOREIGN KEY ("matchedMealTimeId") REFERENCES "public"."meal_times"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CardAllowedMeals" ADD CONSTRAINT "_CardAllowedMeals_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CardAllowedMeals" ADD CONSTRAINT "_CardAllowedMeals_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."meal_times"("id") ON DELETE CASCADE ON UPDATE CASCADE;
