/**
 * Shofiliate Companion - Shopee Main World Interceptor
 * Berjalan di context window utama Shopee Affiliate untuk menangkap response API saat tombol "Buat Link" diklik
 */

(function () {
  console.log("[Shofiliate] Shopee Main World Interceptor loaded");

  // Intercept window.fetch
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const clone = res.clone();
      clone
        .json()
        .then((data) => {
          // Cari shortLink dari berbagai struktur GraphQL/REST Shopee
          const shortLink =
            data?.data?.batchCustomLink?.[0]?.shortLink ||
            data?.data?.batchGetCustomLink?.[0]?.shortLink ||
            data?.data?.customLink?.shortLink ||
            data?.data?.shortLink ||
            data?.data?.short_link ||
            data?.shortLink ||
            data?.short_link;

          if (shortLink && typeof shortLink === "string") {
            console.log("[Shofiliate] Captured real shortlink via fetch:", shortLink);
            window.postMessage(
              {
                source: "shofiliate-shopee-interceptor",
                type: "CAPTURED_SHOPEE_SHORTLINK",
                shortLink,
              },
              "*"
            );
          }
        })
        .catch(() => {});
    } catch (e) {
      // ignore
    }
    return res;
  };

  // Intercept XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function () {
    this._shofiliateUrl = arguments[1];
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", function () {
      try {
        if (this.responseText) {
          const data = JSON.parse(this.responseText);
          const shortLink =
            data?.data?.batchCustomLink?.[0]?.shortLink ||
            data?.data?.batchGetCustomLink?.[0]?.shortLink ||
            data?.data?.customLink?.shortLink ||
            data?.data?.shortLink ||
            data?.data?.short_link ||
            data?.shortLink ||
            data?.short_link;

          if (shortLink && typeof shortLink === "string") {
            console.log("[Shofiliate] Captured real shortlink via XHR:", shortLink);
            window.postMessage(
              {
                source: "shofiliate-shopee-interceptor",
                type: "CAPTURED_SHOPEE_SHORTLINK",
                shortLink,
              },
              "*"
            );
          }
        }
      } catch (e) {
        // ignore
      }
    });
    return origSend.apply(this, arguments);
  };

  // Intercept navigator.clipboard.writeText saat tombol 'Salin Link' diklik
  if (navigator.clipboard && navigator.clipboard.writeText) {
    const origClipboardWrite = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function (text) {
      if (text && typeof text === "string" && (text.includes("s.shopee.") || text.includes("shope.ee") || text.includes("shopee."))) {
        const m = text.match(/https:\/\/(s\.shopee\.[a-z.]+|shope\.ee)\/[a-zA-Z0-9_-]+/i);
        const link = m ? m[0].trim() : text.trim();
        console.log("[Shofiliate Main World] Captured shortlink via clipboard:", link);
        window.postMessage(
          {
            source: "shofiliate-shopee-interceptor",
            type: "CAPTURED_SHOPEE_SHORTLINK",
            shortLink: link,
          },
          "*"
        );
      }
      return origClipboardWrite.apply(this, arguments);
    };
  }
})();
