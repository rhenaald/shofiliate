import "server-only";

import { PinIcon, ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export async function PinsPageComposition() {
  const pins = await prisma.pin.findMany({
    where: { unpinnedAt: null },
    include: {
      product: true,
      pinnedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PinIcon className="size-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Pinned Products
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {pins.length} Produk
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar produk yang disematkan (pin) bersama oleh tim untuk kurasi live streaming.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/catalog" />}
          >
            <ArrowLeftIcon className="size-4 mr-1.5" />
            Kembali ke Katalog
          </Button>
        </div>
      </div>

      {pins.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-12 text-center shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto mb-3">
            <PinIcon className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Belum Ada Produk yang di-Pin
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Buka katalog produk dan sematkan produk terbaik untuk tim live streaming Anda.
          </p>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/catalog" />}
          >
            Buka Katalog Produk
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pins.map((pin) => (
            <div
              key={pin.id}
              className="rounded-xl border border-border/70 bg-card p-4 shadow-xs flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Dipin oleh: {pin.pinnedBy.name || pin.pinnedBy.email}</span>
                  <span>{new Date(pin.createdAt).toLocaleDateString("id-ID")}</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground line-clamp-2">
                  {pin.product.name}
                </h4>
                {pin.note && (
                  <p className="text-xs text-muted-foreground italic mt-1 bg-muted/40 p-2 rounded">
                    &quot;{pin.note}&quot;
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">
                  Komisi: {pin.product.commissionRate ?? "-"}%
                </span>
                {(pin.product.affiliateUrl || pin.product.url) && (
                  <a
                    href={pin.product.affiliateUrl || pin.product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Buka Shopee <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
