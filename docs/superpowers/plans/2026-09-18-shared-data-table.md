# Shared DataTable Helpers + View Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add generic `withSelectColumn` / `withActionColumn` helpers and a `DataTableViewOptions` component to `components/shared/data-table/`, then switch catalog to them without changing server behavior.

**Architecture:** Two new self-contained shared modules (columns, view-options) typed against TanStack Table v9 `ColumnDef<DataTableFeatures, T>`. Catalog keeps its server sort/pagination logic and only swaps column definitions plus the view-options toolbar slot.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, `@tanstack/react-table@9.2.4` (new `tableFeatures` / `useTable` API), Base UI dropdown-menu primitives, lucide-react icons, `@/` path alias.

## Global Constraints

- No `"use client"` under `app/`. Shared table modules are client components (`"use client"` first line) under `components/`.
- Never import `@/features/*` inside `components/shared/*`. Shared props stay generic (`activeColumnId: string | null`).
- Never import `@prisma/client` directly (not touched here).
- Use `@/` alias imports. No relative imports across folders.
- Server sort stays authority. No local sorting changes.
- Repo has no unit test runner (`package.json` has no test script; `tests/` holds tsx scripts only). Each task's test cycle is `pnpm tsc --noEmit` plus `pnpm eslint` on touched files plus the manual checklist in Task 5.

---

## File Structure

- Create: `components/shared/data-table/columns.tsx` — `RowAction` type, `withSelectColumn<T>()`, `withActionColumn<T>(options)`. One responsibility: generic column factories.
- Create: `components/shared/data-table/view-options.tsx` — `DataTableViewOptions` with display-columns dropdown and two-section sort dropdown. One responsibility: right-aligned toolbar controls.
- Modify: `features/catalog/components/product-columns.tsx` — replace inline select/actions definitions with helpers. Keeps `SortHeader`, `SORTABLE_COLUMNS`, server header factory.
- Modify: `features/catalog/components/product-table.tsx` — replace Columns dropdown block with `DataTableViewOptions`, forward two new sort props.
- Modify: `features/catalog/components/products-view.tsx` — add explicit direction/clear sort handlers, pass them down.

---

### Task 1: Shared column helpers

**Files:**
- Create: `components/shared/data-table/columns.tsx`
- Test: type-check + lint (no test runner in repo)

**Interfaces:**
- Consumes: `ColumnDef` type from `@tanstack/react-table`, `DataTableFeatures` from `@/components/data-table`, `Button` from `@/components/ui/button`, `DropdownMenu*` from `@/components/ui/dropdown-menu`, `LucideIcon` type + `MoreHorizontal` from `lucide-react`.
- Produces: `RowAction` (used by Task 3), `withSelectColumn<T>()` (used by Task 3), `withActionColumn<T>(options)` (used by Task 3).

- [ ] **Step 1: Create `components/shared/data-table/columns.tsx`**

```tsx
"use client";

import type { ColumnDef, RowData } from "@tanstack/react-table";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  onSelect: () => void;
}

export function withSelectColumn<T extends RowData>(): ColumnDef<DataTableFeatures, T> {
  return {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => {
      const all = table.getIsAllRowsSelected();
      const some = table.getIsSomeRowsSelected();
      return (
        <input
          type="checkbox"
          role="checkbox"
          aria-label="Pilih semua"
          checked={all}
          ref={(el) => {
            if (el) el.indeterminate = !all && some;
          }}
          onChange={(e) => table.toggleAllRowsSelected(e.target.checked)}
          className="size-4 accent-current"
        />
      );
    },
    cell: ({ row }) => (
      <input
        type="checkbox"
        role="checkbox"
        aria-label="Pilih baris"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        className="size-4 accent-current"
      />
    ),
  };
}

export function withActionColumn<T extends RowData>(options: {
  id?: string;
  header?: string;
  getItems: (data: T) => RowAction[];
}): ColumnDef<DataTableFeatures, T> {
  const { id = "actions", header = "Actions", getItems } = options;
  return {
    id,
    header: () => <div className="text-center">{header}</div>,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const items = getItems(row.original);
      if (items.length === 0) return null;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Aksi baris">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  disabled={item.disabled}
                  onClick={item.onSelect}
                >
                  {Icon ? <Icon className="size-3.5" /> : null}
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Lint new file**

Run: `pnpm eslint components/shared/data-table/columns.tsx`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/shared/data-table/columns.tsx
git commit -m "feat: shared select/action column helpers"
```

---

### Task 2: Shared view options

**Files:**
- Create: `components/shared/data-table/view-options.tsx`
- Test: type-check + lint

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`; `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuCheckboxItem`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`; `ChevronDown` from `lucide-react`.
- Produces: `SortableColumn`, `DataTableViewOptions` (used by Task 4).

- [ ] **Step 1: Create `components/shared/data-table/view-options.tsx`**

```tsx
"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SortableColumn {
  id: string;
  label: string;
}

/** Minimal structural table surface. Avoids coupling shared UI to table generics. */
export interface ViewOptionsTable {
  getAllColumns: () => Array<{
    id: string;
    getCanHide: () => boolean;
    getIsVisible: () => boolean;
    toggleVisibility: (visible: boolean) => void;
  }>;
}

interface DataTableViewOptionsProps {
  table: ViewOptionsTable;
  sortableColumns: readonly SortableColumn[];
  activeColumnId: string | null;
  direction: "asc" | "desc";
  onSelectColumn: (columnId: string) => void;
  onSelectDirection: (dir: "asc" | "desc") => void;
  onClearSort: () => void;
}

export function DataTableViewOptions({
  table,
  sortableColumns,
  activeColumnId,
  direction,
  onSelectColumn,
  onSelectDirection,
  onClearSort,
}: DataTableViewOptionsProps) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Sort
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={direction}
            onValueChange={(v) => onSelectDirection(v as "asc" | "desc")}
          >
            <DropdownMenuRadioItem value="asc" disabled={activeColumnId === null}>
              Ascending
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc" disabled={activeColumnId === null}>
              Descending
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeColumnId ?? ""}
            onValueChange={(v) => {
              if (v) onSelectColumn(v);
            }}
          >
            {sortableColumns.map((col) => (
              <DropdownMenuRadioItem key={col.id} value={col.id}>
                {col.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClearSort}>Clear sort</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Columns
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="max-h-64 w-56">
          {table
            .getAllColumns()
            .filter((col) => col.getCanHide())
            .map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(!!v)}
              >
                {col.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Lint new file**

Run: `pnpm eslint components/shared/data-table/view-options.tsx`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/shared/data-table/view-options.tsx
git commit -m "feat: shared data-table view options"
```

---

### Task 3: Catalog columns use shared helpers

**Files:**
- Modify: `features/catalog/components/product-columns.tsx`
- Test: type-check + lint

**Interfaces:**
- Consumes: `withSelectColumn`, `withActionColumn` from `@/components/shared/data-table/columns` (Task 1).
- Produces: unchanged exports `createProductColumns(view, opts)` and `SORTABLE_COLUMNS` (used by Task 4).

- [ ] **Step 1: Update imports**

Replace this block:

```tsx
import { sortFn_alphanumeric, sortFn_text, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, MoreHorizontal, Pin } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
```

with this block:

```tsx
import { sortFn_alphanumeric, sortFn_text, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Pin } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import {
  withActionColumn,
  withSelectColumn,
} from "@/components/shared/data-table/columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
```

- [ ] **Step 2: Replace select column definition**

Replace the object literal starting with `id: "select"` (header checkbox + cell checkbox, through its closing `},`) with:

```tsx
    withSelectColumn<CatalogRow>(),
```

Keep the `pin` column object directly after it untouched.

- [ ] **Step 3: Replace actions column definition**

Replace the object literal starting with `id: "actions"` (dropdown with Lihat di Shopee / Pin / Koreksi region, through its closing `},`) with:

```tsx
    withActionColumn<CatalogRow>({
      getItems: (data) => [
        {
          id: "open",
          label: "Lihat di Shopee",
          icon: ExternalLink,
          onSelect: () => {
            if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
          },
        },
        {
          id: "pin",
          label: "Pin",
          icon: Pin,
          onSelect: () => toast.add({ title: "Pin — coming in SH-9" }),
        },
        {
          id: "fix-region",
          label: "Koreksi region",
          onSelect: () => toast.add({ title: "Koreksi region — coming in SH-8" }),
        },
      ],
    }),
```

- [ ] **Step 4: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Lint touched file**

Run: `pnpm eslint features/catalog/components/product-columns.tsx`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add features/catalog/components/product-columns.tsx
git commit -m "refactor: catalog columns use shared helpers"
```

---

### Task 4: Catalog table uses shared view options

**Files:**
- Modify: `features/catalog/components/product-table.tsx`
- Modify: `features/catalog/components/products-view.tsx`
- Test: type-check + lint

**Interfaces:**
- Consumes: `DataTableViewOptions` from `@/components/shared/data-table/view-options` (Task 2); `SORTABLE_COLUMNS` from `@/features/catalog/components/product-columns` (Task 3); `COLUMN_SORT_ID` from `@/features/catalog/types`; `VIEW_DEFAULT_SORT` already imported in `products-view.tsx`.
- Produces: same `ProductTable` / `ProductsView` component APIs plus two new props on `ProductTable`: `onSelectDirection`, `onClearSort`. No route or URL-shape changes.

- [ ] **Step 1: `product-table.tsx` — update imports**

Add:

```tsx
import { DataTableViewOptions } from "@/components/shared/data-table/view-options";
```

Add `COLUMN_SORT_ID` to the existing types import:

```tsx
import { COLUMN_SORT_ID, type CatalogRow, type CatalogView } from "@/features/catalog/types";
```

Add `SORTABLE_COLUMNS` next to the existing columns import:

```tsx
import {
  SORTABLE_COLUMNS,
  createProductColumns,
} from "@/features/catalog/components/product-columns";
```

Remove `DropdownMenuCheckboxItem` from the dropdown-menu import block (Columns list moves to shared). Keep `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuTrigger` (pagination still uses them).

- [ ] **Step 2: `product-table.tsx` — extend props**

Add to `ProductTableProps`:

```tsx
  onSelectDirection: (dir: "asc" | "desc") => void;
  onClearSort: () => void;
```

Destructure both in the function signature next to `onSortChange`.

- [ ] **Step 3: `product-table.tsx` — compute active column id**

Insert after the `bulkActions` memo, before `return (`:

```tsx
  const activeColumnId =
    Object.keys(COLUMN_SORT_ID).find((c) => COLUMN_SORT_ID[c] === sortId) ?? null;
```

- [ ] **Step 4: `product-table.tsx` — swap toolbar block**

Replace the whole block:

```tsx
      <div className="flex flex-wrap items-center gap-2">
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            ... Columns dropdown ...
          </DropdownMenu>
        </div>
      </div>
```

with:

```tsx
      <div className="flex flex-wrap items-center gap-2">
        <DataTableViewOptions
          table={table}
          sortableColumns={SORTABLE_COLUMNS}
          activeColumnId={activeColumnId}
          direction={sortDir}
          onSelectColumn={onSortChange}
          onSelectDirection={onSelectDirection}
          onClearSort={onClearSort}
        />
      </div>
```

- [ ] **Step 5: `products-view.tsx` — add handlers and pass props**

Insert after `handleSortChange`:

```tsx
  function handleSortDirection(dir: "asc" | "desc") {
    const sid = sortId ?? VIEW_DEFAULT_SORT[view]?.id ?? null;
    if (!sid) return;
    replace({ sort: sid, dir });
  }

  function handleClearSort() {
    replace({ sort: null, dir: null });
  }
```

Extend the `<ProductTable ... />` JSX with:

```tsx
        onSelectDirection={handleSortDirection}
        onClearSort={handleClearSort}
```

- [ ] **Step 6: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Lint touched files**

Run: `pnpm eslint features/catalog/components/product-table.tsx features/catalog/components/products-view.tsx`
Expected: no output, exit 0.

- [ ] **Step 8: Commit**

```bash
git add features/catalog/components/product-table.tsx features/catalog/components/products-view.tsx
git commit -m "refactor: catalog table uses shared view options"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Type-check whole repo**

Run: `pnpm tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint all touched files**

Run: `pnpm eslint components/shared/data-table/columns.tsx components/shared/data-table/view-options.tsx features/catalog/components/product-columns.tsx features/catalog/components/product-table.tsx features/catalog/components/products-view.tsx`
Expected: no output, exit 0.

- [ ] **Step 3: Manual acceptance (spec §7)**

  1. Catalog column order identical: select, pin, product, region, category, likes, sales30d, growth30d, totalSales, gmv30d, listedOn, actions.
  2. Row dropdown per row: Lihat di Shopee opens that row's URL in new tab; Pin toast `Pin — coming in SH-9`; Koreksi region toast `Koreksi region — coming in SH-8`.
  3. Sort dropdown top section Asc/Desc disabled with no active sort; enabled otherwise; direction change updates `?dir=` without cycling through clear.
  4. Sort dropdown bottom lists 7 columns; picking same column follows header-click cycle; Clear restores view default order.
  5. Columns checklist hides/shows columns; select + actions columns never hide.
  6. Short table: bulk bar stays fixed at viewport bottom, no gap below it.

---

## Self-Review

**1. Spec coverage.** §4.1 select helper → Task 1 + Task 3 Step 2. §4.2 action helper + catalog mapping → Task 1 + Task 3 Step 3. §4.3 ViewOptions + wiring → Task 2 + Task 4. §5 data flow → Task 4 Steps 5–6 + Task 5 Step 3 items 3–4. §6 edge cases (empty actions → Task 1 `items.length === 0` guard; null sort disables direction → Task 2 `disabled`; unknown id fallback → Task 4 `?? null`). §7 acceptance → Task 5 Step 3 items 1–6. §8 verification commands → Tasks 1–2 Steps 2–3, Tasks 3–4 Steps 4–7, Task 5 Steps 1–2. No gaps.

**2. Placeholder scan.** No TBD/TODO/fill-in-later. Every code step shows complete code. Commands include exact paths and expected output. No "similar to Task N" references — repeated code written out.

**3. Type consistency.** `RowAction` defined Task 1, consumed Task 3 with matching fields. `SortableColumn` + `ViewOptionsTable` + `DataTableViewOptionsProps` defined Task 2; Task 4 passes `SORTABLE_COLUMNS` (`{ id, label }[]`, assignable to `readonly SortableColumn[]`), v9 table instance (structurally provides `getAllColumns` with the four used methods), `activeColumnId: string | null`, `direction` from `sortDir`. Callback names identical across Tasks 2 and 4. Fixed two spec bugs first: generic `activeColumnId` instead of catalog-typed `sortId` in shared, and null-safe direction fallback for `VIEW_DEFAULT_SORT.all = null`.
