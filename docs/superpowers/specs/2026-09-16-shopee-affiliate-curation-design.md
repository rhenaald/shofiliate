# PRD / Design — Sistem Kurasi Produk Shopee Affiliate untuk Live Streamer

- Status: Draft revisi v4 Phase 2 untuk review user (hasil revisi 2026-09-19: staging import + kurasi parametrik)
- Tanggal: 2026-09-19 (revisi v4: staging single-jsonb per file, tabel staging full + seleksi, enrich batch-paralel single-writer, filter parametrik + sortir baru, tabel unified, akun Shopee + edit + copy link, tools page placeholder)
- Sumber riset: Exa (domain & metrik Shopee 6 negara, definisi sold vs historicalSold; pola Open API productOfferV2 + generateShortLink + rate-limit backoff), Context7 (Prisma `/prisma/web` Json whole-replace, TanStack Table `/tanstack/table` manual pagination + getSelectedRowIds), Sequential-thinking (outline Phase 2)
- Keputusan clarifier user (2026-09-16):
  - Target 300 = **harian per streamer**
  - Best Seller vs Trending = **Best = total sold, Trending = velocity**
  - Import scraping = **upload CSV/JSON dari web extension**
  - Pin/favorit = **shared tim**
- Revisi user 2026-09-16 (wajib):
  - R1: Struktur data scraping mengikuti contoh aktual (snake_case, lihat §6 F1).
  - R2: Best Seller & Trending **bukan page baru, melainkan filter** dalam satu katalog. **Pinned products tetap page berbeda** (`/dashboard/products/pins`) — revisi susulan.
  - R3: Tampilan data memakai **TanStack DataTable v9 + style shadcn** (detail kolom di §9).
  - R4: Dokumen dirapikan dengan **skill linear-tracking** agar siap dipakai di Linear (§13).
- Keputusan clarifier user (2026-09-19, Phase 2):
  - Komisi: optimasi = **batch + concurrency paralel + retry** via Companion Extension (tetap, tanpa Open API server-side di Phase 2).
  - Velocity = **`sales_30d / 30`** (harian); umur produk = **hari sejak `listed_on`** sebagai number input (bukan bucket).
  - Staging = **satu baris DB per file, kolom `rows JSONB`** (`ImportStagingFile`); multi-file = banyak file ter-append di view. Enrich memakai **single-writer serial** (merge di memori, tulis balik batched/final) karena nilai `jsonb` immutable (full-replace per UPDATE).
  - Tools page = **static placeholder**, konten menyusul. Edit produk default = semua field non-metrik (nama, kategori, akun Shopee, region, URL); metrik tetap hanya via import.

---

## 1. Ringkasan eksekutif

Client adalah perusahaan yang menaungi affiliate live streamer produk Shopee. Streamer wajib mendaftarkan **minimum 300 produk potensial per hari per streamer** sebagai bahan live.

Masalah saat ini: pencarian produk manual setiap hari, evaluasi Best Seller & Trending manual, kategorisasi region manual (Malaysia utama + SG, ID, TH, PH, VN), pengelolaan berbasis tabel tanpa otomasi.

Solusi yang diusulkan: modul kurasi produk di dalam repo ini (`shofiliate`) dengan alur **upload hasil scraping (CSV/JSON) → parsing format aktual extension → deduplikasi & auto-deteksi region → snapshot harian (batch, tidak real-time) → satu katalog dengan filter Best Seller / Trending + page Pin bersama terpisah → input manual sebagai pelengkap**, plus tracker progres 300/hari. Semua dibangun mengikuti struktur `features/` dan tech stack yang sudah ada (tidak menambah framework baru di MVP).

## 2. Konteks, persona, perilaku

**Persona utama:** affiliate live streamer (user harian). **Persona sekunder:** admin/lead tim (monitoring target & kualitas katalog).

**Perilaku saat ini:**

1. Scraping via web extension di website Shopee untuk dapat daftar produk.
2. Riset manual setiap hari untuk penuhi 300 produk.
3. Manajemen lama berbasis tabel (table-based management) — sudah familiar dengan pola tabel, filter, sort.

**Pain points (dari user):**

1. Pencarian produk masih manual untuk penuhi target 300.
2. Evaluasi _Produk Best Seller_ dan _Produk Trending_ manual.
3. Kategorisasi region produk manual.

## 3. Tujuan & success criteria

**Tujuan:**

1. Otomatiskan pendaftaran hasil scraping ke database (tidak copy-paste satu per satu).
2. Sediakan view _Best Seller_ dan _Trending_ yang konsisten, berbasis snapshot (tidak real-time).
3. Evaluasi produk bisa difilter per region (default Malaysia).
4. Sediakan daftar pin/favorit bersama untuk persiapan live.
5. Tetap dukung input manual.

**Success criteria (MVP, terukur):**

- SC1: Import 300+ baris CSV/JSON format aktual (§6 F1) selesai < 30 detik dengan laporan sukses/duplikat/gagal per baris.
- SC2: Streamer bisa melihat progres "X/300 hari ini" secara real-time dari data yang sudah masuk.
- SC3: Filter Best Seller & Trending dalam satu katalog menampilkan ranking yang dapat direproduksi dari snapshot yang sama (ada label "data per tanggal X").
- SC4: Filter region 6 negara bekerja; default MY; produk tanpa region jelas masuk karantina untuk dikoreksi manual, bukan hilang diam-diam.
- SC5: Pin bersama di page Pins bisa tambah (dari katalog) /hapus/edit note dengan audit (siapa, kapan); tidak ada duplikat pin untuk produk yang sama di board yang sama.

## 4. Scope

**In scope (MVP):**

- F0 Auth & otorisasi (login, guard dashboard, peran streamer/admin).
- F1 Import CSV/JSON format aktual extension + validasi + deduplikasi.
- F2 Katalog produk + tracker target 300 harian per streamer.
- F3 Filter Best Seller (total_sales) + filter Trending (velocity sales_30d/growth_30d) dalam **satu page katalog** (bukan page terpisah — revisi R2), berbasis snapshot batch.
- F4 Filter & evaluasi per region (MY, SG, ID, TH, PH, VN).
- F5 Pin/favorit shared tim sebagai **page berbeda** (`/dashboard/products/pins` — revisi susulan), aksi pin/unpin dari tabel katalog.
- F6 Input manual single product + edit koreksi (khususnya region & atribut wajib).
- F7 Komisi affiliate 4 kanal (Xtra %, Live, Sosmed, Video nominal) & aksi affiliate link (copy + buka) pada katalog.

**Out of scope (ditunda):**

- Integrasi langsung extension → API (push otomatis); MVP hanya upload file.
- Auto-scrape server-side / scheduler scraping Shopee (risiko ToS + butuh proxy per negara).
- Laporan konversi detail, sub-ID custom tracking per sesi live.
- Deteksi kompetisi antar-affiliate (Shopee Open API tidak mengekspos field ini — temuan Exa).
- Multi-bahasa UI, aplikasi mobile, notifikasi real-time.

## 5. Catatan tech stack yang sudah terimplementasi (wajib dipertahankan)

> Bagian ini sesuai permintaan user untuk mencatat stack & pilihan desain yang sudah ada di repo.

**Core:**

- `next@16.3.5` App Router, `react@19.2.8`, `typescript@5`, `pnpm@11.17.0`.
- Scripts: `dev`, `build` (`prisma generate && next build`), `postinstall` (`prisma generate`), `db:push`, `db:migrate`, `db:generate`, `db:studio`.

**Data & auth:**

- `prisma@7.10.0` + `@prisma/client@7.10.0` + `@prisma/adapter-neon@7.10.0`, provider `postgresql`.
- Prisma Client output di `generated/prisma` (gitignored, diregenerasi via `db:generate`/`postinstall`). **Jangan import `@prisma/client` langsung** — via `lib/prisma.ts`.
- `lib/prisma.ts`: singleton (`globalThis`), `PrismaNeon({ connectionString: DATABASE_URL })`, diawali `import "server-only"`.
- `better-auth@1.7.4` + `@better-auth/prisma-adapter`: `emailAndPassword` (min 8, autoSignIn), plugin `username()`, `admin()`, `nextCookies()`. Schema sudah ada: `User`, `Session`, `Account`, `Verification` (dengan field admin `role/banned/banReason/banExpires`, `username/displayUsername`).
- `lib/auth.ts` server-only; `lib/auth-client.ts` client (`signIn/signUp/signOut/useSession` + `usernameClient/adminClient`).

**UI & state:**

- `tailwindcss@4` + `@tailwindcss/postcss`, `shadcn` style `base-nova`, baseColor `neutral`, `rsc:true`, icon `lucide-react@1.45.0`, font `Poppins` (400/600/700/800/900, `--font-sans`) di `app/layout.tsx`.
- `components/ui/`: avatar, breadcrumb, button-group, button, collapsible, dropdown-menu, field, input, label, separator, sheet, sidebar, skeleton, table, toast (`Toaster` dipasang di root), tooltip (`TooltipProvider` di root).
- `@tanstack/react-query@5.102.8`: `QueryClientProvider` di `app/providers.tsx` (`"use client"`), `staleTime: 60_000`, pola SSR `makeQueryClient/getQueryClient`.
- `@tanstack/react-table@9.2.4` API baru: `components/data-table.tsx` generik (`tableFeatures`, `useTable`, `FlexRender`, fitur filter/sort/pagination/selection/visibility). Ini fondasi yang dipakai ulang untuk katalog/Best/Trending, bukan bikin tabel dari nol.
- `react-hook-form@7.88.0` + `@hookform/resolvers@5.9.1` + `zod@4.6.5` untuk form & validasi.
- `server-only@0.0.1`, `cn` (re-export dari paket `cn`), `dotenv`, `tw-animate-css`, `@base-ui/react`.

**Struktur & konvensi (dari `AGENTS.md` — mengikat untuk PRD ini):**

- `app/` hanya route caller, Server Component only. Tidak ada `"use client"` di bawah `app/` kecuali `api/` route handler. File route tidak berisi business logic/fetch/validasi — hanya memanggil komposisi di `features/<name>/pages/`.
- `features/<name>/`: `actions/` (server actions `"use server"`, mutasi saja) + `schemas.ts` (validasi zod di boundary actions) + `data/` (query server-only via `lib/prisma.ts`) + `pages/` (komposisi) + `components/` (+`shared/`) + `types.ts`.
- `actions/` & `data/` diawali `import "server-only"`, tidak diimport dari client component; props serializable.
- Shared UI lintas fitur di `components/ui/`; singleton di `lib/`; import selalu `@/` alias, tidak ada relative import lintas folder.
- Fitur yang ada: `features/auth/` (`schemas.ts`, `components/`, `pages/`), `features/landing/` (`landing-page.tsx`). Route: `app/(auth)/`, `app/dashboard/` (`layout.tsx` pakai `SidebarLayout`, `page.tsx` masih placeholder `Halaman Utama`), `app/api/auth/`, `app/page.tsx`, `app/providers.tsx`.

## 6. Kebutuhan fungsional

### F0 — Auth & otorisasi (ditambahkan 2026-09-16)

- Status existing: better-auth terkonfigurasi (`emailAndPassword` min 8 + autoSignIn, plugin `username()`, `admin()`, `nextCookies()`, Prisma adapter); `features/auth/` sudah ada (`schemas.ts`, `components/`, `pages/sign-in-pages.tsx`); rute `app/(auth)/sign-in/` ada. Yang belum: route guard, peran default, enforcement session di fitur products. Tidak ada `middleware.ts` di repo.
- Login: username atau email + password. Semua tetap di `features/auth/` mengikuti AGENTS.md (tidak ada logika auth di `app/`).
- Guard: `middleware.ts` melindungi `/dashboard/**` (termasuk `/products`, `/pins`, `/import`) → redirect ke sign-in bila tanpa session.
- Peran (sistem hanya `user`/`admin`, tanpa role `streamer` eksplisit — koreksi 2026-09-16):
  - `user` (default saat sign-up; mencakup live streamer): progres 300 milik sendiri, pin shared, koreksi region produk milik sendiri.
  - `admin` (via admin plugin): koreksi region produk siapa pun (tercatat di audit), lihat progres semua user.
- Enforcement: semua `data/`/`actions/` products wajib baca session server-side; `addedBy/importedBy/pinnedBy` dari session, tidak dari client. Ini menjawab open question §14.1: ya, admin boleh mengoreksi, tercatat.

### F1 — Import hasil scraping (CSV/JSON, format aktual)

- **Sumber:** web extension milik user. Contoh aktual (2 baris, dipersingkat):

```json
[
  {
    "product_id": "12991894555",
    "product_name": "[COSRX OFFICIAL] The RX Derm serums...",
    "seller_name": "COSRX Official Store",
    "category": "Beauty-Skincare-Facial Serum & Essence",
    "listed_on": "2022-05-13",
    "likes": "9705",
    "sales_1d": "-",
    "sales_7d": "-",
    "sales_30d": "322",
    "growth_30d": "+1.89%",
    "gmv_30d": "RM23898.84",
    "total_sales": "30000",
    "total_gmv": "RM23898.84",
    "product_url": "https://shopee.com.my/product/133117728/12991894555"
  },
  {
    "product_id": "21192726313",
    "product_name": "COSRX The Vitamin C 13 Serum 20ml",
    "seller_name": "GLAMPICK x COSRX Store",
    "category": "Beauty-Skincare-Facial Serum & Essence",
    "listed_on": "2023-09-04",
    "likes": "290",
    "sales_1d": "1",
    "sales_7d": "4",
    "sales_30d": "19",
    "growth_30d": "-43.75%",
    "gmv_30d": "RM1214.10",
    "total_sales": "1000",
    "total_gmv": "RM1214.10",
    "product_url": "https://shopee.com.my/product/1060326459/21192726313"
  }
]
```

- **Mapping wajib (extension → sistem):**

| Extension                                         | Sistem                                 | Aturan parsing                                                                                                                                                                                  |
| ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product_id`                                      | `Product.itemId`                       | string digit, wajib                                                                                                                                                                             |
| `product_url` `.../product/{shopId}/{product_id}` | `Product.shopId` + `Product.url`       | regex `/product\/(\d+)\/(\d+)/`; validasi `product_id` di URL == field `product_id`; jika mismatch → failed                                                                                     |
| domain URL                                        | `Product.region`                       | `shopee.com.my→MY`, `shopee.sg→SG`, `shopee.co.id→ID`, `shopee.co.th→TH`, `shopee.ph→PH`, `shopee.vn→VN`; tak terdeteksi → `needsRegion=true` (karantina)                                       |
| `product_name`                                    | `Product.name`                         | trim, wajib non-empty, maks 500 char                                                                                                                                                            |
| `seller_name`                                     | `Product.shopName`                     | opsional                                                                                                                                                                                        |
| `category`                                        | `Product.category`                     | string hierarki `-` dipisah, disimpan apa adanya                                                                                                                                                |
| `listed_on`                                       | `Product.listedOn`                     | `YYYY-MM-DD`; invalid → null + warning                                                                                                                                                          |
| `likes`                                           | snapshot `likedCount`                  | `"-"` → null; selain itu int ≥ 0                                                                                                                                                                |
| `sales_1d/7d/30d`                                 | snapshot `sales1d/sales7d/sales30d`    | `"-"` → null; int ≥ 0                                                                                                                                                                           |
| `growth_30d`                                      | snapshot `growth30d`                   | `"+1.89%"` → `1.89`, `"-43.75%"` → `-43.75`; `"-"` → null                                                                                                                                       |
| `gmv_30d/total_gmv`                               | snapshot `gmv30d` + `Product.currency` | `"RM23898.84"` → amount `23898.84` + currency dari simbol (`RM→MYR`, `S$→SGD`, `Rp→IDR`, `฿→THB`, `₱→PHP`, `₫→VND`); simbol tak dikenal → currency dari region, amount tetap disimpan + warning |
| `total_sales`                                     | snapshot `historicalSold`              | int ≥ 0; ini dasar Best Seller                                                                                                                                                                  |
| `product_url`                                     | `Product.url`                          | wajib URL Shopee valid                                                                                                                                                                          |

- **Perilaku:**
  - Header CSV boleh snake_case persis seperti contoh atau JSON array of objects; tidak perlu mapping manual di MVP (format dikunci ke contoh ini). Jika header berbeda → tolak dengan pesan "format tidak dikenali, gunakan export extension v1".
  - Preview 10 baris pertama + hitung nilai `"-"` per kolom sebelum simpan.
  - Deduplikasi pada `(region, itemId, shopId)`; duplikat dalam file/DB → update snapshot baru, bukan produk baru (tidak menambah counter 300 — lihat F2).
  - Output: `imported/updated/duplicates/failed` + tabel error per baris (baris, field, alasan) yang bisa diunduh.
  - Setiap import menciptakan `ImportBatch` (siapa, kapan, nama file, jumlah) untuk audit + stempel "Data per" di katalog.
- **Validasi:** skema zod `importRowSchema` di `features/products/schemas.ts` di boundary `actions/`; contoh: `product_id` regex `^\d+$`, `product_url` harus match pola Shopee, `sales_*` coerce `"-"`→null.

### F2 — Katalog + target 300 harian per streamer

- Definisi "terdaftar": produk unik `(region,itemId,shopId)` yang dibuat oleh user pada hari kalender tersebut (zona waktu Asia/Kuala_Lumpur default, konfigurabel) melalui import atau input manual, dikurangi duplikat.
- Dashboard menampilkan: progress bar `X/300`, sisa kebutuhan, status tercapai/belum, riwayat 7/30 hari.
- Aturan anti-gaming v1: update snapshot produk yang sudah ada di hari yang sama **tidak** menambah counter; produk yang sama didaftarkan dua streamer berbeda tetap dihitung per streamer masing-masing (kepemilikan via `addedBy`), tapi katalog global tetap satu entitas + relasi kontributor.
- Tabel katalog: satu tabel utama (§9) + TanStack Query; sort/filter/pagination server-side untuk skala ribuan baris.

### F3 — Filter Best Seller (snapshot, tidak real-time; bukan page)

- Revisi R2: **Best Seller adalah nilai filter `view=best` pada page katalog**, bukan rute tersendiri.
- Definisi MVP: ranking by **`total_sales` (historical all-time) tertinggi** pada snapshot terakhir per region (atau global dengan kolom region).
- Interaksi: segmented control `Semua | Best Seller | Trending`; saat `Best` aktif → tabel auto-sort `total_sales` desc + tampilkan badge "Best"; stempel `Data per: YYYY-MM-DD HH:mm (batch #id)` tetap di atas tabel + tombol "Lihat metodologi".
- Tidak ada klaim real-time di UI.

### F4 — Filter Trending (velocity, snapshot; bukan page)

- Revisi R2: **Trending adalah nilai filter `view=trending` pada page katalog**, bukan rute tersendiri.
- Definisi MVP: ranking by velocity dari field aktual: prioritas `sales_30d` desc, tie-breaker `growth_30d` desc; jika ada ≥2 snapshot ≥7 hari untuk produk yang sama: `velocity7d = (sales30d_terbaru − sales30d_7hari_lalu)/7` sebagai info tambahan (bukan pengganti sort utama di MVP agar konsisten dengan data extension).
- Syarat masuk trending: `sales_30d ≥ 10` (ganti threshold rating karena data aktual tidak membawa rating; jika nanti ada `ratingCount` → tambah syarat `≥10`). Baris dengan `sales_30d = null` tidak muncul di view Trending.
- Label jelas per baris: `"+1.89% / 322 terjual 30d"` dari field `growth_30d` + `sales_30d`, bukan sekadar "Trending".

### F5 — Region

- Enum: `MY | SG | ID | TH | PH | VN`. Default filter = `MY` (utama). Filter region berupa dropdown/badge di toolbar tabel yang sama (bukan page).
- Mata uang mengikuti simbol GMV (`RM→MYR`, dst., lihat F1); tidak ada konversi kurs di MVP. Perbandingan lintas region hanya untuk sold/growth, bukan GMV nominal.
- Evaluasi per region: ringkasan angka di atas tabel (jumlah produk, median `sales_30d`, top-1 `total_sales`) — cukup angka + tabel di MVP, belum perlu chart library baru.

### F6 — Pin / favorit shared tim (page berbeda)

- Revisi susulan: pins adalah **page tersendiri** `app/dashboard/products/pins/page.tsx → features/products/pages/pins-page.tsx`, bukan sekadar toggle di katalog.
- Satu board bersama default (`Team Board`); pin = relasi `(productId, pinnedBy, note?, createdAt)`.
- Satu produk hanya satu pin aktif di board yang sama (idempoten); unpin tercatat (soft delete + audit).
- Kolom `note` opsional untuk konteks live ("cocok untuk opening", "stok menipis").
- Aksi pin/unpin tetap ada sebagai **kolom aksi di DataTable katalog** (optimistic update via TanStack Query); page Pins menampilkan hasil pin dengan kolom tambahan `note`, `pinnedBy`, `pinnedAt` + aksi unpin/edit note + filter region/search yang sama.

### F7 — Input manual

- Form single product (RHF + zod) mengikuti field aktual: `product_url` (wajib, untuk parse `shopId`+`region`), `product_name`, `seller_name`, `category`, `listed_on`, `likes`, `sales_1d/7d/30d`, `growth_30d`, `gmv_30d`, `total_sales`, `total_gmv`. Nilai `"-"` diizinkan di form dan diparse jadi null.
- Jika URL tidak match `/product/(\d+)/(\d+)/` → tolak dengan pesan jelas (minta URL produk Shopee yang valid), tidak generate ID lokal (keputusan revisi: cegah duplikat liar).
- Edit hanya untuk field korektif (region, nama, seller, kategori, listed_on); metrik sold/likes/growth/GMV hanya berubah via import snapshot berikutnya (tidak bisa diedit manual untuk jaga integritas ranking).
- **Tambahan Phase 2 (rev 12–14):** field `shopeeAccount` (string bebas, nama akun Shopee pemilik/entri produk) di form manual + kolom katalog (toggle visibility); edit produk diperluas ke semua field non-metrik (nama, seller, kategori, listed_on, region, URL, akun Shopee, note) via dialog edit + audit; aksi copy link ganda (copy product URL + copy affiliate link, dengan fallback clipboard + toast).

### F8 — Import staging single-jsonb per file + seleksi + multi-file (baru Phase 2, rev 2/3/7/9)

- **Model:** `ImportStagingFile` — satu baris DB per file upload (`userId, fileName, rows JSONB [RawImportRow + hasil enrichment], rowCount, enrichedCount, status=staged|enriched|saved|expired, expiresAt +7 hari`). Keputusan 2026-09-19: single jsonb per file (bukan per-row).
- **Konsekuensi jsonb immutable:** nilai `rows` hanya berubah via full-replace `UPDATE`. Enrichment memakai **single-writer serial**: worker paralel boleh fetch/scoring konkuren, tapi merge + tulis balik dilakukan satu penulis berurutan (batch tiap N produk mis. 20, plus tulis final). Dilarang multi-writer read-modify-write konkuren ke file yang sama (lost update).
- **Alur:** upload file 1 → staging file 1 → boleh upload file 2/3 tanpa kehilangan (append sebagai file baru); view staging = union semua file aktif user dengan pagination (mis. 25/baris, server-side via query `rows` di app atau paginasi client untuk <2k baris).
- **Tabel staging full (rev 1/2/10):** semua baris hasil baca (bukan 10 preview), kolom unified rev 10: nama produk (+seller), kategori, komisi % (live/video/sosmed + badge XTRA), estimasi komisi nominal (live/sosmed/video), penjualan harian (`sales_1d`), mingguan (`sales_7d`), bulanan (`sales_30d`), growth 30d, link komisi affiliate, checkbox seleksi, status validasi per baris.
- **Seleksi (rev 3):** checkbox per baris + select-all per halaman + "pilih semua hasil filter"; aksi `Masukkan semua ke DB` vs `Masukkan yang dicentang`; hanya baris valid yang bisa dipilih; duplikat dalam staging ditandai (bukan error).
- **Unduh ulang (rev 9):** staging yang belum disimpan bisa diunduh (JSON/CSV) lengkap dengan kolom enrichment (komisi 3 kanal + affiliate link); unduh per file atau gabungan.

### F9 — Optimasi enrich komisi via extension (Phase 2, rev 4)

- Tetap via Companion Extension (postMessage `ENRICH_PRODUCTS`); optimasi = **batching** (kirim batch mis. 10–20 produk per pesan), **concurrency** (2–4 batch paralel + jitter), **retry/backoff** per batch gagal (maks 3x) + timeout dinamis yang sudah ada, progress per batch (completed/total/currentProduct) + tombol "Lengkapi Komisi & Link" + scrape per baris ("Cari").
- Single-writer DB (lihat F8) + enrichment state di memori dulu; tulis balik ke `rows` JSONB secara batched agar tidak rewrite per produk.
- Gagal enrich tidak memblokir staging: baris tetap tersimpan mentah + penanda "belum enriched", bisa di-retry selektif.

### F10 — Tools page statis (Phase 2, rev 8)

- Rute `app/dashboard/tools/page.tsx → features/tools/pages/tools-page.tsx` (Server Component caller + komposisi client). Daftar tools statis (placeholder, konten menyusul): Import, Kalkulator komisi, Link generator, dsb. — cukup kartu + link internal/eksternal + empty state. Tidak ada logika bisnis di `app/`.

```
// Best Seller (view=best, snapshot S terbaru, per region)
rank_best = sort_desc(total_sales)
// contoh aktual: 30000 (COSRX RX Derm) > 1000 (COSRX Vit C 13)

// Trending v1 (view=trending, snapshot S terbaru)
syarat: sales_30d != null AND sales_30d >= 10
rank_trend = sort_desc(sales_30d, growth_30d)
// contoh aktual: 322 (+1.89%) > 19 (-43.75%)
// info tambahan bila ada 2 snapshot ≥7 hari:
//   velocity7d = (sales30d_S1 - sales30d_S0) / 7
```

Catatan: `sales_30d` = penjualan 30 hari (velocity), `total_sales` = total all-time (best). `growth_30d` dari extension dipakai apa adanya untuk label, bukan dihitung ulang. Pembedaan ini selaras temuan Exa (`sold` vs `historical_sold`).

**Phase 2 (keputusan 2026-09-19):**

```
// Velocity harian (sortir + kolom info)
velocity_daily = sales_30d / 30
// contoh: 322 → 10.73/hari; 19 → 0.63/hari; "-"→null (tidak ikut sortir velocity)

// Umur produk (filter parametrik, number input hari)
age_days = floor((today Asia/Kuala_Lumpur - listed_on) / 86400s)
// listed_on null → age null (tidak ikut filter umur bila filter aktif)
// contoh filter: age_days >= 30 (produk berumur min. 30 hari)

// Filter parametrik katalog + staging (AND semua aktif):
//   minSales1d/minSales7d/minSales30d (int ≥ 0, default off)
//   growthSign = all|positive|negative (growth_30d > 0 / < 0; nol ikut all)
//   minAgeDays/maxAgeDays (int ≥ 0, default off)

// Sortir baru (katalog + staging):
//   terbaru = listed_on desc (null terakhir)
//   velocity = velocity_daily desc
//   sales1d desc | sales30d desc | likes desc
```

## 8. Model data yang diusulkan (Prisma, format aktual, kompatibel schema existing)

Tidak mengubah model `User/Session/Account/Verification` yang ada. Tambahan baru diselaraskan ke field scraping aktual (§6 F1):

```prisma
enum Region { MY SG ID TH PH VN }

model Product {
  id            String   @id @default(cuid())
  region        Region
  itemId        String   // = product_id
  shopId        String   // diparse dari product_url /product/{shopId}/{product_id}
  name          String   // = product_name
  url           String   // = product_url
  currency      String   // dari simbol gmv (RM→MYR dst.), fallback region
  shopName      String?  // = seller_name
  shopeeAccount String?  // = nama akun Shopee pengentri/pemilik (rev 12, string bebas)
  category      String?  // = category ("Beauty-Skincare-...")
  listedOn      DateTime?
  isManual      Boolean  @default(false)
  needsRegion   Boolean  @default(false)
  addedById     String
  addedBy       User     @relation(fields: [addedById], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  snapshots     ProductSnapshot[]
  pins          Pin[]
  contributors  ProductContributor[]
  @@unique([region, itemId, shopId])
  @@index([region, createdAt])
}

model ProductSnapshot {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  batchId        String?
  batch          ImportBatch? @relation(fields: [batchId], references: [id])
  sales1d        Int?     // = sales_1d ("-"→null)
  sales7d        Int?     // = sales_7d
  sales30d       Int?     // = sales_30d (dasar Trending)
  growth30d      Float?   // = growth_30d ("+1.89%"→1.89)
  gmv30d         Decimal? // = gmv_30d (amount saja)
  historicalSold Int?     // = total_sales (dasar Best Seller)
  totalGmv       Decimal? // = total_gmv (amount saja)
  likedCount     Int?     // = likes
  scrapedAt      DateTime @default(now())
  createdAt      DateTime @default(now())
  @@index([productId, scrapedAt])
  @@index([sales30d, growth30d])
  @@index([historicalSold])
}

model ImportBatch {
  id        String   @id @default(cuid())
  importedById String
  fileName  String
  totalRows Int
  imported  Int      @default(0)
  updated   Int      @default(0)
  duplicates Int     @default(0)
  failed    Int      @default(0)
  createdAt DateTime @default(now())
  snapshots ProductSnapshot[]
}

model Pin {
  id        String    @id @default(cuid())
  productId String
  product   Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  pinnedById String
  note      String?
  createdAt DateTime  @default(now())
  unpinnedAt DateTime?
  @@index([createdAt])
  // uniqueness satu pin aktif per produk ditegakkan di service (partial unique), bukan @@unique([productId, unpinnedAt]) yang bocor untuk multi-unpin
}

model ProductContributor {
  productId String
  userId    String
  createdAt DateTime @default(now())
  @@id([productId, userId])
}

model DailyTarget {
  userId String
  date   DateTime // tanggal (Asia/Kuala_Lumpur, tanpa jam)
  count  Int      @default(0)
  @@id([userId, date])
}

// Phase 2 (keputusan 2026-09-19): satu baris per file upload, konten di JSONB.
model ImportStagingFile {
  id            String   @id @default(cuid())
  userId        String
  fileName      String
  rows          Json     // array RawImportRow + hasil enrichment (komisi 3 kanal + affiliate link)
  rowCount      Int      @default(0)
  enrichedCount Int      @default(0)
  status        String   @default("staged") // staged|enriched|saved|expired
  expiresAt     DateTime // createdAt + 7 hari (cleanup cron)
  createdAt     DateTime @default(now())
  @@index([userId, createdAt])
}
```

Catatan Context7: pola di atas memakai relasi standar Prisma + index untuk query ranking (`region + snapshot date`, `sales30d/growth30d`, `historicalSold`) dan dedup composite — tidak butuh fitur Prisma eksperimental. Contoh 2 baris COSRX di §6 menjadi 2 `Product` + masing-masing 1 `ProductSnapshot` pada 1 `ImportBatch`.

## 9. UX & arsitektur fitur (katalog + filter, Pins page terpisah, DataTable v9 + shadcn)

**Revisi R2/R3 — rute (semua RSC caller; Best/Trending = filter, Pins = page):**

- `app/dashboard/products/page.tsx` → `features/products/pages/products-page.tsx` — page katalog. Menerima `searchParams { view: 'all'|'best'|'trending', region, q, category }` dan fetch via `data/` di server.
- `app/dashboard/products/pins/page.tsx` → `features/products/pages/pins-page.tsx` — **page pin bersama terpisah** (revisi susulan). Menerima `searchParams { region, q }`, fetch via `data/listPins`.
- `app/dashboard/products/import/page.tsx` → `features/products/pages/import-page.tsx` (upload + preview 10 baris + hasil).
- `SidebarLayout` tambah menu: `Products`, `Pins`, `Import`. Tidak ada menu Best Sellers / Trending.
- Auth: `middleware.ts` (guard `/dashboard/**`), sign-in tetap `features/auth/pages/`. Semua `data/`/`actions/` products membaca session via `lib/auth.ts` (lihat F0).
- State filter katalog disimpan di URL (shareable, mis. `/dashboard/products?view=trending&region=MY`) — komponen toolbar (client) update via `router.replace`, tabel re-fetch via RSC + TanStack Query cache `staleTime 60s`. Toolbar katalog berisi link "Lihat Pins" menuju page pins (bukan toggle).

**Struktur fitur:**

```
features/products/
  schemas.ts        # importRowSchema (snake_case aktual + coerce "-"→null), manualProductSchema, pinSchema, regionEnum
  types.ts          # Region, View='all'|'best'|'trending', ProductDTO, SnapshotDTO, PinDTO, ImportResult
  data/             # listProducts({view,region,q,page,sort}), listPins({region,q}), getDailyProgress, getImportBatches (server-only via prisma)
  actions/          # importProducts, createManualProduct, togglePin, updateProductRegion (use server + zod boundary)
  components/       # products-toolbar (view segmented + region select + search), product-columns, pin-columns, import-uploader, import-preview, progress-card, pin-button
  pages/            # products-page, pins-page, import-page
```

**Tampilan tabel (revisi R3 — TanStack Table v9 + shadcn, perjelas):**

- Reuse `components/data-table.tsx` generik (`tableFeatures`, `useTable`, `FlexRender`) untuk **kedua page**; definisi kolom: `features/products/components/product-columns.tsx` (katalog) dan `pin-columns.tsx` (pins: kolom katalog inti + `note` + `pinnedBy` + `pinnedAt`, tanpa kolom pin-aksi melainkan unpin). Jangan fork DataTable.
- Kolom Katalog (revisi 2026-09-18, urutan kiri ke kanan):
  1. `select` (checkbox baris, sticky-left).
  2. `product_name` & `seller_name` (link ke `product_url`, 2-line clamp nama produk + seller_name kecil di bawahnya) — sortable text, left-align.
  3. `category` (text wrap, left-align).
  4. `komisiXtra` (Xtra (%)) — right-align numeric.
  5. `commissionLive` (Live nominal currency) — right-align numeric.
  6. `commissionSocial` (Sosmed nominal currency) — right-align numeric.
  7. `commissionVideo` (Video nominal currency) — right-align numeric.
  8. `likes` (jumlah likes) — right-align numeric, sortable.
  9. `total_sales` / `Sold` (total sales all-time) — right-align numeric, sortable, default sort saat `view=best`.
  10. `affiliate` (shadcn ButtonGroup icon-only: Salin link & Buka link dengan Tooltip; disabled jika link kosong) — non-sortable.
  11. `actions` (dropdown: Lihat di Shopee, Pin, Koreksi region).
- Kolom bawaan tersembunyi (default hidden, dapat dimunculkan via dropdown Columns):
  `pin`, `region`, `sales_30d` (highlight saat `view=trending`), `growth_30d`, `gmv_30d`, `listed_on`.
- Tabel dibungkus komponen shadcn `ScrollArea` dengan `ScrollBar` horizontal agar lebar tabel terkontainer tanpa overflow x layout.
- Toolbar katalog (shadcn): `Input` search (nama/seller, pakai `filterColumn` DataTable untuk client-filter + `q` server untuk dataset besar), `Select` region (default MY), segmented `Semua|Best Seller|Trending`, toggle `Perlu region`, tombol `Lihat Pins` (link ke `/dashboard/products/pins`) + `Import` + `Input manual`. Tidak ada toggle "Hanya pin" di katalog — pin dilihat di page Pins.
- Page Pins toolbar: `Input` search + `Select` region + info board ("Team Board, N pin aktif") + tombol kembali ke katalog.
- Header atas tabel katalog: `progress-card` (`X/300` + sisa) kiri, stempel batch kanan (`Data per: YYYY-MM-DD HH:mm batch #id` + `Lihat metodologi` via Tooltip). Page Pins tidak menampilkan progress 300 (fokus kurasi live).
- States: loading → `Skeleton` rows; kosong → `No results.` bawaan DataTable + CTA koreksi/import; error import per baris → tabel error + unduh CSV.
- Pagination + sorting + visibility + selection (bulk pin) dari fitur DataTable yang sudah ada (`rowPaginationFeature`, `rowSortingFeature`, `rowSelectionFeature`, `columnVisibilityFeature`); untuk >1.000 baris pakai pagination server-side, filter client hanya untuk page aktif.

**Aturan batas (tetap):**

- Client component tidak import `data/`/`actions/` langsung; data diambil di `pages/` (RSC) lalu props serializable ke `components/`.
- Mutasi via server actions + revalidate; list besar via TanStack Query.

**Phase 2 — tabel unified + staging + toolbar parametrik (rev 1/2/5/6/10):**

- Bentuk tabel tunggal untuk staging (`import-page` step staging) dan katalog (`Semua Produk`): kolom berurutan — `select` (staging wajib, katalog opsional bulk-pin) | nama produk (+seller kecil, link produk) | kategori | komisi % (live/video/sosmed + badge XTRA) | estimasi komisi nominal (live/sosmed/video) | penjualan harian `sales_1d` | mingguan `sales_7d` | bulanan `sales_30d` (+velocity info `x.x/hari`) | growth 30d (±% + warna) | link komisi affiliate (buka + copy) | aksi (staging: hapus baris + validasi; katalog: pin, edit, hapus, copy link). `likes`, `listed_on`, `umur hari`, `akun Shopee`, `region` sebagai kolom toggle.
- Staging: full rows + pagination server-side (atau client untuk <2k), seleksi lintas halaman via `getSelectedRowIds` (Context7), toolbar staging berisi: file-tabs (multi-file), filter parametrik (min 1/7/30d number, growth all/±, umur min/maks hari), sortir (terbaru, velocity, sales 1d, sales 30d, likes), tombol enrich, unduh enriched (JSON/CSV), `Masukkan semua` / `Masukkan yang dicentang (N)`.
- Katalog: toolbar 기존 (view/region/search) + panel filter parametrik yang sama + sortir baru yang sama (URL-shareable: `min1d, min7d, min30d, growth, minAge, maxAge, sort, dir`); region filter tetap (verify-only rev 11).
- Rute baru: `/dashboard/tools` (static placeholder) + Sidebar menu `Tools`; import flow menjadi `upload → staging (multi-file) → enrich → seleksi → save → result`.

## 10. Pendekatan yang dipertimbangkan (trade-off)

1. **(Dipilih) Batch snapshot + skor deterministik.** Pro: sesuai permintaan "tidak real-time", murah, explainable, cocok dengan upload file & target harian. Kontra: ranking bisa basi maksimal 24 jam (dimitigasi dengan stempel batch yang jelas).
2. **Real-time fetch ke Shopee.** Pro: data segar. Kontra: butuh proxy per negara + rawan rate-limit/blokir geografis (temuan Exa), melanggar ToS jika agresif, biaya infra tinggi — ditolak untuk MVP.
3. **Kurasi manual murni (tanpa snapshot).** Pro: paling sederhana. Kontra: tidak menyelesaikan pain evaluasi manual — ditolak.

## 11. Non-fungsional & risiko

- **Performa:** import 1.000 baris < 30 dtk; pagination server-side; index `(region, itemId, shopId)` + `(productId, scrapedAt)`.
- **Keamanan:** auth wajib (better-auth session) untuk semua `actions/`/`data/`; `addedBy/importedBy/pinnedBy` dari session, bukan dari client.
- **Integritas:** metrik ranking hanya dari snapshot; input manual tidak bisa mengubah sold/rating.
- **Legalitas scraping:** sistem tidak melakukan scraping sendiri di MVP; hanya menerima file dari extension milik user. Tambahkan banner "pastikan mematuhi ToS Shopee" + batas ukuran file.
- **Risiko duplikat lintas region:** produk sama beda region dianggap entitas berbeda (harga/mata uang/toko berbeda) — keputusan eksplisit.
- **Zona waktu:** counter harian memakai Asia/Kuala_Lumpur; didokumentasikan di UI.

## 12. Acceptance criteria (UAT, format aktual + filter + pins page)

- [ ] Upload CSV/JSON 350 baris format §6 (campur MY/SG + 20 duplikat + 5 baris rusak/`product_id` mismatch URL) → `imported 325, duplicates 20, failed 5` + file error terunduh.
- [ ] Contoh 2 baris COSRX terparse: `shopId` 133117728/1060326459 dari URL, `currency` MYR dari `RM`, `sales_1d "-"`→null, `growth "+1.89%/-43.75%"`→float.
- [ ] Setelah import, progres harian user bertambah sesuai produk unik baru (duplikat tidak menambah).
- [ ] `?view=best&region=MY` terurut `total_sales` desc (30000 > 1000), ada stempel batch; bukan page baru.
- [ ] `?view=trending` menampilkan `sales_30d ≥ 10` terurut `sales_30d` desc lalu `growth_30d` (322/+1.89% > 19/-43.75%); baris `sales_30d null` tersembunyi.
- [ ] Filter SG/ID/TH/PH/VN + toggle karantina mengubah tabel katalog yang sama; produk tanpa region muncul di filter karantina.
- [ ] Pin dari kolom tabel katalog muncul di **page `/dashboard/products/pins`** dengan nama pemin + waktu + note; unpin/edit note dari page pins tercatat; katalog tidak punya toggle "Hanya pin".
- [ ] Input manual menolak URL non-`/product/{shopId}/{product_id}/` dengan pesan jelas.
- [ ] `/dashboard/**` tanpa session → redirect sign-in; role default sign-up = user.
- [ ] Admin bisa koreksi region produk milik user lain (tercatat); user biasa tidak bisa.

**UAT Phase 2 (v4):**

- [ ] Staging tampilkan full rows paginated (bukan 10) dengan kolom sales_1d/7d/30d + growth_30d + komisi 3 kanal + affiliate link (rev 1/2/10).
- [ ] Seleksi: centang 3 dari 100 → `Masukkan yang dicentang` hanya simpan 3; `Masukkan semua` simpan semua valid (rev 3).
- [ ] Enrich 100 produk selesai paralel dengan retry; gagal parsial tetap bisa retry selektif; single-writer tanpa lost update (rev 4).
- [ ] Filter `min30d=50 + growth=positive + minAge=30` mempersempit tabel staging & katalog secara konsisten; sortir velocity = sales_30d/30 desc; terbaru = listed_on desc (rev 5/6).
- [ ] Upload file kedua tanpa menghapus staging file pertama; unduh enriched (JSON/CSV) sebelum save berisi kolom komisi + affiliate link (rev 7/9).
- [ ] Katalog + staging memakai bentuk tabel unified rev 10; filter region tetap bekerja untuk semua produk (rev 10/11).
- [ ] Field akun Shopee tersimpan + tampil; edit non-metrik tercatat; copy product link + affiliate link bekerja dengan toast (rev 12/13/14).
- [ ] `/dashboard/tools` tampil sebagai static page placeholder + menu Sidebar (rev 8).

## 13. Fase + Linear breakdown (Hybrid Thin+, siap copy ke Linear)

**Fase:**

- **MVP (fase 1):** F0–F7 di atas, satu board bersama di page Pins terpisah, formula v1 field aktual, katalog + filter best/trending, tanpa chart.
- **Fase 2 (v4 ini, 14 poin revisi):** F8 staging import single-jsonb per file + tabel staging full paginated + seleksi simpan (semua/tercentang); F9 enrich komisi batch-paralel + retry single-writer + unduh ulang enriched; filter parametrik (min sales 1/7/30d, growth ±, umur hari) + sortir baru (terbaru, velocity, sales 1d, sales 30d, likes); tabel unified import + katalog (rev 10); akun Shopee string + edit non-metrik + copy link; tools page static placeholder. Region katalog = verify-only (sudah ada).
- **Fase 3:** riwayat harga/GMV per produk, perbandingan region side-by-side, board per live session, threshold trending konfigurabel admin, export shortlist, integrasi extension→API langsung, skor opportunity, notifikasi progres 300.

**Aturan Linear yang dipakai (protocol `2026-09-15-linear-project-protocol-design.md` + skill `linear-tracking`):**

- Satu project per area produk, satu team; cycle 1 minggu Sen–Sen; status `Backlog → Todo → In Progress → In Review → Done` (+`Canceled`/`Duplicate`).
- Milestone = fase demoable (3–10 issues, 1–4 cycle), nama `[Phase N] Outcome`, maks 2 open. MVP ini = satu milestone.
- Parent = feature 1–3 hari; Sub = task <4 jam, maks 1 level. Judul `[area] Verb outcome` ≤60 char. Deskripsi hanya header `Goal:/Scope:/Acceptance:/Links:` ≤15 baris. Tepat satu label (`feature|bug|chore|docs|spike`). Attachment hanya parent (sample <30 baris). Komentar: progress/blocker/decision/review.

**Milestone siap buat (JIT, 1 untuk MVP):**

- `[Phase 1] Katalog + filter kurasi usable` — demo: login → import 300 baris aktual → katalog terfilter best/trending → page pins bersama → progres 300. Target: akhir cycle berjalan +1.

**Parent issues siap copy (7 parent, masing-masing ≤60 char, label + acceptance):**

```
[auth] Login, guard + peran user/admin (label: feature)
Goal: Hanya user login akses dashboard; admin kelola tim.
Scope:
- in: sign-in username/email, middleware guard /dashboard/**, role default user, admin via admin plugin, session di actions
- Out: OAuth, invite email
Acceptance:
- [ ] /dashboard tanpa session → redirect sign-in
- [ ] admin koreksi region siapa pun + tercatat; user biasa hanya milik sendiri
- [ ] addedBy/importedBy/pinnedBy dari session
Links: <URL doc ini §6 F0>
Subs: [auth] login + guard; [auth] roles + session enforcement

[db] Prisma models produk + snapshot (label: feature)
Goal: Skema Product/Snapshot/Batch/Pin/Target sesuai §8 tersedia via migrate.
Scope:
- in: enum Region, model §8, index dedup + ranking, migrate dev
- Out: seed massal, RLS
Acceptance:
- [ ] `pnpm db:migrate` sukses, Studio tampilkan 6 tabel
- [ ] unique (region,itemId,shopId) menolak duplikat
Links: <URL doc ini §8>, protocol 2026-09-15
Subs: [db] tulis schema + migrate; [db] seed 2 baris COSRX §6

[products] Import CSV/JSON format aktual (label: feature)
Goal: Upload file extension menjadi Product+Snapshot + laporan batch.
Scope:
- in: parse §6 F1 ("-"→null, growth%, RM→MYR, regex URL), preview 10, error CSV
- Out: push extension langsung, mapping manual
Acceptance:
- [ ] 350 baris → imported/updated/duplicates/failed benar
- [ ] mismatch product_id vs URL masuk failed
- [ ] stempel batch tampil di katalog
Links: <URL doc ini §6 F1>
Subs: [products] schemas zod coerce; [products] actions import+batch; [products] UI uploader+preview

[products] Katalog + filter best/trending (label: feature)
Goal: Satu page /products dengan filter view/region/search + sort benar.
Scope:
- in: searchParams view=all|best|trending, region default MY, sort §7, stempel batch, link ke Pins
- Out: page best/trending terpisah, chart
Acceptance:
- [ ] ?view=best urut total_sales desc
- [ ] ?view=trending sembunyikan sales_30d null, urut sales_30d,growth
- [ ] filter URL shareable
Links: <URL doc ini §7 §9>
Subs: [products] data listProducts; [products] toolbar filter URL; [products] columns sort default

[ui] Tabel produk v9 + shadcn polish (label: feature)
Goal: Kolom §9 tampil rapi di DataTable generik tanpa fork (katalog + pins).
Scope:
- in: 11 kolom katalog §9 + pin-columns (note/pinnedBy/pinnedAt), Badge region/growth, Tooltip category, Skeleton, No results+CTA
- Out: virtualisasi, export excel
Acceptance:
- [ ] pin/likes/sales/growth/total/gmv/listed tampil + sortable
- [ ] page pins tampilkan note/pemin/waktu + unpin
- [ ] mobile tidak overflow (truncate+tooltip)
Links: <URL doc ini §9>
Subs: [ui] product-columns + pin-columns; [ui] toolbar+progress-card; [ui] empty/loading states

[products] Pins page + progres 300 (label: feature)
Goal: Page /pins shared + counter X/300 akurat per streamer.
Scope:
- in: page pins (listPins, unpin/edit note), togglePin idempoten+Audit dari katalog, DailyTarget Asia/KL
- Out: board per session, notifikasi
Acceptance:
- [ ] pin dari katalog muncul di /pins + audit siapa/kapan
- [ ] unpin/edit note tercatat
- [ ] duplikat tidak tambah counter
Links: <URL doc ini §6 F2/F6>
Subs: [products] togglePin service + pins-page; [products] progress-card+riwayat

[products] Input manual + koreksi region (label: feature)
Goal: Form manual format aktual + karantina NEEDS_REGION.
Scope:
- in: RHF+zod field §6 F7, tolak URL non-produk, edit korektif saja
- Out: bulk manual, edit metrik manual
Acceptance:
- [ ] "-"→null, URL invalid ditolak jelas
- [ ] metrik hanya berubah via import
Links: <URL doc ini §6 F7>
Subs: [products] form+validasi; [products] karantina UI
```

**Catatan label:** protocol minta tepat satu dari `feature|bug|chore|docs|spike` (lowercase). Workspace Sigma saat ini memakai `Feature/Bug/Improvement/...` — putuskan saat eksekusi: buat label lowercase baru sesuai protocol atau petakan `feature→Feature`. Jangan dual-label. Semua parent di atas = `feature`; pecahan riset (jika ada) = `spike` time-boxed 1 cycle.

**Milestone Phase 2 siap buat (JIT, 1 milestone, 6 parent — memenuhi 3–10 issues):**

- `[Phase 2] Import staging + kurasi parametrik` — demo: multi-file → staging full + filter/sort → enrich paralel → seleksi → save → katalog unified + edit/copy + tools page. Target: akhir cycle berjalan +2.

```
[import] Staging full + seleksi simpan (label: feature)
Goal: Tabel staging full paginated + seleksi semua/tercentang.
Scope:
- in: ImportStagingFile jsonb/file, tabel unified staging, select-all + getSelectedRowIds, save semua/terpilih
- Out: enrich paralel (P terpisah), filter parametrik (P terpisah)
Acceptance:
- [ ] full rows paginated tampil sales_1d/7d/30d + growth
- [ ] save semua vs tercentang benar
- [ ] hanya baris valid bisa dipilih
Links: <URL doc ini §6 F8 §9>
Subs: [import] model staging + append; [import] tabel staging + seleksi; [import] save selektif ke DB

[import] Multi-file + unduh enriched (label: feature)
Goal: Append multi-file tanpa hilang + unduh enriched kapan pun.
Scope:
- in: file-tabs union, unduh JSON/CSV enriched per file/gabungan, expiresAt +7 hari
- Out: enrich logic
Acceptance:
- [ ] file kedua tidak hapus file pertama
- [ ] unduh berisi komisi 3 kanal + affiliate link
Links: <URL doc ini §6 F8>
Subs: [import] append + file-tabs; [import] unduh enriched CSV/JSON

[import] Enrich komisi batch paralel (label: feature)
Goal: Enrich 100 produk cepat via batch + retry single-writer.
Scope:
- in: batch 10-20/pesan, 2-4 paralel + jitter, retry 3x, merge serial batched, progress
- Out: Open API server-side
Acceptance:
- [ ] paralel + retry tanpa lost update jsonb
- [ ] gagal parsial bisa retry selektif
Links: <URL doc ini §6 F9>
Subs: [import] batch+retry extension; [import] single-writer merge

[catalog] Filter parametrik + sortir unified (label: feature)
Goal: Filter min 1/7/30d + growth± + umur + 5 sortir di staging & katalog.
Scope:
- in: min1d/min7d/min30d, growthSign, minAge/maxAge URL-shareable, sort terbaru/velocity/1d/30d/likes, tabel unified rev 10, region verify
- Out: threshold admin konfigurabel (fase 3)
Acceptance:
- [ ] filter AND konsisten staging + katalog
- [ ] velocity = sales30d/30, terbaru = listed_on desc
Links: <URL doc ini §7 §9>
Subs: [catalog] filter parametrik URL; [catalog] sortir + kolom unified; [catalog] verify region semua produk

[catalog] Akun Shopee + edit + copy link (label: feature)
Goal: Field akun + edit non-metrik + copy ganda.
Scope:
- in: shopeeAccount string, dialog edit + audit, copy product + affiliate + toast
- Out: edit metrik manual
Acceptance:
- [ ] akun tersimpan + tampil toggle
- [ ] edit tercatat, metrik terkunci
- [ ] copy keduanya bekerja
Links: <URL doc ini §6 F7>
Subs: [catalog] field akun + migrasi; [catalog] edit + copy link

[ui] Halaman tools statis (label: feature)
Goal: /dashboard/tools placeholder + menu.
Scope:
- in: route + komposisi + kartu placeholder, Sidebar Tools
- Out: isi tools fungsional (menyusul)
Acceptance:
- [ ] /dashboard/tools tampil + menu ada
Links: <URL doc ini §6 F10>
Subs: (tanpa sub — flat, <4h)
```

## 14. Open questions (tidak memblokir MVP)

1. Apakah admin boleh mengoreksi region produk milik streamer lain? (diputuskan 2026-09-16: ya — lihat F0, tercatat di audit).
2. Apakah produk `needsRegion` tetap dihitung ke 300 sebelum dikoreksi? (usulan: tidak, agar kualitas terjaga).
3. Retensi snapshot: simpan berapa lama? (usulan: 90 hari, lalu agregasi mingguan).
4. Threshold trending `sales_30d ≥ 10` — perlu konfigurabel admin di fase 1 atau fase 2? (usulan: konstanta fase 1, setting admin fase 2).

---

## Appendix A — Mapping region & mata uang (dari Exa)

| Region     | Domain        | Currency | Bahasa           |
| ---------- | ------------- | -------- | ---------------- |
| MY (utama) | shopee.com.my | MYR      | Melayu/Inggris   |
| SG         | shopee.sg     | SGD      | Inggris          |
| ID         | shopee.co.id  | IDR      | Indonesia        |
| TH         | shopee.co.th  | THB      | Thai             |
| PH         | shopee.ph     | PHP      | Inggris/Filipino |
| VN         | shopee.vn     | VND      | Vietnam          |

## Appendix B — Self-review spec (revisi v3)

- [x] Tidak ada placeholder/TBD — mapping snake_case aktual, regex URL, aturan `"-"`→null, currency RM→MYR eksplisit di §6.
- [x] Konsisten: Best/Trending sebagai filter satu page katalog, Pins sebagai page terpisah (§6 F3/F4/F6 = §9 rute = §12 UAT); tidak ada toggle "Hanya pin" di katalog.
- [x] Scope tunggal: satu fitur kurasi; fase 2/3 dipisah; Linear breakdown 1 level, judul ≤60 char, 4-field header, satu label (§13).
- [x] Tidak ambigu: contoh 2 baris COSRX dipakai di mapping, formula, model, dan UAT yang sama.
- [x] Auth tercakup (F0) + 7 parent Linear sinkron §13; relasi blocking & prioritas diatur di Linear (db/auth fondasi → import/katalog → pins/ui/manual).
