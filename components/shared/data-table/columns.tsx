"use client";

import type { ColumnDef, RowData } from "@tanstack/react-table";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  variant?: "default" | "destructive";
  onSelect: () => void;
}

export function withSelectColumn<T extends RowData>(): ColumnDef<DataTableFeatures, T> {
  return {
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
        disabled={!row.getCanSelect()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        className="size-4 accent-current"
      />
    ),
  };
}

export function withActionColumn<T extends RowData>(options: {
  id?: string;
  header?: string;
  getItems: (data: T) => RowAction[];
}): ColumnDef<DataTableFeatures, T> {
  const { id = "actions", header = "Actions", getItems } = options;
  return {
    id,
    header: () => <div className="text-center">{header}</div>,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const items = getItems(row.original);
      if (items.length === 0) return null;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Aksi baris">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={
                    item.variant === "destructive"
                      ? "text-destructive focus:text-destructive focus:bg-destructive/10"
                      : undefined
                  }
                >
                  {Icon ? <Icon className="size-3.5" /> : null}
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}
