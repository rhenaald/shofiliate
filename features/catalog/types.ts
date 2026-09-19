import type { CatalogSortId } from "@/features/catalog/schemas";

export type CatalogView = "all" | "best" | "trending";

export type CatalogRegion = "MY" | "SG" | "ID" | "TH" | "PH" | "VN";

/** Sort default per view. null = urutan bawaan view (all → scrapedAt desc). */
export const VIEW_DEFAULT_SORT: Record<
  CatalogView,
  { id: CatalogSortId; dir: "asc" | "desc" } | null
> = {
  all: null,
  best: { id: "totalSales", dir: "desc" },
  trending: { id: "sales30d", dir: "desc" },
};

/** Arah default saat kolom pertama kali diklik. */
export const SORT_DEFAULT_DIR: Record<CatalogSortId, "asc" | "desc"> = {
  name: "asc",
  likes: "desc",
  sales30d: "desc",
  growth30d: "desc",
  totalSales: "desc",
  gmv30d: "desc",
  listedOn: "desc",
};

/** Petakan id kolom UI → id sort server (kolom region/category/actions tak sortable). */
export const COLUMN_SORT_ID: Record<string, CatalogSortId> = {
  productName: "name",
  likes: "likes",
  sales30d: "sales30d",
  growth30d: "growth30d",
  totalSales: "totalSales",
  gmv30d: "gmv30d",
  listedOn: "listedOn",
};

// ---- Katalog server-driven ----
// DTO serializable lintas batas RSC → client (Decimal→number, Date→ISO string).

export interface CatalogProductDTO {
  id: string;
  region: CatalogRegion;
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  currency: string;
  shopName: string;
  category: string;
  listedOn: string | null;
  sales1d: number;
  sales7d: number;
  sales30d: number;
  growth30d: number;
  gmv30d: number;
  historicalSold: number;
  totalGmv: number;
  likedCount: number;
  scrapedAt: string;
  batchId: string | null;
  affiliateUrl: string | null;
  komisiXtraRate: number | null;
  commissionLiveAmount: number | null;
  commissionSocialAmount: number | null;
  commissionVideoAmount: number | null;
}

export interface CatalogBatchStamp {
  id: string;
  fileName: string;
  createdAt: string;
}

export interface ListProductsResult {
  rows: CatalogProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  batch: CatalogBatchStamp | null;
}

/** Baris katalog §9 dari snapshot terakhir. */
export interface CatalogRow {
  id: string;
  productId: string;
  name: string;
  url: string;
  currency: string;
  shopName: string;
  category: string;
  region: CatalogRegion;
  listedOn: string | null;
  likes: number;
  sales30d: number;
  growth30d: number;
  totalSales: number;
  gmv30d: number;
  affiliateUrl: string | null;
  komisiXtraRate: number | null;
  commissionLiveAmount: number | null;
  commissionSocialAmount: number | null;
  commissionVideoAmount: number | null;
}

export function dtoToCatalogRow(dto: CatalogProductDTO): CatalogRow {
  return {
    id: `${dto.region}-${dto.itemId}-${dto.shopId}`,
    productId: dto.id,
    name: dto.name,
    url: dto.url,
    currency: dto.currency,
    shopName: dto.shopName === "" ? "-" : dto.shopName,
    category: dto.category === "" ? "-" : dto.category,
    region: dto.region,
    listedOn: dto.listedOn ? dto.listedOn.slice(0, 10) : null,
    likes: dto.likedCount,
    sales30d: dto.sales30d,
    growth30d: dto.growth30d,
    totalSales: dto.historicalSold,
    gmv30d: dto.gmv30d,
    affiliateUrl: dto.affiliateUrl,
    komisiXtraRate: dto.komisiXtraRate,
    commissionLiveAmount: dto.commissionLiveAmount,
    commissionSocialAmount: dto.commissionSocialAmount,
    commissionVideoAmount: dto.commissionVideoAmount,
  };
}
