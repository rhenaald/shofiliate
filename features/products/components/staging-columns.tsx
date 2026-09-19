"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { withActionColumn, withSelectColumn } from "@/components/shared/data-table/columns";
import { Badge } from "@/components/ui/badge";
import type { RawImportRow, StagingRow } from "@/features/products/types";

export const SORTABLE_STAGING_COLUMNS = [
  { id: "sales_30d", label: "Sales 30d" },
  { id: "growth_30d", label: "Growth 30d" },
  { id: "likes", label: "Likes" },
] as const;

function velocity(row: StagingRow): string {
  const n = Number(String(row.sales_30d ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return "-";
  return `${(n / 30).toFixed(2)}/hari`;
}

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

export function createStagingColumns(onRemove: (id: string) => void): ColumnDef<DataTableFeatures, StagingRow>[] {
  return [
    withSelectColumn<StagingRow>(),
    {
      id: "product",
      header: "Produk",
      cell: ({ row }) => {
        const r = row.original;
        const url = String(r.product_url ?? r.url ?? "");
        const name = String(r.product_name ?? "-");
        return (
          <div className="min-w-[220px] max-w-[320px]">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:underline">
                {name}
              </a>
            ) : (
              <span className="line-clamp-2 font-medium">{name}</span>
            )}
            <div className="text-xs text-muted-foreground">{String(r.seller_name ?? "")}</div>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Kategori",
      cell: ({ row }) => <span className="text-xs">{String(row.original.category ?? "-")}</span>,
    },
    {
      id: "komisi",
      header: "Komisi %",
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
      header: "Est. Nominal",
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
      header: "Likes",
      cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.likes ?? "-")}</span>,
    },
    {
      id: "sales_1d",
      header: "1d",
      cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.sales_1d ?? "-")}</span>,
    },
    {
      id: "sales_7d",
      header: "7d",
      cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.sales_7d ?? "-")}</span>,
    },
    {
      id: "sales_30d",
      header: "30d",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {String(row.original.sales_30d ?? "-")} <span className="text-muted-foreground">({velocity(row.original)})</span>
        </span>
      ),
    },
    {
      id: "growth_30d",
      header: "Growth",
      cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.growth_30d ?? "-")}</span>,
    },
    {
      id: "affiliate",
      header: "Affiliate",
      cell: ({ row }) => {
        const link = row.original.affiliate_link || row.original.affiliate_url;
        if (!link) return <span className="text-xs text-muted-foreground italic">Belum ada</span>;
        return (
          <a href={String(link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
            <ExternalLinkIcon className="size-3" />
            <span className="max-w-[140px] truncate">{String(link).replace(/^https?:\/\//, "")}</span>
          </a>
        );
      },
    },
    {
      id: "status",
      header: "Status",
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
