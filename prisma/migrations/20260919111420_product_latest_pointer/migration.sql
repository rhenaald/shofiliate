-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "latestSnapshotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_latestSnapshotId_key" ON "Product"("latestSnapshotId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_latestSnapshotId_fkey" FOREIGN KEY ("latestSnapshotId") REFERENCES "ProductSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
