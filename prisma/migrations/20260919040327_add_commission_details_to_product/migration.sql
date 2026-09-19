-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "affiliateUrl" TEXT,
ADD COLUMN     "commissionAmount" DECIMAL(12,2),
ADD COLUMN     "commissionLiveAmount" DECIMAL(12,2),
ADD COLUMN     "commissionLiveRate" DOUBLE PRECISION,
ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "commissionSocialAmount" DECIMAL(12,2),
ADD COLUMN     "commissionSocialRate" DOUBLE PRECISION,
ADD COLUMN     "commissionVideoAmount" DECIMAL(12,2),
ADD COLUMN     "commissionVideoRate" DOUBLE PRECISION,
ADD COLUMN     "hasKomisiXtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "komisiXtraAmount" DECIMAL(12,2),
ADD COLUMN     "komisiXtraRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductSnapshot" ADD COLUMN     "commissionAmount" DECIMAL(12,2),
ADD COLUMN     "commissionLiveAmount" DECIMAL(12,2),
ADD COLUMN     "commissionLiveRate" DOUBLE PRECISION,
ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "commissionSocialAmount" DECIMAL(12,2),
ADD COLUMN     "commissionSocialRate" DOUBLE PRECISION,
ADD COLUMN     "commissionVideoAmount" DECIMAL(12,2),
ADD COLUMN     "commissionVideoRate" DOUBLE PRECISION,
ADD COLUMN     "hasKomisiXtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "komisiXtraAmount" DECIMAL(12,2),
ADD COLUMN     "komisiXtraRate" DOUBLE PRECISION;
