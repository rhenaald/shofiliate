import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PinsSortId } from "@/features/pins/schemas";
import type { PinDTO, PinRegion } from "@/features/pins/types";

export interface ResolvedPinsFilters {
  region: PinRegion;
  q: string;
  page: number;
  pageSize: number;
  sort?: PinsSortId | undefined;
  dir: "asc" | "desc";
}

export interface PinSqlRow {
  pinId: string;
  productId: string;
  note: string | null;
  pinnedAt: Date;
  pinnedByName: string;
  pinnedByUsername: string | null;
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
  likes: number;
  sales30d: number;
  growth30d: number;
  totalSales: number;
  gmv30d: string;
  gmv30dRaw: unknown;
}

// ORDER BY selalu diakhiri pinId sebagai tiebreaker deterministik pagination.
const SORT_COLUMN_SQL: Record<PinsSortId, Prisma.Sql> = {
  name: Prisma.sql`board."name"`,
  likes: Prisma.sql`board."likes"`,
  sales30d: Prisma.sql`board."sales30d"`,
  growth30d: Prisma.sql`board."growth30d"`,
  totalSales: Prisma.sql`board."totalSales"`,
  // Urut pakai kolom numerik mentah (alias text hanya untuk output DTO).
  gmv30d: Prisma.sql`board."gmv30dRaw"`,
  listedOn: Prisma.sql`board."listedOn"`,
};

function resolveOrder(f: ResolvedPinsFilters): Prisma.Sql {
  // Default board: pin terbaru dulu.
  if (!f.sort) return Prisma.sql`board."pinnedAt" DESC, board."pinId" DESC`;
  const direction = f.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  // listedOn nullable: NULLS LAST di kedua arah agar "tak diketahui" tak ke atas.
  const nulls = f.sort === "listedOn" ? Prisma.sql` NULLS LAST` : Prisma.empty;
  return Prisma.sql`${SORT_COLUMN_SQL[f.sort]} ${direction}${nulls}, board."pinId" DESC`;
}

function pinsBoardQuery(f: ResolvedPinsFilters): Prisma.Sql {
  return Prisma.sql`
    SELECT
      pin."id" AS "pinId",
      pin."productId" AS "productId",
      pin."note" AS "note",
      pin."createdAt" AS "pinnedAt",
      u."name" AS "pinnedByName",
      u."username" AS "pinnedByUsername",
      p."region"::text AS "region",
      p."itemId", p."shopId", p."name", p."url",
      p."currency", p."shopName", p."category", p."listedOn",
      p."affiliateUrl",
      COALESCE(snap."komisiXtraRate", p."komisiXtraRate") AS "komisiXtraRate",
      COALESCE(snap."commissionLiveAmount", p."commissionLiveAmount")::text AS "commissionLiveAmount",
      COALESCE(snap."commissionSocialAmount", p."commissionSocialAmount")::text AS "commissionSocialAmount",
      COALESCE(snap."commissionVideoAmount", p."commissionVideoAmount")::text AS "commissionVideoAmount",
      COALESCE(snap."likedCount", 0) AS "likes",
      COALESCE(snap."sales30d", 0) AS "sales30d",
      COALESCE(snap."growth30d", 0) AS "growth30d",
      COALESCE(snap."historicalSold", 0) AS "totalSales",
      COALESCE(snap."gmv30d", 0)::text AS "gmv30d",
      COALESCE(snap."gmv30d", 0) AS "gmv30dRaw"
    FROM "Pin" pin
    JOIN "Product" p ON p."id" = pin."productId"
    JOIN "user" u ON u."id" = pin."pinnedById"
    LEFT JOIN LATERAL (
      SELECT
        s."likedCount", s."sales30d", s."growth30d", s."historicalSold",
        s."gmv30d", s."komisiXtraRate", s."commissionLiveAmount",
        s."commissionSocialAmount", s."commissionVideoAmount"
      FROM "ProductSnapshot" s
      WHERE s."productId" = p."id"
      ORDER BY s."scrapedAt" DESC, s."createdAt" DESC
      LIMIT 1
    ) snap ON true
    WHERE pin."unpinnedAt" IS NULL
      AND p."region" = CAST(${f.region} AS "Region")
      AND (
        ${f.q} = ''
        OR p."name" ILIKE '%' || ${f.q} || '%'
        OR p."shopName" ILIKE '%' || ${f.q} || '%'
      )
  `;
}

/** Diekspor agar logika SQL bisa diverifikasi tanpa session. */
export function buildPinsQueries(f: ResolvedPinsFilters): {
  rows: Prisma.Sql;
  count: Prisma.Sql;
} {
  const offset = (f.page - 1) * f.pageSize;
  const order = resolveOrder(f);
  const rows = Prisma.sql`
    SELECT * FROM (${pinsBoardQuery(f)}) AS board
    ORDER BY ${order}
    LIMIT ${f.pageSize} OFFSET ${offset}
  `;
  const count = Prisma.sql`
    SELECT COUNT(*)::text AS "count" FROM (${pinsBoardQuery(f)}) AS board
  `;
  return { rows, count };
}

export function toPinDTO(r: PinSqlRow): PinDTO {
  return {
    pinId: r.pinId,
    productId: r.productId,
    region: r.region as PinRegion,
    itemId: r.itemId,
    shopId: r.shopId,
    name: r.name,
    url: r.url,
    currency: r.currency,
    shopName: r.shopName === "" ? "-" : r.shopName,
    category: r.category === "" ? "-" : r.category,
    listedOn: r.listedOn ? r.listedOn.toISOString() : null,
    likes: r.likes,
    sales30d: r.sales30d,
    growth30d: r.growth30d,
    totalSales: r.totalSales,
    gmv30d: Number(r.gmv30d),
    affiliateUrl: r.affiliateUrl,
    komisiXtraRate: r.komisiXtraRate,
    commissionLiveAmount: r.commissionLiveAmount
      ? Number(r.commissionLiveAmount)
      : null,
    commissionSocialAmount: r.commissionSocialAmount
      ? Number(r.commissionSocialAmount)
      : null,
    commissionVideoAmount: r.commissionVideoAmount
      ? Number(r.commissionVideoAmount)
      : null,
    note: r.note,
    pinnedBy: {
      name: r.pinnedByName,
      username: r.pinnedByUsername,
    },
    pinnedAt: r.pinnedAt.toISOString(),
  };
}
