"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProductTable } from "@/features/catalog/components/product-table";
import { ProductsToolbar } from "@/features/catalog/components/products-toolbar";
import { catalogHref } from "@/features/catalog/components/products-url";
import type { CatalogSortId } from "@/features/catalog/schemas";
import { catalogSortIds } from "@/features/catalog/schemas";
import {
  COLUMN_SORT_ID,
  SORT_DEFAULT_DIR,
  VIEW_DEFAULT_SORT,
  dtoToCatalogRow,
  type CatalogProductDTO,
  type CatalogView,
} from "@/features/catalog/types";

interface ProductsViewProps {
  dtos: CatalogProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  view: CatalogView;
}

export function ProductsView({ dtos, total, page, pageSize, view }: ProductsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rows = dtos.map(dtoToCatalogRow);

  const rawSort = searchParams.get("sort");
  const sortId: CatalogSortId | null =
    rawSort && (catalogSortIds as readonly string[]).includes(rawSort)
      ? (rawSort as CatalogSortId)
      : null;
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  // Siklus klik header: default kolom → lawan arah → kembali default view.
  function handleSortChange(columnId: string) {
    const sid = COLUMN_SORT_ID[columnId];
    if (!sid) return;
    const fallback = VIEW_DEFAULT_SORT[view];
    const current = sortId ? { id: sortId, dir: sortDir } : fallback;
    if (!current || current.id !== sid) {
      replace({ sort: sid, dir: SORT_DEFAULT_DIR[sid] });
    } else if (current.dir === SORT_DEFAULT_DIR[sid]) {
      replace({ sort: sid, dir: SORT_DEFAULT_DIR[sid] === "desc" ? "asc" : "desc" });
    } else {
      replace({ sort: null, dir: null });
    }
  }

  function handleSortDirection(dir: "asc" | "desc") {
    const sid = sortId ?? VIEW_DEFAULT_SORT[view]?.id ?? null;
    if (!sid) return;
    replace({ sort: sid, dir });
  }

  function handleClearSort() {
    replace({ sort: null, dir: null });
  }

  function replace(updates: Parameters<typeof catalogHref>[2], resetPage = true) {
    router.replace(
      catalogHref(pathname, searchParams, {
        ...(resetPage ? { page: "1" } : {}),
        ...updates,
      }),
    );
  }

  function handlePageChange(nextPage: number) {
    router.replace(
      catalogHref(pathname, searchParams, { page: String(nextPage) }),
    );
  }

  function handlePageSizeChange(nextSize: number) {
    router.replace(
      catalogHref(pathname, searchParams, {
        pageSize: String(nextSize),
        page: "1",
      }),
    );
  }

  function handleClearFilters() {
    router.replace(pathname);
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <ProductsToolbar />
      <ProductTable
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        view={view}
        sortId={sortId}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        onSelectDirection={handleSortDirection}
        onClearSort={handleClearSort}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
