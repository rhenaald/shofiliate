"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface BulkAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex w-fit -translate-x-1/2 animate-in items-center gap-2 rounded-full border bg-background px-4 py-2 shadow-lg fade-in slide-in-from-bottom-4">
      <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button key={action.id} variant="outline" size="sm" onClick={action.onClick}>
            <Icon className="size-3.5" />
            {action.label}
          </Button>
        );
      })}
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
