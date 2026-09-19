"use client";

import * as React from "react";

import { createStagingFile, removeStagingRows, saveStaging } from "@/features/products/actions/staging";
import { stagingDeleteToast } from "@/features/products/components/staging-table";
import { ImportResult } from "@/features/products/components/import-result";
import { ImportUploader } from "@/features/products/components/import-uploader";
import { StagingTable } from "@/features/products/components/staging-table";
import type { ImportBatchResult, RawImportRow, StagingRow } from "@/features/products/types";

export function ImportPageComposition() {
  const [step, setStep] = React.useState<"upload" | "staging" | "result">("upload");
  const [staging, setStaging] = React.useState<StagingRow[]>([]);
  const [result, setResult] = React.useState<ImportBatchResult | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reloadStaging = async () => {
    const res = await fetch("/api/staging", { cache: "no-store" });
    if (!res.ok) throw new Error(`Gagal memuat staging (${res.status})`);
    const json = (await res.json()) as { rows: StagingRow[] };
    setStaging(Array.isArray(json.rows) ? json.rows : []);
  };

  const handleFileLoaded = async (name: string, loaded: RawImportRow[]) => {
    setIsSaving(true);
    setError(null);
    try {
      await createStagingFile({ fileName: name, rows: loaded });
      await reloadStaging();
      setStep("staging");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat file.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSelected = async (ids: string[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await saveStaging({ selectedIds: ids });
      setResult(res);
      setStep("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await saveStaging({});
      setResult(res);
      setStep("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await removeStagingRows({ ids });
      stagingDeleteToast(res.removed);
      await reloadStaging();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setStaging([]);
    setResult(null);
    setError(null);
  };

  if (step === "upload")
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            <span className="font-semibold">Gagal Import: </span>
            <span>{error}</span>
          </div>
        )}
        <ImportUploader onFileLoaded={handleFileLoaded} isLoading={isSaving} />
      </div>
    );
  if (step === "staging")
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            <span className="font-semibold">Gagal Import: </span>
            <span>{error}</span>
          </div>
        )}
        <StagingTable data={staging} onSaveSelected={handleSaveSelected} onSaveAll={handleSaveAll} onBulkDelete={handleBulkDelete} isSaving={isSaving} />
      </div>
    );
  if (step === "result" && result) return <ImportResult result={result} onReset={handleReset} />;
  return null;
}
