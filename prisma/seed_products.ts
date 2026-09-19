// Fixture seed: 2 baris COSRX aktual (PRD §6 F1) → 2 Product + 2 Snapshot + 1 Batch.
// Idempoten: aman dijalankan berulang (upsert product, skip snapshot yang sudah ada).
// Cara jalan: pnpm dlx tsx --conditions=react-server prisma/seed_products.ts
// Prasyarat: user dev sudah ada (jalankan `pnpm db:seed:dev` dulu bila error).
import "dotenv/config";

import { prisma } from "@/lib/prisma";

const BATCH_FILE = "cosrx-fixture.json";

type FixtureRow = {
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  shopName: string;
  category: string;
  listedOn: string;
  likedCount: number;
  sales1d: number;
  sales7d: number;
  sales30d: number;
  growth30d: number;
  gmv30d: number;
  historicalSold: number;
  totalGmv: number;
};

const ROWS: FixtureRow[] = [
  {
    itemId: "12991894555",
    shopId: "133117728",
    name: "[COSRX OFFICIAL] The RX Derm serums, The Niacinamide 15 20ml, The Vitamin C 23 20g, The Hyaluronic 3 20ml",
    url: "https://shopee.com.my/product/133117728/12991894555",
    shopName: "COSRX Official Store",
    category: "Beauty-Skincare-Facial Serum & Essence",
    listedOn: "2022-05-13",
    likedCount: 9705,
    sales1d: 0, // "-" → 0
    sales7d: 0, // "-" → 0
    sales30d: 322,
    growth30d: 1.89, // "+1.89%"
    gmv30d: 23898.84, // "RM23898.84" → MYR
    historicalSold: 30000,
    totalGmv: 23898.84,
  },
  {
    itemId: "21192726313",
    shopId: "1060326459",
    name: "COSRX The Vitamin C 13 Serum 20ml",
    url: "https://shopee.com.my/product/1060326459/21192726313",
    shopName: "GLAMPICK x COSRX Store",
    category: "Beauty-Skincare-Facial Serum & Essence",
    listedOn: "2023-09-04",
    likedCount: 290,
    sales1d: 1,
    sales7d: 4,
    sales30d: 19,
    growth30d: -43.75, // "-43.75%"
    gmv30d: 1214.1, // "RM1214.10" → MYR
    historicalSold: 1000,
    totalGmv: 1214.1,
  },
];

async function main() {
  const owner =
    (await prisma.user.findFirst({ where: { username: "streamer1" } })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!owner) {
    throw new Error('No user found. Run "pnpm db:seed:dev" first to seed dev users.');
  }

  let batch = await prisma.importBatch.findFirst({ where: { fileName: BATCH_FILE } });
  if (!batch) {
    batch = await prisma.importBatch.create({
      data: { importedById: owner.id, fileName: BATCH_FILE, totalRows: ROWS.length },
    });
  }

  let productsCreated = 0;
  let snapshotsCreated = 0;
  for (const row of ROWS) {
    const existing = await prisma.product.findUnique({
      where: { region_itemId_shopId: { region: "MY", itemId: row.itemId, shopId: row.shopId } },
    });
    const product = await prisma.product.upsert({
      where: { region_itemId_shopId: { region: "MY", itemId: row.itemId, shopId: row.shopId } },
      update: {
        name: row.name,
        url: row.url,
        currency: "MYR",
        shopName: row.shopName,
        category: row.category,
        listedOn: new Date(row.listedOn),
      },
      create: {
        region: "MY",
        itemId: row.itemId,
        shopId: row.shopId,
        name: row.name,
        url: row.url,
        currency: "MYR",
        shopName: row.shopName,
        category: row.category,
        listedOn: new Date(row.listedOn),
        addedById: owner.id,
      },
    });
    if (!existing) productsCreated += 1;

    const snapshotExists = await prisma.productSnapshot.findFirst({
      where: { productId: product.id, batchId: batch.id },
    });
    if (!snapshotExists) {
      await prisma.productSnapshot.create({
        data: {
          productId: product.id,
          batchId: batch.id,
          sales1d: row.sales1d,
          sales7d: row.sales7d,
          sales30d: row.sales30d,
          growth30d: row.growth30d,
          gmv30d: row.gmv30d,
          historicalSold: row.historicalSold,
          totalGmv: row.totalGmv,
          likedCount: row.likedCount,
        },
      });
      snapshotsCreated += 1;
    }

    await prisma.productContributor.upsert({
      where: { productId_userId: { productId: product.id, userId: owner.id } },
      update: {},
      create: { productId: product.id, userId: owner.id },
    });
  }

  const snapshotCount = await prisma.productSnapshot.count({ where: { batchId: batch.id } });
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { totalRows: ROWS.length, imported: snapshotCount, updated: 0, duplicates: 0, failed: 0 },
  });

  const productCount = await prisma.product.count({
    where: { itemId: { in: ROWS.map((r) => r.itemId) } },
  });
  console.log(
    `[seed:products] owner=${owner.username ?? owner.email} batch=${BATCH_FILE} ` +
      `products=${productCount} (new=${productsCreated}) snapshots=${snapshotCount} (new=${snapshotsCreated})`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
