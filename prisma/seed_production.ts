import { prisma } from "@/lib/prisma";
import { upsertSeedUser, type SeedAccount } from "./seed_user";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} for production seed`);
  }
  return value;
}

async function main() {
  if (process.env.SEED_PROD !== "true") {
    throw new Error(
      "Refusing production seed without SEED_PROD=true. Set it explicitly to proceed.",
    );
  }

  const admin: SeedAccount = {
    email: required("SEED_PROD_ADMIN_EMAIL"),
    username: required("SEED_PROD_ADMIN_USERNAME"),
    password: required("SEED_PROD_ADMIN_PASSWORD"),
    name: required("SEED_PROD_ADMIN_NAME"),
    role: "admin",
  };

  const result = await upsertSeedUser(admin);
  console.log(`[seed:production] ${admin.username} (admin): ${result}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
