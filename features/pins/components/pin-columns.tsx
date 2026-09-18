"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, MoreHorizontal, Pencil, PinOff } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PinDTO } from "@/features/pins/types";

export function formatPinDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Clipped({ text, lines = 2 }: { text: string; lines?: 1 | 2 }) {
  const cls =
    lines === 2
      ? "line-clamp-2 max-w-56 whitespace-normal"
      : "block max-w-44 truncate";
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cls}>{text}</span>} />
      <TooltipContent className="max-w-80">{text}</TooltipContent>
    </Tooltip>
  );
}

export interface PinColumnActions {
  onEditNote: (pin: PinDTO) => void;
  onUnpin: (pin: PinDTO) => void;
}

/** Kolom board pins §9: produk, region, note, pemin, waktu + aksi kelola. */
export function createPinColumns(
  opts: PinColumnActions,
): ColumnDef<DataTableFeatures, PinDTO>[] {
  return [
    {
      id: "product",
      accessorKey: "name",
      header: "Produk",
      cell: ({ row }) => (
        <div className="min-w-0">
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 max-w-56 font-medium whitespace-normal text-primary hover:underline"
          >
            {row.original.name}
          </a>
          <p className="block max-w-44 truncate text-xs text-muted-foreground">
            {row.original.shopName}
          </p>
        </div>
      ),
    },
    {
      id: "region",
      accessorKey: "region",
      header: "Region",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.region}</Badge>
      ),
    },
    {
      id: "note",
      accessorKey: "note",
      header: "Catatan",
      cell: ({ row }) =>
        row.original.note ? (
          <Clipped text={row.original.note} lines={1} />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      id: "pinnedBy",
      accessorKey: "pinnedBy",
      header: "Pemin",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="block max-w-32 truncate text-sm font-medium">
            {row.original.pinnedBy.name}
          </p>
          {row.original.pinnedBy.username ? (
            <p className="block max-w-32 truncate text-xs text-muted-foreground">
              @{row.original.pinnedBy.username}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "pinnedAt",
      accessorKey: "pinnedAt",
      header: "Dipin pada",
      cell: ({ row }) => (
        <span className="block whitespace-nowrap text-sm tabular-nums">
          {formatPinDate(row.original.pinnedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center">Aksi</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const pin = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Aksi pin">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (pin.url)
                    window.open(pin.url, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-3.5" />
                Lihat di Shopee
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => opts.onEditNote(pin)}>
                <Pencil className="size-3.5" />
                Edit catatan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => opts.onUnpin(pin)}>
                <PinOff className="size-3.5" />
                Unpin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
