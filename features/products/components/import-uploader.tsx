"use client";

import {
  AlertCircleIcon,
  FileCodeIcon,
  UploadCloudIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { RawImportRow } from "@/features/products/types";

interface ImportUploaderProps {
  onFileLoaded: (fileName: string, rows: RawImportRow[]) => void;
  isLoading?: boolean;
}

export function ImportUploader({
  onFileLoaded,
  isLoading = false,
}: ImportUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "json" && extension !== "csv") {
      setErrorMessage("Format file tidak didukung. Harap unggah file .json atau .csv hasil export extension.");
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
    // reset value so same file can be picked again
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${isDragging
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
          disabled={isLoading}
        />

        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
          <UploadCloudIcon className="size-8" />
        </div>

        <h3 className="text-base font-semibold text-foreground">
          Pilih atau Seret File Export Scraping ke Sini
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mt-1 mb-5">
          Mendukung file export <span className="font-semibold text-foreground">JSON</span> (atau CSV)
          dari extension Shopee. Kolom snake_case akan diparse dan dideduplikasi secara otomatis.
        </p>

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <FileCodeIcon className="size-4 mr-2" />
          Pilih File dari Komputer
        </Button>
      </div>

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
    // Simple regex matching comma-separated fields with quotes
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
