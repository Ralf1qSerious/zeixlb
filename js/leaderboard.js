const podiumEl = document.getElementById("podium");
const leaderboardListEl = document.getElementById("leaderboardList");
const lastUpdatedEl = document.getElementById("lastUpdated");
const siteTitleEl = document.getElementById("siteTitle");
const siteSubtitleEl = document.getElementById("siteSubtitle");
const brandLogoEl = document.getElementById("brandLogo");
const countdownLabelEl = document.getElementById("countdownLabel");
const countdownValueEl = document.getElementById("countdownValue");

const promoTitleEl = document.getElementById("promoTitle");
const promoCodeEl = document.getElementById("promoCode");
const promoDescriptionEl = document.getElementById("promoDescription");
const copyPromoButtonEl = document.getElementById("copyPromoButton");

let countdownInterval = null;
let refreshInterval = null;
const CONFIG_URL = "../config.json";

async function loadConfig() {
  const response = await fetch(CONFIG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load config.json (${response.status})`);

  const config = await response.json();
  config.__configBaseUrl = new URL(CONFIG_URL, window.location.href);
  return config;
}

function resolveAssetPath(assetPath, config) {
  if (!assetPath) return "";
  try {
    return new URL(assetPath, config.__configBaseUrl).href;
  } catch {
    return assetPath;
  }
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function fetchLeaderboard(config) {
  const response = await fetch(config.api.url, {
    method: config.api.method || "GET",
    headers: config.api.headers || {},
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    throw new Error(`API request failed (${response.status})${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return response.json();
}

function getValueByPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function getAvatarUrl(item) {
  return (
    item?.avatar ||
    item?.avatarUrl ||
    item?.user?.avatarUrl ||
    item?.user?.avatar ||
    item?.profilePicture ||
    ""
  );
}

function normalizeData(rawData, config) {
  const { root, nameField, scoreField } = config.dataMapping;
  const list = root ? getValueByPath(rawData, root) : rawData;

  if (!Array.isArray(list)) {
    throw new Error("Mapped API result is not an array. Check dataMapping.root.");
  }

  return list
    .map((item) => ({
      name: String(getValueByPath(item, nameField) ?? "Unknown"),
      score: Number(getValueByPath(item, scoreField) ?? 0),
      avatar: String(getAvatarUrl(item) || "")
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
}

function getReward(rank, rewards) {
  return Number(rewards[String(rank)] || 0);
}

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function ordinal(num) {
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rewardHTML(amount, tokenIcon) {
  if (!amount) {
    return `<span class="reward-zero">0</span>`;
  }

  return `
    <img src="${tokenIcon}" alt="Token" />
    <span>${formatNumber(amount, 0)}</span>
  `;
}

function avatarHTML(name, avatar, sizeClass = "") {
  const initial = escapeHtml(String(name).charAt(0).toUpperCase() || "?");

  if (avatar) {
    return `
      <img
        class="avatar ${sizeClass}"
        src="${escapeHtml(avatar)}"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
      />
      <div class="avatar avatar-fallback ${sizeClass}" style="display:none;">${initial}</div>
    `;
  }

  return `<div class="avatar avatar-fallback ${sizeClass}">${initial}</div>`;
}

function renderPodium(data, config) {
  const top3 = [2, 1, 3]
    .map((rank) => data.find((item) => item.rank === rank))
    .filter(Boolean);

  if (!top3.length) {
    podiumEl.innerHTML = `<div class="empty-box">No podium data found.</div>`;
    return;
  }

  const tokenIcon = resolveAssetPath(config.assets.tokenIcon, config);
  const scoreLabel = config.formatting.scoreLabel || "Wagered";
  const decimals = Number(config.formatting.decimalPlaces || 0);

  podiumEl.innerHTML = top3.map((item) => {
    const reward = getReward(item.rank, config.rewards);

    return `
      <article class="podium-card rank-${item.rank}">
        <div class="podium-shine"></div>
        <div class="podium-badge">#${item.rank}</div>

        <div class="podium-topline">${ordinal(item.rank)} Place</div>

        <div class="podium-user">
          <div class="podium-avatar-wrap">
            ${avatarHTML(item.name, item.avatar, "podium-avatar")}
          </div>

          <div class="podium-user-text">
            <div class="podium-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="podium-score">${escapeHtml(scoreLabel)}: ${formatNumber(item.score, decimals)}</div>
          </div>
        </div>

        <div class="podium-divider"></div>

        <div class="reward-pill">
          ${rewardHTML(reward, tokenIcon)}
        </div>
      </article>
    `;
  }).join("");
}

function renderTable(data, config) {
  const rest = data.filter((item) => item.rank >= 4);

  if (!rest.length) {
    leaderboardListEl.innerHTML = `<div class="empty-box">No affiliates below the top 3 yet.</div>`;
    return;
  }

  const tokenIcon = resolveAssetPath(config.assets.tokenIcon, config);
  const decimals = Number(config.formatting.decimalPlaces || 0);

  leaderboardListEl.innerHTML = rest.map((item) => {
    const reward = getReward(item.rank, config.rewards);

    return `
      <div class="row">
        <div class="rank-cell">#${item.rank}</div>
        <div class="name-cell name-cell-with-avatar">
          <div class="table-avatar-wrap">
            ${avatarHTML(item.name, item.avatar, "table-avatar")}
          </div>
          <span class="table-name-text" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        </div>
        <div class="score-cell">${formatNumber(item.score, decimals)}</div>
        <div class="reward-cell">${rewardHTML(reward, tokenIcon)}</div>
      </div>
    `;
  }).join("");
}

function applyBranding(config) {
  document.title = config.site?.title || "Leaderboard";
  siteTitleEl.textContent = config.site?.title || "Leaderboard";
  siteSubtitleEl.textContent = config.site?.subtitle || "Skinrave";
  brandLogoEl.src = resolveAssetPath(config.assets?.logo, config);
}

function applyPromo(config) {
  const promo = config.promo || {};

  if (promoTitleEl) promoTitleEl.textContent = promo.title || "Support with affiliate code";
  if (promoCodeEl) promoCodeEl.textContent = promo.code || "ZEIX";
  if (promoDescriptionEl) {
    promoDescriptionEl.textContent =
      promo.description || "Use code ZEIX on Skinrave and support the affiliate race.";
  }

  if (copyPromoButtonEl) {
    copyPromoButtonEl.textContent = promo.buttonText || "Copy Code";

    copyPromoButtonEl.onclick = async () => {
      try {
        await navigator.clipboard.writeText(promo.code || "ZEIX");
        copyPromoButtonEl.textContent = "Copied!";
        setTimeout(() => {
          copyPromoButtonEl.textContent = promo.buttonText || "Copy Code";
        }, 1500);
      } catch {
        copyPromoButtonEl.textContent = "Copy Failed";
        setTimeout(() => {
          copyPromoButtonEl.textContent = promo.buttonText || "Copy Code";
        }, 1500);
      }
    };
  }
}

function showError(message) {
  const safeMessage = escapeHtml(message);
  podiumEl.innerHTML = `<div class="error-box">${safeMessage}</div>`;
  leaderboardListEl.innerHTML = `<div class="error-box">${safeMessage}</div>`;
}

function formatDuration(ms) {
  if (ms <= 0) return "Ended";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function startCountdown(config) {
  if (countdownInterval) clearInterval(countdownInterval);

  const label = config.event?.label || "Ends in";
  const startDate = config.event?.startDate;
  const endDate = config.event?.endDate;

  if (!endDate) {
    countdownLabelEl.textContent = label;
    countdownValueEl.textContent = "No end date";
    return;
  }

  const startTime = startDate ? new Date(startDate).getTime() : null;
  const endTime = new Date(endDate).getTime();

  function updateCountdown() {
    const now = Date.now();

    if (startTime && now < startTime) {
      countdownLabelEl.textContent = "Starts in";
      countdownValueEl.textContent = formatDuration(startTime - now);
      return;
    }

    countdownLabelEl.textContent = label;
    countdownValueEl.textContent = formatDuration(endTime - now);
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

async function init() {
  try {
    const config = await loadConfig();

    if (config.pages?.maintenanceEnabled) {
      window.location.replace("../maintenance/");
      return;
    }

    if (config.pages?.criticalEnabled) {
      window.location.replace("../critical/");
      return;
    }

    applyBranding(config);
    applyPromo(config);
    startCountdown(config);

    const rawData = await fetchLeaderboard(config);
    const leaderboard = normalizeData(rawData, config);

    renderPodium(leaderboard, config);
    renderTable(leaderboard, config);
    lastUpdatedEl.textContent = formatTimestamp();
  } catch (error) {
    console.error(error);
    showError(error?.message || "Something went wrong while loading the leaderboard.");
    lastUpdatedEl.textContent = "Failed to load";
  }
}

init();

loadConfig()
  .then((config) => {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(init, config.refresh?.intervalMs || 60000);
  })
  .catch(() => {
    refreshInterval = setInterval(init, 60000);
  });