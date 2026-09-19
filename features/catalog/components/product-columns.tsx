"use client";

import {
  sortFn_alphanumeric,
  sortFn_text,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  ExternalLink,
  Loader2,
  Pin,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import {
  withActionColumn,
  withSelectColumn,
} from "@/components/shared/data-table/columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  align?: "left" | "right";
}

function SortHeader({
  label,
  active,
  onToggle,
  align = "left",
}: SortHeaderProps) {
  const Icon =
    active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={align === "right" ? "-mr-2 ml-auto flex h-8" : "-ml-2 h-8"}
      onClick={onToggle}
      aria-label={`Urutkan ${label}${active ? ` (${active})` : ""}`}
    >
      {label}
      <Icon className="size-3.5" />
    </Button>
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

export interface ProductPinActions {
  /** ID produk yang sedang aktif di-pin (indikator terisi). */
  pinnedIds: Set<string>;
  /** Pin tanpa note; tanpa-op bila sudah pinned (server idempoten). */
  onPin: (productId: string) => void;
  /** Kunci tombol saat mutasi berjalan (anti double-click). */
  pinPending: boolean;
}

export function createProductColumns(
  view: CatalogView,
  opts: ProductColumnSort & ProductPinActions,
  onDeleteProduct?: (row: CatalogRow) => void,
  onScrapeProduct?: (row: CatalogRow) => void,
  scrapingProductId?: string | null,
): ColumnDef<DataTableFeatures, CatalogRow>[] {
  const header = (
    columnId: string,
    label: string,
    align: "left" | "right" = "left",
  ) => ({
    header: () => (
      <SortHeader
        label={label}
        active={opts.sortId === COLUMN_SORT_ID[columnId] ? opts.sortDir : null}
        onToggle={() => opts.onSort(columnId)}
        align={align}
      />
    ),
  });

  return [
    withSelectColumn<CatalogRow>(),
    {
      id: "productName",
      accessorKey: "name",
      ...header("productName", "Product Name", "left"),
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
      id: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="block max-w-52 whitespace-normal break-words leading-snug">
          {row.original.category}
        </span>
      ),
      sortFn: sortFn_text,
    },
    {
      id: "rating",
      accessorKey: "rating",
      ...header("rating", "Rating", "right"),
      cell: ({ row }) => {
        const val = row.original.rating;
        if (val === null || val === undefined || val <= 0) {
          return <span className="block text-right text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center justify-end gap-1 font-medium tabular-nums text-foreground">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span>{val.toFixed(1)}</span>
          </div>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "komisiXtra",
      accessorKey: "komisiXtraRate",
      header: () => <div className="text-right">Xtra (%)</div>,
      cell: ({ row }) => {
        const val = row.original.komisiXtraRate;
        return (
          <span className="block text-right tabular-nums">
            {val !== null && val !== undefined && val > 0 ? `${val}%` : "-"}
          </span>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "commissionLive",
      accessorKey: "commissionLiveAmount",
      header: () => <div className="text-right">Live</div>,
      cell: ({ row }) => {
        const val = row.original.commissionLiveAmount;
        return (
          <span className="block text-right whitespace-nowrap tabular-nums">
            {val !== null && val !== undefined && val > 0
              ? formatMoney(val, row.original.currency)
              : "-"}
          </span>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "commissionSocial",
      accessorKey: "commissionSocialAmount",
      header: () => <div className="text-right">Sosmed</div>,
      cell: ({ row }) => {
        const val = row.original.commissionSocialAmount;
        return (
          <span className="block text-right whitespace-nowrap tabular-nums">
            {val !== null && val !== undefined && val > 0
              ? formatMoney(val, row.original.currency)
              : "-"}
          </span>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "commissionVideo",
      accessorKey: "commissionVideoAmount",
      header: () => <div className="text-right">Video</div>,
      cell: ({ row }) => {
        const val = row.original.commissionVideoAmount;
        return (
          <span className="block text-right whitespace-nowrap tabular-nums">
            {val !== null && val !== undefined && val > 0
              ? formatMoney(val, row.original.currency)
              : "-"}
          </span>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "likes",
      accessorKey: "likes",
      ...header("likes", "Likes", "right"),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.likes.toLocaleString("en-US")}
        </span>
      ),
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "totalSales",
      accessorKey: "totalSales",
      ...header("totalSales", "Sold", "right"),
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
      id: "affiliate",
      header: "Affiliate",
      enableSorting: false,
      cell: ({ row }) => {
        const url = row.original.affiliateUrl;
        const hasUrl = !!url && url.trim().length > 0;
        const isThisScraping = scrapingProductId === row.original.productId;

        if (!hasUrl) {
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                    disabled={isThisScraping || !!scrapingProductId}
                    aria-label="Cari link Shopee Affiliate"
                    onClick={() => {
                      onScrapeProduct?.(row.original);
                    }}
                  >
                    {isThisScraping ? (
                      <Loader2 className="size-3 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="size-3 text-primary" />
                    )}
                    <span>{isThisScraping ? "Mencari..." : "Cari Link"}</span>
                  </Button>
                }
              />
              <TooltipContent>
                Scrape dan buat link affiliate otomatis via ekstensi Shopee
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={!hasUrl}
                    className="disabled:pointer-events-auto"
                    aria-label="Salin link affiliate"
                    onClick={() => {
                      if (!hasUrl) return;
                      navigator.clipboard.writeText(url);
                      toast.add({ title: "Link affiliate disalin" });
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>
                {hasUrl ? "Salin link affiliate" : "Belum ada link affiliate"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={!hasUrl}
                    className="disabled:pointer-events-auto"
                    aria-label="Buka link affiliate"
                    onClick={() => {
                      if (!hasUrl) return;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>
                {hasUrl ? "Buka link affiliate" : "Belum ada link affiliate"}
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
        );
      },
    },
    // ---- PRD columns (hidden by default via table initial columnVisibility) ----
    {
      id: "pin",
      header: () => <span className="sr-only">Pin</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const pinned = opts.pinnedIds.has(row.original.productId);
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={pinned ? "Sudah di-pin" : "Pin produk"}
                  disabled={pinned || opts.pinPending}
                  onClick={() => opts.onPin(row.original.productId)}
                >
                  <Pin
                    className={
                      pinned ? "size-3.5 fill-current" : "size-3.5"
                    }
                  />
                </Button>
              }
            />
            <TooltipContent>
              {pinned
                ? "Sudah di-pin — kelola di halaman Pins"
                : "Pin ke board bersama"}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "region",
      accessorKey: "region",
      header: "Region",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.region}</Badge>
      ),
    },
    {
      id: "sales30d",
      accessorKey: "sales30d",
      ...header("sales30d", "Sales 30d", "right"),
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
      ...header("growth30d", "Growth 30d", "right"),
      cell: ({ row }) => {
        const g = row.original.growth30d;
        return (
          <div className="flex justify-end">
            <Badge
              variant={g > 0 ? "success" : g < 0 ? "destructive" : "secondary"}
            >
              {formatGrowth(g)}
            </Badge>
          </div>
        );
      },
      sortFn: sortFn_alphanumeric,
    },
    {
      id: "gmv30d",
      accessorKey: "gmv30d",
      ...header("gmv30d", "GMV 30d", "right"),
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
      ...header("listedOn", "Listed On", "left"),
      cell: ({ row }) => (
        <span className="block whitespace-nowrap tabular-nums">
          {row.original.listedOn ?? "-"}
        </span>
      ),
      sortFn: sortFn_text,
    },
    withActionColumn<CatalogRow>({
      getItems: (data) => {
        const pinned = opts.pinnedIds.has(data.productId);
        return [
          {
            id: "open",
            label: "Lihat di Shopee",
            icon: ExternalLink,
            onSelect: () => {
              if (data.url)
                window.open(data.url, "_blank", "noopener,noreferrer");
            },
          },
          {
            id: "pin",
            label: pinned ? "Sudah di-pin" : "Pin",
            icon: Pin,
            disabled: pinned,
            onSelect: () => opts.onPin(data.productId),
          },
          ...(onScrapeProduct
            ? [
                {
                  id: "scrape-link",
                  label: data.affiliateUrl ? "Perbarui link affiliate" : "Cari link affiliate",
                  icon: Sparkles,
                  disabled: !!scrapingProductId,
                  onSelect: () => onScrapeProduct(data),
                },
              ]
            : []),
          {
            id: "fix-region",
            label: "Koreksi region",
            onSelect: () =>
              toast.add({ title: "Koreksi region — coming in SH-8" }),
          },
          ...(onDeleteProduct
            ? [
                {
                  id: "delete",
                  label: "Hapus produk",
                  icon: Trash2,
                  variant: "destructive" as const,
                  onSelect: () => onDeleteProduct(data),
                },
              ]
            : []),
        ];
      },
    }),
  ];
}

export const SORTABLE_COLUMNS = [
  { id: "productName", label: "Product Name" },
  { id: "likes", label: "Likes" },
  { id: "totalSales", label: "Sold" },
  { id: "sales30d", label: "Sales 30d" },
  { id: "growth30d", label: "Growth 30d" },
  { id: "gmv30d", label: "GMV 30d" },
  { id: "listedOn", label: "Listed On" },
] as const;
