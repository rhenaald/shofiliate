"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RawImportRow } from "@/features/products/types";

interface ImportPreviewProps {
  fileName: string;
  rows: RawImportRow[];
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function ImportPreview({
  fileName,
  rows,
  onConfirm,
  onCancel,
  isLoading,
}: ImportPreviewProps) {
  const totalRows = rows.length;
  const previewRows = rows.slice(0, 10);

  // Compute "-" counts per column
  const dashStats = React.useMemo(() => {
    const columns: (keyof RawImportRow)[] = [
      "likes",
      "sales_1d",
      "sales_7d",
      "sales_30d",
      "growth_30d",
      "gmv_30d",
      "total_sales",
      "total_gmv",
    ];

    const counts: Record<string, number> = {};
    for (const col of columns) {
      counts[col] = 0;
    }

    for (const row of rows) {
      for (const col of columns) {
        const val = row[col];
        if (val === "-" || val === null || val === undefined || String(val).trim() === "-") {
          counts[col] = (counts[col] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheetIcon className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{fileName}</h3>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {totalRows} baris terdeteksi
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menampilkan preview 10 baris pertama sebelum proses import ke database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            <ArrowLeftIcon className="size-4 mr-1.5" />
            Ganti File
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                Mengimpor {totalRows} Baris...
              </>
            ) : (
              <>
                <CheckCircle2Icon className="size-4 mr-1.5" />
                Mulai Import {totalRows} Baris
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dash "-" Stats summary */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <AlertCircleIcon className="size-3.5" />
          <span>Statistik Nilai Kosong / &quot;-&quot; (Akan dikonversi otomatis)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(dashStats).map(([col, count]) => (
            <div
              key={col}
              className="flex items-center justify-between rounded-md border border-border/40 bg-background/80 px-2.5 py-1.5 text-xs"
            >
              <span className="font-mono text-muted-foreground truncate">{col}</span>
              <span className={`font-semibold ${count > 0 ? "text-amber-500" : "text-foreground"}`}>
                {count} {count > 0 ? `(${((count / totalRows) * 100).toFixed(0)}%)` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Table (10 rows) */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Preview 10 Baris Pertama
          </span>
          <span className="text-xs text-muted-foreground">
            Format: snake_case extension
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="text-xs">Product ID</TableHead>
                <TableHead className="text-xs min-w-[220px]">Nama Produk</TableHead>
                <TableHead className="text-xs min-w-[140px]">Shopee URL</TableHead>
                <TableHead className="text-xs">Toko</TableHead>
                <TableHead className="text-xs">Sales 30d</TableHead>
                <TableHead className="text-xs">Growth 30d</TableHead>
                <TableHead className="text-xs">GMV 30d</TableHead>
                <TableHead className="text-xs">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => {
                const productUrl = String(row.product_url ?? row.url ?? "");
                return (
                  <TableRow key={idx} className="text-xs">
                    <TableCell className="font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {String(row.product_id ?? "-")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {productUrl ? (
                        <a
                          href={productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-2 hover:text-primary hover:underline"
                          title={String(row.product_name ?? "")}
                        >
                          {String(row.product_name ?? "-")}
                        </a>
                      ) : (
                        <span className="line-clamp-2" title={String(row.product_name ?? "")}>
                          {String(row.product_name ?? "-")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      {productUrl ? (
                        <a
                          href={productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline truncate max-w-full"
                          title={productUrl}
                        >
                          <ExternalLinkIcon className="size-3 shrink-0" />
                          <span className="truncate">{productUrl.replace(/^https?:\/\//, "")}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(row.seller_name ?? "-")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {String(row.sales_30d ?? "-")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {String(row.growth_30d ?? "-")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {String(row.gmv_30d ?? "-")}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {String(row.total_sales ?? "-")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
