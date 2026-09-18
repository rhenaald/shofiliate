"use client";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CatalogRow, CatalogView } from "@/features/catalog/types";
import { COLUMN_SORT_ID } from "@/features/catalog/types";
import type { CatalogSortId } from "@/features/catalog/schemas";

// Simbol mata uang asli (amount disimpan tanpa simbol di DB).
const CURRENCY_SYMBOL: Record<string, string> = {
  MYR: "RM",
  SGD: "S$",
  IDR: "Rp",
  THB: "฿",
  PHP: "₱",
  VND: "₫",
};

interface SortHeaderProps {
  label: string;
  active: "asc" | "desc" | null;
  onToggle: () => void;
}

function SortHeader({ label, active, onToggle }: SortHeaderProps) {
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8"
      onClick={onToggle}
      aria-label={`Urutkan ${label}${active ? ` (${active})` : ""}`}
    >
      {label}
      <Icon className="size-3.5" />
    </Button>
  );
}

function Clipped({ text, lines = 2 }: { text: string; lines?: 1 | 2 }) {
  const cls = lines === 2 ? "line-clamp-2 max-w-56 whitespace-normal" : "block max-w-44 truncate";
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cls}>{text}</span>} />
      <TooltipContent className="max-w-80">{text}</TooltipContent>
    </Tooltip>
  );
}

function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatGrowth(growth: number): string {
  const sign = growth > 0 ? "+" : "";
  return `${sign}${growth}%`;
}

export interface ProductColumnSort {
  sortId: CatalogSortId | null;
  sortDir: "asc" | "desc";
  onSort: (columnId: string) => void;
}

/** 11 kolom §9. Dibuat via factory agar highlight mengikuti view aktif.
 *  Klik header sort server via URL (opts.onSort) — bukan sort lokal.
 *  Kolom pin/aksi ditegakkan di service SH-22 — di sini placeholder. */
export function createProductColumns(
  view: CatalogView,
  opts: ProductColumnSort,
): ColumnDef<DataTableFeatures, CatalogRow>[] {
  const header = (columnId: string, label: string) => ({
    header: () => (
      <SortHeader
        label={label}
        active={opts.sortId === COLUMN_SORT_ID[columnId] ? opts.sortDir : null}
        onToggle={() => opts.onSort(columnId)}
      />
    ),
  });
  return [
    {
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
    },
    {
      id: "pin",
      header: () => <span className="sr-only">Pin</span>,
      enableSorting: false,
      cell: () => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Pin produk"
          onClick={() => toast.add({ title: "Pin — coming in SH-9" })}
        >
          <Pin className="size-3.5" />
        </Button>
      ),
    },
    {
      id: "productName",
      accessorKey: "name",
      ...header("productName", "Product Name"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 max-w-56 whitespace-normal font-medium text-primary hover:underline"
          >
            {row.original.name}
          </a>
          <p className="block max-w-44 truncate text-xs text-muted-foreground">
            {row.original.shopName}
          </p>
        </div>
      ),
      sortFn: sortFn_text,
    },
    {
      id: "region",
      accessorKey: "region",
      header: "Region",
      enableSorting: false,
      cell: ({ row }) => <Badge variant="secondary">{row.original.region}</Badge>,
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Clipped text={row.original.category} lines={1} />,
      sortFn: sortFn_text,
    },
    {
      id: "likes",
      accessorKey: "likes",
      ...header("likes", "Likes"),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.likes.toLocaleString("en-US")}
        </span>
      ),
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "sales30d",
      accessorKey: "sales30d",
      ...header("sales30d", "Sales 30d"),
      cell: ({ row }) => (
        <span
          className={
            view === "trending"
              ? "block text-right font-semibold text-primary tabular-nums"
              : "block text-right tabular-nums"
          }
        >
          {row.original.sales30d.toLocaleString("en-US")}
        </span>
      ),
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "growth30d",
      accessorKey: "growth30d",
      ...header("growth30d", "Growth 30d"),
      cell: ({ row }) => {
        const g = row.original.growth30d;
        return (
          <Badge variant={g > 0 ? "success" : g < 0 ? "destructive" : "secondary"}>
            {formatGrowth(g)}
          </Badge>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "totalSales",
      accessorKey: "totalSales",
      ...header("totalSales", "Total Sales"),
      cell: ({ row }) => (
        <span
          className={
            view === "best"
              ? "block text-right font-bold tabular-nums"
              : "block text-right font-semibold tabular-nums"
          }
        >
          {row.original.totalSales.toLocaleString("en-US")}
        </span>
      ),
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "gmv30d",
      accessorKey: "gmv30d",
      ...header("gmv30d", "GMV 30d"),
      cell: ({ row }) => (
        <span className="block text-right whitespace-nowrap tabular-nums">
          {formatMoney(row.original.gmv30d, row.original.currency)}
        </span>
      ),
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "listedOn",
      accessorKey: "listedOn",
      ...header("listedOn", "Listed On"),
      cell: ({ row }) => (
        <span className="block whitespace-nowrap tabular-nums">
          {row.original.listedOn ?? "-"}
        </span>
      ),
      sortFn: sortFn_text,
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const url = row.original.url;
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
              <DropdownMenuItem
                onClick={() => {
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-3.5" />
                Lihat di Shopee
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.add({ title: "Pin — coming in SH-9" })}
              >
                <Pin className="size-3.5" />
                Pin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.add({ title: "Koreksi region — coming in SH-8" })}
              >
                Koreksi region
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export const SORTABLE_COLUMNS = [
  { id: "productName", label: "Product Name" },
  { id: "likes", label: "Likes" },
  { id: "sales30d", label: "Sales 30d" },
  { id: "growth30d", label: "Growth 30d" },
  { id: "totalSales", label: "Total Sales" },
  { id: "gmv30d", label: "GMV 30d" },
  { id: "listedOn", label: "Listed On" },
] as const;
