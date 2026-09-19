"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { ProductTable } from "@/features/catalog/components/product-table";
import { ProductsToolbar } from "@/features/catalog/components/products-toolbar";
import { catalogHref } from "@/features/catalog/components/products-url";
import { getCatalogPage } from "@/features/catalog/actions/get-catalog-page";
import type { CatalogSortId } from "@/features/catalog/schemas";
import { catalogParamsSchema, catalogSortIds } from "@/features/catalog/schemas";
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
  pinnedProductIds: string[];
}

export function ProductsView({ dtos, total, page, pageSize, view, pinnedProductIds }: ProductsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // URL remains source of truth; schema defaults mirror the route parser.
  const parsed = catalogParamsSchema.parse({
    view: searchParams.get("view"),
    region: searchParams.get("region"),
    q: searchParams.get("q"),
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    sort: searchParams.get("sort"),
    dir: searchParams.get("dir"),
  });
  const queryKey = [
    "catalog",
    parsed.view,
    parsed.region,
    parsed.q,
    parsed.page,
    parsed.pageSize,
    parsed.sort ?? null,
    parsed.dir,
  ] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getCatalogPage(parsed),
    initialData: {
      rows: dtos,
      total,
      page,
      pageSize,
      pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
      batch: null,
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  // Prefetch neighbors so paging feels instant; server cache makes these cheap.
  React.useEffect(() => {
    const pageCount = query.data.pageCount;
    for (const nextPage of [parsed.page - 1, parsed.page + 1]) {
      if (nextPage < 1 || nextPage > pageCount) continue;
      const next = { ...parsed, page: nextPage };
      queryClient.prefetchQuery({
        queryKey: [
          "catalog",
          next.view,
          next.region,
          next.q,
          next.page,
          next.pageSize,
          next.sort ?? null,
          next.dir,
        ],
        queryFn: () => getCatalogPage(next),
        staleTime: 60_000,
      });
    }
  }, [queryClient, query.data.pageCount, parsed]);

  const rows = query.data.rows.map(dtoToCatalogRow);

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
    <div className="space-y-4">
      <ProductsToolbar />
      <ProductTable
        data={rows}
        total={query.data.total}
        page={query.data.page}
        pageSize={query.data.pageSize}
        view={view}
        sortId={sortId}
        sortDir={sortDir}
        pinnedProductIds={pinnedProductIds}
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
