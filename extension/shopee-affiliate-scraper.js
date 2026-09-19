/**
 * Shofiliate Companion - Shopee Affiliate Portal Scraper
 * Berjalan otomatis saat streamer membuka portal Shopee Affiliate (affiliate.shopee.co.id dsb)
 */

(function () {
  console.log("[Shofiliate] Shopee Affiliate Scraper & Link Automator Active on:", window.location.href);

  let capturedShortLinkFromPage = null;

  // Dengarkan pesan dari main world interceptor (fetch / XHR)
  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.data?.source === "shofiliate-shopee-interceptor" &&
      event.data?.type === "CAPTURED_SHOPEE_SHORTLINK" &&
      event.data?.shortLink
    ) {
      capturedShortLinkFromPage = event.data.shortLink;
      console.log("[Shofiliate] Scraper received shortlink:", capturedShortLinkFromPage);
    }
  });

  // Hook clipboard.writeText jika Shopee menyalin link langsung
  if (navigator.clipboard) {
    const origWrite = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function (text) {
      if (text && typeof text === "string" && (text.includes("shopee") || text.includes("http"))) {
        capturedShortLinkFromPage = text.trim();
        console.log("[Shofiliate] Intercepted clipboard copy:", capturedShortLinkFromPage);
      }
      if (origWrite) {
        try {
          return await origWrite.apply(this, arguments);
        } catch (e) {}
      }
    };
  }

  const isOurElement = (el) => {
    if (!el) return false;
    if (el.id === "shofiliate-floating-btn" || el.id === "shofiliate-floating-container") return true;
    if (el.closest?.("#shofiliate-floating-container")) return true;
    const txt = (el.innerText || el.textContent || "").toLowerCase();
    if (txt.includes("shofiliate") || txt.includes("buat link & kirim")) return true;
    return false;
  };

  // Helper fungsi untuk mengenali tombol "Dapatkan Pautan" / "Buat Link" / "Get Link" di berbagai bahasa
  const isGetLinkText = (text) => {
    if (!text) return false;
    const t = text.trim().toLowerCase();
    if (t.includes("shofiliate") || t.length > 35) return false;
    return (
      // Malay (MY): Dapatkan Pautan, Jana Pautan, Pautan Tawaran
      t === "dapatkan pautan" ||
      t.includes("dapatkan pautan") ||
      t.includes("pautan tawaran") ||
      t.includes("jana pautan") ||
      // Indonesia (ID): Buat Link, Dapatkan Link, Dapatkan Tautan, Buat Tautan
      t === "buat link" ||
      t.includes("buat link") ||
      t === "dapatkan link" ||
      t.includes("dapatkan link") ||
      t === "dapatkan tautan" ||
      t.includes("dapatkan tautan") ||
      t === "buat tautan" ||
      t.includes("buat tautan") ||
      // English (SG, MY, PH, Global): Get Link, Get offer link, Generate Link, Custom Link
      t === "get link" ||
      t.includes("get link") ||
      t === "get offer link" ||
      t.includes("get offer link") ||
      t === "generate link" ||
      t === "custom link" ||
      // Thailand (TH)
      t.includes("รับลิงก์") ||
      t.includes("สร้างลิงก์") ||
      t.includes("แชร์ลิงก์") ||
      // Vietnam (VN)
      t.includes("lấy link") ||
      t.includes("tạo link") ||
      t.includes("chia sẻ link") ||
      // Chinese (TW, SG, MY, CN)
      t.includes("获取链接") ||
      t.includes("取得連結") ||
      t.includes("生成链接") ||
      t.includes("產生連結") ||
      // Portuguese (BR)
      t.includes("obter link") ||
      t.includes("gerar link")
    );
  };

  // Helper fungsi untuk mengenali tombol "Salin Pautan" / "Salin Link" / "Copy Link" di berbagai bahasa
  const isCopyLinkText = (text) => {
    if (!text) return false;
    const t = text.trim().toLowerCase();
    if (t.includes("shofiliate") || t.length > 30) return false;
    return (
      // Malay (MY): Salin Pautan, Salin
      t === "salin pautan" ||
      t.includes("salin pautan") ||
      // Indonesia (ID): Salin Link, Salin Tautan, Salin
      t === "salin link" ||
      t.includes("salin link") ||
      t === "salin tautan" ||
      t.includes("salin tautan") ||
      t === "salin" ||
      // English (SG, MY, PH, Global): Copy Link, Copy
      t === "copy link" ||
      t.includes("copy link") ||
      t === "copy" ||
      // Thailand (TH)
      t.includes("คัดลอกลิงก์") ||
      t.includes("คัดลอก") ||
      // Vietnam (VN)
      t.includes("sao chép link") ||
      t.includes("sao chép") ||
      // Chinese (TW, SG, MY, CN)
      t.includes("复制链接") ||
      t.includes("複製連結") ||
      t.includes("复制") ||
      t.includes("複製") ||
      // Portuguese (BR)
      t.includes("copiar link") ||
      t.includes("copiar")
    );
  };

  // Helper fungsi untuk mengenali tombol Close / Tutup modal di berbagai bahasa
  const isCloseModalButton = (el) => {
    if (isOurElement(el)) return false;
    const t = (el.textContent || el.innerText || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    return (
      t === "batal" ||
      t === "tutup" ||
      t === "close" ||
      t === "cancel" ||
      t === "tutup pautan" ||
      t === "ยกเลิก" ||
      t === "ปิด" ||
      t === "hủy" ||
      t === "đóng" ||
      t === "取消" ||
      t === "关闭" ||
      t === "fechar" ||
      aria === "close" ||
      aria === "tutup" ||
      el.className?.includes?.("close") ||
      el.className?.includes?.("modal-close")
    );
  };

  // 1. Ekstraksi Data Produk & Tabel Komisi
  function extractProductOfferData() {
    const pathname = window.location.pathname;
    const urlMatch = pathname.match(/\/offer\/product_offer\/(\d+)/);
    const itemId = urlMatch ? urlMatch[1] : null;

    if (!itemId) return null;

    const tld = window.location.hostname.includes(".com.my") ? "com.my" : "co.id";
    const productUrl = `https://shopee.${tld}/product/0/${itemId}`;

    // A. Ambil Judul Produk Asli (Wajib menolak teks Shofiliate / Buat Link / Dapatkan Pautan / Get Link)
    let productName = "";
    const allLinks = Array.from(document.querySelectorAll("a, button, span"));
    const lihatProdukLink = allLinks.find((el) => {
      if (isOurElement(el)) return false;
      const t = (el.textContent || "").trim().toLowerCase();
      return t === "lihat produk" || t === "view product";
    });
    if (lihatProdukLink) {
      if (lihatProdukLink.previousElementSibling && !isOurElement(lihatProdukLink.previousElementSibling)) {
        const prevTxt = (lihatProdukLink.previousElementSibling.textContent || "").trim();
        if (prevTxt && !isGetLinkText(prevTxt) && !prevTxt.toLowerCase().includes("shofiliate")) {
          productName = prevTxt;
        }
      }
      if (!productName && lihatProdukLink.parentElement) {
        const parentTxt = lihatProdukLink.parentElement.textContent
          .replace(/Lihat Produk/i, "")
          .replace(/View Product/i, "")
          .trim();
        if (parentTxt && !isGetLinkText(parentTxt) && !parentTxt.toLowerCase().includes("shofiliate")) {
          productName = parentTxt;
        }
      }
    }

    if (!productName || isGetLinkText(productName) || productName.toLowerCase().includes("shofiliate")) {
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, div, span, p"));
      for (const h of headings) {
        if (isOurElement(h)) continue;
        const text = (h.textContent || "").trim();
        if (
          text.length > 10 &&
          !text.toLowerCase().includes("shofiliate") &&
          !isGetLinkText(text) &&
          !text.includes("Rincian Tawaran") &&
          !text.includes("Rincian Komisi") &&
          !text.includes("Butiran Komisen") &&
          !text.includes("Butiran Tawaran") &&
          !text.includes("Offer Details") &&
          !text.includes("Commission Details") &&
          !text.includes("Penawaran") &&
          !text.includes("Halaman Utama") &&
          !text.includes("Bahasa") &&
          h.children.length === 0
        ) {
          productName = text;
          break;
        }
      }
    }

    // B. Ambil Harga Produk Asli (Mendukung Rp, RM, S$, dsb)
    let price = 0;
    const priceEls = Array.from(document.querySelectorAll("*")).filter((el) => {
      if (isOurElement(el)) return false;
      const txt = (el.textContent || "").trim();
      return el.children.length === 0 && /^(?:Rp|RM|S\$|\$|฿|₱|₫)\s*[\d.,]+/i.test(txt);
    });
    if (priceEls.length > 0) {
      const pText = priceEls[0].textContent.trim();
      const m = pText.match(/(?:Rp|RM|S\$|\$|฿|₱|₫)\s*([\d.,]+)/i);
      if (m) {
        const numStr = m[1].trim();
        if (numStr.includes(".") && numStr.split(".")[1]?.length === 3) {
          price = parseFloat(numStr.replace(/\./g, "")) || 0;
        } else {
          price = parseFloat(numStr.replace(/,/g, "")) || 0;
        }
      }
    }

    // C. Ekstraksi Tabel Rincian Komisi (Mendukung 3 Kolom atau 4 Kolom)
    let allRows = Array.from(document.querySelectorAll("tr, [role='row']")).filter((r) => !isOurElement(r));
    if (allRows.length === 0) {
      allRows = Array.from(document.querySelectorAll("div")).filter((d) => {
        if (isOurElement(d)) return false;
        const t = d.textContent || "";
        return (
          (t.toLowerCase().includes("live") || t.toLowerCase().includes("social") || t.toLowerCase().includes("video")) &&
          d.children.length >= 2 &&
          d.children.length <= 6
        );
      });
    }

    let xtraColIdx = 1;
    let shopeeColIdx = -1;
    let estColIdx = 2;

    const headerRow = allRows.find((r) => {
      const txt = (r.textContent || "").toLowerCase();
      return (
        txt.includes("jenis platform") ||
        txt.includes("platform type") ||
        txt.includes("platform") ||
        txt.includes("ประเภทแพลตฟอร์ม") ||
        txt.includes("loại nền tảng") ||
        txt.includes("平台类型") ||
        txt.includes("平台類型")
      );
    });
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
        if (lower.includes("xtra") || lower.includes("extra") || lower.includes("ekstra")) {
          xtraColIdx = idx;
        } else if (
          lower.includes("komisi shopee") ||
          lower.includes("komisen shopee") ||
          lower.includes("shopee commission") ||
          lower === "komisi" ||
          lower === "komisen" ||
          lower === "commission" ||
          lower.includes("ค่าคอมมิชชั่น") ||
          lower.includes("hoa hồng") ||
          lower.includes("佣金")
        ) {
          shopeeColIdx = idx;
        } else if (
          lower.includes("estimasi") ||
          lower.includes("anggaran") ||
          lower.includes("estimated") ||
          lower.includes("est.") ||
          lower.includes("ประมาณการ") ||
          lower.includes("ước tính") ||
          lower.includes("预估")
        ) {
          estColIdx = idx;
        }
      });
    }

    const parseRateAmt = (str) => {
      if (!str) return { rate: 0, amt: 0, raw: "" };
      const rateMatch = str.match(/([\d,.]+)\s*%/);
      const amtMatch = str.match(/(?:Rp|RM|S\$|\$|฿|₱|₫)\s*([\d,.]+)/i) || str.match(/([\d,.]+)/);
      const rate = rateMatch ? parseFloat(rateMatch[1].replace(",", ".")) : 0;
      let amt = 0;
      if (amtMatch) {
        const numStr = amtMatch[1].trim();
        if (numStr.includes(".") && numStr.split(".")[1]?.length === 3) {
          amt = parseFloat(numStr.replace(/\./g, "")) || 0;
        } else {
          amt = parseFloat(numStr.replace(/,/g, "")) || 0;
        }
      }
      return { rate, amt, raw: str };
    };

    const parsePlatformRow = (keywords) => {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const row = allRows.find((r) => {
        const txt = (r.textContent || "").toLowerCase();
        return list.some((k) => txt.includes(k.toLowerCase())) &&
          !txt.includes("jenis platform") &&
          !txt.includes("platform type") &&
          !txt.includes("ประเภทแพลตฟอร์ม") &&
          !txt.includes("loại nền tảng") &&
          !txt.includes("平台类型");
      });
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
          : { rate: 0, amt: 0, raw: "0%" };
      const est = parseRateAmt(cells[estColIdx] || cells[cells.length - 1] || "");

      return {
        xtraRate: xtra.rate,
        xtraAmount: xtra.amt,
        shopeeRate: shopee.rate,
        shopeeAmount: shopee.amt,
        estimatedAmount: est.amt || (xtra.amt + shopee.amt),
        rawXtra: xtra.raw || "",
        rawShopee: shopee.raw || "0%",
        rawEst: est.raw || "",
      };
    };

    const liveData = parsePlatformRow(["Shopee Live", "Live", "Siaran Langsung", "直播"]);
    const socialData = parsePlatformRow(["Media Sosial", "Social Media", "Social", "Sosmed", "Mạng xã hội", "โซเชียล", "社交媒体", "社群媒體"]);
    const videoData = parsePlatformRow(["Shopee Video", "Video", "วิดีโอ", "短视频", "短影音"]);

    const validAffLink = (capturedShortLinkFromPage && !capturedShortLinkFromPage.includes("/offer/product_offer/"))
      ? capturedShortLinkFromPage
      : "";

    return {
      itemId,
      productName: productName || `Produk Shopee #${itemId}`,
      productUrl,
      price,
      hasShopeeColumn: shopeeColIdx !== -1,
      live: liveData,
      social: socialData,
      video: videoData,
      affiliateLink: validAffLink,
      scrapedAt: Date.now(),
    };
  }

  // 2. Automasi: Klik Tombol "Buat Link" dan "Salin Link" di Halaman Shopee
  async function automateBuatLinkAndCopy() {
    console.log("[Shofiliate] Menjalankan automasi klik 'Buat Link' & 'Salin Link'...");

    // Fungsi scan shortlink dari berbagai elemen DOM
    function scanModalShortlink() {
      // A. Cek semua textarea (seperti di modal 'Link Penawaran Produk')
      const textareas = Array.from(document.querySelectorAll("textarea"));
      for (const ta of textareas) {
        const val = (ta.value || ta.textContent || ta.innerText || "").trim();
        const m = val.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
        if (m) {
          capturedShortLinkFromPage = m[0].trim();
          return capturedShortLinkFromPage;
        }
      }

      // B. Cek semua input
      const inputs = Array.from(document.querySelectorAll("input"));
      for (const inp of inputs) {
        const val = (inp.value || inp.getAttribute("value") || inp.textContent || inp.innerText || "").trim();
        const m = val.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
        if (m) {
          capturedShortLinkFromPage = m[0].trim();
          return capturedShortLinkFromPage;
        }
      }

      // C. Cek seluruh container modal yang sedang terbuka
      const modals = Array.from(document.querySelectorAll(".shopee-modal, .ant-modal, [role='dialog'], div[class*='modal'], div[class*='dialog']"));
      for (const mod of modals) {
        const mText = (mod.innerText || mod.textContent || "").match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
        if (mText) {
          capturedShortLinkFromPage = mText[0].trim();
          return capturedShortLinkFromPage;
        }
        const mHtml = (mod.innerHTML || "").match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
        if (mHtml) {
          capturedShortLinkFromPage = mHtml[0].trim();
          return capturedShortLinkFromPage;
        }
      }

      // D. Cek document body innerHTML
      const html = document.body ? document.body.innerHTML : "";
      const mHtml = html.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
      if (mHtml) {
        capturedShortLinkFromPage = mHtml[0].trim();
        return capturedShortLinkFromPage;
      }

      if (capturedShortLinkFromPage && !capturedShortLinkFromPage.includes("/offer/product_offer/")) {
        return capturedShortLinkFromPage;
      }
      return null;
    }

    let link = scanModalShortlink();

    // A. Cari tombol "Buat Link" / "Dapatkan Pautan" / "Get Link" jika belum ada modal terbuka
    if (!link) {
      const candidates = Array.from(document.querySelectorAll("button, [role='button'], a, div, span"));
      const buatLinkBtn = candidates.find((el) => {
        if (el.id === "shofiliate-floating-btn" || el.closest("#shofiliate-floating-container")) return false;
        const t = el.textContent || el.innerText || "";
        return isGetLinkText(t);
      });

      if (buatLinkBtn) {
        const target = buatLinkBtn.closest("button") || buatLinkBtn.closest("[role='button']") || buatLinkBtn;
        target.dispatchEvent(new MouseEvent("click", { view: window, bubbles: true, cancelable: true }));
        try { target.click(); } catch (e) {}
      }

      // B. Tunggu modal Shopee muncul dan ambil link (hingga 3.5 detik)
      for (let i = 0; i < 25; i++) {
        await new Promise((res) => setTimeout(res, 150));
        link = scanModalShortlink();

        // Cari tombol "Salin Pautan" / "Salin Link" / "Copy Link" di modal dan klik untuk memicu copy
        const modalButtons = Array.from(document.querySelectorAll("button, [role='button'], a, div, span"));
        const salinBtn = modalButtons.find((b) => {
          if (b.id === "shofiliate-floating-btn" || b.closest("#shofiliate-floating-container")) return false;
          const t = b.textContent || b.innerText || "";
          return isCopyLinkText(t);
        });
        if (salinBtn) {
          const salinTarget = salinBtn.closest("button") || salinBtn.closest("[role='button']") || salinBtn;
          salinTarget.dispatchEvent(new MouseEvent("click", { view: window, bubbles: true, cancelable: true }));
          try { salinTarget.click(); } catch (e) {}
        }

        if (!link) {
          link = scanModalShortlink();
        }

        if (link) break;
      }
    }

    // C. Tutup modal secara otomatis setelah shortlink didapatkan
    if (link) {
      setTimeout(() => {
        try {
          const closeButtons = Array.from(document.querySelectorAll("button, span, i, div[role='button']"));
          const closeBtn = closeButtons.find((b) => isCloseModalButton(b));
          if (closeBtn) {
            closeBtn.click();
          } else {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })
            );
          }
        } catch (e) {}
      }, 500);
    }

    const productData = extractProductOfferData();
    if (productData) {
      if (link) {
        productData.affiliateLink = link;
      }
      safeStorageSet({
        [`shopee_product_${productData.itemId}`]: productData,
        shopee_latest_product: productData,
      });
    }

    return productData;
  }

  // 3. Simpan data saat ini ke chrome.storage.local secara aman
  function saveCurrentProductData() {
    if (!isExtensionValid()) return;
    const data = extractProductOfferData();
    if (data && data.itemId) {
      safeStorageSet({
        [`shopee_product_${data.itemId}`]: data,
        shopee_latest_product: data,
      });
    }
  }

  function isExtensionValid() {
    try {
      return !!(typeof chrome !== "undefined" && chrome?.runtime && chrome?.runtime?.id);
    } catch (e) {
      return false;
    }
  }

  function safeStorageSet(obj) {
    if (!isExtensionValid()) return;
    try {
      chrome.storage.local.set(obj, () => {
        if (chrome.runtime?.lastError) {
          // ignore
        }
      });
    } catch (e) {
      // ignore context invalidated
    }
  }

  // Inisialisasi awal jika ekstensi masih valid
  if (isExtensionValid()) {
    setTimeout(saveCurrentProductData, 1200);
  }

  // Bersihkan floating button dari DOM agar halaman Shopee tetap bersih (Alur 2)
  try {
    const existing = document.getElementById("shofiliate-floating-container");
    if (existing) existing.remove();
  } catch (e) {}

  // 5. Dengarkan permintaan automasi dari background worker
  if (isExtensionValid()) {
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!isExtensionValid()) return false;

        if (request.action === "SCRAPE_CURRENT_PAGE") {
          const data = extractProductOfferData();
          sendResponse({ success: true, data });
          return true;
        }

        if (request.action === "AUTOMATE_BUAT_LINK_AND_SCRAPE") {
          automateBuatLinkAndCopy().then((data) => {
            sendResponse({ success: true, data });
          });
          return true; // async
        }
      });
    } catch (e) {
      // ignore
    }
  }
})();
