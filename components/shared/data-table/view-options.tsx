"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SortableColumn {
  id: string;
  label: string;
}

/** Minimal structural table surface. Avoids coupling shared UI to table generics. */
export interface ViewOptionsTable {
  getAllColumns: () => Array<{
    id: string;
    getCanHide: () => boolean;
    getIsVisible: () => boolean;
    toggleVisibility: (visible: boolean) => void;
  }>;
}

interface DataTableViewOptionsProps {
  table: ViewOptionsTable;
  sortableColumns: readonly SortableColumn[];
  activeColumnId: string | null;
  direction: "asc" | "desc";
  onSelectColumn: (columnId: string) => void;
  onSelectDirection: (dir: "asc" | "desc") => void;
  onClearSort: () => void;
}

export function DataTableViewOptions({
  table,
  sortableColumns,
  activeColumnId,
  direction,
  onSelectColumn,
  onSelectDirection,
  onClearSort,
}: DataTableViewOptionsProps) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Sort
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={direction}
            onValueChange={(v) => onSelectDirection(v as "asc" | "desc")}
          >
            <DropdownMenuRadioItem value="asc" disabled={activeColumnId === null}>
              Ascending
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc" disabled={activeColumnId === null}>
              Descending
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeColumnId ?? ""}
            onValueChange={(v) => {
              if (v) onSelectColumn(v);
            }}
          >
            {sortableColumns.map((col) => (
              <DropdownMenuRadioItem key={col.id} value={col.id}>
                {col.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClearSort}>Clear sort</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Columns
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="max-h-64 w-56">
          {table
            .getAllColumns()
            .filter((col) => col.getCanHide())
            .map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(!!v)}
              >
                {col.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
