"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import type z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { addPin } from "@/features/pins/actions/add-pin";
import { PINS_REGIONS, addPinSchema } from "@/features/pins/schemas";

interface AddPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPinDialog({ open, onOpenChange }: AddPinDialogProps) {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(addPinSchema),
    mode: "onChange",
    defaultValues: {
      region: "MY",
      itemId: "",
      shopId: "",
      note: "",
    },
  });

  const { mutateAsync, isPending: isSubmitting } = useMutation({
    mutationKey: ["pins", "add"],
    mutationFn: async (values: z.input<typeof addPinSchema>) => {
      return addPin(values);
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  async function onSubmit() {
    const mutationPromise = mutateAsync(form.getValues());

    toast.promise(mutationPromise, {
      loading: "Menambahkan pin...",
      success: "Pin ditambahkan",
      error: (error) => {
        if (error instanceof Error) {
          return error.message;
        }
        return "Gagal menambahkan pin";
      },
    });

    try {
      await mutationPromise;
      form.reset();
      onOpenChange(false);
      router.refresh();
    } catch {
      // Toast sudah menampilkan error (mis. produk tidak ditemukan).
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Tambah Pin</SheetTitle>
          <SheetDescription>
            Pin produk katalog ke board bersama dengan ID produknya.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0"
        >
          <FieldGroup>
            <Controller
              name="region"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-pin-region">Region</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="add-pin-region"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Pilih region" />
                    </SelectTrigger>
                    <SelectContent>
                      {PINS_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Field data-invalid={!!form.formState.errors.itemId}>
              <FieldLabel htmlFor="add-pin-item">Product ID</FieldLabel>
              <Input
                {...form.register("itemId")}
                id="add-pin-item"
                inputMode="numeric"
                placeholder="cth. 1234567890"
                aria-invalid={!!form.formState.errors.itemId}
              />
              {form.formState.errors.itemId && (
                <FieldError errors={[form.formState.errors.itemId]} />
              )}
            </Field>
            <Field data-invalid={!!form.formState.errors.shopId}>
              <FieldLabel htmlFor="add-pin-shop">Shop ID</FieldLabel>
              <Input
                {...form.register("shopId")}
                id="add-pin-shop"
                inputMode="numeric"
                placeholder="cth. 987654321"
                aria-invalid={!!form.formState.errors.shopId}
              />
              {form.formState.errors.shopId && (
                <FieldError errors={[form.formState.errors.shopId]} />
              )}
            </Field>
            <Field data-invalid={!!form.formState.errors.note}>
              <FieldLabel htmlFor="add-pin-note">Catatan</FieldLabel>
              <Input
                {...form.register("note")}
                id="add-pin-note"
                placeholder="Catatan kurasi (opsional, maks 500)"
                aria-invalid={!!form.formState.errors.note}
              />
              {form.formState.errors.note && (
                <FieldError errors={[form.formState.errors.note]} />
              )}
            </Field>
          </FieldGroup>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2Icon className="size-3.5 animate-spin" />
              )}
              {isSubmitting ? "Menambahkan..." : "Tambah Pin"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
