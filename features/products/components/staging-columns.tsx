"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { withActionColumn, withSelectColumn } from "@/components/shared/data-table/columns";
import { Badge } from "@/components/ui/badge";
import type { StagingRow } from "@/features/products/types";

export const SORTABLE_STAGING_COLUMNS = [
  { id: "sales_30d", label: "Sales 30d" },
  { id: "growth_30d", label: "Growth 30d" },
  { id: "likes", label: "Likes" },
] as const;

function velocity(row: StagingRow): string {
  const v = String(row.sales_30d ?? "-");
  const n = Number(String(row.sales_30d ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return "-";
  return `${(n / 30).toFixed(2)}/hari`;
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
      cell: ({ row }) =>
        row.original._valid ? (
          <Badge>Valid</Badge>
        ) : (
          <Badge variant="destructive" title={`${row.original._error?.field}: ${row.original._error?.reason}`}>
            Invalid
          </Badge>
        ),
    },
    withActionColumn<StagingRow>({
      getItems: (r) => [{ id: "remove", label: "Hapus baris", variant: "destructive", onSelect: () => onRemove(r._stagingId) }],
    }),
  ];
}
