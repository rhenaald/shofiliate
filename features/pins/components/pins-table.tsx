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
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronDown,
  Pin,
  PinOff,
  Plus,
} from "lucide-react";

import { BulkActionBar } from "@/components/shared/data-table/bulk-action-bar";
import { DataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { unpin } from "@/features/pins/actions/toggle-pin";
import {
  PINS_SORTABLE_COLUMNS,
  createPinBoardColumns,
} from "@/features/pins/components/pin-columns";
import type { PinsSortId } from "@/features/pins/schemas";
import { PIN_COLUMN_SORT_ID } from "@/features/pins/types";
import type { PinDTO } from "@/features/pins/types";

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  // Wajib ada untuk tipe useTable; tidak memotong baris saat manualPagination aktif.
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

interface PinsTableProps {
  data: PinDTO[];
  total: number;
  page: number;
  pageSize: number;
  sortId: PinsSortId | null;
  sortDir: "asc" | "desc";
  onSortChange: (columnId: string) => void;
  onSelectDirection: (dir: "asc" | "desc") => void;
  onClearSort: () => void;
  onEditNote: (pin: PinDTO) => void;
  onUnpin: (pin: PinDTO) => void;
  onAddPin: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  /** Query + region aktif dari URL — untuk deskripsi empty state. */
  query: string;
  region: string;
  isLoading?: boolean;
}

export function PinsTable({
  data,
  total,
  page,
  pageSize,
  sortId,
  sortDir,
  onSortChange,
  onSelectDirection,
  onClearSort,
  onEditNote,
  onUnpin,
  onAddPin,
  onPageChange,
  onPageSizeChange,
  query,
  region,
  isLoading = false,
}: PinsTableProps) {
  const router = useRouter();
  const columns = React.useMemo(
    () =>
      createPinBoardColumns({
        sortId,
        sortDir,
        onSort: onSortChange,
        onEditNote,
        onUnpin,
      }),
    [sortId, sortDir, onSortChange, onEditNote, onUnpin],
  );
  // Urutan baris adalah otoritas server (pinnedAt desc default / ?sort&dir).
  // Sorting interaktif lokal dimatikan agar tidak menyesatkan.
  const [sorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({
      region: false,
      sales30d: false,
      growth30d: false,
      gmv30d: false,
      listedOn: false,
    });
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useTable({
    features,
    data,
    columns,
    manualPagination: true,
    rowCount: total,
    autoResetPageIndex: false,
    onSortingChange: () => {},
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const current: PaginationState = { pageIndex: page - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      if (next.pageSize !== pageSize) {
        onPageSizeChange(next.pageSize);
      } else if (next.pageIndex + 1 !== page) {
        onPageChange(next.pageIndex + 1);
      }
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex: page - 1, pageSize },
    },
  });
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageCount = table.getPageCount();

  const bulkUnpinMutation = useMutation({
    mutationKey: ["pins", "bulk-unpin"],
    mutationFn: async (pinIds: string[]) => {
      await Promise.all(pinIds.map((id) => unpin({ pinId: id })));
      return pinIds.length;
    },
  });

  const bulkActions = React.useMemo(
    () => [
      {
        id: "unpin",
        label: "Unpin",
        icon: PinOff,
        onClick: () => {
          if (bulkUnpinMutation.isPending) return;
          const ids = table
            .getFilteredSelectedRowModel()
            .rows.map((r) => r.original.pinId);
          if (ids.length === 0) return;
          bulkUnpinMutation.mutate(ids, {
            onSuccess: (count) => {
              toast.add({ title: `${count} pin dihapus` });
              table.resetRowSelection();
              router.refresh();
            },
            onError: (error) => {
              toast.add({
                title:
                  error instanceof Error
                    ? error.message
                    : "Gagal menghapus pin",
              });
            },
          });
        },
      },
    ],
    [table, bulkUnpinMutation, router],
  );

  const activeColumnId =
    Object.keys(PIN_COLUMN_SORT_ID).find(
      (c) => PIN_COLUMN_SORT_ID[c] === sortId,
    ) ?? null;

  // Satu diksi untuk semua kondisi kosong: judul netral yang sama +
  // deskripsi menyebut cakupan aktif (query/region) + satu aksi Tambah pin.
  const trimmedQuery = query.trim();
  const emptyDescription =
    trimmedQuery !== "" && region !== "MY"
      ? `Tidak ada pin untuk “${trimmedQuery}” di region ${region}. Coba kata kunci atau region lain.`
      : trimmedQuery !== ""
        ? `Tidak ada pin untuk “${trimmedQuery}”. Coba kata kunci lain.`
        : `Tidak ada pin di region ${region}. Coba tambah pin baru.`;

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">{total} pin aktif</p>
        <DataTableViewOptions
          table={table}
          sortableColumns={PINS_SORTABLE_COLUMNS}
          activeColumnId={activeColumnId}
          direction={sortDir}
          onSelectColumn={onSortChange}
          onSelectDirection={onSelectDirection}
          onClearSort={onClearSort}
        />
      </div>
      <ScrollArea className="w-full rounded-md border">
        <Table containerClassName="overflow-visible" className="w-full min-w-max">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "select"
                        ? "sticky left-0 z-10 bg-background"
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "select"
                          ? "sticky left-0 z-10 bg-background"
                          : undefined
                      }
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-4 py-12">
                  <div
                    role="status"
                    className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                    >
                      <Pin className="size-5" />
                    </span>
                    <p className="text-sm font-semibold">Tidak ada hasil</p>
                    <p className="text-xs text-muted-foreground">
                      {emptyDescription}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddPin}
                      className="mt-1"
                    >
                      <Plus className="size-3.5" />
                      Tambah pin
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Showing{" "}
          {table.getRowModel().rows.length === 0
            ? 0
            : (page - 1) * pageSize + 1}
          –{(page - 1) * pageSize + table.getRowModel().rows.length} of {total}
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
              {[10, 25, 50, 100].map((s) => (
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
          {pageItems(page - 1, pageCount).map((item, i) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page - 1 ? "default" : "outline"}
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
        selectedCount={selectedCount}
        actions={bulkActions}
        onClear={() => table.resetRowSelection()}
      />
    </div>
  );
}
