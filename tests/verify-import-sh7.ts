import "dotenv/config";

import assert from "node:assert/strict";

import {
  parseCurrencyAndAmount,
  parseFloatGrowth,
  parseImportRow,
  parseIntegerSafe,
  parseRatingSafe,
} from "../features/products/schemas";
import type { RawImportRow } from "../features/products/types";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("=== 1. Testing parseIntegerSafe, parseFloatGrowth & parseRatingSafe ===");
  assert.equal(parseIntegerSafe("-"), 0);
  assert.equal(parseIntegerSafe(null), 0);
  assert.equal(parseIntegerSafe(undefined), 0);
  assert.equal(parseIntegerSafe("9705"), 9705);
  assert.equal(parseIntegerSafe("1,234"), 1234);

  assert.equal(parseFloatGrowth("+1.89%"), 1.89);
  assert.equal(parseFloatGrowth("-43.75%"), -43.75);
  assert.equal(parseFloatGrowth("-"), 0);
  assert.equal(parseFloatGrowth(null), 0);

  assert.equal(parseRatingSafe("4.8"), 4.8);
  assert.equal(parseRatingSafe("4,9"), 4.9);
  assert.equal(parseRatingSafe("⭐ 4.7"), 4.7);
  assert.equal(parseRatingSafe(4.8), 4.8);
  assert.equal(parseRatingSafe(48), 4.8);
  assert.equal(parseRatingSafe("-"), null);
  assert.equal(parseRatingSafe(null), null);
  assert.equal(parseRatingSafe(undefined), null);
  console.log("✓ Integer, Growth & Rating parsing OK");

  console.log("\n=== 2. Testing Currency & Amount parsing ===");
  const gmvMY = parseCurrencyAndAmount("RM23898.84", "MY");
  assert.equal(gmvMY.currency, "MYR");
  assert.equal(gmvMY.amount, 23898.84);

  const gmvSG = parseCurrencyAndAmount("S$120.50", "SG");
  assert.equal(gmvSG.currency, "SGD");
  assert.equal(gmvSG.amount, 120.5);

  const gmvID = parseCurrencyAndAmount("Rp500,000", "ID");
  assert.equal(gmvID.currency, "IDR");
  assert.equal(gmvID.amount, 500000);
  console.log("✓ Currency & Amount parsing OK");

  console.log("\n=== 3. Testing 2 COSRX actual rows from PRD §6 F1 ===");
  const cosrx1: RawImportRow = {
    product_id: "12991894555",
    product_name: "[COSRX OFFICIAL] The RX Derm serums...",
    seller_name: "COSRX Official Store",
    category: "Beauty-Skincare-Facial Serum & Essence",
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
    rating: "4.8",
  };

  const parsed1 = parseImportRow(cosrx1, 1);
  assert.equal(parsed1.success, true);
  if (parsed1.success) {
    assert.equal(parsed1.data.itemId, "12991894555");
    assert.equal(parsed1.data.shopId, "133117728");
    assert.equal(parsed1.data.region, "MY");
    assert.equal(parsed1.data.currency, "MYR");
    assert.equal(parsed1.data.sales1d, 0);
    assert.equal(parsed1.data.sales30d, 322);
    assert.equal(parsed1.data.growth30d, 1.89);
    assert.equal(parsed1.data.gmv30d, 23898.84);
    assert.equal(parsed1.data.historicalSold, 30000);
    assert.equal(parsed1.data.rating, 4.8);
  }

  const cosrx2: RawImportRow = {
    product_id: "21192726313",
    product_name: "COSRX The Vitamin C 13 Serum 20ml",
    seller_name: "GLAMPICK x COSRX Store",
    category: "Beauty-Skincare-Facial Serum & Essence",
    listed_on: "2023-09-04",
    likes: "290",
    sales_1d: "1",
    sales_7d: "4",
    sales_30d: "19",
    growth_30d: "-43.75%",
    gmv_30d: "RM1214.10",
    total_sales: "1000",
    total_gmv: "RM1214.10",
    product_url: "https://shopee.com.my/product/1060326459/21192726313",
  };

  const parsed2 = parseImportRow(cosrx2, 2);
  assert.equal(parsed2.success, true);
  if (parsed2.success) {
    assert.equal(parsed2.data.itemId, "21192726313");
    assert.equal(parsed2.data.shopId, "1060326459");
    assert.equal(parsed2.data.region, "MY");
    assert.equal(parsed2.data.currency, "MYR");
    assert.equal(parsed2.data.growth30d, -43.75);
    assert.equal(parsed2.data.gmv30d, 1214.1);
  }
  console.log("✓ COSRX fixture rows parsed accurately");

  console.log("\n=== 4. Testing mismatch product_id vs URL ===");
  const mismatchRow: RawImportRow = {
    product_id: "12991894555",
    product_name: "Test Mismatch Product",
    product_url: "https://shopee.com.my/product/133117728/99999999999",
  };
  const parsedMismatch = parseImportRow(mismatchRow, 3);
  assert.equal(parsedMismatch.success, false);
  if (!parsedMismatch.success) {
    assert.equal(parsedMismatch.error.field, "product_url");
    assert.match(parsedMismatch.error.reason, /mismatch/i);
  }
  console.log("✓ Mismatch product_id vs URL rejected into failed");

  console.log("\n=== 5. Testing 350-row batch benchmark ===");
  // Create 350 rows:
  // - 325 valid unique rows
  // - 20 duplicate rows (repeating valid items within batch)
  // - 5 failed rows (broken URL or mismatch)
  const rows: RawImportRow[] = [];

  for (let i = 1; i <= 325; i++) {
    const domain = i % 2 === 0 ? "shopee.com.my" : "shopee.sg";
    const currencyPrefix = i % 2 === 0 ? "RM" : "S$";
    rows.push({
      product_id: `${10000000000 + i}`,
      product_name: `Test Benchmark Product ${i}`,
      seller_name: `Store ${i}`,
      category: "Category-Subcategory",
      listed_on: "2024-01-01",
      likes: `${i * 10}`,
      sales_1d: i % 3 === 0 ? "-" : "5",
      sales_7d: "20",
      sales_30d: `${i * 2}`,
      growth_30d: "+5.0%",
      gmv_30d: `${currencyPrefix}${i * 100}.00`,
      total_sales: `${i * 50}`,
      total_gmv: `${currencyPrefix}${i * 100}.00`,
      product_url: `https://${domain}/product/${200000000 + (i % 50)}/${10000000000 + i}`,
    });
  }

  // 20 duplicates (duplicate rows 1 to 20)
  for (let i = 1; i <= 20; i++) {
    rows.push({ ...rows[i - 1] });
  }

  // 5 failed rows
  // 1: missing product_id
  rows.push({
    product_id: "",
    product_name: "Failed No ID",
    product_url: "https://shopee.com.my/product/123/456",
  });
  // 2: mismatch URL
  rows.push({
    product_id: "88888888888",
    product_name: "Failed Mismatch",
    product_url: "https://shopee.com.my/product/123/77777777777",
  });
  // 3: invalid URL pattern
  rows.push({
    product_id: "99999999991",
    product_name: "Failed Invalid URL",
    product_url: "https://google.com/some/url",
  });
  // 4: empty product_name
  rows.push({
    product_id: "99999999992",
    product_name: "   ",
    product_url: "https://shopee.com.my/product/123/99999999992",
  });
  // 5: product_id contains letters
  rows.push({
    product_id: "ABC12345",
    product_name: "Failed Non-digit ID",
    product_url: "https://shopee.com.my/product/123/ABC12345",
  });

  assert.equal(rows.length, 350);

  // Test row-level parsing and duplicate counting logic
  const seen = new Set<string>();
  let countFailed = 0;
  let countDuplicates = 0;
  let countImported = 0;
  const errors: unknown[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx];
    const parsed = parseImportRow(raw, idx + 1);
    if (!parsed.success) {
      countFailed++;
      errors.push(parsed.error);
      continue;
    }

    const key = `${parsed.data.region}:${parsed.data.itemId}:${parsed.data.shopId}`;
    if (seen.has(key)) {
      countDuplicates++;
      continue;
    }

    seen.add(key);
    countImported++;
  }

  console.log(`Results on 350 rows:
    Total: ${rows.length}
    Imported: ${countImported}
    Duplicates: ${countDuplicates}
    Failed: ${countFailed}`);

  assert.equal(countImported, 325);
  assert.equal(countDuplicates, 20);
  assert.equal(countFailed, 5);
  assert.equal(countImported + countDuplicates + countFailed, 350);
  console.log("✓ 350 rows benchmark passed with exact: 325 imported, 20 duplicates, 5 failed!");

  console.log("\n=== 6. Testing Batch Stamp query ===");
  const latestBatch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
  });
  console.log("Latest batch in DB:", latestBatch ? `#${latestBatch.id.slice(-6)} (${latestBatch.fileName})` : "None");

  console.log("\nALL TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
