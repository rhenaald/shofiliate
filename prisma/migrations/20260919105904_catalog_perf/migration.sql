CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_product_name_trgm
  ON "Product" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_shop_trgm
  ON "Product" USING gin ("shopName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_region_created
  ON "Product" ("region", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS idx_snap_product_scraped
  ON "ProductSnapshot" ("productId", "scrapedAt" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_snap_sales_trending
  ON "ProductSnapshot" ("sales30d" DESC, "growth30d" DESC)
  WHERE "sales30d" >= 10;
CREATE INDEX IF NOT EXISTS idx_snap_historical
  ON "ProductSnapshot" ("historicalSold" DESC);
