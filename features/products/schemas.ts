import { z } from "zod";

import type {
  ImportRowError,
  ParsedProductRow,
  RawImportRow,
  RegionCode,
} from "@/features/products/types";

export const REGIONS: RegionCode[] = ["MY", "SG", "ID", "TH", "PH", "VN"];

export const regionEnum = z.enum(["MY", "SG", "ID", "TH", "PH", "VN"]);

const REGION_DOMAIN_MAP: Record<string, RegionCode> = {
  "shopee.com.my": "MY",
  "shopee.sg": "SG",
  "shopee.co.id": "ID",
  "shopee.co.th": "TH",
  "shopee.ph": "PH",
  "shopee.vn": "VN",
};

const REGION_CURRENCY_MAP: Record<RegionCode, string> = {
  MY: "MYR",
  SG: "SGD",
  ID: "IDR",
  TH: "THB",
  PH: "PHP",
  VN: "VND",
};

export const rawImportRowSchema = z.object({
  product_id: z.union([z.string(), z.number()]),
  product_name: z.string().min(1, "Product name is required"),
  seller_name: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  listed_on: z.string().optional().nullable(),
  likes: z.union([z.string(), z.number()]).optional().nullable(),
  sales_1d: z.union([z.string(), z.number()]).optional().nullable(),
  sales_7d: z.union([z.string(), z.number()]).optional().nullable(),
  sales_30d: z.union([z.string(), z.number()]).optional().nullable(),
  growth_30d: z.union([z.string(), z.number()]).optional().nullable(),
  gmv_30d: z.union([z.string(), z.number()]).optional().nullable(),
  total_sales: z.union([z.string(), z.number()]).optional().nullable(),
  total_gmv: z.union([z.string(), z.number()]).optional().nullable(),
  product_url: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  commission_rate: z.union([z.string(), z.number()]).optional().nullable(),
  commission_amount: z.union([z.string(), z.number()]).optional().nullable(),
  commission_live_rate: z.union([z.string(), z.number()]).optional().nullable(),
  commission_live_amount: z.union([z.string(), z.number()]).optional().nullable(),
  commission_social_rate: z.union([z.string(), z.number()]).optional().nullable(),
  commission_social_amount: z.union([z.string(), z.number()]).optional().nullable(),
  commission_video_rate: z.union([z.string(), z.number()]).optional().nullable(),
  commission_video_amount: z.union([z.string(), z.number()]).optional().nullable(),
  has_komisi_xtra: z.union([z.boolean(), z.string()]).optional().nullable(),
  komisi_xtra_rate: z.union([z.string(), z.number()]).optional().nullable(),
  komisi_xtra_amount: z.union([z.string(), z.number()]).optional().nullable(),
  affiliate_link: z.string().optional().nullable(),
  affiliate_url: z.string().optional().nullable(),
  rating: z.union([z.string(), z.number()]).optional().nullable(),
  rating_star: z.union([z.string(), z.number()]).optional().nullable(),
  score: z.union([z.string(), z.number()]).optional().nullable(),
  product_rating: z.union([z.string(), z.number()]).optional().nullable(),
  shop_rating: z.union([z.string(), z.number()]).optional().nullable(),
}).refine((data) => !!(data.product_url || data.url), {
  message: "product_url or url is required",
  path: ["product_url"],
});

export function parseBooleanSafe(val: unknown): boolean {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  return false;
}

export function parseIntegerSafe(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.max(0, Math.floor(val));
  const str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") return 0;
  const cleaned = str.replace(/,/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export function parseFloatGrowth(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") return 0;
  const cleaned = str.replace(/%/g, "").replace(/\+/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseCurrencyAndAmount(
  val: unknown,
  fallbackRegion: RegionCode,
): { currency: string; amount: number } {
  const fallbackCurrency = REGION_CURRENCY_MAP[fallbackRegion] ?? "MYR";
  if (val === null || val === undefined) {
    return { currency: fallbackCurrency, amount: 0 };
  }
  if (typeof val === "number") {
    return { currency: fallbackCurrency, amount: isNaN(val) ? 0 : val };
  }

  const str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") {
    return { currency: fallbackCurrency, amount: 0 };
  }

  let detectedCurrency = fallbackCurrency;
  if (/^RM/i.test(str)) detectedCurrency = "MYR";
  else if (/^S\$/i.test(str)) detectedCurrency = "SGD";
  else if (/^Rp/i.test(str)) detectedCurrency = "IDR";
  else if (/^[฿]|THB/i.test(str)) detectedCurrency = "THB";
  else if (/^[₱]|PHP/i.test(str)) detectedCurrency = "PHP";
  else if (/^[₫]|VND/i.test(str)) detectedCurrency = "VND";
  else if (/^\$/i.test(str)) detectedCurrency = "SGD";

  const numPart = str
    .replace(/^(RM|S\$|Rp|THB|PHP|VND|[฿₱₫$])/i, "")
    .replace(/,/g, "")
    .trim();
  const amount = parseFloat(numPart);

  return {
    currency: detectedCurrency,
    amount: isNaN(amount) ? 0 : amount,
  };
}

export function parseCommissionRate(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") return null;
  const cleaned = str.replace(/%/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function parseCommissionAmount(
  val: unknown,
  fallbackRegion: RegionCode
): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") return null;
  const parsed = parseCurrencyAndAmount(str, fallbackRegion);
  return parsed.amount > 0 ? parsed.amount : null;
}

export function parseRatingSafe(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (isNaN(val)) return null;
    if (val <= 0) return null;
    if (val <= 5) return Math.round(val * 10) / 10;
    if (val <= 50) return Math.round((val / 10) * 10) / 10;
    if (val <= 100) return Math.round((val / 20) * 10) / 10;
    return 5;
  }
  const str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") return null;
  const match = str.replace(",", ".").match(/([0-5](?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (isNaN(num) || num <= 0) return null;
  return Math.min(5, Math.max(0, Math.round(num * 10) / 10));
}

export function detectRegionFromUrl(url: string): {
  region: RegionCode;
  needsRegion: boolean;
} {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    for (const [domain, reg] of Object.entries(REGION_DOMAIN_MAP)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return { region: reg, needsRegion: false };
      }
    }
  } catch {
    // If not a valid URL structure, fallback
  }
  return { region: "MY", needsRegion: true };
}

export function parseProductUrlAndId(
  url: string,
  productId: string,
): {
  shopId: string;
  itemId: string;
} {
  const matchProduct = url.match(/\/product\/(\d+)\/(\d+)/);
  const matchSlug = url.match(/-i\.(\d+)\.(\d+)/);
  const match = matchProduct || matchSlug;

  if (!match) {
    throw new Error(
      "Invalid product URL format: must match /product/{shopId}/{product_id} or -i.{shopId}.{product_id}"
    );
  }

  const shopId = match[1];
  const urlItemId = match[2];

  if (urlItemId !== productId) {
    throw new Error(`product_id mismatch: field is "${productId}" but URL contains "${urlItemId}"`);
  }

  return { shopId, itemId: urlItemId };
}

export function parseImportRow(
  raw: RawImportRow,
  rowNumber: number,
): { success: true; data: ParsedProductRow } | { success: false; error: ImportRowError } {
  // Validate product_id
  if (raw.product_id === undefined || raw.product_id === null || String(raw.product_id).trim() === "") {
    return {
      success: false,
      error: {
        row: rowNumber,
        field: "product_id",
        reason: "product_id is missing or empty",
      },
    };
  }

  const productIdStr = String(raw.product_id).trim();
  if (!/^\d+$/.test(productIdStr)) {
    return {
      success: false,
      error: {
        row: rowNumber,
        itemId: productIdStr,
        field: "product_id",
        reason: "product_id must contain only digits",
      },
    };
  }

  // Validate product_url (supports both product_url and url keys)
  const rawUrl = raw.product_url ?? raw.url;
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return {
      success: false,
      error: {
        row: rowNumber,
        itemId: productIdStr,
        field: "product_url",
        reason: "product_url is required",
      },
    };
  }

  const productUrl = rawUrl.trim();

  // Validate URL match and product_id match
  let shopId = "";
  let itemId = "";
  try {
    const parsed = parseProductUrlAndId(productUrl, productIdStr);
    shopId = parsed.shopId;
    itemId = parsed.itemId;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid product URL or ID mismatch";
    return {
      success: false,
      error: {
        row: rowNumber,
        itemId: productIdStr,
        field: "product_url",
        reason: message,
      },
    };
  }

  // Validate product_name
  const productName = raw.product_name ? String(raw.product_name).trim() : "";
  if (!productName) {
    return {
      success: false,
      error: {
        row: rowNumber,
        itemId: productIdStr,
        field: "product_name",
        reason: "product_name is required and cannot be empty",
      },
    };
  }

  // Parse Region & Currency
  const { region, needsRegion } = detectRegionFromUrl(productUrl);
  const { currency, amount: gmv30d } = parseCurrencyAndAmount(raw.gmv_30d, region);
  const { amount: totalGmv } = parseCurrencyAndAmount(raw.total_gmv, region);

  // Parse Date
  let listedOnDate: Date | null = null;
  if (raw.listed_on && raw.listed_on !== "-" && raw.listed_on !== "null") {
    const d = new Date(raw.listed_on);
    if (!isNaN(d.getTime())) {
      listedOnDate = d;
    }
  }

  // Parse Affiliate Link & Commission
  const rawAffiliateLink = raw.affiliate_link ?? raw.affiliate_url;
  const affiliateUrl =
    rawAffiliateLink && typeof rawAffiliateLink === "string" && rawAffiliateLink.trim()
      ? rawAffiliateLink.trim()
      : null;
  const commissionRate = parseCommissionRate(raw.commission_rate);
  const commissionAmount = parseCommissionAmount(raw.commission_amount, region);

  // Parse Multi-Channel Commissions (Live, Social, Video, Xtra)
  const commissionLiveRate =
    parseCommissionRate(raw.commission_live_rate) ?? commissionRate;
  const commissionLiveAmount =
    parseCommissionAmount(raw.commission_live_amount, region) ?? commissionAmount;

  const commissionSocialRate =
    parseCommissionRate(raw.commission_social_rate) ?? commissionLiveRate;
  const commissionSocialAmount =
    parseCommissionAmount(raw.commission_social_amount, region) ?? commissionLiveAmount;

  const commissionVideoRate =
    parseCommissionRate(raw.commission_video_rate) ?? commissionLiveRate;
  const commissionVideoAmount =
    parseCommissionAmount(raw.commission_video_amount, region) ?? commissionLiveAmount;

  const hasKomisiXtra =
    parseBooleanSafe(raw.has_komisi_xtra) ||
    !!(raw.komisi_xtra_rate || raw.komisi_xtra_amount);
  const komisiXtraRate = parseCommissionRate(raw.komisi_xtra_rate);
  const komisiXtraAmount = parseCommissionAmount(raw.komisi_xtra_amount, region);

  const rating = parseRatingSafe(
    raw.rating ??
    raw.rating_star ??
    raw.score ??
    raw.product_rating ??
    raw.shop_rating
  );

  const parsedRow: ParsedProductRow = {
    itemId,
    shopId,
    name: productName.slice(0, 500),
    url: productUrl,
    region,
    currency,
    shopName: raw.seller_name ? String(raw.seller_name).trim() : "",
    category: raw.category ? String(raw.category).trim() : "",
    listedOn: listedOnDate,
    needsRegion,
    likes: parseIntegerSafe(raw.likes),
    sales1d: parseIntegerSafe(raw.sales_1d),
    sales7d: parseIntegerSafe(raw.sales_7d),
    sales30d: parseIntegerSafe(raw.sales_30d),
    growth30d: parseFloatGrowth(raw.growth_30d),
    gmv30d,
    historicalSold: parseIntegerSafe(raw.total_sales),
    totalGmv,
    rating,
    commissionRate,
    commissionAmount,
    commissionLiveRate,
    commissionLiveAmount,
    commissionSocialRate,
    commissionSocialAmount,
    commissionVideoRate,
    commissionVideoAmount,
    hasKomisiXtra,
    komisiXtraRate,
    komisiXtraAmount,
    affiliateUrl,
  };

  return { success: true, data: parsedRow };
}
