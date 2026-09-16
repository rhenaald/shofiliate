import "dotenv/config";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SeedAccount = {
  email: string;
  username: string;
  password: string;
  name: string;
  role: "user" | "admin";
};

export async function upsertSeedUser(
  account: SeedAccount,
): Promise<"created" | "role-updated" | "skipped"> {
  if (account.password.length < 8) {
    throw new Error(
      `Seed password for "${account.username}" must be at least 8 characters`,
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: account.email }, { username: account.username }] },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name: account.name,
        email: account.email,
        password: account.password,
        username: account.username,
      },
    });
    await prisma.user.update({
      where: { email: account.email },
      data: { role: account.role },
    });
    return "created";
  }

  if (existing.role !== account.role) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: account.role },
    });
    return "role-updated";
  }

  return "skipped";
}
