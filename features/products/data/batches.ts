import "server-only";

import { prisma } from "@/lib/prisma";

export async function getLatestImportBatch() {
  return prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      importedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}

export async function getImportBatches(limit = 10) {
  return prisma.importBatch.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      importedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}
