"use client";

import { UploadCloudIcon } from "lucide-react";
import * as React from "react";

import { importProducts } from "@/features/products/actions/import-products";
import { ImportPreview } from "@/features/products/components/import-preview";
import { ImportResult } from "@/features/products/components/import-result";
import { ImportUploader } from "@/features/products/components/import-uploader";
import type {
  ImportBatchResult,
  RawImportRow,
} from "@/features/products/types";

export function ImportPageComposition() {
  const [step, setStep] = React.useState<"upload" | "preview" | "result">("upload");
  const [fileName, setFileName] = React.useState<string>("");
  const [rows, setRows] = React.useState<RawImportRow[]>([]);
  const [result, setResult] = React.useState<ImportBatchResult | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [warningMessage, setWarningMessage] = React.useState<string | null>(null);

  const handleFileLoaded = (name: string, loadedRows: RawImportRow[], warning?: string) => {
    setFileName(name);
    setRows(loadedRows);
    setWarningMessage(warning || null);
    setGeneralError(null);
    setStep("preview");
  };

  const handleConfirmImport = async (rowsToImport?: RawImportRow[]) => {
    setIsLoading(true);
    setGeneralError(null);
    const targetRows = rowsToImport || rows;
    try {
      const res = await importProducts({ fileName, rows: targetRows });
      setResult(res);
      setStep("result");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses import.";
      setGeneralError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFileName("");
    setRows([]);
    setResult(null);
    setGeneralError(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UploadCloudIcon className="size-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Import Produk Scraping
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Unggah file JSON/CSV hasil scraping extension untuk mendaftarkan produk baru dan merekam snapshot metrik penjualan.
        </p>
      </div>

      {generalError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          <span className="font-semibold">Gagal Import: </span>
          <span>{generalError}</span>
        </div>
      )}

      {/* Step Views */}
      {step === "upload" && (
        <ImportUploader onFileLoaded={handleFileLoaded} isLoading={isLoading} />
      )}

      {step === "preview" && (
        <ImportPreview
          fileName={fileName}
          rows={rows}
          onConfirm={handleConfirmImport}
          onCancel={handleReset}
          isLoading={isLoading}
          warningMessage={warningMessage}
        />
      )}

      {step === "result" && result && (
        <ImportResult result={result} onReset={handleReset} />
      )}
    </div>
  );
}
