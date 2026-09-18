"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
  ZapIcon,
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
import { CommissionBreakdownCard } from "@/features/products/components/commission-breakdown-card";
import { useCompanionExtension } from "@/features/products/hooks/use-companion-extension";
import type { RawImportRow } from "@/features/products/types";

interface ImportPreviewProps {
  fileName: string;
  rows: RawImportRow[];
  onConfirm: (rowsToConfirm: RawImportRow[]) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function ImportPreview({
  fileName,
  rows: initialRows,
  onConfirm,
  onCancel,
  isLoading,
}: ImportPreviewProps) {
  const [rows, setRows] = React.useState<RawImportRow[]>(initialRows);
  const [selectedRowForDetail, setSelectedRowForDetail] = React.useState<RawImportRow | null>(null);
  const totalRows = rows.length;
  const previewRows = rows.slice(0, 10);

  const {
    isExtensionInstalled,
    isEnriching,
    progress,
    enrichRows,
    enrichError,
  } = useCompanionExtension();

  // Hitung berapa produk yang sudah memiliki link affiliate & komisi
  const enrichedCount = React.useMemo(() => {
    return rows.filter((r) => !!(r.affiliate_link || r.affiliate_url)).length;
  }, [rows]);

  const hasUnenriched = enrichedCount < totalRows;

  const handleEnrichNow = async () => {
    try {
      // Deteksi region dari data URL produk (default ke ID jika tidak ada)
      const hasMy = rows.some((r) => String(r.product_url || r.url || "").includes(".com.my"));
      const targetRegion = hasMy ? "MY" : "ID";
      const result = await enrichRows(rows, targetRegion);
      setRows(result);
    } catch (err) {
      console.error("Gagal enrich di preview:", err);
    }
  };

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
      {/* Modal Rincian Komisi (Shopee Live, Sosmed, Video, Xtra) */}
      {selectedRowForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl border border-border space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                  {String(selectedRowForDetail.product_name ?? "Detail Komisi")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Rincian komisi per jenis platform Shopee Affiliate
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRowForDetail(null)}
                className="size-7 p-0 rounded-full hover:bg-muted"
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <CommissionBreakdownCard
              commissionLiveRate={selectedRowForDetail.commission_live_rate || selectedRowForDetail.commission_rate}
              commissionLiveAmount={selectedRowForDetail.commission_live_amount || selectedRowForDetail.commission_amount}
              commissionSocialRate={selectedRowForDetail.commission_social_rate}
              commissionSocialAmount={selectedRowForDetail.commission_social_amount}
              commissionVideoRate={selectedRowForDetail.commission_video_rate}
              commissionVideoAmount={selectedRowForDetail.commission_video_amount}
              hasKomisiXtra={Boolean(selectedRowForDetail.has_komisi_xtra || selectedRowForDetail.komisi_xtra_rate)}
              komisiXtraRate={selectedRowForDetail.komisi_xtra_rate}
              komisiXtraAmount={selectedRowForDetail.komisi_xtra_amount}
            />

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setSelectedRowForDetail(null)}
                className="bg-primary text-primary-foreground text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheetIcon className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{fileName}</h3>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {totalRows} baris terdeteksi
              </span>
              {enrichedCount > 0 ? (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <ZapIcon className="size-3" /> {enrichedCount} / {totalRows} terisi link & komisi
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  Belum ada komisi & link
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menampilkan preview 10 baris pertama sebelum proses import ke database.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol enrich manual jika extension aktif dan ada baris belum ter-enrich */}
          {isExtensionInstalled && hasUnenriched && !isEnriching && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnrichNow}
              disabled={isLoading || isEnriching}
              className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              <SparklesIcon className="size-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              Lengkapi Komisi & Link
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading || isEnriching}
          >
            <ArrowLeftIcon className="size-4 mr-1.5" />
            Ganti File
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onConfirm(rows)}
            disabled={isLoading || isEnriching}
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

      {/* Enrichment Progress if running in preview */}
      {isEnriching && progress && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground truncate max-w-[70%]">
              <Loader2Icon className="size-4 animate-spin text-primary shrink-0" />
              <span className="truncate">
                {progress.currentProduct
                  ? progress.currentProduct
                  : "Memperkaya data komisi 3 platform & link affiliate..."}
              </span>
            </div>
            <span className="font-mono font-semibold text-primary shrink-0">
              {progress.percentage}% ({progress.completed} / {progress.total})
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {enrichError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{enrichError}</span>
        </div>
      )}

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
            Format: Shopdora + Shopee Affiliate (Live, Sosmed, Video, Xtra)
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="text-xs">Product ID</TableHead>
                <TableHead className="text-xs min-w-[200px]">Nama Produk</TableHead>
                <TableHead className="text-xs">Komisi Live / XTRA</TableHead>
                <TableHead className="text-xs">Est. Komisi</TableHead>
                <TableHead className="text-xs min-w-[140px]">Link Affiliate</TableHead>
                <TableHead className="text-xs">Sales 30d</TableHead>
                <TableHead className="text-xs">Growth 30d</TableHead>
                <TableHead className="text-xs">GMV 30d</TableHead>
                <TableHead className="text-xs">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => {
                const productUrl = String(row.product_url ?? row.url ?? "");
                const affiliateLink = row.affiliate_link || row.affiliate_url;
                const rate = row.commission_live_rate || row.commission_rate;
                const amount = row.commission_live_amount || row.commission_amount;
                const hasXtra = Boolean(row.has_komisi_xtra || row.komisi_xtra_rate);

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

                    {/* Komisi Rate & Rincian trigger */}
                    <TableCell className="font-mono">
                      {rate ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {String(rate).includes("%") ? String(rate) : `${rate}%`}
                            </span>
                            {hasXtra && (
                              <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[9px] font-black italic text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                XTRA
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedRowForDetail(row)}
                            className="text-[10px] text-primary hover:underline text-left cursor-pointer font-sans"
                          >
                            Lihat Rincian
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Est Komisi */}
                    <TableCell className="font-mono">
                      {amount ? (
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                          {String(amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Link Affiliate */}
                    <TableCell className="max-w-[160px]">
                      {affiliateLink ? (
                        <a
                          href={String(affiliateLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline truncate max-w-full font-medium"
                          title={String(affiliateLink)}
                        >
                          <ExternalLinkIcon className="size-3 shrink-0" />
                          <span className="truncate">{String(affiliateLink).replace(/^https?:\/\//, "")}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">
                          Belum ada
                        </span>
                      )}
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
