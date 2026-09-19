import "server-only";

import { requireSession } from "@/features/auth/data/session";
import {
  fetchBatchStamp,
  fetchCatalogCount,
  fetchCatalogRows,
} from "@/features/catalog/data/cached-catalog";
import {
  buildCatalogQueries,
  toDTO,
  type CatalogSqlRow,
} from "@/features/catalog/data/catalog-query";
import { prisma } from "@/lib/prisma";
import { catalogParamsSchema } from "@/features/catalog/schemas";
import type { ListProductsResult } from "@/features/catalog/types";

export async function listProducts(input: unknown): Promise<ListProductsResult> {
  const filters = catalogParamsSchema.parse(input);
  await requireSession();

  const [page, total, batch] = await Promise.all([
    fetchCatalogRows(filters),
    fetchCatalogCount(filters),
    fetchBatchStamp(),
  ]);
  const pageCount = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  // Jepit halaman keluar jangkauan ke halaman terakhir yang valid.
  const clamped = pageCount === 0 ? 1 : Math.min(page.normPage, pageCount);

  let rows = page.rows;
  if (clamped !== page.normPage) {
    const fixed = buildCatalogQueries({ ...filters, page: clamped });
    const found = await prisma.$queryRaw<CatalogSqlRow[]>(fixed.rows);
    rows = found.map(toDTO);
  }

  return {
    rows,
    total,
    page: clamped,
    pageSize: filters.pageSize,
    pageCount,
    batch,
  };
}
