"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { ChevronDown, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { pinsHref } from "@/features/pins/components/pins-url";
import { PINS_REGIONS } from "@/features/pins/schemas";

function update(
  replace: (href: string) => void,
  pathname: string,
  current: URLSearchParams,
  updates: Parameters<typeof pinsHref>[2],
  resetPage = true,
) {
  replace(
    pinsHref(pathname, current, {
      ...(resetPage ? { page: "1" } : {}),
      ...updates,
    }),
  );
}

export function PinsToolbar({ onAddPin }: { onAddPin: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const region = searchParams.get("region") ?? "MY";
  const q = searchParams.get("q") ?? "";

  // Debounce 300ms: fetch hanya setelah user berhenti mengetik (AC-040).
  // key={q} me-remount input saat URL berubah (back/forward) — tanpa sync effect.
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    const t = timer.current;
    return () => {
      if (t) clearTimeout(t);
    };
  }, []);

  function handleSearch(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      if (trimmed === q) return;
      update(router.replace.bind(router), pathname, searchParams, {
        q: trimmed === "" ? null : trimmed,
      });
    }, 300);
  }

  const replace = (href: string) => router.replace(href);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Region: {region}
              <ChevronDown className="size-3.5 shrink-0" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={region}
            onValueChange={(v) =>
              update(replace, pathname, searchParams, {
                region: v === "MY" ? null : v,
              })
            }
          >
            {PINS_REGIONS.map((r) => (
              <DropdownMenuRadioItem key={r} value={r}>
                {r}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="relative max-w-xs flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          key={q}
          defaultValue={q}
          placeholder="Cari produk atau toko..."
          aria-label="Cari pin"
          className="pl-8"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={onAddPin}>
          <Plus className="size-3.5" />
          Tambah Pin
        </Button>
      </div>
    </div>
  );
}
