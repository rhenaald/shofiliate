"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  DownloadIcon,
  FileCheckIcon,
  LayersIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
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
import type { ImportBatchResult } from "@/features/products/types";

interface ImportResultProps {
  result: ImportBatchResult;
  onReset: () => void;
}

export function ImportResult({ result, onReset }: ImportResultProps) {
  const handleDownloadErrors = () => {
    if (!result.errors.length) return;
    const blob = new Blob([JSON.stringify(result.errors, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${result.batchId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheckIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Proses Import Selesai
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                File <span className="font-mono font-medium">{result.fileName}</span> (Batch ID:{" "}
                <span className="font-mono text-foreground font-semibold">
                  #{result.batchId.slice(-6)}
                </span>
                ) telah selesai diproses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              <RotateCcwIcon className="size-4 mr-1.5" />
              Import File Lain
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              nativeButton={false}
              render={<Link href="/dashboard/products" />}
            >
              Lihat di Katalog
            </Button>
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
            <div className="text-xs font-medium text-muted-foreground">Total Baris</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {result.totalRows}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" />
              <span>Imported</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {result.imported}
            </div>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              <LayersIcon className="size-3.5" />
              <span>Updated</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {result.updated}
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <CopyIcon className="size-3.5" />
              <span>Duplicates</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {result.duplicates}
            </div>
          </div>

          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              <XCircleIcon className="size-3.5" />
              <span>Failed</span>
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {result.failed}
            </div>
          </div>
        </div>
      </div>

      {/* Error Report (if any) */}
      {result.errors.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-card overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 bg-rose-500/10 border-b border-rose-500/30 gap-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangleIcon className="size-4" />
              <span className="font-semibold text-sm">
                Daftar Baris Gagal ({result.errors.length} baris)
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadErrors}
              className="text-xs border-rose-500/30 hover:bg-rose-500/10"
            >
              <DownloadIcon className="size-3.5 mr-1.5" />
              Unduh Laporan Error (JSON)
            </Button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-xs">Baris</TableHead>
                  <TableHead className="text-xs">Item ID</TableHead>
                  <TableHead className="text-xs">Field Bermasalah</TableHead>
                  <TableHead className="text-xs">Penyebab Gagal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((err, idx) => (
                  <TableRow key={idx} className="text-xs">
                    <TableCell className="font-mono font-medium text-muted-foreground">
                      #{err.row}
                    </TableCell>
                    <TableCell className="font-mono">
                      {err.itemId || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-rose-500 font-medium">
                      {err.field}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {err.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
