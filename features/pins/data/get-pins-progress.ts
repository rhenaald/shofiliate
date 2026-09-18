import "server-only";

import { requireSession } from "@/features/auth/data/session";
import type { PinsProgress } from "@/features/pins/types";
import { prisma } from "@/lib/prisma";

export const DAILY_TARGET = 300;

/** Progress hari ini (zona Asia/Kuala_Lumpur). Read-only; increment milik SH-13. */
export async function getPinsProgress(): Promise<PinsProgress> {
  const session = await requireSession();
  const klDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // findUnique saja tanpa upsert/create: read murni tanpa efek samping (AC-012).
  const row = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: session.user.id, date: new Date(`${klDate}T00:00:00Z`) } },
  });
  return { count: row?.count ?? 0, target: DAILY_TARGET };
}
