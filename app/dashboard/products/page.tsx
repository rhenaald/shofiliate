import { ProductsPage } from "@/features/products/pages/products-page";
import { getTodayProgress } from "@/features/products/data/get-today-progress";
import { listProducts } from "@/features/products/data/list-products";
import { catalogParamsSchema } from "@/features/products/schemas";

interface ProductsRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsRoute({ searchParams }: ProductsRouteProps) {
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
  const [result, progress] = await Promise.all([
    listProducts(params),
    getTodayProgress(),
  ]);
  return <ProductsPage params={params} result={result} progress={progress} />;
}
