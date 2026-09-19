import "dotenv/config";
import assert from "node:assert/strict";
import type { StagingRow } from "../features/products/types";

async function run() {
  const sample: StagingRow = {
    product_id: "12991894555",
    product_name: "Sample",
    product_url: "https://shopee.com.my/product/133117728/12991894555",
    _stagingId: "file1:MY:12991894555:133117728",
    _fileId: "file1",
    _fileName: "test.json",
    _rowNumber: 1,
    _valid: true,
  };
  assert.equal(sample._valid, true);
  console.log("types OK");
}
run();
