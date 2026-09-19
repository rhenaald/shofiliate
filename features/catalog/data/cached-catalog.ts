import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  buildCatalogQueries,
  normalizeCatalogParams,
  toDTO,
  type CatalogSqlRow,
  type ResolvedCatalogFilters,
} from "@/features/catalog/data/catalog-query";
import type { CatalogBatchStamp } from "@/features/catalog/types";

export async function fetchCatalogRows(f: ResolvedCatalogFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `catalog-${f.region}`, `catalog-${f.view}`);
  const filters = normalizeCatalogParams(f);
  const { rows } = buildCatalogQueries(filters);
  const found = await prisma.$queryRaw<CatalogSqlRow[]>(rows);
  return {
    rows: found.map(toDTO),
    pageSize: filters.pageSize,
    normPage: filters.page,
  };
}

export async function fetchCatalogCount(f: ResolvedCatalogFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `catalog-${f.region}`, `catalog-${f.view}`);
  const filters = normalizeCatalogParams(f);
  const { count } = buildCatalogQueries(filters);
  const counted = await prisma.$queryRaw<Array<{ count: string }>>(count);
  return Number(counted[0]?.count ?? 0);
}

export async function fetchBatchStamp(): Promise<CatalogBatchStamp | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const latestBatch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, createdAt: true },
  });
  return latestBatch
    ? {
        id: latestBatch.id,
        fileName: latestBatch.fileName,
        createdAt: latestBatch.createdAt.toISOString(),
      }
    : null;
}
