"use client";

import { InfoIcon } from "lucide-react";
import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BatchSummary = {
  id: string;
  fileName: string;
  createdAt: Date | string;
} | null;

interface BatchStampProps {
  batch: BatchSummary;
  className?: string;
}

export function BatchStamp({ batch, className = "" }: BatchStampProps) {
  if (!batch) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <span>Belum ada data batch import.</span>
      </div>
    );
  }

  const dateObj = new Date(batch.createdAt);
  const formattedDate = dateObj.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const shortId = batch.id.slice(-6);

  return (
    <div
      data-testid="batch-stamp"
      className={`inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground ${className}`}
    >
      <span className="font-medium text-foreground">Data per:</span>
      <span>
        {formattedDate} (batch #{shortId})
      </span>

      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <InfoIcon className="size-3" />
          <span className="hidden sm:inline">Metodologi</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          Data produk, penjualan, dan metrik GMV bersumber dari snapshot file import (
          {batch.fileName}), bukan real-time. Ranking Best Seller & Trending dihitung secara deterministik dari snapshot ini.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
