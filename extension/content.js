/**
 * Shofiliate Companion - Content Script
 * Jembatan komunikasi antara Shofiliate Web App dan Chrome Extension Background Worker
 */

(function () {
  function isExtensionValid() {
    try {
      return !!(typeof chrome !== "undefined" && chrome?.runtime && chrome?.runtime?.id);
    } catch (e) {
      return false;
    }
  }

  // Beritahu web page bahwa extension aktif
  function announceExtension() {
    if (!isExtensionValid()) return;
    try {
      window.postMessage(
        {
          source: "shofiliate-companion-extension",
          type: "SHOFILIATE_EXTENSION_READY",
          version: "1.0.0",
        },
        "*"
      );
    } catch (e) {
      // ignore
    }
  }

  announceExtension();

  // Dengarkan pesan dari Web Application (React / Next.js)
  window.addEventListener("message", (event) => {
    // Pastikan pesan berasal dari window yang sama
    if (event.source !== window || !event.data || typeof event.data !== "object") {
      return;
    }

    const { target, type, payload, requestId } = event.data;
    if (target !== "shofiliate-companion-extension") {
      return;
    }

    if (type === "PING") {
      if (!isExtensionValid()) return;
      window.postMessage(
        {
          source: "shofiliate-companion-extension",
          requestId,
          type: "PONG",
          version: "1.0.0",
        },
        "*"
      );
      return;
    }

    if (!isExtensionValid()) {
      window.postMessage(
        {
          source: "shofiliate-companion-extension",
          requestId,
          type: type === "ENRICH_PRODUCTS" ? "ENRICH_PRODUCTS_ERROR" : "SEARCH_BY_NAME_RESULT",
          error: "Ekstensi telah dimuat ulang. Silakan refresh (F5) tab browser ini.",
          result: { success: false, error: "Ekstensi telah dimuat ulang. Silakan refresh (F5) tab browser ini." },
        },
        "*"
      );
      return;
    }

    if (type === "CHECK_SHOPEE_AUTH") {
      try {
        chrome.runtime.sendMessage(
          { action: "CHECK_AUTH", payload },
          (response) => {
            if (chrome.runtime?.lastError) {
              window.postMessage(
                {
                  source: "shofiliate-companion-extension",
                  requestId,
                  type: "CHECK_SHOPEE_AUTH_RESPONSE",
                  result: { authenticated: false, reason: chrome.runtime.lastError.message },
                },
                "*"
              );
              return;
            }
            window.postMessage(
              {
                source: "shofiliate-companion-extension",
                requestId,
                type: "CHECK_SHOPEE_AUTH_RESPONSE",
                result: response,
              },
              "*"
            );
          }
        );
      } catch (e) {
        // context invalidated
      }
      return;
    }

    if (type === "SEARCH_BY_NAME") {
      try {
        chrome.runtime.sendMessage(
          { action: "SEARCH_BY_NAME", payload, requestId },
          (response) => {
            if (chrome.runtime?.lastError) {
              window.postMessage(
                {
                  source: "shofiliate-companion-extension",
                  requestId,
                  type: "SEARCH_BY_NAME_RESULT",
                  result: { success: false, error: chrome.runtime.lastError.message },
                },
                "*"
              );
              return;
            }
            window.postMessage(
              {
                source: "shofiliate-companion-extension",
                requestId,
                type: "SEARCH_BY_NAME_RESULT",
                result: response,
              },
              "*"
            );
          }
        );
      } catch (e) {
        // context invalidated
      }
      return;
    }

    if (type === "ENRICH_PRODUCTS") {
      try {
        chrome.runtime.sendMessage(
          { action: "ENRICH_PRODUCTS", payload, requestId },
          (response) => {
            if (chrome.runtime?.lastError) {
              window.postMessage(
                {
                  source: "shofiliate-companion-extension",
                  requestId,
                  type: "ENRICH_PRODUCTS_ERROR",
                  error: chrome.runtime.lastError.message,
                },
                "*"
              );
            } else {
              window.postMessage(
                {
                  source: "shofiliate-companion-extension",
                  requestId,
                  type: "ENRICH_PRODUCTS_RESULT",
                  result: response,
                },
                "*"
              );
            }
          }
        );
      } catch (e) {
        // context invalidated
      }
      return;
    }
  });

  // Dengarkan pesan streaming (progress) dari background worker ke web
  if (isExtensionValid()) {
    try {
      chrome.runtime.onMessage.addListener((message) => {
        if (!isExtensionValid()) return;
        if (message && message.source === "shofiliate-companion-background") {
          window.postMessage(
            {
              source: "shofiliate-companion-extension",
              ...message,
            },
            "*"
          );
        }
      });
    } catch (e) {
      // context invalidated
    }
  }
})();
