"use client";

import { columnFilteringFeature, columnVisibilityFeature, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFn_includesString, rowPaginationFeature, rowSelectionFeature, rowSortingFeature, sortFn_alphanumeric, sortFn_text, tableFeatures, useTable, type PaginationState, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import * as React from "react";
import { CheckCheckIcon, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, SaveIcon, Search, Trash2 } from "lucide-react";

import { BulkActionBar } from "@/components/shared/data-table/bulk-action-bar";
import { DataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { SORTABLE_STAGING_COLUMNS, createStagingColumns } from "@/features/products/components/staging-columns";
import type { StagingRow } from "@/features/products/types";

const features = tableFeatures({
  columnFilteringFeature, columnVisibilityFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  filteredRowModel: createFilteredRowModel(), paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString }, sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

const PAGE_SIZES = [10, 25, 50, 100];

interface StagingTableProps {
  data: StagingRow[];
  onSaveSelected: (ids: string[]) => void;
  onSaveAll: () => void;
  onBulkDelete: (ids: string[]) => void;
  isSaving: boolean;
}

export function StagingTable({ data: initial, onSaveSelected, onSaveAll, onBulkDelete, isSaving }: StagingTableProps) {
  const [data, setData] = React.useState(initial);
  const [prevInitial, setPrevInitial] = React.useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setData(initial);
  }
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [query, setQuery] = React.useState("");
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; ids: string[] }>({
    open: false,
    ids: [],
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => {
      const name = String(r.product_name ?? "").toLowerCase();
      const seller = String(r.seller_name ?? "").toLowerCase();
      return name.includes(q) || seller.includes(q);
    });
  }, [data, query]);

  const activeSort = sorting.length > 0 ? sorting[0] : null;
  const sortId = activeSort ? String(activeSort.id) : null;
  const sortDir = activeSort && activeSort.desc === false ? "asc" : "desc";

  const handleHeaderSort = React.useCallback(
    (columnId: string) => {
      setSorting((prev) => {
        if (prev.length === 0 || String(prev[0].id) !== columnId) {
          return [{ id: columnId, desc: true }];
        }
        if (prev[0].desc) {
          return [{ id: columnId, desc: false }];
        }
        return [];
      });
    },
    [],
  );

  const columns = React.useMemo(
    () =>
      createStagingColumns((id) => onBulkDelete([id]), {
        sortId,
        sortDir,
        onSort: handleHeaderSort,
      }),
    [onBulkDelete, sortId, sortDir, handleHeaderSort],
  );

  const table = useTable({
    features, data: filtered, columns,
    getRowId: (row: StagingRow) => row._stagingId,
    enableRowSelection: (row) => row.original._valid,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { rowSelection, sorting, pagination },
  });
  const selectedIds = table.getSelectedRowIds();
  const validCount = filtered.filter((r) => r._valid).length;
  const pageCount = table.getPageCount();
  const page = pagination.pageIndex + 1;
  const pageSize = pagination.pageSize;
  const total = table.getFilteredRowModel().rows.length;

  function pageItems(current: number, count: number): (number | "ellipsis")[] {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i);
    const pages = [...new Set([0, count - 1, current - 1, current, current + 1])]
      .filter((p) => p >= 0 && p < count)
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

  const handleConfirmDelete = React.useCallback(() => {
    if (deleteDialog.ids.length === 0) return;
    setDeleteDialog((prev) => ({ ...prev, open: false }));
    table.resetRowSelection();
    onBulkDelete(deleteDialog.ids);
  }, [deleteDialog.ids, onBulkDelete, table]);

  const handleBulkDeleteClick = React.useCallback(() => {
    if (selectedIds.length === 0) return;
    setDeleteDialog({ open: true, ids: selectedIds });
  }, [selectedIds]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama / seller..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            className="h-8 w-56 pl-8"
            aria-label="Cari staging"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const all = table.getFilteredRowModel().rows.filter((r) => r.getCanSelect());
          const next: RowSelectionState = {};
          all.forEach((r) => { next[r.id] = true; });
          setRowSelection(next);
        }}>
          <CheckCheckIcon className="size-3.5 mr-1.5" /> Pilih semua hasil filter ({table.getFilteredRowModel().rows.filter((r) => r.getCanSelect()).length})
        </Button>
        <Button size="sm" onClick={onSaveAll} disabled={isSaving || validCount === 0}>
          <SaveIcon className="size-3.5 mr-1.5" /> Masukkan semua
        </Button>
        <DataTableViewOptions table={table} sortableColumns={SORTABLE_STAGING_COLUMNS} activeColumnId={sortId} direction={sortDir} onSelectColumn={(colId) => setSorting([{ id: colId, desc: true }])} onSelectDirection={(dir) => setSorting((s) => (s.length > 0 ? [{ id: s[0].id, desc: dir === "desc" }] : s))} onClearSort={() => setSorting([])} />
      </div>
      <ScrollArea className="w-full rounded-md border">
        <Table className="w-full min-w-max">
          <TableHeader>{table.getHeaderGroups().map((hg) => (<TableRow key={hg.id}>{hg.headers.map((h) => (<TableHead key={h.id} className={h.column.id === "select" ? "sticky left-0 z-10 bg-background" : undefined}>{h.isPlaceholder ? null : <table.FlexRender header={h} />}</TableHead>))}</TableRow>))}</TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (<TableCell key={cell.id} className={cell.column.id === "select" ? "sticky left-0 z-10 bg-background" : undefined}><table.FlexRender cell={cell} /></TableCell>))}
              </TableRow>
            )) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>)}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Showing{" "}
          {table.getRowModel().rows.length === 0
            ? 0
            : pagination.pageIndex * pageSize + 1}
          –{pagination.pageIndex * pageSize + table.getRowModel().rows.length} of {total}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {pageSize} / page
                <ChevronDown className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={String(pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              {PAGE_SIZES.map((s) => (
                <DropdownMenuRadioItem key={s} value={String(s)}>
                  {s}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="size-4" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          {pageItems(pagination.pageIndex, pageCount).map((item, i) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === pagination.pageIndex ? "default" : "outline"}
                size="icon"
                className="size-8"
                onClick={() => table.setPageIndex(item)}
                aria-label={`Go to page ${item + 1}`}
              >
                {item + 1}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="size-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
      <BulkActionBar
        selectedCount={selectedIds.length}
        actions={[
          { id: "save-selected", label: `Masukkan yang dicentang (${selectedIds.length})`, icon: SaveIcon, onClick: () => onSaveSelected(selectedIds) },
          {
            id: "delete",
            label: "Delete",
            icon: Trash2,
            variant: "destructive" as const,
            onClick: handleBulkDeleteClick,
          },
        ]}
        onClear={() => table.resetRowSelection()}
      />
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title={`Hapus ${deleteDialog.ids.length} baris staging?`}
        description="Baris terpilih dihapus permanen dari staging (termasuk database). Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export function stagingDeleteToast(removed: number) {
  toast.add({
    type: "success",
    title: "Baris staging dihapus",
    description: `${removed} baris telah dihapus dari staging.`,
  });
}
