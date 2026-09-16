import { prisma } from "@/lib/prisma";
import { upsertSeedUser, type SeedAccount } from "./seed_user";

async function main() {
  const accounts: SeedAccount[] = [
    {
      email: process.env.SEED_DEV_ADMIN_EMAIL ?? "admin@example.local",
      username: process.env.SEED_DEV_ADMIN_USERNAME ?? "admin",
      password: process.env.SEED_DEV_ADMIN_PASSWORD ?? "admin12345",
      name: process.env.SEED_DEV_ADMIN_NAME ?? "Admin",
      role: "admin",
    },
    {
      email: process.env.SEED_DEV_USER_EMAIL ?? "user@example.local",
      username: process.env.SEED_DEV_USER_USERNAME ?? "streamer1",
      password: process.env.SEED_DEV_USER_PASSWORD ?? "user12345",
      name: process.env.SEED_DEV_USER_NAME ?? "Streamer 1",
      role: "user",
    },
  ];

  for (const account of accounts) {
    const result = await upsertSeedUser(account);
    console.log(`[seed:development] ${account.username} (${account.role}): ${result}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
