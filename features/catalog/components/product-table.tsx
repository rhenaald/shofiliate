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

import { useRouter } from "next/navigation";
import {
  Copy,
  Pin,
  Download,
  Trash2,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

import { BulkActionBar } from "@/components/shared/data-table/bulk-action-bar";
import { DataTableViewOptions } from "@/components/shared/data-table/view-options";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { exportCatalogToExcel } from "@/features/catalog/components/export-excel";
import { deleteProducts } from "@/features/products/actions/delete-products";
import {
  SORTABLE_COLUMNS,
  createProductColumns,
} from "@/features/catalog/components/product-columns";
import {
  COLUMN_SORT_ID,
  type CatalogRow,
  type CatalogView,
} from "@/features/catalog/types";
import type { CatalogSortId } from "@/features/catalog/schemas";

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

interface ProductTableProps {
  data: CatalogRow[];
  total: number;
  page: number;
  pageSize: number;
  view: CatalogView;
  sortId: CatalogSortId | null;
  sortDir: "asc" | "desc";
  onSortChange: (columnId: string) => void;
  onSelectDirection: (dir: "asc" | "desc") => void;
  onClearSort: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function ProductTable({
  data,
  total,
  page,
  pageSize,
  view,
  sortId,
  sortDir,
  onSortChange,
  onSelectDirection,
  onClearSort,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
  isLoading = false,
}: ProductTableProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    productIds: string[];
    title: string;
    description: string;
  }>({
    open: false,
    productIds: [],
    title: "",
    description: "",
  });
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteSingle = React.useCallback((row: CatalogRow) => {
    setDeleteDialog({
      open: true,
      productIds: [row.productId],
      title: "Hapus Produk",
      description: `Apakah Anda yakin ingin menghapus produk "${row.name}"? Tindakan ini tidak dapat dibatalkan.`,
    });
  }, []);

  const columns = React.useMemo(
    () =>
      createProductColumns(
        view,
        { sortId, sortDir, onSort: onSortChange },
        handleDeleteSingle,
      ),
    [view, sortId, sortDir, onSortChange, handleDeleteSingle],
  );
  // Urutan baris adalah otoritas server (sort per view / ?sort&dir).
  // Sorting interaktif lokal dimatikan agar tidak menyesatkan (hanya 1 halaman terlihat).
  const [sorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({
      pin: false,
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
  const [jumpKey, setJumpKey] = React.useState<number | null>(null);
  const [jumpValue, setJumpValue] = React.useState("");
  const pageCount = table.getPageCount();

  function pageItems(current: number, total: number): (number | "ellipsis")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages = [
      ...new Set([0, total - 1, current - 1, current, current + 1]),
    ]
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
    if (Number.isFinite(n))
      table.setPageIndex(
        Math.min(Math.max(n - 1, 0), Math.max(pageCount - 1, 0)),
      );
    setJumpKey(null);
  }

  const handleBulkCopyLink = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const affiliateUrls = selectedRows
      .map((r) => r.original.affiliateUrl?.trim())
      .filter((url): url is string => Boolean(url && url.length > 0));

    if (affiliateUrls.length === 0) {
      toast.add({
        type: "warning",
        title: "Tidak ada link affiliate",
        description: "Produk yang dipilih belum memiliki link affiliate.",
      });
      return;
    }

    navigator.clipboard.writeText(affiliateUrls.join("\n"));

    if (affiliateUrls.length === selectedRows.length) {
      toast.add({
        type: "success",
        title: `${affiliateUrls.length} link affiliate disalin`,
        description: "Semua link affiliate berhasil disalin ke clipboard.",
      });
    } else {
      toast.add({
        type: "info",
        title: `${affiliateUrls.length} link affiliate disalin`,
        description: `${selectedRows.length - affiliateUrls.length} produk lainnya belum memiliki link affiliate.`,
      });
    }
  }, [table]);

  const handleBulkExport = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const rowsToExport = selectedRows.map((r) => r.original);
    exportCatalogToExcel(rowsToExport, "katalog-produk-terpilih");
    toast.add({
      type: "success",
      title: "Export Excel Berhasil",
      description: `${rowsToExport.length} produk terpilih berhasil diunduh.`,
    });
  }, [table]);

  const handleBulkDelete = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    setDeleteDialog({
      open: true,
      productIds: selectedRows.map((r) => r.original.productId),
      title: `Hapus ${selectedRows.length} Produk`,
      description: `Apakah Anda yakin ingin menghapus ${selectedRows.length} produk terpilih secara permanen? Tindakan ini tidak dapat dibatalkan.`,
    });
  }, [table]);

  const confirmDelete = React.useCallback(async () => {
    if (deleteDialog.productIds.length === 0) return;

    setIsDeleting(true);
    try {
      const res = await deleteProducts(deleteDialog.productIds);
      if (res.success) {
        toast.add({
          type: "success",
          title: "Produk Berhasil Dihapus",
          description: `${res.count} produk telah dihapus dari katalog.`,
        });
        table.resetRowSelection();
        setDeleteDialog((prev) => ({ ...prev, open: false }));
        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Gagal Menghapus",
          description: res.error || "Terjadi kesalahan saat menghapus produk.",
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Gagal Menghapus",
        description: "Terjadi kesalahan koneksi atau server.",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.productIds, router, table]);

  const bulkActions = React.useMemo(
    () => [
      {
        id: "pin",
        label: "Pin",
        icon: Pin,
        onClick: () => toast.add({ title: "Pin — coming in SH-9" }),
      },
      {
        id: "copy-link",
        label: "Copy link",
        icon: Copy,
        onClick: handleBulkCopyLink,
      },
      {
        id: "export",
        label: "Export",
        icon: Download,
        onClick: handleBulkExport,
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive" as const,
        onClick: handleBulkDelete,
      },
    ],
    [handleBulkCopyLink, handleBulkExport, handleBulkDelete],
  );

  const activeColumnId =
    Object.keys(COLUMN_SORT_ID).find((c) => COLUMN_SORT_ID[c] === sortId) ??
    null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DataTableViewOptions
          table={table}
          sortableColumns={SORTABLE_COLUMNS}
          activeColumnId={activeColumnId}
          direction={sortDir}
          onSelectColumn={onSortChange}
          onSelectDirection={onSelectDirection}
          onClearSort={onClearSort}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (data.length === 0) {
              toast.add({
                type: "warning",
                title: "Tidak ada produk",
                description: "Tidak ada data produk di halaman ini untuk diexport.",
              });
              return;
            }
            exportCatalogToExcel(data, `katalog-produk-${view}`);
            toast.add({
              type: "success",
              title: "Export Excel Berhasil",
              description: `${data.length} produk di halaman ini berhasil diunduh.`,
            });
          }}
        >
          <Download className="size-3.5 mr-1.5" />
          Export Excel
        </Button>
      </div>
      {/* FIXME: Table container x-overflow not fully contained within layout bounds. Investigate and constrain horizontal overflow properly. */}
      <ScrollArea className="w-full rounded-md border">
        <Table
          containerClassName="overflow-visible"
          className="w-full min-w-max"
        >
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p>No results.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        table.resetColumnFilters();
                        onClearFilters();
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={goJump}
                  >
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
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
        title={deleteDialog.title}
        description={deleteDialog.description}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
