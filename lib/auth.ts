import "server-only";

import { betterAuth } from "better-auth";

import { prisma } from "@/lib/prisma";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { admin as adminPlugin } from "better-auth/plugins/admin";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  plugins: [
    username(),
    adminPlugin({ defaultRole: "user", adminRoles: ["admin"] }),
    nextCookies(),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
