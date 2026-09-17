import "server-only";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/features/auth/data/session";
import {
  buildCatalogQueries,
  toDTO,
  type CatalogSqlRow,
} from "@/features/products/data/catalog-query";
import { catalogParamsSchema } from "@/features/products/schemas";
import type {
  CatalogBatchStamp,
  ListProductsResult,
} from "@/features/products/types";

export async function listProducts(input: unknown): Promise<ListProductsResult> {
  const filters = catalogParamsSchema.parse(input);
  await requireSession();

  const { rows, count } = buildCatalogQueries(filters);
  const [found, counted] = await Promise.all([
    prisma.$queryRaw<CatalogSqlRow[]>(rows),
    prisma.$queryRaw<Array<{ count: string }>>(count),
  ]);
  const total = Number(counted[0]?.count ?? 0);
  const pageCount = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  // Jepit halaman keluar jangkauan ke halaman terakhir yang valid.
  const page = pageCount === 0 ? 1 : Math.min(filters.page, pageCount);

  let effective = found;
  if (page !== filters.page) {
    const fixed = buildCatalogQueries({ ...filters, page });
    effective = await prisma.$queryRaw<CatalogSqlRow[]>(fixed.rows);
  }

  const latestBatch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, createdAt: true },
  });
  const batch: CatalogBatchStamp | null = latestBatch
    ? {
        id: latestBatch.id,
        fileName: latestBatch.fileName,
        createdAt: latestBatch.createdAt.toISOString(),
      }
    : null;

  return {
    rows: effective.map(toDTO),
    total,
    page,
    pageSize: filters.pageSize,
    pageCount,
    batch,
  };
}
