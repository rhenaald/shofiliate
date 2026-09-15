# Project Structure

This repo is a Next.js App Router app. Follow this structure strictly.

## `app/` — route callers only, server components only

- `app/` contains route segments (`layout.tsx`, `page.tsx`, `providers.tsx`,
  `api/`) and nothing else.
- Every file under `app/` (except `api/` route handlers) is a React Server
  Component. Never add `"use client"` under `app/`.
- Route files contain no business logic, no data fetching, no validation.
  They only call into a feature's `pages/` composition, e.g.
  `features/auth/pages/sign-in.tsx`.
- Client interactivity lives in `features/<name>/components/`, which route
  compositions import.

## `features/` — one folder per feature

```
features/<feature_name>/
  actions/             # server actions ("use server"): mutations only
  components/          # client/UI components for this feature
  components/shared/   # components shared within this feature
  data/                # data fetching (queries) if necessary, server-only
  pages/               # page-level compositions called from app/ routes
  schemas.ts           # zod validation schemas for this feature
  types.ts             # TypeScript types for this feature
```

Rules:

- A feature owns its logic end to end: `schemas.ts` validates input at the
  `actions/` boundary, `data/` reads via `lib/prisma.ts`, `pages/` composes
  `components/` for the route caller in `app/`.
- `actions/` and `data/` are server-only: start them with
  `import "server-only"` and never import them from a client component.
  Pass serializable props across the server/client boundary.
- Cross-feature shared UI lives in `components/ui/` (shadcn). App-wide
  singletons live in `lib/` (`prisma.ts`, `auth.ts`, `auth-client.ts`,
  `utils.ts`).
- Import with the `@/` alias (`@/features/auth/schemas`,
  `@/components/ui/button`). Never use relative imports across folders.
- `generated/` (Prisma Client output) is gitignored; it is regenerated via
  `pnpm db:generate` / `postinstall`. Never import from `@prisma/client`
  directly — import from `@/generated/prisma/client` via `lib/prisma.ts`.
