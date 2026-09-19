"use client";

import * as React from "react";
import type { RawImportRow } from "@/features/products/types";

export interface EnrichProgress {
  completed: number;
  total: number;
  percentage: number;
  currentProduct?: string;
}

export function useCompanionExtension() {
  const [isExtensionInstalled, setIsExtensionInstalled] = React.useState<boolean>(false);
  const [isEnriching, setIsEnriching] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<EnrichProgress | null>(null);
  const [enrichError, setEnrichError] = React.useState<string | null>(null);

  const pendingRequests = React.useRef<
    Map<
      string,
      {
        resolve: (rows: RawImportRow[]) => void;
        reject: (reason: Error) => void;
      }
    >
  >(new Map());

  // Deteksi ekstensi saat pertama kali load via postMessage PING/PONG
  React.useEffect(() => {
    // Ping ekstensi secara berkala di awal (ekstensi merespons dengan PONG)
    const pingInterval = setInterval(() => {
      window.postMessage(
        {
          target: "shofiliate-companion-extension",
          type: "PING",
        },
        "*"
      );
    }, 600);

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || typeof event.data !== "object") {
        return;
      }

      const { source, type, result, error, requestId, completed, total, percentage, currentProduct } = event.data;
      if (source !== "shofiliate-companion-extension" && source !== "shofiliate-companion-background") {
        return;
      }

      if (type === "SHOFILIATE_EXTENSION_READY" || type === "PONG") {
        setIsExtensionInstalled(true);
      }

      if (type === "ENRICH_PROGRESS") {
        setProgress({
          completed: completed || 0,
          total: total || 0,
          percentage: percentage || 0,
          currentProduct: currentProduct || "",
        });
      }

      if (type === "SEARCH_BY_NAME_RESULT" && requestId) {
        const handler = pendingRequests.current.get(requestId);
        if (handler) {
          pendingRequests.current.delete(requestId);
          if (result && result.success && result.product) {
            handler.resolve(result.product);
          } else {
            handler.reject(new Error(result?.error || "Produk tidak ditemukan"));
          }
        }
      }

      if (type === "ENRICH_PRODUCTS_RESULT" && requestId) {
        const handler = pendingRequests.current.get(requestId);
        if (handler) {
          setIsEnriching(false);
          setProgress(null);
          pendingRequests.current.delete(requestId);
          if (result && result.success && Array.isArray(result.rows)) {
            handler.resolve(result.rows);
          } else {
            handler.reject(new Error(result?.error || "Gagal memperkaya data produk"));
          }
        }
      }

      if (type === "ENRICH_PRODUCTS_ERROR" && requestId) {
        const handler = pendingRequests.current.get(requestId);
        if (handler) {
          setIsEnriching(false);
          setProgress(null);
          pendingRequests.current.delete(requestId);
          handler.reject(new Error(error || "Gagal berkomunikasi dengan ekstensi"));
        }
      }
    };

    window.addEventListener("message", handleWindowMessage);

    // Hentikan ping setelah 5 detik jika sudah terdeteksi atau timeout
    const stopTimer = setTimeout(() => {
      clearInterval(pingInterval);
    }, 5000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(stopTimer);
      window.removeEventListener("message", handleWindowMessage);
    };
  }, []);

  const searchSingleProductByName = React.useCallback(
    (keyword: string, region: string = "ID"): Promise<RawImportRow> => {
      return new Promise((resolve, reject) => {
        const requestId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        if (!isExtensionInstalled) {
          reject(
            new Error(
              "Ekstensi Shofiliate Companion belum terdeteksi aktif di browser. Pastikan ekstensi sudah dimuat/diaktifkan di chrome://extensions/ lalu refresh halaman ini."
            )
          );
          return;
        }

        pendingRequests.current.set(requestId, {
          resolve: (row: unknown) => resolve(row as RawImportRow),
          reject,
        });

        window.postMessage(
          {
            target: "shofiliate-companion-extension",
            type: "SEARCH_BY_NAME",
            requestId,
            payload: { keyword, region },
          },
          "*"
        );

        // Safety timeout 35 detik jika ekstensi atau tab Shopee tidak merespons
        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            reject(
              new Error(
                "Waktu tunggu pencarian Shopee habis (35 detik). Pastikan akun Shopee Affiliate Anda sudah login di browser Chrome dan ekstensi aktif."
              )
            );
          }
        }, 35000);
      });
    },
    [isExtensionInstalled]
  );

  const enrichRows = React.useCallback(
    (rows: RawImportRow[], region: string = "ID"): Promise<RawImportRow[]> => {
      return new Promise((resolve, reject) => {
        if (!isExtensionInstalled) {
          // Jika extension tidak ada, kembalikan data apa adanya
          return resolve(rows);
        }

        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setIsEnriching(true);
        setEnrichError(null);
        setProgress({ completed: 0, total: rows.length, percentage: 0 });

        pendingRequests.current.set(requestId, { resolve, reject });

        window.postMessage(
          {
            target: "shofiliate-companion-extension",
            type: "ENRICH_PRODUCTS",
            requestId,
            payload: {
              rows,
              region,
            },
          },
          "*"
        );

        // Safety timeout dinamis (minimal 5 menit, atau 20 detik per produk)
        const timeoutMs = Math.max(300000, rows.length * 20000);
        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            setIsEnriching(false);
            setProgress(null);
            reject(new Error(`Waktu tunggu respons ekstensi habis (Timeout ${Math.round(timeoutMs / 60000)} Menit).`));
          }
        }, timeoutMs);
      });
    },
    [isExtensionInstalled]
  );

  const scrapeSingleProduct = React.useCallback(
    async (item: { itemId: string; name: string; url: string; region: string }): Promise<RawImportRow> => {
      const rows = await enrichRows(
        [
          {
            product_id: item.itemId,
            product_name: item.name,
            product_url: item.url,
          },
        ],
        item.region
      );
      if (!rows || rows.length === 0) {
        throw new Error("Gagal mengambil data dari ekstensi Shopee Affiliate");
      }
      return rows[0];
    },
    [enrichRows]
  );

  return {
    isExtensionInstalled,
    isEnriching,
    progress,
    enrichError,
    setEnrichError,
    enrichRows,
    searchSingleProductByName,
    scrapeSingleProduct,
  };
}
