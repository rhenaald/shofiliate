import "server-only";

import { requireSession } from "@/features/auth/data/session";
import { prisma } from "@/lib/prisma";

/**
 * ID produk yang sedang aktif di-pin di board bersama.
 * Dipakai katalog untuk indikator pinned tanpa menyentuh catalog-query.
 * Return array (serializable); panggil view yang membangun Set di client.
 */
export async function getPinnedProductIds(): Promise<string[]> {
  await requireSession();
  const rows = await prisma.pin.findMany({
    where: { unpinnedAt: null },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}
