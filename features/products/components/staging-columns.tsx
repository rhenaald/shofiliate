"use client";

import { constructSortFn, type ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  ExternalLink,
  ExternalLinkIcon,
} from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { withActionColumn, withSelectColumn } from "@/components/shared/data-table/columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RawImportRow, StagingRow } from "@/features/products/types";

export const SORTABLE_STAGING_COLUMNS = [
  { id: "product", label: "Produk" },
  { id: "sales_1d", label: "Sales 1d" },
  { id: "sales_7d", label: "Sales 7d" },
  { id: "sales_30d", label: "Sales 30d" },
  { id: "growth_30d", label: "Growth 30d" },
  { id: "likes", label: "Likes" },
] as const;

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

function velocity(row: StagingRow): string {
  const n = Number(String(row.sales_30d ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return "-";
  return `${(n / 30).toFixed(2)}/hari`;
}

/** Parse snake_case numeric strings ("322", "+1.89%", "-") for sorting; missing → -Infinity (last on desc). */
function parseSortNum(val: unknown): number {
  if (val === null || val === undefined) return Number.NEGATIVE_INFINITY;
  if (typeof val === "number")
    return Number.isFinite(val) ? val : Number.NEGATIVE_INFINITY;
  const s = String(val).trim();
  if (!s || s === "-") return Number.NEGATIVE_INFINITY;
  const n = parseFloat(s.replace(/%/g, "").replace(/\+/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

const sortFn_numericString = constructSortFn({
  resolveDataValue: (value: unknown) => parseSortNum(value),
  sort: (a: number, b: number) => a - b,
});

function formatCommissionAmt(val: unknown, row: RawImportRow): string {
  if (val === null || val === undefined || val === "" || val === 0) return "-";
  if (typeof val === "number") {
    const gmv = String(row.gmv_30d || "");
    const url = String(row.product_url || row.url || "");
    if (gmv.startsWith("RM") || url.includes(".com.my")) {
      return `RM ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (gmv.startsWith("S$") || url.includes(".sg")) {
      return `S$ ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (gmv.startsWith("฿") || url.includes(".co.th")) {
      return `฿ ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (gmv.startsWith("₱") || url.includes(".ph")) {
      return `₱ ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (gmv.startsWith("₫") || url.includes(".vn")) {
      return `₫ ${val.toLocaleString("id-ID")}`;
    }
    return `Rp ${val.toLocaleString("id-ID")}`;
  }
  return String(val);
}

function formatRate(val: unknown): string {
  if (val === null || val === undefined || val === "") return "-";
  return String(val).includes("%") ? String(val) : `${val}%`;
}

function growthMood(val: unknown): "positive" | "negative" | "neutral" {
  const s = String(val ?? "-").trim();
  if (!s || s === "-") return "neutral";
  const n = parseFloat(s.replace(/%/g, "").replace(/\+/g, "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n === 0) return "neutral";
  return n > 0 ? "positive" : "negative";
}

function mutedDash(text: string): boolean {
  return text === "-";
}

export interface StagingColumnSort {
  sortId: string | null;
  sortDir: "asc" | "desc";
  onSort: (columnId: string) => void;
}

export function createStagingColumns(
  onRemove: (id: string) => void,
  sort: StagingColumnSort,
): ColumnDef<DataTableFeatures, StagingRow>[] {
  const header = (
    columnId: string,
    label: string,
    align: "left" | "right" = "left",
  ) => ({
    header: () => (
      <SortHeader
        label={label}
        active={sort.sortId === columnId ? sort.sortDir : null}
        onToggle={() => sort.onSort(columnId)}
        align={align}
      />
    ),
  });

  return [
    withSelectColumn<StagingRow>(),
    {
      id: "product",
      accessorKey: "product_name",
      ...header("product", "Produk", "left"),
      cell: ({ row }) => {
        const r = row.original;
        const url = String(r.product_url ?? r.url ?? "");
        const name = String(r.product_name ?? "-");
        return (
          <div className="min-w-0">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="line-clamp-2 max-w-56 whitespace-normal font-medium hover:underline"
              >
                {name}
              </a>
            ) : (
              <span
                className={
                  mutedDash(name)
                    ? "line-clamp-2 max-w-56 whitespace-normal font-medium text-muted-foreground"
                    : "line-clamp-2 max-w-56 whitespace-normal font-medium"
                }
              >
                {name}
              </span>
            )}
            <p className="block max-w-44 truncate text-xs text-muted-foreground">
              {String(r.seller_name ?? "")}
            </p>
          </div>
        );
      },
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Kategori",
      cell: ({ row }) => {
        const text = String(row.original.category ?? "-");
        return (
          <span
            className={
              mutedDash(text)
                ? "block max-w-40 whitespace-normal break-words text-xs leading-snug text-muted-foreground"
                : "block max-w-40 whitespace-normal break-words text-xs leading-snug"
            }
          >
            {text}
          </span>
        );
      },
    },
    {
      id: "komisi",
      header: "Rincian Komisi",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        const rate = r.commission_live_rate ?? r.commission_rate;
        const hasXtra = Boolean(r.has_komisi_xtra || r.komisi_xtra_rate);
        if (!rate && !r.commission_video_rate && !r.commission_social_rate) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-col gap-1 py-0.5 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[10px] text-muted-foreground">Live:</span>
              <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span>{formatRate(rate ?? r.commission_live_rate ?? "-")}</span>
                {hasXtra && (
                  <span className="rounded border border-rose-500/20 bg-rose-500/10 px-1 py-0.2 text-[8px] font-black italic text-rose-600 dark:text-rose-400">
                    XTRA
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[10px] text-muted-foreground">Video:</span>
              <span className="font-medium text-foreground">{formatRate(r.commission_video_rate)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[10px] text-muted-foreground">Sosmed:</span>
              <span className="font-medium text-foreground">{formatRate(r.commission_social_rate)}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "est_komisi",
      header: "Est. Komisi",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        const amount = r.commission_live_amount ?? r.commission_amount;
        if (!amount && !r.commission_live_amount && !r.commission_video_amount && !r.commission_social_amount) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-col gap-1 py-0.5 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[10px] text-muted-foreground">Live:</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {formatCommissionAmt(r.commission_live_amount ?? amount, r)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[10px] text-muted-foreground">Video:</span>
              <span className="text-foreground">{formatCommissionAmt(r.commission_video_amount, r)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[10px] text-muted-foreground">Sosmed:</span>
              <span className="text-foreground">{formatCommissionAmt(r.commission_social_amount, r)}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "likes",
      accessorKey: "likes",
      ...header("likes", "Likes", "right"),
      cell: ({ row }) => {
        const text = String(row.original.likes ?? "-");
        return (
          <span
            className={
              mutedDash(text)
                ? "block text-right tabular-nums text-muted-foreground"
                : "block text-right tabular-nums"
            }
          >
            {text}
          </span>
        );
      },
      sortFn: sortFn_numericString,
    },
    {
      id: "sales_1d",
      accessorKey: "sales_1d",
      ...header("sales_1d", "1d", "right"),
      cell: ({ row }) => {
        const text = String(row.original.sales_1d ?? "-");
        return (
          <span
            className={
              mutedDash(text)
                ? "block text-right font-mono text-xs text-muted-foreground"
                : "block text-right font-mono text-xs"
            }
          >
            {text}
          </span>
        );
      },
      sortFn: sortFn_numericString,
    },
    {
      id: "sales_7d",
      accessorKey: "sales_7d",
      ...header("sales_7d", "7d", "right"),
      cell: ({ row }) => {
        const text = String(row.original.sales_7d ?? "-");
        return (
          <span
            className={
              mutedDash(text)
                ? "block text-right font-mono text-xs text-muted-foreground"
                : "block text-right font-mono text-xs"
            }
          >
            {text}
          </span>
        );
      },
      sortFn: sortFn_numericString,
    },
    {
      id: "sales_30d",
      accessorKey: "sales_30d",
      ...header("sales_30d", "30d", "right"),
      cell: ({ row }) => {
        const text = String(row.original.sales_30d ?? "-");
        return (
          <div className="text-right font-mono text-xs">
            <span
              className={mutedDash(text) ? "font-semibold text-muted-foreground" : "font-semibold"}
            >
              {text}
            </span>
            <span className="block text-[11px] font-normal text-muted-foreground">
              {velocity(row.original)}
            </span>
          </div>
        );
      },
      sortFn: sortFn_numericString,
    },
    {
      id: "growth_30d",
      accessorKey: "growth_30d",
      ...header("growth_30d", "Growth", "right"),
      cell: ({ row }) => {
        const raw = row.original.growth_30d;
        const mood = growthMood(raw);
        const label = String(raw ?? "-");
        return (
          <div className="flex justify-end">
            <Badge
              variant={mood === "positive" ? "success" : mood === "negative" ? "destructive" : "secondary"}
            >
              {label}
            </Badge>
          </div>
        );
      },
      sortFn: sortFn_numericString,
    },
    {
      id: "affiliate",
      header: "Affiliate",
      enableSorting: false,
      cell: ({ row }) => {
        const link = row.original.affiliate_link || row.original.affiliate_url;
        const url = link ? String(link) : "";
        const hasUrl = url.trim().length > 0;
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
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            {r._valid ? (
              <Badge>Valid</Badge>
            ) : (
              <Badge variant="destructive" title={`${r._error?.field}: ${r._error?.reason}`}>
                Invalid
              </Badge>
            )}
            {r._duplicate ? (
              <Badge variant="outline" title="Duplikat">
                Duplikat
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    withActionColumn<StagingRow>({
      getItems: (r) => [{ id: "remove", label: "Hapus baris", variant: "destructive", onSelect: () => onRemove(r._stagingId) }],
    }),
  ];
}
