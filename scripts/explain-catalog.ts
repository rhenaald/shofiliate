import "dotenv/config";
import { prisma } from "@/lib/prisma";

const checks = [
  ["name-ilike", `EXPLAIN SELECT "id" FROM "Product" WHERE "region" = 'MY'::"Region" AND "name" ILIKE '%cosrx%' LIMIT 25`],
  ["shop-ilike", `EXPLAIN SELECT "id" FROM "Product" WHERE "region" = 'MY'::"Region" AND "shopName" ILIKE '%official%' LIMIT 25`],
  ["mv-best", `EXPLAIN SELECT * FROM catalog_latest WHERE "region" = 'MY' ORDER BY "historicalSold" DESC, "pid" DESC LIMIT 25`],
  ["mv-trending", `EXPLAIN SELECT * FROM catalog_latest WHERE "region" = 'MY' AND "sales30d" >= 10 ORDER BY "sales30d" DESC, "growth30d" DESC, "pid" DESC LIMIT 25`],
];

async function main(): Promise<void> {
  for (const [label, sql] of checks) {
    const rows = await prisma.$queryRawUnsafe<Array<{ [k: string]: string }>>(sql);
    console.log(`--- ${label} ---`);
    for (const r of rows) console.log(Object.values(r).join(" "));
  }
  await prisma.$disconnect();
}

void main();
