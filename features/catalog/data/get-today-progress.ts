import "server-only";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/features/auth/data/session";

export const DAILY_TARGET = 300;

/** Progress hari ini (zona Asia/Kuala_Lumpur). Read-only; increment milik SH-13. */
export async function getTodayProgress(): Promise<{ count: number; target: number }> {
  const session = await requireSession();
  const klDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const row = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: session.user.id, date: new Date(`${klDate}T00:00:00Z`) } },
  });
  return { count: row?.count ?? 0, target: DAILY_TARGET };
}
