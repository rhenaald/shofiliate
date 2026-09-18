# Spec — Shared DataTable helpers + view options

- Status: Approved for planning (user approved 2026-09-18)
- Date: 2026-09-18
- Scope: `components/shared/data-table/` expansion + catalog adoption (cols + view options only)
- Sources: catalog `product-columns.tsx` / `product-table.tsx`, generic `components/data-table.tsx`, Base UI dropdown primitives
- Decisions (user-confirmed): per-row action builder, server URL sort, hybrid ViewOptions props, narrow catalog switch

## 1. Goal

- Extract duplicated table patterns into shared helpers: select checkbox column, row-action dropdown column, right-aligned view options (columns visibility + sort).
- Keep catalog server behavior identical: URL sort (`sortId`/`sortDir`/`onSortChange`), server pagination, jump-page, sticky select cells, fixed `BulkActionBar`.
- No full shared shell in this spec. Pagination / loading / empty states stay in catalog.

## 2. Non-goals

- No shared pagination, loading skeleton, or empty-state extraction.
- No local table sorting. Server order remains authority.
- No changes to toolbar URL logic, data fetching, `BulkActionBar`.

## 3. Architecture

- New: `components/shared/data-table/columns.tsx` — `withSelectColumn`, `withActionColumn`, `RowAction` type.
- New: `components/shared/data-table/view-options.tsx` — `DataTableViewOptions`.
- Edited: `features/catalog/components/product-columns.tsx` — call helpers, keep `SortHeader`, `SORTABLE_COLUMNS`, server header factory.
- Edited: `features/catalog/components/product-table.tsx` — replace Columns dropdown block with `DataTableViewOptions`, keep rest untouched.
- Types target TanStack v9: `ColumnDef<DataTableFeatures, T>` via `@/components/data-table`.

## 4. Components

### 4.1 `withSelectColumn<T>()`

- Returns select column: header checkbox (all/some state, indeterminate ref, `table.toggleAllRowsSelected`), cell checkbox (`row.getIsSelected` / `row.toggleSelected`).
- Fixed config: `id: "select"`, `enableSorting: false`, `enableHiding: false`, sticky-left cell classes.
- No props in v1. Width / labels match catalog current implementation.

### 4.2 `withActionColumn<T>({ id, header, getItems })`

- Input: `getItems: (data: T) => RowAction[]` (receives `row.original`), optional `id` (default `"actions"`), optional header label (default `"Actions"`).
- `RowAction = { id: string; label: string; icon?: LucideIcon; disabled?: boolean; onSelect: () => void }`.
- Cell: ghost icon button (`MoreHorizontal`, `size="icon-sm"`, aria-label `"Aksi baris"`) + dropdown of `DropdownMenuItem` per action (icon + label, disabled passthrough).
- Fixed config: `enableSorting: false`, `enableHiding: false`.
- Empty list: trigger button hidden (no dropdown for rows without actions).
- Catalog mapping: Lihat di Shopee (`window.open(row.url, "_blank", "noopener,noreferrer")`), Pin toast `"Pin — coming in SH-9"`, Koreksi region toast `"Koreksi region — coming in SH-8"`.

### 4.3 `DataTableViewOptions({ table, sortableColumns, activeColumnId, direction, onSelectColumn, onSelectDirection, onClearSort })`

- Placement: right-aligned slot above table (`ml-auto` row), replacing current Columns button position.
- Props (all generic — no feature imports inside shared): `table` (v9 instance, for visibility only), `sortableColumns: readonly { id: string; label: string }[]`, `activeColumnId: string | null`, `direction: "asc" | "desc"`, `onSelectColumn: (columnId: string) => void`, `onSelectDirection: (dir: "asc" | "desc") => void`, `onClearSort: () => void`.
- Rationale: catalog `handleSortChange(columnId)` runs 3-step cycle (default → opposite → view default). Direction radio must set explicit direction, never cycle. Separate callbacks keep cycle semantics intact. Generic `activeColumnId` keeps `@/features/*` imports out of shared (per `AGENTS.md`).
- Display dropdown: same behavior as current — `table.getAllColumns().filter((c) => c.getCanHide())`, checkbox items toggling `column.toggleVisibility`.
- Sort dropdown: two sections separated by `DropdownMenuSeparator`.
  - Top: direction radio group (Asc / Desc) bound to `direction`. Disabled when `activeColumnId` is null. Change calls `onSelectDirection(dir)` only.
  - Bottom: column radio list from `sortableColumns` plus Clear item. Selection calls `onSelectColumn(id)` (same cycle as header click). Clear calls `onClearSort()`.
- Catalog wiring (`products-view.tsx` computes, `product-table.tsx` forwards): `activeColumnId = Object.keys(COLUMN_SORT_ID).find((c) => COLUMN_SORT_ID[c] === sortId) ?? null`, `direction = sortDir`, `onSelectColumn = handleSortChange` (existing, unchanged), `onSelectDirection = (dir) => replace({ sort: sortId ?? VIEW_DEFAULT_SORT[view]?.id ?? null, dir })` (no-op when resolved sort null, e.g. view `all` with no explicit sort), `onClearSort = () => replace({ sort: null, dir: null })`. `ProductTable` gains `onSelectDirection` + `onClearSort` forwarded props; existing `onSortChange` stays for header factory. Sort stays URL-shareable.

## 5. Data flow

- Sort column: ViewOptions column pick → `onSelectColumn(id)` = `handleSortChange` cycle → URL update (`?sort&dir`, page reset) → RSC refetch → header highlights via `COLUMN_SORT_ID`.
- Sort direction: ViewOptions direction pick → `onSelectDirection(dir)` → explicit URL `replace({ sort: sortId ?? VIEW_DEFAULT_SORT[view]?.id ?? null, dir })` (no cycle; no-op when null) → RSC refetch.
- Sort clear: Clear item → `onClearSort()` → `replace({ sort: null, dir: null })` → view default order.
- Visibility: local table state only (`columnVisibility`), no URL change.
- Actions: per-row `getItems(row.original)` built at render; no server roundtrip in v1 (toasts / `window.open` only).

## 6. Error handling / edge cases

- `getItems` returns [] → no trigger rendered for that row.
- `sortId` null → direction section disabled, column list shows no selection.
- Column ids in `sortableColumns` must exist in `COLUMN_SORT_ID` mapping; unknown id falls back to no highlight (never throws).
- `table` instance required for visibility section; sort section works on props alone.

## 7. Acceptance

- [ ] Catalog renders identical columns/order: select, pin, product, region, category, likes, sales30d, growth30d, totalSales, gmv30d, listedOn, actions.
- [ ] Row actions match current: Shopee link opens new tab; Pin / Koreksi toasts unchanged.
- [ ] ViewOptions right-aligned above table: Columns checklist toggles visibility; sort dropdown has direction section + column section + clear.
- [ ] Sort column via dropdown matches header-click cycle; direction radio sets explicit dir without cycling; Clear restores view default order.
- [ ] No full-shell changes: pagination, jump-page, loading skeleton, empty state, `BulkActionBar` behavior unchanged.

## 8. Verification

- `pnpm tsc --noEmit` clean.
- `pnpm eslint` clean for touched files.
- Manual: sort URL updates, column hide/show, row dropdown actions, bulk bar fixed bottom, short-table case no gap.
