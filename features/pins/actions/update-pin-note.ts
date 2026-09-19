"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/features/auth/data/session";
import { updatePinNoteSchema } from "@/features/pins/schemas";
import { prisma } from "@/lib/prisma";

const PINS_PATH = "/dashboard/products/pins";

/**
 * Ubah kolom note pada pin aktif. Hanya kolom note yang ditulis (AC-033);
 * pin yang sudah di-unpin ditolak agar tidak ada edit bayangan.
 */
export async function updatePinNote(
  input: unknown,
): Promise<{ pinId: string; note: string | null }> {
  const data = updatePinNoteSchema.parse(input);
  await requireSession();

  const current = await prisma.pin.findUnique({
    where: { id: data.pinId },
  });
  if (!current) {
    throw new Error("Pin tidak ditemukan");
  }
  if (current.unpinnedAt) {
    throw new Error("Pin sudah di-unpin dan tidak dapat diubah");
  }

  const updated = await prisma.pin.update({
    where: { id: data.pinId },
    data: { note: data.note },
  });

  revalidatePath(PINS_PATH);
  return { pinId: updated.id, note: updated.note };
}
