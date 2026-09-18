export type PinRegion = "MY" | "SG" | "ID" | "TH" | "PH" | "VN";

// ---- Pins server-driven ----
// DTO serializable lintas batas RSC → client (Date→ISO string).
// REQ-001: tidak ada Date/Decimal mentah di tipe ini.

export interface PinDTO {
  pinId: string;
  productId: string;
  region: PinRegion;
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  shopName: string;
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
