"use client";

import { columnFilteringFeature, columnVisibilityFeature, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFn_includesString, rowPaginationFeature, rowSelectionFeature, rowSortingFeature, sortFn_alphanumeric, sortFn_text, tableFeatures, useTable, type PaginationState, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import * as React from "react";
import { CheckCheckIcon, ChevronLeft, ChevronRight, SaveIcon } from "lucide-react";

import { BulkActionBar } from "@/components/shared/data-table/bulk-action-bar";
import { DataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SORTABLE_STAGING_COLUMNS, createStagingColumns } from "@/features/products/components/staging-columns";
import type { StagingRow } from "@/features/products/types";

const features = tableFeatures({
  columnFilteringFeature, columnVisibilityFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  filteredRowModel: createFilteredRowModel(), paginatedRowModel: createPaginatedRowModel(), sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString }, sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

export function StagingTable({ data: initial, onSaveSelected, onSaveAll, isSaving }: { data: StagingRow[]; onSaveSelected: (ids: string[]) => void; onSaveAll: () => void; isSaving: boolean }) {
  const [data, setData] = React.useState(initial);
  const [prevInitial, setPrevInitial] = React.useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setData(initial);
  }
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const columns = React.useMemo(() => createStagingColumns((id) => setData((d) => d.filter((r) => r._stagingId !== id))), []);
  const table = useTable({
    features, data, columns,
    getRowId: (row: StagingRow) => row._stagingId,
    enableRowSelection: (row) => row.original._valid,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { rowSelection, sorting, pagination },
  });
  const selectedIds = table.getSelectedRowIds();
  const validCount = data.filter((r) => r._valid).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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
        <DataTableViewOptions table={table} sortableColumns={SORTABLE_STAGING_COLUMNS} activeColumnId={sorting.length > 0 ? String(sorting[0].id) : null} direction={sorting.length > 0 && sorting[0].desc === false ? "asc" : "desc"} onSelectColumn={(colId) => setSorting([{ id: colId, desc: true }])} onSelectDirection={(dir) => setSorting((s) => (s.length > 0 ? [{ id: s[0].id, desc: dir === "desc" }] : s))} onClearSort={() => setSorting([])} />
      </div>
      <ScrollArea className="w-full rounded-md border">
        <Table className="w-full min-w-max">
          <TableHeader>{table.getHeaderGroups().map((hg) => (<TableRow key={hg.id}>{hg.headers.map((h) => (<TableHead key={h.id}>{h.isPlaceholder ? null : <table.FlexRender header={h} />}</TableHead>))}</TableRow>))}</TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>))}
              </TableRow>
            )) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>)}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className="size-3.5 mr-1" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>
      <BulkActionBar selectedCount={selectedIds.length} actions={[{ id: "save-selected", label: `Masukkan yang dicentang (${selectedIds.length})`, icon: SaveIcon, onClick: () => onSaveSelected(selectedIds) }]} onClear={() => table.resetRowSelection()} />
    </div>
  );
}
