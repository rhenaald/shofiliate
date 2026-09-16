"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * AffiliateSystemLanding
 *
 * Halaman landing satu layar + section scroll.
 * - Navbar: fixed, sembunyi saat scroll ke bawah (slide ke atas),
 *   muncul lagi saat scroll ke atas (slide masuk).
 * - Pola animasi: `translate-y` + `transition-transform` (GPU-friendly,
 *   bukan `display: none` agar transisi tetap jalan).
 * - Scroll handler: `requestAnimationFrame` throttle + threshold delta
 *   supaya tidak flicker, posisi di-clamp untuk iOS rubber-banding.
 *
 * Fonts (Google Fonts) — pasang di <head> document:
 *   Azeret Mono (400, 600) + Instrument Serif (italic)
 */

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const NAVBAR_HEIGHT_CLASS = "h-[60px]";
const SHOW_THRESHOLD_TOP_PX = 10;
const SCROLL_DELTA_PX = 5;
const HIDE_EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

const monoLabel =
  "font-['Azeret_Mono',monospace] uppercase tracking-[0.16em] text-[11px]";
const monoBody =
  "font-['Azeret_Mono',monospace] normal-case tracking-normal text-[12.5px] leading-[1.6]";
const monoData =
  "font-['Azeret_Mono',monospace] normal-case tracking-normal text-[10px]";
const serifDisplay = "font-['Instrument_Serif',serif] tracking-[-0.015em]";

const NAV_LINKS = [
  { label: "Registry", href: "#registry" },
  { label: "Workflows", href: "#workflows" },
  { label: "Audit Log", href: "#audit-log" },
] as const;

const REGISTRY_CARDS = [
  {
    index: "01",
    title: "SKU Registry",
    body: "Satu sumber kebenaran untuk seluruh katalog: varian, bundling, dan status listing.",
  },
  {
    index: "02",
    title: "Channel Sync",
    body: "Sinkronisasi multi-channel dengan retry otomatis dan jejak perubahan per kanal.",
  },
  {
    index: "03",
    title: "Data Clustering",
    body: "Pengelompokan produk stabil (v4) untuk katalog bervolume tinggi tanpa duplikasi.",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    index: "01",
    title: "Ingest",
    body: "Tarik produk dari semua kanal ke satu antrean operasional yang terdeduplikasi.",
  },
  {
    index: "02",
    title: "Orchestrate",
    body: "Aturan sinkronisasi berjalan deterministik: harga, stok, dan atribut selalu konsisten.",
  },
  {
    index: "03",
    title: "Audit",
    body: "Setiap mutasi tercatat dengan aktor, waktu, dan diff — siap diaudit kapan pun.",
  },
] as const;

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

type RevealFn = (delayClass?: string) => string;

interface LandingPageProps {
  loginHref?: string;
  onSupportClick?: () => void;
  className?: string;
}

interface NavbarProps {
  isVisible: boolean;
  isScrolled: boolean;
  onSupportClick?: () => void;
}

interface HeroContentProps {
  reveal: RevealFn;
  loginHref: string;
}

interface VisualSectionProps {
  reveal: RevealFn;
}

// ---------------------------------------------------------------------------
// Hook: sembunyikan navbar saat scroll bawah, tampilkan saat scroll atas
// ---------------------------------------------------------------------------

function useHideOnScrollNavbar() {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Tandai mounted di dalam rAF callback (bukan body effect) agar
  // tidak memicu `react-hooks/set-state-in-effect`.
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const update = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollY.current;

      setIsScrolled(currentScrollY > SHOW_THRESHOLD_TOP_PX);

      if (currentScrollY < SHOW_THRESHOLD_TOP_PX) {
        setIsNavbarVisible(true);
      } else if (delta > SCROLL_DELTA_PX) {
        setIsNavbarVisible(false); // scroll ke bawah -> sembunyi
      } else if (delta < -SCROLL_DELTA_PX) {
        setIsNavbarVisible(true); // scroll ke atas -> muncul
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    lastScrollY.current = Math.max(0, window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { isNavbarVisible, isScrolled, isMounted };
}

// ---------------------------------------------------------------------------
// Ikon & ilustrasi
// ---------------------------------------------------------------------------

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IsometricDiagram() {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="Kubus isometrik tunggal"
      className="h-full w-full scale-110 drop-shadow-[0_20px_40px_rgba(0,0,0,0.05)]"
    >
      {/* Satu kubus isometrik: T(200,110) UR(286.6,160) LR(286.6,260)
          B(200,310) LL(113.4,260) UL(113.4,160) C(200,210) */}
      <g strokeLinejoin="round">
        <path
          d="M200 110 L286.6 160 L286.6 260 L200 310 L113.4 260 L113.4 160 Z"
          className="fill-[#E7E3DA] stroke-[#1A1917] [stroke-width:1]"
        />
        <path
          d="M200 210 L200 310"
          className="fill-none stroke-[#1A1917] [stroke-width:0.8]"
        />
        <path
          d="M113.4 160 L200 210 L286.6 160"
          className="fill-none stroke-[#9B3418] [stroke-width:1.4]"
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Navbar (hide on scroll down / show on scroll up)
// ---------------------------------------------------------------------------

function Navbar({ isVisible, isScrolled, onSupportClick }: NavbarProps) {
  return (
    <header
      role="banner"
      className={[
        `fixed inset-x-0 top-0 z-50 ${NAVBAR_HEIGHT_CLASS} w-full`,
        "flex items-center justify-between px-6 md:px-10",
        "border-b border-[#1A1917]/[0.16] bg-[#E7E3DA]",
        `transition-transform duration-300 ${HIDE_EASE} motion-reduce:transition-none will-change-transform`,
        isVisible ? "translate-y-0" : "-translate-y-full",
        isScrolled
          ? "shadow-[0_12px_32px_-16px_rgba(26,25,23,0.35)]"
          : "shadow-none",
      ].join(" ")}
    >
      <a
        href="#top"
        aria-label="Affiliate.System — kembali ke atas"
        className={`${serifDisplay} text-[19px]`}
      >
        shofiliate<span className="text-[#9B3418]">.system</span>
      </a>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroContent({ reveal, loginHref }: HeroContentProps) {
  return (
    <div className="relative mt-10 z-10 flex h-full w-full flex-col justify-center border-b border-[#1A1917]/[0.16] bg-[#E7E3DA] px-6 py-14 md:w-[44%] md:border-b-0 md:border-r md:px-10 md:py-0 lg:px-24">
      <div className="max-w-[420px]">
        <span
          className={`${monoLabel} mb-8 block text-[#6E6A61] ${reveal("delay-100")}`}
        >
          [ Operational Interface ]
        </span>
        <h1
          className={`${serifDisplay} mb-10 text-[clamp(2rem,4.5vw,4rem)] italic leading-[0.96] ${reveal("delay-200")}`}
        >
          Reliable Web <span className="text-[#9B3418]">Scraping</span> for
          Modern E-Commerce.
        </h1>
        <p
          className={`${monoBody} mb-12 text-[#4A4741] ${reveal("delay-300")}`}
        >
          A sophisticated technical environment for high-velocity SKU management
          and multi-channel synchronization. Designed for the internal affiliate
          ops team.
        </p>
        <div className={`flex ${reveal("delay-500")}`}>
          <Link
            href={loginHref}
            className="flex items-center font-['Azeret_Mono',monospace] uppercase tracking-[0.16em] text-[11px] px-10 py-5 bg-[#1A1917] text-white transition-colors duration-300 hover:bg-[#333333]"
          >
            <span>ENTER SYSTEM</span>
            <ArrowRightIcon className="ml-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function VisualSection({ reveal }: VisualSectionProps) {
  return (
    <div className="relative pt-10 flex min-h-[320px] flex-1 items-center justify-center overflow-hidden bg-[#DCD7CB] md:min-h-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
      >
        <div className="absolute left-1/4 top-0 h-full w-px bg-[#1A1917]" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-[#1A1917]" />
        <div className="absolute left-0 top-1/3 h-px w-full bg-[#1A1917]" />
        <div className="absolute left-0 top-2/3 h-px w-full bg-[#1A1917]" />
      </div>

      <div
        className={`relative flex w-full max-w-[600px] items-center justify-center ${reveal("delay-200")}`}
      >
        <IsometricDiagram />
      </div>

      <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10">
        <p className={monoData}>ARCHITECT: OMA_GROUP</p>
        <p className={monoData}>INTERNAL PRIVILEGED ACCESS</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section scroll (memberi ruang agar animasi navbar terlihat)
// ---------------------------------------------------------------------------

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-[640px]">
      <p className={`${monoLabel} mb-6 block text-[#9B3418]`}>{eyebrow}</p>
      <h2
        className={`${serifDisplay} mb-6 text-[clamp(1.75rem,3vw,2.75rem)] italic leading-[1.02]`}
      >
        {title}
      </h2>
      <p className={`${monoBody} text-[#4A4741]`}>{body}</p>
    </div>
  );
}

function RegistrySection() {
  return (
    <section
      id="registry"
      aria-labelledby="registry-heading"
      className="scroll-mt-20 border-t border-[#1A1917]/[0.16] bg-[#E7E3DA] px-6 py-20 md:px-10 md:py-28"
    >
      <div id="registry-heading">
        <SectionHeading
          eyebrow="[ 01 — Registry ]"
          title="Satu registry untuk seluruh katalog."
          body="Setiap SKU tercatat sekali, tersinkron ke semua kanal, dan siap ditelusuri dari hulu ke hilir."
        />
      </div>
      <div className="mt-12 grid gap-px border border-[#1A1917]/[0.16] bg-[#1A1917]/[0.16] md:grid-cols-3">
        {REGISTRY_CARDS.map((card) => (
          <article key={card.index} className="bg-[#E7E3DA] p-8">
            <p className={`${monoData} mb-6 text-[#9B3418]`}>{card.index}</p>
            <h3 className={`${serifDisplay} mb-4 text-2xl italic`}>
              {card.title}
            </h3>
            <p className={`${monoBody} text-[#4A4741]`}>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkflowsSection() {
  return (
    <section
      id="workflows"
      aria-labelledby="workflows-heading"
      className="scroll-mt-20 border-t border-[#1A1917]/[0.16] bg-[#DCD7CB] px-6 py-20 md:px-10 md:py-28"
    >
      <div id="workflows-heading">
        <SectionHeading
          eyebrow="[ 02 — Workflows ]"
          title="Alur deterministik, tanpa tebakan."
          body="Tiga tahap yang selalu berjalan berurutan — scroll halaman ini untuk melihat navbar bersembunyi saat turun dan muncul lagi saat naik."
        />
      </div>
      <ol className="mt-12 divide-y divide-[#1A1917]/[0.16] border-y border-[#1A1917]/[0.16]">
        {WORKFLOW_STEPS.map((step) => (
          <li
            key={step.index}
            className="grid gap-2 py-8 md:grid-cols-[80px_220px_1fr] md:items-baseline md:gap-8"
          >
            <span className={`${monoData} text-[#9B3418]`}>{step.index}</span>
            <h3 className={`${serifDisplay} text-2xl italic`}>{step.title}</h3>
            <p className={`${monoBody} text-[#4A4741]`}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AuditSection({ loginHref }: { loginHref: string }) {
  return (
    <section
      id="audit-log"
      aria-labelledby="audit-heading"
      className="scroll-mt-20 border-t border-[#1A1917]/[0.16] bg-[#1A1917] px-6 py-20 text-[#E7E3DA] md:px-10 md:py-28"
    >
      <div id="audit-heading" className="max-w-[640px]">
        <p className={`${monoLabel} mb-6 block text-[#E7E3DA]/70`}>
          [ 03 — Audit Log ]
        </p>
        <h2
          className={`${serifDisplay} mb-6 text-[clamp(1.75rem,3vw,2.75rem)] italic leading-[1.02]`}
        >
          Setiap perubahan tercatat.
        </h2>
        <p className={`${monoBody} text-[#E7E3DA]/80`}>
          Aktor, waktu, dan diff terekam untuk setiap mutasi. Masuk ke sistem
          untuk menelusuri jejak audit lengkap.
        </p>
      </div>
      <div className="mt-12 flex flex-wrap items-center gap-6">
        <a
          href={loginHref}
          className="flex items-center font-['Azeret_Mono',monospace] uppercase tracking-[0.16em] text-[11px] px-10 py-5 bg-[#E7E3DA] text-[#1A1917] transition-colors duration-300 hover:bg-white"
        >
          <span>ENTER SYSTEM</span>
          <ArrowRightIcon className="ml-4" />
        </a>
        <p className={`${monoData} text-[#E7E3DA]/60`}>
          ENCRYPTED_CHANNEL // PRIVILEGED_ACCESS_ONLY
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex h-10 w-full shrink-0 items-center justify-between border-t border-[#1A1917]/[0.16] bg-[#E7E3DA] px-6 md:px-10">
      <div className="flex gap-8">
        <span className="font-['Azeret_Mono',monospace] uppercase tracking-widest text-[9px] text-[#6E6A61]">
          [ ENCRYPTED CHANNEL ]
        </span>
        <span className="font-['Azeret_Mono',monospace] uppercase tracking-widest text-[9px] text-[#9B3418]">
          [ SYSTEM_STABLE_88% ]
        </span>
      </div>
      <div className="font-['Azeret_Mono',monospace] uppercase tracking-widest text-[9px] text-[#6E6A61]">
        SYSTEM_ID // AFF_00X_ALPHA
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------------

export default function LandingPage({
  loginHref = "/sign-in",
  onSupportClick,
  className = "",
}: LandingPageProps) {
  const { isNavbarVisible, isScrolled, isMounted } = useHideOnScrollNavbar();

  const reveal: RevealFn = (delayClass = "") =>
    `transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${delayClass} ${
      isMounted ? "translate-y-0 opacity-100" : "translate-y-[22px] opacity-0"
    }`;

  return (
    <div
      id="top"
      className={`min-h-screen w-full bg-[#E7E3DA] text-[#1A1917] antialiased ${className}`}
    >
      <Navbar
        isVisible={isNavbarVisible}
        isScrolled={isScrolled}
        onSupportClick={onSupportClick}
      />

      <main className="pt-[60px]">
        <section
          aria-label="Hero"
          className="flex min-h-[calc(100svh-100px)] flex-col md:flex-row"
        >
          <HeroContent reveal={reveal} loginHref={loginHref} />
          <VisualSection reveal={reveal} />
        </section>

        {/*<RegistrySection />
        <WorkflowsSection />*/}
        <AuditSection loginHref={loginHref} />
      </main>

      <Footer />
    </div>
  );
}
