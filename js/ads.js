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

  function createAdToggle(position) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `floating-ad-toggle ${position || "bottom-right"}`;
    toggle.textContent = "Show Ad";
    toggle.setAttribute("aria-label", "Show ad");
    toggle.style.display = "none";
    return toggle;
  }

  function hideAd(container, toggle) {
    container.classList.add("is-hiding");
    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("is-visible");
      container.classList.remove("is-hiding");
      toggle.style.display = "inline-flex";
      toggle.classList.add("is-visible");
    }, 320);
  }

  function showAd(container, toggle) {
    toggle.classList.remove("is-visible");
    toggle.style.display = "none";
    container.style.display = "block";
    requestAnimationFrame(() => {
      container.classList.add("is-visible");
    });
  }

  function renderAd(ad, config, container, toggle) {
    const showHideButton = !!config.style?.showHideButton;
    const showSponsored = !!config.style?.showSponsoredLabel;
    const sponsoredText = config.style?.sponsoredLabelText || "Sponsored";

    const img = ad.image ? `
      <div class="floating-ad-media">
        <img src="${escapeHtml(resolveUrl(ad.image))}" alt="${escapeHtml(ad.title || "Ad")}" loading="lazy">
      </div>
    ` : "";

    const sponsored = showSponsored
      ? `<div class="floating-ad-sponsored">${escapeHtml(sponsoredText)}</div>`
      : "";

    container.innerHTML = `
      <div class="floating-ad-card ${config.style?.glass ? "glass-card" : ""}">
        ${showHideButton ? `<button class="floating-ad-hide" type="button">Hide</button>` : ""}
        ${sponsored}
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

    const hideBtn = container.querySelector(".floating-ad-hide");
    if (hideBtn) {
      hideBtn.addEventListener("click", () => hideAd(container, toggle));
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

    const position = config.position || "bottom-right";
    const wrap = createAdContainer(
      position,
      config.style?.maxWidth || 340,
      !!config.style?.pulse
    );

    const toggle = createAdToggle(position);

    document.body.appendChild(wrap);
    document.body.appendChild(toggle);

    let index = 0;
    renderAd(ads[index], config, wrap, toggle);

    requestAnimationFrame(() => {
      wrap.classList.add("is-visible");
    });

    toggle.addEventListener("click", () => {
      showAd(wrap, toggle);
    });

    if (config.rotation?.enabled && ads.length > 1) {
      setInterval(() => {
        if (!document.body.contains(wrap)) return;
        if (wrap.style.display === "none") return;
        index = (index + 1) % ads.length;
        renderAd(ads[index], config, wrap, toggle);
      }, Number(config.rotation.intervalMs || 7000));
    }
  } catch (error) {
    console.error("Ads failed to load:", error);
  }
})();
