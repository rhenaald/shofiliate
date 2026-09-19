"use server";

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireSession } from "@/features/auth/data/session";
import { parseImportRow } from "@/features/products/schemas";
import type {
  ImportBatchResult,
  ImportRowError,
  ParsedProductRow,
  RawImportRow,
} from "@/features/products/types";
import { prisma } from "@/lib/prisma";

export async function importProducts(params: {
  fileName: string;
  rows: RawImportRow[];
}): Promise<ImportBatchResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const fileName = params.fileName?.trim() || "extension-import.json";
  const rows = Array.isArray(params.rows) ? params.rows : [];
  const totalRows = rows.length;

  const batch = await prisma.importBatch.create({
    data: {
      importedById: userId,
      fileName,
      totalRows,
      imported: 0,
      updated: 0,
      duplicates: 0,
      failed: 0,
    },
  });

  const errors: ImportRowError[] = [];
  const validRows: ParsedProductRow[] = [];
  let duplicates = 0;
  let failed = 0;

  // Track duplicates within this batch
  const seenInBatch = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = i + 1;
    const result = parseImportRow(raw, rowNumber);

    if (!result.success) {
      failed++;
      errors.push(result.error);
      continue;
    }

    const rowData = result.data;
    const key = `${rowData.region}:${rowData.itemId}:${rowData.shopId}`;

    if (seenInBatch.has(key)) {
      duplicates++;
      continue;
    }

    seenInBatch.add(key);
    validRows.push(rowData);
  }

  // Look up existing products in DB
  const validItemIds = Array.from(new Set(validRows.map((r) => r.itemId)));
  const existingProducts = validItemIds.length > 0
    ? await prisma.product.findMany({
        where: { itemId: { in: validItemIds } },
      })
    : [];

  const existingMap = new Map<string, (typeof existingProducts)[number]>();
  for (const p of existingProducts) {
    existingMap.set(`${p.region}:${p.itemId}:${p.shopId}`, p);
  }

  // Partition validRows into newRows and updateRows
  const newRows: ParsedProductRow[] = [];
  const updateRows: Array<{ row: ParsedProductRow; existingId: string }> = [];

  for (const row of validRows) {
    const key = `${row.region}:${row.itemId}:${row.shopId}`;
    const existing = existingMap.get(key);

    if (existing) {
      updateRows.push({ row, existingId: existing.id });
    } else {
      newRows.push(row);
    }
  }

  // 1. Bulk insert new products in a single roundtrip using createManyAndReturn
  const createdProducts =
    newRows.length > 0
      ? await prisma.product.createManyAndReturn({
          data: newRows.map((row) => ({
            region: row.region,
            itemId: row.itemId,
            shopId: row.shopId,
            name: row.name,
            url: row.url,
            currency: row.currency,
            shopName: row.shopName,
            category: row.category,
            listedOn: row.listedOn,
            needsRegion: row.needsRegion,
            affiliateUrl: row.affiliateUrl,
            commissionRate: row.commissionRate,
            commissionAmount: row.commissionAmount,
            commissionLiveRate: row.commissionLiveRate,
            commissionLiveAmount: row.commissionLiveAmount,
            commissionSocialRate: row.commissionSocialRate,
            commissionSocialAmount: row.commissionSocialAmount,
            commissionVideoRate: row.commissionVideoRate,
            commissionVideoAmount: row.commissionVideoAmount,
            hasKomisiXtra: row.hasKomisiXtra,
            komisiXtraRate: row.komisiXtraRate,
            komisiXtraAmount: row.komisiXtraAmount,
            addedById: userId,
          })),
          select: {
            id: true,
            region: true,
            itemId: true,
            shopId: true,
          },
        })
      : [];

  const createdMap = new Map<string, string>();
  for (const p of createdProducts) {
    createdMap.set(`${p.region}:${p.itemId}:${p.shopId}`, p.id);
  }

  // 2. Bulk insert product contributors
  if (createdProducts.length > 0) {
    await prisma.productContributor.createMany({
      data: createdProducts.map((p) => ({
        productId: p.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  // 3. Updates for existing products (chunked in parallel Promise.all to avoid transaction timeout)
  if (updateRows.length > 0) {
    const UPDATE_CHUNK_SIZE = 15;
    for (let i = 0; i < updateRows.length; i += UPDATE_CHUNK_SIZE) {
      const chunk = updateRows.slice(i, i + UPDATE_CHUNK_SIZE);
      await Promise.all(
        chunk.map(({ row, existingId }) =>
          prisma.product.update({
            where: { id: existingId },
            data: {
              name: row.name,
              url: row.url,
              currency: row.currency,
              shopName: row.shopName,
              category: row.category,
              listedOn: row.listedOn,
              needsRegion: row.needsRegion,
              ...(row.affiliateUrl ? { affiliateUrl: row.affiliateUrl } : {}),
              ...(row.commissionRate !== null ? { commissionRate: row.commissionRate } : {}),
              ...(row.commissionAmount !== null ? { commissionAmount: row.commissionAmount } : {}),
              ...(row.commissionLiveRate !== null ? { commissionLiveRate: row.commissionLiveRate } : {}),
              ...(row.commissionLiveAmount !== null ? { commissionLiveAmount: row.commissionLiveAmount } : {}),
              ...(row.commissionSocialRate !== null ? { commissionSocialRate: row.commissionSocialRate } : {}),
              ...(row.commissionSocialAmount !== null ? { commissionSocialAmount: row.commissionSocialAmount } : {}),
              ...(row.commissionVideoRate !== null ? { commissionVideoRate: row.commissionVideoRate } : {}),
              ...(row.commissionVideoAmount !== null ? { commissionVideoAmount: row.commissionVideoAmount } : {}),
              hasKomisiXtra: row.hasKomisiXtra,
              ...(row.komisiXtraRate !== null ? { komisiXtraRate: row.komisiXtraRate } : {}),
              ...(row.komisiXtraAmount !== null ? { komisiXtraAmount: row.komisiXtraAmount } : {}),
            },
          })
        )
      );
    }
  }

  // 4. Bulk insert ALL snapshots for this batch in chunks
  const allSnapshotData: Array<{
    productId: string;
    batchId: string;
    sales1d: number;
    sales7d: number;
    sales30d: number;
    growth30d: number;
    gmv30d: number;
    historicalSold: number;
    totalGmv: number;
    likedCount: number;
    commissionRate: number | null;
    commissionAmount: number | null;
    commissionLiveRate: number | null;
    commissionLiveAmount: number | null;
    commissionSocialRate: number | null;
    commissionSocialAmount: number | null;
    commissionVideoRate: number | null;
    commissionVideoAmount: number | null;
    hasKomisiXtra: boolean;
    komisiXtraRate: number | null;
    komisiXtraAmount: number | null;
  }> = [];

  for (const row of newRows) {
    const productId = createdMap.get(`${row.region}:${row.itemId}:${row.shopId}`);
    if (productId) {
      allSnapshotData.push({
        productId,
        batchId: batch.id,
        sales1d: row.sales1d,
        sales7d: row.sales7d,
        sales30d: row.sales30d,
        growth30d: row.growth30d,
        gmv30d: row.gmv30d,
        historicalSold: row.historicalSold,
        totalGmv: row.totalGmv,
        likedCount: row.likes,
        commissionRate: row.commissionRate,
        commissionAmount: row.commissionAmount,
        commissionLiveRate: row.commissionLiveRate,
        commissionLiveAmount: row.commissionLiveAmount,
        commissionSocialRate: row.commissionSocialRate,
        commissionSocialAmount: row.commissionSocialAmount,
        commissionVideoRate: row.commissionVideoRate,
        commissionVideoAmount: row.commissionVideoAmount,
        hasKomisiXtra: row.hasKomisiXtra,
        komisiXtraRate: row.komisiXtraRate,
        komisiXtraAmount: row.komisiXtraAmount,
      });
    }
  }

  for (const { row, existingId } of updateRows) {
    allSnapshotData.push({
      productId: existingId,
      batchId: batch.id,
      sales1d: row.sales1d,
      sales7d: row.sales7d,
      sales30d: row.sales30d,
      growth30d: row.growth30d,
      gmv30d: row.gmv30d,
      historicalSold: row.historicalSold,
      totalGmv: row.totalGmv,
      likedCount: row.likes,
      commissionRate: row.commissionRate,
      commissionAmount: row.commissionAmount,
      commissionLiveRate: row.commissionLiveRate,
      commissionLiveAmount: row.commissionLiveAmount,
      commissionSocialRate: row.commissionSocialRate,
      commissionSocialAmount: row.commissionSocialAmount,
      commissionVideoRate: row.commissionVideoRate,
      commissionVideoAmount: row.commissionVideoAmount,
      hasKomisiXtra: row.hasKomisiXtra,
      komisiXtraRate: row.komisiXtraRate,
      komisiXtraAmount: row.komisiXtraAmount,
    });
  }

  if (allSnapshotData.length > 0) {
    const SNAPSHOT_CHUNK_SIZE = 250;
    for (let i = 0; i < allSnapshotData.length; i += SNAPSHOT_CHUNK_SIZE) {
      const chunk = allSnapshotData.slice(i, i + SNAPSHOT_CHUNK_SIZE);
      await prisma.productSnapshot.createMany({
        data: chunk,
      });
    }
  }

  // Move latest-pointer to this batch's snapshots (new + updated).
  if (allSnapshotData.length > 0) {
    const ids = allSnapshotData.map((s) => s.productId);
    const fresh = await prisma.productSnapshot.findMany({
      where: { productId: { in: ids }, batchId: batch.id },
      select: { id: true, productId: true },
    });
    const PTR_CHUNK = 100;
    for (let i = 0; i < fresh.length; i += PTR_CHUNK) {
      await Promise.all(
        fresh.slice(i, i + PTR_CHUNK).map((s) =>
          prisma.product.update({
            where: { id: s.productId },
            data: { latestSnapshotId: s.id },
          }),
        )
      );
    }
  }

  const imported = createdProducts.length;
  const updated = updateRows.length;

  // Update batch final counters
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      imported,
      updated,
      duplicates,
      failed,
    },
  });

  // MV refresh must run outside any transaction so readers keep old snapshot.
  await prisma.$executeRawUnsafe(
    `REFRESH MATERIALIZED VIEW CONCURRENTLY catalog_latest`
  );

  const touchedRegions = Array.from(new Set(validRows.map((r) => r.region)));
  for (const region of touchedRegions) {
    revalidateTag(`catalog-${region}`, "max");
  }
  revalidatePath("/dashboard/products/import");

  return {
    batchId: batch.id,
    fileName,
    totalRows,
    imported,
    updated,
    duplicates,
    failed,
    errors,
  };
}
