"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SparklesIcon,
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
              <h3 className="text-base font-semibold text-foreground">
                Preview Data Scraping
              </h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {totalRows} Produk
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              File: <span className="font-mono text-foreground">{fileName}</span> •{" "}
              {enrichedCount > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {enrichedCount} dari {totalRows} produk memiliki link & komisi affiliate
                </span>
              ) : (
                "Belum ada data komisi & link affiliate"
              )}
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
              className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300 cursor-pointer"
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
            className="cursor-pointer"
          >
            <ArrowLeftIcon className="size-4 mr-1.5" />
            Ganti File
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onConfirm(rows)}
            disabled={isLoading || isEnriching}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
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

      {/* Preview Table (10 rows) */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Preview 10 Baris Pertama
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="text-xs">Product ID</TableHead>
                <TableHead className="text-xs min-w-[200px]">Nama Produk</TableHead>
                <TableHead className="text-xs min-w-[170px]">Rincian Komisi</TableHead>
                <TableHead className="text-xs min-w-[140px]">Est. Komisi</TableHead>
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

                    {/* Rincian Komisi Rate (Live, Video, Sosmed) */}
                    <TableCell className="font-mono">
                      {rate || row.commission_video_rate || row.commission_social_rate ? (
                        <div className="flex flex-col gap-1 py-0.5 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-sans text-[10px]">Live:</span>
                            <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <span>
                                {String(row.commission_live_rate ?? rate ?? "-").includes("%")
                                  ? String(row.commission_live_rate ?? rate)
                                  : `${row.commission_live_rate ?? rate}%`}
                              </span>
                              {hasXtra && (
                                <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[8px] font-black italic text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  XTRA
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-sans text-[10px]">Video:</span>
                            <span className="font-medium text-foreground">
                              {row.commission_video_rate
                                ? String(row.commission_video_rate).includes("%")
                                  ? String(row.commission_video_rate)
                                  : `${row.commission_video_rate}%`
                                : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-sans text-[10px]">Sosmed:</span>
                            <span className="font-medium text-foreground">
                              {row.commission_social_rate
                                ? String(row.commission_social_rate).includes("%")
                                  ? String(row.commission_social_rate)
                                  : `${row.commission_social_rate}%`
                                : "-"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Est Komisi (Live, Video, Sosmed) */}
                    <TableCell className="font-mono">
                      {amount || row.commission_live_amount || row.commission_video_amount || row.commission_social_amount ? (
                        <div className="flex flex-col gap-1 py-0.5 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-sans text-[10px]">Live:</span>
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {row.commission_live_amount
                                ? typeof row.commission_live_amount === "number"
                                  ? `Rp ${row.commission_live_amount.toLocaleString("id-ID")}`
                                  : String(row.commission_live_amount)
                                : amount
                                ? typeof amount === "number"
                                  ? `Rp ${amount.toLocaleString("id-ID")}`
                                  : String(amount)
                                : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-sans text-[10px]">Video:</span>
                            <span className="text-foreground">
                              {row.commission_video_amount
                                ? typeof row.commission_video_amount === "number"
                                  ? `Rp ${row.commission_video_amount.toLocaleString("id-ID")}`
                                  : String(row.commission_video_amount)
                                : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground font-sans text-[10px]">Sosmed:</span>
                            <span className="text-foreground">
                              {row.commission_social_amount
                                ? typeof row.commission_social_amount === "number"
                                  ? `Rp ${row.commission_social_amount.toLocaleString("id-ID")}`
                                  : String(row.commission_social_amount)
                                : "-"}
                            </span>
                          </div>
                        </div>
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
