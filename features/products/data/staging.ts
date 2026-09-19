import "server-only";

import { parseImportRow } from "@/features/products/schemas";
import type { RawImportRow, StagingRow } from "@/features/products/types";
import { prisma } from "@/lib/prisma";

export async function listStagingFiles(userId: string) {
  return prisma.importStagingFile.findMany({
    where: { userId, status: { in: ["staged", "enriched"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, rowCount: true, enrichedCount: true, status: true, createdAt: true },
  });
}

export async function getStagingUnion(userId: string, fileIds?: string[]): Promise<StagingRow[]> {
  const files = await prisma.importStagingFile.findMany({
    where: {
      userId,
      status: { in: ["staged", "enriched"] },
      ...(fileIds && fileIds.length > 0 ? { id: { in: fileIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  const out: StagingRow[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    const rows = Array.isArray(f.rows) ? (f.rows as RawImportRow[]) : [];
    rows.forEach((raw, idx) => {
      const rowNumber = idx + 1;
      const parsed = parseImportRow(raw, rowNumber);
      if (parsed.success) {
        const d = parsed.data;
        const dupKey = `${f.id}:${d.region}:${d.itemId}:${d.shopId}`;
        const isDuplicate = seen.has(dupKey);
        seen.add(dupKey);
        out.push({
          ...raw,
          _stagingId: `${f.id}:${d.region}:${d.itemId}:${d.shopId}:${rowNumber}`,
          _fileId: f.id,
          _fileName: f.fileName,
          _rowNumber: rowNumber,
          _valid: true,
          ...(isDuplicate ? { _duplicate: true as const } : {}),
        });
      } else {
        out.push({
          ...raw,
          _stagingId: `${f.id}:row-${rowNumber}`,
          _fileId: f.id,
          _fileName: f.fileName,
          _rowNumber: rowNumber,
          _valid: false,
          _error: { field: parsed.error.field, reason: parsed.error.reason },
        });
      }
    });
  }
  return out;
}
