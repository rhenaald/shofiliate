-- CreateEnum
CREATE TYPE "Region" AS ENUM ('MY', 'SG', 'ID', 'TH', 'PH', 'VN');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "itemId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "shopName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "listedOn" TIMESTAMP(3),
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "needsRegion" BOOLEAN NOT NULL DEFAULT false,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "sales1d" INTEGER NOT NULL DEFAULT 0,
    "sales7d" INTEGER NOT NULL DEFAULT 0,
    "sales30d" INTEGER NOT NULL DEFAULT 0,
    "growth30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gmv30d" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "historicalSold" INTEGER NOT NULL DEFAULT 0,
    "totalGmv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "likedCount" INTEGER NOT NULL DEFAULT 0,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_region_createdAt_idx" ON "Product"("region", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_region_itemId_shopId_key" ON "Product"("region", "itemId", "shopId");

-- CreateIndex
CREATE INDEX "ProductSnapshot_productId_scrapedAt_idx" ON "ProductSnapshot"("productId", "scrapedAt");

-- CreateIndex
CREATE INDEX "ProductSnapshot_sales30d_growth30d_idx" ON "ProductSnapshot"("sales30d", "growth30d");

-- CreateIndex
CREATE INDEX "ProductSnapshot_historicalSold_idx" ON "ProductSnapshot"("historicalSold");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSnapshot" ADD CONSTRAINT "ProductSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSnapshot" ADD CONSTRAINT "ProductSnapshot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
