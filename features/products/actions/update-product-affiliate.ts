"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/features/auth/data/session";
import { prisma } from "@/lib/prisma";

const updateAffiliateSchema = z.object({
  productId: z.string().min(1, "Product ID wajib diisi"),
  affiliateUrl: z.string().url("Format URL affiliate tidak valid"),
  commissionRate: z.number().nullable().optional(),
  commissionAmount: z.number().nullable().optional(),
  commissionLiveRate: z.number().nullable().optional(),
  commissionLiveAmount: z.number().nullable().optional(),
  commissionSocialRate: z.number().nullable().optional(),
  commissionSocialAmount: z.number().nullable().optional(),
  commissionVideoRate: z.number().nullable().optional(),
  commissionVideoAmount: z.number().nullable().optional(),
  hasKomisiXtra: z.boolean().optional(),
  komisiXtraRate: z.number().nullable().optional(),
  komisiXtraAmount: z.number().nullable().optional(),
});

export type UpdateProductAffiliateInput = z.infer<typeof updateAffiliateSchema>;

export async function updateProductAffiliate(input: UpdateProductAffiliateInput): Promise<{
  success: boolean;
  affiliateUrl?: string;
  error?: string;
}> {
  try {
    await requireSession();

    const parsed = updateAffiliateSchema.parse(input);

    const product = await prisma.product.findUnique({
      where: { id: parsed.productId },
      select: { id: true, latestSnapshotId: true },
    });

    if (!product) {
      return { success: false, error: "Produk tidak ditemukan di database." };
    }

    // Update Product data
    await prisma.product.update({
      where: { id: parsed.productId },
      data: {
        affiliateUrl: parsed.affiliateUrl,
        ...(parsed.commissionRate !== undefined ? { commissionRate: parsed.commissionRate } : {}),
        ...(parsed.commissionAmount !== undefined
          ? { commissionAmount: parsed.commissionAmount !== null ? parsed.commissionAmount : null }
          : {}),
        ...(parsed.commissionLiveRate !== undefined ? { commissionLiveRate: parsed.commissionLiveRate } : {}),
        ...(parsed.commissionLiveAmount !== undefined
          ? { commissionLiveAmount: parsed.commissionLiveAmount !== null ? parsed.commissionLiveAmount : null }
          : {}),
        ...(parsed.commissionSocialRate !== undefined ? { commissionSocialRate: parsed.commissionSocialRate } : {}),
        ...(parsed.commissionSocialAmount !== undefined
          ? { commissionSocialAmount: parsed.commissionSocialAmount !== null ? parsed.commissionSocialAmount : null }
          : {}),
        ...(parsed.commissionVideoRate !== undefined ? { commissionVideoRate: parsed.commissionVideoRate } : {}),
        ...(parsed.commissionVideoAmount !== undefined
          ? { commissionVideoAmount: parsed.commissionVideoAmount !== null ? parsed.commissionVideoAmount : null }
          : {}),
        ...(parsed.hasKomisiXtra !== undefined ? { hasKomisiXtra: parsed.hasKomisiXtra } : {}),
        ...(parsed.komisiXtraRate !== undefined ? { komisiXtraRate: parsed.komisiXtraRate } : {}),
        ...(parsed.komisiXtraAmount !== undefined
          ? { komisiXtraAmount: parsed.komisiXtraAmount !== null ? parsed.komisiXtraAmount : null }
          : {}),
      },
    });

    // Update latestSnapshot jika ada
    if (product.latestSnapshotId) {
      await prisma.productSnapshot.update({
        where: { id: product.latestSnapshotId },
        data: {
          ...(parsed.commissionRate !== undefined ? { commissionRate: parsed.commissionRate } : {}),
          ...(parsed.commissionAmount !== undefined
            ? { commissionAmount: parsed.commissionAmount !== null ? parsed.commissionAmount : null }
            : {}),
          ...(parsed.commissionLiveRate !== undefined ? { commissionLiveRate: parsed.commissionLiveRate } : {}),
          ...(parsed.commissionLiveAmount !== undefined
            ? { commissionLiveAmount: parsed.commissionLiveAmount !== null ? parsed.commissionLiveAmount : null }
            : {}),
          ...(parsed.commissionSocialRate !== undefined ? { commissionSocialRate: parsed.commissionSocialRate } : {}),
          ...(parsed.commissionSocialAmount !== undefined
            ? { commissionSocialAmount: parsed.commissionSocialAmount !== null ? parsed.commissionSocialAmount : null }
            : {}),
          ...(parsed.commissionVideoRate !== undefined ? { commissionVideoRate: parsed.commissionVideoRate } : {}),
          ...(parsed.commissionVideoAmount !== undefined
            ? { commissionVideoAmount: parsed.commissionVideoAmount !== null ? parsed.commissionVideoAmount : null }
            : {}),
          ...(parsed.hasKomisiXtra !== undefined ? { hasKomisiXtra: parsed.hasKomisiXtra } : {}),
          ...(parsed.komisiXtraRate !== undefined ? { komisiXtraRate: parsed.komisiXtraRate } : {}),
          ...(parsed.komisiXtraAmount !== undefined
            ? { komisiXtraAmount: parsed.komisiXtraAmount !== null ? parsed.komisiXtraAmount : null }
            : {}),
        },
      });
    }

    revalidatePath("/dashboard/catalog");
    revalidatePath("/dashboard/products/pins");

    return {
      success: true,
      affiliateUrl: parsed.affiliateUrl,
    };
  } catch (err) {
    console.error("Gagal mengupdate link affiliate:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui link affiliate produk.",
    };
  }
}
