import { catalogParamsSchema } from "@/features/catalog/schemas";
import { CatalogTableStream } from "@/features/catalog/pages/catalog-results";

interface CatalogRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CatalogRoute({ searchParams }: CatalogRouteProps) {
  const sp = await searchParams;
  // schemas.ts memakai .catch per field: param invalid jatuh ke default,
  // tidak pernah 500 karena URL diketik manual.
  const params = catalogParamsSchema.parse({
    view: Array.isArray(sp.view) ? sp.view[0] : sp.view,
    region: Array.isArray(sp.region) ? sp.region[0] : sp.region,
    q: Array.isArray(sp.q) ? sp.q[0] : sp.q,
    page: Array.isArray(sp.page) ? sp.page[0] : sp.page,
    pageSize: Array.isArray(sp.pageSize) ? sp.pageSize[0] : sp.pageSize,
    sort: Array.isArray(sp.sort) ? sp.sort[0] : sp.sort,
    dir: Array.isArray(sp.dir) ? sp.dir[0] : sp.dir,
  });
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
        </div>
      </div>
      <CatalogTableStream params={params} />
    </div>
  );
}
