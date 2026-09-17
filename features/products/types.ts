export type RawImportRow = {
  product_id?: string | number | null;
  product_name?: string | null;
  seller_name?: string | null;
  category?: string | null;
  listed_on?: string | null;
  likes?: string | number | null;
  sales_1d?: string | number | null;
  sales_7d?: string | number | null;
  sales_30d?: string | number | null;
  growth_30d?: string | number | null;
  gmv_30d?: string | number | null;
  total_sales?: string | number | null;
  total_gmv?: string | number | null;
  product_url?: string | null;
  url?: string | null;
  [key: string]: unknown;
};

export type RegionCode = "MY" | "SG" | "ID" | "TH" | "PH" | "VN";

export type ParsedProductRow = {
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  region: RegionCode;
  currency: string;
  shopName: string;
  category: string;
  listedOn: Date | null;
  needsRegion: boolean;
  likes: number;
  sales1d: number;
  sales7d: number;
  sales30d: number;
  growth30d: number;
  gmv30d: number;
  historicalSold: number;
  totalGmv: number;
};

export type ImportRowError = {
  row: number;
  itemId?: string;
  field: string;
  reason: string;
};

export type ImportBatchResult = {
  batchId: string;
  fileName: string;
  totalRows: number;
  imported: number;
  updated: number;
  duplicates: number;
  failed: number;
  errors: ImportRowError[];
};

export type ImportPreviewData = {
  totalRows: number;
  dashCounts: Record<string, number>;
  previewRows: ParsedProductRow[];
  previewErrors: ImportRowError[];
};
