"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Search } from "lucide-react";
import { catalogHref } from "@/features/products/components/products-url";

const VIEWS = [
  { id: "all", label: "Semua" },
  { id: "best", label: "Best Seller" },
  { id: "trending", label: "Trending" },
] as const;

const REGIONS = ["MY", "SG", "ID", "TH", "PH", "VN"] as const;

function update(
  replace: (href: string) => void,
  pathname: string,
  current: URLSearchParams,
  updates: Parameters<typeof catalogHref>[2],
  resetPage = true,
) {
  replace(
    catalogHref(pathname, current, {
      ...(resetPage ? { page: "1" } : {}),
      ...updates,
    }),
  );
}

export function ProductsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") ?? "all";
  const region = searchParams.get("region") ?? "MY";
  const q = searchParams.get("q") ?? "";

  // Debounce 300ms: fetch hanya setelah user berhenti mengetik.
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
      <div className="flex items-center gap-1" role="group" aria-label="Tampilan katalog">
        {VIEWS.map((v) => (
          <Button
            key={v.id}
            variant={view === v.id ? "default" : "outline"}
            size="sm"
            onClick={() =>
              update(replace, pathname, searchParams, {
                view: v.id === "all" ? null : v.id,
                // Kembali ke sort default view yang baru.
                sort: null,
                dir: null,
              })
            }
          >
            {v.label}
          </Button>
        ))}
      </div>
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
            {REGIONS.map((r) => (
              <DropdownMenuRadioItem key={r} value={r}>
                {r}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <InputGroup className="max-w-xs">
        <InputGroupInput
          key={q}
          defaultValue={q}
          placeholder="Search product or shop..."
          onChange={(e) => handleSearch(e.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <Search className="size-4" />
        </InputGroupAddon>
      </InputGroup>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/products/pins")}
        >
          Lihat Pins
        </Button>
        <Button variant="outline" size="sm" disabled title="Segera hadir di SH-7">
          Import
        </Button>
        <Button variant="outline" size="sm" disabled title="Segera hadir di SH-8">
          Input manual
        </Button>
      </div>
    </div>
  );
}
