"use client";

import * as React from "react";

import { createStagingFile, saveStaging } from "@/features/products/actions/staging";
import { ImportResult } from "@/features/products/components/import-result";
import { ImportUploader } from "@/features/products/components/import-uploader";
import { StagingTable } from "@/features/products/components/staging-table";
import type { ImportBatchResult, RawImportRow, StagingRow } from "@/features/products/types";

export function ImportPageComposition() {
  const [step, setStep] = React.useState<"upload" | "staging" | "result">("upload");
  const [staging, setStaging] = React.useState<StagingRow[]>([]);
  const [result, setResult] = React.useState<ImportBatchResult | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const reloadStaging = async () => {
    const res = await fetch("/api/staging", { cache: "no-store" });
    const json = (await res.json()) as { rows: StagingRow[] };
    setStaging(Array.isArray(json.rows) ? json.rows : []);
  };

  const handleFileLoaded = async (name: string, loaded: RawImportRow[]) => {
    setIsSaving(true);
    try {
      await createStagingFile({ fileName: name, rows: loaded });
      await reloadStaging();
      setStep("staging");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSelected = async (ids: string[]) => {
    setIsSaving(true);
    try {
      const res = await saveStaging({ selectedIds: ids });
      setResult(res);
      setStep("result");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await saveStaging({});
      setResult(res);
      setStep("result");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setStaging([]);
    setResult(null);
  };

  if (step === "upload") return <ImportUploader onFileLoaded={handleFileLoaded} isLoading={isSaving} />;
  if (step === "staging")
    return <StagingTable data={staging} onSaveSelected={handleSaveSelected} onSaveAll={handleSaveAll} isSaving={isSaving} />;
  if (step === "result" && result) return <ImportResult result={result} onReset={handleReset} />;
  return null;
}
