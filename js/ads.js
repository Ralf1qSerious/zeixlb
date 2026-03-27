(async function initAds() {
  const ADS_CONFIG_URL = "/adsconfig.json";

  function getPageType() {
    const path = window.location.pathname;

    if (path === "/" || path === "/index.html") return "home";
    if (path.startsWith("/leaderboard")) return "leaderboard";
    if (path.startsWith("/maintenance")) return "maintenance";
    if (path.startsWith("/critical")) return "critical";
    return "other";
  }

  function resolveUrl(path) {
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createAdContainer(position, maxWidth, pulse) {
    const wrap = document.createElement("div");
    wrap.className = `floating-ad-wrap ${position || "bottom-right"}${pulse ? " pulse" : ""}`;
    wrap.style.setProperty("--ad-max-width", `${maxWidth || 340}px`);
    return wrap;
  }

  function renderAd(ad, config, container) {
    const showClose = !!config.style?.showCloseButton;
    const img = ad.image ? `
      <div class="floating-ad-media">
        <img src="${escapeHtml(resolveUrl(ad.image))}" alt="${escapeHtml(ad.title || "Ad")}" loading="lazy">
      </div>
    ` : "";

    container.innerHTML = `
      <div class="floating-ad-card ${config.style?.glass ? "glass-card" : ""}">
        ${showClose ? `<button class="floating-ad-close" type="button" aria-label="Close ad">×</button>` : ""}
        ${img}
        <div class="floating-ad-content">
          <div class="floating-ad-title">${escapeHtml(ad.title || "Advertisement")}</div>
          <div class="floating-ad-text">${escapeHtml(ad.text || "")}</div>
          ${ad.secondaryText ? `<div class="floating-ad-secondary">${escapeHtml(ad.secondaryText)}</div>` : ""}
          ${ad.buttonText && ad.buttonUrl ? `
            <a class="floating-ad-button" href="${escapeHtml(ad.buttonUrl)}" target="${String(ad.buttonUrl).startsWith("http") ? "_blank" : "_self"}" ${String(ad.buttonUrl).startsWith("http") ? 'rel="noopener noreferrer"' : ""}>
              ${escapeHtml(ad.buttonText)}
            </a>
          ` : ""}
        </div>
      </div>
    `;

    const closeBtn = container.querySelector(".floating-ad-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        container.remove();
      });
    }
  }

  try {
    const res = await fetch(ADS_CONFIG_URL, { cache: "no-store" });
    if (!res.ok) return;

    const config = await res.json();
    if (!config.enabled) return;

    const pageType = getPageType();
    if (!config.showOn?.[pageType]) return;

    const ads = Array.isArray(config.ads) ? config.ads.filter(ad => ad && ad.enabled) : [];
    if (!ads.length) return;

    const wrap = createAdContainer(
      config.position || "bottom-right",
      config.style?.maxWidth || 340,
      !!config.style?.pulse
    );

    document.body.appendChild(wrap);

    let index = 0;
    renderAd(ads[index], config, wrap);

    if (config.rotation?.enabled && ads.length > 1) {
      setInterval(() => {
        index = (index + 1) % ads.length;
        renderAd(ads[index], config, wrap);
      }, Number(config.rotation.intervalMs || 7000));
    }
  } catch (error) {
    console.error("Ads failed to load:", error);
  }
})();
