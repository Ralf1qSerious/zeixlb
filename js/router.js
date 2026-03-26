(async function routePage() {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`config.json returned ${response.status}`);
    }

    const config = await response.json();

    if (config.pages?.maintenanceEnabled) {
      window.location.replace("/maintenance/");
      return;
    }

    if (config.pages?.criticalEnabled) {
      window.location.replace("/critical/");
      return;
    }

    window.location.replace("/leaderboard/");
  } catch (error) {
    console.error("Router failed:", error);

    document.body.innerHTML = `
      <canvas id="particles"></canvas>
      <div class="status-shell" style="position:relative;z-index:1;">
        <div class="status-card glass-card floating-card">
          <h1>Router Error</h1>
          <p class="status-text">Could not load config.json.</p>
          <p class="status-text" style="font-size:14px;opacity:.85;">${String(error.message || error)}</p>
        </div>
      </div>
      <script src="/js/particles.js"><\/script>
    `;
  }
})();
