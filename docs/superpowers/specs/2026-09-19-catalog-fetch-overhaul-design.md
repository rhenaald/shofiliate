# Spec — Catalog fetch overhaul, scale 6 regions

- Status: Approved for planning (user approved 2026-09-19)
- Date: 2026-09-19
- Scope: `features/catalog/data/` + `prisma/schema.prisma` + import action + catalog route streaming + TanStack client prefetch (SH-31 parent, subs SH-33/SH-32/SH-34)
- Sources: `features/catalog/data/catalog-query.ts` (DISTINCT ON 2x), `features/catalog/data/list-products.ts` (3 queries/nav), `app/dashboard/catalog/page.tsx` (blocking await), `app/providers.tsx` (unused QueryClient), `prisma/schema.prisma` (missing composite/trigram indexes)
- Decisions (user-confirmed): approach A pointer+MV+cache, most effective with zero new infra (no Redis/KV); minutes-stale OK (rows 5min, count 15min); keep numbered pages + exact count (OFFSET stays); search stays name+shop ILIKE; per-region invalidation

## 1. Goal

- Catalog stays fast at 1800 new rows/day (300/region x 6): p95 nav warm <400ms, cold <1200ms.
- Cut 3 queries/nav to 1 cached hit typical; kill per-request DISTINCT ON; keep sort/best/trending/region behavior identical.

## 2. Non-goals

- No Redis/KV/new infra. No cursor pagination. No full-text/typo search. No realtime-instant freshness. No partitioning until 5M rows proven.

## 3. Architecture

- DB: `Product.latestSnapshotId` pointer set on import + `catalog_latest` MV (UNIQUE region+productId), REFRESH CONCURRENTLY on import + 5-15min cron fallback.
- Indexes: pg_trgm GIN on name/shopName; composite leading region per hot sort + tiebreaker id; partial trending WHERE sales30d >= 10; covering INCLUDE for list width.
- Server: `cacheComponents: true`; `searchParams` parsed outside cached scope; `fetchCatalogRows` (5min) + `fetchCatalogCount` (15min) with `use cache`, `cacheLife`, `cacheTag('catalog','catalog-{region}','catalog-{view}')`; import swaps `revalidatePath` for per-region `revalidateTag`; batch stamp folded into cached metadata.
- Streaming: route renders static shell instantly; table + today-progress each in own Suspense hole (PPR shell + dynamic holes).
- Client: RSC initial data + `useQuery(['catalog', params], placeholderData keepPreviousData, staleTime 60s, gcTime 300s)`; prefetch adjacent pages on hover; search keeps 300ms debounce + minLength 2 + abort stale.

## 4. Components

### 4.1 SH-33 indexes (no code risk, ship first)

- `CREATE EXTENSION pg_trgm`; GIN `name`, `shopName`; composites `(region, historicalSold DESC, id DESC)`, `(region, sales30d DESC, growth30d DESC, id DESC)`, `(region, scrapedAt DESC, id DESC)`, `(region, listedOn DESC NULLS LAST, id DESC)`, `(region, likedCount DESC, id DESC)`, `(region, gmv30d DESC, id DESC)`; partial trending index; EXPLAIN proves index use.

### 4.2 SH-34 pointer + MV (kills DISTINCT ON)

- Migration adds `Product.latestSnapshotId`; import transaction upserts snapshot then points product; backfill once sets pointer to max(scrapedAt, createdAt) per product; MV selects join-by-PK narrow list width; unique index enables CONCURRENTLY (never inside request transaction).

### 4.3 SH-32 cache + stream + prefetch

- Cached fns take plain `CatalogParams` (never searchParams promise); rows TTL 5min, count TTL 15min; tags per region+view; import invalidates only affected regions; route splits blocking await into two Suspense boundaries; table `useQuery` keeps previous page visible during refetch; URL remains source of truth via `router.replace(catalogHref(...))` + startTransition; maxPage 200 guard caps deep-OFFSET abuse.

## 5. Data flow

- Nav/filter/sort: URL change -> cached rows (tag region+view, args include q/page/sort) -> MV index seek on miss -> stream into Suspense table; count served from 15min cache; back/forward served from TanStack memory.
- Import: parse rows -> upsert snapshots -> move pointers -> REFRESH MV CONCURRENTLY -> `revalidateTag('catalog-{region}')` only touched regions -> next nav cold-fetches once.

## 6. Error handling / edge cases

- Stale cursor/page beyond pageCount clamps to last valid page (existing behavior kept).
- Refresh CONCURRENTLY failure falls back to cron retry; readers keep old MV snapshot (never block).
- `use cache` build error (request API inside cached scope) fixed by moving searchParams/cookies reads outside; cache key derives from args only.
- q shorter than 2 chars skips search predicate (avoids cache-key explosion + trigram noise).
- listedOn nulls always NULLS LAST both directions.

## 7. Acceptance

- [ ] p95 nav warm <400ms, cold <1200ms on seeded 500k-row check
- [ ] 3 queries/nav -> 1 cached hit typical; count never hits base tables
- [ ] import invalidates only affected region (other 5 stay warm)
- [ ] page numbers + exact total kept; best/trending/region/sort order unchanged

## 8. Verification

- `EXPLAIN ANALYZE` before/after per sort+search (index seek, no seq scan).
- Seed 500k synthetic products; measure p50/p95 per region/view/sort, count latency, CONCURRENTLY duration.
- Manual: sort each column both dirs; view all/best/trending; region switch; search 2+ chars; deep page clamp; import MY only -> SG cache still warm.
