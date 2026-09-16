# Design — SH-26 [auth] Login, guard + peran user/admin

- Status: Approved 2026-09-16 (brainstorming, approach A + 2 revisions)
- Issue: SH-26 (`feature/sh-26-auth-login-guard-peran-useradmin`), milestone `[Phase 1] Katalog + filter kurasi usable`
- Sources: Exa (better-auth Next.js 16 proxy/middleware patterns), Context7 (`/better-auth/better-auth` — proxy, getSession, admin `defaultRole`/`adminRoles`), Sequential-thinking (3-step gap analysis)
- Clarifier decisions: (1) username-only sign-in, email deferred; (2) env-based seed scripts, dev/prod differentiated; (3) helpers-only audit in SH-26, AuditLog model deferred to products

## 1. Goal & scope

Goal: Hanya user login akses dashboard; admin kelola tim.
In: sign-in username, proxy guard `/dashboard/**`, role default user via Prisma enum, admin via admin plugin, session helpers di `data/`, seed gateway dev/prod.
Out: OAuth, invite email, sign-up page, AuditLog model, region-correction UI (products issues).

Acceptance (from SH-26):
- [ ] `/dashboard` tanpa session → redirect sign-in
- [ ] admin koreksi region siapa pun + tercatat (SH-26 delivers enforcement helpers; tercatat/model+UI in products); user biasa hanya milik sendiri (ownership helper)
- [ ] addedBy/importedBy/pinnedBy dari session (helpers canonical)

## 2. Approach (A chosen)

A (chosen): `proxy.ts` optimistic cookie check + dashboard layout server validation + `features/auth/data/session.ts` helpers + seed gateway.
B (rejected): proxy full-validation only — DB hit per request, still needs helpers.
C (rejected): layout checks only — RSC flash before redirect, violates "middleware guard" spec.

## 3. Guard architecture (2 layers)

- `proxy.ts` (repo root, Next.js 16): `getSessionCookie(request)` only, no DB. No cookie + path `/dashboard/:path*` → `redirect('/sign-in')`. Has cookie + `/sign-in` → `redirect('/dashboard')`. Matcher covers `/dashboard/:path*`.
- `app/dashboard/layout.tsx` (RSC caller, no logic): delegates to `features/auth` guard (server-only) running `auth.api.getSession({ headers: await headers() })`. No session → `redirect('/sign-in')`. Secure layer; satisfies "check in each page/route" rule.
- Convention: no `"use client"` under `app/`; `@/` alias imports.

## 4. Session helpers (`features/auth/data/session.ts`, `import "server-only"`)

- `getSession()` → session | null. `requireSession()` → session or throws `AUTH_UNAUTHORIZED`. `requireAdmin()` → throws `AUTH_FORBIDDEN` unless `role === "admin"`. `isAdmin(session)`, `requireOwnershipOrAdmin(ownerId, session?)` (admin pass-through, user must equal owner).
- All future `actions/`/`data/` (products) call these first; `addedBy/importedBy/pinnedBy = session.user.id`, never client input. Throw coded errors; actions map to Indonesian user-safe messages. Pages use `redirect()`, never swallow.

## 5. Roles (REVISED → Prisma enum)

- `enum Role { user admin }`, `User.role Role @default(user)` non-nullable (replaces `String?`). `lib/auth.ts`: `adminPlugin({ defaultRole: "user", adminRoles: ["admin"] })` explicit. Helpers use `Role` type from `@/generated/prisma/client`; direct `=== "admin"` comparison, no null fallback.
- Migration: `pnpm db:migrate` backfills existing NULL → `'user'`, then `pnpm db:generate`. Single schema migration in SH-26.

## 6. Seed gateway (REVISED → dispatcher + specializations)

- `prisma/seed.ts`: gateway only. Target from `argv --env=development|production`, fallback `SEED_ENV ?? NODE_ENV`. Dynamic-imports `./seed_development` / `./seed_production`. Unknown env → fail fast with usage.
- `prisma/seed_development.ts`: upsert admin + demo user(s) from `SEED_DEV_*` vars; safe local defaults allowed; idempotent; verbose logs (no secrets).
- `prisma/seed_production.ts`: strict — requires `SEED_PROD=true` + all `SEED_PROD_ADMIN_*` present, no defaults, fail fast; seeds only env-specified accounts (no demo users unless listed); minimal logging.
- Both use the better-auth API for user creation (admin `createUser` or sign-up + `setRole`; exact call pinned in the implementation plan) so password hashing stays canonical; set `role` enum explicitly. Scripts: `db:seed` (gateway), `db:seed:dev`, `db:seed:prod` via `tsx`.

## 7. Sign-in fixes (username-only)

- Keep `signInSchema` username-only; no email path. Fix copy `Enter your email below` → username wording. Fix `router.push("/")` → `router.push("/dashboard")`. No sign-up page.

## 8. Error handling & UAT

- Proxy/layout: silent redirect. Helpers/actions: coded throws → mapped messages. UAT: (a) incognito `/dashboard` → `/sign-in`; (b) seeded user login → dashboard; (c) `requireAdmin` admin vs user truth table; (d) `requireOwnershipOrAdmin` table. Verify via `pnpm lint` + `pnpm build`. No new test framework.
