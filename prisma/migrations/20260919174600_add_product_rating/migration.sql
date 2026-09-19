-- AlterTable
ALTER TABLE "Product" ADD COLUMN "rating" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductSnapshot" ADD COLUMN "rating" DOUBLE PRECISION;

-- Update Materialized View catalog_latest to include rating
DROP MATERIALIZED VIEW IF EXISTS catalog_latest CASCADE;

CREATE MATERIALIZED VIEW catalog_latest AS
SELECT
  s."productId",
  s."sales1d", s."sales7d", s."sales30d", s."growth30d",
  s."gmv30d"::text AS "gmv30d",
  s."gmv30d" AS "gmv30dRaw",
  s."historicalSold",
  s."totalGmv"::text AS "totalGmv",
  s."likedCount", s."scrapedAt", s."batchId",
  COALESCE(s."rating", p."rating") AS "rating",
  p."id" AS "pid",
  p."region"::text AS "region",
  p."itemId", p."shopId", p."name", p."url",
  p."currency", p."shopName", p."category", p."listedOn",
  p."affiliateUrl",
  COALESCE(s."komisiXtraRate", p."komisiXtraRate") AS "komisiXtraRate",
  COALESCE(s."commissionLiveAmount", p."commissionLiveAmount")::text AS "commissionLiveAmount",
  COALESCE(s."commissionSocialAmount", p."commissionSocialAmount")::text AS "commissionSocialAmount",
  COALESCE(s."commissionVideoAmount", p."commissionVideoAmount")::text AS "commissionVideoAmount"
FROM "Product" p
JOIN "ProductSnapshot" s ON s."id" = p."latestSnapshotId";

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_latest_pk
  ON catalog_latest ("region", "pid");
CREATE INDEX IF NOT EXISTS idx_cat_latest_best
  ON catalog_latest ("region", "historicalSold" DESC, "pid" DESC);
CREATE INDEX IF NOT EXISTS idx_cat_latest_trending
  ON catalog_latest ("region", "sales30d" DESC, "growth30d" DESC, "pid" DESC)
  WHERE "sales30d" >= 10;
CREATE INDEX IF NOT EXISTS idx_cat_latest_recent
  ON catalog_latest ("region", "scrapedAt" DESC, "pid" DESC);
CREATE INDEX IF NOT EXISTS idx_cat_latest_rating
  ON catalog_latest ("region", "rating" DESC NULLS LAST, "pid" DESC);
