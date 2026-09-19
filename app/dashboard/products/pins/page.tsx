import { getPinsProgress } from "@/features/pins/data/get-pins-progress";
import { listPins } from "@/features/pins/data/list-pins";
import { PinsPage } from "@/features/pins/pages/pins-page";
import { pinsParamsSchema } from "@/features/pins/schemas";

interface PinsRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PinsRoute({ searchParams }: PinsRouteProps) {
  const sp = await searchParams;
  // schemas.ts memakai .catch per field: param invalid jatuh ke default,
  // tidak pernah 500 karena URL diketik manual (AC-001).
  const params = pinsParamsSchema.parse({
    region: Array.isArray(sp.region) ? sp.region[0] : sp.region,
    q: Array.isArray(sp.q) ? sp.q[0] : sp.q,
    page: Array.isArray(sp.page) ? sp.page[0] : sp.page,
    pageSize: Array.isArray(sp.pageSize) ? sp.pageSize[0] : sp.pageSize,
    sort: Array.isArray(sp.sort) ? sp.sort[0] : sp.sort,
    dir: Array.isArray(sp.dir) ? sp.dir[0] : sp.dir,
  });
  const [result, progress] = await Promise.all([
    listPins(params),
    getPinsProgress(),
  ]);
  return <PinsPage params={params} result={result} progress={progress} />;
}
