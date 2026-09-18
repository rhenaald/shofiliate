import type { Metadata } from "next";

import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toast";

import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const fontSans = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Shope Affiliate HUB",
  description: "Shope Affiliate HUB - Application for managing Shope affiliate products",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
