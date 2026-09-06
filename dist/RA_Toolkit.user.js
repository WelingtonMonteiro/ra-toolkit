// ==UserScript==
// @name         RA Toolkit
// @namespace    https://github.com/WelingtonMonteiro
// @version      2.10.0
// @description  Toolkit for RetroAchievements.org — ROMs, translations, dashboard, pagination and more. Based on Retro Enhanced by Miagui.
// @author       Miagui / Updated by Welington
// @match        *://retroachievements.org/*
// @license      MIT
// @icon         https://retroachievements.org/assets/images/ra-logo.webp
// @homepageURL  https://github.com/PixelC0d3/ra-toolkit
// @supportURL   https://github.com/PixelC0d3/ra-toolkit/issues
// @updateURL    https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js
// @downloadURL  https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @connect      archive.org
// @connect      the-eye.eu
// @connect      raw.githubusercontent.com
// @connect      sheets.googleapis.com
// @connect      emuparadise.me
// @connect      speedrun.com
// @connect      myrient.erista.me
// @connect      retroachievements.org
// @connect      api.mymemory.translated.net
// @connect      romsfun.com
// ==/UserScript==
(() => {
  // src/core/log.js
  var LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, off: 4 };
  var currentLogLevel = LOG_LEVELS.info;
  var log = {
    _format: function(level, msg) {
      return "[RA Toolkit][" + level.toUpperCase() + "] " + msg;
    },
    debug: function(msg) {
      if (currentLogLevel <= LOG_LEVELS.debug) GM_log(log._format("debug", msg));
    },
    info: function(msg) {
      if (currentLogLevel <= LOG_LEVELS.info) GM_log(log._format("info", msg));
    },
    warn: function(msg) {
      if (currentLogLevel <= LOG_LEVELS.warn) {
        GM_log(log._format("warn", msg));
        console.warn(log._format("warn", msg));
      }
    },
    error: function(msg) {
      if (currentLogLevel <= LOG_LEVELS.error) {
        GM_log(log._format("error", msg));
        console.error(log._format("error", msg));
      }
    }
  };
  function setLogLevel(level) {
    currentLogLevel = level;
  }

  // src/core/theme.js
  function getScheme() {
    var html = document.documentElement;
    var scheme = html.getAttribute("data-scheme") || "";
    if (scheme === "system") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return scheme || "dark";
  }
  function isLightMode() {
    return getScheme() === "light";
  }

  // src/config.js
  async function loadConfig() {
    let enableDebugLog = false;
    return {
      enableSpeedrun: await GM_getValue("enableSpeedrun", false),
      enableRomSearch: await GM_getValue("enableRomSearch", true),
      enableCustomBG: await GM_getValue("enableCustomBG", true),
      enableGameplayVideo: await GM_getValue("enableGameplayVideo", true),
      enableEmuparadise: await GM_getValue("enableEmuparadise", false),
      prioritizeEmuparadise: await GM_getValue("prioritizeEmuparadise", false),
      enableGlassEffect: await GM_getValue("enableGlassEffect", true),
      enableHashCheck: await GM_getValue("enableHashCheck", true),
      enableRomsFun: await GM_getValue("enableRomsFun", true),
      enableDebugLog,
      enableRarityIndicator: await GM_getValue("enableRarityIndicator", true),
      translateLang: await GM_getValue("translateLang", "pt-BR"),
      accentColor: await GM_getValue("accentColor", "#3b82f6")
    };
  }
  function applyGlobalStyles(config) {
    setLogLevel(config.enableDebugLog ? LOG_LEVELS.debug : LOG_LEVELS.info);
    var accentColor = config.accentColor;
    var accentStyle = document.getElementById("enhanced-accent-style");
    if (!accentStyle) {
      accentStyle = document.createElement("style");
      accentStyle.id = "enhanced-accent-style";
      document.head.appendChild(accentStyle);
    }
    accentStyle.textContent = ":root { --ra-accent: " + accentColor + '; } .enhanced-switch[data-state="checked"] { background-color: ' + accentColor + " !important; } .enhanced-translate-btn.translated { color: " + accentColor + "; border-color: " + accentColor + "40; } #enhanced-changelog-ok { background: " + accentColor + " !important; }";
    var lightStyle = document.getElementById("enhanced-light-style");
    if (!lightStyle) {
      lightStyle = document.createElement("style");
      lightStyle.id = "enhanced-light-style";
      document.head.appendChild(lightStyle);
    }
    lightStyle.textContent = isLightMode() ? `
    .enhanced-translate-btn { color: #525252; border-color: rgba(0,0,0,0.15); }
    .enhanced-translate-btn:hover { background: rgba(0,0,0,0.06); color: #1a1a1a; border-color: rgba(0,0,0,0.25); }
    #enhanced-romsdl a { color: #2563eb !important; }
    #enhanced-romsdl a:hover { color: #1d4ed8 !important; }
    .enhanced-rom-noresults { background: rgba(0,0,0,0.03) !important; border-color: rgba(0,0,0,0.1) !important; }
    .enhanced-rom-noresults p { color: #525252 !important; }
    .enhanced-rom-noresults strong { color: #1a1a1a !important; }
  ` : "";
  }

  // src/core/reattach.js
  var _settingsHostObserver = null;
  function keepSettingsCardAttached(host, card) {
    if (_settingsHostObserver) _settingsHostObserver.disconnect();
    if (!host || !card) return;
    _settingsHostObserver = new MutationObserver(function() {
      if (!host.isConnected) {
        _settingsHostObserver.disconnect();
        _settingsHostObserver = null;
        return;
      }
      if (!host.contains(card)) host.appendChild(card);
    });
    _settingsHostObserver.observe(host, { childList: true });
  }
  var _sidebarObserver = null;
  function keepSidebarSectionsAttached(target, nodes) {
    if (_sidebarObserver) _sidebarObserver.disconnect();
    if (!target) return;
    _sidebarObserver = new MutationObserver(function() {
      if (!target.isConnected) {
        _sidebarObserver.disconnect();
        _sidebarObserver = null;
        return;
      }
      nodes.forEach(function(node) {
        if (node && !target.contains(node)) target.appendChild(node);
      });
    });
    _sidebarObserver.observe(target, { childList: true });
  }
  function disconnectReattachObservers() {
    if (_settingsHostObserver) {
      _settingsHostObserver.disconnect();
      _settingsHostObserver = null;
    }
    if (_sidebarObserver) {
      _sidebarObserver.disconnect();
      _sidebarObserver = null;
    }
  }

  // src/core/cleanup.js
  function cleanup() {
    disconnectReattachObservers();
    const ids = [
      "enhanced-settings",
      "enhanced-romsdl",
      "enhanced-speedruncom",
      "enhanced-custom-bg-style",
      "enhanced-glass-style",
      "enhanced-dl-style",
      "enhanced-translate-style",
      "enhanced-pagination",
      "enhanced-pagination-style",
      "enhanced-guide-link",
      "enhanced-changelog-overlay",
      "enhanced-rarity-style",
      "enhanced-collapse-style",
      "enhanced-wall-linkify-style",
      "re-game-awards-style",
      "re-game-awards-tabs",
      "re-achievements-dropdown",
      "re-most-mastered-tab",
      "re-most-mastered-container",
      "re-most-mastered-style"
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll("iframe.enhanced-video").forEach((el) => el.remove());
    document.querySelectorAll(".enhanced-translate-btn").forEach((el) => el.remove());
    document.querySelectorAll(".enhanced-rarity-badge").forEach((el) => el.remove());
    document.querySelectorAll(".enhanced-yt-embed").forEach((el) => el.remove());
  }

  // src/core/dom.js
  var domParser = new DOMParser();
  function parseHtml(htmlString) {
    return domParser.parseFromString(htmlString, "text/html");
  }
  function parseXml(xmlString) {
    return domParser.parseFromString(xmlString, "text/xml");
  }
  function escapeHtml(str) {
    return String(str === null || str === void 0 ? "" : str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // src/core/version.js
  var CURRENT_VERSION = "2.10.0";
  var CHANGELOG = [
    { version: "2.10.0", changes: [
      "Rarest Achievements: now computed from your entire achievement history (like the mobile app), not just the last 30 days",
      "Rarest Achievements: paginated (5 per page by default, configurable) with sort filters — Rarest first, Least rare first, Most recent",
      "Rarest Achievements: each card now shows its unlock-rate % and rarity tier badge",
      "Changelog popup: long changelogs now show 3 entries at a time, with a Show more / Show less toggle"
    ] },
    { version: "2.9.2", changes: [
      "Profile: fixed the Player Insights dashboard failing to load (stats, Almost There, streaks, rarest and the activity timeline stayed empty)",
      "Profile: Beaten/Mastered labels are back on the paginated games list",
      "Game page: fixed the arcade ROM search on Final Burn Neo and the RomsFun source",
      "Profile: fixed the console icons on the games list"
    ] },
    { version: "2.9.0", changes: [
      "Settings: restored the RA Toolkit panel on the new tabbed /settings page",
      "Settings: panel is re-attached when switching settings tabs",
      "Game page: ROMs and Speedrun sections are re-attached if React re-renders the sidebar",
      'User Stats: reads the renamed "casual" labels (RetroAchievements renamed softcore to casual)',
      "Game Awards: fixed the Beaten tab failing to render its badges",
      "Settings: the debug logging toggle is now only in a separate developer build"
    ] },
    { version: "2.8.2", changes: [
      "Achievement pages: linkify URLs and embed YouTube/images in achievement comments",
      "Achievement pages: added Translate button for achievement comments"
    ] },
    { version: "2.8.1", changes: [
      "Docs: added complete User Guide wiki with 18 pages covering all features"
    ] },
    { version: "2.8.0", changes: [
      "Games Page: new 'Most Mastered' tab on /games — browse games ranked by most players",
      "Games Page: card grid with rank, players, beaten count, achievements, and system tag",
      "Games Page: paginated results with internal API integration"
    ] },
    { version: "2.7.2", changes: [
      "Header: restored Achievements dropdown menu (Easy Achievements, Hardest Achievements)"
    ] },
    { version: "2.7.0", changes: [
      "Game Awards: new Mastered/Beaten tabs in sidebar section",
      "Game Awards: Beaten tab shows all beaten games with trophy icon and count",
      "Game Awards: hardcore badges shown in gold, softcore slightly dimmed"
    ] },
    { version: "2.6.5", changes: [
      "Rarest Achievements: items are now clickable links to /achievement/{id}",
      "Last Games Played: Beaten/Mastered award labels shown on all paginated pages (via awards API)",
      "Last Games Played: page range info moved from heading to pagination bar"
    ] },
    { version: "2.6.4", changes: [
      "Progression Status: replaced native section with modern dark-theme dashboard",
      "Progression Status: KPI grid (total games, beaten, mastered, % completed)",
      "Progression Status: donut overview chart + completion % bar chart by console",
      "Progression Status: animated bubble / treemap canvas visualization with filter",
      "Progression Status: Mastered vs Beaten bar chart (Chart.js)",
      "Added Chart.js @require for chart rendering"
    ] },
    { version: "2.6.3", changes: [
      "User Stats: recent activity and softcore sections now use metric cards with icons (consistent with primary stats)",
      "User Stats: CSS refactored to generic class names (stats-grid-3/4, metric-card, card-top, etc.)",
      "Activity Timeline: all 3 modes (Achievements, Mastered, Beaten) active by default"
    ] },
    { version: "2.6.2", changes: [
      "Activity Timeline: multi-select now uses priority coloring per cell (Mastered > Beaten > Achievements) instead of single emerald color",
      "Activity Timeline: each day shows the color of the highest-priority event type present"
    ] },
    { version: "2.6.1", changes: [
      "User Stats: redesigned with clean 3-section layout (primary grid, recent activity, softcore)",
      "User Stats: new metric cards with icons, weighted/softcore sub-values",
      "Removed Console Breakdown section (redundant with native Progression Status)"
    ] },
    { version: "2.6.0", changes: [
      "Enhanced User Stats: replaces native User Stats with beautiful card-style layout",
      "User Stats: primary stats (Points, Rank, Achievements, RetroRatio, Games Beaten) with icons and colors",
      "User Stats: expandable secondary stats (7/30 day points, avg points/week, avg completion, softcore)"
    ] },
    { version: "2.5.5", changes: [
      "Activity Timeline: rich custom tooltip with date header and per-mode icon breakdown",
      "Activity Timeline: tooltip shows 🏆 👑 ✅ icons next to each line"
    ] },
    { version: "2.5.4", changes: [
      "Activity Timeline: multi-select toggle buttons — select multiple modes (Achievements + Mastered + Beaten) to see combined heatmap",
      "Activity Timeline: combined mode uses emerald green color scheme",
      "Activity Timeline: tooltip and footer show per-mode breakdown when multiple modes are active"
    ] },
    { version: "2.5.3", changes: [
      "Updated install/update URLs for Greasy Fork"
    ] },
    { version: "2.5.2", changes: [
      "Activity Timeline: tooltip now shows year (e.g. 'Mar 19, 2026: 5 achievements')"
    ] },
    { version: "2.5.1", changes: [
      "Translate: disable button for texts exceeding 500-char API query limit",
      "Translate: show 'Too long' label with character count tooltip on hover"
    ] },
    { version: "2.5.0", changes: [
      "Activity Timeline: total achievements count shown in title",
      "Activity Timeline: toggle buttons to switch between Achievements (blue), Mastered (gold), and Beaten (gray) heatmaps",
      "New API integration: GetUserAwards for mastered/beaten game dates"
    ] },
    { version: "2.4.4", changes: [
      "Fix: rarity indicators on game page now work with all languages (i18n-safe percentage parsing)"
    ] },
    { version: "2.4.3", changes: [
      "Fix: enableRarityIndicator variable scope — rarity indicators now work correctly in achievement badges pagination"
    ] },
    { version: "2.4.2", changes: [
      "Image preview in wall comments — image links (png, jpg, gif, webp, etc.) show inline preview, click to open"
    ] },
    { version: "2.4.1", changes: [
      "Activity Timeline moved above Player Insights stats for better visibility"
    ] },
    { version: "2.4.0", changes: [
      "User Wall linkify — plain text URLs in comments become clickable links (opens in new tab)",
      "YouTube embed — YouTube links in wall comments show an inline mini video player"
    ] },
    { version: "2.3.3", changes: [
      "Emuparadise fix — links to download page instead of direct file (avoids referer block)"
    ] },
    { version: "2.3.2", changes: [
      "Emuparadise download fix — correct game ID extraction and direct download link with workaround"
    ] },
    { version: "2.3.1", changes: [
      "Timeline layout fix — uniform cell sizes and month labels overflow like GitHub's contribution graph"
    ] },
    { version: "2.3.0", changes: [
      "1-year Activity Timeline — GitHub-style contribution heatmap (52 weeks × 7 days) replacing the 30-day grid",
      "Streak Tracker now uses 365-day data for more accurate streak and active-day counts",
      "Yearly data fetched via quarterly API chunks (API_GetAchievementsEarnedBetween) to bypass 500-record limit"
    ] },
    { version: "2.2.1", changes: [
      "Missing consoles — added ROM search support for Amstrad CPC, Apple II, Uzebox, and WASM-4"
    ] },
    { version: "2.2.0", changes: [
      "Achievement rarity indicator — color-coded badges (Common, Uncommon, Rare, Very Rare, Ultra Rare, Legendary) on game page achievements and profile badges",
      "Collapse/expand sidebar sections — click ROMs or World Records headers to collapse/expand, state persisted"
    ] },
    { version: "2.1.1", changes: [
      "Save button in settings panel — 'Atualizar' button to confirm and reload"
    ] },
    { version: "2.1.0", changes: [
      "ROM search cache (24h TTL) — no more re-searching the same game",
      "Changelog popup — shows what's new after updates",
      "Custom accent color — choose your highlight color in settings",
      "Light mode support — adapts to the RA site theme (dark/light/black)",
      "Mobile layout support — sidebar injections work on mobile (<1024px)",
      "Guide link detection — shows RA Guide link on game pages when available"
    ] },
    { version: "2.0.0", changes: [
      "Player Insights Dashboard (6 modules)",
      "RomsFun ROM source",
      "RA Trophy badge for hash-verified ROMs",
      "Pagination skeleton loaders",
      "Previous/Next pagination buttons",
      "MyMemory API rate limiter"
    ] }
  ];
  function showChangelogPopup() {
    return Promise.resolve(GM_getValue("lastSeenVersion", "0.0.0")).then(function(lastSeen) {
      if (lastSeen === CURRENT_VERSION) return;
      GM_setValue("lastSeenVersion", CURRENT_VERSION);
      var newChanges = [];
      for (var i = 0; i < CHANGELOG.length; i++) {
        if (CHANGELOG[i].version === lastSeen) break;
        newChanges.push(CHANGELOG[i]);
      }
      if (newChanges.length === 0) return;
      var flatItems = [];
      newChanges.forEach(function(entry) {
        entry.changes.forEach(function(c) {
          flatItems.push({ version: entry.version, text: c });
        });
      });
      var PAGE_SIZE = 3;
      var visibleCount = Math.min(PAGE_SIZE, flatItems.length);
      function buildListHtml(count) {
        var html = "";
        var openVersion = null;
        for (var i2 = 0; i2 < count; i2++) {
          var item = flatItems[i2];
          if (item.version !== openVersion) {
            if (openVersion !== null) html += "</ul></div>";
            html += '<div style="margin-bottom:10px;"><strong style="color:var(--ra-accent,#3b82f6);">v' + escapeHtml(item.version) + '</strong><ul style="margin:4px 0 0 16px;padding:0;list-style:disc;">';
            openVersion = item.version;
          }
          html += '<li style="margin:2px 0;">' + escapeHtml(item.text) + "</li>";
        }
        if (openVersion !== null) html += "</ul></div>";
        return html;
      }
      var overlay = document.createElement("div");
      overlay.id = "enhanced-changelog-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);";
      overlay.innerHTML = '<div style="background:var(--box-bg-color,#232323);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;color:var(--text-color,#c8c8c8);font-size:0.9rem;box-shadow:0 8px 32px rgba(0,0,0,0.5);"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><h3 style="margin:0;font-size:1.2rem;color:var(--heading-color,#d2d2d2);">🎮 RA Toolkit Updated!</h3><button id="enhanced-changelog-close" style="background:none;border:none;color:var(--text-color,#c8c8c8);font-size:1.4rem;cursor:pointer;padding:0 4px;line-height:1;">&times;</button></div><div id="enhanced-changelog-list" style="line-height:1.5;"></div><div style="text-align:center;margin-top:8px;"><button id="enhanced-changelog-toggle" style="padding:4px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--ra-accent,#3b82f6);font-size:0.8rem;cursor:pointer;"></button></div><div style="text-align:center;margin-top:12px;"><button id="enhanced-changelog-ok" style="padding:8px 24px;border-radius:8px;border:none;background:var(--ra-accent,#3b82f6);color:#fff;font-size:0.9rem;cursor:pointer;font-weight:600;">Got it!</button></div></div>';
      document.body.appendChild(overlay);
      var listEl = document.getElementById("enhanced-changelog-list");
      var toggleBtn = document.getElementById("enhanced-changelog-toggle");
      function renderList() {
        listEl.innerHTML = buildListHtml(visibleCount);
        if (flatItems.length <= PAGE_SIZE) {
          toggleBtn.style.display = "none";
          return;
        }
        toggleBtn.style.display = "";
        if (visibleCount < flatItems.length) {
          toggleBtn.textContent = "Show more (+" + Math.min(PAGE_SIZE, flatItems.length - visibleCount) + ")";
        } else {
          toggleBtn.textContent = "Show less";
        }
      }
      toggleBtn.addEventListener("click", function() {
        visibleCount = visibleCount < flatItems.length ? Math.min(visibleCount + PAGE_SIZE, flatItems.length) : Math.min(PAGE_SIZE, flatItems.length);
        renderList();
      });
      renderList();
      function closePopup() {
        overlay.remove();
      }
      document.getElementById("enhanced-changelog-close").addEventListener("click", closePopup);
      document.getElementById("enhanced-changelog-ok").addEventListener("click", closePopup);
      overlay.addEventListener("click", function(e) {
        if (e.target === overlay) closePopup();
      });
    });
  }

  // src/core/gm.js
  function gmFetch(url, timeoutMs = 3e4) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        timeout: timeoutMs,
        onload: function(response) {
          if (response.status >= 200 && response.status < 400) {
            resolve(response);
          } else {
            reject(new Error("HTTP " + response.status + " for " + url));
          }
        },
        onerror: function(err) {
          reject(new Error("Network error fetching " + url + ": " + (err.error || "unknown")));
        },
        ontimeout: function() {
          reject(new Error("Timeout fetching " + url));
        }
      });
    });
  }

  // src/core/inertia.js
  function getInertiaProps() {
    const appEl = document.getElementById("app");
    if (!appEl) return null;
    try {
      const pageData = JSON.parse(appEl.getAttribute("data-page") || "{}");
      return pageData.props || null;
    } catch (e) {
      log.error("Failed to parse Inertia props: " + e);
      return null;
    }
  }

  // src/core/rarity.js
  function getRarityTier(percentage) {
    if (percentage >= 50) return { label: "Common", color: "#a3a3a3", bg: "rgba(163,163,163,0.12)" };
    if (percentage >= 25) return { label: "Uncommon", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
    if (percentage >= 10) return { label: "Rare", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" };
    if (percentage >= 5) return { label: "Very Rare", color: "#a855f7", bg: "rgba(168,85,247,0.12)" };
    if (percentage >= 2) return { label: "Ultra Rare", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    return { label: "Legendary", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
  }

  // src/core/rom-cache.js
  var ROM_CACHE_TTL = 24 * 60 * 60 * 1e3;
  function getRomCacheKey(gameTitle, consoleName) {
    return "romCache_" + consoleName + "_" + gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
  }
  function getCachedRomResults(gameTitle, consoleName) {
    var key = getRomCacheKey(gameTitle, consoleName);
    return Promise.resolve(GM_getValue(key, null)).then(function(cached) {
      if (!cached) return null;
      if (Date.now() - cached.ts > ROM_CACHE_TTL) {
        GM_deleteValue(key);
        return null;
      }
      log.info("[Cache] Hit for " + gameTitle + " (" + cached.results.length + " results, age " + Math.round((Date.now() - cached.ts) / 6e4) + "m)");
      return cached;
    });
  }
  function setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collectionName, collectionUrl) {
    var key = getRomCacheKey(gameTitle, consoleName);
    GM_setValue(key, {
      ts: Date.now(),
      results,
      resultsDlcs,
      collection: { name: collectionName, url: collectionUrl }
    });
    log.info("[Cache] Stored " + results.length + " results for " + gameTitle);
  }

  // src/core/translate.js
  var TRANSLATE_DAILY_LIMIT = 5e3;
  function getTodayKey() {
    var d = /* @__PURE__ */ new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function getTranslateUsage() {
    return Promise.resolve(GM_getValue("translateUsage", null)).then(function(val) {
      if (val && val.date === getTodayKey()) return val;
      return { date: getTodayKey(), chars: 0 };
    });
  }
  function addTranslateUsage(charCount) {
    return getTranslateUsage().then(function(usage) {
      usage.chars += charCount;
      GM_setValue("translateUsage", usage);
      return usage;
    });
  }
  function translateWithRateLimit(text, targetLang) {
    return getTranslateUsage().then(function(usage) {
      var remaining = TRANSLATE_DAILY_LIMIT - usage.chars;
      if (remaining <= 0) {
        return Promise.reject(new Error("RATE_LIMIT: Daily translation limit reached (" + TRANSLATE_DAILY_LIMIT + " chars). Resets tomorrow."));
      }
      if (text.length > remaining) {
        return Promise.reject(new Error("RATE_LIMIT: Text too long (" + text.length + " chars). Only " + remaining + " chars remaining today."));
      }
      var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|" + encodeURIComponent(targetLang.split("-")[0]);
      return gmFetch(url, 1e4).then(function(resp) {
        var data = JSON.parse(resp.responseText);
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
          addTranslateUsage(text.length);
          return data.responseData.translatedText;
        }
        throw new Error(data.responseDetails || "Translation failed");
      });
    });
  }

  // src/core/wait.js
  function waitForElement(selector, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el2 = document.querySelector(selector);
        if (el2) {
          observer.disconnect();
          resolve(el2);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timeout waiting for: " + selector));
      }, timeout);
    });
  }

  // src/features/game-page/consoles.js
  var RAConsole = {
    ARCADE: "Arcade",
    SNES: "SNES/Super Famicom",
    NES: "NES/Famicom",
    GAMEBOY: "Game Boy",
    GAMEBOYCOLOR: "Game Boy Color",
    GAMEBOYADVANCE: "Game Boy Advance",
    NINTENDO64: "Nintendo 64",
    GAMECUBE: "GameCube",
    NINTENDODS: "Nintendo DS",
    NINTENDODSI: "Nintendo DSi",
    ATARI2600: "Atari 2600",
    ATARI7800: "Atari 7800",
    ATARIJAGUAR: "Atari Jaguar",
    ATARIJAGUARCD: "Atari Jaguar CD",
    ATARILYNX: "Atari Lynx",
    PCENGINE: "PC Engine/TurboGrafx-16",
    PCENGINECD: "PC Engine CD/TurboGrafx-CD",
    MASTERSYSTEM: "Master System",
    GAMEGEAR: "Game Gear",
    MEGADRIVE: "Genesis/Mega Drive",
    SEGA32X: "32X",
    SEGACD: "Sega CD",
    SATURN: "Saturn",
    DREAMCAST: "Dreamcast",
    PS1: "PlayStation",
    PS2: "PlayStation 2",
    PSP: "PlayStation Portable",
    P3DO: "3DO Interactive Multiplayer",
    NEOGEOCD: "Neo Geo CD",
    NEOGEOPOCKET: "Neo Geo Pocket",
    POKEMINI: "Pokemon Mini",
    VIRTUALBOY: "Virtual Boy",
    SG1000: "SG-1000",
    COLECO: "ColecoVision",
    MSX: "MSX",
    WII: "Wii",
    WONDERSWAN: "WonderSwan",
    VECTREX: "Vectrex",
    NEC8800: "PC-8000/8800",
    APPLEII: "Apple II",
    PCFX: "PC-FX",
    ARDUBOY: "Arduboy",
    ARCADIA: "Arcadia 2001",
    FAIRCHILD: "Fairchild Channel F",
    MAGNAVOXODYSSEY2: "Magnavox Odyssey 2",
    INTELLIVISION: "Intellivision",
    INTERTONVC4000: "Interton VC 4000",
    MEGADUCK: "Mega Duck",
    WATARA: "Watara Supervision",
    ZEEBO: "Zeebo",
    AMSTRADCPC: "Amstrad CPC",
    UZEBOX: "Uzebox",
    WASM4: "WASM-4"
  };
  var SRConsole = {
    PC: "8gej2n93",
    APPLEII: "w89ryw6l",
    ATARI2600: "o0644863",
    ARCADE: "vm9vn63k",
    NEC8800: "7g6mw8er",
    COLECOVISION: "wxeo8d6r",
    COMMODORE64: "gz9qox60",
    MSX: "jm950z6o",
    NES: "jm95z9ol",
    MSX2: "83exkk6l",
    MASTERSYSTEM: "83exwk6l",
    ATARI7800: "gde33gek",
    FAMICOMDISKSYSTEM: "mr6k409z",
    PCENGINE: "5negxk6y",
    MEGADRIVE: "mr6k0ezw",
    GAMEBOY: "n5683oev",
    NEOGEOAES: "mx6p4w63",
    GAMEGEAR: "w89r3w9l",
    SNES: "83exk6l5",
    PHILIPSCDI: "w89rjw6l",
    SEGACD: "31670d9q",
    PANASONIC3D0: "8gejmne3",
    NEOGEOCD: "kz9w7mep",
    PCFX: "p36n8568",
    PS1: "wxeod9rn",
    SEGA32X: "kz9wrn6p",
    SEGASATURN: "lq60l642",
    VIRTUALBOY: "7g6mk8er",
    NINTENDO64: "w89rwelk",
    GAMEBOYCOLOR: "gde3g9k1",
    NEOGEOPOCKETCOLOR: "7m6ydw6p",
    TURBOGRAFX16CD: "p36nlxe8",
    DREAMCAST: "v06d394z",
    WONDERSWAN: "vm9v8n63",
    PLAYSTATION2: "n5e17e27",
    WONDERSWANCOLOUR: "n568kz6v",
    GAMEBOYADVANCE: "3167d6q2",
    GAMECUBE: "4p9z06rn",
    POKÉMONMINI: "vm9vr1e3",
    NINTENDODS: "7g6m8erk",
    PLAYSTATIONPORTABLE: "5negk9y7",
    WII: "v06dk3e4",
    AMSTRADCPC: "5negykey"
  };

  // src/features/game-page/collections.js
  var archiveCollectionDict = {
    [RAConsole.SATURN]: {
      name: "Redump Sega Saturn 2018",
      url: "https://archive.org/download/SegaSaturn2018July10"
    },
    [RAConsole.DREAMCAST]: {
      name: "CHD-ZSTD - Sega Dreamcast (Redump)",
      url: "https://archive.org/download/dc-chd-zstd-redump/dc-chd-zstd"
    },
    [RAConsole.SEGACD]: {
      name: "Redump Sega Mega CD & Sega CD",
      url: "https://archive.org/download/redump.sega_megacd-segacd"
    },
    [RAConsole.NEOGEOCD]: {
      name: "[REDUMP] Disc Image Collection: SNK - Neo Geo CD",
      url: "https://archive.org/download/redump.ngcd.revival"
    },
    [RAConsole.ATARI2600]: {
      name: "No-Intro Atari 2600",
      url: "https://archive.org/download/nointro2600atarii"
    },
    [RAConsole.NINTENDODS]: {
      name: "No-Intro Nintendo DS Decrypted",
      url: "https://archive.org/download/noIntroNintendoDsDecrypted2019Jun30"
    },
    [RAConsole.APPLEII]: {
      name: "Apple 2 TOSEC 2012",
      url: "https://archive.org/details/Apple_2_TOSEC_2012_04_23"
    }
  };
  var myrientCollectionDict = {
    // CDs and DVDs files
    [RAConsole.PS1]: {
      name: "chd_psx",
      urls: [
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx/CHD-PSX-USA/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_eur/CHD-PSX-EUR/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_jap/CHD-PSX-JAP/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_jap_p2/CHD-PSX-JAP/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_misc/CHD-PSX-Misc/"
      ]
    },
    [RAConsole.PSP]: {
      name: "psp-chd-zstd-redump",
      urls: [
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/psp-chd-zstd-redump-part1/psp-chd-zstd/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/psp-chd-zstd-redump-part2/psp-chd-zstd/"
      ]
    },
    [RAConsole.PS2]: {
      name: "Sony - PlayStation 2",
      urls: [
        "https://myrient.erista.me/files/Redump/Sony%20-%20PlayStation%202/"
      ]
    },
    [RAConsole.SATURN]: {
      name: "chd_saturn",
      urls: [
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_saturn/CHD-Saturn/USA/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_saturn/CHD-Saturn/Japan/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_saturn/CHD-Saturn/Europe/"
      ]
    },
    [RAConsole.DREAMCAST]: {
      name: "dc-chd-zstd",
      urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/dc-chd-zstd-redump/dc-chd-zstd/"]
    },
    [RAConsole.GAMECUBE]: {
      name: "Nintendo - GameCube - NKit RVZ [zstd-19-128k]",
      urls: ["https://myrient.erista.me/files/Redump/Nintendo%20-%20GameCube%20-%20NKit%20RVZ%20%5Bzstd-19-128k%5D/"]
    },
    [RAConsole.WII]: {
      name: "Nintendo - Wii - NKit RVZ [zstd-19-128k]",
      urls: ["https://myrient.erista.me/files/Redump/Nintendo%20-%20Wii%20-%20NKit%20RVZ%20%5Bzstd-19-128k%5D/"]
    },
    [RAConsole.SEGACD]: {
      name: "chd_segacd",
      urls: [
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-SegaCD-NTSC/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-MegaCD-NTSCJ/",
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-MegaCD-PAL/"
      ]
    },
    [RAConsole.P3DO]: {
      name: "3do-chd-zstd",
      urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/3do-chd-zstd-redump/3do-chd-zstd/"]
    },
    [RAConsole.ATARIJAGUARCD]: {
      name: "jagcd-chd-zstd",
      urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/jagcd-chd-zstd/jagcd-chd-zstd/"]
    },
    [RAConsole.NEOGEOCD]: {
      name: "ngcd-chd-zstd",
      urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/ngcd-chd-zstd-redump/ngcd-chd-zstd/"]
    },
    [RAConsole.PCENGINECD]: {
      name: "pcecd-chd-zstd",
      urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/pcecd-chd-zstd-redump/pcecd-chd-zstd/"]
    },
    [RAConsole.PCFX]: {
      name: "PC-FX",
      urls: ["https://myrient.erista.me/files/Redump/NEC%20-%20PC-FX%20%26%20PC-FXGA/"]
    },
    // Cartridge roms
    [RAConsole.ARDUBOY]: {
      name: "Arduboy",
      urls: ["https://myrient.erista.me/files/No-Intro/Arduboy%20Inc%20-%20Arduboy/"]
    },
    [RAConsole.ATARI2600]: {
      name: "Atari - 2600",
      urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%202600/"]
    },
    [RAConsole.ATARI7800]: {
      name: "Atari - 7800",
      urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%207800/"]
    },
    [RAConsole.ATARIJAGUAR]: {
      name: "Atari - Jaguar (ROM)",
      urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%20Jaguar%20%28ROM%29/"]
    },
    [RAConsole.ATARILYNX]: {
      name: "Atari - Lynx (LYX)",
      urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%20Lynx%20%28LYX%29/"]
    },
    [RAConsole.WONDERSWAN]: {
      name: "Wonderswan",
      urls: [
        "https://myrient.erista.me/files/No-Intro/Bandai%20-%20WonderSwan/",
        "https://myrient.erista.me/files/No-Intro/Bandai%20-%20WonderSwan%20Color/"
      ]
    },
    [RAConsole.COLECO]: {
      name: "Coleco - ColecoVision",
      urls: ["https://myrient.erista.me/files/No-Intro/Coleco%20-%20ColecoVision/"]
    },
    [RAConsole.ARCADIA]: {
      name: "Emerson - Arcadia 2001",
      urls: ["https://myrient.erista.me/files/No-Intro/Emerson%20-%20Arcadia%202001/"]
    },
    [RAConsole.FAIRCHILD]: {
      name: "Fairchild - Channel F",
      urls: ["https://myrient.erista.me/files/No-Intro/Fairchild%20-%20Channel%20F/"]
    },
    [RAConsole.VECTREX]: {
      name: "GCE - Vectrex",
      urls: ["https://myrient.erista.me/files/No-Intro/GCE%20-%20Vectrex/"]
    },
    [RAConsole.MAGNAVOXODYSSEY2]: {
      name: "Magnavox - Odyssey 2",
      urls: ["https://myrient.erista.me/files/No-Intro/Magnavox%20-%20Odyssey%202/"]
    },
    [RAConsole.INTELLIVISION]: {
      name: "Mattel - Intellivision",
      urls: ["https://myrient.erista.me/files/No-Intro/Mattel%20-%20Intellivision/"]
    },
    [RAConsole.INTERTONVC4000]: {
      name: "Interton - VC 4000",
      urls: ["https://myrient.erista.me/files/No-Intro/Interton%20-%20VC%204000/"]
    },
    [RAConsole.MEGADUCK]: {
      name: "Welback - Mega Duck",
      urls: ["https://myrient.erista.me/files/No-Intro/Welback%20-%20Mega%20Duck/"]
    },
    [RAConsole.MSX]: {
      name: "Microsoft - MSX",
      urls: [
        "https://myrient.erista.me/files/No-Intro/Microsoft%20-%20MSX/",
        "https://myrient.erista.me/files/No-Intro/Microsoft%20-%20MSX2/"
      ]
    },
    [RAConsole.NEC8800]: {
      name: "Neo Kobe - NEC PC-8801 (2016-02-25)",
      urls: [
        "https://ia801307.us.archive.org/view_archive.php?archive=/35/items/Neo_Kobe_NEC_PC-8001_2016-02-25/Neo%20Kobe%20-%20NEC%20PC-8001%20%282016-02-25%29.zip",
        "https://ia801305.us.archive.org/view_archive.php?archive=/32/items/Neo_Kobe_NEC_PC-8801_2016-02-25/Neo%20Kobe%20-%20NEC%20PC-8801%20%282016-02-25%29.zip"
      ]
    },
    [RAConsole.PCENGINE]: {
      name: "NEC - PC Engine SuperGrafx",
      urls: [
        "https://myrient.erista.me/files/No-Intro/NEC%20-%20PC%20Engine%20-%20TurboGrafx-16/",
        "https://myrient.erista.me/files/No-Intro/NEC%20-%20PC%20Engine%20SuperGrafx/"
      ]
    },
    [RAConsole.NES]: {
      name: "Nintendo - Nintendo Entertainment System (Headered)",
      urls: [
        "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20%28Headered%29/",
        "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Family%20Computer%20Disk%20System%20%28FDS%29/",
        "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20%28Headered%29%20%28Private%29/"
      ]
    },
    [RAConsole.GAMEBOY]: {
      name: "Nintendo - Game Boy",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy/"]
    },
    [RAConsole.GAMEBOYADVANCE]: {
      name: "Nintendo - Game Boy Advance",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Advance/"]
    },
    [RAConsole.GAMEBOYCOLOR]: {
      name: "Nintendo - Game Boy Color",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Color/"]
    },
    [RAConsole.NINTENDO64]: {
      name: "Nintendo - Nintendo 64 (BigEndian)",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%2064%20%28BigEndian%29/"]
    },
    [RAConsole.NINTENDODS]: {
      name: "Nintendo - Nintendo DS (Decrypted)",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DS%20%28Decrypted%29/"]
    },
    [RAConsole.NINTENDODSI]: {
      name: "Nintendo - Nintendo DSi (Digital)",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DSi%20%28Digital%29/"]
    },
    [RAConsole.POKEMINI]: {
      name: "Nintendo - Pokemon Mini",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Pokemon%20Mini/"]
    },
    [RAConsole.SNES]: {
      name: "Nintendo - Super Nintendo Entertainment System",
      urls: [
        "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System/",
        "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System%20%28Private%29/"
      ]
    },
    [RAConsole.VIRTUALBOY]: {
      name: "Nintendo - Virtual Boy",
      urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Virtual%20Boy/"]
    },
    [RAConsole.NEOGEOPOCKET]: {
      name: "SNK - NeoGeo Pocket Color",
      urls: [
        "https://myrient.erista.me/files/No-Intro/SNK%20-%20NeoGeo%20Pocket%20Color/",
        "https://myrient.erista.me/files/No-Intro/SNK%20-%20NeoGeo%20Pocket/"
      ]
    },
    [RAConsole.SEGA32X]: {
      name: "Sega - 32X",
      urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%2032X/"]
    },
    [RAConsole.GAMEGEAR]: {
      name: "Sega - Game Gear",
      urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20Game%20Gear/"]
    },
    [RAConsole.MASTERSYSTEM]: {
      name: "Sega - Master System - Mark III",
      urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20Master%20System%20-%20Mark%20III/"]
    },
    [RAConsole.MEGADRIVE]: {
      name: "Sega - Mega Drive - Genesis",
      urls: [
        "https://myrient.erista.me/files/No-Intro/Sega%20-%20Mega%20Drive%20-%20Genesis/",
        "https://myrient.erista.me/files/No-Intro/Sega%20-%20Mega%20Drive%20-%20Genesis%20%28Private%29/"
      ]
    },
    [RAConsole.SG1000]: {
      name: "Sega - SG-1000",
      urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20SG-1000/"]
    },
    [RAConsole.WATARA]: {
      name: "Watara - Supervision",
      urls: ["https://myrient.erista.me/files/No-Intro/Watara%20-%20Supervision/"]
    },
    [RAConsole.ZEEBO]: {
      name: "Zeebo - Zeebo",
      urls: ["https://myrient.erista.me/files/No-Intro/Zeebo%20-%20Zeebo/"]
    },
    [RAConsole.AMSTRADCPC]: {
      name: "Amstrad - CPC",
      urls: ["https://myrient.erista.me/files/No-Intro/Amstrad%20-%20CPC%20%28Misc%29/"]
    },
    [RAConsole.APPLEII]: {
      name: "Apple - II",
      urls: [
        "https://myrient.erista.me/files/No-Intro/Apple%20-%20II%20%28WOZ%29/",
        "https://myrient.erista.me/files/No-Intro/Apple%20-%20II%20%28A2R%29/"
      ]
    }
  };

  // src/features/game-page/background.js
  function applyGamePageBackground(gameImg, enableCustomBG) {
    if (!gameImg || gameImg.includes("/Images/000002.png") || !enableCustomBG) return;
    const styleEl = document.createElement("style");
    styleEl.textContent = `
    body:before {
      content: "";
      position: fixed;
      width: 110%;
      height: 110%;
      background-image: url(${gameImg});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: -1;
      overflow: hidden;
      filter: blur(8px);
      -moz-filter: blur(8px);
      -webkit-filter: blur(8px);
      -o-filter: blur(8px);
    }
  `;
    document.head.appendChild(styleEl);
  }
  function applyGlassEffect(enableGlassEffect) {
    if (!enableGlassEffect) return;
    const glassStyle = document.createElement("style");
    glassStyle.textContent = `
    :root { --box-bg-color: rgba(35, 35, 35, 0.95); }
    main.with-sidebar > article { background: var(--box-bg-color); border-radius: 0.5rem; }
    main.with-sidebar > aside { background: var(--box-bg-color); border-radius: 0.5rem; }
  `;
    document.head.appendChild(glassStyle);
  }

  // src/features/game-page/guide-link.js
  function injectGuideLink(props, divRoms, injectionTarget) {
    var guideUrl = null;
    if (props && props.backingGame && props.backingGame.guideUrl) {
      guideUrl = props.backingGame.guideUrl;
    } else if (props && props.game && props.game.guideUrl) {
      guideUrl = props.game.guideUrl;
    }
    if (!guideUrl) {
      var existingGuide = document.querySelector('a[href*="github.com/RetroAchievements/guides"]');
      if (existingGuide) guideUrl = existingGuide.href;
    }
    if (!guideUrl) {
      log.debug("[Guide] No guide URL found for this game");
      return;
    }
    if (document.getElementById("enhanced-guide-link")) return;
    log.info("[Guide] Found guide: " + guideUrl);
    var guideDiv = document.createElement("div");
    guideDiv.id = "enhanced-guide-link";
    guideDiv.style.cssText = "margin:0.75em 0;";
    guideDiv.innerHTML = '<a href="' + escapeHtml(guideUrl) + `" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;background:rgba(59,130,246,0.08);border:1px solid var(--ra-accent,#3b82f6);color:var(--ra-accent,#3b82f6);text-decoration:none;font-weight:600;font-size:0.9em;transition:all 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='rgba(59,130,246,0.08)'"><span style="font-size:1.2em;">📖</span><span>RA Achievement Guide</span><span style="margin-left:auto;font-size:0.85em;opacity:0.7;">↗</span></a>`;
    if (divRoms && divRoms.parentNode) {
      divRoms.parentNode.insertBefore(guideDiv, divRoms);
    } else if (injectionTarget) {
      injectionTarget.appendChild(guideDiv);
    }
  }

  // src/features/game-page/rom-name.js
  function normalizeRomName(name) {
    return name.toLowerCase().replace(/\.(zip|7z|chd|bin|cue|iso|nds|gba|gbc|gb|nes|sfc|smc|md|gen|z64|n64|v64|a26|a78|lnx|pce|ngp|ngc|ws|wsc|min|col|rom|mx1|mx2|dsk|tap|fds)$/i, "").replace(/\s*\[.*?\]/g, "").replace(/\s+/g, " ").trim();
  }
  function titleOnlyRomName(name) {
    return normalizeRomName(name).replace(/\s*\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  }
  function extractRegions(name) {
    var regions = [];
    var re = /\(([^)]+)\)/g;
    var m;
    while ((m = re.exec(name.toLowerCase())) !== null) {
      m[1].split(/\s*,\s*/).forEach(function(r) {
        regions.push(r.trim());
      });
    }
    return regions;
  }
  function refinedCompare(a, b, consoleName) {
    return simplifyTitle(a, consoleName) === simplifyTitle(b, consoleName);
  }
  function compare(a, b, consoleName) {
    return simplifyTitle(a, consoleName).includes(simplifyTitle(b, consoleName));
  }
  function simplifyTitle(str, consoleName) {
    if (consoleName === RAConsole.DREAMCAST)
      str = str.replace(/v[0-9].[0-9]{3}/gs, "");
    return str.replace(/\.(zip|7z)$/, "").replace(/^The /g, "").replace(", The", "").replace(/'s/gs, "").replace("&", "and").replace(/:|-| |\.|!|\?|\/|'/gs, "").replace(/(\r\n|\n|\r)/gs, "").split("|")[0].replace(",", "").replace(/\(.+\)/gs, "").replace(/\[.+\]/gs, "").toLowerCase();
  }
  function removeExt(str) {
    return str.replace(/\.(zip|7z|chd)$/, "");
  }

  // src/features/game-page/hashes.js
  function fetchGameHashes(gId, enableHashCheck) {
    return Promise.resolve(GM_getValue("raApiKey", "")).then(function(apiKey) {
      log.info("[HashCheck] enableHashCheck=" + enableHashCheck + " apiKey=" + (apiKey ? "set (" + apiKey.length + " chars)" : "EMPTY"));
      if (!apiKey || !enableHashCheck) {
        log.warn("[HashCheck] Skipped: " + (!apiKey ? "no API key" : "hash check disabled"));
        return [];
      }
      var url = "https://retroachievements.org/API/API_GetGameHashes.php?i=" + encodeURIComponent(gId) + "&y=" + encodeURIComponent(apiKey);
      log.info("[HashCheck] Fetching hashes for game ID: " + gId);
      return gmFetch(url, 15e3).then(function(resp) {
        var data = JSON.parse(resp.responseText);
        var results = (data.Results || []).map(function(h) {
          var labels = h.Labels;
          if (typeof labels === "string") labels = labels ? labels.split(",") : [];
          if (!Array.isArray(labels)) labels = [];
          return { name: (h.Name || "").toLowerCase(), md5: h.MD5, labels };
        });
        log.info("[HashCheck] Found " + results.length + " known hashes");
        if (results.length > 0) {
          log.info("[HashCheck] Sample hash: " + results[0].name + " (MD5: " + results[0].md5 + ")");
        }
        return results;
      }).catch(function(err) {
        log.warn("[HashCheck] Hash fetch failed: " + err.message);
        return [];
      });
    }).catch(function(err) {
      log.warn("[HashCheck] GM_getValue failed: " + err.message);
      return [];
    });
  }
  function getHashBadge(romName, knownHashes) {
    if (knownHashes.length === 0) {
      log.debug("[HashBadge] No known hashes loaded, skipping badge for: " + romName);
      return "";
    }
    var normRom = normalizeRomName(romName);
    var romRegions = extractRegions(romName);
    var match = knownHashes.find(function(h) {
      return normalizeRomName(h.name) === normRom;
    });
    if (!match) {
      var titleRom = titleOnlyRomName(romName);
      match = knownHashes.find(function(h) {
        if (titleOnlyRomName(h.name) !== titleRom) return false;
        if (romRegions.length === 0) return true;
        var hashRegions = extractRegions(h.name);
        if (hashRegions.length === 0) return true;
        return romRegions.some(function(r) {
          return hashRegions.indexOf(r) !== -1;
        });
      });
    }
    log.debug("[HashBadge] ROM: " + romName + " | normalized: " + normRom + " | match: " + (match ? match.name : "NONE"));
    if (match) {
      var labelsArr = Array.isArray(match.labels) ? match.labels : [];
      var labelTxt = labelsArr.length > 0 ? labelsArr.join(", ") : "";
      var tooltipLines = [
        "✅ Compatible with RetroAchievements",
        "MD5: " + match.md5
      ];
      if (labelTxt) tooltipLines.push("Labels: " + labelTxt);
      if (match.name) tooltipLines.push("Hash: " + match.name);
      var tooltip = escapeHtml(tooltipLines.join("\n"));
      return ' <span class="enhanced-trophy-badge" title="' + tooltip + '" style="display:inline-flex;align-items:center;gap:2px;font-size:0.75em;padding:1px 6px;border-radius:4px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#78350f;vertical-align:middle;margin-left:4px;cursor:help;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.15);transition:transform 0.15s;">🏆 RA</span>';
    }
    return "";
  }

  // src/features/game-page/rarity-badges.js
  function injectRarityIndicators() {
    if (!document.getElementById("enhanced-rarity-style")) {
      var rarityStyle = document.createElement("style");
      rarityStyle.id = "enhanced-rarity-style";
      rarityStyle.textContent = `
      .enhanced-rarity-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.65em;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
        vertical-align: middle;
        margin-left: 6px;
        line-height: 1.6;
      }
      .enhanced-rarity-badge .enhanced-rarity-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      li.game-set-item.enhanced-rarity-bordered {
        border-left: 3px solid var(--enhanced-rarity-color, transparent);
        padding-left: 4px;
      }
    `;
      document.head.appendChild(rarityStyle);
    }
    var items = document.querySelectorAll("li.game-set-item");
    items.forEach(function(li) {
      if (li.querySelector(".enhanced-rarity-badge")) return;
      var percentage = null;
      var centerPs = li.querySelectorAll("p.text-center");
      for (var i = 0; i < centerPs.length; i++) {
        var txt = centerPs[i].textContent || "";
        var match = txt.match(/([\d,.]+)\s*%/);
        if (match) {
          percentage = parseFloat(match[1].replace(",", "."));
          break;
        }
      }
      if (percentage === null) {
        var textEls = li.querySelectorAll("p");
        for (var j = 0; j < textEls.length; j++) {
          var txt2 = textEls[j].textContent || "";
          var match2 = txt2.match(/([\d,.]+)\s*%\s*(?:unlock\s*rate|taxa\s*de\s*desbloqueio)/i);
          if (match2) {
            percentage = parseFloat(match2[1].replace(",", "."));
            break;
          }
        }
      }
      if (percentage === null || isNaN(percentage)) return;
      var tier = getRarityTier(percentage);
      li.classList.add("enhanced-rarity-bordered");
      li.style.setProperty("--enhanced-rarity-color", tier.color);
      var titleSpan = li.querySelector("a.font-medium");
      if (!titleSpan) return;
      var badge = document.createElement("span");
      badge.className = "enhanced-rarity-badge";
      badge.style.cssText = "color:" + tier.color + ";background:" + tier.bg + ";border:1px solid " + tier.color + "30;";
      badge.title = percentage.toFixed(2) + "% unlock rate";
      badge.innerHTML = '<span class="enhanced-rarity-dot" style="background:' + tier.color + ';"></span>' + tier.label;
      var titleContainer = titleSpan.parentElement;
      if (titleContainer) {
        titleContainer.appendChild(badge);
      }
    });
  }

  // src/features/game-page/translate-buttons.js
  function translateText(text, targetLang) {
    return translateWithRateLimit(text, targetLang);
  }
  function injectTranslateButtons(translateLang) {
    if (!document.getElementById("enhanced-translate-style")) {
      var style = document.createElement("style");
      style.id = "enhanced-translate-style";
      style.textContent = `
      .enhanced-translate-btn {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        background: transparent;
        color: #a3a3a3;
        font-size: 0.7em;
        cursor: pointer;
        transition: all 0.2s;
        vertical-align: middle;
        margin-left: 6px;
      }
      .enhanced-translate-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #e5e5e5;
        border-color: rgba(255,255,255,0.25);
      }
      .enhanced-translate-btn.translating {
        opacity: 0.6;
        pointer-events: none;
      }
      .enhanced-translate-btn.translated {
        color: #3b82f6;
        border-color: rgba(59,130,246,0.3);
      }
      .enhanced-translate-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
    `;
      document.head.appendChild(style);
    }
    var items = document.querySelectorAll("li.game-set-item");
    items.forEach(function(li) {
      if (li.querySelector(".enhanced-translate-btn")) return;
      var descPs = li.querySelectorAll("p.leading-4");
      var descP = null;
      for (var i = 0; i < descPs.length; i++) {
        var txt = descPs[i].textContent.trim();
        if (txt && !txt.match(/^\d+\s*(of|de)\s*\d+/)) {
          descP = descPs[i];
          break;
        }
      }
      if (!descP) return;
      var titleLink = li.querySelector("a.font-medium");
      var btn = document.createElement("button");
      btn.className = "enhanced-translate-btn";
      var originalDesc = descP.textContent;
      var originalTitle = titleLink ? titleLink.textContent : "";
      var textToCheck = (originalTitle ? originalTitle + "\n" : "") + originalDesc;
      if (textToCheck.length > 500) {
        btn.classList.add("disabled");
        btn.title = "Text exceeds 500 character limit for translation (" + textToCheck.length + " chars)";
        btn.innerHTML = "&#x1F310; Too long";
        descP.appendChild(btn);
        return;
      }
      btn.title = "Translate to " + translateLang;
      btn.innerHTML = "&#x1F310; Translate";
      var isTranslated = false;
      var translatedDesc = null;
      var translatedTitle = null;
      btn.addEventListener("click", function() {
        if (btn.classList.contains("translating")) return;
        if (isTranslated) {
          descP.textContent = originalDesc;
          if (titleLink) titleLink.textContent = originalTitle;
          btn.innerHTML = "&#x1F310; Translate";
          btn.classList.remove("translated");
          isTranslated = false;
          return;
        }
        if (translatedDesc) {
          descP.textContent = translatedDesc;
          if (titleLink && translatedTitle) titleLink.textContent = translatedTitle;
          btn.innerHTML = "&#x1F310; Original";
          btn.classList.add("translated");
          isTranslated = true;
          return;
        }
        btn.classList.add("translating");
        btn.innerHTML = "&#x23F3; ...";
        var textToTranslate = originalDesc;
        if (titleLink && originalTitle) {
          textToTranslate = originalTitle + "\n" + originalDesc;
        }
        translateText(textToTranslate, translateLang).then(function(result) {
          var parts = result.split("\n");
          if (titleLink && originalTitle && parts.length >= 2) {
            translatedTitle = parts[0];
            translatedDesc = parts.slice(1).join("\n");
            titleLink.textContent = translatedTitle;
          } else {
            translatedDesc = result;
          }
          descP.textContent = translatedDesc;
          btn.innerHTML = "&#x1F310; Original";
          btn.classList.remove("translating");
          btn.classList.add("translated");
          isTranslated = true;
        }).catch(function(err) {
          log.warn("Translation failed: " + err.message);
          var isRateLimit = err.message && err.message.indexOf("RATE_LIMIT") === 0;
          btn.innerHTML = isRateLimit ? "&#x26D4; Limit" : "&#x26A0; Error";
          btn.title = isRateLimit ? err.message.replace("RATE_LIMIT: ", "") : "Translation failed";
          btn.classList.remove("translating");
          if (!isRateLimit) {
            setTimeout(function() {
              btn.innerHTML = "&#x1F310; Translate";
              btn.title = "Translate to " + translateLang;
            }, 2e3);
          }
        });
      });
      descP.appendChild(btn);
    });
  }

  // src/features/game-page/collapsible.js
  function injectCollapseStyle() {
    if (document.getElementById("enhanced-collapse-style")) return;
    var style = document.createElement("style");
    style.id = "enhanced-collapse-style";
    style.textContent = `
    .enhanced-collapse-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      padding: 2px 0;
      transition: opacity 0.15s;
    }
    .enhanced-collapse-header:hover {
      opacity: 0.8;
    }
    .enhanced-collapse-arrow {
      font-size: 0.75em;
      transition: transform 0.2s ease;
      color: #a3a3a3;
      margin-left: 6px;
    }
    .enhanced-collapse-arrow.collapsed {
      transform: rotate(-90deg);
    }
    .enhanced-collapse-content {
      overflow: hidden;
      transition: max-height 0.25s ease, opacity 0.2s ease;
      max-height: 2000px;
      opacity: 1;
    }
    .enhanced-collapse-content.collapsed {
      max-height: 0;
      opacity: 0;
    }
  `;
    document.head.appendChild(style);
  }
  function makeCollapsible(containerEl, sectionKey) {
    if (!containerEl) return;
    var h3 = containerEl.querySelector("h3");
    if (!h3 || h3.classList.contains("enhanced-collapse-header")) return;
    injectCollapseStyle();
    var storeKey = "sidebarCollapsed_" + sectionKey;
    var isCollapsed = false;
    var contentDiv = document.createElement("div");
    contentDiv.className = "enhanced-collapse-content";
    var siblings = [];
    var next = h3.nextSibling;
    while (next) {
      siblings.push(next);
      next = next.nextSibling;
    }
    siblings.forEach(function(node) {
      contentDiv.appendChild(node);
    });
    containerEl.appendChild(contentDiv);
    h3.classList.add("enhanced-collapse-header");
    var arrow = document.createElement("span");
    arrow.className = "enhanced-collapse-arrow";
    arrow.textContent = "▼";
    h3.appendChild(arrow);
    function setCollapseState(collapsed) {
      isCollapsed = collapsed;
      if (collapsed) {
        contentDiv.classList.add("collapsed");
        arrow.classList.add("collapsed");
      } else {
        contentDiv.classList.remove("collapsed");
        arrow.classList.remove("collapsed");
      }
      GM_setValue(storeKey, collapsed);
    }
    h3.addEventListener("click", function() {
      setCollapseState(!isCollapsed);
    });
    Promise.resolve(GM_getValue(storeKey, false)).then(function(saved) {
      if (saved) setCollapseState(true);
    });
  }

  // src/features/game-page/rom-list.js
  function createNoRomsNotification(ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, divRoms, knownHashes } = ctx;
    const searchQuery = encodeURIComponent(gameTitle + " " + consoleName);
    const archiveUrl = "https://archive.org/search?query=" + searchQuery;
    const myrientUrl = "https://myrient.erista.me/files/" + encodeURIComponent(consoleName);
    const h3 = document.createElement("h3");
    h3.textContent = "ROMs";
    h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
    divRoms.appendChild(h3);
    const msgDiv = document.createElement("div");
    msgDiv.style.cssText = "padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);";
    msgDiv.innerHTML = '<p style="margin:0 0 8px;color:#a3a3a3;font-size:0.9em;">No ROMs found for <strong style="color:#e5e5e5;">' + escapeHtml(gameTitle) + '</strong>.</p><p style="margin:0 0 4px;color:#a3a3a3;font-size:0.85em;">Try searching manually:</p><div style="display:flex;flex-direction:column;gap:4px;"><a href="' + archiveUrl + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; Archive.org</a><a href="' + myrientUrl + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; Myrient</a><a href="https://romsfun.com/?s=' + searchQuery + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; RomsFun</a></div>';
    divRoms.appendChild(msgDiv);
    makeCollapsible(divRoms, "roms");
  }
  function createDownloads(ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, divRoms, knownHashes } = ctx;
    const style = document.createElement("style");
    style.textContent = `
    #enhanced-romsdl .dl-link {
      color: #5b9bd5;
      text-decoration: none;
    }
    #enhanced-romsdl .dl-link:hover {
      text-decoration: underline;
    }
    #enhanced-romsdl .rom-row {
      display: flex;
      align-items: center;
      padding: 2px 0;
    }
    .enhanced-trophy-badge:hover {
      transform: scale(1.15);
    }
  `;
    document.head.appendChild(style);
    const h3 = document.createElement("h3");
    h3.textContent = "ROMs";
    h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
    divRoms.appendChild(h3);
    for (var i = 0; i < results.length; i++) {
      let dlLink = results[i].url.replace(/ /g, "%20");
      const wrapper = document.createElement("div");
      wrapper.className = "rom-row";
      var badge = getHashBadge(results[i].name, knownHashes);
      wrapper.innerHTML = '<a class="dl-link" href="' + encodeURI(dlLink) + '" target="_blank" rel="noopener">' + escapeHtml(removeExt(results[i].name)) + "</a>" + badge;
      divRoms.appendChild(wrapper);
    }
    if (collection.url !== "") {
      const fromDiv = document.createElement("div");
      fromDiv.style.marginTop = "1em";
      fromDiv.innerHTML = `From <a href="${encodeURI(collection.url)}" style="color: #5b9bd5;">${escapeHtml(collection.name)}</a>`;
      divRoms.appendChild(fromDiv);
    }
    makeCollapsible(divRoms, "roms");
  }
  function createDlcs(ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, divRoms, knownHashes } = ctx;
    const h3 = document.createElement("h3");
    h3.textContent = "DLCs";
    h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;";
    divRoms.appendChild(h3);
    for (var i = 0; i < resultsDlcs.length; i++) {
      let dlLink = resultsDlcs[i].url.replace(/ /g, "%20");
      const a = document.createElement("a");
      a.className = "dl-link";
      a.href = dlLink;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = removeExt(resultsDlcs[i].name);
      divRoms.appendChild(a);
    }
    const fromDiv = document.createElement("div");
    fromDiv.style.marginTop = "1em";
    fromDiv.innerHTML = `From <a href="https://archive.org/download/PSP-DLC/%5BNo-Intro%5D%20PSP%20DLC" style="color: #5b9bd5;">PSP-DLC (No-Intro)</a>`;
    divRoms.appendChild(fromDiv);
  }

  // src/features/game-page/rom-sources/archive.js
  function searchArcade(ctx) {
    const { gameTitle, consoleName, tag, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    var mainDir = "//archive.org/download/2020_01_06_fbn/roms/arcade.zip/arcade%2F";
    var datDir = "https://raw.githubusercontent.com/libretro/FBNeo/master/dats/FinalBurn%20Neo%20(ClrMame%20Pro%20XML%2C%20Arcade%20only).dat";
    return gmFetch(datDir).then(function(response) {
      var xmlDoc = parseXml(response.responseText);
      xmlDoc.querySelectorAll("game").forEach(function(el) {
        var descEl = el.querySelector("description");
        var name = descEl ? descEl.textContent : "";
        if (tag === "" && name.toLowerCase().includes("hack")) return;
        if (tag === "Hack" && !name.toLowerCase().includes("hack")) return;
        if (refinedCompare2(name, gameTitle)) {
          results.push({
            name,
            url: mainDir + el.getAttribute("name") + ".zip"
          });
        }
      });
      if (results.length === 0) {
        xmlDoc.querySelectorAll("game").forEach(function(el) {
          var descEl = el.querySelector("description");
          var name = descEl ? descEl.textContent : "";
          if (tag === "" && name.toLowerCase().includes("hack")) return;
          if (tag === "Hack" && !name.toLowerCase().includes("hack")) return;
          if (compare2(name, gameTitle)) {
            results.push({
              name,
              url: mainDir + el.getAttribute("name") + ".zip"
            });
          }
        });
      }
      return true;
    }).catch(function(err) {
      log.warn("Arcade search failed: " + err.message);
      return true;
    });
  }
  function searchNoIntro2016(ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    var mainDir = "https://archive.org/download/No-Intro-Collection_2016-01-03_Fixed/";
    var consoleDir = "";
    var secondaryConsoleDir = "";
    const consoleDirMap = {
      [RAConsole.SNES]: "Nintendo - Super Nintendo Entertainment System",
      [RAConsole.NES]: "Nintendo - Nintendo Entertainment System",
      [RAConsole.GAMEBOY]: "Nintendo - Game Boy",
      [RAConsole.GAMEBOYCOLOR]: "Nintendo - Game Boy Color",
      [RAConsole.GAMEBOYADVANCE]: "Nintendo - Game Boy Advance",
      [RAConsole.NINTENDO64]: "Nintendo - Nintendo 64",
      [RAConsole.ATARI7800]: "Atari - 7800",
      [RAConsole.PCENGINE]: "NEC - PC Engine - TurboGrafx 16",
      [RAConsole.MEGADRIVE]: "Sega - Mega Drive - Genesis",
      [RAConsole.MASTERSYSTEM]: "Sega - Master System - Mark III",
      [RAConsole.GAMEGEAR]: "Sega - Game Gear",
      [RAConsole.POKEMINI]: "Nintendo - Pokemon Mini",
      [RAConsole.VIRTUALBOY]: "Nintendo - Virtual Boy",
      [RAConsole.SG1000]: "Sega - SG-1000",
      [RAConsole.COLECO]: "Coleco - ColecoVision",
      [RAConsole.VECTREX]: "GCE - Vectrex"
    };
    consoleDir = consoleDirMap[consoleName] || "";
    if (consoleName === RAConsole.NEOGEOPOCKET) {
      consoleDir = "SNK - Neo Geo Pocket";
      secondaryConsoleDir = "SNK - Neo Geo Pocket Color";
    }
    if (consoleName === RAConsole.MSX) {
      consoleDir = "Microsoft - MSX";
      secondaryConsoleDir = "Microsoft - MSX 2";
    }
    if (consoleName === RAConsole.WONDERSWAN) {
      consoleDir = "Bandai - WonderSwan Color";
      secondaryConsoleDir = "Bandai - WonderSwan Color";
    }
    consoleDir = consoleDir.replace(/ /g, "%20").concat(".zip/");
    secondaryConsoleDir = secondaryConsoleDir.replace(/ /g, "%20").concat(".zip/");
    function parseNoIntroResults(responseText) {
      var doc = parseHtml(responseText);
      doc.querySelectorAll("td > :first-child").forEach(function(el) {
        if (refinedCompare2(el.textContent, gameTitle)) {
          results.push({ name: el.textContent, url: el.getAttribute("href") });
        }
      });
      if (results.length === 0) {
        doc.querySelectorAll("td > :first-child").forEach(function(el) {
          if (compare2(el.textContent, gameTitle)) {
            results.push({ name: el.textContent, url: el.getAttribute("href") });
          }
        });
      }
    }
    return gmFetch(mainDir + consoleDir).then(function(response) {
      parseNoIntroResults(response.responseText);
      return true;
    }).catch(function(err) {
      log.warn("NoIntro2016 primary search failed: " + err.message);
      return true;
    }).then(function() {
      if (secondaryConsoleDir !== ".zip/") {
        return gmFetch(mainDir + secondaryConsoleDir).then(function(response) {
          parseNoIntroResults(response.responseText);
          return true;
        }).catch(function(err) {
          log.warn("NoIntro2016 secondary search failed: " + err.message);
          return true;
        });
      }
    });
  }
  function searchArchiveDlc(mainDir, ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    return gmFetch(mainDir).then(function(response) {
      var doc = parseHtml(response.responseText);
      var cells = doc.querySelectorAll("td > :first-child");
      cells.forEach(function(el) {
        var match = /([^\/]+)\/?$/g.exec(el.textContent);
        if (!match) return;
        var title = match[1];
        var href = el.getAttribute("href") || "";
        var fullUrl = href.startsWith("//archive.org/download/") ? href : mainDir + "/" + href;
        if (refinedCompare2(title, gameTitle)) {
          resultsDlcs.push({ name: title, url: fullUrl });
        }
      });
      if (resultsDlcs.length === 0) {
        cells.forEach(function(el) {
          var match = /([^\/]+)\/?$/g.exec(el.textContent);
          if (!match) return;
          var title = match[1];
          var href = el.getAttribute("href") || "";
          var fullUrl = href.startsWith("//archive.org/download/") ? href : mainDir + "/" + href;
          if (compare2(title, gameTitle)) {
            resultsDlcs.push({ name: title, url: fullUrl });
          }
        });
      }
      return true;
    }).catch(function(err) {
      log.warn("Archive DLC search failed: " + err.message);
      return true;
    });
  }

  // src/features/game-page/rom-sources/emuparadise.js
  function searchEmuparadise(ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    var mainDir = "https://www.emuparadise.me";
    var consoleUrlMap = {
      [RAConsole.SNES]: "Super_Nintendo_Entertainment_System_(SNES)_ROMs/List-All-Titles/5",
      [RAConsole.NES]: "Nintendo_Entertainment_System_ROMs/List-All-Titles/13",
      [RAConsole.GAMEBOY]: "Nintendo_Game_Boy_ROMs/List-All-Titles/12",
      [RAConsole.GAMEBOYCOLOR]: "Nintendo_Game_Boy_Color_ROMs/List-All-Titles/11",
      [RAConsole.GAMEBOYADVANCE]: "Nintendo_Gameboy_Advance_ROMs/List-All-Titles/31",
      [RAConsole.NINTENDO64]: "Nintendo_64_ROMs/List-All-Titles/9",
      [RAConsole.GAMECUBE]: "Nintendo_Gamecube_ISOs/List-All-Titles/42",
      [RAConsole.NINTENDODS]: "Nintendo_DS_ROMs/List-All-Titles/32",
      [RAConsole.MEGADRIVE]: "Sega_Genesis_-_Sega_Megadrive_ROMs/List-All-Titles/6",
      [RAConsole.MASTERSYSTEM]: "Sega_Master_System_ROMs/List-All-Titles/15",
      [RAConsole.SEGA32X]: "Sega_32X_ROMs/61",
      [RAConsole.SATURN]: "Sega_Saturn_ISOs/List-All-Titles/3",
      [RAConsole.SEGACD]: "Sega_CD_ISOs/List-All-Titles/10",
      [RAConsole.GAMEGEAR]: "Sega_Game_Gear_ROMs/List-All-Titles/14",
      [RAConsole.NEOGEOPOCKET]: "Neo_Geo_Pocket_-_Neo_Geo_Pocket_Color_(NGPx)_ROMs/38",
      [RAConsole.ATARI2600]: "Atari_2600_ROMs/List-All-Titles/49",
      [RAConsole.ATARI7800]: "Atari_7800_ROMs/47",
      [RAConsole.PCENGINE]: "PC_Engine_-_TurboGrafx16_ROMs/List-All-Titles/16",
      [RAConsole.APPLEII]: "Apple_][_ROMs/List-All-Titles/24",
      [RAConsole.PS1]: "Sony_Playstation_ISOs/List-All-Titles/2",
      [RAConsole.PS2]: "Sony_Playstation_2_ISOs/List-All-Titles/41",
      [RAConsole.PSP]: "PSP_ISOs/List-All-Titles/44",
      [RAConsole.P3DO]: "Panasonic_3DO_(3DO_Interactive_Multiplayer)_ISOs/List-All-Titles/20"
    };
    var consoleUrl = consoleUrlMap[consoleName];
    if (!consoleUrl) return Promise.resolve();
    return gmFetch(mainDir + "/" + consoleUrl).then(function(response) {
      var doc = parseHtml(response.responseText);
      var items = doc.querySelectorAll(".index.gamelist");
      function buildDownloadPageUrl(href) {
        var clean = href.replace(/\/+$/, "");
        return mainDir + clean;
      }
      items.forEach(function(el) {
        var href = el.getAttribute("href") || "";
        if (!href) return;
        if (refinedCompare2(el.textContent, gameTitle)) {
          results.push({
            name: el.textContent,
            url: buildDownloadPageUrl(href)
          });
        }
      });
      if (results.length === 0) {
        items.forEach(function(el) {
          var href = el.getAttribute("href") || "";
          if (!href) return;
          if (compare2(el.textContent, gameTitle)) {
            results.push({
              name: el.textContent,
              url: buildDownloadPageUrl(href)
            });
          }
        });
      }
      return true;
    }).catch(function(err) {
      log.warn("Emuparadise search failed: " + err.message);
      return true;
    });
  }

  // src/features/game-page/rom-sources/myrient.js
  function chainSearchMyrient(urls, ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    let promise = searchMyrient(urls[0], ctx);
    for (let i = 1; i < urls.length; i++) {
      promise = promise.then(() => {
        if (results.length === 0) {
          return searchMyrient(urls[i], ctx);
        }
      });
    }
    return promise;
  }
  function searchMyrient(mainDir, ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    return gmFetch(mainDir).then(function(response) {
      var doc = parseHtml(response.responseText);
      var cells = doc.querySelectorAll("td > :first-child");
      cells.forEach(function(el) {
        var textContent = el.textContent;
        var match = /([^\/]+)\/?$/g.exec(textContent);
        if (!match) return;
        var title = match[1];
        if (refinedCompare2(title, gameTitle)) {
          var fullUrl = mainDir.endsWith("/") ? mainDir + el.getAttribute("href") : mainDir + "/" + el.getAttribute("href");
          results.push({ name: title, url: fullUrl });
        }
      });
      if (results.length === 0) {
        cells.forEach(function(el) {
          var textContent = el.textContent;
          var match = /([^\/]+)\/?$/g.exec(textContent);
          if (!match) return;
          var title = match[1];
          if (compare2(title, gameTitle)) {
            var fullUrl = mainDir.endsWith("/") ? mainDir + el.getAttribute("href") : mainDir + "/" + el.getAttribute("href");
            results.push({ name: title, url: fullUrl });
          }
        });
      }
      return true;
    }).catch(function(err) {
      log.warn("Myrient search failed: " + err.message);
      return true;
    });
  }

  // src/features/game-page/rom-sources/romsfun.js
  var romsfunConsoleSlug = {
    [RAConsole.SNES]: "super-nintendo",
    [RAConsole.NES]: "nintendo-nes",
    [RAConsole.GAMEBOY]: "game-boy",
    [RAConsole.GAMEBOYCOLOR]: "game-boy-color",
    [RAConsole.GAMEBOYADVANCE]: "game-boy-advance",
    [RAConsole.NINTENDO64]: "nintendo-64",
    [RAConsole.GAMECUBE]: "gamecube",
    [RAConsole.NINTENDODS]: "nintendo-ds",
    [RAConsole.NINTENDODSI]: "nintendo-dsi",
    [RAConsole.PS1]: "playstation",
    [RAConsole.PS2]: "playstation-2",
    [RAConsole.PSP]: "psp",
    [RAConsole.MEGADRIVE]: "sega-genesis",
    [RAConsole.MASTERSYSTEM]: "sega-master-system",
    [RAConsole.GAMEGEAR]: "game-gear",
    [RAConsole.SATURN]: "sega-saturn",
    [RAConsole.DREAMCAST]: "dreamcast",
    [RAConsole.SEGACD]: "sega-cd",
    [RAConsole.SEGA32X]: "sega-32x",
    [RAConsole.ATARI2600]: "atari-2600",
    [RAConsole.ATARI7800]: "atari-7800",
    [RAConsole.PCENGINE]: "pc-engine",
    [RAConsole.NEOGEOPOCKET]: "neo-geo-pocket",
    [RAConsole.VIRTUALBOY]: "virtual-boy",
    [RAConsole.WII]: "wii",
    [RAConsole.ARCADE]: "arcade",
    [RAConsole.MSX]: "msx",
    [RAConsole.P3DO]: "3do",
    [RAConsole.COLECO]: "colecovision",
    [RAConsole.ATARILYNX]: "atari-lynx",
    [RAConsole.WONDERSWAN]: "wonderswan",
    [RAConsole.POKEMINI]: "pokemon-mini"
  };
  function searchRomsFun(ctx) {
    const { gameTitle, consoleName, results, resultsDlcs, collection, compare: compare2, refinedCompare: refinedCompare2 } = ctx;
    var searchUrl = "https://romsfun.com/wp-json/wp/v2/rom?search=" + encodeURIComponent(gameTitle) + "&per_page=10";
    var expectedSlug = romsfunConsoleSlug[consoleName] || "";
    return gmFetch(searchUrl, 15e3).then(function(resp) {
      var data = JSON.parse(resp.responseText);
      if (!Array.isArray(data) || data.length === 0) return;
      data.forEach(function(rom) {
        var romTitle = rom.title && rom.title.rendered || "";
        var romLink = rom.link || "";
        var romSlug = rom.slug || "";
        var romId = rom.id;
        if (expectedSlug && !romLink.includes("/roms/" + expectedSlug + "/")) return;
        if (refinedCompare2(romTitle, gameTitle)) {
          results.push({
            name: romTitle + " (RomsFun)",
            url: "https://romsfun.com/download/" + romSlug + "-" + romId
          });
        }
      });
      if (results.length === 0) {
        data.forEach(function(rom) {
          var romTitle = rom.title && rom.title.rendered || "";
          var romLink = rom.link || "";
          var romSlug = rom.slug || "";
          var romId = rom.id;
          if (expectedSlug && !romLink.includes("/roms/" + expectedSlug + "/")) return;
          if (compare2(romTitle, gameTitle)) {
            results.push({
              name: romTitle + " (RomsFun)",
              url: "https://romsfun.com/download/" + romSlug + "-" + romId
            });
          }
        });
      }
      return true;
    }).catch(function(err) {
      log.warn("RomsFun search failed: " + err.message);
      return true;
    });
  }

  // src/features/game-page/media.js
  function parseIso8601(time) {
    var parsed = "";
    let regex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;
    let groups = regex.exec(time);
    if (groups[6] != void 0) parsed += groups[6] + "h ";
    if (groups[7] != void 0) parsed += groups[7] + "m ";
    if (groups[8] != void 0) parsed += groups[8] + "s ";
    return parsed;
  }
  function toEmbedUrl(url) {
    if (url.includes("twitch") || url.includes("youtu")) {
      var regexYoutube = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)?([^\s&]+)/;
      var regexTwitch = /(?:https?:\/{2})?www\.twitch\.tv\/(?:[\S]+\/)?([\]?)?\/([\d]+)/;
      if (url.match(regexYoutube) != void 0) {
        return "https://www.youtube.com/embed/" + url.match(regexYoutube)[1];
      } else if (url.match(regexTwitch) != void 0) {
        return "https://player.twitch.tv/?video=" + url.match(regexTwitch)[2] + "&parent=retroachievements.org&autoplay=false";
      }
    }
    return "";
  }

  // src/features/game-page/speedrun.js
  function initSpeedrunSection(options) {
    const { gameTitle, consoleName, container, enableSpeedrun, enableGameplayVideo } = options;
    var srRoot = "https://www.speedrun.com/api/v1/";
    var srLogo = "";
    var srVideoUrl = "";
    var srGamelink = "";
    var srGameId = "";
    var srRuns = [];
    function createSpeedrun() {
      const h3 = document.createElement("h3");
      h3.textContent = "World Records";
      h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
      container.appendChild(h3);
      if (srRuns.length > 0) {
        srRuns.forEach((runsData) => {
          const div = document.createElement("div");
          div.innerHTML = `<a href="${encodeURI(runsData.link)}" style="color: #5b9bd5;">${escapeHtml(runsData.category)}:</a> ${escapeHtml(runsData.time)} by ${escapeHtml(runsData.runner)}`;
          container.appendChild(div);
        });
      } else {
        const div = document.createElement("div");
        div.textContent = "Couldn't find this game on Speedrun.com";
        container.appendChild(div);
      }
      makeCollapsible(container, "speedrun");
    }
    function createVideo() {
      if (srVideoUrl === "") return;
      if (document.querySelector("iframe.enhanced-video")) return;
      log.debug("Creating video with URL: " + srVideoUrl);
      const gameShow = document.querySelector('[data-testid="game-show"]');
      if (gameShow && gameShow.firstElementChild) {
        const iframe = document.createElement("iframe");
        iframe.className = "enhanced-video";
        iframe.style.cssText = "display: block; width: 100%; height: 315px; padding-bottom: 1em; border: none; border-radius: 0.5rem;";
        iframe.src = srVideoUrl;
        iframe.allowFullscreen = true;
        iframe.setAttribute("autoplay", "false");
        const screenshotsDiv = gameShow.firstElementChild;
        screenshotsDiv.after(iframe);
      }
    }
    function getSrConsoleId(cName) {
      const map = {
        [RAConsole.ATARI2600]: SRConsole.ATARI2600,
        [RAConsole.ATARI7800]: SRConsole.ATARI7800,
        [RAConsole.APPLEII]: SRConsole.APPLEII,
        [RAConsole.ARCADE]: SRConsole.ARCADE,
        [RAConsole.COLECO]: SRConsole.COLECOVISION,
        [RAConsole.DREAMCAST]: SRConsole.DREAMCAST,
        [RAConsole.GAMEBOY]: SRConsole.GAMEBOY,
        [RAConsole.GAMEBOYADVANCE]: SRConsole.GAMEBOYADVANCE,
        [RAConsole.GAMEBOYCOLOR]: SRConsole.GAMEBOYCOLOR,
        [RAConsole.MEGADRIVE]: SRConsole.MEGADRIVE,
        [RAConsole.GAMEGEAR]: SRConsole.GAMEGEAR,
        [RAConsole.NINTENDO64]: SRConsole.NINTENDO64,
        [RAConsole.SATURN]: SRConsole.SEGASATURN,
        [RAConsole.MASTERSYSTEM]: SRConsole.MASTERSYSTEM,
        [RAConsole.NINTENDODS]: SRConsole.NINTENDODS,
        [RAConsole.NEC8800]: SRConsole.NEC8800,
        [RAConsole.NEOGEOPOCKET]: SRConsole.NEOGEOPOCKETCOLOR,
        [RAConsole.NES]: SRConsole.NES,
        [RAConsole.P3DO]: SRConsole.PANASONIC3D0,
        [RAConsole.PCENGINE]: SRConsole.PCENGINE,
        [RAConsole.POKEMINI]: SRConsole.POKÉMONMINI,
        [RAConsole.PS1]: SRConsole.PS1,
        [RAConsole.PSP]: SRConsole.PLAYSTATIONPORTABLE,
        [RAConsole.SEGA32X]: SRConsole.SEGA32X,
        [RAConsole.SEGACD]: SRConsole.SEGACD,
        [RAConsole.SG1000]: SRConsole.MASTERSYSTEM,
        [RAConsole.SNES]: SRConsole.SNES,
        [RAConsole.VIRTUALBOY]: SRConsole.VIRTUALBOY,
        [RAConsole.AMSTRADCPC]: SRConsole.AMSTRADCPC
      };
      return map[cName] || "";
    }
    function getSpeedruns(gameName) {
      var consoleId = getSrConsoleId(consoleName);
      var srSearchUrl = encodeURI(srRoot + "games?name=" + gameName + "&platform=" + consoleId);
      return gmFetch(srSearchUrl).then(function(gamesResponse) {
        var gamesData = JSON.parse(gamesResponse.responseText).data;
        if (gamesData.length > 0) {
          srGamelink = gamesData[0].weblink;
          srGameId = gamesData[0].id;
          return gamesData[0].links[3].uri;
        } else {
          throw new Error("Couldn't find this game on Speedrun.com (" + srSearchUrl + ").");
        }
      }).then(function(link) {
        return gmFetch(link).then(function(response) {
          return JSON.parse(response.responseText).data;
        });
      }).then(function(categories) {
        return Promise.all(categories.map(function(category) {
          return gmFetch(srRoot + "runs?game=" + srGameId + "&category=" + category.id + "&status=verified").then(function(runsResponse) {
            var runsData = JSON.parse(runsResponse.responseText).data[0];
            if (runsData != void 0 && runsData.status.status !== "rejected") {
              if (srVideoUrl === "" && runsData.videos)
                srVideoUrl = toEmbedUrl(runsData.videos.links[0].uri);
            }
            return runsData;
          }).then(function(runsData) {
            if (runsData == void 0) return false;
            var isGuest = runsData.players[0].rel === "guest";
            return gmFetch(srRoot + "users/" + runsData.players[0].id).then(function(userRes) {
              var userData = JSON.parse(userRes.responseText).data;
              srRuns.push({
                category: category.name,
                time: parseIso8601(runsData.times.primary),
                runner: isGuest ? runsData.players[0].name : userData.names.international,
                link: runsData.videos ? runsData.videos.links[0].uri : ""
              });
              return true;
            }).catch(function(err) {
              log.warn("Failed to fetch user data: " + err.message);
              srRuns.push({
                category: category.name,
                time: parseIso8601(runsData.times.primary),
                runner: isGuest ? runsData.players[0].name : "Unknown",
                link: runsData.videos ? runsData.videos.links[0].uri : ""
              });
              return true;
            });
          }).catch(function(err) {
            log.warn("Failed to fetch runs for category: " + err.message);
            return false;
          });
        })).then(function() {
          if (enableSpeedrun) createSpeedrun();
          if (enableGameplayVideo) createVideo();
        });
      }).catch(function(err) {
        log.error("Speedrun fetch error: " + err.message);
        if (enableSpeedrun) {
          var div = document.createElement("div");
          div.textContent = "Couldn't find this game on Speedrun.com";
          container.appendChild(div);
        }
      });
    }
    if (enableGameplayVideo || enableSpeedrun) getSpeedruns(gameTitle);
  }

  // src/features/game-page/loading.js
  var loadingEl = null;
  function showLoading(container, text) {
    loadingEl = document.createElement("div");
    loadingEl.id = "enhanced-loading";
    loadingEl.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 0;color:#a3a3a3;font-size:0.9em;";
    loadingEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" style="animation:enhanced-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg><span>' + escapeHtml(text) + "</span>";
    var spinStyle = document.getElementById("enhanced-spin-style");
    if (!spinStyle) {
      spinStyle = document.createElement("style");
      spinStyle.id = "enhanced-spin-style";
      spinStyle.textContent = "@keyframes enhanced-spin { to { transform: rotate(360deg); } }";
      document.head.appendChild(spinStyle);
    }
    container.appendChild(loadingEl);
  }
  function hideLoading() {
    if (loadingEl) {
      loadingEl.remove();
      loadingEl = null;
    }
  }

  // src/features/game-page/index.js
  async function renderGamePage(config) {
    const refinedCompare2 = (a, b) => refinedCompare(a, b, consoleName);
    const compare2 = (a, b) => compare(a, b, consoleName);
    const { enableSpeedrun, enableRomSearch, enableCustomBG, enableGameplayVideo, enableEmuparadise, prioritizeEmuparadise, enableGlassEffect, enableHashCheck, enableRomsFun, enableDebugLog, enableRarityIndicator, translateLang, accentColor } = config;
    let props = null;
    let consoleName = "";
    let gameTitle = "";
    let gameId = "";
    let gameImg = "";
    let tag = "";
    const rgxTag = /~(.*?)~/g;
    try {
      await waitForElement('[data-testid="game-show"], [data-testid="sidebar"]');
      props = getInertiaProps();
      if (props && props.game) {
        const gameData = props.game || {};
        const backingGame = props.backingGame || {};
        const system = gameData.system || {};
        consoleName = system.name || "";
        gameTitle = backingGame.title || gameData.title || "";
        gameId = String(backingGame.id || gameData.id || "");
        gameImg = gameData.imageIngameUrl || "";
        log.info("[Inertia] Game = " + gameTitle + " | Console = " + consoleName + " | ID = " + gameId);
      } else {
        log.info("Inertia props unavailable, falling back to DOM scraping");
        const h1 = document.querySelector("h1");
        const ogTitle = document.querySelector('meta[property="og:title"]');
        gameTitle = h1 && h1.textContent.trim() || ogTitle && ogTitle.getAttribute("content") || document.title.split(" - ")[0].trim() || "";
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const canonical = document.querySelector('link[rel="canonical"]');
        const urlSource = ogUrl && ogUrl.getAttribute("content") || canonical && canonical.getAttribute("href") || location.href;
        const idMatch = /game\/(\d+)/.exec(urlSource);
        if (idMatch) gameId = idMatch[1];
        const systemChip = document.querySelector('a[href*="/system/"] span.hidden.sm\\:inline') || document.querySelector('a[href*="/system/"] span:last-child') || document.querySelector('[data-testid="desktop-banner"] a[href*="/system/"]');
        consoleName = systemChip ? systemChip.textContent.trim() : "";
        const ingameImg = document.querySelector('img[alt="ingame screenshot"]') || document.querySelector('img[alt="In-game screenshot"]') || document.querySelector('[data-testid="game-show"] img:nth-child(2)');
        gameImg = ingameImg ? ingameImg.getAttribute("src") : "";
        log.info("[DOM] Game = " + gameTitle + " | Console = " + consoleName + " | ID = " + gameId);
      }
    } catch (e) {
      log.error("Failed to get game data: " + e);
      return;
    }
    if (gameTitle.match(rgxTag) != void 0) {
      tag = rgxTag.exec(gameTitle)[1];
      gameTitle = gameTitle.replace(gameTitle.match(rgxTag) + " ", "");
    }
    if (consoleName === "") return;
    var isAvailable = false;
    var collection = { name: "", url: "" };
    var results = [];
    var resultsDlcs = [];
    applyGamePageBackground(gameImg, enableCustomBG);
    applyGlassEffect(enableGlassEffect);
    var isMobile = window.innerWidth < 1024;
    const sidebar = document.querySelector('aside [data-testid="sidebar"]') || document.querySelector("aside");
    const mobileContainer = isMobile ? document.querySelector("main.with-sidebar > article") || document.querySelector("main > article") : null;
    const divRoms = document.createElement("div");
    divRoms.id = "enhanced-romsdl";
    divRoms.style.marginTop = "1em";
    const divSpeedruncom = document.createElement("div");
    divSpeedruncom.id = "enhanced-speedruncom";
    divSpeedruncom.style.margin = "1em 0em";
    var injectionTarget = sidebar;
    if (isMobile && !sidebar && mobileContainer) {
      injectionTarget = mobileContainer;
      log.info("[Mobile] Injecting into article container");
    }
    if (injectionTarget) {
      const boxart = injectionTarget.querySelector("div.overflow-hidden.text-center") || (sidebar ? sidebar.firstElementChild : null);
      if (boxart && boxart.nextSibling) {
        boxart.after(divSpeedruncom);
        boxart.after(divRoms);
      } else if (sidebar) {
        sidebar.prepend(divSpeedruncom);
        sidebar.prepend(divRoms);
      } else {
        injectionTarget.appendChild(divRoms);
        injectionTarget.appendChild(divSpeedruncom);
      }
      keepSidebarSectionsAttached(injectionTarget, [divRoms, divSpeedruncom]);
    }
    initSpeedrunSection({
      gameTitle,
      consoleName,
      container: divSpeedruncom,
      enableSpeedrun,
      enableGameplayVideo
    });
    injectGuideLink(props, divRoms, injectionTarget);
    setTimeout(function() {
      injectTranslateButtons(translateLang);
    }, 1500);
    var achObserver = new MutationObserver(function() {
      injectTranslateButtons(translateLang);
      if (enableRarityIndicator) injectRarityIndicators();
    });
    var mainContent = document.querySelector("main") || document.body;
    achObserver.observe(mainContent, { childList: true, subtree: true });
    if (enableRarityIndicator) {
      setTimeout(injectRarityIndicators, 1500);
    }
    setTimeout(function() {
      achObserver.disconnect();
    }, 3e4);
    var knownHashes = [];
    const romContext = {
      gameTitle,
      consoleName,
      tag,
      results,
      resultsDlcs,
      collection,
      compare: compare2,
      refinedCompare: refinedCompare2,
      divRoms,
      knownHashes
    };
    if (enableRomSearch) {
      for (const prop in RAConsole) {
        if (RAConsole.hasOwnProperty(prop)) {
          if (RAConsole[prop] === consoleName) isAvailable = true;
        }
      }
      if (isAvailable && tag === "" || consoleName === RAConsole.ARCADE && tag !== "") {
        getCachedRomResults(gameTitle, consoleName).then(function(cached) {
          if (cached) {
            results.length = 0;
            results.push.apply(results, cached.results);
            resultsDlcs.length = 0;
            resultsDlcs.push.apply(resultsDlcs, cached.resultsDlcs || []);
            Object.assign(collection, cached.collection || {});
            log.info("[Cache] Using cached ROM results (" + results.length + " ROMs)");
            return fetchGameHashes(gameId, enableHashCheck).then(function(hashes) {
              knownHashes = hashes;
              romContext.knownHashes = hashes;
              romContext.knownHashes = hashes;
            }).catch(function() {
              knownHashes = [];
              romContext.knownHashes = [];
            }).then(function() {
              if (results.length > 0) {
                createDownloads(romContext);
              } else {
                createNoRomsNotification(romContext);
              }
              if (resultsDlcs.length > 0) createDlcs(romContext);
            });
          }
          showLoading(divRoms, "Searching ROMs...");
          log.info("Starting ROM search for: " + gameTitle + " [" + consoleName + "]");
          var promise;
          if (enableEmuparadise && prioritizeEmuparadise) {
            collection.name = "Emuparadise";
            collection.url = "https://www.emuparadise.me/roms-isos-games.php";
            promise = searchEmuparadise(romContext);
          } else {
            promise = Promise.resolve();
          }
          var searchTimedOut = false;
          var SEARCH_TIMEOUT_MS = 3e4;
          var searchChain = promise.then(() => {
            if (results.length === 0) {
              if (consoleName === RAConsole.ARCADE) {
                collection.name = "FB Neo Nightly";
                collection.url = "https://archive.org/download/2020_01_06_fbn";
                return searchArcade(romContext);
              }
              if (myrientCollectionDict[consoleName]) {
                const entry = myrientCollectionDict[consoleName];
                collection.name = entry.name;
                collection.url = entry.urls[0];
                const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
                return chainSearchMyrient(urls, romContext);
              } else {
                collection.name = "No-Intro 2016";
                collection.url = "https://archive.org/download/No-Intro-Collection_2016-01-03_Fixed";
                return searchNoIntro2016(romContext);
              }
            }
          }).then(() => {
            if (enableEmuparadise && results.length === 0) {
              collection.name = "Emuparadise";
              collection.url = "https://www.emuparadise.me/roms-isos-games.php";
              return searchEmuparadise(romContext);
            }
          }).then(() => {
            if (enableRomsFun && results.length === 0) {
              collection.name = "RomsFun";
              collection.url = "https://romsfun.com/roms/";
              return searchRomsFun(romContext);
            }
          }).then(() => {
            if (consoleName === RAConsole.PSP)
              return searchArchiveDlc("https://archive.org/download/PSP-DLC/%5BNo-Intro%5D%20PSP%20DLC/", romContext);
          }).then(() => {
            return fetchGameHashes(gameId, enableHashCheck).then(function(hashes) {
              knownHashes = hashes;
              romContext.knownHashes = hashes;
              log.info("[HashCheck] knownHashes loaded: " + knownHashes.length + " hashes for game " + gameId);
            }).catch(function(err) {
              log.warn("[HashCheck] fetchGameHashes promise failed: " + err.message);
              knownHashes = [];
            });
          });
          var timeoutPromise = new Promise(function(_, reject) {
            setTimeout(function() {
              searchTimedOut = true;
              reject(new Error("ROM search timed out after " + SEARCH_TIMEOUT_MS / 1e3 + "s"));
            }, SEARCH_TIMEOUT_MS);
          });
          Promise.race([searchChain, timeoutPromise]).then(() => {
            hideLoading();
            setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collection.name, collection.url);
            if (results.length > 0) {
              log.info("Found " + results.length + " ROM(s)");
              createDownloads(romContext);
            } else {
              log.info("No ROMs found");
              createNoRomsNotification(romContext);
            }
            if (resultsDlcs.length > 0) createDlcs(romContext);
          }).catch(function(err) {
            hideLoading();
            log.warn("ROM search failed: " + err.message);
            if (results.length > 0) {
              setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collection.name, collection.url);
              createDownloads(romContext);
            } else {
              createNoRomsNotification(romContext);
            }
          });
        });
      } else {
        log.debug("Searching roms for this system not supported: " + consoleName);
      }
    }
  }

  // src/features/settings/panel-host.js
  function findSettingsPanelHost(root) {
    if (!root) return null;
    var activePanel = root.querySelector('[role="tabpanel"][data-state="active"]');
    if (activePanel && activePanel.parentElement) return activePanel.parentElement;
    var anyPanel = root.querySelector('[role="tabpanel"]');
    if (anyPanel && anyPanel.parentElement) return anyPanel.parentElement;
    var legacy = root.querySelector("div.flex.flex-col > div.flex.flex-col");
    return legacy || root;
  }

  // src/features/settings/index.js
  async function renderSettingsPage(config) {
    const { enableSpeedrun, enableRomSearch, enableCustomBG, enableGameplayVideo, enableEmuparadise, prioritizeEmuparadise, enableGlassEffect, enableHashCheck, enableRomsFun, enableDebugLog, enableRarityIndicator, translateLang, accentColor } = config;
    try {
      const settingsContainer = await waitForElement("main article");
      const panelHost = findSettingsPanelHost(settingsContainer);
      if (panelHost && !document.getElementById("enhanced-settings")) {
        let createSwitchHtml = function(id, checked) {
          var state = checked ? "checked" : "unchecked";
          return '<button id="' + id + '" role="switch" type="button" aria-checked="' + checked + '" data-state="' + state + '" class="enhanced-switch" tabindex="0"><span class="enhanced-switch-thumb"></span></button>';
        }, bindSwitch = function(id, gmKey) {
          var btn = document.getElementById(id);
          if (!btn) return;
          btn.addEventListener("click", function() {
            var isChecked = this.getAttribute("data-state") === "checked";
            var newState = !isChecked;
            this.setAttribute("data-state", newState ? "checked" : "unchecked");
            this.setAttribute("aria-checked", String(newState));
            GM_setValue(gmKey, newState);
          });
        };
        const switchStyle = document.getElementById("enhanced-switch-style") || document.createElement("style");
        switchStyle.id = "enhanced-switch-style";
        switchStyle.textContent = `
        .enhanced-switch {
          position: relative;
          display: inline-flex;
          height: 1.5rem;
          width: 2.75rem;
          flex-shrink: 0;
          cursor: pointer;
          align-items: center;
          border-radius: 9999px;
          border: 2px solid transparent;
          transition: background-color 0.2s;
          background-color: #404040;
        }
        .enhanced-switch[data-state="checked"] {
          background-color: #3b82f6;
        }
        .enhanced-switch-thumb {
          pointer-events: none;
          display: block;
          height: 1.25rem;
          width: 1.25rem;
          border-radius: 9999px;
          background-color: #fafafa;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,.1);
          transition: transform 0.2s;
          transform: translateX(0);
        }
        .enhanced-switch[data-state="checked"] .enhanced-switch-thumb {
          transform: translateX(1.25rem);
        }
        .enhanced-switch:focus-visible {
          outline: 2px solid #d4d4d4;
          outline-offset: 2px;
        }
      `;
        document.head.appendChild(switchStyle);
        var settingsItems = [
          { id: "enhanced-romsearch", key: "enableRomSearch", val: enableRomSearch, label: "Enable ROMs search" },
          {
            id: "enhanced-hashcheck",
            key: "enableHashCheck",
            val: enableHashCheck,
            label: "Verify ROM hashes with RA API",
            hint: "Marks ROMs whose filename matches a known RA hash (requires RA API key in settings below)"
          },
          {
            id: "enhanced-epromsearch",
            key: "enableEmuparadise",
            val: enableEmuparadise,
            label: "Add Emuparadise to ROMs search",
            hint: 'For Chrome users: enable mixed content; for all browsers: must click "Add Exception" the first time'
          },
          {
            id: "enhanced-prioritize_ep",
            key: "prioritizeEmuparadise",
            val: prioritizeEmuparadise,
            label: "Prioritize Emuparadise for ROMs search",
            hint: 'Must have "Add Emuparadise to ROMs search" enabled'
          },
          {
            id: "enhanced-romsfun",
            key: "enableRomsFun",
            val: enableRomsFun,
            label: "Add RomsFun to ROMs search",
            hint: "Search romsfun.com for ROMs via their WordPress API"
          },
          { id: "enhanced-speedrun", key: "enableSpeedrun", val: enableSpeedrun, label: "Enable Speedrun.com stats" },
          { id: "enhanced-gameplayvideo", key: "enableGameplayVideo", val: enableGameplayVideo, label: "Enable gameplay video on the game page" },
          { id: "enhanced-custombg", key: "enableCustomBG", val: enableCustomBG, label: "Enable custom game page background" },
          { id: "enhanced-glassEffect", key: "enableGlassEffect", val: enableGlassEffect, label: "Enable glass background effect" },
          {
            id: "enhanced-rarity",
            key: "enableRarityIndicator",
            val: enableRarityIndicator,
            label: "Achievement rarity indicator",
            hint: "Color-coded badges on achievements by unlock % (Common, Uncommon, Rare, Very Rare, Ultra Rare, Legendary)"
          }
        ];
        var rowsHtml = settingsItems.map(function(item) {
          var hintHtml = item.hint ? '<span style="display:block;font-size:0.8em;color:#b9b9b9;margin-top:2px;">' + item.hint + "</span>" : "";
          return '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;"><label for="' + item.id + '" class="text-menu-link cursor-pointer" style="flex:1;">' + item.label + hintHtml + "</label>" + createSwitchHtml(item.id, item.val) + "</div>";
        }).join("");
        var langOptions = [
          { code: "pt-BR", label: "Português (BR)" },
          { code: "es-ES", label: "Español" },
          { code: "fr-FR", label: "Français" },
          { code: "de-DE", label: "Deutsch" },
          { code: "it-IT", label: "Italiano" },
          { code: "ja-JP", label: "日本語" },
          { code: "ko-KR", label: "한국어" },
          { code: "zh-CN", label: "中文 (简体)" },
          { code: "ru-RU", label: "Русский" },
          { code: "ar-SA", label: "العربية" }
        ];
        var langOptionsHtml = langOptions.map(function(opt) {
          return '<option value="' + opt.code + '"' + (translateLang === opt.code ? " selected" : "") + ">" + escapeHtml(opt.label) + "</option>";
        }).join("");
        var langSelectorHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);"><label for="enhanced-translate-lang" class="text-menu-link" style="flex:1;">Translation language <span style="font-size:0.8em;color:#b9b9b9;">(for achievement card translate buttons)</span></label><select id="enhanced-translate-lang" style="width:200px;padding:4px 8px;border-radius:6px;border:1px solid #525252;background:#262626;color:#e5e5e5;font-size:0.875rem;cursor:pointer;">' + langOptionsHtml + "</select></div>";
        var currentApiKey = await GM_getValue("raApiKey", "");
        var apiKeyHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);"><label for="enhanced-apikey" class="text-menu-link" style="flex:1;">RA API Key <span style="font-size:0.8em;color:#b9b9b9;">(for hash verification — find yours at Settings > Keys)</span></label><input id="enhanced-apikey" type="password" value="' + escapeHtml(currentApiKey) + '" placeholder="Your web API key" style="width:200px;padding:4px 8px;border-radius:6px;border:1px solid #525252;background:#262626;color:#e5e5e5;font-size:0.875rem;" /></div>';
        var accentColorHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);"><label for="enhanced-accent-color" class="text-menu-link" style="flex:1;">Accent color <span style="font-size:0.8em;color:#b9b9b9;">(custom highlight color for toggles, buttons, and UI elements)</span></label><div style="display:flex;align-items:center;gap:8px;"><input id="enhanced-accent-color" type="color" value="' + escapeHtml(accentColor) + '" style="width:40px;height:32px;border:1px solid #525252;border-radius:6px;background:#262626;cursor:pointer;padding:2px;" /><button id="enhanced-accent-reset" style="padding:4px 10px;border-radius:6px;border:1px solid #525252;background:#262626;color:#a3a3a3;font-size:0.8rem;cursor:pointer;" title="Reset to default blue">Reset</button></div></div>';
        const enhancedDiv = document.createElement("div");
        enhancedDiv.id = "enhanced-settings";
        enhancedDiv.className = "w-full rounded-lg border border-embed-highlight bg-embed p-6 text-card-foreground shadow-xs light:border-neutral-300 light:bg-white";
        enhancedDiv.innerHTML = '<h3 class="pb-2 border-b-0 text-2xl font-semibold leading-none tracking-tight">RA Toolkit</h3><div class="flex flex-col gap-4" style="margin-top:1rem;">' + rowsHtml + langSelectorHtml + apiKeyHtml + accentColorHtml + '</div><div class="flex w-full justify-end" style="margin-top:1rem;"><button id="enhanced-settings-save" class="btn-base btn-base--default btn-base--size-default" type="button">Atualizar</button></div>';
        panelHost.appendChild(enhancedDiv);
        keepSettingsCardAttached(panelHost, enhancedDiv);
        settingsItems.forEach(function(item) {
          bindSwitch(item.id, item.key);
        });
        var langSelect = document.getElementById("enhanced-translate-lang");
        if (langSelect) {
          langSelect.addEventListener("change", function() {
            GM_setValue("translateLang", this.value);
          });
        }
        var apiKeyInput = document.getElementById("enhanced-apikey");
        if (apiKeyInput) {
          apiKeyInput.addEventListener("change", function() {
            GM_setValue("raApiKey", this.value);
          });
        }
        var accentInput = document.getElementById("enhanced-accent-color");
        if (accentInput) {
          accentInput.addEventListener("input", function() {
            GM_setValue("accentColor", this.value);
            var s = document.getElementById("enhanced-accent-style");
            if (s) {
              s.textContent = ":root { --ra-accent: " + this.value + '; } .enhanced-switch[data-state="checked"] { background-color: ' + this.value + " !important; } .enhanced-translate-btn.translated { color: " + this.value + "; border-color: " + this.value + "40; }";
            }
            document.querySelectorAll('.enhanced-switch[data-state="checked"]').forEach(function(sw) {
              sw.style.backgroundColor = accentInput.value;
            });
          });
        }
        var accentReset = document.getElementById("enhanced-accent-reset");
        if (accentReset) {
          accentReset.addEventListener("click", function() {
            var defaultColor = "#3b82f6";
            GM_setValue("accentColor", defaultColor);
            if (accentInput) accentInput.value = defaultColor;
            accentInput.dispatchEvent(new Event("input"));
          });
        }
        var saveBtn = document.getElementById("enhanced-settings-save");
        if (saveBtn) {
          saveBtn.addEventListener("click", function() {
            var originalText = saveBtn.textContent;
            saveBtn.textContent = "✓ Salvo!";
            saveBtn.style.opacity = "0.7";
            saveBtn.disabled = true;
            setTimeout(function() {
              location.reload();
            }, 600);
          });
        }
      }
    } catch (e) {
      log.error("Settings page injection failed: " + e);
    }
  }

  // src/app.js
  var GAME_PAGE = /^\/game\/[0-9]+/;
  async function init() {
    console.log("[RA Toolkit] ⚙️  init() starting on: " + location.pathname);
    cleanup();
    const page = location.pathname;
    const config = await loadConfig();
    applyGlobalStyles(config);
    showChangelogPopup();
    if (page === "/settings") {
      await renderSettingsPage(config);
    } else if (GAME_PAGE.test(page)) {
      await renderGamePage(config);
    }
  }

  // src/features/comments/linkify.js
  function initWallLinkify() {
    var isUserCommentsPage = /^\/user\/[^\/]+(\/(comments)?)?$/i.test(location.pathname);
    var isAchievementPage = /^\/achievement\/\d+(\/.*)?$/i.test(location.pathname);
    if (!isUserCommentsPage && !isAchievementPage) return;
    if (!document.getElementById("enhanced-wall-linkify-style")) {
      var style = document.createElement("style");
      style.id = "enhanced-wall-linkify-style";
      style.textContent = `
      .enhanced-wall-link {
        color: var(--ra-accent, #3b82f6);
        text-decoration: underline;
        word-break: break-all;
      }
      .enhanced-wall-link:hover {
        opacity: 0.8;
      }
      .enhanced-yt-embed {
        display: block;
        margin-top: 6px;
        border-radius: 6px;
        overflow: hidden;
        max-width: 360px;
        aspect-ratio: 16/9;
      }
      .enhanced-yt-embed iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }
      .enhanced-img-preview {
        display: block;
        margin-top: 6px;
        max-width: 360px;
        max-height: 300px;
        border-radius: 6px;
        object-fit: contain;
        cursor: pointer;
      }
      .enhanced-img-preview:hover {
        opacity: 0.85;
      }
    `;
      document.head.appendChild(style);
    }
    var imageExtRegex = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)(\?[^#]*)?$/i;
    function isImageUrl(url) {
      return imageExtRegex.test(url);
    }
    function extractYouTubeId(url) {
      var m = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    }
    function linkifyCommentBody(bodyEl) {
      if (bodyEl.getAttribute("data-enhanced-linkified")) return;
      bodyEl.setAttribute("data-enhanced-linkified", "1");
      var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      var urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
      var youtubeIds = [];
      var imageUrls = [];
      textNodes.forEach(function(node) {
        var text = node.textContent;
        if (!urlRegex.test(text)) return;
        urlRegex.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var lastIdx = 0;
        var match;
        while ((match = urlRegex.exec(text)) !== null) {
          if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
          }
          var rawUrl = match[0].replace(/[.,;:!?)]+$/, "");
          var href = rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;
          var a = document.createElement("a");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.className = "enhanced-wall-link";
          a.textContent = rawUrl;
          frag.appendChild(a);
          var ytId = extractYouTubeId(href);
          if (ytId && youtubeIds.indexOf(ytId) === -1) {
            youtubeIds.push(ytId);
          }
          if (isImageUrl(href) && imageUrls.indexOf(href) === -1) {
            imageUrls.push(href);
          }
          lastIdx = match.index + match[0].length;
          var trimmed = match[0].length - rawUrl.length;
          if (trimmed > 0) {
            frag.appendChild(document.createTextNode(match[0].slice(match[0].length - trimmed)));
          }
        }
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }
        node.parentNode.replaceChild(frag, node);
      });
      youtubeIds.forEach(function(ytId) {
        var wrapper = document.createElement("div");
        wrapper.className = "enhanced-yt-embed";
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(ytId);
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        wrapper.appendChild(iframe);
        bodyEl.appendChild(wrapper);
      });
      imageUrls.forEach(function(imgUrl) {
        var img = document.createElement("img");
        img.className = "enhanced-img-preview";
        img.src = imgUrl;
        img.alt = "Image preview";
        img.loading = "lazy";
        img.title = "Click to open in new tab";
        img.addEventListener("click", function() {
          window.open(imgUrl, "_blank", "noopener,noreferrer");
        });
        bodyEl.appendChild(img);
      });
    }
    function processAllComments() {
      var commentItems = document.querySelectorAll(
        "tr.comment.group, .commentscomponent tr.comment, ul.highlighted-list > li"
      );
      commentItems.forEach(function(el) {
        var bodyEl = null;
        var candidates = el.querySelectorAll('[style*="word-break"]');
        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i].textContent.trim()) {
            bodyEl = candidates[i];
            break;
          }
        }
        if (!bodyEl) {
          var td = el.querySelector("td[colspan]") || el.querySelector("td.w-full");
          if (td) {
            var divs = td.querySelectorAll(":scope > div");
            for (var j = divs.length - 1; j >= 0; j--) {
              var txt = divs[j].textContent.trim();
              if (txt && !divs[j].querySelector(".smalldate") && txt.length > 2) {
                bodyEl = divs[j];
                break;
              }
            }
          }
        }
        if (!bodyEl) {
          var contentDiv = el.querySelector("div.w-full");
          if (contentDiv) {
            var ps = contentDiv.querySelectorAll(":scope > p");
            for (var k = ps.length - 1; k >= 0; k--) {
              var t = ps[k].textContent.trim();
              if (t && !ps[k].querySelector(".smalldate") && t.length > 2) {
                bodyEl = ps[k];
                break;
              }
            }
          }
        }
        if (!bodyEl) return;
        linkifyCommentBody(bodyEl);
      });
    }
    setTimeout(processAllComments, 800);
    var linkifyObserver = new MutationObserver(function() {
      processAllComments();
    });
    var container = document.querySelector(".commentscomponent") || document.querySelector("ul.highlighted-list") || document.querySelector("main") || document.body;
    linkifyObserver.observe(container, { childList: true, subtree: true });
    log.info("Comments linkify initialized");
  }

  // src/features/comments/translate.js
  async function initWallTranslation() {
    var isUserCommentsPage = /^\/user\/[^\/]+(\/(comments)?)?$/i.test(location.pathname);
    var isAchievementPage = /^\/achievement\/\d+(\/.*)?$/i.test(location.pathname);
    if (!isUserCommentsPage && !isAchievementPage) return;
    var wallLang = await GM_getValue("translateLang", "pt-BR");
    function wallTranslateText(text, targetLang) {
      return translateWithRateLimit(text, targetLang);
    }
    if (!document.getElementById("enhanced-wall-translate-style")) {
      var style = document.createElement("style");
      style.id = "enhanced-wall-translate-style";
      style.textContent = `
      .enhanced-wall-translate-btn {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        background: transparent;
        color: #a3a3a3;
        font-size: 0.7em;
        cursor: pointer;
        transition: all 0.2s;
        vertical-align: middle;
        margin-top: 4px;
      }
      .enhanced-wall-translate-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #e5e5e5;
        border-color: rgba(255,255,255,0.25);
      }
      .enhanced-wall-translate-btn.translating {
        opacity: 0.6;
        pointer-events: none;
      }
      .enhanced-wall-translate-btn.translated {
        color: #3b82f6;
        border-color: rgba(59,130,246,0.3);
      }
      .enhanced-wall-translate-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
    `;
      document.head.appendChild(style);
    }
    function injectWallTranslateButtons() {
      var commentItems = document.querySelectorAll(
        "tr.comment.group, .commentscomponent tr.comment, ul.highlighted-list > li"
      );
      commentItems.forEach(function(el) {
        if (el.querySelector(".enhanced-wall-translate-btn")) return;
        var bodyEl = null;
        var candidates = el.querySelectorAll('[style*="word-break"]');
        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i].textContent.trim()) {
            bodyEl = candidates[i];
            break;
          }
        }
        if (!bodyEl) {
          var td = el.querySelector("td[colspan]") || el.querySelector("td.w-full");
          if (td) {
            var divs = td.querySelectorAll(":scope > div");
            for (var j = divs.length - 1; j >= 0; j--) {
              var txt = divs[j].textContent.trim();
              if (txt && !divs[j].querySelector(".smalldate") && txt.length > 2) {
                bodyEl = divs[j];
                break;
              }
            }
          }
        }
        if (!bodyEl) {
          var contentDiv = el.querySelector("div.w-full");
          if (contentDiv) {
            var ps = contentDiv.querySelectorAll(":scope > p");
            for (var k = ps.length - 1; k >= 0; k--) {
              var t = ps[k].textContent.trim();
              if (t && !ps[k].querySelector(".smalldate") && t.length > 2) {
                bodyEl = ps[k];
                break;
              }
            }
          }
        }
        if (!bodyEl || !bodyEl.textContent.trim()) return;
        var btn = document.createElement("button");
        btn.className = "enhanced-wall-translate-btn";
        var commentText = bodyEl.textContent.trim();
        if (commentText.length > 500) {
          btn.classList.add("disabled");
          btn.title = "Text exceeds 500 character limit for translation (" + commentText.length + " chars)";
          btn.innerHTML = "&#x1F310; Too long";
          bodyEl.after(btn);
          return;
        }
        btn.title = "Translate to " + wallLang;
        btn.innerHTML = "&#x1F310; Translate";
        var isTranslated = false;
        var originalText = bodyEl.innerHTML;
        var translatedText = null;
        btn.addEventListener("click", function() {
          if (btn.classList.contains("translating")) return;
          if (isTranslated) {
            bodyEl.innerHTML = originalText;
            btn.innerHTML = "&#x1F310; Translate";
            btn.classList.remove("translated");
            isTranslated = false;
            return;
          }
          if (translatedText) {
            bodyEl.innerHTML = translatedText;
            btn.innerHTML = "&#x1F310; Original";
            btn.classList.add("translated");
            isTranslated = true;
            return;
          }
          btn.classList.add("translating");
          btn.innerHTML = "&#x23F3; ...";
          wallTranslateText(bodyEl.textContent.trim(), wallLang).then(function(result) {
            translatedText = escapeHtml(result).replace(/\n/g, "<br>");
            bodyEl.innerHTML = translatedText;
            btn.innerHTML = "&#x1F310; Original";
            btn.classList.remove("translating");
            btn.classList.add("translated");
            isTranslated = true;
          }).catch(function(err) {
            log.warn("Wall translation failed: " + err.message);
            var isRateLimit = err.message && err.message.indexOf("RATE_LIMIT") === 0;
            btn.innerHTML = isRateLimit ? "&#x26D4; Limit" : "&#x26A0; Error";
            btn.title = isRateLimit ? err.message.replace("RATE_LIMIT: ", "") : "Translation failed";
            btn.classList.remove("translating");
            if (!isRateLimit) {
              setTimeout(function() {
                btn.innerHTML = "&#x1F310; Translate";
                btn.title = "Translate to " + wallLang;
              }, 2e3);
            }
          });
        });
        bodyEl.after(btn);
      });
    }
    await new Promise(function(r) {
      setTimeout(r, 1e3);
    });
    injectWallTranslateButtons();
    var wallObserver = new MutationObserver(function() {
      injectWallTranslateButtons();
    });
    var wallContainer = document.querySelector(".commentscomponent") || document.querySelector("ul.highlighted-list") || document.querySelector("main") || document.body;
    wallObserver.observe(wallContainer, { childList: true, subtree: true });
    log.info("Comment translation initialized");
  }

  // src/features/game-awards/index.js
  async function initGameAwardsBeaten() {
    var page = location.pathname;
    var userMatch = page.match(/^\/user\/([^\/?#]+)/);
    if (!userMatch) return;
    var targetUser = decodeURIComponent(userMatch[1]);
    var apiKey = await GM_getValue("raApiKey", "");
    if (!apiKey) return;
    var gameAwardsDiv = document.getElementById("gameawards");
    if (!gameAwardsDiv) return;
    if (document.getElementById("re-game-awards-tabs")) return;
    var heading = gameAwardsDiv.querySelector("h3");
    var nativeGrid = gameAwardsDiv.querySelector(".component");
    if (!heading || !nativeGrid) return;
    var nativeCounters = heading.querySelector(".grow");
    var nativeCounterSpans = heading.querySelectorAll(".cursor-help");
    var headingCountersContainer = heading;
    var originalCountersHtml = "";
    var counterDivs = heading.querySelectorAll(".cursor-help");
    counterDivs.forEach(function(el) {
      originalCountersHtml += el.outerHTML;
    });
    if (!document.getElementById("re-game-awards-style")) {
      var style = document.createElement("style");
      style.id = "re-game-awards-style";
      style.textContent = `
      .re-awards-tabs {
        display: flex;
        gap: 0;
        margin-bottom: 8px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .re-awards-tab {
        flex: 1;
        padding: 6px 10px;
        font-size: 0.8rem;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        background: transparent;
        color: #a3a3a3;
        border: none;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .re-awards-tab:hover { background: rgba(255,255,255,0.05); color: #e4e4e7; }
      .re-awards-tab.active {
        background: rgba(255,255,255,0.1);
        color: #e4e4e7;
      }
      .re-awards-tab .re-tab-count {
        font-size: 0.7rem;
        background: rgba(255,255,255,0.1);
        padding: 1px 6px;
        border-radius: 10px;
        min-width: 20px;
        text-align: center;
      }
      .re-awards-tab.active .re-tab-count {
        background: rgba(255,255,255,0.2);
      }
      .re-beaten-empty {
        grid-column: 1 / -1;
        text-align: center;
        color: #525252;
        font-size: 0.8rem;
        padding: 12px 0;
      }
    `;
      document.head.appendChild(style);
    }
    var tabsDiv = document.createElement("div");
    tabsDiv.id = "re-game-awards-tabs";
    tabsDiv.className = "re-awards-tabs";
    var masteredTab = document.createElement("button");
    masteredTab.className = "re-awards-tab active";
    masteredTab.innerHTML = '👑 Mastered <span class="re-tab-count" id="re-mastered-count">-</span>';
    var beatenTab = document.createElement("button");
    beatenTab.className = "re-awards-tab";
    beatenTab.innerHTML = '🏆 Beaten <span class="re-tab-count" id="re-beaten-count">-</span>';
    tabsDiv.appendChild(masteredTab);
    tabsDiv.appendChild(beatenTab);
    nativeGrid.parentNode.insertBefore(tabsDiv, nativeGrid);
    var beatenGrid = document.createElement("div");
    beatenGrid.className = "component w-full place-content-center bg-embed gap-2 grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] xl:rounded xl:py-2";
    beatenGrid.style.display = "none";
    beatenGrid.innerHTML = '<div class="re-beaten-empty">Loading...</div>';
    nativeGrid.parentNode.insertBefore(beatenGrid, nativeGrid.nextSibling);
    var masteredBadges = nativeGrid.querySelectorAll(".goldimage");
    var completedBadges = nativeGrid.querySelectorAll(".badgeimg.siteawards");
    var masteredCount = masteredBadges.length + completedBadges.length;
    var masteredCountEl = document.getElementById("re-mastered-count");
    if (masteredCountEl) masteredCountEl.textContent = String(masteredCount);
    var beatenTotalCount = 0;
    var masteredTotalCount = masteredCount;
    var beatenHcCount = 0;
    var beatenScCount = 0;
    function updateHeadingCounters(mode) {
      var existing = headingCountersContainer.querySelectorAll(".cursor-help");
      existing.forEach(function(el) {
        el.remove();
      });
      if (mode === "mastered") {
        var temp = document.createElement("div");
        temp.innerHTML = originalCountersHtml;
        while (temp.firstChild) {
          headingCountersContainer.appendChild(temp.firstChild);
        }
      } else {
        if (beatenHcCount > 0) {
          var hcDiv = document.createElement("div");
          hcDiv.className = "cursor-help flex gap-x-1 text-sm";
          hcDiv.title = beatenHcCount + (beatenHcCount === 1 ? " game" : " games") + " beaten";
          hcDiv.innerHTML = '<div class="text-2xs">🏆</div><div class="numitems">' + beatenHcCount + "</div>";
          headingCountersContainer.appendChild(hcDiv);
        }
        if (beatenScCount > 0) {
          var scDiv = document.createElement("div");
          scDiv.className = "cursor-help flex gap-x-1 text-sm";
          scDiv.title = beatenScCount + (beatenScCount === 1 ? " game" : " games") + " beaten (casual)";
          scDiv.innerHTML = '<div class="text-2xs">🎖️</div><div class="numitems">' + beatenScCount + "</div>";
          headingCountersContainer.appendChild(scDiv);
        }
        if (beatenHcCount === 0 && beatenScCount === 0) {
          var emptyDiv = document.createElement("div");
          emptyDiv.className = "cursor-help flex gap-x-1 text-sm";
          emptyDiv.title = "0 games beaten";
          emptyDiv.innerHTML = '<div class="text-2xs">🏆</div><div class="numitems">0</div>';
          headingCountersContainer.appendChild(emptyDiv);
        }
      }
    }
    masteredTab.addEventListener("click", function() {
      masteredTab.classList.add("active");
      beatenTab.classList.remove("active");
      nativeGrid.style.display = "";
      beatenGrid.style.display = "none";
      updateHeadingCounters("mastered");
    });
    beatenTab.addEventListener("click", function() {
      beatenTab.classList.add("active");
      masteredTab.classList.remove("active");
      nativeGrid.style.display = "none";
      beatenGrid.style.display = "";
      updateHeadingCounters("beaten");
    });
    var awardsUrl = "https://retroachievements.org/API/API_GetUserAwards.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey);
    gmFetch(awardsUrl, 15e3).then(function(resp) {
      var data = JSON.parse(resp.responseText);
      var awards = data.VisibleUserAwards || [];
      var beatenAwards = awards.filter(function(a) {
        return (a.AwardType || "").toLowerCase() === "game beaten" && a.ConsoleName !== "Events";
      });
      var masteredAwards = awards.filter(function(a) {
        var aType = (a.AwardType || "").toLowerCase();
        return (aType === "mastery/completion" || aType === "mastery") && a.ConsoleName !== "Events";
      });
      masteredTotalCount = masteredAwards.length;
      if (masteredCountEl) masteredCountEl.textContent = String(masteredAwards.length);
      beatenHcCount = beatenAwards.filter(function(a) {
        return parseInt(a.AwardDataExtra, 10) === 1;
      }).length;
      beatenScCount = beatenAwards.filter(function(a) {
        return parseInt(a.AwardDataExtra, 10) !== 1;
      }).length;
      beatenTotalCount = beatenAwards.length;
      var beatenCountEl = document.getElementById("re-beaten-count");
      if (beatenCountEl) beatenCountEl.textContent = String(beatenAwards.length);
      beatenGrid.innerHTML = "";
      if (beatenAwards.length === 0) {
        beatenGrid.innerHTML = '<div class="re-beaten-empty">No beaten games yet.</div>';
        return;
      }
      beatenAwards.forEach(function(award) {
        var gameId = award.AwardData;
        var imageIcon = award.ImageIcon || "";
        var isHardcore = parseInt(award.AwardDataExtra, 10) === 1;
        var imgSrc = imageIcon ? "https://media.retroachievements.org" + imageIcon : "";
        var imgClass = isHardcore ? "goldimage" : "badgeimg siteawards";
        var wrapper = document.createElement("span");
        wrapper.className = "inline";
        wrapper.setAttribute("x-data", "tooltipComponent($el, { dynamicType: 'game', dynamicId: '" + gameId + "', dynamicContext: '" + escapeHtml(targetUser) + "' })");
        wrapper.setAttribute("x-on:mouseover", "showTooltip($event)");
        wrapper.setAttribute("x-on:mouseleave", "hideTooltip");
        wrapper.setAttribute("x-on:mousemove", "trackMouseMovement($event)");
        wrapper.innerHTML = '<a class="inline-block" href="/game/' + gameId + '"><img loading="lazy" decoding="async" width="48" height="48" src="' + escapeHtml(imgSrc) + '" alt="" class="' + imgClass + '"></a>';
        beatenGrid.appendChild(wrapper);
      });
      if (window.Alpine && Alpine.initTree) {
        Alpine.initTree(beatenGrid);
      }
    }).catch(function(err) {
      beatenGrid.innerHTML = '<div class="re-beaten-empty">Failed to load beaten games.</div>';
      log.warn("Game Awards Beaten fetch failed: " + err.message);
    });
  }

  // src/features/games-list/index.js
  async function initGamesMostMastered() {
    if (!/^\/games\/?$/i.test(location.pathname)) return;
    if (document.getElementById("re-most-mastered-tab")) return;
    var toolbar = null;
    for (var attempt = 0; attempt < 20; attempt++) {
      toolbar = document.querySelector("div.flex.w-full.flex-col.justify-between.gap-2");
      if (toolbar) break;
      await new Promise(function(r) {
        setTimeout(r, 300);
      });
    }
    if (!toolbar) {
      log.warn("Most Mastered: toolbar not found");
      return;
    }
    if (!document.getElementById("re-most-mastered-style")) {
      var style = document.createElement("style");
      style.id = "re-most-mastered-style";
      style.textContent = [
        ".re-mm-tabs{display:flex;gap:0;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);margin-bottom:4px}",
        ".re-mm-tab{flex:none;padding:6px 14px;font-size:0.8rem;font-weight:600;text-align:center;cursor:pointer;background:transparent;color:#a3a3a3;border:none;transition:all 0.2s;display:flex;align-items:center;gap:6px}",
        ".re-mm-tab:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}",
        ".re-mm-tab.active{background:rgba(255,255,255,0.1);color:#e4e4e7}",
        ".re-mm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:8px 0}",
        ".re-mm-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);transition:all 0.2s}",
        ".re-mm-card:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15)}",
        ".re-mm-card img{width:48px;height:48px;border-radius:6px;object-fit:cover}",
        ".re-mm-card-info{flex:1;min-width:0}",
        ".re-mm-card-title{font-size:0.85rem;font-weight:600;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;display:block}",
        ".re-mm-card-title:hover{color:#60a5fa;text-decoration:underline}",
        ".re-mm-card-meta{font-size:0.72rem;color:#737373;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap}",
        ".re-mm-card-badge{font-size:0.65rem;padding:1px 6px;border-radius:10px;display:inline-flex;align-items:center;gap:3px}",
        ".re-mm-badge-players{background:rgba(59,130,246,0.15);color:#60a5fa}",
        ".re-mm-badge-beaten{background:rgba(34,197,94,0.15);color:#4ade80}",
        ".re-mm-badge-achievements{background:rgba(234,179,8,0.15);color:#facc15}",
        ".re-mm-rank{font-size:0.75rem;font-weight:700;color:#525252;min-width:24px;text-align:center}",
        ".re-mm-loading{text-align:center;padding:24px;color:#737373;font-size:0.85rem}",
        ".re-mm-pagination{display:flex;justify-content:center;gap:6px;padding:12px 0}",
        ".re-mm-page-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#a3a3a3;cursor:pointer;font-size:0.8rem;transition:all 0.2s}",
        ".re-mm-page-btn:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}",
        ".re-mm-page-btn.active{background:rgba(255,255,255,0.1);color:#e4e4e7;font-weight:600}",
        ".re-mm-page-btn:disabled{opacity:0.4;cursor:default}",
        ".re-mm-system-tag{font-size:0.65rem;padding:1px 5px;border-radius:4px;background:rgba(139,92,246,0.15);color:#a78bfa}",
        "@media (prefers-color-scheme:light){",
        "  .re-mm-tab{color:#525252}",
        "  .re-mm-tab:hover,.re-mm-tab.active{background:rgba(0,0,0,0.06);color:#1a1a1a}",
        "  .re-mm-card{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.08)}",
        "  .re-mm-card:hover{background:rgba(0,0,0,0.06);border-color:rgba(0,0,0,0.15)}",
        "  .re-mm-card-title{color:#1a1a1a}",
        "  .re-mm-card-title:hover{color:#2563eb}",
        "  .re-mm-card-meta{color:#737373}",
        "  .re-mm-rank{color:#a3a3a3}",
        "  .re-mm-page-btn{color:#525252;border-color:rgba(0,0,0,0.1)}",
        "  .re-mm-page-btn.active{background:rgba(0,0,0,0.06);color:#1a1a1a}",
        "}"
      ].join("\n");
      document.head.appendChild(style);
    }
    var tabsBar = document.createElement("div");
    tabsBar.id = "re-most-mastered-tab";
    tabsBar.className = "re-mm-tabs";
    var defaultTab = document.createElement("button");
    defaultTab.className = "re-mm-tab active";
    defaultTab.textContent = "📋 All Games";
    var masteredTab = document.createElement("button");
    masteredTab.className = "re-mm-tab";
    masteredTab.innerHTML = "👑 Most Mastered";
    tabsBar.appendChild(defaultTab);
    tabsBar.appendChild(masteredTab);
    toolbar.parentNode.insertBefore(tabsBar, toolbar);
    var mmContainer = document.createElement("div");
    mmContainer.id = "re-most-mastered-container";
    mmContainer.style.display = "none";
    var existingTableWrapper = toolbar.parentNode;
    existingTableWrapper.parentNode.insertBefore(mmContainer, existingTableWrapper.nextSibling);
    var mmLoaded = false;
    var mmCurrentPage = 1;
    var mmPageSize = 25;
    var mmTotalPages = 1;
    var mmData = [];
    function renderMasteredGrid(items, page, totalPages, total) {
      var startRank = (page - 1) * mmPageSize + 1;
      var html = '<div class="re-mm-loading" style="padding:4px 0;font-size:0.8rem;color:#737373;text-align:right">👑 ' + total.toLocaleString() + ' games with achievements — sorted by most players</div><div class="re-mm-grid">';
      items.forEach(function(entry, i) {
        var game = entry.game || entry;
        var rank = startRank + i;
        var title = game.title || "Unknown";
        var imgUrl = game.badgeUrl || "";
        var playersTotal = game.playersTotal || 0;
        var timesBeatenHc = game.timesBeatenHardcore || 0;
        var achievements = game.achievementsPublished || 0;
        var systemName = game.system && game.system.name ? game.system.name : "";
        var gameId = game.id || 0;
        html += '<div class="re-mm-card"><div class="re-mm-rank">#' + rank + '</div><a href="/game/' + gameId + '"><img loading="lazy" decoding="async" src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(title) + '"></a><div class="re-mm-card-info"><a class="re-mm-card-title" href="/game/' + gameId + '" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</a><div class="re-mm-card-meta"><span class="re-mm-card-badge re-mm-badge-players">👥 ' + playersTotal.toLocaleString() + " players</span>" + (timesBeatenHc > 0 ? '<span class="re-mm-card-badge re-mm-badge-beaten">🏆 ' + timesBeatenHc.toLocaleString() + " beaten</span>" : "") + '<span class="re-mm-card-badge re-mm-badge-achievements">⭐ ' + achievements + " achievements</span>" + (systemName ? '<span class="re-mm-system-tag">' + escapeHtml(systemName) + "</span>" : "") + "</div></div></div>";
      });
      html += "</div>";
      if (totalPages > 1) {
        html += '<div class="re-mm-pagination">';
        html += '<button class="re-mm-page-btn" data-page="1"' + (page <= 1 ? " disabled" : "") + ">First</button>";
        html += '<button class="re-mm-page-btn" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + ">‹ Prev</button>";
        var startPage = Math.max(1, page - 2);
        var endPage = Math.min(totalPages, page + 2);
        for (var p = startPage; p <= endPage; p++) {
          html += '<button class="re-mm-page-btn' + (p === page ? " active" : "") + '" data-page="' + p + '">' + p + "</button>";
        }
        html += '<button class="re-mm-page-btn" data-page="' + (page + 1) + '"' + (page >= totalPages ? " disabled" : "") + ">Next ›</button>";
        html += '<button class="re-mm-page-btn" data-page="' + totalPages + '"' + (page >= totalPages ? " disabled" : "") + ">Last</button>";
        html += "</div>";
      }
      mmContainer.innerHTML = html;
      mmContainer.querySelectorAll(".re-mm-page-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var targetPage = parseInt(btn.getAttribute("data-page"), 10);
          if (targetPage && targetPage !== mmCurrentPage && targetPage >= 1 && targetPage <= mmTotalPages) {
            mmCurrentPage = targetPage;
            fetchMasteredPage(targetPage);
          }
        });
      });
    }
    function fetchMasteredPage(page) {
      mmContainer.innerHTML = '<div class="re-mm-loading">Loading most mastered games...</div>';
      var apiUrl = "/internal-api/games?page%5Bnumber%5D=" + page + "&page%5Bsize%5D=" + mmPageSize + "&sort=-playersTotal&filter%5BachievementsPublished%5D=has";
      fetch(apiUrl, {
        credentials: "same-origin",
        headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
      }).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      }).then(function(data) {
        var items = data.items || [];
        var total = data.total || 0;
        mmTotalPages = data.lastPage || 1;
        mmCurrentPage = page;
        mmLoaded = true;
        if (items.length === 0) {
          mmContainer.innerHTML = '<div class="re-mm-loading">No games found.</div>';
          return;
        }
        renderMasteredGrid(items, page, mmTotalPages, total);
      }).catch(function(err) {
        log.warn("Most Mastered fetch failed: " + err.message);
        mmContainer.innerHTML = '<div class="re-mm-loading">Failed to load games. ' + escapeHtml(err.message) + "</div>";
      });
    }
    defaultTab.addEventListener("click", function() {
      defaultTab.classList.add("active");
      masteredTab.classList.remove("active");
      existingTableWrapper.style.display = "";
      mmContainer.style.display = "none";
    });
    masteredTab.addEventListener("click", function() {
      masteredTab.classList.add("active");
      defaultTab.classList.remove("active");
      existingTableWrapper.style.display = "none";
      mmContainer.style.display = "";
      if (!mmLoaded) {
        fetchMasteredPage(1);
      }
    });
    log.info("Most Mastered tab initialized on /games");
  }

  // src/features/navbar/index.js
  function initAchievementNavLinks() {
    if (document.getElementById("re-achievements-dropdown")) return;
    var navItems = document.querySelectorAll(".dropdown.nav-item");
    if (!navItems.length) return;
    var gamesDropdown = null;
    for (var i = 0; i < navItems.length; i++) {
      var trigger = navItems[i].querySelector(".nav-link");
      if (trigger && /\bgames?\b/i.test(trigger.textContent)) {
        gamesDropdown = navItems[i];
        break;
      }
    }
    if (!gamesDropdown) return;
    var achDropdown = document.createElement("div");
    achDropdown.id = "re-achievements-dropdown";
    achDropdown.className = "dropdown nav-item";
    var btn = document.createElement("button");
    btn.className = "nav-link";
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.title = "Achievements";
    btn.innerHTML = '<span style="font-size:0.85em;">🏆</span> <span class="ml-1 hidden sm:inline-block">Achievements</span>';
    var menu = document.createElement("div");
    menu.className = "dropdown-menu";
    var links = [
      { href: "/achievementList.php", text: "All Achievements" },
      { href: "/achievementList.php?s=4&p=2", text: "🟢 Easy Achievements" },
      { href: "/achievementList.php?s=14&p=2", text: "🔴 Hardest Achievements" }
    ];
    links.forEach(function(item, idx) {
      if (idx === 1) {
        var div = document.createElement("div");
        div.className = "dropdown-divider";
        menu.appendChild(div);
      }
      var a = document.createElement("a");
      a.className = "dropdown-item";
      a.href = item.href;
      a.textContent = item.text;
      menu.appendChild(a);
    });
    achDropdown.appendChild(btn);
    achDropdown.appendChild(menu);
    gamesDropdown.parentNode.insertBefore(achDropdown, gamesDropdown.nextSibling);
  }

  // src/features/user-profile/skeletons.js
  function renderSkeletonCards(container, count) {
    container.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var card = document.createElement("div");
      card.className = "enhanced-skeleton-card";
      card.style.animationDelay = i * 0.1 + "s";
      card.innerHTML = '<div class="enhanced-skeleton-img"></div><div class="enhanced-skeleton-content"><div class="enhanced-skeleton-line w-60"></div><div class="enhanced-skeleton-line w-40"></div><div class="enhanced-skeleton-line w-30"></div><div class="enhanced-skeleton-bar"></div></div>';
      container.appendChild(card);
    }
  }
  function renderSkeletonBadges(container, count) {
    container.innerHTML = "";
    for (var i = 0; i < Math.min(count, 20); i++) {
      var span = document.createElement("span");
      span.className = "inline";
      span.innerHTML = '<div style="width:48px;height:48px;border-radius:6px;background:rgba(255,255,255,0.08);animation:enhanced-skeleton-pulse 1.5s ease-in-out infinite;animation-delay:' + i * 0.05 + 's;"></div>';
      container.appendChild(span);
    }
  }

  // src/features/user-profile/achievements.js
  var achievementCache = {};
  var playerCountCache = {};
  function clearAchievementCache() {
    for (const key in achievementCache) delete achievementCache[key];
    for (const key in playerCountCache) delete playerCountCache[key];
  }
  function fetchGameRarityData(gameId, targetUser, apiKey) {
    if (achievementCache[gameId]) {
      return Promise.resolve({ achievements: achievementCache[gameId], numPlayers: playerCountCache[gameId] || 0 });
    }
    var url = "https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?g=" + gameId + "&u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey);
    return gmFetch(url, 15e3).then(function(resp) {
      var data = JSON.parse(resp.responseText);
      var achievements = data.Achievements || {};
      var numPlayers = parseInt(data.NumDistinctPlayers, 10) || 0;
      achievementCache[gameId] = achievements;
      playerCountCache[gameId] = numPlayers;
      return { achievements, numPlayers };
    });
  }
  function fetchAndRenderAchievements(gameId, gridContainer, gameName, ctx) {
    const { targetUser, apiKey, enableRarityIndicator } = ctx;
    if (achievementCache[gameId]) {
      renderAchievementBadges(achievementCache[gameId], gridContainer, gameName, playerCountCache[gameId] || 0, enableRarityIndicator);
      return;
    }
    renderSkeletonBadges(gridContainer, 12);
    fetchGameRarityData(gameId, targetUser, apiKey).then(function(data) {
      renderAchievementBadges(data.achievements, gridContainer, gameName, data.numPlayers, enableRarityIndicator);
    }).catch(function() {
      gridContainer.innerHTML = '<div style="color:#ef4444;grid-column:1/-1;">Failed to load achievements</div>';
    });
  }
  function renderAchievementBadges(achievements, gridContainer, gameName, numPlayers, enableRarityIndicator) {
    gridContainer.innerHTML = "";
    var achList = Object.values(achievements);
    var unlocked = achList.filter(function(a) {
      return a.DateEarned || a.DateEarnedHardcore;
    });
    var locked = achList.filter(function(a) {
      return !a.DateEarned && !a.DateEarnedHardcore;
    });
    unlocked.sort(function(a, b) {
      var da = a.DateEarnedHardcore || a.DateEarned || "";
      var db = b.DateEarnedHardcore || b.DateEarned || "";
      return da > db ? -1 : da < db ? 1 : 0;
    });
    locked.sort(function(a, b) {
      return (a.DisplayOrder || 0) - (b.DisplayOrder || 0);
    });
    var sorted = unlocked.concat(locked);
    sorted.forEach(function(ach) {
      var isUnlocked = !!(ach.DateEarned || ach.DateEarnedHardcore);
      var badgeName = ach.BadgeName || "";
      var badgeUrl = isUnlocked ? "https://media.retroachievements.org/Badge/" + badgeName + ".png" : "https://media.retroachievements.org/Badge/" + badgeName + "_lock.png";
      var imgClass = isUnlocked ? "goldimage" : "badgeimglarge";
      var unlockText = "";
      if (ach.DateEarnedHardcore) {
        unlockText = "\nUnlocked " + ach.DateEarnedHardcore + " (hardcore)";
      } else if (ach.DateEarned) {
        unlockText = "\nUnlocked " + ach.DateEarned;
      }
      var rarityText = "";
      var borderStyle = "";
      var numAwarded = parseInt(ach.NumAwarded, 10) || 0;
      if (enableRarityIndicator && numPlayers > 0 && numAwarded > 0) {
        var pct = numAwarded / numPlayers * 100;
        var tier = getRarityTier(pct);
        rarityText = "\n" + tier.label + " (" + pct.toFixed(1) + "% unlock rate)";
        borderStyle = "border: 2px solid " + tier.color + "; border-radius: 8px;";
      }
      var titleText = ach.Title + "\n" + (ach.Description || "") + "\n" + (ach.Points || 0) + " points\n" + (gameName || "") + unlockText + rarityText;
      var span = document.createElement("span");
      span.className = "inline";
      span.innerHTML = '<a class="inline-block" href="https://retroachievements.org/achievement/' + ach.ID + '" title="' + escapeHtml(titleText) + '"><img loading="lazy" decoding="async" width="48" height="48" src="' + badgeUrl + '" alt="' + escapeHtml(ach.Title || "") + '" class="' + imgClass + '"' + (borderStyle ? ' style="' + borderStyle + '"' : "") + "></a>";
      gridContainer.appendChild(span);
    });
    if (sorted.length === 0) {
      gridContainer.innerHTML = '<div style="color:#a3a3a3;grid-column:1/-1;">No achievements</div>';
    }
  }

  // src/features/user-profile/styles.js
  function injectProfileStyles() {
    if (document.getElementById("enhanced-pagination-style")) return;
    var style = document.createElement("style");
    style.id = "enhanced-pagination-style";
    style.textContent = `
    @keyframes enhanced-spin { to { transform: rotate(360deg); } }
    .enhanced-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .enhanced-pagination button {
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.15);
      background: transparent;
      color: #a3a3a3;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.2s;
    }
    .enhanced-pagination button:hover:not(:disabled) {
      background: rgba(255,255,255,0.08);
      color: #e5e5e5;
      border-color: rgba(255,255,255,0.25);
    }
    .enhanced-pagination button.active {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;
    }
    .enhanced-pagination button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .enhanced-pagination .page-info {
      color: #a3a3a3;
      font-size: 0.8em;
    }
    .enhanced-games-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    @keyframes enhanced-skeleton-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .enhanced-skeleton-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 6px;
      background: rgba(255,255,255,0.03);
      animation: enhanced-skeleton-pulse 1.5s ease-in-out infinite;
    }
    .enhanced-skeleton-img {
      width: 58px;
      height: 58px;
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .enhanced-skeleton-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .enhanced-skeleton-line {
      height: 12px;
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
    }
    .enhanced-skeleton-line.w-60 { width: 60%; }
    .enhanced-skeleton-line.w-40 { width: 40%; }
    .enhanced-skeleton-line.w-30 { width: 30%; }
    .enhanced-skeleton-bar {
      height: 8px;
      width: 100%;
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      margin-top: 2px;
    }
    /* Enhanced User Stats */
    .stats-root { padding: 0; }
    .stats-title { font-size: 11px; font-weight: 500; color: #9ca3af; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 14px; }
    .stats-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .stats-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .metric-card { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .card-top { display: flex; align-items: center; justify-content: space-between; }
    .metric-label { font-size: 11px; color: #9ca3af; }
    .card-icon { font-size: 14px; line-height: 1; opacity: 0.7; }
    .metric-value { font-size: 20px; font-weight: 500; line-height: 1.1; }
    .metric-value-sm { font-size: 16px; font-weight: 500; line-height: 1.1; }
    .metric-sub { font-size: 11px; color: #9ca3af; }
    .stats-divider { border: none; border-top: 0.5px solid rgba(255,255,255,0.1); margin: 14px 0; }
    .section-label { font-size: 11px; font-weight: 500; color: #9ca3af; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
    /* Player Insights Dashboard */
    .enhanced-dashboard {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .enhanced-dashboard-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e4e4e7;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .enhanced-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .enhanced-stat-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: border-color 0.2s;
    }
    .enhanced-stat-card:hover {
      border-color: rgba(255,255,255,0.15);
    }
    .enhanced-stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #e4e4e7;
      line-height: 1.2;
    }
    .enhanced-stat-label {
      font-size: 0.7rem;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .enhanced-dashboard-section {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 14px 16px;
    }
    .enhanced-dashboard-section-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #a3a3a3;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .enhanced-almost-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .enhanced-almost-item:last-child { border-bottom: none; }
    .enhanced-almost-img {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .enhanced-almost-info {
      flex: 1;
      min-width: 0;
    }
    .enhanced-almost-name {
      font-size: 0.8rem;
      color: #e4e4e7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: none;
    }
    .enhanced-almost-name:hover { color: #60a5fa; }
    .enhanced-almost-meta {
      font-size: 0.7rem;
      color: #737373;
    }
    .enhanced-almost-bar-bg {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255,255,255,0.06);
      margin-top: 3px;
    }
    .enhanced-almost-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      transition: width 0.5s ease;
    }

    .enhanced-dashboard-skeleton {
      animation: enhanced-skeleton-pulse 1.5s ease-in-out infinite;
      background: rgba(255,255,255,0.06);
      border-radius: 6px;
    }
    /* Streak Tracker */
    .enhanced-streak-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .enhanced-streak-big {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
      color: #f97316;
      min-width: 56px;
      text-align: center;
    }
    .enhanced-streak-info {
      font-size: 0.78rem;
      color: #a3a3a3;
      line-height: 1.4;
    }
    .enhanced-streak-detail {
      font-size: 0.7rem;
      color: #525252;
    }
    /* Rarest Achievements */
    .enhanced-rare-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .enhanced-rare-item:hover {
      background: rgba(255,255,255,0.06);
    }
    .enhanced-rare-item:last-child { border-bottom: none; }
    .enhanced-rare-badge {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .enhanced-rare-info {
      flex: 1;
      min-width: 0;
    }
    .enhanced-rare-title {
      font-size: 0.8rem;
      color: #e4e4e7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .enhanced-rare-meta {
      font-size: 0.7rem;
      color: #737373;
    }
    .enhanced-rare-tier {
      margin-top: 3px;
      min-height: 16px;
    }
    .enhanced-rare-ratio {
      font-size: 0.75rem;
      font-weight: 700;
      color: #a78bfa;
      flex-shrink: 0;
      text-align: right;
      min-width: 40px;
    }
    /* Activity Timeline (GitHub contributions style - yearly heatmap) */
    .enhanced-timeline-wrapper {
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .enhanced-timeline-table {
      display: grid;
      gap: 2px;
      min-width: 0;
      width: 100%;
    }
    .enhanced-timeline-month-label {
      font-size: 0.55rem;
      color: #737373;
      text-align: left;
      white-space: nowrap;
      overflow: visible;
      line-height: 1;
      padding-bottom: 1px;
      position: relative;
    }
    .enhanced-timeline-day-label {
      font-size: 0.55rem;
      color: #737373;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 4px;
      line-height: 1;
    }
    .enhanced-timeline-cell {
      border-radius: 2px;
      min-width: 0;
      cursor: default;
    }
    .enhanced-timeline-cell.level-0 { background: rgba(255,255,255,0.04); }
    .enhanced-timeline-cell.level-1 { background: rgba(59,130,246,0.25); }
    .enhanced-timeline-cell.level-2 { background: rgba(59,130,246,0.5); }
    .enhanced-timeline-cell.level-3 { background: rgba(59,130,246,0.75); }
    .enhanced-timeline-cell.level-4 { background: #3b82f6; }
    /* Mastered mode (gold) */
    .enhanced-timeline-cell.mastered-1 { background: rgba(251,191,36,0.25); }
    .enhanced-timeline-cell.mastered-2 { background: rgba(251,191,36,0.5); }
    .enhanced-timeline-cell.mastered-3 { background: rgba(251,191,36,0.75); }
    .enhanced-timeline-cell.mastered-4 { background: #fbbf24; }
    /* Beaten mode (gray) */
    .enhanced-timeline-cell.beaten-1 { background: rgba(163,163,163,0.25); }
    .enhanced-timeline-cell.beaten-2 { background: rgba(163,163,163,0.5); }
    .enhanced-timeline-cell.beaten-3 { background: rgba(163,163,163,0.75); }
    .enhanced-timeline-cell.beaten-4 { background: #a3a3a3; }

    .enhanced-timeline-tooltip {
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      background: #1a1a2e;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.7rem;
      color: #e5e5e5;
      line-height: 1.6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.12s;
    }
    .enhanced-timeline-tooltip.visible { opacity: 1; }
    .enhanced-timeline-tooltip .tooltip-date {
      font-weight: 700;
      margin-bottom: 2px;
      color: #fff;
    }
    .enhanced-timeline-tooltip .tooltip-line {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .enhanced-timeline-tooltip .tooltip-line .tooltip-icon { font-size: 0.75rem; }
    .enhanced-timeline-tooltip .tooltip-no-activity { color: #737373; font-style: italic; }
    .enhanced-timeline-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 0.6rem;
      color: #525252;
    }
    .enhanced-timeline-legend {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6rem;
      color: #525252;
    }
    .enhanced-timeline-legend-cell {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
    .enhanced-timeline-toggle-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }
    .enhanced-timeline-toggle-btn {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #a3a3a3;
      transition: all 0.15s;
    }
    .enhanced-timeline-toggle-btn:hover {
      background: rgba(255,255,255,0.08);
    }
    .enhanced-timeline-toggle-btn.active {
      border-color: var(--toggle-color, #3b82f6);
      color: var(--toggle-color, #3b82f6);
      background: var(--toggle-bg, rgba(59,130,246,0.12));
    }
    .enhanced-timeline-total {
      font-size: 0.75rem;
      font-weight: 600;
      color: #a3a3a3;
      margin-left: 8px;
    }
  `;
    document.head.appendChild(style);
  }

  // src/features/user-profile/consoles.js
  var consoleIdMap = {
    1: { s: "MD", i: "md" },
    2: { s: "N64", i: "n64" },
    3: { s: "SNES", i: "snes" },
    4: { s: "GB", i: "gb" },
    5: { s: "GBA", i: "gba" },
    6: { s: "GBC", i: "gbc" },
    7: { s: "NES", i: "nes" },
    8: { s: "PCE", i: "pce" },
    9: { s: "SCD", i: "scd" },
    10: { s: "32X", i: "32-x" },
    11: { s: "SMS", i: "sms" },
    12: { s: "PS1", i: "ps1" },
    13: { s: "Lynx", i: "lynx" },
    14: { s: "NGP", i: "ngp" },
    15: { s: "GG", i: "gg" },
    16: { s: "GC", i: "gc" },
    17: { s: "JAG", i: "jag" },
    18: { s: "DS", i: "ds" },
    19: { s: "Wii", i: "wii" },
    20: { s: "WiiU", i: "wii-u" },
    21: { s: "PS2", i: "ps2" },
    22: { s: "Xbox", i: "xbox" },
    23: { s: "MO2", i: "mo-2" },
    24: { s: "MINI", i: "mini" },
    25: { s: "2600", i: "2600" },
    27: { s: "ARC", i: "arc" },
    28: { s: "VB", i: "vb" },
    29: { s: "MSX", i: "msx" },
    33: { s: "SG1K", i: "sg-1-k" },
    37: { s: "CPC", i: "cpc" },
    38: { s: "A2", i: "a2" },
    39: { s: "SAT", i: "sat" },
    40: { s: "DC", i: "dc" },
    41: { s: "PSP", i: "psp" },
    43: { s: "3DO", i: "3-do" },
    44: { s: "CV", i: "cv" },
    45: { s: "INTV", i: "intv" },
    46: { s: "VECT", i: "vect" },
    47: { s: "80/88", i: "8088" },
    49: { s: "PC-FX", i: "pc-fx" },
    51: { s: "7800", i: "7800" },
    53: { s: "WS", i: "ws" },
    56: { s: "NGCD", i: "ngcd" },
    57: { s: "CHF", i: "chf" },
    63: { s: "WSV", i: "wsv" },
    69: { s: "DUCK", i: "duck" },
    71: { s: "ARD", i: "ard" },
    72: { s: "WASM4", i: "wasm-4" },
    73: { s: "A2001", i: "a2001" },
    74: { s: "VC4000", i: "vc-4000" },
    75: { s: "ELEK", i: "elek" },
    76: { s: "PCCD", i: "pccd" },
    77: { s: "JCD", i: "jcd" },
    78: { s: "DSi", i: "dsi" },
    80: { s: "UZE", i: "uze" },
    81: { s: "FDS", i: "fds" },
    102: { s: "EXE", i: "exe" }
  };
  function getConsoleInfo(consoleId) {
    var entry = consoleIdMap[consoleId];
    if (entry) {
      return {
        shortName: entry.s,
        iconUrl: "https://static.retroachievements.org/assets/images/system/" + entry.i + ".png"
      };
    }
    return { shortName: "", iconUrl: "https://static.retroachievements.org/assets/images/system/unknown.png" };
  }

  // src/features/user-profile/game-list.js
  function renderGames(games, ctx) {
    const { targetUser, gamesList } = ctx;
    gamesList.innerHTML = "";
    if (games.length === 0) {
      gamesList.innerHTML = '<div style="color:#a3a3a3;padding:12px;">No more games found.</div>';
      return;
    }
    games.forEach(function(game) {
      var imgSrc = game.ImageIcon ? "https://retroachievements.org" + game.ImageIcon : "";
      var numAchieved = game.NumAchieved || 0;
      var numHC = game.NumAchievedHardcore || 0;
      var numTotal = game.NumPossibleAchievements || 0;
      var totalScore = game.PossibleScore || 0;
      var hcScore = game.ScoreAchievedHardcore || 0;
      var scScore = game.ScoreAchieved || 0;
      var exclusiveSoftcore = Math.max(scScore - hcScore, 0);
      var leftPoints = hcScore >= exclusiveSoftcore ? hcScore : exclusiveSoftcore;
      var hcPct = numTotal > 0 ? Math.floor(numHC / numTotal * 100) : 0;
      var totalPct = numTotal > 0 ? Math.floor(numAchieved / numTotal * 100) : 0;
      var softcoreBarWidth = Math.max(totalPct - hcPct, 0);
      var achHtml = "";
      if (numTotal > 0) {
        if (numAchieved === numTotal) {
          achHtml = 'All <span class="font-bold">' + numAchieved + "</span> achievements";
        } else {
          achHtml = '<span class="font-bold">' + numAchieved + '</span> of <span class="font-bold">' + numTotal + "</span> achievements";
        }
      }
      var pointsHtml = "";
      if (totalScore > 0) {
        pointsHtml = '<span class="font-bold">' + leftPoints + '</span> of <span class="font-bold">' + totalScore + "</span> points";
        if (exclusiveSoftcore > 0 && exclusiveSoftcore < hcScore) {
          pointsHtml += ' (+<span class="font-bold">' + exclusiveSoftcore + "</span> casual)";
        } else if (hcScore > 0 && exclusiveSoftcore > hcScore) {
          pointsHtml += ' (+<span class="font-bold">' + hcScore + "</span> hardcore)";
        }
      }
      var lastPlayedLabel = "";
      if (game.LastPlayed) {
        var d = new Date(game.LastPlayed);
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        lastPlayedLabel = months[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear();
      }
      var consoleInfo = getConsoleInfo(game.ConsoleID);
      var awardKind = "";
      var awardInfo = (ctx.gameAwardsMap || {})[String(game.GameID)];
      if (awardInfo) {
        awardKind = awardInfo.awardKind;
      } else if (numTotal > 0 && numHC === numTotal) {
        awardKind = "mastered";
      } else if (numTotal > 0 && numAchieved === numTotal) {
        awardKind = "completed";
      }
      var awardTitles = { "mastered": "Mastered", "completed": "Completed", "beaten-hardcore": "Beaten", "beaten-softcore": "Beaten (casual)" };
      var awardTitle = awardTitles[awardKind] || "Unfinished";
      var progressBarHtml = "";
      if (numTotal > 0) {
        progressBarHtml = '<div class="cprogress-pbar__root"><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + totalPct + '"><div style="width:' + hcPct + '%"' + (hcPct === 100 ? ' class="rounded-r"' : "") + '></div><div style="width:' + softcoreBarWidth + '%"' + (hcPct === 0 ? ' class="rounded-l"' : "") + (totalPct === 100 ? ' class="rounded-r"' : "") + '></div></div><p class="text-2xs flex justify-between w-full">' + totalPct + "%</p></div>";
      } else {
        progressBarHtml = '<div class="cprogress-pbar__root"><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div><p class="text-2xs flex justify-between w-full">No achievements yet</p></div>';
      }
      var awardIndicatorHtml = '<div class="cprogress-ind__root" data-award="' + awardKind + '" title="' + awardTitle + '"><div><div></div><div></div></div></div>';
      var consoleBadgeHtml = '<a href="https://retroachievements.org/user/' + encodeURIComponent(targetUser) + "/progress?filter%5Bsystem%5D=" + game.ConsoleID + '" class="hidden sm:flex gap-x-1 items-center rounded bg-zinc-950 light:bg-zinc-300 py-0.5 px-2"><img src="' + consoleInfo.iconUrl + '" width="18" height="18" alt="' + escapeHtml(game.ConsoleName) + ' console icon"><p>' + escapeHtml(consoleInfo.shortName || game.ConsoleName) + "</p></a>";
      var item = document.createElement("div");
      item.className = "relative flex flex-col w-full px-2 py-2 transition-all rounded-sm" + (awardKind ? " bg-zinc-950/60 light:bg-stone-200" : " bg-embed");
      item.innerHTML = '<div class="flex flex-col sm:flex-row w-full sm:justify-between sm:items-center gap-x-2"><div class="flex sm:items-center gap-x-2.5"><a href="/game/' + game.GameID + '"><img src="' + imgSrc + '" width="58" height="58" class="rounded-sm w-[58px] h-[58px]" loading="lazy" decoding="async" /></a><div class="cprogress-pmeta__root"><a href="/game/' + game.GameID + '">' + escapeHtml(game.Title) + "</a>" + (achHtml ? '<div class="flex flex-col"><p>' + achHtml + "</p>" + (pointsHtml ? "<p>" + pointsHtml + "</p>" : "") + "</div>" : "") + (lastPlayedLabel ? '<div class="flex !flex-col-reverse"><p><span>Last played</span> ' + lastPlayedLabel + "</p>" + (awardKind && awardTitles[awardKind] ? '<p><span class="hidden md:inline lg:hidden">&bull;</span> ' + awardTitles[awardKind] + (awardInfo && awardInfo.awardedAt ? ' <span style="color:#a3a3a3;font-size:0.75rem;">' + escapeHtml(new Date(awardInfo.awardedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) + "</span>" : "") + "</p>" : "") + "</div>" : "") + '</div></div><div class="mt-1 sm:mt-0"><div class="flex gap-x-2 items-center sm:gap-x-4 sm:divide-x divide-neutral-700 ml-[68px] sm:ml-0">' + consoleBadgeHtml + progressBarHtml + awardIndicatorHtml + '<div class="absolute sm:static top-0 right-0 sm:pl-4"><button class="btn transition-transform lg:active:scale-95 duration-75 re-toggle-btn"' + (numTotal <= 0 ? " disabled" : "") + '><div class="transition-transform duration-300 re-chevron-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/></svg></div></button></div></div></div></div><div class="re-expand-section" style="max-height:0;opacity:0;overflow:hidden;transition:all 300ms ease-in-out;"><hr class="mt-2 border-embed-highlight"><div class="py-4 place-content-center grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] px-0.5 sm:px-4 re-badges-grid"></div></div>';
      var toggleBtn = item.querySelector(".re-toggle-btn");
      var expandSection = item.querySelector(".re-expand-section");
      var chevronIcon = item.querySelector(".re-chevron-icon");
      var badgesGrid = item.querySelector(".re-badges-grid");
      var isExpanded = false;
      var hasFetched = false;
      if (toggleBtn && numTotal > 0) {
        toggleBtn.addEventListener("click", function() {
          isExpanded = !isExpanded;
          if (isExpanded) {
            expandSection.style.maxHeight = "2000px";
            expandSection.style.opacity = "1";
            chevronIcon.style.transform = "rotate(180deg)";
            if (!hasFetched) {
              hasFetched = true;
              fetchAndRenderAchievements(game.GameID, badgesGrid, game.Title, ctx);
            }
          } else {
            expandSection.style.maxHeight = "0";
            expandSection.style.opacity = "0";
            chevronIcon.style.transform = "rotate(0deg)";
          }
        });
      }
      gamesList.appendChild(item);
    });
  }
  function renderPaginator(container, offset, hasMore, ctx) {
    const { itemsPerPage: ITEMS_PER_PAGE, loadPage: doLoadPage } = ctx;
    var currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
    ctx.hasMore = hasMore;
    if (currentPage > ctx.highestKnownPage) ctx.highestKnownPage = currentPage;
    if (hasMore && currentPage >= ctx.highestKnownPage) ctx.highestKnownPage = currentPage + 1;
    container.innerHTML = "";
    container.className = "enhanced-pagination";
    function addBtn(label, page, disabled, isActive) {
      var btn = document.createElement("button");
      btn.textContent = label;
      btn.disabled = !!disabled;
      if (isActive) btn.className = "active";
      if (!disabled) {
        btn.addEventListener("click", function() {
          doLoadPage((page - 1) * ITEMS_PER_PAGE);
        });
      }
      container.appendChild(btn);
    }
    addBtn("First", 1, currentPage === 1, false);
    addBtn("❮", currentPage - 1, currentPage === 1, false);
    var lastPage = ctx.highestKnownPage;
    var startP = Math.max(1, currentPage - 2);
    var endP = Math.min(lastPage, startP + 4);
    if (endP - startP < 4) startP = Math.max(1, endP - 4);
    if (startP > 1) {
      var dots = document.createElement("span");
      dots.className = "page-info";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    for (var p = startP; p <= endP; p++) {
      addBtn(String(p), p, false, p === currentPage);
    }
    if (endP < lastPage || hasMore) {
      var dotsAfter = document.createElement("span");
      dotsAfter.className = "page-info";
      dotsAfter.textContent = "...";
      container.appendChild(dotsAfter);
    }
    var nextTarget = currentPage + 1;
    var nextDisabled = !hasMore && currentPage >= lastPage;
    addBtn("❯", nextTarget, nextDisabled, false);
    var rangeStart = offset + 1;
    var rangeEnd = offset + ITEMS_PER_PAGE;
    var rangeSpan = document.createElement("span");
    rangeSpan.className = "page-info";
    rangeSpan.style.cssText = "margin-left:8px;font-size:0.75rem;color:#a3a3a3;";
    rangeSpan.textContent = "(" + rangeStart + "–" + rangeEnd + ")";
    container.appendChild(rangeSpan);
  }

  // src/features/user-profile/insights/almost-there.js
  function renderAlmostThere(games, almostSection) {
    var list = almostSection.querySelector(".enhanced-almost-list");
    if (!games || games.length === 0) {
      list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No games close to mastery found.</div>';
      return;
    }
    list.innerHTML = "";
    games.forEach(function(g) {
      var pct = g.total > 0 ? Math.round(g.earned / g.total * 100) : 0;
      var remaining = g.total - g.earned;
      var imgUrl = "https://media.retroachievements.org" + g.imageIcon;
      var item = document.createElement("div");
      item.className = "enhanced-almost-item";
      item.innerHTML = '<img class="enhanced-almost-img" src="' + escapeHtml(imgUrl) + '" alt="" loading="lazy"><div class="enhanced-almost-info"><a class="enhanced-almost-name" href="/game/' + g.gameId + '" title="' + escapeHtml(g.title) + '">' + escapeHtml(g.title) + '</a><div class="enhanced-almost-meta">' + remaining + " achievement" + (remaining !== 1 ? "s" : "") + " remaining (" + pct + '%)</div><div class="enhanced-almost-bar-bg"><div class="enhanced-almost-bar-fill" style="width:' + pct + '%;"></div></div></div>';
      list.appendChild(item);
    });
  }

  // src/features/user-profile/insights/progression.js
  function scrapeConsoleBreakdown() {
    var rows = document.querySelectorAll("li.progression-status-row");
    var consoles = [];
    var domTotalGames = 0;
    var domTotalMastered = 0;
    var domTotalBeaten = 0;
    var foundTotalRow = false;
    rows.forEach(function(row) {
      var link = row.querySelector("a");
      if (!link) return;
      var img = link.querySelector("img");
      var nameEl = link.querySelector("p");
      if (!nameEl) return;
      var shortName = nameEl.textContent.trim();
      var iconUrl = img ? img.src : "";
      var consoleName = img ? (img.alt || "").replace(" console icon", "") : shortName;
      var allLinks = row.querySelectorAll("a");
      function parseCellNumbers(cell) {
        var nums = [];
        var tallies = cell.querySelectorAll(".tally");
        if (tallies.length > 0) {
          tallies.forEach(function(t) {
            var n2 = parseInt(t.textContent.trim(), 10);
            if (!isNaN(n2)) nums.push(n2);
          });
        } else {
          var n = parseInt(cell.textContent.trim(), 10);
          if (!isNaN(n)) nums.push(n);
        }
        return nums;
      }
      var unfinished = 0, beaten = 0, mastered = 0;
      if (allLinks.length >= 2) {
        var uNums = parseCellNumbers(allLinks[1]);
        unfinished = uNums.reduce(function(s, n) {
          return s + n;
        }, 0);
      }
      if (allLinks.length >= 3) {
        var bNums = parseCellNumbers(allLinks[2]);
        beaten = bNums.reduce(function(s, n) {
          return s + n;
        }, 0);
      }
      if (allLinks.length >= 4) {
        var mNums = parseCellNumbers(allLinks[3]);
        mastered = mNums.reduce(function(s, n) {
          return s + n;
        }, 0);
      }
      var totalCount = unfinished + beaten + mastered;
      if (shortName === "Total") {
        foundTotalRow = true;
        domTotalGames = totalCount;
        domTotalMastered = mastered;
        domTotalBeaten = beaten;
        return;
      }
      if (totalCount > 0) {
        consoles.push({
          shortName,
          consoleName,
          iconUrl,
          count: totalCount,
          unfinished,
          beaten,
          mastered
        });
      }
    });
    if (!foundTotalRow) {
      consoles.forEach(function(c) {
        domTotalGames += c.count;
        domTotalMastered += c.mastered;
        domTotalBeaten += c.beaten;
      });
    }
    return { consoles, totalGames: domTotalGames, totalMastered: domTotalMastered, totalBeaten: domTotalBeaten };
  }
  function renderProgressionDashboard() {
    if (document.getElementById("pd-root")) return;
    var firstRow = document.querySelector("li.progression-status-row");
    if (!firstRow) return;
    var progSection = firstRow.parentElement;
    while (progSection && progSection !== document.body) {
      var cls = progSection.className || "";
      if (progSection.tagName === "SECTION" || /\bmy-\d/.test(cls)) break;
      progSection = progSection.parentElement;
    }
    if (!progSection || progSection === document.body)
      progSection = firstRow.closest("section") || firstRow.parentElement.parentElement;
    var data = scrapeConsoleBreakdown();
    var consoles = data.consoles;
    if (!consoles.length) return;
    var totalGames = data.totalGames;
    var totalMastered = data.totalMastered;
    var totalBeaten = data.totalBeaten || consoles.reduce(function(s, c) {
      return s + (c.beaten || 0);
    }, 0);
    var totalUnfinished = totalGames - totalBeaten - totalMastered;
    var pctDone = totalGames > 0 ? Math.round((totalBeaten + totalMastered) / totalGames * 100) : 0;
    if (!document.getElementById("pd-style")) {
      var pdStyle = document.createElement("style");
      pdStyle.id = "pd-style";
      pdStyle.textContent = [
        ".pd-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}",
        ".pd-kpi{background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 14px}",
        ".pd-kpi-val{font-size:22px;font-weight:500;color:#e4e4e7}",
        ".pd-kpi-lbl{font-size:12px;color:#737373;margin-top:2px}",
        ".pd-kpi-val.beaten{color:#7F77DD}",
        ".pd-kpi-val.mastered{color:#EF9F27}",
        ".pd-kpi-val.pct{color:#10b981}",
        ".pd-two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:16px;margin-bottom:14px;align-items:start}",
        ".pd-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.25rem}",
        ".pd-card-title{font-size:13px;font-weight:500;color:#9ca3af;margin-bottom:12px}",
        ".pd-legend-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:6px}",
        ".pd-leg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0;margin-right:6px}",
        ".pd-leg-name{color:#9ca3af;display:flex;align-items:center;flex:1}",
        ".pd-leg-val{color:#e4e4e7;font-weight:500}",
        ".pd-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}",
        ".pd-bar-lbl{font-size:11px;color:#9ca3af;width:42px;flex-shrink:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        ".pd-bar-track{flex:1;height:14px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;display:flex}",
        ".pd-seg-u{background:#3f3f46;height:100%}",
        ".pd-seg-b{background:#7F77DD;height:100%}",
        ".pd-seg-m{background:#EF9F27;height:100%}",
        ".pd-bar-pct{font-size:11px;color:#737373;width:32px;text-align:right;flex-shrink:0}",
        ".pd-viz-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.25rem;margin-bottom:14px}",
        ".pd-viz-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px}",
        ".pd-viz-title{font-size:13px;font-weight:500;color:#9ca3af}",
        ".pd-toggle-wrap{display:flex;background:rgba(255,255,255,0.04);border-radius:20px;padding:3px;gap:2px;border:0.5px solid rgba(255,255,255,0.1)}",
        ".pd-tog-btn{font-size:12px;padding:4px 14px;border-radius:18px;border:none;background:transparent;color:#9ca3af;cursor:pointer;transition:all .18s}",
        ".pd-tog-btn.active{background:rgba(255,255,255,0.1);color:#e4e4e7;font-weight:500}",
        ".pd-filter-row{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}",
        ".pd-filter-btn{font-size:12px;padding:4px 12px;border-radius:20px;border:0.5px solid rgba(255,255,255,0.15);background:transparent;color:#9ca3af;cursor:pointer}",
        ".pd-filter-btn.active{background:rgba(255,255,255,0.08);color:#e4e4e7;font-weight:500}",
        ".pd-viz-legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}",
        ".pd-vl-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#9ca3af}",
        ".pd-vl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}",
        ".pd-viz-wrap{position:relative;width:100%;height:380px}",
        ".pd-viz-tip{position:absolute;background:rgba(20,20,20,.95);border:0.5px solid rgba(255,255,255,.2);border-radius:8px;padding:8px 12px;font-size:12px;color:#e4e4e7;pointer-events:none;display:none;z-index:10;min-width:140px}",
        ".pd-mb-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.25rem}",
        ".pd-donut-wrap{position:relative;height:180px}",
        ".pd-donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none}",
        ".pd-donut-pct{font-size:22px;font-weight:500;color:#e4e4e7}",
        ".pd-donut-sub{font-size:11px;color:#737373}",
        "@media(max-width:600px){.pd-two-col{grid-template-columns:1fr}.pd-kpi-grid{grid-template-columns:repeat(2,1fr)}}"
      ].join("");
      document.head.appendChild(pdStyle);
    }
    var consolesWithProg = consoles.filter(function(c) {
      return (c.beaten || 0) + (c.mastered || 0) > 0;
    });
    consolesWithProg.sort(function(a, b) {
      return ((b.beaten || 0) + (b.mastered || 0)) / b.count - ((a.beaten || 0) + (a.mastered || 0)) / a.count;
    });
    var barsHtml = consolesWithProg.slice(0, 12).map(function(d) {
      var bP = Math.round((d.beaten || 0) / d.count * 100);
      var mP = Math.round((d.mastered || 0) / d.count * 100);
      var done = bP + mP;
      return '<div class="pd-bar-row"><span class="pd-bar-lbl" title="' + escapeHtml(d.consoleName) + '">' + escapeHtml(d.shortName) + '</span><div class="pd-bar-track"><div class="pd-seg-u" style="width:' + (100 - done) + '%"></div><div class="pd-seg-b" style="width:' + bP + '%"></div><div class="pd-seg-m" style="width:' + mP + '%"></div></div><span class="pd-bar-pct">' + done + "%</span></div>";
    }).join("");
    var html = '<div class="pd-wrap" id="pd-root"><div class="enhanced-dashboard-section-title" style="margin-bottom:12px;">🎮 Progression Status</div><div class="pd-kpi-grid"><div class="pd-kpi"><div class="pd-kpi-val">' + totalGames + '</div><div class="pd-kpi-lbl">Total games</div></div><div class="pd-kpi"><div class="pd-kpi-val beaten">' + totalBeaten + '</div><div class="pd-kpi-lbl">Beaten</div></div><div class="pd-kpi"><div class="pd-kpi-val mastered">' + totalMastered + '</div><div class="pd-kpi-lbl">Mastered</div></div><div class="pd-kpi"><div class="pd-kpi-val pct">' + pctDone + '%</div><div class="pd-kpi-lbl">% completed</div></div></div><div class="pd-two-col"><div class="pd-card"><div class="pd-card-title">Overview</div><div class="pd-donut-wrap"><canvas id="pd-donut"></canvas><div class="pd-donut-center"><div class="pd-donut-pct">' + pctDone + '%</div><div class="pd-donut-sub">completed</div></div></div><div style="margin-top:14px"><div class="pd-legend-row"><span class="pd-leg-name"><span class="pd-leg-dot" style="background:#3f3f46"></span>Unfinished</span><span class="pd-leg-val">' + totalUnfinished + " (" + Math.round(totalUnfinished / totalGames * 100) + '%)</span></div><div class="pd-legend-row"><span class="pd-leg-name"><span class="pd-leg-dot" style="background:#7F77DD"></span>Beaten</span><span class="pd-leg-val">' + totalBeaten + " (" + Math.round(totalBeaten / totalGames * 100) + '%)</span></div><div class="pd-legend-row"><span class="pd-leg-name"><span class="pd-leg-dot" style="background:#EF9F27"></span>Mastered</span><span class="pd-leg-val">' + totalMastered + " (" + Math.round(totalMastered / totalGames * 100) + '%)</span></div></div></div><div class="pd-card"><div class="pd-card-title">Completion % by console</div>' + (barsHtml || '<div style="color:#737373;font-size:12px;">No completed games yet</div>') + '</div></div><div class="pd-viz-card"><div class="pd-viz-header"><span class="pd-viz-title" id="pd-viz-title">Games by console · animated bubbles</span><div class="pd-toggle-wrap"><button class="pd-tog-btn active" data-v="bubble">Bubbles</button><button class="pd-tog-btn" data-v="treemap">Treemap</button></div></div><div class="pd-viz-legend"><div class="pd-vl-item"><div class="pd-vl-dot" style="background:#52525b"></div>Unfinished</div><div class="pd-vl-item"><div class="pd-vl-dot" style="background:#7F77DD"></div>Beaten</div><div class="pd-vl-item"><div class="pd-vl-dot" style="background:#EF9F27"></div>Mastered</div></div><div class="pd-filter-row"><button class="pd-filter-btn active" data-f="all">All</button><button class="pd-filter-btn" data-f="progress">With progress</button><button class="pd-filter-btn" data-f="mastered">Mastered</button></div><div class="pd-viz-wrap" id="pd-viz-wrap"><canvas id="pd-viz-canvas"></canvas><div class="pd-viz-tip" id="pd-viz-tip"></div></div></div><div class="pd-mb-card"><div class="pd-card-title">Mastered vs Beaten · consoles with progress</div><div style="position:relative;height:180px"><canvas id="pd-mb-chart"></canvas></div></div></div>';
    var pdWrapper = document.createElement("div");
    pdWrapper.innerHTML = html;
    var pdRoot = pdWrapper.firstChild;
    progSection.parentNode.insertBefore(pdRoot, progSection);
    progSection.style.display = "none";
    if (typeof Chart !== "undefined") {
      Chart.defaults.color = "#9ca3af";
      new Chart(document.getElementById("pd-donut").getContext("2d"), {
        type: "doughnut",
        data: { labels: ["Unfinished", "Beaten", "Mastered"], datasets: [{ data: [totalUnfinished, totalBeaten, totalMastered], backgroundColor: ["#3f3f46", "#7F77DD", "#EF9F27"], borderWidth: 0, hoverOffset: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(20,20,20,.95)", borderColor: "rgba(255,255,255,.15)", borderWidth: 1, callbacks: { label: function(ctx) {
          return " " + ctx.label + ": " + ctx.raw;
        } } } } }
      });
      if (consolesWithProg.length) {
        var mbData = consolesWithProg.slice(0, 8);
        new Chart(document.getElementById("pd-mb-chart").getContext("2d"), {
          type: "bar",
          data: { labels: mbData.map(function(c) {
            return c.shortName;
          }), datasets: [{ label: "Beaten", data: mbData.map(function(c) {
            return c.beaten || 0;
          }), backgroundColor: "#7F77DD", borderRadius: 4 }, { label: "Mastered", data: mbData.map(function(c) {
            return c.mastered || 0;
          }), backgroundColor: "#EF9F27", borderRadius: 4 }] },
          options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: "#737373", font: { size: 12 } } }, y: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#737373", font: { size: 11 }, stepSize: 1 } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(20,20,20,.95)", borderColor: "rgba(255,255,255,.15)", borderWidth: 1, callbacks: { label: function(ctx) {
            return " " + ctx.dataset.label + ": " + ctx.raw;
          } } } } }
        });
      }
    }
    var vizWrap = document.getElementById("pd-viz-wrap");
    var vizCanvas = document.getElementById("pd-viz-canvas");
    var vizTip = document.getElementById("pd-viz-tip");
    var vizTitleEl = document.getElementById("pd-viz-title");
    var vCtx = vizCanvas.getContext("2d");
    var vizMode = "bubble";
    var pdCurrentFilter = "all";
    var vBubbles = [];
    var vAnimFrame = null;
    var vTmRects = [];
    function pdColorFor(d) {
      if ((d.mastered || 0) > 0) return { fill: "#4a3600", stroke: "#EF9F27", text: "#fbbf24" };
      if ((d.beaten || 0) > 0) return { fill: "#2d2b6e", stroke: "#7F77DD", text: "#a5b4fc" };
      return { fill: "#27272a", stroke: "#52525b", text: "#9ca3af" };
    }
    function pdFiltered(f) {
      if (f === "progress") return consoles.filter(function(d) {
        return (d.beaten || 0) + (d.mastered || 0) > 0;
      });
      if (f === "mastered") return consoles.filter(function(d) {
        return (d.mastered || 0) > 0;
      });
      return consoles;
    }
    function pdInitBubbles(items) {
      var W = vizWrap.clientWidth, H = 380;
      vizCanvas.width = W;
      vizCanvas.height = H;
      var maxT = Math.max.apply(null, items.map(function(d) {
        return d.count;
      }));
      var minR = 18, maxR = Math.min(W / 4, 90);
      vBubbles = items.map(function(d) {
        var r = minR + Math.sqrt(d.count / maxT) * (maxR - minR);
        return { shortName: d.shortName, consoleName: d.consoleName, count: d.count, beaten: d.beaten || 0, mastered: d.mastered || 0, r, x: r + Math.random() * (W - r * 2), y: r + Math.random() * (H - r * 2), vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 };
      });
    }
    function pdSimulate() {
      var W = vizCanvas.width, H = vizCanvas.height;
      for (var i = 0; i < vBubbles.length; i++) {
        var a = vBubbles[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x - a.r < 0) {
          a.x = a.r;
          a.vx = Math.abs(a.vx);
        }
        if (a.x + a.r > W) {
          a.x = W - a.r;
          a.vx = -Math.abs(a.vx);
        }
        if (a.y - a.r < 0) {
          a.y = a.r;
          a.vy = Math.abs(a.vy);
        }
        if (a.y + a.r > H) {
          a.y = H - a.r;
          a.vy = -Math.abs(a.vy);
        }
        for (var j = i + 1; j < vBubbles.length; j++) {
          var b = vBubbles[j];
          var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy), mn = a.r + b.r + 2;
          if (dist < mn && dist > 0) {
            var nx = dx / dist, ny = dy / dist, ov = (mn - dist) / 2;
            a.x -= nx * ov;
            a.y -= ny * ov;
            b.x += nx * ov;
            b.y += ny * ov;
            var rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (rv > 0) {
              a.vx -= rv * nx * 0.5;
              a.vy -= rv * ny * 0.5;
              b.vx += rv * nx * 0.5;
              b.vy += rv * ny * 0.5;
            }
          }
        }
        var spd = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        if (spd > 1.2) {
          a.vx = a.vx / spd * 1.2;
          a.vy = a.vy / spd * 1.2;
        }
      }
    }
    function pdDrawBubbles() {
      vCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
      for (var i = 0; i < vBubbles.length; i++) {
        var b = vBubbles[i];
        var c = pdColorFor(b);
        var pct = Math.round((b.beaten + b.mastered) / b.count * 100);
        vCtx.beginPath();
        vCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        vCtx.fillStyle = c.fill;
        vCtx.fill();
        vCtx.strokeStyle = c.stroke;
        vCtx.lineWidth = 1.5;
        vCtx.stroke();
        if (b.r > 22) {
          vCtx.fillStyle = c.text;
          vCtx.textAlign = "center";
          vCtx.textBaseline = "middle";
          var fs = Math.min(13, Math.max(10, b.r / 3.2));
          vCtx.font = "500 " + fs + "px sans-serif";
          vCtx.fillText(b.shortName, b.x, b.r > 34 ? b.y - 7 : b.y);
          if (b.r > 32) {
            vCtx.font = "400 " + Math.max(9, fs - 2) + "px sans-serif";
            vCtx.fillStyle = c.text + "aa";
            vCtx.fillText(b.count + (pct > 0 ? " · " + pct + "%" : ""), b.x, b.y + 9);
          }
        }
      }
    }
    function pdBubbleLoop() {
      pdSimulate();
      pdDrawBubbles();
      vAnimFrame = requestAnimationFrame(pdBubbleLoop);
    }
    function pdSquarify(items, x, y, w, h) {
      var rects = [];
      function lay(nodes, lx, ly, lw, lh) {
        if (!nodes.length) return;
        if (nodes.length === 1) {
          rects.push(Object.assign({}, nodes[0], { x: lx, y: ly, w: lw, h: lh }));
          return;
        }
        var acc = 0, split = 0, tot2 = nodes.reduce(function(s, d) {
          return s + d.value;
        }, 0);
        for (var i = 0; i < nodes.length; i++) {
          acc += nodes[i].value;
          if (acc >= tot2 / 2) {
            split = i + 1;
            break;
          }
        }
        var aN = nodes.slice(0, split), bN = nodes.slice(split);
        var aS = aN.reduce(function(s, d) {
          return s + d.value;
        }, 0);
        if (lw >= lh) {
          var wa = lw * (aS / tot2);
          lay(aN, lx, ly, wa, lh);
          lay(bN, lx + wa, ly, lw - wa, lh);
        } else {
          var ha = lh * (aS / tot2);
          lay(aN, lx, ly, lw, ha);
          lay(bN, lx, ly + ha, lw, lh - ha);
        }
      }
      var tot = items.reduce(function(s, d) {
        return s + d.value;
      }, 0);
      lay(items.map(function(d) {
        return Object.assign({}, d, { value: d.value / tot });
      }), x, y, w, h);
      return rects;
    }
    function pdDrawTreemap(items) {
      var W = vizWrap.clientWidth, H = 380;
      vizCanvas.width = W;
      vizCanvas.height = H;
      vCtx.clearRect(0, 0, W, H);
      var sorted = items.slice().map(function(d) {
        return Object.assign({}, d, { value: d.count });
      }).sort(function(a, b) {
        return b.value - a.value;
      });
      vTmRects = pdSquarify(sorted, 0, 0, W, H);
      vTmRects.forEach(function(r) {
        var pad = 2, c = pdColorFor(r);
        vCtx.fillStyle = c.fill;
        vCtx.beginPath();
        if (vCtx.roundRect) vCtx.roundRect(r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2, 4);
        else vCtx.rect(r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2);
        vCtx.fill();
        var fw = r.w - pad * 2, fh = r.h - pad * 2;
        if (fw > 28 && fh > 18) {
          vCtx.fillStyle = c.text;
          var fs = Math.min(13, Math.max(10, fw / 5));
          vCtx.font = "500 " + fs + "px sans-serif";
          vCtx.textAlign = "center";
          vCtx.textBaseline = "middle";
          var tx = r.x + r.w / 2, ty = r.y + r.h / 2;
          vCtx.fillText(r.shortName, tx, fh > 32 ? ty - 6 : ty);
          if (fh > 30 && fw > 36) {
            vCtx.font = "400 " + Math.max(9, fs - 2) + "px sans-serif";
            vCtx.fillStyle = c.text + "bb";
            vCtx.fillText(r.count, tx, ty + 9);
          }
        }
      });
    }
    function pdStartViz() {
      cancelAnimationFrame(vAnimFrame);
      vAnimFrame = null;
      vizTip.style.display = "none";
      var items = pdFiltered(pdCurrentFilter);
      if (vizMode === "bubble") {
        vizTitleEl.textContent = "Games by console · animated bubbles";
        pdInitBubbles(items);
        pdBubbleLoop();
      } else {
        vizTitleEl.textContent = "Games by console · proportional size";
        pdDrawTreemap(items);
      }
    }
    pdRoot.querySelectorAll(".pd-tog-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        pdRoot.querySelectorAll(".pd-tog-btn").forEach(function(b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        vizMode = btn.getAttribute("data-v");
        pdStartViz();
      });
    });
    pdRoot.querySelectorAll(".pd-filter-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        pdRoot.querySelectorAll(".pd-filter-btn").forEach(function(b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        pdCurrentFilter = btn.getAttribute("data-f");
        pdStartViz();
      });
    });
    vizWrap.addEventListener("mousemove", function(e) {
      var rect = vizCanvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var hit = null;
      if (vizMode === "bubble") {
        for (var i = 0; i < vBubbles.length; i++) {
          var bb = vBubbles[i];
          if (Math.sqrt((mx - bb.x) * (mx - bb.x) + (my - bb.y) * (my - bb.y)) <= bb.r) {
            hit = bb;
            break;
          }
        }
      } else {
        for (var i = 0; i < vTmRects.length; i++) {
          var rr = vTmRects[i];
          if (mx >= rr.x && mx <= rr.x + rr.w && my >= rr.y && my <= rr.y + rr.h) {
            hit = rr;
            break;
          }
        }
      }
      if (hit) {
        var pct = Math.round((hit.beaten + hit.mastered) / hit.count * 100);
        vizTip.innerHTML = "<b>" + escapeHtml(hit.consoleName || hit.shortName) + "</b>" + hit.count + " games · " + pct + "% completed<br>Beaten: " + hit.beaten + "  ·  Mastered: " + hit.mastered;
        vizTip.style.display = "block";
        vizTip.style.left = Math.min(e.offsetX + 14, vizWrap.clientWidth - 160) + "px";
        vizTip.style.top = Math.max(e.offsetY - 68, 4) + "px";
      } else {
        vizTip.style.display = "none";
      }
    });
    vizWrap.addEventListener("mouseleave", function() {
      vizTip.style.display = "none";
    });
    window.addEventListener("resize", pdStartViz);
    pdStartViz();
  }

  // src/features/user-profile/insights/timeline.js
  function renderActivityTimeline(achievements, masteredDayMap, beatenDayMap, timelineSection) {
    var content = timelineSection.querySelector(".enhanced-timeline-content");
    if (!achievements || achievements.length === 0) {
      content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No recent activity.</div>';
      return;
    }
    var totalEl = document.getElementById("enhanced-timeline-total");
    if (totalEl) totalEl.textContent = "— " + achievements.length + " achievements";
    var achDayMap = {};
    achievements.forEach(function(a) {
      if (!a.Date) return;
      var day = a.Date.substring(0, 10);
      achDayMap[day] = (achDayMap[day] || 0) + 1;
    });
    var today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    var todayDow = today.getDay();
    var startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364 - todayDow);
    var totalDays = Math.floor((today - startDate) / (1e3 * 60 * 60 * 24)) + 1;
    var numWeeks = Math.ceil(totalDays / 7);
    var baseCells = [];
    for (var w = 0; w < numWeeks; w++) {
      for (var dow = 0; dow < 7; dow++) {
        var d = new Date(startDate);
        d.setDate(d.getDate() + w * 7 + dow);
        if (d > today) continue;
        baseCells.push({ date: d.toISOString().substring(0, 10), day: d, week: w, dow });
      }
    }
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var monthCols = {};
    baseCells.forEach(function(c) {
      if (c.dow === 0) {
        var key = c.day.getFullYear() + "-" + c.day.getMonth();
        if (!(key in monthCols)) monthCols[key] = { week: c.week, month: c.day.getMonth() };
      }
    });
    var modes = {
      achievements: {
        dayMap: achDayMap,
        prefix: "level",
        icon: "🏆",
        label: "🏆 Achievements",
        totalLabel: function(dm) {
          var t = 0;
          for (var k in dm) t += dm[k];
          return t + " achievements";
        },
        tooltipSingular: "achievement",
        tooltipPlural: "achievements",
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.12)",
        legendColors: ["rgba(255,255,255,0.04)", "rgba(59,130,246,0.25)", "rgba(59,130,246,0.5)", "rgba(59,130,246,0.75)", "#3b82f6"]
      },
      mastered: {
        dayMap: masteredDayMap || {},
        prefix: "mastered",
        icon: "👑",
        label: "👑 Mastered",
        totalLabel: function(dm) {
          var t = 0;
          for (var k in dm) t += dm[k];
          return t + " games mastered";
        },
        tooltipSingular: "game mastered",
        tooltipPlural: "games mastered",
        color: "#fbbf24",
        bg: "rgba(251,191,36,0.12)",
        legendColors: ["rgba(255,255,255,0.04)", "rgba(251,191,36,0.25)", "rgba(251,191,36,0.5)", "rgba(251,191,36,0.75)", "#fbbf24"]
      },
      beaten: {
        dayMap: beatenDayMap || {},
        prefix: "beaten",
        icon: "✅",
        label: "✅ Beaten",
        totalLabel: function(dm) {
          var t = 0;
          for (var k in dm) t += dm[k];
          return t + " games beaten";
        },
        tooltipSingular: "game beaten",
        tooltipPlural: "games beaten",
        color: "#a3a3a3",
        bg: "rgba(163,163,163,0.12)",
        legendColors: ["rgba(255,255,255,0.04)", "rgba(163,163,163,0.25)", "rgba(163,163,163,0.5)", "rgba(163,163,163,0.75)", "#a3a3a3"]
      }
    };
    var activeModes = { achievements: true, mastered: true, beaten: true };
    function getActiveKeys() {
      var keys = [];
      for (var k in activeModes) {
        if (activeModes[k]) keys.push(k);
      }
      return keys;
    }
    function buildGrid() {
      var activeKeys = getActiveKeys();
      if (activeKeys.length === 0) return "";
      var isSingle = activeKeys.length === 1;
      var theme = isSingle ? modes[activeKeys[0]] : null;
      var mergedDayMap = {};
      activeKeys.forEach(function(key) {
        var dm = modes[key].dayMap;
        for (var d2 in dm) mergedDayMap[d2] = (mergedDayMap[d2] || 0) + dm[d2];
      });
      var maxCount = 0;
      var cellData = baseCells.map(function(c) {
        var count = mergedDayMap[c.date] || 0;
        if (count > maxCount) maxCount = count;
        return { date: c.date, count, day: c.day, week: c.week, dow: c.dow };
      });
      function getLevel(count) {
        if (count === 0) return 0;
        if (maxCount <= 4) return Math.min(count, 4);
        var pct = count / maxCount;
        if (pct <= 0.25) return 1;
        if (pct <= 0.5) return 2;
        if (pct <= 0.75) return 3;
        return 4;
      }
      var cellSize = Math.max(8, Math.floor((content.offsetWidth - 32) / (numWeeks + 1)));
      if (cellSize > 14) cellSize = 14;
      var levelPrefix = theme ? theme.prefix === "level" ? "level" : theme.prefix : null;
      var priorityOrder = ["mastered", "beaten", "achievements"];
      function getCellPrefix(date) {
        if (levelPrefix) return levelPrefix;
        for (var i = 0; i < priorityOrder.length; i++) {
          var k2 = priorityOrder[i];
          if (activeModes[k2] && modes[k2].dayMap[date]) return modes[k2].prefix === "level" ? "level" : modes[k2].prefix;
        }
        return "level";
      }
      var html = '<div class="enhanced-timeline-wrapper">';
      html += '<div class="enhanced-timeline-table" style="grid-template-columns:28px repeat(' + numWeeks + "," + cellSize + "px);grid-template-rows:auto repeat(7," + cellSize + 'px);">';
      html += "<div></div>";
      var monthLabelsArr = [];
      for (var wi = 0; wi < numWeeks; wi++) monthLabelsArr.push("");
      Object.keys(monthCols).forEach(function(key) {
        var info = monthCols[key];
        monthLabelsArr[info.week] = monthNames[info.month];
      });
      for (var wi = 0; wi < numWeeks; wi++) {
        html += '<div class="enhanced-timeline-month-label">' + monthLabelsArr[wi] + "</div>";
      }
      var cellMap = {};
      cellData.forEach(function(c) {
        if (!cellMap[c.week]) cellMap[c.week] = {};
        cellMap[c.week][c.dow] = c;
      });
      for (var dow2 = 0; dow2 < 7; dow2++) {
        if (dow2 === 1 || dow2 === 3 || dow2 === 5) {
          html += '<div class="enhanced-timeline-day-label">' + dayLabels[dow2] + "</div>";
        } else {
          html += '<div class="enhanced-timeline-day-label"></div>';
        }
        for (var wi = 0; wi < numWeeks; wi++) {
          var cell = cellMap[wi] && cellMap[wi][dow2];
          if (cell) {
            var level = getLevel(cell.count);
            var tooltipLines = [];
            activeKeys.forEach(function(key) {
              var c = modes[key].dayMap[cell.date] || 0;
              if (c > 0) {
                var unit = c === 1 ? modes[key].tooltipSingular : modes[key].tooltipPlural;
                tooltipLines.push(modes[key].icon + "|" + c + " " + unit);
              }
            });
            var dateStr = monthNames[cell.day.getMonth()] + " " + cell.day.getDate() + ", " + cell.day.getFullYear();
            var cellPfx = level === 0 ? "level" : getCellPrefix(cell.date);
            var cls = level === 0 ? "level-0" : cellPfx + "-" + level;
            html += '<div class="enhanced-timeline-cell ' + cls + '" data-tip-date="' + escapeHtml(dateStr) + '" data-tip-lines="' + escapeHtml(tooltipLines.join(";;")) + '"></div>';
          } else {
            html += "<div></div>";
          }
        }
      }
      html += "</div></div>";
      var footerParts = [];
      activeKeys.forEach(function(key) {
        footerParts.push(modes[key].totalLabel(modes[key].dayMap));
      });
      var activeDays = 0;
      for (var k in mergedDayMap) {
        if (mergedDayMap[k] > 0) activeDays++;
      }
      html += '<div class="enhanced-timeline-footer">';
      html += "<span>" + footerParts.join(", ") + " in " + activeDays + " days</span>";
      html += '<div class="enhanced-timeline-legend">';
      if (isSingle) {
        html += "<span>Less</span>";
        for (var li = 0; li < theme.legendColors.length; li++) {
          html += '<div class="enhanced-timeline-legend-cell" style="background:' + theme.legendColors[li] + ';"></div>';
        }
        html += "<span>More</span>";
      } else {
        activeKeys.forEach(function(key) {
          html += '<span style="display:inline-flex;align-items:center;gap:3px;margin-right:8px;">' + modes[key].icon + '<div class="enhanced-timeline-legend-cell" style="background:' + modes[key].color + ';"></div></span>';
        });
      }
      html += "</div></div>";
      return html;
    }
    function renderModes() {
      var gridContainer = content.querySelector(".enhanced-timeline-grid-area");
      if (gridContainer) gridContainer.innerHTML = buildGrid();
      var btns = content.querySelectorAll(".enhanced-timeline-toggle-btn");
      btns.forEach(function(btn) {
        var bm = btn.getAttribute("data-mode");
        if (activeModes[bm]) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
      var totalEl2 = document.getElementById("enhanced-timeline-total");
      if (totalEl2) {
        var activeKeys = getActiveKeys();
        var totalParts = [];
        activeKeys.forEach(function(key) {
          var dm = modes[key].dayMap;
          var t = 0;
          for (var d2 in dm) t += dm[d2];
          if (key === "achievements") totalParts.push(t + " achievements");
          else if (key === "mastered") totalParts.push(t + " mastered");
          else if (key === "beaten") totalParts.push(t + " beaten");
        });
        totalEl2.textContent = "— " + totalParts.join(", ");
      }
    }
    var outerHtml = '<div class="enhanced-timeline-toggle-bar">';
    ["achievements", "mastered", "beaten"].forEach(function(key) {
      var m = modes[key];
      var activeClass = " active";
      outerHtml += '<button class="enhanced-timeline-toggle-btn' + activeClass + '" data-mode="' + key + '" style="--toggle-color:' + m.color + ";--toggle-bg:" + m.bg + ';">' + m.label + "</button>";
    });
    outerHtml += "</div>";
    outerHtml += '<div class="enhanced-timeline-grid-area">' + buildGrid() + "</div>";
    content.innerHTML = outerHtml;
    content.querySelectorAll(".enhanced-timeline-toggle-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var mode = btn.getAttribute("data-mode");
        var activeKeys = getActiveKeys();
        if (activeModes[mode] && activeKeys.length <= 1) return;
        activeModes[mode] = !activeModes[mode];
        renderModes();
      });
    });
    var tooltip = document.createElement("div");
    tooltip.className = "enhanced-timeline-tooltip";
    document.body.appendChild(tooltip);
    content.addEventListener("mouseover", function(e) {
      var cell = e.target.closest(".enhanced-timeline-cell");
      if (!cell || !cell.dataset.tipDate) return;
      var dateStr = cell.dataset.tipDate;
      var linesRaw = cell.dataset.tipLines;
      var html = '<div class="tooltip-date">' + escapeHtml(dateStr) + "</div>";
      if (linesRaw) {
        var lines = linesRaw.split(";;");
        lines.forEach(function(line) {
          if (!line) return;
          var parts = line.split("|");
          var icon = parts[0] || "";
          var text = parts[1] || "";
          html += '<div class="tooltip-line"><span class="tooltip-icon">' + icon + "</span> " + escapeHtml(text) + "</div>";
        });
      } else {
        html += '<div class="tooltip-no-activity">No activity</div>';
      }
      tooltip.innerHTML = html;
      tooltip.classList.add("visible");
    });
    content.addEventListener("mousemove", function(e) {
      if (!tooltip.classList.contains("visible")) return;
      var x = e.clientX + 12;
      var y = e.clientY - tooltip.offsetHeight - 8;
      if (y < 4) y = e.clientY + 16;
      if (x + tooltip.offsetWidth > window.innerWidth - 4) x = e.clientX - tooltip.offsetWidth - 12;
      tooltip.style.left = x + "px";
      tooltip.style.top = y + "px";
    });
    content.addEventListener("mouseout", function(e) {
      var cell = e.target.closest(".enhanced-timeline-cell");
      if (!cell) return;
      tooltip.classList.remove("visible");
    });
  }

  // src/features/user-profile/insights/rarest.js
  function renderRarestAchievements(achievements, rarestSection, ctx) {
    ctx = ctx || {};
    var targetUser = ctx.targetUser;
    var apiKey = ctx.apiKey;
    var enableRarityIndicator = ctx.enableRarityIndicator;
    var list = rarestSection.querySelector(".enhanced-rare-list");
    var paginationDiv = rarestSection.querySelector("#enhanced-rare-pagination");
    var sortSlot = rarestSection.querySelector("#enhanced-rare-sort");
    if (!achievements || achievements.length === 0) {
      list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No achievement data available.</div>';
      if (paginationDiv) paginationDiv.innerHTML = "";
      if (sortSlot) sortSlot.innerHTML = "";
      return;
    }
    function multiplierOf(a) {
      var trueRatio = parseInt(a.TrueRatio, 10) || 0;
      var points = parseInt(a.Points, 10) || 0;
      return trueRatio > 0 && points > 0 ? trueRatio / points : null;
    }
    var base = achievements.slice().filter(function(a) {
      return multiplierOf(a) !== null;
    });
    var seen = {};
    base = base.filter(function(a) {
      if (seen[a.AchievementID]) return false;
      seen[a.AchievementID] = true;
      return true;
    });
    if (base.length === 0) {
      list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No rarity data available.</div>';
      if (paginationDiv) paginationDiv.innerHTML = "";
      if (sortSlot) sortSlot.innerHTML = "";
      return;
    }
    var itemsPerPage = 5;
    var currentPage = 1;
    var sortMode = "rarest";
    function sortedList() {
      var arr = base.slice();
      if (sortMode === "common") {
        arr.sort(function(a, b) {
          var byRatio = multiplierOf(a) - multiplierOf(b);
          return byRatio !== 0 ? byRatio : (parseInt(a.TrueRatio, 10) || 0) - (parseInt(b.TrueRatio, 10) || 0);
        });
      } else if (sortMode === "recent") {
        arr.sort(function(a, b) {
          var da = a.Date || "";
          var db = b.Date || "";
          return da > db ? -1 : da < db ? 1 : 0;
        });
      } else {
        arr.sort(function(a, b) {
          var byRatio = multiplierOf(b) - multiplierOf(a);
          return byRatio !== 0 ? byRatio : (parseInt(b.TrueRatio, 10) || 0) - (parseInt(a.TrueRatio, 10) || 0);
        });
      }
      return arr;
    }
    function fillRarityBadge(tierSlot, gameId, achievementId) {
      if (!enableRarityIndicator || !gameId) return;
      fetchGameRarityData(gameId, targetUser, apiKey).then(function(data) {
        var achData = (data.achievements || {})[String(achievementId)] || (data.achievements || {})[achievementId];
        if (!achData || !data.numPlayers) return;
        var numAwarded = parseInt(achData.NumAwarded, 10) || 0;
        if (!numAwarded) return;
        var pct = numAwarded / data.numPlayers * 100;
        var tier = getRarityTier(pct);
        var badgeStyle = "display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:4px;font-size:0.65rem;font-weight:600;letter-spacing:0.02em;white-space:nowrap;line-height:1.6;color:" + tier.color + ";background:" + tier.bg + ";border:1px solid " + tier.color + "30;";
        var dotStyle = "width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block;background:" + tier.color + ";";
        tierSlot.innerHTML = '<span style="' + badgeStyle + '"><span style="' + dotStyle + '"></span>' + tier.label + " · " + pct.toFixed(1) + "%</span>";
      }).catch(function() {
      });
    }
    function renderItems() {
      var sorted = sortedList();
      var totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
      if (currentPage > totalPages) currentPage = totalPages;
      var start2 = (currentPage - 1) * itemsPerPage;
      var pageItems = sorted.slice(start2, start2 + itemsPerPage);
      list.innerHTML = "";
      pageItems.forEach(function(a) {
        var badgeUrl = a.BadgeURL || "";
        if (badgeUrl && !badgeUrl.startsWith("http")) {
          badgeUrl = "https://media.retroachievements.org" + badgeUrl;
        }
        var trueRatio = parseInt(a.TrueRatio, 10) || 0;
        var points = parseInt(a.Points, 10) || 0;
        var ratio = trueRatio > 0 && points > 0 ? (trueRatio / points).toFixed(1) : "—";
        var item = document.createElement("a");
        item.className = "enhanced-rare-item";
        item.href = "/achievement/" + a.AchievementID;
        item.innerHTML = '<img class="enhanced-rare-badge" src="' + escapeHtml(badgeUrl) + '" alt="" loading="lazy"><div class="enhanced-rare-info"><div class="enhanced-rare-title" title="' + escapeHtml(a.Title || "") + '">' + escapeHtml(a.Title || "") + '</div><div class="enhanced-rare-meta">' + escapeHtml(a.GameTitle || "") + " · " + points + ' pts</div><div class="enhanced-rare-tier"></div></div><div class="enhanced-rare-ratio" title="TrueRatio: ' + trueRatio + " (x" + ratio + ' rarity)">x' + ratio + "</div>";
        list.appendChild(item);
        fillRarityBadge(item.querySelector(".enhanced-rare-tier"), a.GameID, a.AchievementID);
      });
      renderPager(totalPages);
    }
    function renderPager(totalPages) {
      if (!paginationDiv) return;
      paginationDiv.innerHTML = "";
      paginationDiv.className = "enhanced-pagination";
      function addBtn(label, page, disabled, isActive) {
        var btn = document.createElement("button");
        btn.textContent = label;
        btn.disabled = !!disabled;
        if (isActive) btn.className = "active";
        if (!disabled) {
          btn.addEventListener("click", function() {
            currentPage = page;
            renderItems();
          });
        }
        paginationDiv.appendChild(btn);
      }
      addBtn("First", 1, currentPage === 1, false);
      addBtn("❮", currentPage - 1, currentPage === 1, false);
      var startP = Math.max(1, currentPage - 2);
      var endP = Math.min(totalPages, startP + 4);
      if (endP - startP < 4) startP = Math.max(1, endP - 4);
      if (startP > 1) {
        var dots = document.createElement("span");
        dots.className = "page-info";
        dots.textContent = "...";
        paginationDiv.appendChild(dots);
      }
      for (var p = startP; p <= endP; p++) {
        addBtn(String(p), p, false, p === currentPage);
      }
      if (endP < totalPages) {
        var dotsAfter = document.createElement("span");
        dotsAfter.className = "page-info";
        dotsAfter.textContent = "...";
        paginationDiv.appendChild(dotsAfter);
      }
      addBtn("❯", currentPage + 1, currentPage === totalPages, false);
      var rangeStart = (currentPage - 1) * itemsPerPage + 1;
      var rangeEnd = Math.min(base.length, currentPage * itemsPerPage);
      var rangeSpan = document.createElement("span");
      rangeSpan.className = "page-info";
      rangeSpan.style.cssText = "margin-left:8px;font-size:0.75rem;color:#a3a3a3;";
      rangeSpan.textContent = "(" + rangeStart + "–" + rangeEnd + ")";
      paginationDiv.appendChild(rangeSpan);
      var perPageWrapper = document.createElement("div");
      perPageWrapper.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin-left:12px;";
      var perPageLabel = document.createElement("label");
      perPageLabel.textContent = "Show:";
      perPageLabel.style.cssText = "font-size:0.75rem;color:#a3a3a3;";
      var perPageSelect = document.createElement("select");
      perPageSelect.style.cssText = "background:#18181b;color:#e4e4e7;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.75rem;cursor:pointer;";
      [5, 10, 15, 20, 30, 50].forEach(function(n) {
        var opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n;
        if (n === itemsPerPage) opt.selected = true;
        perPageSelect.appendChild(opt);
      });
      perPageSelect.addEventListener("change", function() {
        itemsPerPage = parseInt(perPageSelect.value, 10);
        currentPage = 1;
        renderItems();
      });
      perPageWrapper.appendChild(perPageLabel);
      perPageWrapper.appendChild(perPageSelect);
      paginationDiv.appendChild(perPageWrapper);
    }
    function renderSortSelect() {
      if (!sortSlot) return;
      sortSlot.innerHTML = "";
      var wrapper = document.createElement("div");
      wrapper.style.cssText = "display:inline-flex;align-items:center;gap:6px;";
      var label = document.createElement("label");
      label.textContent = "Sort:";
      label.style.cssText = "font-size:0.7rem;color:#a3a3a3;font-weight:400;text-transform:none;letter-spacing:normal;";
      var select = document.createElement("select");
      select.style.cssText = "background:#18181b;color:#e4e4e7;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.75rem;cursor:pointer;";
      [
        { value: "rarest", label: "Rarest first" },
        { value: "common", label: "Least rare first" },
        { value: "recent", label: "Most recent" }
      ].forEach(function(opt) {
        var el = document.createElement("option");
        el.value = opt.value;
        el.textContent = opt.label;
        if (opt.value === sortMode) el.selected = true;
        select.appendChild(el);
      });
      select.addEventListener("change", function() {
        sortMode = select.value;
        currentPage = 1;
        renderItems();
      });
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      sortSlot.appendChild(wrapper);
    }
    renderSortSelect();
    renderItems();
  }

  // src/features/user-profile/insights/stats-cards.js
  function renderStatsCards(data, statsRow) {
    var totalGames = data.totalGames || 0;
    var mastered = data.mastered || 0;
    var completionPct = totalGames > 0 ? Math.round(mastered / totalGames * 100) : 0;
    var points = data.points || 0;
    var rank = data.rank || "—";
    statsRow.innerHTML = '<div class="enhanced-stat-card"><div class="enhanced-stat-value">' + totalGames + '</div><div class="enhanced-stat-label">Games Played</div></div><div class="enhanced-stat-card"><div class="enhanced-stat-value" style="color:#fbbf24;">' + mastered + '</div><div class="enhanced-stat-label">Mastered</div></div><div class="enhanced-stat-card"><div class="enhanced-stat-value" style="color:#3b82f6;">' + completionPct + '%</div><div class="enhanced-stat-label">Mastery Rate</div></div><div class="enhanced-stat-card"><div class="enhanced-stat-value" style="color:#a78bfa;">' + points.toLocaleString() + '</div><div class="enhanced-stat-label">Points (Rank ' + escapeHtml(String(rank)) + ")</div></div>";
  }

  // src/features/user-profile/insights/streaks.js
  function renderStreakTracker(achievements, streakSection) {
    var content = streakSection.querySelector(".enhanced-streak-content");
    if (!achievements || achievements.length === 0) {
      content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No recent achievements found.</div>';
      return;
    }
    var daySet = {};
    achievements.forEach(function(a) {
      if (!a.Date) return;
      var day = a.Date.substring(0, 10);
      daySet[day] = (daySet[day] || 0) + 1;
    });
    var today = /* @__PURE__ */ new Date();
    var streak = 0;
    var bestStreak = 0;
    var tempStreak = 0;
    var days = Object.keys(daySet).sort().reverse();
    if (days.length === 0) {
      content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No activity data available.</div>';
      return;
    }
    var checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);
    var todayStr = checkDate.toISOString().substring(0, 10);
    if (!daySet[todayStr]) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      var dStr = checkDate.toISOString().substring(0, 10);
      if (daySet[dStr]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    var sortedDays = Object.keys(daySet).sort();
    tempStreak = 1;
    bestStreak = 1;
    for (var i = 1; i < sortedDays.length; i++) {
      var prev = /* @__PURE__ */ new Date(sortedDays[i - 1] + "T00:00:00");
      var curr = /* @__PURE__ */ new Date(sortedDays[i] + "T00:00:00");
      var diff = (curr - prev) / (1e3 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }
    if (streak > bestStreak) bestStreak = streak;
    var totalAch = achievements.length;
    var activeDays = Object.keys(daySet).length;
    content.innerHTML = '<div class="enhanced-streak-row"><div class="enhanced-streak-big">' + streak + '</div><div><div class="enhanced-streak-info">' + (streak === 1 ? "day streak" : "days streak") + (streak > 0 ? " 🔥" : "") + '</div><div class="enhanced-streak-detail">Best: ' + bestStreak + " days · " + activeDays + " active days · " + totalAch + " achievements (365d)</div></div></div>";
  }

  // src/features/user-profile/insights/data.js
  function fetchDashboardData(ctx) {
    const { targetUser, apiKey, enableRarityIndicator, gameAwardsMap, statsRow, almostSection, streakSection, rarestSection, timelineSection } = ctx;
    var domData = scrapeConsoleBreakdown();
    var summaryUrl = "https://retroachievements.org/API/API_GetUserSummary.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey) + "&g=0&a=0";
    var recentAllUrl = "https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey) + "&c=50&o=0";
    var awardsUrl = "https://retroachievements.org/API/API_GetUserAwards.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey);
    var now = Math.floor(Date.now() / 1e3);
    var oneYearAgo = now - 365 * 24 * 60 * 60;
    var quarterSec = Math.ceil((now - oneYearAgo) / 4);
    var yearlyChunkUrls = [];
    for (var q = 0; q < 4; q++) {
      var f = oneYearAgo + q * quarterSec;
      var t = q < 3 ? oneYearAgo + (q + 1) * quarterSec : now;
      yearlyChunkUrls.push(
        "https://retroachievements.org/API/API_GetAchievementsEarnedBetween.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey) + "&f=" + f + "&t=" + t
      );
    }
    var corePromises = [
      gmFetch(summaryUrl, 15e3).then(function(r) {
        return JSON.parse(r.responseText);
      }).catch(function() {
        return null;
      }),
      gmFetch(recentAllUrl, 15e3).then(function(r) {
        return JSON.parse(r.responseText);
      }).catch(function() {
        return null;
      }),
      gmFetch(awardsUrl, 15e3).then(function(r) {
        return JSON.parse(r.responseText);
      }).catch(function() {
        return null;
      })
    ];
    var yearlyPromises = yearlyChunkUrls.map(function(url) {
      return gmFetch(url, 2e4).then(function(r) {
        return JSON.parse(r.responseText);
      }).catch(function() {
        return [];
      });
    });
    Promise.all(corePromises.concat(yearlyPromises)).then(function(results) {
      var summary = results[0];
      var recentGames = results[1];
      var awardsData = results[2];
      var yearlyAchievements = [];
      for (var q2 = 0; q2 < 4; q2++) {
        var chunk = results[3 + q2];
        if (Array.isArray(chunk)) {
          yearlyAchievements = yearlyAchievements.concat(chunk);
        }
      }
      var seen = {};
      yearlyAchievements = yearlyAchievements.filter(function(a) {
        var key = a.AchievementID + "|" + a.Date + "|" + a.HardcoreMode;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      var points = 0;
      var rank = "—";
      if (summary) {
        points = parseInt(summary.TotalPoints, 10) || 0;
        rank = summary.Rank || "—";
      }
      renderStatsCards({
        totalGames: domData.totalGames,
        mastered: domData.totalMastered,
        points,
        rank
      }, statsRow);
      var almostGames = [];
      if (recentGames && Array.isArray(recentGames)) {
        recentGames.forEach(function(g) {
          var earned = parseInt(g.NumAchieved, 10) || 0;
          var total = parseInt(g.NumPossibleAchievements, 10) || 0;
          if (total > 0 && earned < total) {
            var pct = earned / total;
            if (pct >= 0.5) {
              almostGames.push({
                gameId: g.GameID,
                title: g.Title || "",
                imageIcon: g.ImageIcon || "",
                earned,
                total,
                pct
              });
            }
          }
        });
        almostGames.sort(function(a, b) {
          return b.pct - a.pct;
        });
        almostGames = almostGames.slice(0, 5);
      }
      renderAlmostThere(almostGames, almostSection);
      if (yearlyAchievements && yearlyAchievements.length > 0) {
        renderStreakTracker(yearlyAchievements, streakSection);
      } else {
        streakSection.querySelector(".enhanced-streak-content").innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load streak data.</div>';
      }
      fetchAllTimeAchievements(targetUser, apiKey, summary).then(function(allTimeAchievements) {
        if (allTimeAchievements && allTimeAchievements.length > 0) {
          renderRarestAchievements(allTimeAchievements, rarestSection, {
            targetUser,
            apiKey,
            enableRarityIndicator
          });
        } else {
          rarestSection.querySelector(".enhanced-rare-list").innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load rarity data.</div>';
        }
      });
      var awardPriority = { "mastered": 4, "completed": 3, "beaten-hardcore": 2, "beaten-softcore": 1 };
      if (awardsData && Array.isArray(awardsData.VisibleUserAwards)) {
        awardsData.VisibleUserAwards.forEach(function(award) {
          if (!award.AwardedAt || !award.AwardData) return;
          var gameId = String(award.AwardData);
          var aType = (award.AwardType || "").toLowerCase();
          var extra = parseInt(award.AwardDataExtra, 10) || 0;
          var kind = "";
          if (aType === "mastery/completion" || aType === "mastery") {
            kind = extra === 1 ? "mastered" : "completed";
          } else if (aType === "game beaten") {
            kind = extra === 1 ? "beaten-hardcore" : "beaten-softcore";
          }
          if (!kind) return;
          var existing = gameAwardsMap[gameId];
          if (!existing || (awardPriority[kind] || 0) > (awardPriority[existing.awardKind] || 0)) {
            gameAwardsMap[gameId] = { awardKind: kind, awardedAt: award.AwardedAt };
          }
        });
      }
      var masteredDayMap = {};
      var beatenDayMap = {};
      var oneYearAgoDate = /* @__PURE__ */ new Date();
      oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 365);
      oneYearAgoDate.setHours(0, 0, 0, 0);
      if (awardsData && Array.isArray(awardsData.VisibleUserAwards)) {
        awardsData.VisibleUserAwards.forEach(function(award) {
          if (!award.AwardedAt) return;
          var awardDate = new Date(award.AwardedAt);
          if (awardDate < oneYearAgoDate) return;
          var dayStr = awardDate.toISOString().substring(0, 10);
          var aType = (award.AwardType || "").toLowerCase();
          if (aType === "mastery/completion" || aType === "mastery") {
            masteredDayMap[dayStr] = (masteredDayMap[dayStr] || 0) + 1;
          } else if (aType === "game beaten") {
            beatenDayMap[dayStr] = (beatenDayMap[dayStr] || 0) + 1;
          }
        });
      }
      if (yearlyAchievements && yearlyAchievements.length > 0) {
        renderActivityTimeline(yearlyAchievements, masteredDayMap, beatenDayMap, timelineSection);
      } else {
        timelineSection.querySelector(".enhanced-timeline-content").innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load activity data.</div>';
      }
      log.info("Dashboard loaded for " + targetUser);
    }).catch(function(err) {
      log.warn("Dashboard failed: " + err.message);
      statsRow.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;grid-column:1/-1;">Failed to load dashboard</div>';
    });
  }
  function fetchAllTimeAchievements(targetUser, apiKey, summary) {
    var now = /* @__PURE__ */ new Date();
    var floor = new Date(now.getTime() - 365 * 20 * 24 * 60 * 60 * 1e3);
    var from = null;
    if (summary && summary.MemberSince) {
      var parsed = /* @__PURE__ */ new Date(String(summary.MemberSince).replace(" ", "T") + "Z");
      if (!isNaN(parsed.getTime())) from = parsed;
    }
    if (!from || from > now || from < floor) {
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
    }
    var chunkUrls = [];
    var cursor = from;
    while (cursor < now) {
      var next = new Date(cursor.getTime() + 365 * 24 * 60 * 60 * 1e3);
      var to = next > now ? now : next;
      chunkUrls.push(
        "https://retroachievements.org/API/API_GetAchievementsEarnedBetween.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey) + "&f=" + Math.floor(cursor.getTime() / 1e3) + "&t=" + Math.floor(to.getTime() / 1e3)
      );
      cursor = to;
    }
    return Promise.all(chunkUrls.map(function(url) {
      return gmFetch(url, 2e4).then(function(r) {
        return JSON.parse(r.responseText);
      }).catch(function() {
        return [];
      });
    })).then(function(chunks) {
      var all = [];
      chunks.forEach(function(chunk) {
        if (Array.isArray(chunk)) all = all.concat(chunk);
      });
      var seen = {};
      return all.filter(function(a) {
        var key = a.AchievementID + "|" + a.Date + "|" + a.HardcoreMode;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    });
  }

  // src/features/user-profile/user-stats.js
  function enhanceUserStats() {
    var userStatsH2 = null;
    var allH2s = document.querySelectorAll("h2");
    for (var h = 0; h < allH2s.length; h++) {
      if (/User\s*Stats/i.test(allH2s[h].textContent)) {
        userStatsH2 = allH2s[h];
        break;
      }
    }
    if (!userStatsH2) return;
    var statsContainer = userStatsH2.closest("[x-data]");
    if (!statsContainer) statsContainer = userStatsH2.parentElement.parentElement;
    if (!statsContainer) return;
    var statEls = statsContainer.querySelectorAll(".relative.flex.w-full.items-center.justify-between");
    var s = {};
    statEls.forEach(function(el) {
      var ps = el.querySelectorAll("p");
      if (ps.length >= 2) {
        var label = (ps[0].textContent || "").trim();
        var value = (ps[1].textContent || "").trim();
        if (label) s[label] = value;
      }
    });
    if (Object.keys(s).length === 0) return;
    function val(key) {
      if (Array.isArray(key)) {
        for (var ki = 0; ki < key.length; ki++) {
          if (s[key[ki]]) return s[key[ki]];
        }
        return "";
      }
      return s[key] || "";
    }
    function extractWeighted(raw) {
      var m = raw.match(/^([\d,.\s]+)\s*\((.+)\)$/);
      return m ? { main: m[1].trim(), weighted: m[2].trim() } : { main: raw, weighted: "" };
    }
    function extractRankTotal(raw) {
      var m = raw.match(/#([\d,]+)\s*of\s*([\d,]+)/i);
      return m ? { rank: "#" + m[1], total: "of " + m[2] } : { rank: raw, total: "" };
    }
    function extractBeatenRetail(raw) {
      var m = raw.match(/^(\d+)\s*\((.+)\)$/);
      return m ? { count: m[1], retail: m[2].trim() } : { count: raw, retail: "" };
    }
    var pts = extractWeighted(val("Points"));
    var rank = extractRankTotal(val("Site rank"));
    var beaten = extractBeatenRetail(val("Total games beaten"));
    var primaryHtml = '<div class="metric-card"><div class="card-top"><span class="metric-label">Points</span><span class="card-icon">⭐</span></div><div class="metric-value" style="color:#a78bfa;">' + escapeHtml(pts.main) + "</div>" + (pts.weighted ? '<div class="metric-sub">' + escapeHtml(pts.weighted) + " weighted</div>" : "") + '</div><div class="metric-card"><div class="card-top"><span class="metric-label">Site rank</span><span class="card-icon">🏅</span></div><div class="metric-value-sm" style="color:#fbbf24;">' + escapeHtml(rank.rank) + "</div>" + (rank.total ? '<div class="metric-sub">' + escapeHtml(rank.total) + "</div>" : "") + '</div><div class="metric-card"><div class="card-top"><span class="metric-label">Achievements</span><span class="card-icon">🏆</span></div><div class="metric-value" style="color:#3b82f6;">' + escapeHtml(val("Achievements unlocked")) + '</div></div><div class="metric-card"><div class="card-top"><span class="metric-label">RetroRatio</span><span class="card-icon">📊</span></div><div class="metric-value" style="color:#10b981;">' + escapeHtml(val("RetroRatio")) + '</div></div><div class="metric-card"><div class="card-top"><span class="metric-label">Games beaten</span><span class="card-icon">🎮</span></div><div class="metric-value" style="color:#f472b6;">' + escapeHtml(beaten.count) + "</div>" + (beaten.retail ? '<div class="metric-sub">' + escapeHtml(beaten.retail) + "</div>" : "") + '</div><div class="metric-card"><div class="card-top"><span class="metric-label">Beaten rate</span><span class="card-icon">📈</span></div><div class="metric-value" style="color:#38bdf8;">' + escapeHtml(val("Started games beaten")) + "</div></div>";
    var recentDefs = [
      { key: "Points earned in the last 7 days", label: "Points (7 days)", icon: "📅" },
      { key: "Points earned in the last 30 days", label: "Points (30 days)", icon: "📆" },
      { key: "Average points per week", label: "Avg pts / week", icon: "📉" },
      { key: "Average completion", label: "Avg completion", icon: "🎯" }
    ];
    var recentHtml = "";
    var hasRecent = false;
    recentDefs.forEach(function(def) {
      var v = val(def.key);
      if (!v) return;
      hasRecent = true;
      recentHtml += '<div class="metric-card"><div class="card-top"><span class="metric-label">' + escapeHtml(def.label) + '</span><span class="card-icon">' + def.icon + '</span></div><div class="metric-value" style="color:#e4e4e7;">' + escapeHtml(v) + "</div></div>";
    });
    var casualDefs = [
      { key: ["Points (casual)", "Points (softcore)"], label: "Points", icon: "⚡" },
      { key: ["Casual rank", "Softcore rank"], label: "Rank", icon: "🥈", isRank: true },
      { key: ["Achievements unlocked (casual)", "Achievements unlocked (softcore)"], label: "Achievements", icon: "🔓" }
    ];
    var softcoreHtml = "";
    var hasSoftcore = false;
    casualDefs.forEach(function(def) {
      var v = val(def.key);
      if (!v) return;
      hasSoftcore = true;
      var parsed = extractRankTotal(v);
      if (def.isRank && parsed.total) {
        softcoreHtml += '<div class="metric-card"><div class="card-top"><span class="metric-label">' + escapeHtml(def.label) + '</span><span class="card-icon">' + def.icon + '</span></div><div class="metric-value-sm" style="color:#737373;">' + escapeHtml(parsed.rank) + '</div><div class="metric-sub">' + escapeHtml(parsed.total) + "</div></div>";
      } else {
        softcoreHtml += '<div class="metric-card"><div class="card-top"><span class="metric-label">' + escapeHtml(def.label) + '</span><span class="card-icon">' + def.icon + '</span></div><div class="metric-value" style="color:#737373;">' + escapeHtml(v) + "</div></div>";
      }
    });
    var html = '<div class="stats-root"><div class="stats-title">User Stats</div><div class="stats-grid-3">' + primaryHtml + "</div>";
    if (hasRecent) {
      html += '<hr class="stats-divider"><div class="section-label">Recent activity</div><div class="stats-grid-4">' + recentHtml + "</div>";
    }
    if (hasSoftcore) {
      html += '<hr class="stats-divider"><div class="section-label">Casual</div><div class="stats-grid-3">' + softcoreHtml + "</div>";
    }
    html += "</div>";
    var enhancedDiv = document.createElement("div");
    enhancedDiv.innerHTML = html;
    statsContainer.parentNode.insertBefore(enhancedDiv, statsContainer);
    statsContainer.style.display = "none";
  }

  // src/features/user-profile/index.js
  async function initUserPagination() {
    var page = location.pathname;
    var userMatch = page.match(/^\/user\/([^\/?#]+)/);
    if (!userMatch) return;
    var targetUser = decodeURIComponent(userMatch[1]);
    var apiKey = await GM_getValue("raApiKey", "");
    var enableRarityIndicator = await GM_getValue("enableRarityIndicator", true);
    if (!apiKey) {
      log.debug("User pagination: no API key configured, skipping");
      return;
    }
    await new Promise(function(resolve) {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve);
    });
    await new Promise(function(r) {
      setTimeout(r, 500);
    });
    var headings = document.querySelectorAll("h2");
    var recentH2 = null;
    for (var i = 0; i < headings.length; i++) {
      if (/Last.*Games?\s*Played/i.test(headings[i].textContent)) {
        recentH2 = headings[i];
        break;
      }
    }
    if (!recentH2) {
      log.debug("User pagination: could not find 'Last Games Played' heading");
      return;
    }
    var componentRoot = recentH2.parentElement;
    var outerWrapper = componentRoot ? componentRoot.parentElement : null;
    var existingList = componentRoot ? componentRoot.querySelector("div.flex.flex-col") : null;
    if (!existingList) {
      log.debug("User pagination: could not find game list container");
      return;
    }
    if (document.getElementById("enhanced-pagination")) return;
    injectProfileStyles();
    if (outerWrapper) {
      var moreLink = outerWrapper.querySelector('a[href*="?g="]');
      if (moreLink) {
        var moreLinkParent = moreLink.closest("div.text-right") || moreLink.parentElement;
        if (moreLinkParent && moreLinkParent !== outerWrapper) moreLinkParent.remove();
        else moreLink.remove();
      }
    }
    var ITEMS_PER_PAGE = 5;
    var currentOffset = 0;
    var totalLoaded = -1;
    var highestKnownPage = 1;
    var lastKnownHasMore = true;
    var gamesList = document.createElement("div");
    gamesList.className = "enhanced-games-list";
    var paginationDiv = document.createElement("div");
    paginationDiv.id = "enhanced-pagination";
    componentRoot.appendChild(gamesList);
    componentRoot.appendChild(paginationDiv);
    var originalHeadingText = recentH2.textContent.trim();
    var perPageWrapper = document.createElement("div");
    perPageWrapper.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin-left:12px;vertical-align:middle;";
    var perPageLabel = document.createElement("label");
    perPageLabel.textContent = "Show:";
    perPageLabel.style.cssText = "font-size:0.75rem;color:#a3a3a3;";
    var perPageSelect = document.createElement("select");
    perPageSelect.style.cssText = "background:#18181b;color:#e4e4e7;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.75rem;cursor:pointer;";
    [5, 10, 15, 20, 30, 50].forEach(function(n) {
      var opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      if (n === ITEMS_PER_PAGE) opt.selected = true;
      perPageSelect.appendChild(opt);
    });
    perPageSelect.addEventListener("change", function() {
      ITEMS_PER_PAGE = parseInt(perPageSelect.value, 10);
      highestKnownPage = 1;
      lastKnownHasMore = true;
      clearAchievementCache();
      doLoadPage(0);
    });
    perPageWrapper.appendChild(perPageLabel);
    perPageWrapper.appendChild(perPageSelect);
    var headingRow = document.createElement("div");
    headingRow.style.cssText = "display:flex;align-items:center;flex-wrap:wrap;gap:0;";
    recentH2.parentNode.insertBefore(headingRow, recentH2);
    headingRow.appendChild(recentH2);
    headingRow.appendChild(perPageWrapper);
    enhanceUserStats();
    var dashboardDiv = document.createElement("div");
    dashboardDiv.className = "enhanced-dashboard";
    componentRoot.insertBefore(dashboardDiv, headingRow);
    var dashTitle = document.createElement("div");
    dashTitle.className = "enhanced-dashboard-title";
    dashTitle.innerHTML = "📊 Player Insights";
    dashboardDiv.appendChild(dashTitle);
    var timelineSection = document.createElement("div");
    timelineSection.className = "enhanced-dashboard-section";
    timelineSection.innerHTML = '<div class="enhanced-dashboard-section-title">📅 Activity (Last 365 Days)<span class="enhanced-timeline-total" id="enhanced-timeline-total"></span></div><div class="enhanced-timeline-content"><div class="enhanced-dashboard-skeleton" style="height:32px;"></div></div>';
    dashboardDiv.appendChild(timelineSection);
    var statsRow = document.createElement("div");
    statsRow.className = "enhanced-stats-row";
    statsRow.innerHTML = '<div class="enhanced-dashboard-skeleton" style="height:60px;"></div><div class="enhanced-dashboard-skeleton" style="height:60px;animation-delay:0.1s;"></div><div class="enhanced-dashboard-skeleton" style="height:60px;animation-delay:0.2s;"></div><div class="enhanced-dashboard-skeleton" style="height:60px;animation-delay:0.3s;"></div>';
    dashboardDiv.appendChild(statsRow);
    var almostSection = document.createElement("div");
    almostSection.className = "enhanced-dashboard-section";
    almostSection.innerHTML = '<div class="enhanced-dashboard-section-title">🎯 Almost There</div><div class="enhanced-almost-list"><div class="enhanced-dashboard-skeleton" style="height:48px;margin-bottom:6px;"></div><div class="enhanced-dashboard-skeleton" style="height:48px;margin-bottom:6px;animation-delay:0.1s;"></div><div class="enhanced-dashboard-skeleton" style="height:48px;animation-delay:0.2s;"></div></div>';
    dashboardDiv.appendChild(almostSection);
    var streakSection = document.createElement("div");
    streakSection.className = "enhanced-dashboard-section";
    streakSection.innerHTML = '<div class="enhanced-dashboard-section-title">🔥 Streak Tracker</div><div class="enhanced-streak-content"><div class="enhanced-dashboard-skeleton" style="height:48px;"></div></div>';
    dashboardDiv.appendChild(streakSection);
    var rarestSection = document.createElement("div");
    rarestSection.className = "enhanced-dashboard-section";
    rarestSection.innerHTML = '<div class="enhanced-dashboard-section-title"><span>💎 Rarest Achievements</span><div id="enhanced-rare-sort" style="margin-left:auto;"></div></div><div class="enhanced-rare-list"><div class="enhanced-dashboard-skeleton" style="height:42px;margin-bottom:6px;"></div><div class="enhanced-dashboard-skeleton" style="height:42px;margin-bottom:6px;animation-delay:0.1s;"></div><div class="enhanced-dashboard-skeleton" style="height:42px;animation-delay:0.2s;"></div></div><div id="enhanced-rare-pagination"></div>';
    dashboardDiv.appendChild(rarestSection);
    var gameAwardsMap = {};
    renderProgressionDashboard();
    fetchDashboardData({
      targetUser,
      apiKey,
      enableRarityIndicator,
      gameAwardsMap,
      statsRow,
      almostSection,
      streakSection,
      rarestSection,
      timelineSection
    });
    const paginatorContext = {
      get itemsPerPage() {
        return ITEMS_PER_PAGE;
      },
      get hasMore() {
        return lastKnownHasMore;
      },
      set hasMore(value) {
        lastKnownHasMore = value;
      },
      get highestKnownPage() {
        return highestKnownPage;
      },
      set highestKnownPage(value) {
        highestKnownPage = value;
      },
      loadPage: function(offset) {
        doLoadPage(offset);
      }
    };
    function doLoadPage(offset) {
      currentOffset = offset;
      if (offset === 0 && ITEMS_PER_PAGE === 5) {
        existingList.style.display = "";
        gamesList.innerHTML = "";
        recentH2.textContent = originalHeadingText;
        renderPaginator(paginationDiv, 0, true, paginatorContext);
        return;
      }
      existingList.style.display = "none";
      renderSkeletonCards(gamesList, ITEMS_PER_PAGE);
      var url = "https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php?u=" + encodeURIComponent(targetUser) + "&y=" + encodeURIComponent(apiKey) + "&c=" + ITEMS_PER_PAGE + "&o=" + offset;
      gmFetch(url, 15e3).then(function(resp) {
        var games = JSON.parse(resp.responseText);
        var hasMore = games.length === ITEMS_PER_PAGE;
        renderGames(games, { targetUser, apiKey, enableRarityIndicator, gameAwardsMap, gamesList });
        renderPaginator(paginationDiv, offset, hasMore, paginatorContext);
        if (games.length > 0) {
          recentH2.textContent = "Recently Played Games";
        }
        recentH2.scrollIntoView({ behavior: "smooth", block: "start" });
      }).catch(function(err) {
        gamesList.innerHTML = '<div style="color:#ef4444;padding:12px;">Failed to load games: ' + escapeHtml(err.message) + "</div>";
      });
    }
    renderPaginator(paginationDiv, 0, true, paginatorContext);
    log.info("User pagination initialized for: " + targetUser);
  }

  // src/bootstrap.js
  function waitForHydration(timeout) {
    return new Promise(function(resolve) {
      var el = document.getElementById("app");
      if (!el) return resolve();
      var hasReactFiber = Object.keys(el).some(function(k) {
        return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
      });
      if (hasReactFiber) return resolve();
      var observer = new MutationObserver(function() {
        var hydrated = Object.keys(el).some(function(k) {
          return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
        });
        if (hydrated) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(el, { childList: true, subtree: true, attributes: true });
      setTimeout(function() {
        observer.disconnect();
        resolve();
      }, timeout || 5e3);
    });
  }
  var _lastInitUrl = null;
  var _initTimer = null;
  function runAll() {
    var url = location.pathname + location.search;
    if (_lastInitUrl === url) {
      console.log("[RA Toolkit] ⏩ Skipping duplicate init for: " + url);
      return;
    }
    console.log("[RA Toolkit] 🚀 runAll() → " + url);
    _lastInitUrl = url;
    init().catch(function(err) {
      console.error("[RA Toolkit] ❌ init() threw:", err);
    });
    initAchievementNavLinks();
    initUserPagination().catch(function(err) {
      console.error("[RA Toolkit] ❌ initUserPagination() threw:", err);
    });
    initGameAwardsBeaten().catch(function(err) {
      console.error("[RA Toolkit] ❌ initGameAwardsBeaten() threw:", err);
    });
    initGamesMostMastered().catch(function(err) {
      console.error("[RA Toolkit] ❌ initGamesMostMastered() threw:", err);
    });
    initWallLinkify();
    initWallTranslation();
  }
  function scheduleInit(delay) {
    if (_initTimer) clearTimeout(_initTimer);
    _initTimer = setTimeout(function() {
      _initTimer = null;
      runAll();
    }, delay);
  }
  function start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        console.log("[RA Toolkit] 🟡 DOMContentLoaded — waiting for hydration...");
        waitForHydration(5e3).then(function() {
          scheduleInit(0);
        });
      });
    } else {
      console.log("[RA Toolkit] 🟢 Document already ready — waiting for hydration...");
      waitForHydration(5e3).then(function() {
        scheduleInit(0);
      });
    }
    document.addEventListener("inertia:navigate", function() {
      _lastInitUrl = null;
      scheduleInit(300);
    });
  }

  // src/main.js
  console.log("[RA Toolkit] ✅ Script loaded — v" + CURRENT_VERSION + " — " + location.href);
  start();
})();
