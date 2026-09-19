import "server-only";

import { requireSession } from "@/features/auth/data/session";
import {
  buildPinsQueries,
  toPinDTO,
  type PinSqlRow,
} from "@/features/pins/data/pins-query";
import { pinsParamsSchema } from "@/features/pins/schemas";
import type { ListPinsResult } from "@/features/pins/types";
import { prisma } from "@/lib/prisma";

export async function listPins(input: unknown): Promise<ListPinsResult> {
  // .catch per field di pinsParamsSchema: param invalid jatuh ke default,
  // tidak pernah 500 karena URL diketik manual (AC-001).
  const filters = pinsParamsSchema.parse(input);
  await requireSession();

  const { rows, count } = buildPinsQueries(filters);
  const [found, counted] = await Promise.all([
    prisma.$queryRaw<PinSqlRow[]>(rows),
    prisma.$queryRaw<Array<{ count: string }>>(count),
  ]);
  const total = Number(counted[0]?.count ?? 0);
  const pageCount = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  // Jepit halaman keluar jangkauan ke halaman terakhir yang valid.
  const page = pageCount === 0 ? 1 : Math.min(filters.page, pageCount);

  let effective = found;
  if (page !== filters.page) {
    const fixed = buildPinsQueries({ ...filters, page });
    effective = await prisma.$queryRaw<PinSqlRow[]>(fixed.rows);
  }

  return {
    rows: effective.map(toPinDTO),
    total,
    page,
    pageSize: filters.pageSize,
    pageCount,
  };
}
