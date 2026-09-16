"use client";

import { sortFn_alphanumeric, sortFn_text, type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Copy, ExternalLink } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProductRow } from "@/features/products/types";

function SortHeader({ label, onToggle }: { label: string; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={onToggle}>
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

function Placeholder() {
  return <span className="text-muted-foreground">-</span>;
}

function Clipped({ text, lines = 2 }: { text: string; lines?: 1 | 2 }) {
  const cls = lines === 2 ? "line-clamp-2 max-w-56 whitespace-normal" : "block max-w-44 truncate";
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cls}>{text}</span>} />
      <TooltipContent className="max-w-80">{text}</TooltipContent>
    </Tooltip>
  );
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ title: "Link disalin", description: url });
  } catch {
    toast.add({ title: "Gagal menyalin link", description: "Salin manual dari tombol Buka." });
  }
}

export const productColumns: ColumnDef<DataTableFeatures, ProductRow>[] = [
  {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => {
      const all = table.getIsAllRowsSelected();
      const some = table.getIsSomeRowsSelected();
      return (
        <input
          type="checkbox"
          role="checkbox"
          aria-label="Pilih semua"
          checked={all}
          ref={(el) => {
            if (el) el.indeterminate = !all && some;
          }}
          onChange={(e) => table.toggleAllRowsSelected(e.target.checked)}
          className="size-4 accent-current"
        />
      );
    },
    cell: ({ row }) => (
      <input
        type="checkbox"
        role="checkbox"
        aria-label="Pilih baris"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        className="size-4 accent-current"
      />
    ),
  },
  {
    id: "productName",
    accessorKey: "productName",
    header: ({ column }) => (
      <SortHeader label="Product Name" onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => <Clipped text={row.original.productName} lines={2} />,
    sortFn: sortFn_text,
  },
  {
    id: "category",
    accessorKey: "category",
    header: ({ column }) => (
      <SortHeader label="Category" onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => <Clipped text={row.original.category} lines={1} />,
    sortFn: sortFn_text,
  },
  { id: "price", header: "Price", enableSorting: false, cell: () => <Placeholder /> },
  {
    id: "shopName",
    accessorKey: "shopName",
    header: ({ column }) => (
      <SortHeader label="Shop Name" onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => <Clipped text={row.original.shopName} lines={1} />,
    sortFn: sortFn_text,
  },
  { id: "xtraCommission", header: "Xtra Commission", enableSorting: false, cell: () => <Placeholder /> },
  { id: "live", header: "Live", enableSorting: false, cell: () => <Placeholder /> },
  { id: "sosmed", header: "Sosmed", enableSorting: false, cell: () => <Placeholder /> },
  { id: "video", header: "Video", enableSorting: false, cell: () => <Placeholder /> },
  { id: "rating", header: "Rating", enableSorting: false, cell: () => <Placeholder /> },
  {
    id: "sold",
    accessorKey: "sold",
    header: ({ column }) => (
      <SortHeader label="Sold" onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => (
      <span className="block text-right font-semibold tabular-nums">
        {row.original.sold.toLocaleString("en-US")}
      </span>
    ),
    sortFn: sortFn_alphanumeric,
  },
  { id: "stock", header: "Stock", enableSorting: false, cell: () => <Placeholder /> },
  { id: "numAffiliate", header: "Num of Affiliate", enableSorting: false, cell: () => <Placeholder /> },
  {
    id: "affiliate",
    header: () => <div className="text-center">Affiliate Link</div>,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const url = row.original.productUrl;
      return (
        <ButtonGroup>
          <Button variant="outline" size="sm" disabled={!url} onClick={() => copyLink(url)}>
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!url}
            onClick={() => {
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-3.5" />
            Open
          </Button>
        </ButtonGroup>
      );
    },
  },
];

export const SORTABLE_COLUMNS = [
  { id: "productName", label: "Product Name" },
  { id: "shopName", label: "Shop Name" },
  { id: "sold", label: "Sold" },
] as const;
