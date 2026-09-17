import { PackageIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BatchStamp } from "@/features/products/components/batch-stamp";
import { getLatestImportBatch } from "@/features/products/data/batches";

export async function ProductsPageComposition() {
  const latestBatch = await getLatestImportBatch();

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Header with Batch Stamp */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageIcon className="size-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Katalog Produk
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar produk kurasi Shopee Affiliate dengan metrik snapshot penjualan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <BatchStamp batch={latestBatch} />

          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            nativeButton={false}
            render={<Link href="/dashboard/products/import" />}
          >
            <PlusIcon className="size-4 mr-1.5" />
            Import Produk
          </Button>
        </div>
      </div>

      {/* Empty / Placeholder State */}
      <div className="rounded-xl border border-border/70 bg-card p-12 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto mb-3">
          <PackageIcon className="size-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Katalog Produk
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          Tabel katalog produk lengkap beserta filter Best Seller dan Trending akan tersedia pada task berikutnya.
        </p>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/dashboard/products/import" />}
        >
          Buka Halaman Import
        </Button>
      </div>
    </div>
  );
}
