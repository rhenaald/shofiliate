import type { PinsSortId } from "@/features/pins/schemas";

export type PinRegion = "MY" | "SG" | "ID" | "TH" | "PH" | "VN";

/** Arah default saat kolom pertama kali diklik (paritas katalog). */
export const PINS_SORT_DEFAULT_DIR: Record<PinsSortId, "asc" | "desc"> = {
  name: "asc",
  likes: "desc",
  sales30d: "desc",
  growth30d: "desc",
  totalSales: "desc",
  gmv30d: "desc",
  listedOn: "desc",
};

/** Petakan id kolom UI → id sort server (kolom pin tak sortable). */
export const PIN_COLUMN_SORT_ID: Record<string, PinsSortId> = {
  productName: "name",
  likes: "likes",
  sales30d: "sales30d",
  growth30d: "growth30d",
  totalSales: "totalSales",
  gmv30d: "gmv30d",
  listedOn: "listedOn",
};

// ---- Pins server-driven ----
// DTO serializable lintas batas RSC → client (Decimal→number, Date→ISO).
// Metrik berasal dari snapshot terakhir (LEFT JOIN: produk manual tanpa
// snapshot mendapat 0/null), komisi COALESCE(snapshot, product) ala katalog.

export interface PinDTO {
  pinId: string;
  productId: string;
  region: PinRegion;
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  currency: string;
  shopName: string;
  category: string;
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
  note: string | null;
  pinnedBy: {
    name: string;
    username: string | null;
  };
  pinnedAt: string; // ISO
}

export interface ListPinsResult {
  rows: PinDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface PinsProgress {
  count: number;
  target: number;
}
