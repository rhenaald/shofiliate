import * as XLSX from "xlsx";

import type { PinDTO } from "@/features/pins/types";

export function exportPinsToExcel(
  rows: PinDTO[],
  filenamePrefix = "pins-terpilih",
) {
  if (!rows || rows.length === 0) return;

  const data = rows.map((row, idx) => ({
    "No": idx + 1,
    "Nama Produk": row.name,
    "Toko": row.shopName,
    "Kategori": row.category,
    "Region": row.region,
    "Komisi Xtra (%)":
      row.komisiXtraRate != null ? `${row.komisiXtraRate}%` : "-",
    "Komisi Live":
      row.commissionLiveAmount != null ? row.commissionLiveAmount : "-",
    "Komisi Video":
      row.commissionVideoAmount != null ? row.commissionVideoAmount : "-",
    "Komisi Social":
      row.commissionSocialAmount != null ? row.commissionSocialAmount : "-",
    "Total Terjual": row.totalSales,
    "Penjualan 1 Hari": row.sales1d,
    "Penjualan 7 Hari": row.sales7d,
    "Penjualan 30 Hari": row.sales30d,
    "Growth 30 Hari (%)":
      row.growth30d != null ? `${row.growth30d}%` : "-",
    "GMV 30 Hari": row.gmv30d,
    "Mata Uang": row.currency,
    "Tanggal Listing": row.listedOn ? row.listedOn.slice(0, 10) : "-",
    "Likes": row.likes,
    "Link Shopee": row.url,
    "Link Affiliate": row.affiliateUrl ?? "-",
    "Catatan": row.note ?? "-",
    "Pemin": row.pinnedBy.username
      ? `${row.pinnedBy.name} (@${row.pinnedBy.username})`
      : row.pinnedBy.name,
    "Dipin Pada": row.pinnedAt.slice(0, 10),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths based on content
  const colKeys = Object.keys(data[0] || {}) as (keyof (typeof data)[0])[];
  worksheet["!cols"] = colKeys.map((key) => {
    const headerLen = String(key).length;
    let maxValLen = 0;
    for (const item of data) {
      const len = String(item[key] ?? "").length;
      if (len > maxValLen) maxValLen = len;
    }
    return { wch: Math.min(Math.max(headerLen, maxValLen) + 3, 50) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pins");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStr}.xlsx`);
}
