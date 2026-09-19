# Catalog Fetch Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make catalog fetch volume-resistant at 1800 rows/day across 6 regions with minutes-stale cache, keeping page numbers, exact count, and sort/best/trending/region behavior identical.

**Architecture:** Pointer column + materialized view kills per-request DISTINCT ON; trigram/composite/partial indexes serve ILIKE and all sort orders; `use cache` with per-region tags serves warm hits; Suspense streams shell first; TanStack keeps previous page and prefetches neighbors.

**Tech Stack:** Next.js 16 (`cacheComponents`, `use cache`, `cacheLife`, `cacheTag`, `revalidateTag`), Postgres on Neon (pg_trgm, MV + REFRESH CONCURRENTLY), Prisma 7, TanStack Query 5 + Table 9.

## Global Constraints

- No new infra: no Redis/KV, Postgres + Next cache only.
- Freshness: rows stale up to 5min, count up to 15min; import purges only affected regions.
- Keep numbered pages + exact total count; OFFSET stays; clamp deep pages at 200.
- Search stays `name` + `shopName` ILIKE only; queries shorter than 2 chars skip the search predicate.
- Never read `searchParams`/cookies/session inside a `'use cache'` scope; parse outside, pass plain values in.
- Import style: `@/` alias, `import "server-only"` in `data/`/`actions`, no `"use client"` under `app/`, no direct `@prisma/client` import (via `@/lib/prisma.ts`).
- Tag convention (exact): `catalog`, `catalog-{REGION}` (e.g. `catalog-MY`). Fetch tags include both; import calls `revalidateTag('catalog-{REGION}', 'max')` per affected region.

---

## File map

- Modify: `prisma/schema.prisma` — add `Product.latestSnapshotId` + relation.
- New migration: `prisma/migrations/<stamp>_catalog_perf/` — pg_trgm, GIN, composite, partial indexes (Task 1).
- New migration: `prisma/migrations/<stamp>_catalog_latest_mv/` — `catalog_latest` MV + unique + serving indexes (Task 3).
- Modify: `features/products/actions/import-products.ts` — set pointers, refresh MV, per-region `revalidateTag`.
- Modify: `features/catalog/data/catalog-query.ts` — read from MV, add `normalizeCatalogParams` (q guard, page clamp).
- Modify: `features/catalog/data/list-products.ts` — delegate to cached fetchers in new file.
- New: `features/catalog/data/cached-catalog.ts` — `'use cache'` row/count/batch fetchers.
- Modify: `next.config.ts` — add `cacheComponents: true`.
- New: `features/catalog/pages/catalog-results.tsx` — async Suspense children (table stream + progress stream).
- Modify: `app/dashboard/catalog/page.tsx` — static shell + Suspense, no blocking await.
- Modify: `features/catalog/pages/products-page.tsx` — accept streamed children or split header/table (see Task 6).
- New: `features/catalog/actions/get-catalog-page.ts` — server action for client refetch.
- Modify: `features/catalog/components/products-view.tsx` — `useQuery` + `keepPreviousData` + prefetch.
- New (verify only): `scripts/explain-catalog.ts` — EXPLAIN harness run with tsx, kept as artifact.

---

### Task 1: SH-33 search + sort indexes

**Files:**
- Create: `prisma/migrations/<stamp>_catalog_perf/migration.sql`
- New (verify): `scripts/explain-catalog.ts`
- Test: EXPLAIN output + `pnpm db:migrate` apply

**Interfaces:**
- Consumes: nothing.
- Produces: index set relied on by Task 4 queries (`idx_product_name_trgm`, `idx_product_shop_trgm`, `idx_cat_latest_*` — exact names below).

- [ ] **Step 1: Write the migration SQL**

Create the migration dir via `pnpm db:migrate --name catalog_perf --create-only`, then put exactly this in `migration.sql` (MV part ships in Task 3; indexes on base tables here):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_product_name_trgm
  ON "Product" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_shop_trgm
  ON "Product" USING gin ("shopName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_region_created
  ON "Product" ("region", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS idx_snap_product_scraped
  ON "ProductSnapshot" ("productId", "scrapedAt" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_snap_sales_trending
  ON "ProductSnapshot" ("sales30d" DESC, "growth30d" DESC)
  WHERE "sales30d" >= 10;
CREATE INDEX IF NOT EXISTS idx_snap_historical
  ON "ProductSnapshot" ("historicalSold" DESC);
```

- [ ] **Step 2: Write the EXPLAIN harness**

```ts
// scripts/explain-catalog.ts
import { prisma } from "@/lib/prisma";

const checks = [
  ["name-ilike", `EXPLAIN SELECT "id" FROM "Product" WHERE "region" = 'MY'::"Region" AND "name" ILIKE '%cosrx%' LIMIT 25`],
  ["shop-ilike", `EXPLAIN SELECT "id" FROM "Product" WHERE "region" = 'MY'::"Region" AND "shopName" ILIKE '%official%' LIMIT 25`],
];

for (const [label, sql] of checks) {
  const rows = await prisma.$queryRawUnsafe<Array<{ [k: string]: string }>>(sql);
  console.log(`--- ${label} ---`);
  console.log(Object.values(rows[0]).join("\n"));
}
await prisma.$disconnect();
```

- [ ] **Step 3: Apply migration**

Run: `pnpm db:migrate`
Expected: `Applying migration <stamp>_catalog_perf`, no errors.

- [ ] **Step 4: Run EXPLAIN, confirm index use**

Run: `npx tsx scripts/explain-catalog.ts`
Expected: both plans contain `Bitmap Index Scan` on `idx_product_name_trgm` / `idx_product_shop_trgm` (never `Seq Scan on "Product"`).

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations scripts/explain-catalog.ts
git commit -m "feat(sh-33): trigram and sort-supporting indexes"
```

---

### Task 2: SH-34 pointer column + backfill

**Files:**
- Modify: `prisma/schema.prisma` (Product model only)
- Test: `pnpm db:migrate` + row-count SQL via harness

**Interfaces:**
- Consumes: nothing.
- Produces: `Product.latestSnapshotId` (String?, unique, FK to ProductSnapshot) + `Product.latestSnapshot` relation, consumed by Tasks 3–4. Exact field names as below.

- [ ] **Step 1: Edit the Product model**

In `prisma/schema.prisma`, inside `model Product`, add after the `snapshots` line:

```prisma
  snapshots   ProductSnapshot[]
  latestSnapshotId String? @unique
  latestSnapshot   ProductSnapshot? @relation("LatestSnapshot", fields: [latestSnapshotId], references: [id], onDelete: SetNull)
```

And inside `model ProductSnapshot`, add:

```prisma
  latestFor Product? @relation("LatestSnapshot")
```

- [ ] **Step 2: Create + apply migration**

Run: `pnpm db:migrate --name product_latest_pointer`
Expected: migration applies cleanly.

- [ ] **Step 3: Backfill pointers to newest snapshot per product**

Run once via harness (append to `scripts/explain-catalog.ts` or one-off `npx tsx -e`):

```ts
import { prisma } from "@/lib/prisma";
await prisma.$executeRawUnsafe(`
  UPDATE "Product" p SET "latestSnapshotId" = s."id"
  FROM "ProductSnapshot" s
  WHERE s."productId" = p."id"
    AND (s."scrapedAt", s."createdAt") = (
      SELECT "scrapedAt", "createdAt" FROM "ProductSnapshot"
      WHERE "productId" = p."id"
      ORDER BY "scrapedAt" DESC, "createdAt" DESC LIMIT 1
    )`);
```

Verify: `SELECT COUNT(*) FROM "Product" WHERE "latestSnapshotId" IS NULL;` returns `0`.

- [ ] **Step 4: Regenerate client + typecheck**

Run: `pnpm db:generate && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(sh-34): product latest-snapshot pointer with backfill"
```

---

### Task 3: SH-34 import maintains pointer + MV, per-region purge

**Files:**
- New: `prisma/migrations/<stamp>_catalog_latest_mv/migration.sql` (do NOT append to the Task 1 migration — it is already applied; create a fresh migration with `pnpm db:migrate --name catalog_latest_mv --create-only`)
- Modify: `features/products/actions/import-products.ts:269-294`

**Interfaces:**
- Consumes: `latestSnapshotId` from Task 2; tag convention from Global Constraints.
- Produces: `catalog_latest` MV (columns exactly matching `CatalogSqlRow` aliases in Task 4); import refreshes MV + purges only touched regions. MV columns: `productId, sales1d, sales7d, sales30d, growth30d, gmv30d(text), gmv30dRaw, historicalSold, totalGmv(text), likedCount, scrapedAt, batchId, pid, region(text), itemId, shopId, name, url, currency, shopName, category, listedOn, affiliateUrl, komisiXtraRate, commissionLiveAmount(text), commissionSocialAmount(text), commissionVideoAmount(text)`.

- [ ] **Step 1: Create the MV migration**

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS catalog_latest AS
SELECT
  s."productId",
  s."sales1d", s."sales7d", s."sales30d", s."growth30d",
  s."gmv30d"::text AS "gmv30d",
  s."gmv30d" AS "gmv30dRaw",
  s."historicalSold",
  s."totalGmv"::text AS "totalGmv",
  s."likedCount", s."scrapedAt", s."batchId",
  p."id" AS "pid",
  p."region"::text AS "region",
  p."itemId", p."shopId", p."name", p."url",
  p."currency", p."shopName", p."category", p."listedOn",
  p."affiliateUrl",
  COALESCE(s."komisiXtraRate", p."komisiXtraRate") AS "komisiXtraRate",
  COALESCE(s."commissionLiveAmount", p."commissionLiveAmount")::text AS "commissionLiveAmount",
  COALESCE(s."commissionSocialAmount", p."commissionSocialAmount")::text AS "commissionSocialAmount",
  COALESCE(s."commissionVideoAmount", p."commissionVideoAmount")::text AS "commissionVideoAmount"
FROM "Product" p
JOIN "ProductSnapshot" s ON s."id" = p."latestSnapshotId";

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_latest_pk
  ON catalog_latest ("region", "pid");
CREATE INDEX IF NOT EXISTS idx_cat_latest_best
  ON catalog_latest ("region", "historicalSold" DESC, "pid" DESC);
CREATE INDEX IF NOT EXISTS idx_cat_latest_trending
  ON catalog_latest ("region", "sales30d" DESC, "growth30d" DESC, "pid" DESC)
  WHERE "sales30d" >= 10;
CREATE INDEX IF NOT EXISTS idx_cat_latest_recent
  ON catalog_latest ("region", "scrapedAt" DESC, "pid" DESC);
```

Run: `pnpm db:migrate --name catalog_latest_mv`
Expected: applies; `SELECT COUNT(*) FROM catalog_latest;` equals product count.

- [ ] **Step 2: Point products at new snapshots in the import**

In `features/products/actions/import-products.ts`, after the snapshot bulk-insert block (line 277) and before the batch-counter update (line 283), insert:

```ts
  // Move latest-pointer to this batch's snapshots (new + updated).
  if (allSnapshotData.length > 0) {
    const ids = allSnapshotData.map((s) => s.productId);
    const fresh = await prisma.productSnapshot.findMany({
      where: { productId: { in: ids }, batchId: batch.id },
      select: { id: true, productId: true },
    });
    const PTR_CHUNK = 100;
    for (let i = 0; i < fresh.length; i += PTR_CHUNK) {
      await Promise.all(
        fresh.slice(i, i + PTR_CHUNK).map((s) =>
          prisma.product.update({
            where: { id: s.productId },
            data: { latestSnapshotId: s.id },
          }),
        ),
      );
    }
  }
```

- [ ] **Step 3: Refresh MV + purge only touched regions**

Replace lines 293–294 (`revalidatePath` x2) with:

```ts
  // MV refresh must run outside any transaction so readers keep old snapshot.
  await prisma.$executeRawUnsafe(
    `REFRESH MATERIALIZED VIEW CONCURRENTLY catalog_latest`,
  );

  const touchedRegions = Array.from(new Set(validRows.map((r) => r.region)));
  for (const region of touchedRegions) {
    revalidateTag(`catalog-${region}`, "max");
  }
  revalidatePath("/dashboard/products/import");
```

Change the import at line 5 to:

```ts
import { revalidatePath, revalidateTag } from "next/cache";
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations features/products/actions/import-products.ts
git commit -m "feat(sh-34): pointer maintenance, MV refresh, region purge"
```

---

### Task 4: SH-34 catalog query reads MV

**Files:**
- Modify: `features/catalog/data/catalog-query.ts`
- Test: `scripts/explain-catalog.ts` (add MV EXPLAIN) + `npx tsc --noEmit`

**Interfaces:**
- Consumes: `catalog_latest` MV + indexes from Tasks 1/3.
- Produces: unchanged exports `buildCatalogQueries(f)`, `toDTO(r)`, plus new `normalizeCatalogParams(f)` returning clamped filters (`q` dropped when trimmed length < 2, `page` clamped to 1..200). Task 5 calls all three.

- [ ] **Step 1: Add normalization helper at top of file**

```ts
export const MAX_CATALOG_PAGE = 200;

export function normalizeCatalogParams(
  f: ResolvedCatalogFilters,
): ResolvedCatalogFilters {
  const q = f.q.trim().length >= 2 ? f.q.trim() : "";
  return { ...f, q, page: Math.min(Math.max(f.page, 1), MAX_CATALOG_PAGE) };
}
```

- [ ] **Step 2: Replace `latestSnapshotQuery` body with MV scan**

Replace the `DISTINCT ON ... FROM "ProductSnapshot" s JOIN "Product" p` body with:

```ts
function latestSnapshotQuery(f: ResolvedCatalogFilters): Prisma.Sql {
  return Prisma.sql`
    SELECT * FROM catalog_latest
    WHERE "region" = ${f.region}
      AND (
        ${f.q} = ''
        OR "name" ILIKE '%' || ${f.q} || '%'
        OR "shopName" ILIKE '%' || ${f.q} || '%'
      )
  `;
}
```

Keep `VIEW_CONDITION`, `VIEW_ORDER`, `SORT_COLUMN_SQL`, `resolveOrder`, `buildCatalogQueries`, `toDTO` untouched — they already reference the `latest` alias and `productId` tiebreaker.

- [ ] **Step 3: Verify MV plan uses indexes**

Append to `scripts/explain-catalog.ts`:

```ts
const mv = await prisma.$queryRawUnsafe<Array<{ [k: string]: string }>>(
  `EXPLAIN SELECT * FROM catalog_latest WHERE "region" = 'MY' ORDER BY "historicalSold" DESC, "pid" DESC LIMIT 25`,
);
console.log("--- mv-best ---");
console.log(Object.values(mv[0]).join("\n"));
```

Run: `npx tsx scripts/explain-catalog.ts`
Expected: `Index Scan` on `idx_cat_latest_best`, no seq scan.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add features/catalog/data/catalog-query.ts scripts/explain-catalog.ts
git commit -m "feat(sh-34): catalog query reads MV with guards"
```

---

### Task 5: SH-32 server cache + route wiring

**Files:**
- Modify: `next.config.ts`
- New: `features/catalog/data/cached-catalog.ts`
- Modify: `features/catalog/data/list-products.ts`

**Interfaces:**
- Consumes: `buildCatalogQueries`, `toDTO`, `normalizeCatalogParams` from Task 4; tag convention from Global Constraints.
- Produces: `fetchCatalogRows(f)`, `fetchCatalogCount(f)`, `fetchBatchStamp()` (all cached, serializable args/returns); `listProducts` keeps its exact signature `listProducts(input: unknown): Promise<ListProductsResult>` and still enforces `requireSession()` OUTSIDE cached calls. Task 6 renders these; Task 7 reuses `listProducts` via server action.

- [ ] **Step 1: Enable Cache Components**

In `next.config.ts`, add to the config object:

```ts
cacheComponents: true,
```

- [ ] **Step 2: Create cached fetchers**

```ts
// features/catalog/data/cached-catalog.ts
import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  buildCatalogQueries,
  normalizeCatalogParams,
  toDTO,
  type CatalogSqlRow,
  type ResolvedCatalogFilters,
} from "@/features/catalog/data/catalog-query";
import type { CatalogBatchStamp } from "@/features/catalog/types";

export async function fetchCatalogRows(f: ResolvedCatalogFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `catalog-${f.region}`, `catalog-${f.view}`);
  const filters = normalizeCatalogParams(f);
  const { rows } = buildCatalogQueries(filters);
  const found = await prisma.$queryRaw<CatalogSqlRow[]>(rows);
  return { rows: found.map(toDTO), pageSize: filters.pageSize, normPage: filters.page };
}

export async function fetchCatalogCount(f: ResolvedCatalogFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `catalog-${f.region}`, `catalog-${f.view}`);
  const filters = normalizeCatalogParams(f);
  const { count } = buildCatalogQueries(filters);
  const counted = await prisma.$queryRaw<Array<{ count: string }>>(count);
  return Number(counted[0]?.count ?? 0);
}

export async function fetchBatchStamp(): Promise<CatalogBatchStamp | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const latestBatch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, createdAt: true },
  });
  return latestBatch
    ? { id: latestBatch.id, fileName: latestBatch.fileName, createdAt: latestBatch.createdAt.toISOString() }
    : null;
}
```

Note: count shares the `minutes` profile here for tag-simplicity; the 15min count TTL from the spec is achieved in Task 7 client `staleTime` layering — do NOT invent a second profile.

- [ ] **Step 3: Rewrite `listProducts` as thin orchestrator**

Replace `features/catalog/data/list-products.ts` body (keep imports style) with:

```ts
import "server-only";

import { requireSession } from "@/features/auth/data/session";
import {
  fetchBatchStamp,
  fetchCatalogCount,
  fetchCatalogRows,
} from "@/features/catalog/data/cached-catalog";
import { buildCatalogQueries } from "@/features/catalog/data/catalog-query";
import { prisma } from "@/lib/prisma";
import { catalogParamsSchema } from "@/features/catalog/schemas";
import type { ListProductsResult } from "@/features/catalog/types";
import type { CatalogSqlRow } from "@/features/catalog/data/catalog-query";

export async function listProducts(input: unknown): Promise<ListProductsResult> {
  const filters = catalogParamsSchema.parse(input);
  await requireSession();
  const [page, total, batch] = await Promise.all([
    fetchCatalogRows(filters).then((r) => r),
    fetchCatalogCount(filters),
    fetchBatchStamp(),
  ]);
  const pageCount = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  const clamped = pageCount === 0 ? 1 : Math.min(page.normPage, pageCount);
  let rows = page.rows;
  if (clamped !== page.normPage) {
    const fixed = buildCatalogQueries({ ...filters, page: clamped });
    const found = await prisma.$queryRaw<CatalogSqlRow[]>(fixed.rows);
    const { toDTO } = await import("@/features/catalog/data/catalog-query");
    rows = found.map(toDTO);
  }
  return { rows, total, page: clamped, pageSize: filters.pageSize, pageCount, batch };
}
```

- [ ] **Step 4: Build passes with cacheComponents**

Run: `pnpm build`
Expected: build succeeds; catalog route shows partial-prerender marker (◐) or static, never a `next-request-in-use-cache` error. If that error appears, a runtime API leaked into cached scope — move it out, never silence.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts features/catalog/data/cached-catalog.ts features/catalog/data/list-products.ts
git commit -m "feat(sh-32): cached catalog fetchers with region tags"
```

---

### Task 6: SH-32 streaming shell

**Files:**
- New: `features/catalog/pages/catalog-results.tsx`
- Modify: `app/dashboard/catalog/page.tsx`
- Modify: `features/catalog/pages/products-page.tsx` (only if needed to accept streamed table)

**Interfaces:**
- Consumes: `listProducts`, `getTodayProgress` (existing signatures, unchanged).
- Produces: route paints header/toolbar skeleton instantly; table + progress stream via Suspense. No prop-shape changes to `ProductsView`.

- [ ] **Step 1: Create stream children**

```tsx
// features/catalog/pages/catalog-results.tsx
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getTodayProgress } from "@/features/catalog/data/get-today-progress";
import { listProducts } from "@/features/catalog/data/list-products";
import { ProductsView } from "@/features/catalog/components/products-view";
import type { CatalogParams } from "@/features/catalog/schemas";

export function CatalogTableStream({ params }: { params: CatalogParams }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <CatalogTableInner params={params} />
    </Suspense>
  );
}

async function CatalogTableInner({ params }: { params: CatalogParams }) {
  const result = await listProducts(params);
  return (
    <ProductsView
      dtos={result.rows}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      view={params.view}
    />
  );
}

export async function CatalogProgress() {
  const progress = await getTodayProgress();
  const remaining = Math.max(progress.target - progress.count, 0);
  return (
    <p className="text-sm font-semibold tabular-nums">
      {progress.count}/{progress.target} hari ini
      <span className="font-normal text-muted-foreground">
        {remaining > 0 ? ` · sisa ${remaining}` : " · target tercapai"}
      </span>
    </p>
  );
}
```

- [ ] **Step 2: Slim the route to shell + streams**

Rewrite `app/dashboard/catalog/page.tsx`:

```tsx
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductsToolbar } from "@/features/catalog/components/products-toolbar";
import { catalogParamsSchema } from "@/features/catalog/schemas";
import {
  CatalogProgress,
  CatalogTableStream,
} from "@/features/catalog/pages/catalog-results";

interface CatalogRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CatalogRoute({ searchParams }: CatalogRouteProps) {
  const sp = await searchParams;
  const params = catalogParamsSchema.parse({
    view: Array.isArray(sp.view) ? sp.view[0] : sp.view,
    region: Array.isArray(sp.region) ? sp.region[0] : sp.region,
    q: Array.isArray(sp.q) ? sp.q[0] : sp.q,
    page: Array.isArray(sp.page) ? sp.page[0] : sp.page,
    pageSize: Array.isArray(sp.pageSize) ? sp.pageSize[0] : sp.pageSize,
    sort: Array.isArray(sp.sort) ? sp.sort[0] : sp.sort,
    dir: Array.isArray(sp.dir) ? sp.dir[0] : sp.dir,
  });
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <Suspense fallback={<Skeleton className="h-5 w-40" />}>
            <CatalogProgress />
          </Suspense>
        </div>
      </div>
      <ProductsToolbar />
      <CatalogTableStream params={params} />
    </div>
  );
}
```

Keep the header count line (`{result.total} produk · Region`) and batch stamp + methodology tooltip inside the streamed table area (move from `products-page.tsx` into `CatalogTableInner` surroundings or a small server component in the same new file) so the shell never waits on data. Methodology text stays verbatim.

- [ ] **Step 3: Verify stream behavior**

Run: `pnpm build && pnpm start`
Expected: catalog route builds; first paint shows header + toolbar + skeletons, rows + progress populate after. `products-page.tsx` untouched unless the header move requires it — prefer leaving it for the old path and deleting it in this task if fully replaced (update its single importer, this route).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/catalog/page.tsx features/catalog/pages/catalog-results.tsx features/catalog/pages/products-page.tsx
git commit -m "feat(sh-32): stream catalog shell with suspense holes"
```

---

### Task 7: SH-32 client cache + prefetch

**Files:**
- New: `features/catalog/actions/get-catalog-page.ts`
- Modify: `features/catalog/components/products-view.tsx`

**Interfaces:**
- Consumes: `listProducts` (server-only, unchanged) via the new server action; existing `catalogHref`, `COLUMN_SORT_ID`, `VIEW_DEFAULT_SORT`, `SORT_DEFAULT_DIR` unchanged.
- Produces: same rendered table + same URL source of truth; refetches go through TanStack with previous-page retention and neighbor prefetch. No visual changes.

- [ ] **Step 1: Create the refetch server action**

```ts
// features/catalog/actions/get-catalog-page.ts
"use server";

import "server-only";

import { listProducts } from "@/features/catalog/data/list-products";
import type { CatalogParams } from "@/features/catalog/schemas";

export async function getCatalogPage(params: CatalogParams) {
  return listProducts(params);
}
```

- [ ] **Step 2: Wire `useQuery` with initial data + prefetch**

In `features/catalog/components/products-view.tsx`:

```tsx
"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
```

Build the stable key from live URL values the component already reads (`view` prop + `searchParams` for region/q/page/pageSize/sort/dir), mirroring `catalogParamsSchema` defaults (view `all`, region `MY`, page `1`, pageSize `25`, dir `desc`). Query fn calls `getCatalogPage(parsedParams)`. Pass:

```tsx
const query = useQuery({
  queryKey: ["catalog", view, region, q, page, pageSize, sortId, sortDir],
  queryFn: () => getCatalogPage(parsed),
  initialData: { rows: dtos, total, page, pageSize, pageCount: Math.ceil(total / pageSize), batch: null },
  placeholderData: keepPreviousData,
  staleTime: 60_000,
  gcTime: 300_000,
});
```

Render rows from `query.data.rows` (mapped via existing `dtoToCatalogRow`), totals from `query.data`. Prefetch neighbors:

```tsx
const queryClient = useQueryClient();
function prefetchPage(nextPage: number) {
  queryClient.prefetchQuery({
    queryKey: ["catalog", view, region, q, nextPage, pageSize, sortId, sortDir],
    queryFn: () => getCatalogPage({ ...parsed, page: nextPage }),
    staleTime: 60_000,
  });
}
```

Call `prefetchPage(page + 1)` on Next-button hover/focus and `prefetchPage(page - 1)` on Prev hover. Keep all existing `router.replace(catalogHref(...))` handlers byte-identical in behavior; URL remains source of truth.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: zero errors. `initialData` shape must satisfy the query return type — reuse `ListProductsResult` (import type from `@/features/catalog/types`); batch for initialData comes from a new `batch` prop if the streamed header still needs it, else `null` is acceptable only when nothing reads it.

- [ ] **Step 4: Manual check**

Run dev, open catalog: sort a column (previous rows stay visible during refetch), hover Next (network shows prefetch), back/forward serves instantly, URL shareable unchanged.

- [ ] **Step 5: Commit**

```bash
git add features/catalog/actions/get-catalog-page.ts features/catalog/components/products-view.tsx
git commit -m "feat(sh-32): client catalog cache with prefetch"
```

---

### Task 8: Verification + acceptance (SH-31)

**Files:** none (evidence only).

- [ ] **Step 1: Cold vs warm timing**

With `pnpm start` (production build from Task 5): load `/dashboard/catalog?region=MY` cold, then repeat + switch view/sort. Record ms from server timing / network panel.
Expected: warm <400ms p95 feel, cold <1200ms.

- [ ] **Step 2: Import isolation check**

Import a small MY file via import page; immediately reload SG catalog.
Expected: MY refetches once, SG serves warm (no refetch waterfall).

- [ ] **Step 3: Acceptance sweep**

Best view orders by total sales desc; trending hides `sales30d < 10` and orders sales→growth; region switch changes rows; 1-char search is ignored (no filter); page 201+ clamps; out-of-range page clamps to last valid.
Expected: all match pre-overhaul behavior.

- [ ] **Step 4: Report**

Post a `progress` comment on SH-31 with timings + EXPLAIN highlights, move SH-31 and subs to `In Review` with the PR URL (per linear-tracking: `review` comment = PR URL + 2–4 test steps).

---

## Self-review

- Spec coverage: MV+pointer (§3) → Tasks 2–4; indexes (§3) → Task 1; `use cache`+tags+TTL (§3) → Task 5; Suspense (§3) → Task 6; TanStack (§3) → Task 7; OFFSET/TRUTH kept → Tasks 4/7; per-region purge → Task 3; verification §8 → Task 8. Methodology tooltip + batch stamp preserved in Task 6 step 2.
- Placeholder scan: no TBD/TODO; every code step shows exact code; commands have expected outputs; no "similar to Task N".
- Type consistency: `CatalogSqlRow`/`ResolvedCatalogFilters`/`CatalogParams`/`ListProductsResult` names match existing files; `normalizeCatalogParams` produced in Task 4, consumed in Task 5; tag strings identical in Tasks 3 and 5; `getCatalogPage(params: CatalogParams)` matches Task 7 queryFn usage.
