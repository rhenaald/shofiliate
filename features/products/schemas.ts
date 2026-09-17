import { z } from "zod";

// D-01: trending = sales30d >= 10 (bukan null-check, konsekuensi "-"→0 di SH-5).
// Setiap field memakai .catch agar satu param invalid tidak menjatuhkan
// param valid lainnya — selalu fallback ke default yang aman.
export const catalogViewSchema = z.enum(["all", "best", "trending"]).catch("all");

export const catalogRegionSchema = z
  .enum(["MY", "SG", "ID", "TH", "PH", "VN"])
  .catch("MY");

// Kolom yang boleh di-sort dari URL (allowlist — di luar ini ditolak).
export const catalogSortIds = [
  "name",
  "likes",
  "sales30d",
  "growth30d",
  "totalSales",
  "gmv30d",
  "listedOn",
] as const;

export type CatalogSortId = (typeof catalogSortIds)[number];

export const catalogParamsSchema = z.object({
  view: catalogViewSchema,
  region: catalogRegionSchema,
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25),
  // sort undefined = ikut default view (best→totalSales, trending→sales30d).
  sort: z.enum(catalogSortIds).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).catch("desc"),
});

export type CatalogParams = z.output<typeof catalogParamsSchema>;
