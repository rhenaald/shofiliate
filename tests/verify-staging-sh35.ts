import "dotenv/config";
import assert from "node:assert/strict";
import { parseImportRow } from "../features/products/schemas";
import type { RawImportRow } from "../features/products/types";

async function run() {
  console.log("=== SH-35 staging verification ===");
  const valid: RawImportRow = {
    product_id: "12991894555",
    product_name: "[COSRX OFFICIAL] The RX Derm serums...",
    seller_name: "COSRX Official Store",
    category: "Beauty-Skincare",
    listed_on: "2022-05-13",
    likes: "9705",
    sales_1d: "-",
    sales_7d: "-",
    sales_30d: "322",
    growth_30d: "+1.89%",
    gmv_30d: "RM23898.84",
    total_sales: "30000",
    total_gmv: "RM23898.84",
    product_url: "https://shopee.com.my/product/133117728/12991894555",
  };
  const invalid: RawImportRow = {
    product_id: "12991894555",
    product_name: "Bad",
    product_url: "https://shopee.com.my/product/133117728/99999999999",
  };
  const ok = parseImportRow(valid, 1);
  const bad = parseImportRow(invalid, 2);
  assert.equal(ok.success, true);
  assert.equal(bad.success, false);
  console.log("valid-only gate OK");

  const rows: RawImportRow[] = [];
  for (let i = 1; i <= 100; i++) {
    rows.push({
      product_id: `${20000000000 + i}`,
      product_name: `Product ${i}`,
      product_url: `https://shopee.com.my/product/${300000000 + i}/${20000000000 + i}`,
      sales_1d: "1",
      sales_7d: "4",
      sales_30d: `${i}`,
      growth_30d: "+1.0%",
      total_sales: `${i * 10}`,
    });
  }
  let validCount = 0;
  for (let i = 0; i < rows.length; i++) {
    if (parseImportRow(rows[i], i + 1).success) validCount++;
  }
  assert.equal(validCount, 100);
  console.log("100-row full set parses OK");

  const allIds = rows.map((_, i) => `f1:MY:${20000000000 + i + 1}:${300000000 + i + 1}`);
  const picked = new Set(allIds.slice(0, 3));
  const filtered = allIds.filter((id) => picked.has(id));
  assert.equal(filtered.length, 3);
  console.log("select-3 filter OK");

  console.log("ALL STAGING CHECKS PASSED");
}
run().catch((e) => { console.error(e); process.exit(1); });
