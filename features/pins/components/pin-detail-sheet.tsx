"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPinDate } from "@/features/pins/components/pin-columns";
import type { PinDTO } from "@/features/pins/types";

interface PinDetailSheetProps {
  pin: PinDTO;
  onClose: () => void;
  onEditNote: (pin: PinDTO) => void;
  onUnpin: (pin: PinDTO) => void;
}

/** Detail satu pin: Catatan, Pemin, Dipin pada + aksi kelola. */
export function PinDetailSheet({
  pin,
  onClose,
  onEditNote,
  onUnpin,
}: PinDetailSheetProps) {
  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="line-clamp-2 text-left">
            {pin.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span className="truncate">{pin.shopName}</span>
            <Badge variant="secondary">{pin.region}</Badge>
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Catatan</p>
            {pin.note ? (
              <p className="text-sm whitespace-pre-wrap break-words">
                {pin.note}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">-</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pemin</p>
            <p className="text-sm font-medium">{pin.pinnedBy.name}</p>
            {pin.pinnedBy.username ? (
              <p className="text-xs text-muted-foreground">
                @{pin.pinnedBy.username}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Dipin pada
            </p>
            <p className="text-sm tabular-nums">
              {formatPinDate(pin.pinnedAt)}
            </p>
          </div>
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              onEditNote(pin);
            }}
          >
            Edit catatan
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onClose();
              onUnpin(pin);
            }}
          >
            Unpin
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
