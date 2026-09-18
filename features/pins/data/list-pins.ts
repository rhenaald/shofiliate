import "server-only";

import { requireSession } from "@/features/auth/data/session";
import { pinsParamsSchema } from "@/features/pins/schemas";
import type { ListPinsResult, PinDTO } from "@/features/pins/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function listPins(input: unknown): Promise<ListPinsResult> {
  // .catch per field di pinsParamsSchema: param invalid jatuh ke default,
  // tidak pernah 500 karena URL diketik manual (AC-001).
  const filters = pinsParamsSchema.parse(input);
  await requireSession();

  const q = filters.q.trim();
  const where: Prisma.PinWhereInput = {
    // Hanya pin aktif; unpin memakai soft-delete agar audit retained (AC-011).
    unpinnedAt: null,
    product: {
      region: filters.region,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { shopName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const include = {
    product: {
      select: {
        id: true,
        region: true,
        itemId: true,
        shopId: true,
        name: true,
        url: true,
        shopName: true,
      },
    },
    pinnedBy: {
      select: {
        name: true,
        username: true,
      },
    },
  } as const;

  const [found, total] = await Promise.all([
    prisma.pin.findMany({
      where,
      include,
      // Sort terkunci pinnedAt desc (RSK-007: tanpa perluasan sort di fase ini).
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.pin.count({ where }),
  ]);
  const pageCount = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  // Jepit halaman keluar jangkauan ke halaman terakhir yang valid.
  const page = pageCount === 0 ? 1 : Math.min(filters.page, pageCount);

  let effective = found;
  if (page !== filters.page) {
    effective = await prisma.pin.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * filters.pageSize,
      take: filters.pageSize,
    });
  }

  const rows: PinDTO[] = effective.map((pin) => ({
    pinId: pin.id,
    productId: pin.product.id,
    region: pin.product.region,
    itemId: pin.product.itemId,
    shopId: pin.product.shopId,
    name: pin.product.name,
    url: pin.product.url,
    shopName: pin.product.shopName === "" ? "-" : pin.product.shopName,
    note: pin.note,
    pinnedBy: {
      name: pin.pinnedBy.name,
      username: pin.pinnedBy.username,
    },
    pinnedAt: pin.createdAt.toISOString(),
  }));

  return {
    rows,
    total,
    page,
    pageSize: filters.pageSize,
    pageCount,
  };
}
