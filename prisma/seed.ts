// Must stay the first import: loads .env before @/lib/prisma evaluates
// (lib/prisma throws at import time when DATABASE_URL is unset, and ES
// imports evaluate depth-first, so dotenv cannot live only downstream).
import "dotenv/config";

async function main() {
  const flag = process.argv
    .find((arg) => arg.startsWith("--env="))
    ?.slice("--env=".length);
  const target = flag ?? process.env.SEED_ENV ?? process.env.NODE_ENV ?? "development";

  if (target === "development") {
    await import("./seed_development");
    return;
  }
  if (target === "production") {
    await import("./seed_production");
    return;
  }

  console.error(
    `Unknown seed env "${target}". Use --env=development|production.`,
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
