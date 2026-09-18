document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("app-container");
  const refreshBtn = document.getElementById("btn-refresh");

  const REGIONS = [
    { code: "MY", name: "Malaysia", flag: "🇲🇾", domain: "affiliate.shopee.com.my" },
    { code: "SG", name: "Singapura", flag: "🇸🇬", domain: "affiliate.shopee.sg" },
    { code: "ID", name: "Indonesia", flag: "🇮🇩", domain: "affiliate.shopee.co.id" },
    { code: "TH", name: "Thailand", flag: "🇹🇭", domain: "affiliate.shopee.co.th" },
    { code: "PH", name: "Filipina", flag: "🇵🇭", domain: "affiliate.shopee.ph" },
    { code: "VN", name: "Vietnam", flag: "🇻🇳", domain: "affiliate.shopee.vn" },
  ];

  async function checkAllAuth() {
    container.innerHTML = `
      <div class="loading-state">
        Memeriksa sesi login di 6 portal Shopee...
      </div>
    `;

    try {
      const results = await Promise.all(
        REGIONS.map((r) => {
          return new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: "CHECK_AUTH", payload: { region: r.code } },
              (res) => {
                resolve({
                  ...r,
                  authenticated: Boolean(res?.authenticated),
                  user: res?.user || null,
                });
              }
            );
          });
        })
      );

      renderView(results);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="color: #f87171; font-size: 11px;">
          Gagal memeriksa status login. Pastikan browser mendukung ekstensi ini.
        </div>
      `;
    }
  }

  function renderView(results) {
    const activeSessions = results.filter((r) => r.authenticated);

    if (activeSessions.length > 0) {
      // KONDISI 1: Pengguna sudah login di satu atau beberapa region
      let sessionsHtml = activeSessions
        .map(
          (s) => `
          <div class="session-item">
            <div class="session-info">
              <span class="session-country">${s.flag} Shopee Affiliate ${s.name} (${s.code})</span>
              <span class="session-user">${s.user ? `Akun: ${s.user}` : "Sesi Aktif"}</span>
            </div>
            <span class="status-badge status-online">
              <span class="dot dot-online"></span> Login
            </span>
          </div>
        `
        )
        .join("");

      let buttonsHtml = activeSessions
        .map(
          (s) => `
          <a href="https://${s.domain}" target="_blank" class="btn-primary">
            Buka Shopee Affiliate (${s.code})
          </a>
        `
        )
        .join("");

      // Dropdown untuk portal lain jika ingin membuka negara berbeda
      const otherRegions = results.filter((r) => !r.authenticated);
      let otherSectionHtml = "";

      if (otherRegions.length > 0) {
        const optionsHtml = otherRegions
          .map((r) => `<option value="${r.domain}" data-code="${r.code}">${r.flag} ${r.name} (${r.code})</option>`)
          .join("");

        otherSectionHtml = `
          <div class="other-section">
            <div class="other-label">Buka portal negara lain:</div>
            <select id="other-portal-select" class="select-dropdown">
              ${optionsHtml}
            </select>
            <a id="btn-open-other" href="https://${otherRegions[0].domain}" target="_blank" class="btn-primary" style="background: #334155;">
              Buka Shopee Affiliate (${otherRegions[0].code})
            </a>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="card">
          <div style="font-size: 11px; font-weight: 600; color: #4ade80; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            <span class="dot dot-online"></span> Sesi Aktif Terdeteksi
          </div>
          ${sessionsHtml}
        </div>
        ${buttonsHtml}
        ${otherSectionHtml}
      `;

      // Event listener dropdown portal lain
      const otherSelect = document.getElementById("other-portal-select");
      const otherBtn = document.getElementById("btn-open-other");
      if (otherSelect && otherBtn) {
        otherSelect.addEventListener("change", () => {
          const selectedOption = otherSelect.options[otherSelect.selectedIndex];
          const domain = otherSelect.value;
          const code = selectedOption.getAttribute("data-code");
          otherBtn.href = `https://${domain}`;
          otherBtn.textContent = `Buka Shopee Affiliate (${code})`;
        });
      }
    } else {
      // KONDISI 2: Belum login di portal mana pun
      const optionsHtml = REGIONS.map(
        (r, idx) => `<option value="${r.domain}" data-code="${r.code}" ${idx === 0 ? "selected" : ""}>${r.flag} Shopee Affiliate ${r.name} (${r.code})</option>`
      ).join("");

      container.innerHTML = `
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600; font-size: 11px; color: #f8fafc;">Status Sesi</span>
            <span class="status-badge status-offline">
              <span class="dot dot-offline"></span> Belum Login
            </span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">
            Pilih portal negara yang ingin Anda buka:
          </div>
          <select id="portal-select" class="select-dropdown">
            ${optionsHtml}
          </select>
        </div>
        <a id="btn-open-portal" href="https://${REGIONS[0].domain}" target="_blank" class="btn-primary">
          Buka Shopee Affiliate (${REGIONS[0].code})
        </a>
      `;

      const portalSelect = document.getElementById("portal-select");
      const openBtn = document.getElementById("btn-open-portal");
      if (portalSelect && openBtn) {
        portalSelect.addEventListener("change", () => {
          const selectedOption = portalSelect.options[portalSelect.selectedIndex];
          const domain = portalSelect.value;
          const code = selectedOption.getAttribute("data-code");
          openBtn.href = `https://${domain}`;
          openBtn.textContent = `Buka Shopee Affiliate (${code})`;
        });
      }
    }
  }

  refreshBtn.addEventListener("click", () => {
    checkAllAuth();
  });

  checkAllAuth();
});
