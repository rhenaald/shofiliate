import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/lib/auth";
import {
  canEditRegion,
  isAdminRole,
} from "@/features/auth/roles";

export async function getSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("AUTH_UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isAdminRole(session.user.role)) {
    throw new Error("AUTH_FORBIDDEN");
  }
  return session;
}

export async function requireDashboardSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

export { canEditRegion, isAdminRole };
