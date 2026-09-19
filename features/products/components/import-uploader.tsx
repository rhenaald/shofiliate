"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileCodeIcon,
  InfoIcon,
  Loader2Icon,
  SparklesIcon,
  UploadCloudIcon,
  ZapIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useCompanionExtension } from "@/features/products/hooks/use-companion-extension";
import type { RawImportRow, RegionCode } from "@/features/products/types";

interface ImportUploaderProps {
  onFileLoaded: (fileName: string, rows: RawImportRow[], warning?: string) => void;
  isLoading?: boolean;
}

export function ImportUploader({
  onFileLoaded,
  isLoading = false,
}: ImportUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showExtensionGuide, setShowExtensionGuide] = React.useState(false);
  const [batchRegion, setBatchRegion] = React.useState<RegionCode>("MY");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const {
    isExtensionInstalled,
    isEnriching,
    progress,
    enrichRows,
    enrichError,
  } = useCompanionExtension();

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
        parsedRows = (rawJson as Record<string, unknown>[]).map((item) => {
          const rowObj: RawImportRow = {};
          for (const [k, v] of Object.entries(item)) {
            rowObj[k] = v as string;
            const norm = normalizeHeader(k);
            if (norm) {
              rowObj[norm] = v as string;
            }
          }
          if (!rowObj.product_id && rowObj.product_url) {
            const u = String(rowObj.product_url);
            const m1 = u.match(/\/product\/(\d+)\/(\d+)/);
            const m2 = u.match(/(?:[.\-_]i|i)\.(\d+)\.(\d+)/i);
            const m3 = u.match(/\/offer\/product_offer\/(\d+)/i);
            const m4 = u.match(/[?&](?:item_?id|itemid|id)=(\d+)/i);
            const m5 = u.match(/(\d{8,14})(?:[/?#]|$)/);
            if (m1) rowObj.product_id = m1[2];
            else if (m2) rowObj.product_id = m2[2];
            else if (m3) rowObj.product_id = m3[1];
            else if (m4) rowObj.product_id = m4[1];
            else if (m5) rowObj.product_id = m5[1];
          }
          return rowObj;
        });
      } else if (extension === "csv") {
        parsedRows = parseCsvSimple(text);
      }

      if (parsedRows.length === 0) {
        throw new Error("File tidak berisi baris data produk.");
      }

      // Deteksi region dari item di dalam file (default MY jika URL/GMV mengarah ke MY)
      let detectedRegion: RegionCode = batchRegion;
      for (const r of parsedRows) {
        const url = String(r.product_url || r.url || "").toLowerCase();
        const gmv = String(r.gmv_30d || "");
        if (url.includes(".com.my") || gmv.startsWith("RM")) { detectedRegion = "MY"; break; }
        if (url.includes(".sg") || gmv.startsWith("S$")) { detectedRegion = "SG"; break; }
        if (url.includes(".co.id") || gmv.startsWith("Rp")) { detectedRegion = "ID"; break; }
        if (url.includes(".co.th") || gmv.startsWith("฿")) { detectedRegion = "TH"; break; }
        if (url.includes(".ph") || gmv.startsWith("₱")) { detectedRegion = "PH"; break; }
        if (url.includes(".vn") || gmv.startsWith("₫")) { detectedRegion = "VN"; break; }
      }

      // Jika ekstensi aktif, otomatis jalankan enrichment komisi & link affiliate
      if (isExtensionInstalled) {
        try {
          const enriched = await enrichRows(parsedRows, detectedRegion);
          onFileLoaded(file.name, enriched);
          return;
        } catch (enrichErr: unknown) {
          console.warn("Enrichment gagal, melanjutkan dengan data mentah:", enrichErr);
          const msg =
            enrichErr instanceof Error
              ? `Auto-Enrich gagal: ${enrichErr.message}`
              : "Auto-Enrich gagal menghubungi Shopee Affiliate.";
          setErrorMessage(msg);
          onFileLoaded(
            file.name,
            parsedRows,
            `${msg}. Pastikan tab Shopee Affiliate sudah dibuka dan login, lalu klik tombol "Lengkapi Komisi & Link" di bawah.`
          );
          return;
        }
      }

      onFileLoaded(
        file.name,
        parsedRows,
        !isExtensionInstalled
          ? "Ekstensi Shofiliate Companion belum terdeteksi. Silakan reload ekstensi di chrome://extensions/ dan pastikan sudah login di Shopee Affiliate untuk melengkapi komisi dan link affiliate."
          : undefined
      );
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
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Region:</span>
            <select
              value={batchRegion}
              onChange={(e) => setBatchRegion(e.target.value as RegionCode)}
              className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="MY">🇲🇾 Malaysia (MY)</option>
              <option value="SG">🇸🇬 Singapura (SG)</option>
              <option value="ID">🇮🇩 Indonesia (ID)</option>
              <option value="TH">🇹🇭 Thailand (TH)</option>
              <option value="PH">🇵🇭 Filipina (PH)</option>
              <option value="VN">🇻🇳 Vietnam (VN)</option>
            </select>
          </div>
          {!isExtensionInstalled && (
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
          )}
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
            {isExtensionInstalled && (
              <span className="block text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                ⚡ Auto-Enrich Komisi 3 Platform & Link Affiliate Shopee aktif otomatis.
              </span>
            )}
          </p>

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isEnriching}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <FileCodeIcon className="size-4 mr-2" />
            Pilih File Shopdora dari Komputer
          </Button>
        </div>
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

function normalizeHeader(raw: string): string {
  const clean = raw.trim().toLowerCase().replace(/[\s\-_.]+/g, "_");

  // product_id
  if (
    clean === "product_id" ||
    clean === "productid" ||
    clean === "item_id" ||
    clean === "itemid" ||
    clean === "id" ||
    clean === "id_produk" ||
    clean === "kode_produk" ||
    clean === "goods_id"
  ) {
    return "product_id";
  }

  // product_name
  if (
    clean === "product_name" ||
    clean === "productname" ||
    clean === "name" ||
    clean === "title" ||
    clean === "nama_produk" ||
    clean === "judul_produk" ||
    clean === "nama_barang" ||
    clean === "item_name"
  ) {
    return "product_name";
  }

  // product_url
  if (
    clean === "product_url" ||
    clean === "producturl" ||
    clean === "url" ||
    clean === "link" ||
    clean === "link_produk" ||
    clean === "product_link" ||
    clean === "item_url" ||
    clean === "tautan_produk" ||
    clean === "tautan" ||
    clean === "shopee_link" ||
    clean === "shopee_url"
  ) {
    return "product_url";
  }

  // seller_name
  if (
    clean === "seller_name" ||
    clean === "seller" ||
    clean === "shop_name" ||
    clean === "shopname" ||
    clean === "nama_toko" ||
    clean === "toko" ||
    clean === "penjual"
  ) {
    return "seller_name";
  }

  // rating
  if (
    clean === "rating" ||
    clean === "rating_star" ||
    clean === "score" ||
    clean === "penilaian" ||
    clean === "bintang" ||
    clean === "product_rating" ||
    clean === "shop_rating"
  ) {
    return "rating";
  }

  // sales_30d
  if (
    clean === "sales_30d" ||
    clean === "30d_sales" ||
    clean === "sales30d" ||
    clean === "penjualan_30d" ||
    clean === "penjualan_30_hari" ||
    clean === "monthly_sales"
  ) {
    return "sales_30d";
  }

  // gmv_30d
  if (
    clean === "gmv_30d" ||
    clean === "30d_gmv" ||
    clean === "gmv30d" ||
    clean === "gmv_30_hari" ||
    clean === "omset_30d" ||
    clean === "revenue_30d" ||
    clean === "price" ||
    clean === "harga"
  ) {
    return "gmv_30d";
  }

  // growth_30d
  if (
    clean === "growth_30d" ||
    clean === "30d_growth" ||
    clean === "growth" ||
    clean === "pertumbuhan"
  ) {
    return "growth_30d";
  }

  // total_sales
  if (
    clean === "total_sales" ||
    clean === "historical_sold" ||
    clean === "total_sold" ||
    clean === "terjual" ||
    clean === "total_terjual"
  ) {
    return "total_sales";
  }

  // affiliate_link
  if (
    clean === "affiliate_link" ||
    clean === "affiliate_url" ||
    clean === "link_affiliate" ||
    clean === "pautan_afiliasi" ||
    clean === "offer_link" ||
    clean === "custom_link"
  ) {
    return "affiliate_link";
  }

  // commission
  if (clean === "commission_rate" || clean === "komisi" || clean === "commission") {
    return "commission_rate";
  }

  return clean;
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
      const val = values[idx] ?? null;
      rowObj[header] = val;
      const norm = normalizeHeader(header);
      if (norm) {
        rowObj[norm] = val;
      }
    });

    // Otomatis ekstrak product_id dari product_url jika product_id belum ada
    if (!rowObj.product_id && rowObj.product_url) {
      const u = String(rowObj.product_url);
      const m1 = u.match(/\/product\/(\d+)\/(\d+)/);
      const m2 = u.match(/(?:[.\-_]i|i)\.(\d+)\.(\d+)/i);
      const m3 = u.match(/\/offer\/product_offer\/(\d+)/i);
      const m4 = u.match(/[?&](?:item_?id|itemid|id)=(\d+)/i);
      const m5 = u.match(/(\d{8,14})(?:[/?#]|$)/);
      if (m1) rowObj.product_id = m1[2];
      else if (m2) rowObj.product_id = m2[2];
      else if (m3) rowObj.product_id = m3[2];
      else if (m4) rowObj.product_id = m4[1];
      else if (m5) rowObj.product_id = m5[1];
    }

    rows.push(rowObj);
  }

  return rows;
}
