// Helper URL pins: normalisasi default agar URL shareable tetap ringkas
// (region=MY, q="", page=1, pageSize=25, sort kosong, dir=desc
// tidak ditulis ke URL).
export type PinsUrlKey = "region" | "q" | "page" | "pageSize" | "sort" | "dir";

const DEFAULTS: Record<PinsUrlKey, string> = {
  region: "MY",
  q: "",
  page: "1",
  pageSize: "25",
  sort: "",
  dir: "desc",
};

export function pinsHref(
  pathname: string,
  current: URLSearchParams,
  updates: Partial<Record<PinsUrlKey, string | null>>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates) as Array<
    [PinsUrlKey, string | null]
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
