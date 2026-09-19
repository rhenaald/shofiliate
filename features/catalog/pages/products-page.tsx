import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProductsView } from "@/features/catalog/components/products-view";
import type { ListProductsResult } from "@/features/catalog/types";
import type { CatalogParams } from "@/features/catalog/schemas";

function formatBatchDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const METHODOLOGY =
  "Best = total penjualan all-time tertinggi (total_sales). " +
  "Trending = velocity: sales_30d tertinggi lalu growth_30d, syarat sales_30d ≥ 10. " +
  "Peringkat dari snapshot terakhir, bukan real-time.";

interface ProductsPageProps {
  params: CatalogParams;
  result: ListProductsResult;
  progress: { count: number; target: number };
  pinnedProductIds: string[];
}

export function ProductsPage({ params, result, progress, pinnedProductIds }: ProductsPageProps) {
  const remaining = Math.max(progress.target - progress.count, 0);
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} produk
            {params.view !== "all"
              ? ` · ${params.view === "best" ? "Best Seller" : "Trending"}`
              : ""}
            {` · Region ${params.region}`}
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {progress.count}/{progress.target} hari ini
            <span className="font-normal text-muted-foreground">
              {remaining > 0 ? ` · sisa ${remaining}` : " · target tercapai"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {result.batch ? (
            <p className="text-xs text-muted-foreground">
              Data per: {formatBatchDate(result.batch.createdAt)} (batch #
              {result.batch.id.slice(0, 8)} · {result.batch.fileName})
            </p>
          ) : null}
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm">Lihat metodologi</Button>} />
            <TooltipContent className="max-w-80">{METHODOLOGY}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <ProductsView
          dtos={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          view={params.view}
          pinnedProductIds={pinnedProductIds}
        />
      </Suspense>
    </div>
  );
}
