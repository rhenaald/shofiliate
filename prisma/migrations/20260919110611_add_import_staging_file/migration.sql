-- DropIndex
DROP INDEX "idx_product_name_trgm";

-- DropIndex
DROP INDEX "idx_product_region_created";

-- DropIndex
DROP INDEX "idx_product_shop_trgm";

-- DropIndex
DROP INDEX "idx_snap_historical";

-- DropIndex
DROP INDEX "idx_snap_product_scraped";

-- CreateTable
CREATE TABLE "ImportStagingFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "enrichedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'staged',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportStagingFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportStagingFile_userId_createdAt_idx" ON "ImportStagingFile"("userId", "createdAt");
