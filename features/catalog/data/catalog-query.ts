import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { CatalogSortId } from "@/features/catalog/schemas";
import type {
  CatalogProductDTO,
  CatalogRegion,
  CatalogView,
} from "@/features/catalog/types";

export interface ResolvedCatalogFilters {
  view: CatalogView;
  region: CatalogRegion;
  q: string;
  page: number;
  pageSize: number;
  sort?: CatalogSortId | undefined;
  dir: "asc" | "desc";
}

export interface CatalogSqlRow {
  productId: string;
  sales1d: number;
  sales7d: number;
  sales30d: number;
  growth30d: number;
  gmv30d: string;
  gmv30dRaw: unknown;
  historicalSold: number;
  totalGmv: string;
  likedCount: number;
  scrapedAt: Date;
  batchId: string | null;
  pid: string;
  region: string;
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  currency: string;
  shopName: string;
  category: string;
  listedOn: Date | null;
  affiliateUrl: string | null;
  komisiXtraRate: number | null;
  commissionLiveAmount: string | null;
  commissionSocialAmount: string | null;
  commissionVideoAmount: string | null;
}

// D-01: trending = sales30d >= 10 (bukan null-check, konsekuensi "-"→0 di SH-5).
// ORDER BY selalu diakhiri productId sebagai tiebreaker deterministik pagination.
const VIEW_CONDITION: Record<CatalogView, Prisma.Sql> = {
  all: Prisma.empty,
  best: Prisma.empty,
  trending: Prisma.sql`WHERE latest."sales30d" >= 10`,
};

const VIEW_ORDER: Record<CatalogView, Prisma.Sql> = {
  all: Prisma.sql`latest."scrapedAt" DESC, latest."productId" DESC`,
  best: Prisma.sql`latest."historicalSold" DESC, latest."productId" DESC`,
  trending: Prisma.sql`latest."sales30d" DESC, latest."growth30d" DESC, latest."productId" DESC`,
};

const SORT_COLUMN_SQL: Record<CatalogSortId, Prisma.Sql> = {
  name: Prisma.sql`latest."name"`,
  likes: Prisma.sql`latest."likedCount"`,
  sales30d: Prisma.sql`latest."sales30d"`,
  growth30d: Prisma.sql`latest."growth30d"`,
  totalSales: Prisma.sql`latest."historicalSold"`,
  // Urut pakai kolom numerik mentah (alias text hanya untuk output DTO).
  gmv30d: Prisma.sql`latest."gmv30dRaw"`,
  listedOn: Prisma.sql`latest."listedOn"`,
};

function resolveOrder(f: ResolvedCatalogFilters): Prisma.Sql {
  if (!f.sort) return VIEW_ORDER[f.view];
  const direction = f.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  // listedOn nullable: NULLS LAST di kedua arah agar "tak diketahui" tak ke atas.
  const nulls = f.sort === "listedOn" ? Prisma.sql` NULLS LAST` : Prisma.empty;
  return Prisma.sql`${SORT_COLUMN_SQL[f.sort]} ${direction}${nulls}, latest."productId" DESC`;
}

function latestSnapshotQuery(f: ResolvedCatalogFilters): Prisma.Sql {
  return Prisma.sql`
    SELECT DISTINCT ON (s."productId")
      s."productId",
      s."sales1d", s."sales7d", s."sales30d", s."growth30d",
      s."gmv30d"::text AS "gmv30d",
      s."gmv30d" AS "gmv30dRaw",
      s."historicalSold",
      s."totalGmv"::text AS "totalGmv",
      s."likedCount", s."scrapedAt", s."batchId",
      p."id" AS "pid",
      p."region"::text AS "region",
      p."itemId", p."shopId", p."name", p."url",
      p."currency", p."shopName", p."category", p."listedOn",
      p."affiliateUrl",
      COALESCE(s."komisiXtraRate", p."komisiXtraRate") AS "komisiXtraRate",
      COALESCE(s."commissionLiveAmount", p."commissionLiveAmount")::text AS "commissionLiveAmount",
      COALESCE(s."commissionSocialAmount", p."commissionSocialAmount")::text AS "commissionSocialAmount",
      COALESCE(s."commissionVideoAmount", p."commissionVideoAmount")::text AS "commissionVideoAmount"
    FROM "ProductSnapshot" s
    JOIN "Product" p ON p."id" = s."productId"
    WHERE p."region" = CAST(${f.region} AS "Region")
      AND (
        ${f.q} = ''
        OR p."name" ILIKE '%' || ${f.q} || '%'
        OR p."shopName" ILIKE '%' || ${f.q} || '%'
      )
    ORDER BY s."productId", s."scrapedAt" DESC, s."createdAt" DESC
  `;
}

/** Diekspor agar logika SQL bisa diverifikasi tanpa session. */
export function buildCatalogQueries(f: ResolvedCatalogFilters): {
  rows: Prisma.Sql;
  count: Prisma.Sql;
} {
  const offset = (f.page - 1) * f.pageSize;
  const order = resolveOrder(f);
  const rows = Prisma.sql`
    SELECT * FROM (${latestSnapshotQuery(f)}) AS latest
    ${VIEW_CONDITION[f.view]}
    ORDER BY ${order}
    LIMIT ${f.pageSize} OFFSET ${offset}
  `;
  const count = Prisma.sql`
    SELECT COUNT(*)::text AS "count" FROM (${latestSnapshotQuery(f)}) AS latest
    ${VIEW_CONDITION[f.view]}
  `;
  return { rows, count };
}

export function toDTO(r: CatalogSqlRow): CatalogProductDTO {
  return {
    id: r.pid,
    region: r.region as CatalogRegion,
    itemId: r.itemId,
    shopId: r.shopId,
    name: r.name,
    url: r.url,
    currency: r.currency,
    shopName: r.shopName,
    category: r.category,
    listedOn: r.listedOn ? r.listedOn.toISOString() : null,
    sales1d: r.sales1d,
    sales7d: r.sales7d,
    sales30d: r.sales30d,
    growth30d: r.growth30d,
    gmv30d: Number(r.gmv30d),
    historicalSold: r.historicalSold,
    totalGmv: Number(r.totalGmv),
    likedCount: r.likedCount,
    scrapedAt: r.scrapedAt.toISOString(),
    batchId: r.batchId,
    affiliateUrl: r.affiliateUrl,
    komisiXtraRate: r.komisiXtraRate,
    commissionLiveAmount: r.commissionLiveAmount ? Number(r.commissionLiveAmount) : null,
    commissionSocialAmount: r.commissionSocialAmount ? Number(r.commissionSocialAmount) : null,
    commissionVideoAmount: r.commissionVideoAmount ? Number(r.commissionVideoAmount) : null,
  };
}
