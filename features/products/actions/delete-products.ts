"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/features/auth/data/session";
import { prisma } from "@/lib/prisma";

export async function deleteProducts(productIds: string[]): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    await requireSession();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return { success: false, count: 0, error: "Tidak ada produk yang dipilih." };
    }

    const result = await prisma.product.deleteMany({
      where: {
        id: { in: productIds },
      },
    });

    revalidatePath("/dashboard/catalog");
    revalidatePath("/dashboard/products/pins");

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    console.error("Error deleting products:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Gagal menghapus produk.",
    };
  }
}
