"use client";

import { InfoIcon, SparklesIcon } from "lucide-react";
import * as React from "react";

interface CommissionBreakdownProps {
  currency?: string;
  commissionLiveRate?: number | string | null;
  commissionLiveAmount?: number | string | null;
  commissionSocialRate?: number | string | null;
  commissionSocialAmount?: number | string | null;
  commissionVideoRate?: number | string | null;
  commissionVideoAmount?: number | string | null;
  hasKomisiXtra?: boolean;
  komisiXtraRate?: number | string | null;
  komisiXtraAmount?: number | string | null;

  // Komisi XTRA per platform
  commissionLiveXtraRate?: number | string | null;
  commissionLiveXtraAmount?: number | string | null;
  commissionSocialXtraRate?: number | string | null;
  commissionSocialXtraAmount?: number | string | null;
  commissionVideoXtraRate?: number | string | null;
  commissionVideoXtraAmount?: number | string | null;

  // Komisi Shopee per platform
  commissionLiveShopeeRate?: number | string | null;
  commissionLiveShopeeAmount?: number | string | null;
  commissionSocialShopeeRate?: number | string | null;
  commissionSocialShopeeAmount?: number | string | null;
  commissionVideoShopeeRate?: number | string | null;
  commissionVideoShopeeAmount?: number | string | null;
}

export function CommissionBreakdownCard({
  currency = "IDR",
  commissionLiveRate,
  commissionLiveAmount,
  commissionSocialRate,
  commissionSocialAmount,
  commissionVideoRate,
  commissionVideoAmount,
  hasKomisiXtra = false,
  komisiXtraRate,
  komisiXtraAmount,

  commissionLiveXtraRate,
  commissionLiveXtraAmount,
  commissionSocialXtraRate,
  commissionSocialXtraAmount,
  commissionVideoXtraRate,
  commissionVideoXtraAmount,

  commissionLiveShopeeRate,
  commissionLiveShopeeAmount,
  commissionSocialShopeeRate,
  commissionSocialShopeeAmount,
  commissionVideoShopeeRate,
  commissionVideoShopeeAmount,
}: CommissionBreakdownProps) {
  const formatAmount = (val: unknown) => {
    if (val === null || val === undefined || val === "") return "-";
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return String(val);

    if (currency === "IDR") {
      return `Rp${num.toLocaleString("id-ID")}`;
    }
    if (currency === "MYR") {
      return `RM${num.toFixed(2)}`;
    }
    return `${currency} ${num.toFixed(2)}`;
  };

  const formatRate = (val: unknown) => {
    if (val === null || val === undefined || val === "") return "-";
    const str = String(val).trim().replace(",", ".");
    const num = parseFloat(str);
    if (isNaN(num)) return `${str}%`;
    return `${num.toLocaleString("id-ID")}%`;
  };

  // Shopee Live
  const liveXtraRateVal = commissionLiveXtraRate ?? komisiXtraRate ?? commissionLiveRate ?? null;
  const liveXtraAmtVal = commissionLiveXtraAmount ?? komisiXtraAmount ?? commissionLiveAmount ?? null;
  const liveShopeeRateVal = commissionLiveShopeeRate ?? 0;
  const liveShopeeAmtVal = commissionLiveShopeeAmount ?? 0;
  const liveEstAmtVal = commissionLiveAmount ?? liveXtraAmtVal;

  // Media Sosial
  const socialXtraRateVal = commissionSocialXtraRate ?? komisiXtraRate ?? commissionSocialRate ?? null;
  const socialXtraAmtVal = commissionSocialXtraAmount ?? komisiXtraAmount ?? commissionSocialAmount ?? null;
  const socialShopeeRateVal = commissionSocialShopeeRate ?? 0;
  const socialShopeeAmtVal = commissionSocialShopeeAmount ?? 0;
  const socialEstAmtVal = commissionSocialAmount ?? (
    socialXtraAmtVal !== null && typeof socialXtraAmtVal === "number" && typeof socialShopeeAmtVal === "number"
      ? socialXtraAmtVal + socialShopeeAmtVal
      : socialXtraAmtVal
  );

  // Shopee Video
  const videoXtraRateVal = commissionVideoXtraRate ?? komisiXtraRate ?? commissionVideoRate ?? null;
  const videoXtraAmtVal = commissionVideoXtraAmount ?? komisiXtraAmount ?? commissionVideoAmount ?? null;
  const videoShopeeRateVal = commissionVideoShopeeRate ?? 0;
  const videoShopeeAmtVal = commissionVideoShopeeAmount ?? 0;
  const videoEstAmtVal = commissionVideoAmount ?? videoXtraAmtVal;

  const rows = [
    {
      platform: "Shopee Live",
      badge: "Sering Digunakan",
      xtraText: `${formatRate(liveXtraRateVal)} (${formatAmount(liveXtraAmtVal)})`,
      shopeeText: `${formatRate(liveShopeeRateVal)} (${formatAmount(liveShopeeAmtVal)})`,
      estAmount: formatAmount(liveEstAmtVal),
    },
    {
      platform: "Media Sosial",
      badge: null,
      xtraText: `${formatRate(socialXtraRateVal)} (${formatAmount(socialXtraAmtVal)})`,
      shopeeText: `${formatRate(socialShopeeRateVal)} (${formatAmount(socialShopeeAmtVal)})`,
      estAmount: formatAmount(socialEstAmtVal),
    },
    {
      platform: "Shopee Video",
      badge: null,
      xtraText: `${formatRate(videoXtraRateVal)} (${formatAmount(videoXtraAmtVal)})`,
      shopeeText: `${formatRate(videoShopeeRateVal)} (${formatAmount(videoShopeeAmtVal)})`,
      estAmount: formatAmount(videoEstAmtVal),
    },
  ];

  return (
    <div className="w-full max-w-2xl rounded-xl border border-border/80 bg-card p-4 shadow-xs text-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
          <SparklesIcon className="size-4 text-orange-500" />
          <span>Rincian Komisi</span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          Mata Uang: {currency}
        </span>
      </div>

      {/* Table Sesuai Format Asli Shopee Affiliate */}
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/50">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-[11px] text-muted-foreground">
              <th className="py-2.5 px-3 font-medium">Jenis Platform</th>
              <th className="py-2.5 px-3 font-semibold">
                <span className="text-rose-600 dark:text-rose-400 font-black italic tracking-tighter">
                  KOMISI
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-black italic tracking-tight">
                  XTRA 🠹
                </span>
              </th>
              <th className="py-2.5 px-3 font-medium">Komisi Shopee</th>
              <th className="py-2.5 px-3 font-medium text-right text-orange-600 dark:text-orange-400">
                Estimasi Komisi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-foreground">{r.platform}</div>
                  {r.badge && (
                    <div className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                      <span>{r.badge}</span>
                      <InfoIcon className="size-2.5" />
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-foreground font-medium">
                  {r.xtraText}
                </td>
                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                  {r.shopeeText}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                  {r.estAmount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
