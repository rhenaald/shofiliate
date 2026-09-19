"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/features/auth/data/session";
import { togglePinSchema } from "@/features/pins/schemas";
import type { PinDTO } from "@/features/pins/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PINS_PATH = "/dashboard/products/pins";
const CATALOG_PATH = "/dashboard/catalog";

function revalidatePinRoutes(): void {
  revalidatePath(PINS_PATH);
  // Indikator pinned di tabel katalog ikut segar.
  revalidatePath(CATALOG_PATH);
}

// Skema lokal: unpin tidak butuh form (tanpa RHF di MOD-05), jadi tidak
// ditaruh di schemas.ts bersama skema ber-form.
const unpinSchema = z.object({
  pinId: z.cuid(),
});

const pinWithRelations = {
  product: {
    select: {
      id: true,
      region: true,
      itemId: true,
      shopId: true,
      name: true,
      url: true,
      currency: true,
      shopName: true,
      category: true,
      listedOn: true,
      affiliateUrl: true,
      komisiXtraRate: true,
      commissionLiveAmount: true,
      commissionSocialAmount: true,
      commissionVideoAmount: true,
    },
  },
  pinnedBy: {
    select: {
      name: true,
      username: true,
    },
  },
} as const;

type PinWithRelations = Prisma.PinGetPayload<{
  include: typeof pinWithRelations;
}>;

type LatestSnapshot = Prisma.ProductSnapshotGetPayload<{
  select: {
    likedCount: true;
    sales1d: true;
    sales7d: true;
    sales30d: true;
    growth30d: true;
    historicalSold: true;
    gmv30d: true;
    komisiXtraRate: true;
    commissionLiveAmount: true;
    commissionSocialAmount: true;
    commissionVideoAmount: true;
  };
}> | null;

function toPinDTO(pin: PinWithRelations, snapshot: LatestSnapshot): PinDTO {
  const product = pin.product;
  const toAmount = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  return {
    pinId: pin.id,
    productId: product.id,
    region: product.region,
    itemId: product.itemId,
    shopId: product.shopId,
    name: product.name,
    url: product.url,
    currency: product.currency,
    shopName: product.shopName === "" ? "-" : product.shopName,
    category: product.category === "" ? "-" : product.category,
    listedOn: product.listedOn ? product.listedOn.toISOString() : null,
    likes: snapshot?.likedCount ?? 0,
    sales1d: snapshot?.sales1d ?? 0,
    sales7d: snapshot?.sales7d ?? 0,
    sales30d: snapshot?.sales30d ?? 0,
    growth30d: snapshot?.growth30d ?? 0,
    totalSales: snapshot?.historicalSold ?? 0,
    gmv30d: snapshot ? Number(snapshot.gmv30d) : 0,
    affiliateUrl: product.affiliateUrl,
    komisiXtraRate: snapshot?.komisiXtraRate ?? product.komisiXtraRate,
    commissionLiveAmount:
      toAmount(snapshot?.commissionLiveAmount) ??
      toAmount(product.commissionLiveAmount),
    commissionSocialAmount:
      toAmount(snapshot?.commissionSocialAmount) ??
      toAmount(product.commissionSocialAmount),
    commissionVideoAmount:
      toAmount(snapshot?.commissionVideoAmount) ??
      toAmount(product.commissionVideoAmount),
    note: pin.note,
    pinnedBy: {
      name: pin.pinnedBy.name,
      username: pin.pinnedBy.username,
    },
    pinnedAt: pin.createdAt.toISOString(),
  };
}

/**
 * Buat pin aktif secara idempoten pada board bersama.
 * Pin existing milik siapa pun dikembalikan apa adanya (AC-031) —
 * note orang lain tidak pernah ditimpa.
 */
export async function togglePin(input: unknown): Promise<PinDTO> {
  const data = togglePinSchema.parse(input);
  const session = await requireSession();
  const userId = session.user.id;

  const pin = await prisma.$transaction(async (tx) => {
    const existing = await tx.pin.findFirst({
      where: { productId: data.productId, unpinnedAt: null },
      include: pinWithRelations,
    });
    if (existing) return existing;

    const created = await tx.pin.create({
      data: {
        productId: data.productId,
        pinnedById: userId,
        note: data.note ?? null,
      },
      include: pinWithRelations,
    });
    await tx.productContributor.createMany({
      data: [{ productId: data.productId, userId }],
      skipDuplicates: true,
    });
    return created;
  });

  revalidatePinRoutes();

  // Metrik terbaru untuk DTO penuh (satu query tambahan; null bila produk
  // manual belum punya snapshot — mapper memberi default aman).
  const snapshot = await prisma.productSnapshot.findFirst({
    where: { productId: data.productId },
    orderBy: [{ scrapedAt: "desc" }, { createdAt: "desc" }],
    select: {
      likedCount: true,
      sales1d: true,
      sales7d: true,
      sales30d: true,
      growth30d: true,
      historicalSold: true,
      gmv30d: true,
      komisiXtraRate: true,
      commissionLiveAmount: true,
      commissionSocialAmount: true,
      commissionVideoAmount: true,
    },
  });
  return toPinDTO(pin, snapshot);
}

/**
 * Soft-delete pin (satu arah, bukan toggle bolak-balik). Row dipertahankan
 * untuk audit (AC-032). Idempoten terhadap double-click: pin yang sudah
 * di-unpin dikembalikan apa adanya.
 */
export async function unpin(
  input: unknown,
): Promise<{ pinId: string; unpinnedAt: string }> {
  const data = unpinSchema.parse(input);
  await requireSession();

  const current = await prisma.pin.findUnique({
    where: { id: data.pinId },
  });
  if (!current) {
    throw new Error("Pin tidak ditemukan");
  }
  if (current.unpinnedAt) {
    return { pinId: current.id, unpinnedAt: current.unpinnedAt.toISOString() };
  }

  const updated = await prisma.pin.update({
    where: { id: data.pinId },
    data: { unpinnedAt: new Date() },
  });

  revalidatePinRoutes();
  return {
    pinId: updated.id,
    // Baru di-set di atas; non-null assertion aman di sini.
    unpinnedAt: updated.unpinnedAt!.toISOString(),
  };
}
