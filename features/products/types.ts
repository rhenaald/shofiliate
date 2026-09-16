export interface ScrapeRow {
  product_id?: string;
  product_name?: string;
  seller_name?: string;
  category?: string;
  total_sales?: string;
  product_url?: string;
}

export interface ProductRow {
  id: string;
  productName: string;
  category: string;
  price: null;
  shopName: string;
  xtraCommission: null;
  live: null;
  sosmed: null;
  video: null;
  rating: null;
  sold: number;
  stock: null;
  numAffiliate: null;
  productUrl: string;
}

export function mapScrapeToProductRow(row: ScrapeRow): ProductRow | null {
  if (!row.product_id || !row.product_name) return null;
  const sold = Number(row.total_sales);
  return {
    id: row.product_id,
    productName: row.product_name,
    category: row.category ?? "-",
    price: null,
    shopName: row.seller_name ?? "-",
    xtraCommission: null,
    live: null,
    sosmed: null,
    video: null,
    rating: null,
    sold: Number.isFinite(sold) ? sold : 0,
    stock: null,
    numAffiliate: null,
    productUrl: row.product_url ?? "",
  };
}
