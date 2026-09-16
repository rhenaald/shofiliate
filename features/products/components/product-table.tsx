"use client";

import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";

import { Copy, Pin, Download, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { productColumns, SORTABLE_COLUMNS } from "@/features/products/components/product-columns";
import type { ProductRow } from "@/features/products/types";

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

export function ProductTable({ data, isLoading = false }: { data: ProductRow[]; isLoading?: boolean }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const categories = React.useMemo(
    () => Array.from(new Set(data.map((d) => d.category))).filter((c) => c !== "-").sort(),
    [data],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (!q) return true;
      return d.productName.toLowerCase().includes(q) || d.shopName.toLowerCase().includes(q);
    });
  }, [data, query, category]);

  const table = useTable({
    features,
    data: filtered,
    columns: productColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination },
  });
  const page = table.atoms.pagination.get();
const selectedCount = table.getFilteredSelectedRowModel().rows.length;
const activeSort = sorting[0];
const sortValue = activeSort
  ? `${SORTABLE_COLUMNS.find((c) => c.id === activeSort.id)?.label ?? activeSort.id} (${activeSort.desc ? "Desc" : "Asc"})`
  : "Default";
const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
const [jumpKey, setJumpKey] = React.useState<number | null>(null);
const [jumpValue, setJumpValue] = React.useState("");
const pageCount = table.getPageCount();

function applySort(columnId: string) {
  const current = sorting.find((s) => s.id === columnId);
  if (current && (current.desc ? "desc" : "asc") === sortDir) {
    table.resetSorting();
  } else {
    table.getColumn(columnId)?.toggleSorting(sortDir === "desc");
  }
}

function applySortDir(dir: "asc" | "desc") {
  setSortDir(dir);
  const current = sorting[0];
  if (current) table.getColumn(current.id)?.toggleSorting(dir === "desc");
}

function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = [...new Set([0, total - 1, current - 1, current, current + 1])]
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = -2;
  pages.forEach((p) => {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  });
  return out;
}

function goJump() {
  const n = Number.parseInt(jumpValue, 10);
  if (Number.isFinite(n)) table.setPageIndex(Math.min(Math.max(n - 1, 0), Math.max(pageCount - 1, 0)));
  setJumpKey(null);
}

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={selectedCount === 0} onClick={() => toast.add({ title: "Pin — coming in SH-9" })}>
            <Pin className="size-3.5" />
            Pin
          </Button>
          <Button variant="outline" size="sm" disabled={selectedCount === 0} onClick={() => toast.add({ title: "Copy link — coming in SH-6" })}>
            <Copy className="size-3.5" />
            Copy link
          </Button>
          <Button variant="outline" size="sm" disabled={selectedCount === 0} onClick={() => toast.add({ title: "Export — coming in SH-6" })}>
            <Download className="size-3.5" />
            Export
          </Button>
          <Button variant="ghost" size="sm" disabled={selectedCount === 0} onClick={() => table.resetRowSelection()}>
            Clear
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Input
            placeholder="Search product or shop..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              table.setPageIndex(0);
            }}
            className="pr-9"
          />
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="max-w-72">
                  <span className="min-w-0 truncate">Category: {category === "all" ? "All" : category}</span>
                  <ChevronDown className="size-3.5 shrink-0" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="max-h-64 w-72">
              <DropdownMenuRadioGroup
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  table.setPageIndex(0);
                }}
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                {categories.map((c) => (
                  <DropdownMenuRadioItem key={c} value={c}>
                    {c}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="max-w-64">
                  <span className="min-w-0 truncate">Sort: {sortValue}</span>
                  <ChevronDown className="size-3.5 shrink-0" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuRadioGroup value={sortDir} onValueChange={(v) => applySortDir(v as "asc" | "desc")}>
                <DropdownMenuRadioItem value="asc">Ascending ↑</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">Descending ↓</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              {SORTABLE_COLUMNS.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => applySort(c.id)}>
                  {c.label}
                </DropdownMenuItem>
              ))}
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
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.id === "select" ? "sticky left-0 z-10 bg-background" : undefined}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={productColumns.length}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === "select" ? "sticky left-0 z-10 bg-background" : undefined}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={productColumns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p>No results.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                        table.resetSorting();
                        table.resetColumnFilters();
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length === 0 ? 0 : page.pageIndex * page.pageSize + 1}–
          {table.getRowModel().rows.length === 0 ? 0 : page.pageIndex * page.pageSize + table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {page.pageSize} / page
                <ChevronDown className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={String(page.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              {[10, 25, 50, 100].map((s) => (
                <DropdownMenuRadioItem key={s} value={String(s)}>
                  {s}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft className="size-4" />
            <span className="sr-only">First page</span>
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          {pageItems(page.pageIndex, pageCount).map((item, i) =>
            item === "ellipsis" ? (
              jumpKey === i ? (
                <span key={`jump-${i}`} className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={jumpValue}
                    onChange={(e) => setJumpValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goJump();
                    }}
                    placeholder="#"
                    aria-label="Go to page number"
                    className="h-8 w-16"
                  />
                  <Button variant="outline" size="sm" className="h-8" onClick={goJump}>
                    Go
                  </Button>
                </span>
              ) : (
                <Button
                  key={`ellipsis-${i}`}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setJumpValue("");
                    setJumpKey(i);
                  }}
                  aria-label="Go to specific page"
                >
                  ...
                </Button>
              )
            ) : (
              <Button
                key={item}
                variant={item === page.pageIndex ? "default" : "outline"}
                size="icon"
                className="size-8"
                onClick={() => table.setPageIndex(item)}
                aria-label={`Go to page ${item + 1}`}
              >
                {item + 1}
              </Button>
            ),
          )}
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="size-4" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <ChevronsRight className="size-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
