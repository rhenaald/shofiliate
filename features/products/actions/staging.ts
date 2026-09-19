"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/features/auth/data/session";
import { getStagingUnion } from "@/features/products/data/staging";
import type { RawImportRow, SaveStagingResult } from "@/features/products/types";
import { prisma } from "@/lib/prisma";
import { importProducts } from "@/features/products/actions/import-products";

export async function createStagingFile(params: { fileName: string; rows: RawImportRow[] }): Promise<{ id: string }> {
  const session = await requireSession();
  const fileName = params.fileName?.trim() || "extension-import.json";
  const rows = Array.isArray(params.rows) ? params.rows : [];
  const enrichedCount = rows.filter((r) => Boolean(r.affiliate_link || r.affiliate_url)).length;
  const created = await prisma.importStagingFile.create({
    data: {
      userId: session.user.id,
      fileName,
      rows: JSON.parse(JSON.stringify(rows)),
      rowCount: rows.length,
      enrichedCount,
      status: "staged",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });
  revalidatePath("/dashboard/products/import");
  return created;
}

const STRIP_KEYS = ["_stagingId", "_fileId", "_fileName", "_rowNumber", "_valid", "_duplicate", "_error"] as const;

export async function saveStaging(params: { fileIds?: string[]; selectedIds?: string[] }): Promise<SaveStagingResult> {
  const session = await requireSession();
  const union = await getStagingUnion(session.user.id, params.fileIds);
  const selected = params.selectedIds && params.selectedIds.length > 0 ? new Set(params.selectedIds) : null;
  const target = union.filter((r) => {
    if (!r._valid) return false;
    if (selected) return selected.has(r._stagingId);
    return true;
  });
  const fileIds = Array.from(new Set(target.map((r) => r._fileId)));
  const unionFileNames = Array.from(
    new Set(union.map((r) => String(r._fileName ?? "").trim()).filter((n) => n.length > 0)),
  );
  const joinedNames = unionFileNames.join(", ");
  const fileName = joinedNames.length > 120 ? `${joinedNames.slice(0, 117)}...` : joinedNames || "staging-import";
  if (target.length === 0) {
    return {
      batchId: "",
      fileName,
      totalRows: 0,
      imported: 0,
      updated: 0,
      duplicates: 0,
      failed: 0,
      errors: [],
      stagingFileIds: [],
    };
  }
  const rawRows: RawImportRow[] = target.map((r) => {
    const copy: Record<string, unknown> = { ...r };
    for (const k of STRIP_KEYS) delete copy[k];
    return copy as RawImportRow;
  });
  const result = await importProducts({ fileName, rows: rawRows });
  if (fileIds.length > 0) {
    await prisma.importStagingFile.updateMany({
      where: { id: { in: fileIds } },
      data: { status: "saved" },
    });
  }
  return { ...result, stagingFileIds: fileIds };
}
