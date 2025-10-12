-- AlterTable
ALTER TABLE "public"."guests" ADD COLUMN     "imageMimeType" TEXT,
ADD COLUMN     "imageSize" INTEGER,
ADD COLUMN     "imageUploadedAt" TIMESTAMP(3),
ADD COLUMN     "profileImagePath" TEXT,
ADD COLUMN     "thumbnailImagePath" TEXT;

-- CreateIndex
CREATE INDEX "guests_restaurantId_idx" ON "public"."guests"("restaurantId");

-- CreateIndex
CREATE INDEX "guests_isActive_idx" ON "public"."guests"("isActive");

-- CreateIndex
CREATE INDEX "guests_createdAt_idx" ON "public"."guests"("createdAt");

-- CreateIndex
CREATE INDEX "guests_checkInDate_idx" ON "public"."guests"("checkInDate");

-- CreateIndex
CREATE INDEX "guests_expiredDate_idx" ON "public"."guests"("expiredDate");

-- CreateIndex
CREATE INDEX "guests_firstName_lastName_idx" ON "public"."guests"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "guests_nationalId_idx" ON "public"."guests"("nationalId");

-- CreateIndex
CREATE INDEX "guests_passportNo_idx" ON "public"."guests"("passportNo");

-- CreateIndex
CREATE INDEX "guests_roomNumber_idx" ON "public"."guests"("roomNumber");

-- CreateIndex
CREATE INDEX "guests_company_idx" ON "public"."guests"("company");

-- CreateIndex
CREATE INDEX "guests_nationality_idx" ON "public"."guests"("nationality");

-- CreateIndex
CREATE INDEX "guests_profileImagePath_idx" ON "public"."guests"("profileImagePath");

-- CreateIndex
CREATE INDEX "guests_imageUploadedAt_idx" ON "public"."guests"("imageUploadedAt");

-- CreateIndex
CREATE INDEX "guests_restaurantId_isActive_idx" ON "public"."guests"("restaurantId", "isActive");

-- CreateIndex
CREATE INDEX "guests_createdBy_idx" ON "public"."guests"("createdBy");

-- CreateIndex
CREATE INDEX "guests_updatedBy_idx" ON "public"."guests"("updatedBy");
