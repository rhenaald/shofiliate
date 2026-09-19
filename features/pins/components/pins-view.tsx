"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { AddPinDialog } from "@/features/pins/components/add-pin-dialog";
import { PinDetailSheet } from "@/features/pins/components/pin-detail-sheet";
import { pinsHref } from "@/features/pins/components/pins-url";
import { PinsTable } from "@/features/pins/components/pins-table";
import { PinsToolbar } from "@/features/pins/components/pins-toolbar";
import { unpin } from "@/features/pins/actions/toggle-pin";
import { updatePinNote } from "@/features/pins/actions/update-pin-note";
import type { PinsSortId } from "@/features/pins/schemas";
import { pinsSortIds } from "@/features/pins/schemas";
import {
  PIN_COLUMN_SORT_ID,
  PINS_SORT_DEFAULT_DIR,
} from "@/features/pins/types";
import type { PinDTO } from "@/features/pins/types";

const editNoteFormSchema = z.object({
  note: z.string().trim().max(500),
});

interface PinsViewProps {
  dtos: PinDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export function PinsView({ dtos, total, page, pageSize }: PinsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<PinDTO | null>(null);
  const [editing, setEditing] = React.useState<PinDTO | null>(null);
  const [unpinning, setUnpinning] = React.useState<PinDTO | null>(null);

  const rawSort = searchParams.get("sort");
  const sortId: PinsSortId | null =
    rawSort && (pinsSortIds as readonly string[]).includes(rawSort)
      ? (rawSort as PinsSortId)
      : null;
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  // Siklus klik header: default kolom → lawan arah → kembali default board
  // (pinnedAt desc). Meniru products-view katalog.
  function handleSortChange(columnId: string) {
    const sid = PIN_COLUMN_SORT_ID[columnId];
    if (!sid) return;
    const current = sortId ? { id: sortId, dir: sortDir } : null;
    if (!current || current.id !== sid) {
      replace({ sort: sid, dir: PINS_SORT_DEFAULT_DIR[sid] });
    } else if (current.dir === PINS_SORT_DEFAULT_DIR[sid]) {
      replace({ sort: sid, dir: PINS_SORT_DEFAULT_DIR[sid] === "desc" ? "asc" : "desc" });
    } else {
      replace({ sort: null, dir: null });
    }
  }

  function handleSortDirection(dir: "asc" | "desc") {
    const sid = sortId ?? null;
    if (!sid) return;
    replace({ sort: sid, dir });
  }

  function handleClearSort() {
    replace({ sort: null, dir: null });
  }

  function replace(
    updates: Parameters<typeof pinsHref>[2],
    resetPage = true,
  ) {
    router.replace(
      pinsHref(pathname, searchParams, {
        ...(resetPage ? { page: "1" } : {}),
        ...updates,
      }),
    );
  }

  function handlePageChange(nextPage: number) {
    replace({ page: String(nextPage) }, false);
  }

  function handlePageSizeChange(nextSize: number) {
    replace({ pageSize: String(nextSize) });
  }

  return (
    <div className="space-y-4">
      <PinsToolbar onAddPin={() => setAddOpen(true)} />
      <PinsTable
        data={dtos}
        total={total}
        page={page}
        pageSize={pageSize}
        sortId={sortId}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        onSelectDirection={handleSortDirection}
        onClearSort={handleClearSort}
        onEditNote={setEditing}
        onUnpin={setUnpinning}
        onAddPin={() => setAddOpen(true)}
        onRowOpen={setDetail}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        query={searchParams.get("q") ?? ""}
        region={searchParams.get("region") ?? "MY"}
      />
      <AddPinDialog open={addOpen} onOpenChange={setAddOpen} />
      {detail ? (
        <PinDetailSheet
          pin={detail}
          onClose={() => setDetail(null)}
          onEditNote={setEditing}
          onUnpin={setUnpinning}
        />
      ) : null}
      {editing ? (
        <EditNoteSheet pin={editing} onClose={() => setEditing(null)} />
      ) : null}
      {unpinning ? (
        <UnpinConfirmSheet pin={unpinning} onClose={() => setUnpinning(null)} />
      ) : null}
    </div>
  );
}

function EditNoteSheet({
  pin,
  onClose,
}: {
  pin: PinDTO;
  onClose: () => void;
}) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(editNoteFormSchema),
    mode: "onChange",
    defaultValues: {
      note: pin.note ?? "",
    },
  });

  const { mutateAsync, isPending: isSubmitting } = useMutation({
    mutationKey: ["pins", "note", pin.pinId],
    mutationFn: async (values: { note: string }) => {
      return updatePinNote({ pinId: pin.pinId, note: values.note });
    },
  });

  async function onSubmit() {
    const mutationPromise = mutateAsync(form.getValues());

    toast.promise(mutationPromise, {
      loading: "Menyimpan catatan...",
      success: "Catatan diperbarui",
      error: (error) => {
        if (error instanceof Error) {
          return error.message;
        }
        return "Gagal menyimpan catatan";
      },
    });

    try {
      await mutationPromise;
      onClose();
      router.refresh();
    } catch {
      // Toast sudah menampilkan error.
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit catatan</SheetTitle>
          <SheetDescription className="line-clamp-2">
            {pin.name}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0"
        >
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.note}>
              <FieldLabel htmlFor={`edit-note-${pin.pinId}`}>
                Catatan
              </FieldLabel>
              <Input
                {...form.register("note")}
                id={`edit-note-${pin.pinId}`}
                placeholder="Catatan kurasi (maks 500)"
                aria-invalid={!!form.formState.errors.note}
              />
              {form.formState.errors.note && (
                <FieldError errors={[form.formState.errors.note]} />
              )}
            </Field>
          </FieldGroup>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2Icon className="size-3.5 animate-spin" />
              )}
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function UnpinConfirmSheet({
  pin,
  onClose,
}: {
  pin: PinDTO;
  onClose: () => void;
}) {
  const router = useRouter();
  const { mutateAsync, isPending: isSubmitting } = useMutation({
    mutationKey: ["pins", "unpin", pin.pinId],
    mutationFn: async () => {
      return unpin({ pinId: pin.pinId });
    },
  });

  async function onConfirm() {
    const mutationPromise = mutateAsync();

    toast.promise(mutationPromise, {
      loading: "Menghapus pin...",
      success: "Pin dihapus",
      error: (error) => {
        if (error instanceof Error) {
          return error.message;
        }
        return "Gagal menghapus pin";
      },
    });

    try {
      await mutationPromise;
      onClose();
      router.refresh();
    } catch {
      // Toast sudah menampilkan error.
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Unpin produk?</SheetTitle>
          <SheetDescription className="line-clamp-3">
            {pin.name} oleh {pin.pinnedBy.name} akan dihapus dari board
            bersama. Riwayat pin tetap tersimpan sebagai audit.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2Icon className="size-3.5 animate-spin" />
            )}
            {isSubmitting ? "Menghapus..." : "Ya, unpin"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
