"use server";

import "server-only";

import { requireSession } from "@/features/auth/data/session";
import { togglePin } from "@/features/pins/actions/toggle-pin";
import { addPinSchema } from "@/features/pins/schemas";
import type { PinDTO } from "@/features/pins/types";
import { prisma } from "@/lib/prisma";

/**
 * Tambah pin manual by (region, itemId, shopId) — pengganti wiring katalog
 * yang ditunda (R-003). Produk di-resolve via @@unique Product terlebih
 * dahulu; inti idempoten + revalidate di-delegasikan ke togglePin.
 */
export async function addPin(input: unknown): Promise<PinDTO> {
  const data = addPinSchema.parse(input);
  await requireSession();

  const product = await prisma.product.findUnique({
    where: {
      region_itemId_shopId: {
        region: data.region,
        itemId: data.itemId,
        shopId: data.shopId,
      },
    },
    select: { id: true },
  });
  if (!product) {
    throw new Error(
      `Produk tidak ditemukan (${data.region}:${data.itemId}:${data.shopId})`,
    );
  }

  return togglePin({ productId: product.id, note: data.note });
}
