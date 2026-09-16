import scrapeData from "@/generated/Data-Scrape_05-09-2026_17-14.json";
import { ProductTable } from "@/features/products/components/product-table";
import { mapScrapeToProductRow, type ScrapeRow } from "@/features/products/types";

export function ProductsPage() {
  const rows = (scrapeData as unknown as ScrapeRow[])
    .map(mapScrapeToProductRow)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Products</h1>
        <p className="text-sm text-muted-foreground">UI preview from scrape fixture — real data lands in SH-6.</p>
      </div>
      <ProductTable data={rows} />
    </div>
  );
}
