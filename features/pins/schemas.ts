import { z } from "zod";

import type { PinRegion } from "@/features/pins/types";

export const PINS_REGIONS: PinRegion[] = ["MY", "SG", "ID", "TH", "PH", "VN"];

// Filter URL memakai .catch per field (pola catalog/schemas.ts):
// satu param invalid jatuh ke default aman, tidak pernah 500 (AC-001).
export const pinsRegionSchema = z.enum(PINS_REGIONS).catch("MY");

export const pinsParamsSchema = z.object({
  region: pinsRegionSchema,
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25),
});

export type PinsParams = z.output<typeof pinsParamsSchema>;

// Skema aksi: strict (tanpa .catch) — input invalid harus ditolak,
// bukan didiamkan jatuh ke default. Pesan cuid bawaan Zod berbahasa
// Inggris; cukup untuk validasi boundary server (AC-002 untuk note).
export const togglePinSchema = z.object({
  productId: z.cuid(),
  note: z.string().trim().max(500).optional(),
});

export const updatePinNoteSchema = z.object({
  pinId: z.cuid(),
  note: z.string().trim().max(500).nullable(),
});

const digitStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "must contain only digits");

export const addPinSchema = z.object({
  region: z.enum(PINS_REGIONS),
  itemId: digitStringSchema,
  shopId: digitStringSchema,
  note: z.string().trim().max(500).optional(),
});
