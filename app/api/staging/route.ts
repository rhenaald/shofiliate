import { NextResponse } from "next/server";

import { requireSession } from "@/features/auth/data/session";
import { getStagingUnion } from "@/features/products/data/staging";

export async function GET() {
  const session = await requireSession();
  const rows = await getStagingUnion(session.user.id);
  return NextResponse.json({ rows });
}
