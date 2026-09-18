"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FileSpreadsheetIcon,
  InfoIcon,
  Loader2Icon,
  SearchIcon,
  SparklesIcon,
  UploadCloudIcon,
  ZapIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CommissionBreakdownCard } from "@/features/products/components/commission-breakdown-card";
import { useCompanionExtension } from "@/features/products/hooks/use-companion-extension";
import type { RawImportRow } from "@/features/products/types";

interface ImportUploaderProps {
  onFileLoaded: (fileName: string, rows: RawImportRow[]) => void;
  isLoading?: boolean;
}

export function ImportUploader({
  onFileLoaded,
  isLoading = false,
}: ImportUploaderProps) {
  const [mode, setMode] = React.useState<"batch" | "single">("batch");
  const [isDragging, setIsDragging] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [autoEnrich, setAutoEnrich] = React.useState(true);
  const [showExtensionGuide, setShowExtensionGuide] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // State untuk mode Uji Coba 1 Produk By Nama
  const [singleKeyword, setSingleKeyword] = React.useState("");
  const [singleRegion, setSingleRegion] = React.useState<"ID" | "MY">("ID");
  const [batchRegion, setBatchRegion] = React.useState<"ID" | "MY">("ID");
  const [isSearchingSingle, setIsSearchingSingle] = React.useState(false);
  const [singleResult, setSingleResult] = React.useState<RawImportRow | null>(null);

  const {
    isExtensionInstalled,
    isEnriching,
    progress,
    enrichRows,
    enrichError,
    searchSingleProductByName,
  } = useCompanionExtension();

  // Dengarkan sync langsung saat streamer menekan tombol di tab Shopee Affiliate
  React.useEffect(() => {
    const handleSync = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data?.source === "shofiliate-companion-extension" &&
        event.data?.type === "SHOPEE_TAB_SYNCED" &&
        event.data?.product
      ) {
        const p = event.data.product;
        const itemId = p.itemId || p.product_id;
        if (!itemId) return;

        setMode("single");
        setSingleKeyword(String(itemId));

        const liveXtraRate = p.live?.xtraRate ?? p.commission_live_xtra_rate ?? p.commission_live_rate ?? 0;
        const liveXtraAmt = p.live?.xtraAmount ?? p.commission_live_xtra_amount ?? 0;
        const liveShopeeRate = p.live?.shopeeRate ?? p.commission_live_shopee_rate ?? 0;
        const liveShopeeAmt = p.live?.shopeeAmount ?? p.commission_live_shopee_amount ?? 0;
        const liveEstAmt = p.live?.estimatedAmount ?? p.commission_live_amount ?? (liveXtraAmt + liveShopeeAmt);

        const socialXtraRate = p.social?.xtraRate ?? p.commission_social_xtra_rate ?? 0;
        const socialXtraAmt = p.social?.xtraAmount ?? p.commission_social_xtra_amount ?? 0;
        const socialShopeeRate = p.social?.shopeeRate ?? p.commission_social_shopee_rate ?? 0;
        const socialShopeeAmt = p.social?.shopeeAmount ?? p.commission_social_shopee_amount ?? 0;
        const socialEstAmt = p.social?.estimatedAmount ?? p.commission_social_amount ?? (socialXtraAmt + socialShopeeAmt);

        const videoXtraRate = p.video?.xtraRate ?? p.commission_video_xtra_rate ?? 0;
        const videoXtraAmt = p.video?.xtraAmount ?? p.commission_video_xtra_amount ?? 0;
        const videoShopeeRate = p.video?.shopeeRate ?? p.commission_video_shopee_rate ?? 0;
        const videoShopeeAmt = p.video?.shopeeAmount ?? p.commission_video_shopee_amount ?? 0;
        const videoEstAmt = p.video?.estimatedAmount ?? p.commission_video_amount ?? (videoXtraAmt + videoShopeeAmt);

        const affLink =
          (p.affiliateLink && !p.affiliateLink.includes("/offer/product_offer/"))
            ? p.affiliateLink
            : (p.affiliate_link && !p.affiliate_link.includes("/offer/product_offer/"))
              ? p.affiliate_link
              : "";

        setSingleResult({
          product_id: itemId,
          product_name: p.productName || p.product_name || `Produk Shopee #${itemId}`,
          seller_name: p.sellerName || p.seller_name || "Shopee Verified Seller",
          product_url: p.productUrl || p.product_url || `https://shopee.co.id/product/0/${itemId}`,
          total_sales: p.total_sales || 0,
          sales_30d: p.sales_30d || 0,
          gmv_30d: p.price ? `Rp ${p.price.toLocaleString("id-ID")}` : (p.gmv_30d || "Rp 0"),
          growth_30d: p.growth_30d || "0.0%",
          commission_rate: liveXtraRate + liveShopeeRate,
          commission_amount: liveEstAmt,
          commission_live_rate: liveXtraRate + liveShopeeRate,
          commission_live_amount: liveEstAmt,
          commission_social_rate: socialXtraRate + socialShopeeRate,
          commission_social_amount: socialEstAmt,
          commission_video_rate: videoXtraRate + videoShopeeRate,
          commission_video_amount: videoEstAmt,
          has_komisi_xtra: liveXtraRate > 0 || socialXtraRate > 0 || videoXtraRate > 0,
          komisi_xtra_rate: liveXtraRate || socialXtraRate || videoXtraRate,
          komisi_xtra_amount: liveXtraAmt || socialXtraAmt || videoXtraAmt,

          commission_live_xtra_rate: liveXtraRate,
          commission_live_xtra_amount: liveXtraAmt,
          commission_live_shopee_rate: liveShopeeRate,
          commission_live_shopee_amount: liveShopeeAmt,

          commission_social_xtra_rate: socialXtraRate,
          commission_social_xtra_amount: socialXtraAmt,
          commission_social_shopee_rate: socialShopeeRate,
          commission_social_shopee_amount: socialShopeeAmt,

          commission_video_xtra_rate: videoXtraRate,
          commission_video_xtra_amount: videoXtraAmt,
          commission_video_shopee_rate: videoShopeeRate,
          commission_video_shopee_amount: videoShopeeAmt,

          affiliate_link: affLink,
        });
      }
    };
    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, []);

  const handleSearchSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleKeyword.trim()) return;

    setIsSearchingSingle(true);
    setErrorMessage(null);
    setSingleResult(null);

    try {
      const result = await searchSingleProductByName(singleKeyword.trim(), singleRegion);
      setSingleResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencari produk Shopee.";
      setErrorMessage(msg);
    } finally {
      setIsSearchingSingle(false);
    }
  };

  const handleUseSingleResult = () => {
    if (!singleResult) return;
    const safeName = singleKeyword.trim().replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    onFileLoaded(`test_single_${safeName}.json`, [singleResult]);
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "json" && extension !== "csv") {
      setErrorMessage(
        "Format file tidak didukung. Harap unggah file .json atau .csv hasil export Shopdora/extension."
      );
      return;
    }

    try {
      const text = await file.text();
      let parsedRows: RawImportRow[] = [];

      if (extension === "json") {
        const rawJson = JSON.parse(text);
        if (!Array.isArray(rawJson)) {
          throw new Error("File JSON harus berupa array of objects (daftar produk).");
        }
        parsedRows = rawJson as RawImportRow[];
      } else if (extension === "csv") {
        parsedRows = parseCsvSimple(text);
      }

      if (parsedRows.length === 0) {
        throw new Error("File tidak berisi baris data produk.");
      }

      // Jika ekstensi aktif dan opsi autoEnrich tercentang, jalankan enrichment
      if (isExtensionInstalled && autoEnrich) {
        try {
          const enriched = await enrichRows(parsedRows, batchRegion);
          onFileLoaded(file.name, enriched);
          return;
        } catch (enrichErr: unknown) {
          console.warn("Enrichment gagal, melanjutkan dengan data mentah:", enrichErr);
          onFileLoaded(file.name, parsedRows);
          return;
        }
      }

      onFileLoaded(file.name, parsedRows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membaca atau memproses file.";
      setErrorMessage(`Error: ${msg}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigasi Mode (Batch File vs Uji Coba 1 Produk) */}
      <div className="flex rounded-xl border border-border/70 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
            mode === "batch"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheetIcon className="size-4" />
          <span>Upload File Batch (Shopdora / 300 Produk)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
            mode === "single"
              ? "bg-card text-foreground shadow-xs text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <SearchIcon className="size-4" />
          <span>Uji Coba 1 Produk (Cari by Nama)</span>
        </button>
      </div>

      {/* Extension Connection Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 items-center justify-center rounded-lg ${
              isExtensionInstalled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isExtensionInstalled ? (
              <ZapIcon className="size-5" />
            ) : (
              <InfoIcon className="size-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Shofiliate Companion Extension:
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isExtensionInstalled
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isExtensionInstalled ? (
                  <>
                    <CheckCircleIcon className="size-3" /> Terhubung
                  </>
                ) : (
                  "Belum Terdeteksi"
                )}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isExtensionInstalled
                ? "Siap melengkapi komisi 3 platform (Live, Sosmed, Video) & Komisi Xtra secara otomatis."
                : "Mode uji coba tetap bisa dijalankan untuk melihat preview format data dan komisi."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isExtensionInstalled && mode === "batch" ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">Region:</span>
                <select
                  value={batchRegion}
                  onChange={(e) => setBatchRegion(e.target.value as "ID" | "MY")}
                  className="rounded-lg border border-border/80 bg-background px-2 py-1 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="ID">🇮🇩 Indonesia (ID)</option>
                  <option value="MY">🇲🇾 Malaysia (MY)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={autoEnrich}
                  onChange={(e) => setAutoEnrich(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>Auto-Enrich Komisi & Link</span>
              </label>
            </div>
          ) : !isExtensionInstalled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExtensionGuide(!showExtensionGuide)}
              className="text-xs"
            >
              <SparklesIcon className="size-3.5 mr-1 text-amber-500" />
              {showExtensionGuide ? "Tutup Panduan" : "Panduan Ekstensi"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Panduan Instalasi jika dibuka */}
      {showExtensionGuide && !isExtensionInstalled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-foreground space-y-2">
          <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <SparklesIcon className="size-4" /> Cara Pasang Shofiliate Companion Extension:
          </div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1 leading-relaxed">
            <li>Buka Chrome/Edge dan kunjungi <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">chrome://extensions/</code></li>
            <li>Aktifkan sakelar <strong>Developer Mode</strong> di kanan atas.</li>
            <li>Klik tombol <strong>Load unpacked</strong> dan pilih folder <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">shofiliate/extension</code>.</li>
            <li>Buka tab Shopee Affiliate dan pastikan Anda sudah login.</li>
            <li>Refresh halaman ini dan status ekstensi akan otomatis berubah menjadi <strong>Terhubung</strong>!</li>
          </ol>
        </div>
      )}

      {/* MODE 1: UJI COBA 1 PRODUK BY ID ATAU NAMA */}
      {mode === "single" && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <SearchIcon className="size-4 text-primary" />
              Uji Coba 1 Produk (Cari by Product ID / Nama / URL)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Masukkan <span className="font-medium text-foreground">Product ID (Item ID)</span>, URL Shopee, atau nama produk untuk menguji komisi 3 platform (Shopee Live, Media Sosial, Shopee Video) dan Komisi Xtra.
            </p>
          </div>

          <form onSubmit={handleSearchSingle} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={singleKeyword}
                  onChange={(e) => setSingleKeyword(e.target.value)}
                  placeholder="Contoh ID: 12991894555 atau Nama: Skintific 5X Ceramide..."
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  disabled={isSearchingSingle}
                />
              </div>

              {/* Pilihan Region */}
              <div className="flex items-center gap-2">
                <select
                  value={singleRegion}
                  onChange={(e) => setSingleRegion(e.target.value as "ID" | "MY")}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-medium"
                  disabled={isSearchingSingle}
                >
                  <option value="ID">🇮🇩 Indonesia (ID)</option>
                  <option value="MY">🇲🇾 Malaysia (MY)</option>
                </select>

                <Button
                  type="submit"
                  disabled={isSearchingSingle || !singleKeyword.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs shrink-0"
                >
                  {isSearchingSingle ? (
                    <>
                      <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                      Mencari...
                    </>
                  ) : (
                    <>
                      <SearchIcon className="size-3.5 mr-1.5" />
                      Cari by ID / Nama
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Smart Detection Hint */}
            {singleKeyword.trim() && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                {/^\d+$/.test(singleKeyword.trim()) ? (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400 font-medium">
                    ⚡ Terdeteksi sebagai Product ID (Item ID): #{singleKeyword.trim()}
                  </span>
                ) : singleKeyword.includes("/product/") ? (
                  <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-purple-600 dark:text-purple-400 font-medium">
                    🔗 Terdeteksi sebagai URL Shopee
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground font-medium">
                    📝 Terdeteksi sebagai Kata Kunci / Nama Produk
                  </span>
                )}
              </div>
            )}
          </form>

          {/* Hasil Pencarian 1 Produk */}
          {singleResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div>
                  <span className="inline-block rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
                    Hasil Uji Coba Ditemukan
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-1 line-clamp-1">
                    {String(singleResult.product_name)}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Toko: <span className="font-medium text-foreground">{String(singleResult.seller_name ?? "-")}</span> • ID: <span className="font-mono">{String(singleResult.product_id)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {singleResult.affiliate_link && (
                    <a
                      href={String(singleResult.affiliate_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-primary hover:bg-muted font-medium"
                    >
                      <ExternalLinkIcon className="size-3" />
                      Link Affiliate
                    </a>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUseSingleResult}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                  >
                    Lanjutkan ke Preview & Import
                  </Button>
                </div>
              </div>

              {/* Rincian Komisi Card (Persis Screenshot) */}
              <div>
                <CommissionBreakdownCard
                  currency={singleRegion === "ID" ? "IDR" : "MYR"}
                  commissionLiveRate={singleResult.commission_live_rate || singleResult.commission_rate}
                  commissionLiveAmount={singleResult.commission_live_amount || singleResult.commission_amount}
                  commissionSocialRate={singleResult.commission_social_rate}
                  commissionSocialAmount={singleResult.commission_social_amount}
                  commissionVideoRate={singleResult.commission_video_rate}
                  commissionVideoAmount={singleResult.commission_video_amount}
                  hasKomisiXtra={Boolean(singleResult.has_komisi_xtra || singleResult.komisi_xtra_rate)}
                  komisiXtraRate={singleResult.komisi_xtra_rate}
                  komisiXtraAmount={singleResult.komisi_xtra_amount}

                  commissionLiveXtraRate={singleResult.commission_live_xtra_rate as any}
                  commissionLiveXtraAmount={singleResult.commission_live_xtra_amount as any}
                  commissionLiveShopeeRate={singleResult.commission_live_shopee_rate as any}
                  commissionLiveShopeeAmount={singleResult.commission_live_shopee_amount as any}

                  commissionSocialXtraRate={singleResult.commission_social_xtra_rate as any}
                  commissionSocialXtraAmount={singleResult.commission_social_xtra_amount as any}
                  commissionSocialShopeeRate={singleResult.commission_social_shopee_rate as any}
                  commissionSocialShopeeAmount={singleResult.commission_social_shopee_amount as any}

                  commissionVideoXtraRate={singleResult.commission_video_xtra_rate as any}
                  commissionVideoXtraAmount={singleResult.commission_video_xtra_amount as any}
                  commissionVideoShopeeRate={singleResult.commission_video_shopee_rate as any}
                  commissionVideoShopeeAmount={singleResult.commission_video_shopee_amount as any}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: BATCH UPLOAD (SHOPDORA) */}
      {mode === "batch" && (
        <>
          {/* Enrichment Progress Indicator */}
          {isEnriching && progress && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground truncate max-w-[70%]">
                  <Loader2Icon className="size-4 animate-spin text-primary shrink-0" />
                  <span className="truncate">
                    {progress.currentProduct
                      ? progress.currentProduct
                      : "Menghubungi Shopee Affiliate & Melengkapi Data Produk..."}
                  </span>
                </div>
                <span className="font-mono font-semibold text-primary shrink-0">
                  {progress.percentage}% ({progress.completed} / {progress.total} produk)
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground">
                Mohon jangan menutup halaman ini. Ekstensi sedang mengambil persentase komisi 3 platform dan link affiliate unik untuk materi live streaming Anda.
              </p>
            </div>
          )}

          {/* Main Upload Box */}
          {!isEnriching && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.005]"
                  : "border-border/80 bg-card/60 hover:border-border hover:bg-card"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isLoading || isEnriching}
              />

              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
                <UploadCloudIcon className="size-8" />
              </div>

              <h3 className="text-base font-semibold text-foreground">
                Pilih atau Seret File Export Shopdora ke Sini
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mt-1 mb-5">
                Mendukung file export <span className="font-semibold text-foreground">JSON</span> (atau CSV)
                dari Shopdora.
                {isExtensionInstalled && autoEnrich && (
                  <span className="block text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    ⚡ Auto-Enrich Komisi 3 Platform & Link Affiliate Shopee aktif.
                  </span>
                )}
              </p>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isEnriching}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <FileCodeIcon className="size-4 mr-2" />
                Pilih File Shopdora dari Komputer
              </Button>
            </div>
          )}
        </>
      )}

      {enrichError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>Peringatan Enrichment: {enrichError} (Melanjutkan dengan data awal).</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

function parseCsvSimple(text: string): RawImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: RawImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const values: string[] = [];
    let insideQuotes = false;
    let currentValue = "";

    for (let j = 0; j < rawLine.length; j++) {
      const char = rawLine[j];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const rowObj: RawImportRow = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] ?? null;
    });

    rows.push(rowObj);
  }

  return rows;
}
