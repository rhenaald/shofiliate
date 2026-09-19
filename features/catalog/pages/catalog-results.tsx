import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductsView } from "@/features/catalog/components/products-view";
import { listProducts } from "@/features/catalog/data/list-products";
import { getPinnedProductIds } from "@/features/pins/data/get-pinned-product-ids";
import type { CatalogParams } from "@/features/catalog/schemas";

function formatBatchDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CatalogTableStream({ params }: { params: CatalogParams }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <CatalogTableInner params={params} />
    </Suspense>
  );
}

async function CatalogTableInner({ params }: { params: CatalogParams }) {
  const [result, pinnedProductIds] = await Promise.all([
    listProducts(params),
    getPinnedProductIds(),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {result.total} produk
          {params.view !== "all"
            ? ` · ${params.view === "best" ? "Best Seller" : "Trending"}`
            : ""}
          {` · Region ${params.region}`}
        </p>
        {result.batch ? (
          <p className="text-xs text-muted-foreground">
            Data per: {formatBatchDate(result.batch.createdAt)}
          </p>
        ) : null}
      </div>
      <ProductsView
        dtos={result.rows}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        view={params.view}
        pinnedProductIds={pinnedProductIds}
      />
    </div>
  );
}
