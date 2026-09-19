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
  Pencil,
  PinOff,
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
import type { PinsSortId } from "@/features/pins/schemas";
import { PIN_COLUMN_SORT_ID } from "@/features/pins/types";
import type { PinDTO } from "@/features/pins/types";

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

function Clipped({ text, lines = 2 }: { text: string; lines?: 1 | 2 }) {
  const cls =
    lines === 2
      ? "line-clamp-2 max-w-56 whitespace-normal"
      : "block max-w-44 truncate";
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

export function formatPinDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface PinBoardColumnSort {
  sortId: PinsSortId | null;
  sortDir: "asc" | "desc";
  onSort: (columnId: string) => void;
}

export interface PinColumnActions {
  onEditNote: (pin: PinDTO) => void;
  onUnpin: (pin: PinDTO) => void;
}

/** Kolom board pins paritas katalog + kolom khas pin (catatan/pemin/waktu).
 *  Klik header sort server via URL (opts.onSort) — bukan sort lokal. */
export function createPinBoardColumns(
  opts: PinBoardColumnSort & PinColumnActions,
): ColumnDef<DataTableFeatures, PinDTO>[] {
  const header = (
    columnId: string,
    label: string,
    align: "left" | "right" = "left",
  ) => ({
    header: () => (
      <SortHeader
        label={label}
        active={
          opts.sortId === PIN_COLUMN_SORT_ID[columnId] ? opts.sortDir : null
        }
        onToggle={() => opts.onSort(columnId)}
        align={align}
      />
    ),
  });
  return [
    withSelectColumn<PinDTO>(),
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
            className="line-clamp-2 max-w-56 font-medium whitespace-normal text-primary hover:underline"
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
      ...header("totalSales", "Total Sales", "right"),
      cell: ({ row }) => (
        <span className="block text-right font-semibold tabular-nums">
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
        <span className="block text-right tabular-nums">
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
        <span className="block whitespace-nowrap text-right tabular-nums">
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
    {
      id: "note",
      accessorKey: "note",
      header: "Catatan",
      cell: ({ row }) =>
        row.original.note ? (
          <Clipped text={row.original.note} lines={1} />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      id: "pinnedBy",
      accessorKey: "pinnedBy",
      header: "Pemin",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="block max-w-32 truncate text-sm font-medium">
            {row.original.pinnedBy.name}
          </p>
          {row.original.pinnedBy.username ? (
            <p className="block max-w-32 truncate text-xs text-muted-foreground">
              @{row.original.pinnedBy.username}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "pinnedAt",
      accessorKey: "pinnedAt",
      header: "Dipin pada",
      cell: ({ row }) => (
        <span className="block text-sm whitespace-nowrap tabular-nums">
          {formatPinDate(row.original.pinnedAt)}
        </span>
      ),
    },
    withActionColumn<PinDTO>({
      header: "Aksi",
      getItems: (pin) => [
        {
          id: "open",
          label: "Lihat di Shopee",
          icon: ExternalLink,
          onSelect: () => {
            if (pin.url)
              window.open(pin.url, "_blank", "noopener,noreferrer");
          },
        },
        {
          id: "edit-note",
          label: "Edit catatan",
          icon: Pencil,
          onSelect: () => opts.onEditNote(pin),
        },
        {
          id: "unpin",
          label: "Unpin",
          icon: PinOff,
          onSelect: () => opts.onUnpin(pin),
        },
      ],
    }),
  ];
}

export const PINS_SORTABLE_COLUMNS = [
  { id: "productName", label: "Product Name" },
  { id: "likes", label: "Likes" },
  { id: "sales30d", label: "Sales 30d" },
  { id: "growth30d", label: "Growth 30d" },
  { id: "totalSales", label: "Total Sales" },
  { id: "gmv30d", label: "GMV 30d" },
  { id: "listedOn", label: "Listed On" },
] as const;
