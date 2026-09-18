/**
 * Shofiliate Companion - Background Service Worker
 * Mengelola interaksi dengan Shopee Affiliate API menggunakan cookies/session aktif streamer
 */

const REGION_AFFILIATE_DOMAINS = {
  MY: "affiliate.shopee.com.my",
  ID: "affiliate.shopee.co.id",
  SG: "affiliate.shopee.sg",
  TH: "affiliate.shopee.co.th",
  PH: "affiliate.shopee.ph",
  VN: "affiliate.shopee.vn",
};

// Cek status autentikasi / session di Shopee Affiliate (Multi-tier: Tab Aktif, Cookies SPC_EC/SPC_U, GraphQL)
async function checkShopeeAuth(region = "ID") {
  const domain = REGION_AFFILIATE_DOMAINS[region] || "affiliate.shopee.co.id";
  const mainDomain = region === "ID" ? "shopee.co.id" : "shopee.com.my";

  try {
    // Tier 1: Cek tab Shopee Affiliate yang sedang terbuka di browser
    const tabs = await chrome.tabs.query({});
    const affiliateTab = tabs.find((t) => (t.url || "").includes(domain));
    if (affiliateTab && affiliateTab.id) {
      if (!affiliateTab.url.includes("/login")) {
        try {
          const res = await chrome.scripting.executeScript({
            target: { tabId: affiliateTab.id },
            func: () => {
              // Cari elemen dropdown user di header Shopee Affiliate
              const userEl = document.querySelector(
                "[class*='username'], [class*='user-name'], [class*='user_name'], [class*='account-name'], .ant-dropdown-trigger"
              );
              const headerText = userEl ? (userEl.textContent || "").trim() : "";
              if (headerText && !headerText.includes("Bahasa") && headerText.length < 30) {
                return headerText;
              }
              const spans = Array.from(document.querySelectorAll("header span, .header span, nav span, div[class*='header'] span"));
              for (const s of spans) {
                const txt = (s.textContent || "").trim();
                if (txt && !txt.includes("Bahasa") && !txt.includes("Pusat") && /^[a-zA-Z0-9._-]{3,30}$/.test(txt)) {
                  return txt;
                }
              }
              return "Aktif (Tab Terbuka)";
            },
          });
          const detectedUser = res?.[0]?.result;
          if (detectedUser) {
            return {
              authenticated: true,
              domain,
              user: detectedUser,
            };
          }
        } catch (e) {
          return {
            authenticated: true,
            domain,
            user: "Aktif (Tab Terbuka)",
          };
        }
      }
    }

    // Tier 2: Cek Cookie Autentikasi Shopee (SPC_EC & SPC_U)
    if (chrome.cookies) {
      try {
        const [spcEc, spcU, mainSpcEc, mainSpcU] = await Promise.all([
          chrome.cookies.get({ url: `https://${domain}`, name: "SPC_EC" }),
          chrome.cookies.get({ url: `https://${domain}`, name: "SPC_U" }),
          chrome.cookies.get({ url: `https://${mainDomain}`, name: "SPC_EC" }),
          chrome.cookies.get({ url: `https://${mainDomain}`, name: "SPC_U" }),
        ]);

        const cookieEc = spcEc || mainSpcEc;
        const cookieU = spcU || mainSpcU;

        if (cookieEc && cookieEc.value) {
          return {
            authenticated: true,
            domain,
            user: cookieU?.value ? `User #${cookieU.value}` : "Aktif (Cookie Valid)",
          };
        }
      } catch (e) {}
    }

    // Tier 3: Cek GraphQL API endpoint
    try {
      const gqlRes = await fetch(`https://${domain}/api/v3/gql`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ viewer { id } }" }),
      });
      if (gqlRes.ok) {
        const gqlData = await gqlRes.json();
        if (gqlData && gqlData.is_login !== false && !gqlData.error) {
          return {
            authenticated: true,
            domain,
            user: "Aktif",
          };
        }
      }
    } catch (e) {}

    return {
      authenticated: false,
      domain,
      reason: "Belum login di portal Shopee Affiliate",
    };
  } catch (err) {
    return {
      authenticated: false,
      domain,
      reason: err instanceof Error ? err.message : "Gagal memeriksa autentikasi",
    };
  }
}

// Generate shortlink & komisi untuk single / batch produk
async function fetchAffiliateDataForProduct(productUrl, itemId, region = "MY") {
  const domain = REGION_AFFILIATE_DOMAINS[region] || "affiliate.shopee.com.my";
  let affiliateLink = null;
  let commissionRate = null;
  let commissionAmount = null;
  let commissionLiveRate = null;
  let commissionLiveAmount = null;
  let commissionSocialRate = null;
  let commissionSocialAmount = null;
  let commissionVideoRate = null;
  let commissionVideoAmount = null;
  let hasKomisiXtra = false;
  let komisiXtraRate = null;
  let komisiXtraAmount = null;

  // 1. Request real custom link via GraphQL batchGetCustomLink
  try {
    const gqlUrl = `https://${domain}/api/v3/gql?q=batchCustomLink`;
    const body = {
      operationName: "batchGetCustomLink",
      query: `query batchGetCustomLink($linkParams: [CustomLinkParam!], $sourceCaller: SourceCaller){
        batchCustomLink(linkParams: $linkParams, sourceCaller: $sourceCaller){
          shortLink
          longLink
          failCode
        }
      }`,
      variables: {
        linkParams: [
          {
            originalLink: productUrl,
            advancedLinkParams: {
              subId1: "shofiliate",
            },
          },
        ],
        sourceCaller: "CUSTOM_LINK_CALLER",
      },
    };

    const res = await fetch(gqlUrl, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(4000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const linkObj = data?.data?.batchCustomLink?.[0];
      if (linkObj && linkObj.shortLink) {
        affiliateLink = linkObj.shortLink;
      }
    }
  } catch (e) {
    // Fallback silent
  }

  // 2. Coba ambil rincian komisi (Live, Sosmed, Video, Xtra) via productOfferV2 / search
  try {
    const gqlUrl = `https://${domain}/api/v3/gql`;
    const body = {
      operationName: "productOfferV2",
      query: `query productOfferV2($keyword: String, $page: Int, $limit: Int) {
        productOfferV2(keyword: $keyword, page: $page, limit: $limit) {
          nodes {
            itemId
            commissionRate
            minCommission
            maxCommission
            price
            offerLink
            liveCommissionRate
            liveCommissionAmount
            socialCommissionRate
            socialCommissionAmount
            videoCommissionRate
            videoCommissionAmount
            hasKomisiXtra
            extraCommissionRate
            extraCommissionAmount
          }
        }
      }`,
      variables: {
        keyword: String(itemId),
        page: 1,
        limit: 1,
      },
    };

    const res = await fetch(gqlUrl, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(4000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const node = data?.data?.productOfferV2?.nodes?.[0];
      if (node) {
        if (node.commissionRate !== undefined && node.commissionRate !== null) {
          commissionRate = parseFloat(node.commissionRate);
        }
        if (node.maxCommission !== undefined && node.maxCommission !== null) {
          commissionAmount = parseFloat(node.maxCommission);
        } else if (node.minCommission !== undefined && node.minCommission !== null) {
          commissionAmount = parseFloat(node.minCommission);
        }

        // Live Commission (default ke general rate jika sama)
        commissionLiveRate = node.liveCommissionRate !== undefined && node.liveCommissionRate !== null
          ? parseFloat(node.liveCommissionRate)
          : commissionRate;
        commissionLiveAmount = node.liveCommissionAmount !== undefined && node.liveCommissionAmount !== null
          ? parseFloat(node.liveCommissionAmount)
          : commissionAmount;

        // Social Media Commission
        commissionSocialRate = node.socialCommissionRate !== undefined && node.socialCommissionRate !== null
          ? parseFloat(node.socialCommissionRate)
          : commissionLiveRate;
        commissionSocialAmount = node.socialCommissionAmount !== undefined && node.socialCommissionAmount !== null
          ? parseFloat(node.socialCommissionAmount)
          : commissionLiveAmount;

        // Shopee Video Commission
        commissionVideoRate = node.videoCommissionRate !== undefined && node.videoCommissionRate !== null
          ? parseFloat(node.videoCommissionRate)
          : commissionLiveRate;
        commissionVideoAmount = node.videoCommissionAmount !== undefined && node.videoCommissionAmount !== null
          ? parseFloat(node.videoCommissionAmount)
          : commissionLiveAmount;

        // Komisi XTRA
        hasKomisiXtra = Boolean(
          node.hasKomisiXtra ||
          node.extraCommissionRate ||
          node.extraCommissionAmount
        );
        komisiXtraRate = node.extraCommissionRate !== undefined && node.extraCommissionRate !== null
          ? parseFloat(node.extraCommissionRate)
          : commissionLiveRate;
        komisiXtraAmount = node.extraCommissionAmount !== undefined && node.extraCommissionAmount !== null
          ? parseFloat(node.extraCommissionAmount)
          : commissionLiveAmount;

        if (!affiliateLink && node.offerLink) {
          affiliateLink = node.offerLink;
        }
      }
    }
  } catch (e) {
    // Fallback silent
  }

  // 3. Fallback jika Shopee API internal tidak mengembalikan shortLink:
  if (!affiliateLink) {
    affiliateLink = productUrl.includes("?")
      ? `${productUrl}&utm_source=an_shofiliate`
      : `${productUrl}?utm_source=an_shofiliate`;
  }

  return {
    affiliate_link: affiliateLink,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    commission_live_rate: commissionLiveRate,
    commission_live_amount: commissionLiveAmount,
    commission_social_rate: commissionSocialRate,
    commission_social_amount: commissionSocialAmount,
    commission_video_rate: commissionVideoRate,
    commission_video_amount: commissionVideoAmount,
    has_komisi_xtra: hasKomisiXtra,
    komisi_xtra_rate: komisiXtraRate,
    komisi_xtra_amount: komisiXtraAmount,
  };
}

// Tunggu hingga tab memuat item spesifik (cek URL dan readyState)
async function waitForTabToLoadItem(tabId, expectedItemId, maxWaitMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (id) => {
          const ready = document.readyState === "complete" || document.readyState === "interactive";
          const match = window.location.pathname.includes(id) || window.location.href.includes(id);
          return ready && match;
        },
        args: [expectedItemId],
      });
      if (results?.[0]?.result) {
        return true;
      }
    } catch (e) {
      // Tab mungkin sedang proses navigasi
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// Eksekusi enrichment untuk semua baris produk secara bertahap via tab Shopee Affiliate di latar belakang
async function enrichProductRows(rows, defaultRegion = "ID", tabId, requestId) {
  const total = rows.length;
  const enrichedRows = [];

  const sendProgress = (completed, currentName = "") => {
    if (tabId) {
      try {
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;
        chrome.tabs.sendMessage(tabId, {
          source: "shofiliate-companion-background",
          type: "ENRICH_PROGRESS",
          requestId,
          completed,
          total,
          percentage,
          currentProduct: currentName,
        });
      } catch (err) {
        // Tab mungkin tertutup atau reload
      }
    }
  };

  sendProgress(0, "Mempersiapkan proses enrichment produk...");

  let backgroundTab = null;

  try {
    // Buka 1 background tab (active: false) untuk mengeksekusi semua produk secara berurutan tanpa mengganggu layar pengguna
    backgroundTab = await chrome.tabs.create({
      url: "about:blank",
      active: false,
    });

    for (let i = 0; i < total; i++) {
      const row = rows[i];

      // 1. Ekstrak Item ID dari product_id, itemId, atau URL
      let itemId = String(row.product_id || row.itemId || row.item_id || "").trim();
      const rawUrl = String(row.product_url || row.url || "").trim();

      if (!itemId && rawUrl) {
        const m1 = rawUrl.match(/\/product\/(\d+)\/(\d+)/);
        const m2 = rawUrl.match(/-i\.(\d+)\.(\d+)/);
        const m3 = rawUrl.match(/\/offer\/product_offer\/(\d+)/);
        if (m1) itemId = m1[2];
        else if (m2) itemId = m2[2];
        else if (m3) itemId = m3[1];
      }

      // Deteksi region: periksa dari URL jika ada domain Shopee negara tertentu, jika tidak gunakan defaultRegion
      let rowRegion = defaultRegion || "ID";
      if (rawUrl.includes(".com.my")) rowRegion = "MY";
      else if (rawUrl.includes(".co.id")) rowRegion = "ID";
      else if (rawUrl.includes(".sg")) rowRegion = "SG";
      else if (rawUrl.includes(".ph")) rowRegion = "PH";
      else if (rawUrl.includes(".co.th")) rowRegion = "TH";
      else if (rawUrl.includes(".vn")) rowRegion = "VN";

      const tld = rowRegion === "ID" ? "co.id" : (rowRegion === "MY" ? "com.my" : "co.id");

      // Jika tidak ada numeric ID, simpan baris apa adanya dan lanjut
      if (!itemId || !/^\d+$/.test(itemId)) {
        enrichedRows.push(row);
        sendProgress(i + 1, row.product_name || `Baris #${i + 1}`);
        continue;
      }

      sendProgress(i, `Mengambil data komisi & link ID: ${itemId}...`);

      const targetOfferUrl = `https://affiliate.shopee.${tld}/offer/product_offer/${itemId}`;

      try {
        // Pastikan background tab masih aktif
        try {
          await chrome.tabs.get(backgroundTab.id);
        } catch (e) {
          backgroundTab = await chrome.tabs.create({ url: "about:blank", active: false });
        }

        // Navigasi ke rincian penawaran produk
        await chrome.tabs.update(backgroundTab.id, { url: targetOfferUrl });
        await waitForTabToLoadItem(backgroundTab.id, itemId, 5000);
        await new Promise((r) => setTimeout(r, 600));

        // Eksekusi script in-page automation (mengambil judul, komisi Live/Sosmed/Video/Xtra, dan klik buat shortlink)
        const results = await chrome.scripting.executeScript({
          target: { tabId: backgroundTab.id },
          func: runAutomateInPage,
          args: [itemId],
        });

        const data = results?.[0]?.result;
        if (data?.error === "NOT_LOGGED_IN") {
          throw new Error(data.message);
        }

        if (data && (data.productName || data.itemId)) {
          const formatted = formatProductResult(data, rowRegion);

          // Gabungkan hasil scraping dengan baris asli (melengkapi data yang kosong)
          const mergedRow = {
            ...row,
            product_id: itemId,
            product_name:
              row.product_name && row.product_name.trim() !== ""
                ? row.product_name
                : formatted.product_name,
            seller_name:
              row.seller_name && row.seller_name.trim() !== ""
                ? row.seller_name
                : formatted.seller_name,
            product_url:
              row.product_url && row.product_url.trim() !== ""
                ? row.product_url
                : formatted.product_url,
            gmv_30d:
              row.gmv_30d && row.gmv_30d.trim() !== "" && row.gmv_30d !== "-"
                ? row.gmv_30d
                : formatted.gmv_30d,

            commission_rate: formatted.commission_rate,
            commission_amount: formatted.commission_amount,
            commission_live_rate: formatted.commission_live_rate,
            commission_live_amount: formatted.commission_live_amount,
            commission_social_rate: formatted.commission_social_rate,
            commission_social_amount: formatted.commission_social_amount,
            commission_video_rate: formatted.commission_video_rate,
            commission_video_amount: formatted.commission_video_amount,
            has_komisi_xtra: formatted.has_komisi_xtra,
            komisi_xtra_rate: formatted.komisi_xtra_rate,
            komisi_xtra_amount: formatted.komisi_xtra_amount,

            commission_live_xtra_rate: formatted.commission_live_xtra_rate,
            commission_live_xtra_amount: formatted.commission_live_xtra_amount,
            commission_live_shopee_rate: formatted.commission_live_shopee_rate,
            commission_live_shopee_amount: formatted.commission_live_shopee_amount,

            commission_social_xtra_rate: formatted.commission_social_xtra_rate,
            commission_social_xtra_amount: formatted.commission_social_xtra_amount,
            commission_social_shopee_rate: formatted.commission_social_shopee_rate,
            commission_social_shopee_amount: formatted.commission_social_shopee_amount,

            commission_video_xtra_rate: formatted.commission_video_xtra_rate,
            commission_video_xtra_amount: formatted.commission_video_xtra_amount,
            commission_video_shopee_rate: formatted.commission_video_shopee_rate,
            commission_video_shopee_amount: formatted.commission_video_shopee_amount,

            affiliate_link: formatted.affiliate_link || row.affiliate_link || null,
            affiliate_url: formatted.affiliate_link || row.affiliate_url || null,
          };

          enrichedRows.push(mergedRow);
          sendProgress(i + 1, mergedRow.product_name || itemId);
        } else {
          enrichedRows.push(row);
          sendProgress(i + 1, row.product_name || itemId);
        }
      } catch (err) {
        if (err.message && err.message.includes("belum login")) {
          throw err;
        }
        console.warn(`[Shofiliate] Gagal mengambil rincian untuk ID ${itemId}:`, err);
        enrichedRows.push(row);
        sendProgress(i + 1, row.product_name || itemId);
      }

      // Jeda kecil antar item agar tidak membebani browser
      if (i < total - 1) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  } finally {
    // Selalu tutup background tab yang dibuat otomatis
    if (backgroundTab?.id) {
      try {
        await chrome.tabs.remove(backgroundTab.id);
      } catch (e) {}
    }
  }

  sendProgress(total, "Selesai melengkapi semua produk!");
  return enrichedRows;
}

// In-page function dieksekusi langsung di tab Shopee Affiliate via chrome.scripting.executeScript
async function runAutomateInPage(targetItemId) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isOurElement = (el) => {
    if (!el) return false;
    if (el.id === "shofiliate-floating-btn" || el.id === "shofiliate-floating-container") return true;
    if (el.closest?.("#shofiliate-floating-container")) return true;
    const txt = (el.innerText || el.textContent || "").toLowerCase();
    if (txt.includes("shofiliate") || txt.includes("buat link & kirim")) return true;
    return false;
  };

  // 0. Cek apakah diarahkan ke halaman login Shopee
  if (window.location.pathname.includes("/login") || window.location.href.includes("login")) {
    return {
      error: "NOT_LOGGED_IN",
      message: "Akun Shopee Affiliate Anda belum login di browser Chrome. Silakan buka affiliate.shopee.co.id dan login terlebih dahulu.",
    };
  }

  // 0.1 Tunggu SPA Shopee merender konten tabel / tombol jika tab baru dimuat (maks 6 detik)
  for (let attempt = 0; attempt < 30; attempt++) {
    const hasShopeeNativeButton = Array.from(
      document.querySelectorAll("button, [role='button'], a.ant-btn, a")
    ).some((el) => {
      if (isOurElement(el)) return false;
      const t = (el.innerText || el.textContent || "").trim().toLowerCase();
      return (t === "buat link" || t === "generate link") || (t.startsWith("buat link") && t.length < 20);
    });

    const hasTable = Array.from(document.querySelectorAll("tr, [role='row']")).some(
      (r) => !isOurElement(r) && (r.textContent || "").includes("Shopee Live")
    );

    const hasLihatProduk = Array.from(document.querySelectorAll("a, span")).some(
      (el) => !isOurElement(el) && (el.textContent || "").trim() === "Lihat Produk"
    );

    if (hasShopeeNativeButton || hasTable || hasLihatProduk) {
      // Tunggu jeda 350ms agar react/vue selesai merender state DOM
      await sleep(350);
      break;
    }
    await sleep(200);
  }

  // 1. Ekstrak Item ID dari URL jika ada
  const pathname = window.location.pathname;
  const match = pathname.match(/\/offer\/product_offer\/(\d+)/);
  const pageItemId = match ? match[1] : targetItemId || "";

  // 2. Fungsi pembantu untuk memindai shortlink asli dari modal atau HTML
  function scanForShortlink() {
    // A. Cari di semua textarea (khususnya modal pop-up 'Link Penawaran Produk')
    const textareas = Array.from(document.querySelectorAll("textarea"));
    for (const ta of textareas) {
      if (isOurElement(ta)) continue;
      const val = (ta.value || ta.textContent || ta.innerText || "").trim();
      const m = val.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (m) return m[0].trim();
    }

    // B. Cari di semua input
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const inp of inputs) {
      if (isOurElement(inp)) continue;
      const val = (inp.value || inp.getAttribute("value") || inp.textContent || inp.innerText || "").trim();
      const m = val.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (m) return m[0].trim();
    }

    // C. Cari di seluruh modal container yang sedang terbuka
    const modals = Array.from(
      document.querySelectorAll(".ant-modal, .shopee-modal, [role='dialog'], .modal, div[class*='modal'], div[class*='dialog']")
    );
    for (const m of modals) {
      if (isOurElement(m)) continue;
      const txt = m.innerText || m.textContent || "";
      const mLink = txt.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (mLink) return mLink[0].trim();

      const mHtml = (m.innerHTML || "").match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (mHtml) return mHtml[0].trim();
    }

    // D. Cari di seluruh innerHTML (tanpa shofiliate floating button)
    const bodyClone = document.body ? document.body.cloneNode(true) : null;
    if (bodyClone) {
      bodyClone.querySelector("#shofiliate-floating-container")?.remove();
      const htmlMatch = bodyClone.innerHTML.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (htmlMatch) return htmlMatch[0].trim();
    }

    return null;
  }

  let capturedLink = scanForShortlink();

  // 3. Jika belum ada shortlink, klik tombol "Buat Link" Shopee asli untuk memunculkan modal
  if (!capturedLink) {
    const allElements = Array.from(document.querySelectorAll("button, [role='button'], a.ant-btn, a"));
    const buatLinkBtn = allElements.find((el) => {
      if (isOurElement(el)) return false;
      const t = (el.innerText || el.textContent || "").trim().toLowerCase();
      return (t === "buat link" || t === "generate link") || (t.startsWith("buat link") && t.length < 20);
    });

    if (buatLinkBtn) {
      const clickTarget =
        buatLinkBtn.closest("button") || buatLinkBtn.closest("[role='button']") || buatLinkBtn;
      clickTarget.focus?.();
      clickTarget.dispatchEvent(new MouseEvent("click", { view: window, bubbles: true, cancelable: true }));
      try {
        clickTarget.click();
      } catch (e) {}

      // Polling modal sampai 4 detik
      for (let i = 0; i < 25; i++) {
        await sleep(150);
        capturedLink = scanForShortlink();

        // Cari dan klik tombol "Salin Link" di modal jika muncul
        const modalBtns = Array.from(document.querySelectorAll("button, [role='button'], a, div, span"));
        const salinBtn = modalBtns.find((b) => {
          if (isOurElement(b)) return false;
          const t = (b.textContent || b.innerText || "").trim().toLowerCase();
          return (t === "salin link" || t === "salin" || t.includes("salin link") || t.includes("copy link")) && t.length < 25;
        });
        if (salinBtn) {
          const salinTarget = salinBtn.closest("button") || salinBtn.closest("[role='button']") || salinBtn;
          salinTarget.dispatchEvent(new MouseEvent("click", { view: window, bubbles: true, cancelable: true }));
          try {
            salinTarget.click();
          } catch (e) {}
        }

        if (!capturedLink) {
          capturedLink = scanForShortlink();
        }

        if (capturedLink) break;
      }

      // Tutup modal secara otomatis hanya jika shortlink berhasil didapatkan
      if (capturedLink) {
        try {
          const closeCandidates = Array.from(
            document.querySelectorAll("button, span, i, div, [role='button']")
          );
          const closeBtn = closeCandidates.find((b) => {
            if (isOurElement(b)) return false;
            const t = (b.textContent || "").trim().toLowerCase();
            const aria = (b.getAttribute("aria-label") || "").toLowerCase();
            return (
              t === "batal" ||
              t === "tutup" ||
              t === "close" ||
              t === "cancel" ||
              aria === "close" ||
              b.className?.includes?.("close") ||
              b.className?.includes?.("modal-close")
            );
          });
          if (closeBtn) {
            closeBtn.click();
          } else {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })
            );
          }
        } catch (e) {}
      }
    }
  }

  // 4. Ekstrak Judul Produk Asli (Wajib menolak teks Shofiliate / Buat Link)
  let productName = "";
  const allLinks = Array.from(document.querySelectorAll("a, button, span"));
  const lihatProduk = allLinks.find((el) => !isOurElement(el) && (el.textContent || "").trim() === "Lihat Produk");
  if (lihatProduk) {
    if (lihatProduk.previousElementSibling && !isOurElement(lihatProduk.previousElementSibling)) {
      const prevTxt = (lihatProduk.previousElementSibling.textContent || "").trim();
      if (prevTxt && !prevTxt.toLowerCase().includes("buat link") && !prevTxt.toLowerCase().includes("shofiliate")) {
        productName = prevTxt;
      }
    }
    if (!productName && lihatProduk.parentElement) {
      const parentTxt = lihatProduk.parentElement.textContent.replace("Lihat Produk", "").trim();
      if (parentTxt && !parentTxt.toLowerCase().includes("buat link") && !parentTxt.toLowerCase().includes("shofiliate")) {
        productName = parentTxt;
      }
    }
  }

  if (!productName || productName.toLowerCase().includes("buat link") || productName.toLowerCase().includes("shofiliate")) {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, div, span, p"));
    for (const el of headings) {
      if (isOurElement(el)) continue;
      const t = (el.textContent || "").trim();
      if (
        t.length > 10 &&
        !t.toLowerCase().includes("shofiliate") &&
        !t.toLowerCase().includes("buat link") &&
        !t.includes("Rincian Tawaran") &&
        !t.includes("Rincian Komisi") &&
        !t.includes("Penawaran") &&
        !t.includes("Halaman Utama") &&
        !t.includes("Bahasa") &&
        el.children.length === 0
      ) {
        productName = t;
        break;
      }
    }
  }

  // 5. Ekstrak Harga Asli Produk
  let price = 0;
  const allTextElements = Array.from(document.querySelectorAll("*")).filter((el) => {
    if (isOurElement(el)) return false;
    return el.children.length === 0 && /^Rp\s*[\d.]+/i.test((el.textContent || "").trim());
  });
  if (allTextElements.length > 0) {
    const pText = allTextElements[0].textContent.trim();
    const m = pText.match(/Rp\s*([\d.]+)/i);
    if (m) price = parseFloat(m[1].replace(/\./g, ""));
  }

  // 6. Ekstrak Tabel Rincian Komisi (Mendukung 3 Kolom atau 4 Kolom)
  let allRows = Array.from(document.querySelectorAll("tr, [role='row']")).filter((r) => !isOurElement(r));
  if (allRows.length === 0) {
    allRows = Array.from(document.querySelectorAll("div")).filter((d) => {
      if (isOurElement(d)) return false;
      const t = d.textContent || "";
      return (
        (t.includes("Shopee Live") || t.includes("Media Sosial") || t.includes("Shopee Video")) &&
        d.children.length >= 2 &&
        d.children.length <= 6
      );
    });
  }

  let xtraColIdx = 1;
  let shopeeColIdx = -1;
  let estColIdx = 2;

  const headerRow = allRows.find((r) => (r.textContent || "").includes("Jenis Platform"));
  if (headerRow) {
    let headerElements = Array.from(
      headerRow.querySelectorAll(":scope > th, :scope > td, :scope > [role='columnheader']")
    );
    if (headerElements.length === 0) {
      headerElements = Array.from(headerRow.children);
    }
    const headers = headerElements.map((h) => h.textContent?.trim() || "");

    headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower.includes("xtra")) {
        xtraColIdx = idx;
      } else if (lower.includes("komisi shopee") || lower === "komisi") {
        shopeeColIdx = idx;
      } else if (lower.includes("estimasi")) {
        estColIdx = idx;
      }
    });
  }

  const parseRateAmt = (str) => {
    if (!str) return { rate: 0, amt: 0, raw: "" };
    const rateMatch = str.match(/([\d,.]+)\s*%/);
    const amtMatch = str.match(/Rp\s*([\d.]+)/i);
    const rate = rateMatch ? parseFloat(rateMatch[1].replace(",", ".")) : 0;
    const amt = amtMatch ? parseFloat(amtMatch[1].replace(/\./g, "")) : 0;
    return { rate, amt, raw: str };
  };

  const parsePlatformRow = (platformKeyword) => {
    const row = allRows.find(
      (r) =>
        (r.textContent || "").includes(platformKeyword) &&
        !r.textContent.includes("Jenis Platform")
    );
    if (!row) return null;

    let cellElements = Array.from(
      row.querySelectorAll(":scope > td, :scope > th, :scope > [role='cell']")
    );
    if (cellElements.length === 0) {
      cellElements = Array.from(row.children);
    }
    const cells = cellElements.map((c) => c.textContent?.trim() || "");

    if (cells.length < 2) return null;

    const xtra = parseRateAmt(cells[xtraColIdx] || cells[1] || "");
    const shopee =
      shopeeColIdx !== -1 && cells[shopeeColIdx]
        ? parseRateAmt(cells[shopeeColIdx])
        : { rate: 0, amt: 0, raw: "0% (Rp0)" };
    const est = parseRateAmt(cells[estColIdx] || cells[cells.length - 1] || "");

    return {
      xtraRate: xtra.rate,
      xtraAmount: xtra.amt,
      shopeeRate: shopee.rate,
      shopeeAmount: shopee.amt,
      estimatedAmount: est.amt || (xtra.amt + shopee.amt),
    };
  };

  const liveData = parsePlatformRow("Shopee Live");
  const socialData = parsePlatformRow("Media Sosial");
  const videoData = parsePlatformRow("Shopee Video");

  const validShortlink = (capturedLink && !capturedLink.includes("/offer/product_offer/"))
    ? capturedLink
    : "";

  return {
    itemId: pageItemId,
    productName: productName || `Produk Shopee #${pageItemId}`,
    price: price || 0,
    live: liveData,
    social: socialData,
    video: videoData,
    affiliateLink: validShortlink,
  };
}

// Format data hasil scrape menjadi payload lengkap untuk web app Shofiliate
function formatProductResult(d, region = "ID") {
  const tld = region === "ID" ? "co.id" : "com.my";
  const itemId = d.itemId || "";
  const productUrl = itemId ? `https://shopee.${tld}/product/0/${itemId}` : "";
  const affLink = (d.affiliateLink && !d.affiliateLink.includes("/offer/product_offer/"))
    ? d.affiliateLink
    : "";

  const liveXtraRate = d.live?.xtraRate ?? 0;
  const liveXtraAmt = d.live?.xtraAmount ?? 0;
  const liveShopeeRate = d.live?.shopeeRate ?? 0;
  const liveShopeeAmt = d.live?.shopeeAmount ?? 0;
  const liveEstAmt = d.live?.estimatedAmount ?? (liveXtraAmt + liveShopeeAmt);

  const socialXtraRate = d.social?.xtraRate ?? 0;
  const socialXtraAmt = d.social?.xtraAmount ?? 0;
  const socialShopeeRate = d.social?.shopeeRate ?? 0;
  const socialShopeeAmt = d.social?.shopeeAmount ?? 0;
  const socialEstAmt = d.social?.estimatedAmount ?? (socialXtraAmt + socialShopeeAmt);

  const videoXtraRate = d.video?.xtraRate ?? 0;
  const videoXtraAmt = d.video?.xtraAmount ?? 0;
  const videoShopeeRate = d.video?.shopeeRate ?? 0;
  const videoShopeeAmt = d.video?.shopeeAmount ?? 0;
  const videoEstAmt = d.video?.estimatedAmount ?? (videoXtraAmt + videoShopeeAmt);

  const priceStr = d.price ? `Rp ${d.price.toLocaleString("id-ID")}` : (region === "ID" ? "Rp 0" : "RM 0");

  return {
    product_id: itemId,
    product_name: d.productName || (itemId ? `Produk Shopee #${itemId}` : "Produk Shopee"),
    seller_name: "Shopee Verified Seller",
    product_url: productUrl,
    total_sales: 0,
    sales_30d: 0,
    gmv_30d: priceStr,
    growth_30d: "0.0%",
    commission_rate: liveXtraRate + liveShopeeRate,
    commission_amount: liveEstAmt,
    commission_live_rate: liveXtraRate + liveShopeeRate,
    commission_live_amount: liveEstAmt,
    commission_social_rate: socialXtraRate + socialShopeeRate,
    commission_social_amount: socialEstAmt,
    commission_video_rate: videoXtraRate + videoShopeeRate,
    commission_video_amount: videoEstAmt,
    has_komisi_xtra: liveXtraRate > 0 || socialXtraRate > 0 || videoXtraRate > 0,
    komisi_xtra_rate: liveXtraRate || socialXtraRate || videoXtraRate,
    komisi_xtra_amount: liveXtraAmt || socialXtraAmt || videoXtraAmt,

    commission_live_xtra_rate: liveXtraRate,
    commission_live_xtra_amount: liveXtraAmt,
    commission_live_shopee_rate: liveShopeeRate,
    commission_live_shopee_amount: liveShopeeAmt,

    commission_social_xtra_rate: socialXtraRate,
    commission_social_xtra_amount: socialXtraAmt,
    commission_social_shopee_rate: socialShopeeRate,
    commission_social_shopee_amount: socialShopeeAmt,

    commission_video_xtra_rate: videoXtraRate,
    commission_video_xtra_amount: videoXtraAmt,
    commission_video_shopee_rate: videoShopeeRate,
    commission_video_shopee_amount: videoShopeeAmt,

    affiliate_link: affLink,
  };
}

// Cari tab Shopee Affiliate dengan prioritas yang tepat
function findShopeeTab(allTabs, extractedItemId) {
  // 1. Jika ada extractedItemId, HANYA cocokkan tab yang URL-nya secara spesifik mengandung extractedItemId!
  // Jangan pernah mengambil tab produk lain agar tidak tertukar!
  if (extractedItemId) {
    const exactTab = allTabs.find((t) => {
      const u = t.url || "";
      return u.includes("affiliate.shopee.") && u.includes(extractedItemId);
    });
    if (exactTab) return exactTab;
    return null; // Return null jika tidak ada tab yang memuat item ID ini
  }

  // 2. Jika tidak ada ID spesifik, cari tab affiliate.shopee yang sedang AKTIF
  const activeTab = allTabs.find((t) => {
    const u = t.url || "";
    return t.active && u.includes("affiliate.shopee.");
  });
  if (activeTab) return activeTab;

  return allTabs.find((t) => (t.url || "").includes("affiliate.shopee."));
}

// Broadcast sinkronisasi ke semua tab Shofiliate yang terbuka
function broadcastProductToShofiliate(product) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs || []) {
      const u = tab.url || "";
      if (tab.id && (u.includes("localhost") || u.includes("127.0.0.1") || u.includes("shofiliate"))) {
        try {
          chrome.tabs.sendMessage(tab.id, {
            source: "shofiliate-companion-background",
            type: "SHOPEE_TAB_SYNCED",
            product,
          });
        } catch (e) {}
      }
    }
  });
}

// Tunggu hingga tab siap dieksekusi script secara responsif (cek document.readyState)
async function waitForTabReady(tabId, maxWaitMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.readyState,
      });
      const state = results?.[0]?.result;
      if (state === "complete" || state === "interactive") {
        return true;
      }
    } catch (e) {
      // Tab mungkin masih inisialisasi navigasi
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// Cari 1 produk by ID atau Nama/URL langsung ke Shopee Affiliate
// Jika tab belum dibuka, ekstensi akan MEMBUKA TAB DI LATAR BELAKANG (active: false),
// mengambil data & shortlink, lalu MENUTUPNYA KEMBALI secara otomatis!
async function searchProductByName(query, region = "ID") {
  const domain = REGION_AFFILIATE_DOMAINS[region] || "affiliate.shopee.co.id";
  const tld = region === "ID" ? "co.id" : "com.my";
  const trimmed = String(query).trim();

  // Deteksi Item ID
  const isNumericId = /^\d+$/.test(trimmed);
  let extractedItemId = isNumericId ? trimmed : "";

  if (!extractedItemId && trimmed.includes("/product/")) {
    const match = trimmed.match(/\/product\/(\d+)\/(\d+)/);
    if (match) extractedItemId = match[2];
  }
  if (!extractedItemId && trimmed.includes("/offer/product_offer/")) {
    const match = trimmed.match(/\/offer\/product_offer\/(\d+)/);
    if (match) extractedItemId = match[1];
  }

  const allTabs = await chrome.tabs.query({});
  let shopeeTab = findShopeeTab(allTabs, extractedItemId);
  let openedTabId = null;

  // JIKA TAB BELUM DIBUKA OLEH USER:
  // Ekstensi membuka tab di background (active: false) agar tidak mengganggu layar user!
  if (!shopeeTab?.id) {
    if (!extractedItemId) {
      throw new Error(
        `Untuk mencari produk secara otomatis, harap masukkan ID Produk Shopee (contoh: 24887965442) atau link produk Shopee.`
      );
    }

    const targetUrl = `https://affiliate.shopee.${tld}/offer/product_offer/${extractedItemId}`;
    const newTab = await chrome.tabs.create({
      url: targetUrl,
      active: false, // Berjalan di latar belakang tanpa mencuri fokus
    });
    openedTabId = newTab.id;
    shopeeTab = newTab;

    // Tunggu tab siap secara responsif (cek document.readyState, maks 4 detik)
    await waitForTabReady(newTab.id, 4000);
    // Beri jeda kecil 600ms agar SPA Shopee menginisialisasi komponen
    await new Promise((r) => setTimeout(r, 600));
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: shopeeTab.id },
      func: runAutomateInPage,
      args: [extractedItemId],
    });

    const data = results?.[0]?.result;
    if (data?.error === "NOT_LOGGED_IN") {
      throw new Error(data.message);
    }

    if (data && (data.productName || data.itemId)) {
      // Broadcast ke tab Shofiliate
      broadcastProductToShofiliate(data);

      return formatProductResult(data, region);
    } else {
      throw new Error(
        `Gagal membaca rincian produk dari Shopee Affiliate. Pastikan akun Shopee Affiliate Anda sudah login di browser Chrome.`
      );
    }
  } catch (scriptErr) {
    throw new Error(
      `Gagal membaca tab Shopee: ${scriptErr instanceof Error ? scriptErr.message : String(scriptErr)}`
    );
  } finally {
    // Selalu tutup background tab yang dibuat secara otomatis oleh ekstensi agar tab browser tetap rapi!
    if (openedTabId) {
      try {
        await chrome.tabs.remove(openedTabId);
      } catch (e) {}
    }
  }
}

// Router pesan dari content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, payload, requestId } = request;
  const tabId = sender.tab?.id;

  if (action === "SYNC_FROM_SHOPEE_TAB") {
    const product = payload;
    if (product?.itemId) {
      chrome.storage.local.set({
        [`shopee_product_${product.itemId}`]: product,
        shopee_latest_product: product,
      });
    }

    // Broadcast ke tab Shofiliate yang sedang dibuka
    chrome.tabs.query({ url: ["http://localhost/*", "http://127.0.0.1/*", "https://*/*"] }, (tabs) => {
      for (const tab of tabs || []) {
        if (tab.id) {
          try {
            chrome.tabs.sendMessage(tab.id, {
              source: "shofiliate-companion-background",
              type: "SHOPEE_TAB_SYNCED",
              product,
            });
          } catch (e) {
            // ignore
          }
        }
      }
    });

    sendResponse({ success: true });
    return true;
  }

  if (action === "CHECK_AUTH") {
    checkShopeeAuth(payload?.region).then((res) => {
      sendResponse(res);
    });
    return true; // async sendResponse
  }

  if (action === "SEARCH_BY_NAME") {
    searchProductByName(payload?.keyword, payload?.region)
      .then((res) => {
        sendResponse({ success: true, product: res });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Gagal mencari produk",
        });
      });
    return true; // async sendResponse
  }

  if (action === "ENRICH_PRODUCTS") {
    const rows = payload?.rows || [];
    const region = payload?.region || "ID";

    enrichProductRows(rows, region, tabId, requestId)
      .then((enrichedRows) => {
        sendResponse({ success: true, rows: enrichedRows });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Gagal memperkaya produk",
        });
      });

    return true; // async sendResponse
  }
});

