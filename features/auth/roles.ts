export const ADMIN_ROLE = "admin" as const;
export const USER_ROLE = "user" as const;

export type AppRole = typeof USER_ROLE | typeof ADMIN_ROLE;

export function normalizeRole(role: string | null | undefined): AppRole {
  return role === ADMIN_ROLE ? ADMIN_ROLE : USER_ROLE;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === ADMIN_ROLE;
}

export function canEditRegion(params: {
  actorRole: string | null | undefined;
  actorId: string;
  ownerId: string;
}): boolean {
  if (isAdminRole(params.actorRole)) return true;
  return params.actorId === params.ownerId;
}
