import Link from "next/link";
import { Suspense } from "react";

import { ArrowLeft, Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PinsView } from "@/features/pins/components/pins-view";
import { ProgressCard } from "@/features/pins/components/progress-card";
import type { PinsParams } from "@/features/pins/schemas";
import type {
  ListPinsResult,
  PinsProgress,
} from "@/features/pins/types";

interface PinsPageProps {
  params: PinsParams;
  result: ListPinsResult;
  progress: PinsProgress;
}

export function PinsPage({ params, result, progress }: PinsPageProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pin className="size-4" />
            </span>
            <h1 className="text-xl font-bold">Pins</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Team Board, {result.total} pin aktif · Region {params.region}
          </p>
          {/*<ProgressCard progress={progress} />*/}
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/products" />}
        >
          <ArrowLeft className="size-3.5" />
          Katalog
        </Button>
      </div>
      <Suspense
        fallback={
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <PinsView
          dtos={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
        />
      </Suspense>
    </div>
  );
}
