// Helper URL katalog: normalisasi default agar URL shareable tetap ringkas
// (view=all, region=MY, q="", page=1, pageSize=25 tidak ditulis ke URL).
export type CatalogUrlKey = "view" | "region" | "q" | "page" | "pageSize" | "sort" | "dir";

const DEFAULTS: Record<CatalogUrlKey, string> = {
  view: "all",
  region: "MY",
  q: "",
  page: "1",
  pageSize: "25",
  sort: "",
  dir: "desc",
};

export function catalogHref(
  pathname: string,
  current: URLSearchParams,
  updates: Partial<Record<CatalogUrlKey, string | null>>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates) as Array<
    [CatalogUrlKey, string | null]
  >) {
    if (value === null || value === "" || value === DEFAULTS[key]) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
