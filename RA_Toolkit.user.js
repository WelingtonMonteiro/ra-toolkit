// ==UserScript==
// @name         RA Toolkit
// @namespace    https://github.com/WelingtonMonteiro
// @version      2.5.3
// @description  Toolkit for RetroAchievements.org — ROMs, translations, dashboard, pagination and more. Based on Retro Enhanced by Miagui.
// @author       Miagui / Updated by Welington
// @match        *://retroachievements.org/*
// @license      MIT
// @icon         https://retroachievements.org/assets/images/ra-logo.webp
// @homepageURL  https://github.com/WelingtonMonteiro/ra-toolkit
// @supportURL   https://github.com/WelingtonMonteiro/ra-toolkit/issues
// @updateURL    https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js
// @downloadURL  https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js
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

(function () {
  "use strict";

  // =========================================
  //       Inertia Props Helper
  // =========================================
  // The new RAWeb uses Inertia.js + React. Page data is stored
  // as a JSON blob in the #app element's data-page attribute.

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

  // =========================================
  //     HTML/XML Parsing (jQuery-free)
  // =========================================
  const domParser = new DOMParser();

  function parseHtml(htmlString) {
    return domParser.parseFromString(htmlString, "text/html");
  }

  function parseXml(xmlString) {
    return domParser.parseFromString(xmlString, "text/xml");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // =========================================
  //        Structured Logging
  // =========================================
  var LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, off: 4 };
  var currentLogLevel = LOG_LEVELS.info; // default until config loads

  var log = {
    _format: function (level, msg) {
      return "[RA Toolkit][" + level.toUpperCase() + "] " + msg;
    },
    debug: function (msg) {
      if (currentLogLevel <= LOG_LEVELS.debug) GM_log(log._format("debug", msg));
    },
    info: function (msg) {
      if (currentLogLevel <= LOG_LEVELS.info) GM_log(log._format("info", msg));
    },
    warn: function (msg) {
      if (currentLogLevel <= LOG_LEVELS.warn) {
        GM_log(log._format("warn", msg));
        console.warn(log._format("warn", msg));
      }
    },
    error: function (msg) {
      if (currentLogLevel <= LOG_LEVELS.error) {
        GM_log(log._format("error", msg));
        console.error(log._format("error", msg));
      }
    }
  };

  // =========================================
  //  GM_xmlhttpRequest wrapper with errors
  // =========================================
  function gmFetch(url, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: timeoutMs,
        onload: function (response) {
          if (response.status >= 200 && response.status < 400) {
            resolve(response);
          } else {
            reject(new Error("HTTP " + response.status + " for " + url));
          }
        },
        onerror: function (err) {
          reject(new Error("Network error fetching " + url + ": " + (err.error || "unknown")));
        },
        ontimeout: function () {
          reject(new Error("Timeout fetching " + url));
        }
      });
    });
  }

  // =========================================
  //   MyMemory Translation with Rate Limiter
  // =========================================
  var TRANSLATE_DAILY_LIMIT = 5000; // MyMemory free tier: 5000 chars/day

  function getTodayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getTranslateUsage() {
    return Promise.resolve(GM_getValue('translateUsage', null)).then(function (val) {
      if (val && val.date === getTodayKey()) return val;
      return { date: getTodayKey(), chars: 0 };
    });
  }

  function addTranslateUsage(charCount) {
    return getTranslateUsage().then(function (usage) {
      usage.chars += charCount;
      GM_setValue('translateUsage', usage);
      return usage;
    });
  }

  function translateWithRateLimit(text, targetLang) {
    return getTranslateUsage().then(function (usage) {
      var remaining = TRANSLATE_DAILY_LIMIT - usage.chars;
      if (remaining <= 0) {
        return Promise.reject(new Error('RATE_LIMIT: Daily translation limit reached (' + TRANSLATE_DAILY_LIMIT + ' chars). Resets tomorrow.'));
      }
      if (text.length > remaining) {
        return Promise.reject(new Error('RATE_LIMIT: Text too long (' + text.length + ' chars). Only ' + remaining + ' chars remaining today.'));
      }
      var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|' + encodeURIComponent(targetLang.split('-')[0]);
      return gmFetch(url, 10000).then(function (resp) {
        var data = JSON.parse(resp.responseText);
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
          addTranslateUsage(text.length);
          return data.responseData.translatedText;
        }
        throw new Error(data.responseDetails || 'Translation failed');
      });
    });
  }

  // =========================================
  //     ROM Search Cache (GM_setValue + TTL)
  // =========================================
  var ROM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  function getRomCacheKey(gameTitle, consoleName) {
    return 'romCache_' + consoleName + '_' + gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  function getCachedRomResults(gameTitle, consoleName) {
    var key = getRomCacheKey(gameTitle, consoleName);
    return Promise.resolve(GM_getValue(key, null)).then(function (cached) {
      if (!cached) return null;
      if (Date.now() - cached.ts > ROM_CACHE_TTL) {
        GM_deleteValue(key);
        return null;
      }
      log.info("[Cache] Hit for " + gameTitle + " (" + cached.results.length + " results, age " + Math.round((Date.now() - cached.ts) / 60000) + "m)");
      return cached;
    });
  }

  function setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collectionName, collectionUrl) {
    var key = getRomCacheKey(gameTitle, consoleName);
    GM_setValue(key, {
      ts: Date.now(),
      results: results,
      resultsDlcs: resultsDlcs,
      collection: { name: collectionName, url: collectionUrl }
    });
    log.info("[Cache] Stored " + results.length + " results for " + gameTitle);
  }

  // =========================================
  //   Changelog Popup (after version update)
  // =========================================
  var CURRENT_VERSION = "2.5.3";

  var CHANGELOG = [
    { version: "2.5.3", changes: [
      "Updated install/update URLs for Greasy Fork"
    ]},
    { version: "2.5.2", changes: [
      "Activity Timeline: tooltip now shows year (e.g. 'Mar 19, 2026: 5 achievements')"
    ]},
    { version: "2.5.1", changes: [
      "Translate: disable button for texts exceeding 500-char API query limit",
      "Translate: show 'Too long' label with character count tooltip on hover"
    ]},
    { version: "2.5.0", changes: [
      "Activity Timeline: total achievements count shown in title",
      "Activity Timeline: toggle buttons to switch between Achievements (blue), Mastered (gold), and Beaten (gray) heatmaps",
      "New API integration: GetUserAwards for mastered/beaten game dates"
    ]},
    { version: "2.4.4", changes: [
      "Fix: rarity indicators on game page now work with all languages (i18n-safe percentage parsing)"
    ]},
    { version: "2.4.3", changes: [
      "Fix: enableRarityIndicator variable scope — rarity indicators now work correctly in achievement badges pagination"
    ]},
    { version: "2.4.2", changes: [
      "Image preview in wall comments — image links (png, jpg, gif, webp, etc.) show inline preview, click to open"
    ]},
    { version: "2.4.1", changes: [
      "Activity Timeline moved above Player Insights stats for better visibility"
    ]},
    { version: "2.4.0", changes: [
      "User Wall linkify — plain text URLs in comments become clickable links (opens in new tab)",
      "YouTube embed — YouTube links in wall comments show an inline mini video player"
    ]},
    { version: "2.3.3", changes: [
      "Emuparadise fix — links to download page instead of direct file (avoids referer block)"
    ]},
    { version: "2.3.2", changes: [
      "Emuparadise download fix — correct game ID extraction and direct download link with workaround"
    ]},
    { version: "2.3.1", changes: [
      "Timeline layout fix — uniform cell sizes and month labels overflow like GitHub's contribution graph"
    ]},
    { version: "2.3.0", changes: [
      "1-year Activity Timeline — GitHub-style contribution heatmap (52 weeks × 7 days) replacing the 30-day grid",
      "Streak Tracker now uses 365-day data for more accurate streak and active-day counts",
      "Yearly data fetched via quarterly API chunks (API_GetAchievementsEarnedBetween) to bypass 500-record limit"
    ]},
    { version: "2.2.1", changes: [
      "Missing consoles — added ROM search support for Amstrad CPC, Apple II, Uzebox, and WASM-4"
    ]},
    { version: "2.2.0", changes: [
      "Achievement rarity indicator — color-coded badges (Common, Uncommon, Rare, Very Rare, Ultra Rare, Legendary) on game page achievements and profile badges",
      "Collapse/expand sidebar sections — click ROMs or World Records headers to collapse/expand, state persisted"
    ]},
    { version: "2.1.1", changes: [
      "Save button in settings panel — 'Atualizar' button to confirm and reload"
    ]},
    { version: "2.1.0", changes: [
      "ROM search cache (24h TTL) — no more re-searching the same game",
      "Changelog popup — shows what's new after updates",
      "Custom accent color — choose your highlight color in settings",
      "Light mode support — adapts to the RA site theme (dark/light/black)",
      "Mobile layout support — sidebar injections work on mobile (<1024px)",
      "Guide link detection — shows RA Guide link on game pages when available"
    ]},
    { version: "2.0.0", changes: [
      "Player Insights Dashboard (6 modules)",
      "RomsFun ROM source",
      "RA Trophy badge for hash-verified ROMs",
      "Pagination skeleton loaders",
      "Previous/Next pagination buttons",
      "MyMemory API rate limiter"
    ]}
  ];

  function showChangelogPopup() {
    return Promise.resolve(GM_getValue("lastSeenVersion", "0.0.0")).then(function (lastSeen) {
      if (lastSeen === CURRENT_VERSION) return;
      GM_setValue("lastSeenVersion", CURRENT_VERSION);

      // Collect changes since last seen version
      var newChanges = [];
      for (var i = 0; i < CHANGELOG.length; i++) {
        if (CHANGELOG[i].version === lastSeen) break;
        newChanges.push(CHANGELOG[i]);
      }
      if (newChanges.length === 0) return;

      var changesHtml = newChanges.map(function (entry) {
        var items = entry.changes.map(function (c) { return '<li style="margin:2px 0;">' + escapeHtml(c) + '</li>'; }).join('');
        return '<div style="margin-bottom:10px;"><strong style="color:var(--ra-accent,#3b82f6);">v' + escapeHtml(entry.version) + '</strong><ul style="margin:4px 0 0 16px;padding:0;list-style:disc;">' + items + '</ul></div>';
      }).join('');

      var overlay = document.createElement('div');
      overlay.id = 'enhanced-changelog-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);';
      overlay.innerHTML =
        '<div style="background:var(--box-bg-color,#232323);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;color:var(--text-color,#c8c8c8);font-size:0.9rem;box-shadow:0 8px 32px rgba(0,0,0,0.5);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
        + '<h3 style="margin:0;font-size:1.2rem;color:var(--heading-color,#d2d2d2);">🎮 RA Toolkit Updated!</h3>'
        + '<button id="enhanced-changelog-close" style="background:none;border:none;color:var(--text-color,#c8c8c8);font-size:1.4rem;cursor:pointer;padding:0 4px;line-height:1;">&times;</button>'
        + '</div>'
        + '<div style="line-height:1.5;">' + changesHtml + '</div>'
        + '<div style="text-align:center;margin-top:16px;">'
        + '<button id="enhanced-changelog-ok" style="padding:8px 24px;border-radius:8px;border:none;background:var(--ra-accent,#3b82f6);color:#fff;font-size:0.9rem;cursor:pointer;font-weight:600;">Got it!</button>'
        + '</div>'
        + '</div>';

      document.body.appendChild(overlay);

      function closePopup() { overlay.remove(); }
      document.getElementById('enhanced-changelog-close').addEventListener('click', closePopup);
      document.getElementById('enhanced-changelog-ok').addEventListener('click', closePopup);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closePopup(); });
    });
  }

  // =========================================
  //    Theme Detection (light/dark/black)
  // =========================================
  function getScheme() {
    var html = document.documentElement;
    var scheme = html.getAttribute('data-scheme') || '';
    if (scheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return scheme || 'dark';
  }

  function isLightMode() {
    return getScheme() === 'light';
  }

  // =========================================
  //       Wait for React to Render
  // =========================================
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timeout waiting for: " + selector));
      }, timeout);
    });
  }

  // =========================================
  //       Get Logged User
  // =========================================
  function getLoggedUser() {
    const props = getInertiaProps();
    if (props && props.auth && props.auth.user) {
      return props.auth.user.displayName || props.auth.user.display_name || "";
    }
    // Fallback: try dropdown-header text
    const header = document.querySelector(".dropdown-header");
    if (header) return header.textContent.trim();
    return "";
  }

  // =========================================
  //      Cleanup previous injections
  // =========================================
  // =========================================
  //     Rarity Tier Helper
  // =========================================
  function getRarityTier(percentage) {
    if (percentage >= 50) return { label: 'Common', color: '#a3a3a3', bg: 'rgba(163,163,163,0.12)' };
    if (percentage >= 25) return { label: 'Uncommon', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    if (percentage >= 10) return { label: 'Rare', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
    if (percentage >= 5)  return { label: 'Very Rare', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' };
    if (percentage >= 2)  return { label: 'Ultra Rare', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { label: 'Legendary', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  }

  function cleanup() {
    const ids = ["enhanced-settings", "enhanced-romsdl", "enhanced-speedruncom",
                 "enhanced-custom-bg-style", "enhanced-glass-style", "enhanced-dl-style",
                 "enhanced-translate-style", "enhanced-pagination", "enhanced-pagination-style",
                 "enhanced-guide-link", "enhanced-changelog-overlay", "enhanced-rarity-style",
                 "enhanced-collapse-style", "enhanced-wall-linkify-style"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    // Remove injected video iframes, translate buttons, rarity badges, and linkify embeds
    document.querySelectorAll("iframe.enhanced-video").forEach(el => el.remove());
    document.querySelectorAll(".enhanced-translate-btn").forEach(el => el.remove());
    document.querySelectorAll(".enhanced-rarity-badge").forEach(el => el.remove());
    document.querySelectorAll(".enhanced-yt-embed").forEach(el => el.remove());
  }

  // =========================================
  //        Main Init Function
  // =========================================
  async function init() {
    cleanup();

    var page = location.pathname;

    // Reload configs on each navigation
    var enableSpeedrun = await GM_getValue("enableSpeedrun", false);
  var enableRomSearch = await GM_getValue("enableRomSearch", true);
  var enableCustomBG = await GM_getValue("enableCustomBG", true);
  var enableGameplayVideo = await GM_getValue("enableGameplayVideo", true);
  var enableEmuparadise = await GM_getValue("enableEmuparadise", false);
  var prioritizeEmuparadise = await GM_getValue("prioritizeEmuparadise", false);
  var enableGlassEffect = await GM_getValue("enableGlassEffect", true);
  var enableHashCheck = await GM_getValue("enableHashCheck", true);
  var enableRomsFun = await GM_getValue("enableRomsFun", true);
  var enableDebugLog = await GM_getValue("enableDebugLog", false);
  var enableRarityIndicator = await GM_getValue("enableRarityIndicator", true);
  var translateLang = await GM_getValue("translateLang", "pt-BR");
  var accentColor = await GM_getValue("accentColor", "#3b82f6");

  // Apply log level from config
  currentLogLevel = enableDebugLog ? LOG_LEVELS.debug : LOG_LEVELS.info;

  // Inject accent color CSS variable
  var accentStyle = document.getElementById('enhanced-accent-style');
  if (!accentStyle) {
    accentStyle = document.createElement('style');
    accentStyle.id = 'enhanced-accent-style';
    document.head.appendChild(accentStyle);
  }
  accentStyle.textContent = ':root { --ra-accent: ' + accentColor + '; }'
    + ' .enhanced-switch[data-state="checked"] { background-color: ' + accentColor + ' !important; }'
    + ' .enhanced-translate-btn.translated { color: ' + accentColor + '; border-color: ' + accentColor + '40; }'
    + ' #enhanced-changelog-ok { background: ' + accentColor + ' !important; }';

  // Inject light mode adaptive CSS
  var lightStyle = document.getElementById('enhanced-light-style');
  if (!lightStyle) {
    lightStyle = document.createElement('style');
    lightStyle.id = 'enhanced-light-style';
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
  ` : '';

  // Show changelog popup on first run after update
  showChangelogPopup();

  // =========================================
  //          Console Mappings
  // =========================================
  const RAConsole = {
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

  const SRConsole = {
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

  // =========================================
  //        ROM Collection Dictionaries
  // =========================================

  const archiveCollectionDict = {
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

  const myrientCollectionDict = {
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
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/psp-chd-zstd-redump-part2/psp-chd-zstd/",
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
        "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-MegaCD-PAL/",
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
    },
  };

  // =========================================
  //            Settings Page
  // =========================================
  if (page === "/settings") {
    try {
      // Wait for the React settings page to render
      const settingsContainer = await waitForElement("main.with-sidebar article");
      // Find the flex container that holds all settings section cards
      const flexContainer = settingsContainer.querySelector("div.flex.flex-col > div.flex.flex-col");

      if (flexContainer) {
        // Inject toggle switch styles (matching RAWeb BaseSwitch)
        const switchStyle = document.createElement("style");
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

        function createSwitchHtml(id, checked) {
          var state = checked ? "checked" : "unchecked";
          return '<button id="' + id + '" role="switch" type="button" aria-checked="' + checked + '" data-state="' + state + '" class="enhanced-switch" tabindex="0"><span class="enhanced-switch-thumb"></span></button>';
        }

        function bindSwitch(id, gmKey) {
          var btn = document.getElementById(id);
          if (!btn) return;
          btn.addEventListener("click", function () {
            var isChecked = this.getAttribute("data-state") === "checked";
            var newState = !isChecked;
            this.setAttribute("data-state", newState ? "checked" : "unchecked");
            this.setAttribute("aria-checked", String(newState));
            GM_setValue(gmKey, newState);
          });
        }

        var settingsItems = [
          { id: "enhanced-romsearch", key: "enableRomSearch", val: enableRomSearch, label: "Enable ROMs search" },
          { id: "enhanced-hashcheck", key: "enableHashCheck", val: enableHashCheck, label: "Verify ROM hashes with RA API",
            hint: "Marks ROMs whose filename matches a known RA hash (requires RA API key in settings below)" },
          { id: "enhanced-epromsearch", key: "enableEmuparadise", val: enableEmuparadise, label: "Add Emuparadise to ROMs search",
            hint: "For Chrome users: enable mixed content; for all browsers: must click \"Add Exception\" the first time" },
          { id: "enhanced-prioritize_ep", key: "prioritizeEmuparadise", val: prioritizeEmuparadise, label: "Prioritize Emuparadise for ROMs search",
            hint: "Must have \"Add Emuparadise to ROMs search\" enabled" },
          { id: "enhanced-romsfun", key: "enableRomsFun", val: enableRomsFun, label: "Add RomsFun to ROMs search",
            hint: "Search romsfun.com for ROMs via their WordPress API" },
          { id: "enhanced-speedrun", key: "enableSpeedrun", val: enableSpeedrun, label: "Enable Speedrun.com stats" },
          { id: "enhanced-gameplayvideo", key: "enableGameplayVideo", val: enableGameplayVideo, label: "Enable gameplay video on the game page" },
          { id: "enhanced-custombg", key: "enableCustomBG", val: enableCustomBG, label: "Enable custom game page background" },
          { id: "enhanced-glassEffect", key: "enableGlassEffect", val: enableGlassEffect, label: "Enable glass background effect" },
          { id: "enhanced-debuglog", key: "enableDebugLog", val: enableDebugLog, label: "Enable debug logging",
            hint: "Outputs detailed debug-level logs to the Tampermonkey console" },
          { id: "enhanced-rarity", key: "enableRarityIndicator", val: enableRarityIndicator, label: "Achievement rarity indicator",
            hint: "Color-coded badges on achievements by unlock % (Common, Uncommon, Rare, Very Rare, Ultra Rare, Legendary)" },
        ];

        var rowsHtml = settingsItems.map(function (item) {
          var hintHtml = item.hint ? '<span style="display:block;font-size:0.8em;color:#b9b9b9;margin-top:2px;">' + item.hint + '</span>' : '';
          return '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;">'
            + '<label for="' + item.id + '" class="text-menu-link cursor-pointer" style="flex:1;">' + item.label + hintHtml + '</label>'
            + createSwitchHtml(item.id, item.val)
            + '</div>';
        }).join('');

        // Translation language selector
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
          { code: "ar-SA", label: "العربية" },
        ];
        var langOptionsHtml = langOptions.map(function (opt) {
          return '<option value="' + opt.code + '"' + (translateLang === opt.code ? ' selected' : '') + '>' + escapeHtml(opt.label) + '</option>';
        }).join('');
        var langSelectorHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);">'
          + '<label for="enhanced-translate-lang" class="text-menu-link" style="flex:1;">Translation language <span style="font-size:0.8em;color:#b9b9b9;">(for achievement card translate buttons)</span></label>'
          + '<select id="enhanced-translate-lang" style="width:200px;padding:4px 8px;border-radius:6px;border:1px solid #525252;background:#262626;color:#e5e5e5;font-size:0.875rem;cursor:pointer;">'
          + langOptionsHtml
          + '</select>'
          + '</div>';

        // API Key input
        var currentApiKey = await GM_getValue("raApiKey", "");
        var apiKeyHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);">'
          + '<label for="enhanced-apikey" class="text-menu-link" style="flex:1;">RA API Key <span style="font-size:0.8em;color:#b9b9b9;">(for hash verification — find yours at Settings > Keys)</span></label>'
          + '<input id="enhanced-apikey" type="password" value="' + escapeHtml(currentApiKey) + '" placeholder="Your web API key" '
          + 'style="width:200px;padding:4px 8px;border-radius:6px;border:1px solid #525252;background:#262626;color:#e5e5e5;font-size:0.875rem;" />'
          + '</div>';

        // Accent color picker
        var accentColorHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);">'
          + '<label for="enhanced-accent-color" class="text-menu-link" style="flex:1;">Accent color <span style="font-size:0.8em;color:#b9b9b9;">(custom highlight color for toggles, buttons, and UI elements)</span></label>'
          + '<div style="display:flex;align-items:center;gap:8px;">'
          + '<input id="enhanced-accent-color" type="color" value="' + escapeHtml(accentColor) + '" style="width:40px;height:32px;border:1px solid #525252;border-radius:6px;background:#262626;cursor:pointer;padding:2px;" />'
          + '<button id="enhanced-accent-reset" style="padding:4px 10px;border-radius:6px;border:1px solid #525252;background:#262626;color:#a3a3a3;font-size:0.8rem;cursor:pointer;" title="Reset to default blue">Reset</button>'
          + '</div>'
          + '</div>';

        const enhancedDiv = document.createElement("div");
        enhancedDiv.id = "enhanced-settings";
        enhancedDiv.className = "rounded-lg border border-embed-highlight bg-embed p-6 text-card-foreground shadow-sm w-full";
        enhancedDiv.innerHTML = '<h3 class="pb-2 border-b-0 text-2xl font-semibold leading-none tracking-tight">RA Toolkit</h3>'
          + '<div class="flex flex-col gap-4" style="margin-top:1rem;">'
          + rowsHtml
          + langSelectorHtml
          + apiKeyHtml
          + accentColorHtml
          + '</div>'
          + '<div class="flex w-full justify-end" style="margin-top:1rem;"><button id="enhanced-settings-save" class="btn-base btn-base--default btn-base--size-default" type="button">Atualizar</button></div>';

        // Insert after the second card in settings
        const cards = flexContainer.children;
        if (cards.length > 2) {
          cards[2].after(enhancedDiv);
        } else {
          flexContainer.appendChild(enhancedDiv);
        }

        // Bind all toggle switches
        settingsItems.forEach(function (item) {
          bindSwitch(item.id, item.key);
        });

        // Bind language selector
        var langSelect = document.getElementById("enhanced-translate-lang");
        if (langSelect) {
          langSelect.addEventListener("change", function () {
            GM_setValue("translateLang", this.value);
          });
        }

        // Bind API key input
        var apiKeyInput = document.getElementById("enhanced-apikey");
        if (apiKeyInput) {
          apiKeyInput.addEventListener("change", function () {
            GM_setValue("raApiKey", this.value);
          });
        }

        // Bind accent color picker
        var accentInput = document.getElementById("enhanced-accent-color");
        if (accentInput) {
          accentInput.addEventListener("input", function () {
            GM_setValue("accentColor", this.value);
            var s = document.getElementById('enhanced-accent-style');
            if (s) {
              s.textContent = ':root { --ra-accent: ' + this.value + '; }'
                + ' .enhanced-switch[data-state="checked"] { background-color: ' + this.value + ' !important; }'
                + ' .enhanced-translate-btn.translated { color: ' + this.value + '; border-color: ' + this.value + '40; }';
            }
            // Update all visible checked switches immediately
            document.querySelectorAll('.enhanced-switch[data-state="checked"]').forEach(function (sw) {
              sw.style.backgroundColor = accentInput.value;
            });
          });
        }
        var accentReset = document.getElementById("enhanced-accent-reset");
        if (accentReset) {
          accentReset.addEventListener("click", function () {
            var defaultColor = "#3b82f6";
            GM_setValue("accentColor", defaultColor);
            if (accentInput) accentInput.value = defaultColor;
            accentInput.dispatchEvent(new Event("input"));
          });
        }

        // Bind save/update button
        var saveBtn = document.getElementById("enhanced-settings-save");
        if (saveBtn) {
          saveBtn.addEventListener("click", function () {
            // All settings are already saved on change, just reload to apply
            var originalText = saveBtn.textContent;
            saveBtn.textContent = "✓ Salvo!";
            saveBtn.style.opacity = "0.7";
            saveBtn.disabled = true;
            setTimeout(function () {
              location.reload();
            }, 600);
          });
        }
      }
    } catch (e) {
      log.error("Settings page injection failed: " + e);
    }
  }

  // =========================================
  //            Game Page
  // =========================================
  // Match /game/{id} routes
  else if (page.match(/^\/game\/[0-9]+/) != null) {

    // Extract game data from Inertia props instead of scraping DOM
    let props = null;
    let consoleName = "";
    let gameTitle = "";
    let gameId = "";
    let gameImg = "";
    let tag = "";
    const rgxTag = /~(.*?)~/g;

    try {
      // Wait for the app to render and Inertia to hydrate
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
        // Fallback: extract data from multiple DOM sources
        log.info("Inertia props unavailable, falling back to DOM scraping");

        // Game title: try h1, then og:title, then document title
        const h1 = document.querySelector('h1');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        gameTitle = (h1 && h1.textContent.trim()) ||
                    (ogTitle && ogTitle.getAttribute("content")) ||
                    document.title.split(" - ")[0].trim() || "";

        // Game ID: try og:url, then canonical, then pathname
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const canonical = document.querySelector('link[rel="canonical"]');
        const urlSource = (ogUrl && ogUrl.getAttribute("content")) ||
                          (canonical && canonical.getAttribute("href")) ||
                          location.href;
        const idMatch = /game\/(\d+)/.exec(urlSource);
        if (idMatch) gameId = idMatch[1];

        // Console name: try system chip (multiple selectors)
        const systemChip = document.querySelector('a[href*="/system/"] span.hidden.sm\\:inline') ||
                           document.querySelector('a[href*="/system/"] span:last-child') ||
                           document.querySelector('[data-testid="desktop-banner"] a[href*="/system/"]');
        consoleName = systemChip ? systemChip.textContent.trim() : "";

        // In-game screenshot: try multiple alt texts and selectors
        const ingameImg = document.querySelector('img[alt="ingame screenshot"]') ||
                          document.querySelector('img[alt="In-game screenshot"]') ||
                          document.querySelector('[data-testid="game-show"] img:nth-child(2)');
        gameImg = ingameImg ? ingameImg.getAttribute("src") : "";

        log.info("[DOM] Game = " + gameTitle + " | Console = " + consoleName + " | ID = " + gameId);
      }
    } catch (e) {
      log.error("Failed to get game data: " + e);
      return;
    }

    // Check for tags like ~Hack~, ~Homebrew~, etc.
    if (gameTitle.match(rgxTag) != undefined) {
      tag = rgxTag.exec(gameTitle)[1];
      gameTitle = gameTitle.replace(gameTitle.match(rgxTag) + " ", "");
    }

    // Avoid unwanted exceptions for hubs pages
    if (consoleName === "") return;

    var isAvailable = false;
    var collection = { name: "", url: "" };
    var results = [];
    var resultsDlcs = [];

    // Speedrun.com API resources
    var srRoot = "https://www.speedrun.com/api/v1/";
    var srLogo = "";
    var srVideoUrl = "";
    var srGamelink = "";
    var srGameId = "";
    var srRuns = [];

    // =========================================
    //           Custom Background
    // =========================================
    if (gameImg && !gameImg.includes("/Images/000002.png") && enableCustomBG) {
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

    // Glass background effect
    if (enableGlassEffect) {
      const glassStyle = document.createElement("style");
      glassStyle.textContent = `
        :root { --box-bg-color: rgba(35, 35, 35, 0.95); }
        main.with-sidebar > article { background: var(--box-bg-color); border-radius: 0.5rem; }
        main.with-sidebar > aside { background: var(--box-bg-color); border-radius: 0.5rem; }
      `;
      document.head.appendChild(glassStyle);
    }

    // =========================================
    //        Prepare Sidebar Injection
    // =========================================
    // Desktop: aside with data-testid="sidebar"
    // Mobile (<1024px): sidebar is rendered below main content in block layout
    var isMobile = window.innerWidth < 1024;
    const sidebar = document.querySelector('aside [data-testid="sidebar"]') ||
                    document.querySelector("aside");

    // On mobile, also try to find the article content area for injection
    const mobileContainer = isMobile ? (document.querySelector('main.with-sidebar > article') || document.querySelector('main > article')) : null;

    // Create ROMs and Speedrun containers in the sidebar
    const divRoms = document.createElement("div");
    divRoms.id = "enhanced-romsdl";
    divRoms.style.marginTop = "1em";

    const divSpeedruncom = document.createElement("div");
    divSpeedruncom.id = "enhanced-speedruncom";
    divSpeedruncom.style.margin = "1em 0em";

    var injectionTarget = sidebar;
    if (isMobile && !sidebar && mobileContainer) {
      // On mobile without visible sidebar, inject at the end of article
      injectionTarget = mobileContainer;
      log.info("[Mobile] Injecting into article container");
    }

    if (injectionTarget) {
      // Insert at the top of the sidebar, after boxart
      const boxart = injectionTarget.querySelector("div.overflow-hidden.text-center") ||
                     (sidebar ? sidebar.firstElementChild : null);
      if (boxart && boxart.nextSibling) {
        boxart.after(divSpeedruncom);
        boxart.after(divRoms);
      } else if (sidebar) {
        sidebar.prepend(divSpeedruncom);
        sidebar.prepend(divRoms);
      } else {
        // Mobile fallback: append at the end
        injectionTarget.appendChild(divRoms);
        injectionTarget.appendChild(divSpeedruncom);
      }
    }

    // =========================================
    //    Collapse/Expand Sidebar Sections
    // =========================================
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
      // Find the h3 header inside this container
      var h3 = containerEl.querySelector("h3");
      if (!h3 || h3.classList.contains("enhanced-collapse-header")) return;

      injectCollapseStyle();

      // Read persisted collapse state
      var storeKey = "sidebarCollapsed_" + sectionKey;
      var isCollapsed = false;

      // Wrap all siblings after h3 into a content div
      var contentDiv = document.createElement("div");
      contentDiv.className = "enhanced-collapse-content";

      // Collect all siblings after h3
      var siblings = [];
      var next = h3.nextSibling;
      while (next) {
        siblings.push(next);
        next = next.nextSibling;
      }
      siblings.forEach(function (node) {
        contentDiv.appendChild(node);
      });
      containerEl.appendChild(contentDiv);

      // Make h3 a clickable header
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

      h3.addEventListener("click", function () {
        setCollapseState(!isCollapsed);
      });

      // Apply persisted state
      Promise.resolve(GM_getValue(storeKey, false)).then(function (saved) {
        if (saved) setCollapseState(true);
      });
    }

    // Show loading indicator while searching
    var loadingEl = null;
    function showLoading(container, text) {
      loadingEl = document.createElement("div");
      loadingEl.id = "enhanced-loading";
      loadingEl.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 0;color:#a3a3a3;font-size:0.9em;";
      loadingEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" style="animation:enhanced-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>'
        + '<span>' + escapeHtml(text) + '</span>';
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
      if (loadingEl) { loadingEl.remove(); loadingEl = null; }
    }

    if (enableGameplayVideo || enableSpeedrun) getSpeedruns(gameTitle);

    // =========================================
    //        Guide Link Detection
    // =========================================
    (function injectGuideLink() {
      // Try Inertia props first, then DOM scraping
      var guideUrl = null;
      if (props && props.backingGame && props.backingGame.guideUrl) {
        guideUrl = props.backingGame.guideUrl;
      } else if (props && props.game && props.game.guideUrl) {
        guideUrl = props.game.guideUrl;
      }
      // Fallback: check if there's already a guide link in the DOM
      if (!guideUrl) {
        var existingGuide = document.querySelector('a[href*="github.com/RetroAchievements/guides"]');
        if (existingGuide) guideUrl = existingGuide.href;
      }
      if (!guideUrl) {
        log.debug("[Guide] No guide URL found for this game");
        return;
      }
      // Don't inject if there's already a visible guide button
      if (document.getElementById('enhanced-guide-link')) return;

      log.info("[Guide] Found guide: " + guideUrl);

      var guideDiv = document.createElement("div");
      guideDiv.id = "enhanced-guide-link";
      guideDiv.style.cssText = "margin:0.75em 0;";
      guideDiv.innerHTML =
        '<a href="' + escapeHtml(guideUrl) + '" target="_blank" rel="noopener" '
        + 'style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;'
        + 'background:rgba(59,130,246,0.08);border:1px solid var(--ra-accent,#3b82f6);'
        + 'color:var(--ra-accent,#3b82f6);text-decoration:none;font-weight:600;font-size:0.9em;transition:all 0.2s;"'
        + ' onmouseover="this.style.background=\'rgba(59,130,246,0.15)\'"'
        + ' onmouseout="this.style.background=\'rgba(59,130,246,0.08)\'">'
        + '<span style="font-size:1.2em;">📖</span>'
        + '<span>RA Achievement Guide</span>'
        + '<span style="margin-left:auto;font-size:0.85em;opacity:0.7;">↗</span>'
        + '</a>';

      // Insert before ROM section in sidebar
      if (divRoms && divRoms.parentNode) {
        divRoms.parentNode.insertBefore(guideDiv, divRoms);
      } else if (injectionTarget) {
        injectionTarget.appendChild(guideDiv);
      }
    })();

    // =========================================
    //     Achievement Translation Feature
    // =========================================
    function translateText(text, targetLang) {
      return translateWithRateLimit(text, targetLang);
    }

    function injectTranslateButtons() {
      // Inject CSS once
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

      // Find all achievement list items
      var items = document.querySelectorAll("li.game-set-item");
      items.forEach(function (li) {
        // Skip if already has a translate button
        if (li.querySelector(".enhanced-translate-btn")) return;

        // Find the description paragraph — it's the <p class="leading-4"> inside the title/description area
        var descPs = li.querySelectorAll("p.leading-4");
        var descP = null;
        for (var i = 0; i < descPs.length; i++) {
          // The description <p> is the one that doesn't contain progress bar info
          // It's typically the first p.leading-4 that has direct text content
          var txt = descPs[i].textContent.trim();
          if (txt && !txt.match(/^\d+\s*(of|de)\s*\d+/)) {
            descP = descPs[i];
            break;
          }
        }
        if (!descP) return;

        // Find the title link
        var titleLink = li.querySelector("a.font-medium");

        var btn = document.createElement("button");
        btn.className = "enhanced-translate-btn";

        var originalDesc = descP.textContent;
        var originalTitle = titleLink ? titleLink.textContent : "";
        var textToCheck = (originalTitle ? originalTitle + "\n" : "") + originalDesc;

        if (textToCheck.length > 500) {
          btn.classList.add("disabled");
          btn.title = "Text exceeds 500 character limit for translation (" + textToCheck.length + " chars)";
          btn.innerHTML = '&#x1F310; Too long';
          descP.appendChild(btn);
          return;
        }

        btn.title = "Translate to " + translateLang;
        btn.innerHTML = '&#x1F310; Translate';

        var isTranslated = false;
        var translatedDesc = null;
        var translatedTitle = null;

        btn.addEventListener("click", function () {
          if (btn.classList.contains("translating")) return;

          // Toggle back to original
          if (isTranslated) {
            descP.textContent = originalDesc;
            if (titleLink) titleLink.textContent = originalTitle;
            btn.innerHTML = '&#x1F310; Translate';
            btn.classList.remove("translated");
            isTranslated = false;
            return;
          }

          // Use cached translation if available
          if (translatedDesc) {
            descP.textContent = translatedDesc;
            if (titleLink && translatedTitle) titleLink.textContent = translatedTitle;
            btn.innerHTML = '&#x1F310; Original';
            btn.classList.add("translated");
            isTranslated = true;
            return;
          }

          // Fetch translation
          btn.classList.add("translating");
          btn.innerHTML = '&#x23F3; ...';

          var textToTranslate = originalDesc;
          if (titleLink && originalTitle) {
            textToTranslate = originalTitle + "\n" + originalDesc;
          }

          translateText(textToTranslate, translateLang)
            .then(function (result) {
              var parts = result.split("\n");
              if (titleLink && originalTitle && parts.length >= 2) {
                translatedTitle = parts[0];
                translatedDesc = parts.slice(1).join("\n");
                titleLink.textContent = translatedTitle;
              } else {
                translatedDesc = result;
              }
              descP.textContent = translatedDesc;
              btn.innerHTML = '&#x1F310; Original';
              btn.classList.remove("translating");
              btn.classList.add("translated");
              isTranslated = true;
            })
            .catch(function (err) {
              log.warn("Translation failed: " + err.message);
              var isRateLimit = err.message && err.message.indexOf('RATE_LIMIT') === 0;
              btn.innerHTML = isRateLimit ? '&#x26D4; Limit' : '&#x26A0; Error';
              btn.title = isRateLimit ? err.message.replace('RATE_LIMIT: ', '') : 'Translation failed';
              btn.classList.remove("translating");
              if (!isRateLimit) {
                setTimeout(function () {
                  btn.innerHTML = '&#x1F310; Translate';
                  btn.title = 'Translate to ' + translateLang;
                }, 2000);
              }
            });
        });

        // Insert the button after the description
        descP.appendChild(btn);
      });
    }

    // Inject translate buttons after the page has rendered achievements
    // Use a small delay + MutationObserver to catch dynamically loaded achievement lists
    setTimeout(injectTranslateButtons, 1500);
    var achObserver = new MutationObserver(function () {
      injectTranslateButtons();
      if (enableRarityIndicator) injectRarityIndicators();
    });
    var mainContent = document.querySelector("main") || document.body;
    achObserver.observe(mainContent, { childList: true, subtree: true });

    // =========================================
    //     Achievement Rarity Indicator
    // =========================================
    function injectRarityIndicators() {
      // Inject rarity CSS once
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
      items.forEach(function (li) {
        if (li.querySelector(".enhanced-rarity-badge")) return;

        // Parse unlock percentage from the DOM (language-agnostic)
        // The dedicated unlock rate <p> has class "text-center text-2xs"
        // e.g. "45.25% unlock rate" (en) or "45,25% taxa de desbloqueio" (pt-BR)
        var percentage = null;

        // Primary: find the dedicated unlock rate paragraph by its text-center class
        var centerPs = li.querySelectorAll("p.text-center");
        for (var i = 0; i < centerPs.length; i++) {
          var txt = centerPs[i].textContent || '';
          var match = txt.match(/([\d,.]+)\s*%/);
          if (match) {
            percentage = parseFloat(match[1].replace(',', '.'));
            break;
          }
        }

        // Fallback: any <p> with a percentage followed by unlock-related text
        if (percentage === null) {
          var textEls = li.querySelectorAll("p");
          for (var j = 0; j < textEls.length; j++) {
            var txt2 = textEls[j].textContent || '';
            var match2 = txt2.match(/([\d,.]+)\s*%\s*(?:unlock\s*rate|taxa\s*de\s*desbloqueio)/i);
            if (match2) {
              percentage = parseFloat(match2[1].replace(',', '.'));
              break;
            }
          }
        }

        if (percentage === null || isNaN(percentage)) return;

        var tier = getRarityTier(percentage);

        // Add colored left border
        li.classList.add("enhanced-rarity-bordered");
        li.style.setProperty("--enhanced-rarity-color", tier.color);

        // Find the title area (after the title link) to inject the badge
        var titleSpan = li.querySelector("a.font-medium");
        if (!titleSpan) return;

        var badge = document.createElement("span");
        badge.className = "enhanced-rarity-badge";
        badge.style.cssText = "color:" + tier.color + ";background:" + tier.bg + ";border:1px solid " + tier.color + "30;";
        badge.title = percentage.toFixed(2) + "% unlock rate";
        badge.innerHTML = '<span class="enhanced-rarity-dot" style="background:' + tier.color + ';"></span>' + tier.label;

        // Insert after the title link's parent span
        var titleContainer = titleSpan.parentElement;
        if (titleContainer) {
          titleContainer.appendChild(badge);
        }
      });
    }

    if (enableRarityIndicator) {
      setTimeout(injectRarityIndicators, 1500);
    }
    // Stop observing after 30s to avoid performance overhead
    setTimeout(function () { achObserver.disconnect(); }, 30000);

    // =========================================
    //              Rom Search
    // =========================================
    // =========================================
    //       Hash Verification via RA API
    // =========================================
    var knownHashes = [];

    function fetchGameHashes(gId) {
      return Promise.resolve(GM_getValue("raApiKey", "")).then(function (apiKey) {
        log.info("[HashCheck] enableHashCheck=" + enableHashCheck + " apiKey=" + (apiKey ? "set (" + apiKey.length + " chars)" : "EMPTY"));
        if (!apiKey || !enableHashCheck) {
          log.warn("[HashCheck] Skipped: " + (!apiKey ? "no API key" : "hash check disabled"));
          return [];
        }
        var url = "https://retroachievements.org/API/API_GetGameHashes.php?i=" + encodeURIComponent(gId) + "&y=" + encodeURIComponent(apiKey);
        log.info("[HashCheck] Fetching hashes for game ID: " + gId);
        return gmFetch(url, 15000).then(function (resp) {
          var data = JSON.parse(resp.responseText);
          var results = (data.Results || []).map(function (h) {
            var labels = h.Labels;
            if (typeof labels === "string") labels = labels ? labels.split(",") : [];
            if (!Array.isArray(labels)) labels = [];
            return { name: (h.Name || "").toLowerCase(), md5: h.MD5, labels: labels };
          });
          log.info("[HashCheck] Found " + results.length + " known hashes");
          if (results.length > 0) {
            log.info("[HashCheck] Sample hash: " + results[0].name + " (MD5: " + results[0].md5 + ")");
          }
          return results;
        }).catch(function (err) {
          log.warn("[HashCheck] Hash fetch failed: " + err.message);
          return [];
        });
      }).catch(function (err) {
        log.warn("[HashCheck] GM_getValue failed: " + err.message);
        return [];
      });
    }

    // Normalize ROM filename: strip extension and brackets, keep region (parentheses)
    function normalizeRomName(name) {
      return name
        .toLowerCase()
        .replace(/\.(zip|7z|chd|bin|cue|iso|nds|gba|gbc|gb|nes|sfc|smc|md|gen|z64|n64|v64|a26|a78|lnx|pce|ngp|ngc|ws|wsc|min|col|rom|mx1|mx2|dsk|tap|fds)$/i, "")
        .replace(/\s*\[.*?\]/g, "")  // remove [!], [b], [h], etc.
        .replace(/\s+/g, " ")
        .trim();
    }

    // Title-only: strip extension, brackets AND region parentheses
    function titleOnlyRomName(name) {
      return normalizeRomName(name)
        .replace(/\s*\(.*?\)/g, "")
        .replace(/[^a-z0-9]/g, "");
    }

    // Extract region tags from parentheses, e.g. "(USA, Europe)" → ["usa","europe"]
    function extractRegions(name) {
      var regions = [];
      var re = /\(([^)]+)\)/g;
      var m;
      while ((m = re.exec(name.toLowerCase())) !== null) {
        m[1].split(/\s*,\s*/).forEach(function (r) {
          regions.push(r.trim());
        });
      }
      return regions;
    }

    function getHashBadge(romName) {
      if (knownHashes.length === 0) {
        log.debug("[HashBadge] No known hashes loaded, skipping badge for: " + romName);
        return "";
      }
      var normRom = normalizeRomName(romName);
      var romRegions = extractRegions(romName);

      // Level 1: exact normalized match (name + region)
      var match = knownHashes.find(function (h) {
        return normalizeRomName(h.name) === normRom;
      });

      // Level 2: same base title AND at least one region in common
      if (!match) {
        var titleRom = titleOnlyRomName(romName);
        match = knownHashes.find(function (h) {
          if (titleOnlyRomName(h.name) !== titleRom) return false;
          if (romRegions.length === 0) return true; // no region info — allow
          var hashRegions = extractRegions(h.name);
          if (hashRegions.length === 0) return true; // hash has no region — allow
          return romRegions.some(function (r) { return hashRegions.indexOf(r) !== -1; });
        });
      }

      log.debug("[HashBadge] ROM: " + romName + " | normalized: " + normRom + " | match: " + (match ? match.name : "NONE"));

      if (match) {
        var labelsArr = Array.isArray(match.labels) ? match.labels : [];
        var labelTxt = labelsArr.length > 0 ? labelsArr.join(", ") : "";
        var tooltipLines = [
          "\u2705 Compatible with RetroAchievements",
          "MD5: " + match.md5,
        ];
        if (labelTxt) tooltipLines.push("Labels: " + labelTxt);
        if (match.name) tooltipLines.push("Hash: " + match.name);
        var tooltip = escapeHtml(tooltipLines.join("\n"));

        return ' <span class="enhanced-trophy-badge" title="' + tooltip + '"'
          + ' style="display:inline-flex;align-items:center;gap:2px;font-size:0.75em;padding:1px 6px;border-radius:4px;'
          + 'background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#78350f;vertical-align:middle;margin-left:4px;'
          + 'cursor:help;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.15);transition:transform 0.15s;">'
          + '\uD83C\uDFC6 RA</span>';
      }

      return '';
    }

    if (enableRomSearch) {
      for (const prop in RAConsole) {
        if (RAConsole.hasOwnProperty(prop)) {
          if (RAConsole[prop] === consoleName) isAvailable = true;
        }
      }

      if ((isAvailable && tag === "") || (consoleName === RAConsole.ARCADE && tag !== "")) {
        // Check cache first
        getCachedRomResults(gameTitle, consoleName).then(function (cached) {
          if (cached) {
            // Use cached results
            results = cached.results;
            resultsDlcs = cached.resultsDlcs || [];
            collection = cached.collection || collection;
            log.info("[Cache] Using cached ROM results (" + results.length + " ROMs)");
            // Still need hashes for badges
            return fetchGameHashes(gameId).then(function (hashes) {
              knownHashes = hashes;
            }).catch(function () { knownHashes = []; }).then(function () {
              if (results.length > 0) {
                createDownloads();
              } else {
                createNoRomsNotification();
              }
              if (resultsDlcs.length > 0) createDlcs();
            });
          }

          // No cache — run search chain
          showLoading(divRoms, "Searching ROMs...");
        log.info("Starting ROM search for: " + gameTitle + " [" + consoleName + "]");
        var promise;

        if (enableEmuparadise && prioritizeEmuparadise) {
          collection.name = "Emuparadise";
          collection.url = "https://www.emuparadise.me/roms-isos-games.php";
          promise = searchEmuparadise();
        } else {
          promise = Promise.resolve();
        }

        var searchTimedOut = false;
        var SEARCH_TIMEOUT_MS = 30000; // 30 seconds max for entire search

        var searchChain = promise.then(() => {
          if (results.length === 0) {
            if (consoleName === RAConsole.ARCADE) {
              collection.name = "FB Neo Nightly";
              collection.url = "https://archive.org/download/2020_01_06_fbn";
              return searchArcade();
            }

            if (myrientCollectionDict[consoleName]) {
              const entry = myrientCollectionDict[consoleName];
              collection.name = entry.name;
              collection.url = entry.urls[0];
              const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
              return chainSearchMyrient(urls);
            } else {
              collection.name = "No-Intro 2016";
              collection.url = "https://archive.org/download/No-Intro-Collection_2016-01-03_Fixed";
              return searchNoIntro2016();
            }
          }
        })
        .then(() => {
          if (enableEmuparadise && results.length === 0) {
            collection.name = "Emuparadise";
            collection.url = "https://www.emuparadise.me/roms-isos-games.php";
            return searchEmuparadise();
          }
        })
        .then(() => {
          if (enableRomsFun && results.length === 0) {
            collection.name = "RomsFun";
            collection.url = "https://romsfun.com/roms/";
            return searchRomsFun();
          }
        })
        .then(() => {
          if (consoleName === RAConsole.PSP)
            return searchArchiveDlc("https://archive.org/download/PSP-DLC/%5BNo-Intro%5D%20PSP%20DLC/");
        })
        .then(() => {
          // Fetch hashes before rendering so we can badge matching ROMs
          return fetchGameHashes(gameId).then(function (hashes) {
            knownHashes = hashes;
            log.info("[HashCheck] knownHashes loaded: " + knownHashes.length + " hashes for game " + gameId);
          }).catch(function (err) {
            log.warn("[HashCheck] fetchGameHashes promise failed: " + err.message);
            knownHashes = [];
          });
        });

        var timeoutPromise = new Promise(function (_, reject) {
          setTimeout(function () {
            searchTimedOut = true;
            reject(new Error("ROM search timed out after " + (SEARCH_TIMEOUT_MS / 1000) + "s"));
          }, SEARCH_TIMEOUT_MS);
        });

        Promise.race([searchChain, timeoutPromise])
        .then(() => {
          hideLoading();
          // Cache results for next time
          setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collection.name, collection.url);
          if (results.length > 0) {
            log.info("Found " + results.length + " ROM(s)");
            createDownloads();
          } else {
            log.info("No ROMs found");
            createNoRomsNotification();
          }
          if (resultsDlcs.length > 0) createDlcs();
        })
        .catch(function (err) {
          hideLoading();
          log.warn("ROM search failed: " + err.message);
          if (results.length > 0) {
            setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collection.name, collection.url);
            createDownloads();
          } else {
            createNoRomsNotification();
          }
        });
        }); // end getCachedRomResults.then
      } else {
        log.debug("Searching roms for this system not supported: " + consoleName);
      }
    }

    // =========================================
    //         Create Content Functions
    // =========================================
    function createNoRomsNotification() {
      const searchQuery = encodeURIComponent(gameTitle + " " + consoleName);
      const archiveUrl = "https://archive.org/search?query=" + searchQuery;
      const myrientUrl = "https://myrient.erista.me/files/" + encodeURIComponent(consoleName);

      const h3 = document.createElement("h3");
      h3.textContent = "ROMs";
      h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
      divRoms.appendChild(h3);

      const msgDiv = document.createElement("div");
      msgDiv.style.cssText = "padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);";
      msgDiv.innerHTML =
        '<p style="margin:0 0 8px;color:#a3a3a3;font-size:0.9em;">No ROMs found for <strong style="color:#e5e5e5;">' + escapeHtml(gameTitle) + '</strong>.</p>' +
        '<p style="margin:0 0 4px;color:#a3a3a3;font-size:0.85em;">Try searching manually:</p>' +
        '<div style="display:flex;flex-direction:column;gap:4px;">' +
          '<a href="' + archiveUrl + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; Archive.org</a>' +
          '<a href="' + myrientUrl + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; Myrient</a>' +
          '<a href="https://romsfun.com/?s=' + searchQuery + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; RomsFun</a>' +
        '</div>';
      divRoms.appendChild(msgDiv);
      makeCollapsible(divRoms, 'roms');
    }

    function createDownloads() {
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
        var badge = getHashBadge(results[i].name);
        wrapper.innerHTML = '<a class="dl-link" href="' + encodeURI(dlLink) + '" target="_blank" rel="noopener">' + escapeHtml(removeExt(results[i].name)) + '</a>' + badge;
        divRoms.appendChild(wrapper);
      }

      if (collection.url !== "") {
        const fromDiv = document.createElement("div");
        fromDiv.style.marginTop = "1em";
        fromDiv.innerHTML = `From <a href="${encodeURI(collection.url)}" style="color: #5b9bd5;">${escapeHtml(collection.name)}</a>`;
        divRoms.appendChild(fromDiv);
      }
      makeCollapsible(divRoms, 'roms');
    }

    function createDlcs() {
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

    function createSpeedrun() {
      const h3 = document.createElement("h3");
      h3.textContent = "World Records";
      h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
      divSpeedruncom.appendChild(h3);

      if (srRuns.length > 0) {
        srRuns.forEach((runsData) => {
          const div = document.createElement("div");
          div.innerHTML = `<a href="${encodeURI(runsData.link)}" style="color: #5b9bd5;">${escapeHtml(runsData.category)}:</a> ${escapeHtml(runsData.time)} by ${escapeHtml(runsData.runner)}`;
          divSpeedruncom.appendChild(div);
        });
      } else {
        const div = document.createElement("div");
        div.textContent = "Couldn't find this game on Speedrun.com";
        divSpeedruncom.appendChild(div);
      }
      makeCollapsible(divSpeedruncom, 'speedrun');
    }

    function createVideo() {
      if (srVideoUrl === "") return;
      // Prevent duplicate video iframes
      if (document.querySelector("iframe.enhanced-video")) return;
      log.debug("Creating video with URL: " + srVideoUrl);

      // Insert after the screenshots container in the main article
      const gameShow = document.querySelector('[data-testid="game-show"]');
      if (gameShow && gameShow.firstElementChild) {
        const iframe = document.createElement("iframe");
        iframe.className = "enhanced-video";
        iframe.style.cssText = "display: block; width: 100%; height: 315px; padding-bottom: 1em; border: none; border-radius: 0.5rem;";
        iframe.src = srVideoUrl;
        iframe.allowFullscreen = true;
        iframe.setAttribute("autoplay", "false");
        // Insert after the screenshots section
        const screenshotsDiv = gameShow.firstElementChild;
        screenshotsDiv.after(iframe);
      }
    }

    // =========================================
    //         Speedrun.com Functions
    // =========================================
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
        [RAConsole.AMSTRADCPC]: SRConsole.AMSTRADCPC,
      };
      return map[cName] || "";
    }

    function getSpeedruns(gameName) {
      var consoleId = getSrConsoleId(consoleName);
      var srSearchUrl = encodeURI(srRoot + "games?name=" + gameName + "&platform=" + consoleId);

      return gmFetch(srSearchUrl)
      .then(function (gamesResponse) {
        var gamesData = JSON.parse(gamesResponse.responseText).data;
        if (gamesData.length > 0) {
          srGamelink = gamesData[0].weblink;
          srGameId = gamesData[0].id;
          return gamesData[0].links[3].uri;
        } else {
          throw new Error("Couldn't find this game on Speedrun.com (" + srSearchUrl + ").");
        }
      })
      .then(function (link) {
        return gmFetch(link).then(function (response) {
          return JSON.parse(response.responseText).data;
        });
      })
      .then(function (categories) {
        return Promise.all(categories.map(function (category) {
          return gmFetch(srRoot + "runs?game=" + srGameId + "&category=" + category.id + "&status=verified")
          .then(function (runsResponse) {
            var runsData = JSON.parse(runsResponse.responseText).data[0];
            if (runsData != undefined && runsData.status.status !== "rejected") {
              if (srVideoUrl === "" && runsData.videos)
                srVideoUrl = toEmbedUrl(runsData.videos.links[0].uri);
            }
            return runsData;
          })
          .then(function (runsData) {
            if (runsData == undefined) return false;
            var isGuest = runsData.players[0].rel === "guest";

            return gmFetch(srRoot + "users/" + runsData.players[0].id)
            .then(function (userRes) {
              var userData = JSON.parse(userRes.responseText).data;
              srRuns.push({
                category: category.name,
                time: parseIso8601(runsData.times.primary),
                runner: isGuest ? runsData.players[0].name : userData.names.international,
                link: runsData.videos ? runsData.videos.links[0].uri : ""
              });
              return true;
            }).catch(function (err) {
              log.warn("Failed to fetch user data: " + err.message);
              srRuns.push({
                category: category.name,
                time: parseIso8601(runsData.times.primary),
                runner: isGuest ? runsData.players[0].name : "Unknown",
                link: runsData.videos ? runsData.videos.links[0].uri : ""
              });
              return true;
            });
          })
          .catch(function (err) {
            log.warn("Failed to fetch runs for category: " + err.message);
            return false;
          });
        }))
        .then(function () {
          if (enableSpeedrun) createSpeedrun();
          if (enableGameplayVideo) createVideo();
        });
      })
      .catch(function (err) {
        log.error("Speedrun fetch error: " + err.message);
        if (enableSpeedrun) {
          var div = document.createElement("div");
          div.textContent = "Couldn't find this game on Speedrun.com";
          divSpeedruncom.appendChild(div);
        }
      });
    }

    // =========================================
    //       Arcade Search Function
    // =========================================
    function searchArcade() {
      var mainDir = "//archive.org/download/2020_01_06_fbn/roms/arcade.zip/arcade%2F";
      var datDir = "https://raw.githubusercontent.com/libretro/FBNeo/master/dats/FinalBurn%20Neo%20(ClrMame%20Pro%20XML%2C%20Arcade%20only).dat";

      return gmFetch(datDir).then(function (response) {
        var xmlDoc = parseXml(response.responseText);

        xmlDoc.querySelectorAll("game").forEach(function (el) {
          var descEl = el.querySelector("description");
          var name = descEl ? descEl.textContent : "";
          if (tag === "" && name.toLowerCase().includes("hack")) return;
          if (tag === "Hack" && !name.toLowerCase().includes("hack")) return;
          if (refinedCompare(name, gameTitle)) {
            results.push({
              name: name,
              url: mainDir + el.getAttribute("name") + ".zip"
            });
          }
        });

        if (results.length === 0) {
          xmlDoc.querySelectorAll("game").forEach(function (el) {
            var descEl = el.querySelector("description");
            var name = descEl ? descEl.textContent : "";
            if (tag === "" && name.toLowerCase().includes("hack")) return;
            if (tag === "Hack" && !name.toLowerCase().includes("hack")) return;
            if (compare(name, gameTitle)) {
              results.push({
                name: name,
                url: mainDir + el.getAttribute("name") + ".zip"
              });
            }
          });
        }
        return true;
      }).catch(function (err) {
        log.warn("Arcade search failed: " + err.message);
        return true;
      });
    }

    // =========================================
    //          Myrient Search Function
    // =========================================
    function chainSearchMyrient(urls) {
      let promise = searchMyrient(urls[0]);
      for (let i = 1; i < urls.length; i++) {
        promise = promise.then(() => {
          if (results.length === 0) {
            return searchMyrient(urls[i]);
          }
        });
      }
      return promise;
    }

    function searchMyrient(mainDir) {
      return gmFetch(mainDir).then(function (response) {
        var doc = parseHtml(response.responseText);
        var cells = doc.querySelectorAll("td > :first-child");

        cells.forEach(function (el) {
          var textContent = el.textContent;
          var match = /([^\/]+)\/?$/g.exec(textContent);
          if (!match) return;
          var title = match[1];

          if (refinedCompare(title, gameTitle)) {
            var fullUrl = mainDir.endsWith("/") ?
              mainDir + el.getAttribute("href") : mainDir + "/" + el.getAttribute("href");
            results.push({ name: title, url: fullUrl });
          }
        });

        if (results.length === 0) {
          cells.forEach(function (el) {
            var textContent = el.textContent;
            var match = /([^\/]+)\/?$/g.exec(textContent);
            if (!match) return;
            var title = match[1];

            if (compare(title, gameTitle)) {
              var fullUrl = mainDir.endsWith("/") ?
                mainDir + el.getAttribute("href") : mainDir + "/" + el.getAttribute("href");
              results.push({ name: title, url: fullUrl });
            }
          });
        }
        return true;
      }).catch(function (err) {
        log.warn("Myrient search failed: " + err.message);
        return true;
      });
    }

    // =========================================
    //      No-Intro 2016 Search Function
    // =========================================
    function searchNoIntro2016() {
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
        [RAConsole.VECTREX]: "GCE - Vectrex",
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
        doc.querySelectorAll("td > :first-child").forEach(function (el) {
          if (refinedCompare(el.textContent, gameTitle)) {
            results.push({ name: el.textContent, url: el.getAttribute("href") });
          }
        });
        if (results.length === 0) {
          doc.querySelectorAll("td > :first-child").forEach(function (el) {
            if (compare(el.textContent, gameTitle)) {
              results.push({ name: el.textContent, url: el.getAttribute("href") });
            }
          });
        }
      }

      return gmFetch(mainDir + consoleDir).then(function (response) {
        parseNoIntroResults(response.responseText);
        return true;
      }).catch(function (err) {
        log.warn("NoIntro2016 primary search failed: " + err.message);
        return true;
      })
      .then(function () {
        if (secondaryConsoleDir !== ".zip/") {
          return gmFetch(mainDir + secondaryConsoleDir).then(function (response) {
            parseNoIntroResults(response.responseText);
            return true;
          }).catch(function (err) {
            log.warn("NoIntro2016 secondary search failed: " + err.message);
            return true;
          });
        }
      });
    }

    // =========================================
    //      Archive.org Generic Search
    // =========================================
    function searchArchive(mainDir) {
      return gmFetch(mainDir).then(function (response) {
        var doc = parseHtml(response.responseText);
        var cells = doc.querySelectorAll("td > :first-child");

        cells.forEach(function (el) {
          var match = /([^\/]+)\/?$/g.exec(el.textContent);
          if (!match) return;
          var title = match[1];
          var href = el.getAttribute("href") || "";
          var fullUrl = href.startsWith("//archive.org/download/") ?
            href : mainDir + "/" + href;

          if (refinedCompare(title, gameTitle)) {
            results.push({ name: title, url: fullUrl });
          }
        });

        if (results.length === 0) {
          cells.forEach(function (el) {
            var match = /([^\/]+)\/?$/g.exec(el.textContent);
            if (!match) return;
            var title = match[1];
            var href = el.getAttribute("href") || "";
            var fullUrl = href.startsWith("//archive.org/download/") ?
              href : mainDir + "/" + href;

            if (compare(title, gameTitle)) {
              results.push({ name: title, url: fullUrl });
            }
          });
        }
        return true;
      }).catch(function (err) {
        log.warn("Archive search failed: " + err.message);
        return true;
      });
    }

    // =========================================
    //       Archive.org DLC Search
    // =========================================
    function searchArchiveDlc(mainDir) {
      return gmFetch(mainDir).then(function (response) {
        var doc = parseHtml(response.responseText);
        var cells = doc.querySelectorAll("td > :first-child");

        cells.forEach(function (el) {
          var match = /([^\/]+)\/?$/g.exec(el.textContent);
          if (!match) return;
          var title = match[1];
          var href = el.getAttribute("href") || "";
          var fullUrl = href.startsWith("//archive.org/download/") ?
            href : mainDir + "/" + href;

          if (refinedCompare(title, gameTitle)) {
            resultsDlcs.push({ name: title, url: fullUrl });
          }
        });

        if (resultsDlcs.length === 0) {
          cells.forEach(function (el) {
            var match = /([^\/]+)\/?$/g.exec(el.textContent);
            if (!match) return;
            var title = match[1];
            var href = el.getAttribute("href") || "";
            var fullUrl = href.startsWith("//archive.org/download/") ?
              href : mainDir + "/" + href;

            if (compare(title, gameTitle)) {
              resultsDlcs.push({ name: title, url: fullUrl });
            }
          });
        }
        return true;
      }).catch(function (err) {
        log.warn("Archive DLC search failed: " + err.message);
        return true;
      });
    }

    // =========================================
    //       Emuparadise Search Function
    // =========================================
    function searchEmuparadise() {
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
        [RAConsole.P3DO]: "Panasonic_3DO_(3DO_Interactive_Multiplayer)_ISOs/List-All-Titles/20",
      };

      var consoleUrl = consoleUrlMap[consoleName];
      if (!consoleUrl) return Promise.resolve();

      return gmFetch(mainDir + "/" + consoleUrl).then(function (response) {
        var doc = parseHtml(response.responseText);
        var items = doc.querySelectorAll(".index.gamelist");

        function buildDownloadPageUrl(href) {
          // href like /Console_ROMs/Game_Name/151200 — link to the download page
          var clean = href.replace(/\/+$/, '');
          return mainDir + clean + '-download';
        }

        items.forEach(function (el) {
          var href = el.getAttribute("href") || "";
          if (!href) return;
          if (refinedCompare(el.textContent, gameTitle)) {
            results.push({
              name: el.textContent,
              url: buildDownloadPageUrl(href)
            });
          }
        });

        if (results.length === 0) {
          items.forEach(function (el) {
            var href = el.getAttribute("href") || "";
            if (!href) return;
            if (compare(el.textContent, gameTitle)) {
              results.push({
                name: el.textContent,
                url: buildDownloadPageUrl(href)
              });
            }
          });
        }
        return true;
      }).catch(function (err) {
        log.warn("Emuparadise search failed: " + err.message);
        return true;
      });
    }

    // =========================================
    //       RomsFun Search Function
    // =========================================
    const romsfunConsoleSlug = {
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
      [RAConsole.POKEMINI]: "pokemon-mini",
    };

    function searchRomsFun() {
      var searchUrl = "https://romsfun.com/wp-json/wp/v2/rom?search=" + encodeURIComponent(gameTitle) + "&per_page=10";
      var expectedSlug = romsfunConsoleSlug[consoleName] || "";

      return gmFetch(searchUrl, 15000).then(function (resp) {
        var data = JSON.parse(resp.responseText);
        if (!Array.isArray(data) || data.length === 0) return;

        // First pass: refined match with console filter
        data.forEach(function (rom) {
          var romTitle = (rom.title && rom.title.rendered) || "";
          var romLink = rom.link || "";
          var romSlug = rom.slug || "";
          var romId = rom.id;

          // Filter by console slug in the URL if available
          if (expectedSlug && !romLink.includes("/roms/" + expectedSlug + "/")) return;

          if (refinedCompare(romTitle, gameTitle)) {
            results.push({
              name: romTitle + " (RomsFun)",
              url: "https://romsfun.com/download/" + romSlug + "-" + romId
            });
          }
        });

        // Second pass: loose match if nothing found
        if (results.length === 0) {
          data.forEach(function (rom) {
            var romTitle = (rom.title && rom.title.rendered) || "";
            var romLink = rom.link || "";
            var romSlug = rom.slug || "";
            var romId = rom.id;

            if (expectedSlug && !romLink.includes("/roms/" + expectedSlug + "/")) return;

            if (compare(romTitle, gameTitle)) {
              results.push({
                name: romTitle + " (RomsFun)",
                url: "https://romsfun.com/download/" + romSlug + "-" + romId
              });
            }
          });
        }
        return true;
      }).catch(function (err) {
        log.warn("RomsFun search failed: " + err.message);
        return true;
      });
    }

    // =========================================
    //           Utility Functions
    // =========================================
    function refinedCompare(a, b) {
      return simplify_title(a) === simplify_title(b);
    }

    function compare(a, b) {
      return simplify_title(a).includes(simplify_title(b));
    }

    function simplify_title(str) {
      if (consoleName === RAConsole.DREAMCAST)
        str = str.replace(/v[0-9].[0-9]{3}/gs, "");

      return str
        .replace(/\.(zip|7z)$/, "")
        .replace(/^The /g, '')
        .replace(", The", '')
        .replace(/'s/gs, '')
        .replace('&', 'and')
        .replace(/:|-| |\.|!|\?|\/|'/gs, '')
        .replace(/(\r\n|\n|\r)/gs, "")
        .split('|')[0]
        .replace(',', "")
        .replace(/\(.+\)/gs, "")
        .replace(/\[.+\]/gs, "")
        .toLowerCase();
    }

    function removeExt(str) {
      return str.replace(/\.(zip|7z|chd)$/, "");
    }

    function parseIso8601(time) {
      var parsed = "";
      let regex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;
      let groups = regex.exec(time);
      if (groups[6] != undefined) parsed += groups[6] + "h ";
      if (groups[7] != undefined) parsed += groups[7] + "m ";
      if (groups[8] != undefined) parsed += groups[8] + "s ";
      return parsed;
    }

    function toEmbedUrl(url) {
      if (url.includes("twitch") || url.includes("youtu")) {
        var regexYoutube = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)?([^\s&]+)/;
        var regexTwitch = /(?:https?:\/{2})?www\.twitch\.tv\/(?:[\S]+\/)?([\]?)?\/([\d]+)/;
        if (url.match(regexYoutube) != undefined) {
          return "https://www.youtube.com/embed/" + url.match(regexYoutube)[1];
        } else if (url.match(regexTwitch) != undefined) {
          return "https://player.twitch.tv/?video=" + url.match(regexTwitch)[2] + "&parent=retroachievements.org&autoplay=false";
        }
      }
      return "";
    }
  }
  } // end init()

  // =========================================
  //   User Profile Pagination (standalone)
  // =========================================
  // Runs outside init() to also work on legacy Blade pages
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

    // Wait for the page to render
    await new Promise(function (resolve) {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve);
    });

    // Small extra delay for Blade components to render
    await new Promise(function (r) { setTimeout(r, 500); });

    // Find the "Last X Games Played" heading
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

    // The structure is: <div class="my-8"> > <div> > <h2> + <div class="flex flex-col gap-y-1">
    // We need the component root (h2's parent) and the game list inside it
    var componentRoot = recentH2.parentElement;
    var outerWrapper = componentRoot ? componentRoot.parentElement : null;
    var existingList = componentRoot ? componentRoot.querySelector("div.flex.flex-col") : null;

    if (!existingList) {
      log.debug("User pagination: could not find game list container");
      return;
    }

    // Already injected?
    if (document.getElementById("enhanced-pagination")) return;

    // Remove existing "more" link if present (it's a sibling of componentRoot inside outerWrapper)
    if (outerWrapper) {
      var moreLink = outerWrapper.querySelector('a[href*="?g="]');
      if (moreLink) {
        var moreLinkParent = moreLink.closest("div.text-right") || moreLink.parentElement;
        if (moreLinkParent && moreLinkParent !== outerWrapper) moreLinkParent.remove();
        else moreLink.remove();
      }
    }

    // Inject pagination styles
    if (!document.getElementById("enhanced-pagination-style")) {
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
        .enhanced-console-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
        }
        .enhanced-console-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .enhanced-console-name {
          font-size: 0.78rem;
          color: #a3a3a3;
          width: 50px;
          flex-shrink: 0;
        }
        .enhanced-console-bar-bg {
          flex: 1;
          height: 14px;
          border-radius: 4px;
          background: rgba(255,255,255,0.04);
          position: relative;
          overflow: hidden;
        }
        .enhanced-console-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 0.6s ease;
          min-width: 2px;
        }
        .enhanced-console-bar-label {
          position: absolute;
          right: 6px;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          font-size: 0.65rem;
          color: #d4d4d8;
          text-shadow: 0 1px 2px rgba(0,0,0,0.6);
        }
        .enhanced-console-count {
          font-size: 0.72rem;
          color: #737373;
          width: 32px;
          text-align: right;
          flex-shrink: 0;
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

    function renderSkeletonCards(container, count) {
      container.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var card = document.createElement('div');
        card.className = 'enhanced-skeleton-card';
        card.style.animationDelay = (i * 0.1) + 's';
        card.innerHTML =
          '<div class="enhanced-skeleton-img"></div>'
          + '<div class="enhanced-skeleton-content">'
            + '<div class="enhanced-skeleton-line w-60"></div>'
            + '<div class="enhanced-skeleton-line w-40"></div>'
            + '<div class="enhanced-skeleton-line w-30"></div>'
            + '<div class="enhanced-skeleton-bar"></div>'
          + '</div>';
        container.appendChild(card);
      }
    }

    var ITEMS_PER_PAGE = 5;
    var currentOffset = 0;
    var totalLoaded = -1; // -1 = unknown
    var highestKnownPage = 1; // track the furthest page we've confirmed exists
    var lastKnownHasMore = true;

    // Create games list container
    var gamesList = document.createElement("div");
    gamesList.className = "enhanced-games-list";

    // Create pagination wrapper (always below the list)
    var paginationDiv = document.createElement("div");
    paginationDiv.id = "enhanced-pagination";

    // Insert inside componentRoot so they inherit full width
    componentRoot.appendChild(gamesList);
    componentRoot.appendChild(paginationDiv);

    var originalHeadingText = recentH2.textContent.trim();

    // Items per page selector next to the heading
    var perPageWrapper = document.createElement('div');
    perPageWrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:12px;vertical-align:middle;';
    var perPageLabel = document.createElement('label');
    perPageLabel.textContent = 'Show:';
    perPageLabel.style.cssText = 'font-size:0.75rem;color:#a3a3a3;';
    var perPageSelect = document.createElement('select');
    perPageSelect.style.cssText = 'background:#18181b;color:#e4e4e7;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.75rem;cursor:pointer;';
    [5, 10, 15, 20, 30, 50].forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      if (n === ITEMS_PER_PAGE) opt.selected = true;
      perPageSelect.appendChild(opt);
    });
    perPageSelect.addEventListener('change', function () {
      ITEMS_PER_PAGE = parseInt(perPageSelect.value, 10);
      highestKnownPage = 1;
      lastKnownHasMore = true;
      achievementCache = {};
      doLoadPage(0);
    });
    perPageWrapper.appendChild(perPageLabel);
    perPageWrapper.appendChild(perPageSelect);
    // Wrap heading + combo in their own flex row, don't touch componentRoot layout
    var headingRow = document.createElement('div');
    headingRow.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:0;';
    recentH2.parentNode.insertBefore(headingRow, recentH2);
    headingRow.appendChild(recentH2);
    headingRow.appendChild(perPageWrapper);

    // =========================================
    //   Player Insights Dashboard
    // =========================================
    var dashboardDiv = document.createElement('div');
    dashboardDiv.className = 'enhanced-dashboard';
    componentRoot.insertBefore(dashboardDiv, headingRow);

    // Dashboard title
    var dashTitle = document.createElement('div');
    dashTitle.className = 'enhanced-dashboard-title';
    dashTitle.innerHTML = '📊 Player Insights';
    dashboardDiv.appendChild(dashTitle);

    // Activity Timeline section (above other modules)
    var timelineSection = document.createElement('div');
    timelineSection.className = 'enhanced-dashboard-section';
    timelineSection.innerHTML =
      '<div class="enhanced-dashboard-section-title">📅 Activity (Last 365 Days)<span class="enhanced-timeline-total" id="enhanced-timeline-total"></span></div>'
      + '<div class="enhanced-timeline-content">'
        + '<div class="enhanced-dashboard-skeleton" style="height:32px;"></div>'
      + '</div>';
    dashboardDiv.appendChild(timelineSection);

    // Stats row (skeleton while loading)
    var statsRow = document.createElement('div');
    statsRow.className = 'enhanced-stats-row';
    statsRow.innerHTML =
      '<div class="enhanced-dashboard-skeleton" style="height:60px;"></div>'
      + '<div class="enhanced-dashboard-skeleton" style="height:60px;animation-delay:0.1s;"></div>'
      + '<div class="enhanced-dashboard-skeleton" style="height:60px;animation-delay:0.2s;"></div>'
      + '<div class="enhanced-dashboard-skeleton" style="height:60px;animation-delay:0.3s;"></div>';
    dashboardDiv.appendChild(statsRow);

    // Almost There section
    var almostSection = document.createElement('div');
    almostSection.className = 'enhanced-dashboard-section';
    almostSection.innerHTML =
      '<div class="enhanced-dashboard-section-title">🎯 Almost There</div>'
      + '<div class="enhanced-almost-list">'
        + '<div class="enhanced-dashboard-skeleton" style="height:48px;margin-bottom:6px;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:48px;margin-bottom:6px;animation-delay:0.1s;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:48px;animation-delay:0.2s;"></div>'
      + '</div>';
    dashboardDiv.appendChild(almostSection);

    // Console Breakdown section
    var consoleSection = document.createElement('div');
    consoleSection.className = 'enhanced-dashboard-section';
    consoleSection.innerHTML =
      '<div class="enhanced-dashboard-section-title">🎮 Console Breakdown</div>'
      + '<div class="enhanced-console-list">'
        + '<div class="enhanced-dashboard-skeleton" style="height:22px;margin-bottom:6px;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:22px;margin-bottom:6px;animation-delay:0.1s;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:22px;margin-bottom:6px;animation-delay:0.2s;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:22px;animation-delay:0.3s;"></div>'
      + '</div>';
    dashboardDiv.appendChild(consoleSection);

    // Streak Tracker section
    var streakSection = document.createElement('div');
    streakSection.className = 'enhanced-dashboard-section';
    streakSection.innerHTML =
      '<div class="enhanced-dashboard-section-title">🔥 Streak Tracker</div>'
      + '<div class="enhanced-streak-content">'
        + '<div class="enhanced-dashboard-skeleton" style="height:48px;"></div>'
      + '</div>';
    dashboardDiv.appendChild(streakSection);

    // Rarest Achievements section
    var rarestSection = document.createElement('div');
    rarestSection.className = 'enhanced-dashboard-section';
    rarestSection.innerHTML =
      '<div class="enhanced-dashboard-section-title">💎 Rarest Achievements</div>'
      + '<div class="enhanced-rare-list">'
        + '<div class="enhanced-dashboard-skeleton" style="height:42px;margin-bottom:6px;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:42px;margin-bottom:6px;animation-delay:0.1s;"></div>'
        + '<div class="enhanced-dashboard-skeleton" style="height:42px;animation-delay:0.2s;"></div>'
      + '</div>';
    dashboardDiv.appendChild(rarestSection);

    // --- Render functions ---
    function renderStatsCards(data) {
      var totalGames = data.totalGames || 0;
      var mastered = data.mastered || 0;
      var completionPct = totalGames > 0 ? Math.round((mastered / totalGames) * 100) : 0;
      var points = data.points || 0;
      var rank = data.rank || '—';

      statsRow.innerHTML =
        '<div class="enhanced-stat-card">'
          + '<div class="enhanced-stat-value">' + totalGames + '</div>'
          + '<div class="enhanced-stat-label">Games Played</div>'
        + '</div>'
        + '<div class="enhanced-stat-card">'
          + '<div class="enhanced-stat-value" style="color:#fbbf24;">' + mastered + '</div>'
          + '<div class="enhanced-stat-label">Mastered</div>'
        + '</div>'
        + '<div class="enhanced-stat-card">'
          + '<div class="enhanced-stat-value" style="color:#3b82f6;">' + completionPct + '%</div>'
          + '<div class="enhanced-stat-label">Mastery Rate</div>'
        + '</div>'
        + '<div class="enhanced-stat-card">'
          + '<div class="enhanced-stat-value" style="color:#a78bfa;">' + points.toLocaleString() + '</div>'
          + '<div class="enhanced-stat-label">Points (Rank ' + escapeHtml(String(rank)) + ')</div>'
        + '</div>';
    }

    function renderAlmostThere(games) {
      var list = almostSection.querySelector('.enhanced-almost-list');
      if (!games || games.length === 0) {
        list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No games close to mastery found.</div>';
        return;
      }
      list.innerHTML = '';
      games.forEach(function (g) {
        var pct = g.total > 0 ? Math.round((g.earned / g.total) * 100) : 0;
        var remaining = g.total - g.earned;
        var imgUrl = 'https://media.retroachievements.org' + g.imageIcon;

        var item = document.createElement('div');
        item.className = 'enhanced-almost-item';
        item.innerHTML =
          '<img class="enhanced-almost-img" src="' + escapeHtml(imgUrl) + '" alt="" loading="lazy">'
          + '<div class="enhanced-almost-info">'
            + '<a class="enhanced-almost-name" href="/game/' + g.gameId + '" title="' + escapeHtml(g.title) + '">' + escapeHtml(g.title) + '</a>'
            + '<div class="enhanced-almost-meta">' + remaining + ' achievement' + (remaining !== 1 ? 's' : '') + ' remaining (' + pct + '%)</div>'
            + '<div class="enhanced-almost-bar-bg"><div class="enhanced-almost-bar-fill" style="width:' + pct + '%;"></div></div>'
          + '</div>';
        list.appendChild(item);
      });
    }

    function renderConsoleBreakdown(consoles) {
      var list = consoleSection.querySelector('.enhanced-console-list');
      if (!consoles || consoles.length === 0) {
        list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No console data available.</div>';
        return;
      }
      list.innerHTML = '';
      var maxCount = consoles[0].count;

      consoles.forEach(function (c) {
        var barPct = maxCount > 0 ? Math.round((c.count / maxCount) * 100) : 0;

        var row = document.createElement('div');
        row.className = 'enhanced-console-row';
        row.innerHTML =
          '<img class="enhanced-console-icon" src="' + escapeHtml(c.iconUrl) + '" alt="' + escapeHtml(c.shortName) + '" title="' + escapeHtml(c.consoleName) + '" loading="lazy">'
          + '<div class="enhanced-console-name">' + escapeHtml(c.shortName) + '</div>'
          + '<div class="enhanced-console-bar-bg">'
            + '<div class="enhanced-console-bar-fill" style="width:' + barPct + '%;"></div>'
            + '<div class="enhanced-console-bar-label">' + c.count + ' game' + (c.count !== 1 ? 's' : '') + '</div>'
          + '</div>';
        list.appendChild(row);
      });
    }

    function renderStreakTracker(achievements) {
      var content = streakSection.querySelector('.enhanced-streak-content');
      if (!achievements || achievements.length === 0) {
        content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No recent achievements found.</div>';
        return;
      }

      // Group achievements by date (YYYY-MM-DD)
      var daySet = {};
      achievements.forEach(function (a) {
        if (!a.Date) return;
        var day = a.Date.substring(0, 10); // "YYYY-MM-DD"
        daySet[day] = (daySet[day] || 0) + 1;
      });

      // Calculate current streak (consecutive days ending today or yesterday)
      var today = new Date();
      var streak = 0;
      var bestStreak = 0;
      var tempStreak = 0;

      // Get sorted unique days
      var days = Object.keys(daySet).sort().reverse();
      if (days.length === 0) {
        content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No activity data available.</div>';
        return;
      }

      // Check from today backwards
      var checkDate = new Date(today);
      checkDate.setHours(0, 0, 0, 0);
      var todayStr = checkDate.toISOString().substring(0, 10);

      // If no activity today, check if yesterday had activity (streak might still be alive)
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

      // Calculate best streak in the data
      var sortedDays = Object.keys(daySet).sort();
      tempStreak = 1;
      bestStreak = 1;
      for (var i = 1; i < sortedDays.length; i++) {
        var prev = new Date(sortedDays[i - 1] + 'T00:00:00');
        var curr = new Date(sortedDays[i] + 'T00:00:00');
        var diff = (curr - prev) / (1000 * 60 * 60 * 24);
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

      content.innerHTML =
        '<div class="enhanced-streak-row">'
          + '<div class="enhanced-streak-big">' + streak + '</div>'
          + '<div>'
            + '<div class="enhanced-streak-info">' + (streak === 1 ? 'day streak' : 'days streak') + (streak > 0 ? ' 🔥' : '') + '</div>'
            + '<div class="enhanced-streak-detail">Best: ' + bestStreak + ' days · ' + activeDays + ' active days · ' + totalAch + ' achievements (365d)</div>'
          + '</div>'
        + '</div>';
    }

    function renderRarestAchievements(achievements) {
      var list = rarestSection.querySelector('.enhanced-rare-list');
      if (!achievements || achievements.length === 0) {
        list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No achievement data available.</div>';
        return;
      }

      // Sort by TrueRatio descending (higher TrueRatio = rarer)
      var sorted = achievements.slice().filter(function (a) {
        return a.TrueRatio && parseInt(a.TrueRatio, 10) > 0;
      });
      sorted.sort(function (a, b) {
        return (parseInt(b.TrueRatio, 10) || 0) - (parseInt(a.TrueRatio, 10) || 0);
      });
      // Deduplicate by AchievementID (keep first = highest ratio)
      var seen = {};
      sorted = sorted.filter(function (a) {
        if (seen[a.AchievementID]) return false;
        seen[a.AchievementID] = true;
        return true;
      });
      sorted = sorted.slice(0, 5);

      if (sorted.length === 0) {
        list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No rarity data available.</div>';
        return;
      }

      list.innerHTML = '';
      sorted.forEach(function (a) {
        var badgeUrl = a.BadgeURL || '';
        if (badgeUrl && !badgeUrl.startsWith('http')) {
          badgeUrl = 'https://media.retroachievements.org' + badgeUrl;
        }
        var trueRatio = parseInt(a.TrueRatio, 10) || 0;
        var points = parseInt(a.Points, 10) || 0;
        var ratio = trueRatio > 0 && points > 0 ? (trueRatio / points).toFixed(1) : '—';

        var item = document.createElement('div');
        item.className = 'enhanced-rare-item';
        item.innerHTML =
          '<img class="enhanced-rare-badge" src="' + escapeHtml(badgeUrl) + '" alt="" loading="lazy">'
          + '<div class="enhanced-rare-info">'
            + '<div class="enhanced-rare-title" title="' + escapeHtml(a.Title || '') + '">' + escapeHtml(a.Title || '') + '</div>'
            + '<div class="enhanced-rare-meta">' + escapeHtml(a.GameTitle || '') + ' · ' + points + ' pts</div>'
          + '</div>'
          + '<div class="enhanced-rare-ratio" title="TrueRatio: ' + trueRatio + ' (x' + ratio + ' rarity)">'
            + 'x' + ratio
          + '</div>';
        list.appendChild(item);
      });
    }

    function renderActivityTimeline(achievements, masteredDayMap, beatenDayMap) {
      var content = timelineSection.querySelector('.enhanced-timeline-content');
      if (!achievements || achievements.length === 0) {
        content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No recent activity.</div>';
        return;
      }

      // Update total in title
      var totalEl = document.getElementById('enhanced-timeline-total');
      if (totalEl) totalEl.textContent = '— ' + achievements.length + ' achievements';

      // Group achievements by day
      var achDayMap = {};
      achievements.forEach(function (a) {
        if (!a.Date) return;
        var day = a.Date.substring(0, 10);
        achDayMap[day] = (achDayMap[day] || 0) + 1;
      });

      // Build 365-day calendar grid structure (shared across modes)
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var todayDow = today.getDay();
      var startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364 - todayDow);
      var totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
      var numWeeks = Math.ceil(totalDays / 7);

      var baseCells = [];
      for (var w = 0; w < numWeeks; w++) {
        for (var dow = 0; dow < 7; dow++) {
          var d = new Date(startDate);
          d.setDate(d.getDate() + w * 7 + dow);
          if (d > today) continue;
          baseCells.push({ date: d.toISOString().substring(0, 10), day: d, week: w, dow: dow });
        }
      }

      var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

      // Month label positions
      var monthCols = {};
      baseCells.forEach(function (c) {
        if (c.dow === 0) {
          var key = c.day.getFullYear() + '-' + c.day.getMonth();
          if (!(key in monthCols)) monthCols[key] = { week: c.week, month: c.day.getMonth() };
        }
      });

      // Three data modes
      var modes = {
        achievements: {
          dayMap: achDayMap,
          prefix: 'level',
          label: '🏆 Achievements',
          totalLabel: function (dm) { var t = 0; for (var k in dm) t += dm[k]; return t + ' achievements'; },
          tooltipSingular: 'achievement',
          tooltipPlural: 'achievements',
          color: '#3b82f6',
          bg: 'rgba(59,130,246,0.12)',
          legendColors: ['rgba(255,255,255,0.04)','rgba(59,130,246,0.25)','rgba(59,130,246,0.5)','rgba(59,130,246,0.75)','#3b82f6']
        },
        mastered: {
          dayMap: masteredDayMap || {},
          prefix: 'mastered',
          label: '👑 Mastered',
          totalLabel: function (dm) { var t = 0; for (var k in dm) t += dm[k]; return t + ' games mastered'; },
          tooltipSingular: 'game mastered',
          tooltipPlural: 'games mastered',
          color: '#fbbf24',
          bg: 'rgba(251,191,36,0.12)',
          legendColors: ['rgba(255,255,255,0.04)','rgba(251,191,36,0.25)','rgba(251,191,36,0.5)','rgba(251,191,36,0.75)','#fbbf24']
        },
        beaten: {
          dayMap: beatenDayMap || {},
          prefix: 'beaten',
          label: '✅ Beaten',
          totalLabel: function (dm) { var t = 0; for (var k in dm) t += dm[k]; return t + ' games beaten'; },
          tooltipSingular: 'game beaten',
          tooltipPlural: 'games beaten',
          color: '#a3a3a3',
          bg: 'rgba(163,163,163,0.12)',
          legendColors: ['rgba(255,255,255,0.04)','rgba(163,163,163,0.25)','rgba(163,163,163,0.5)','rgba(163,163,163,0.75)','#a3a3a3']
        }
      };

      var currentMode = 'achievements';

      function buildGrid(mode) {
        var dm = mode.dayMap;
        var maxCount = 0;
        var cellData = baseCells.map(function (c) {
          var count = dm[c.date] || 0;
          if (count > maxCount) maxCount = count;
          return { date: c.date, count: count, day: c.day, week: c.week, dow: c.dow };
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

        var html = '<div class="enhanced-timeline-wrapper">';
        html += '<div class="enhanced-timeline-table" style="grid-template-columns:28px repeat(' + numWeeks + ',' + cellSize + 'px);grid-template-rows:auto repeat(7,' + cellSize + 'px);">';

        // Month labels row
        html += '<div></div>';
        var monthLabelsArr = [];
        for (var wi = 0; wi < numWeeks; wi++) monthLabelsArr.push('');
        Object.keys(monthCols).forEach(function (key) {
          var info = monthCols[key];
          monthLabelsArr[info.week] = monthNames[info.month];
        });
        for (var wi = 0; wi < numWeeks; wi++) {
          html += '<div class="enhanced-timeline-month-label">' + monthLabelsArr[wi] + '</div>';
        }

        // Cell lookup
        var cellMap = {};
        cellData.forEach(function (c) {
          if (!cellMap[c.week]) cellMap[c.week] = {};
          cellMap[c.week][c.dow] = c;
        });

        var levelPrefix = mode.prefix === 'level' ? 'level' : mode.prefix;

        for (var dow = 0; dow < 7; dow++) {
          if (dow === 1 || dow === 3 || dow === 5) {
            html += '<div class="enhanced-timeline-day-label">' + dayLabels[dow] + '</div>';
          } else {
            html += '<div class="enhanced-timeline-day-label"></div>';
          }
          for (var wi = 0; wi < numWeeks; wi++) {
            var cell = cellMap[wi] && cellMap[wi][dow];
            if (cell) {
              var level = getLevel(cell.count);
              var unit = cell.count === 1 ? mode.tooltipSingular : mode.tooltipPlural;
              var label = monthNames[cell.day.getMonth()] + ' ' + cell.day.getDate() + ', ' + cell.day.getFullYear() + ': ' + cell.count + ' ' + unit;
              var cls = level === 0 ? 'level-0' : (levelPrefix + '-' + level);
              html += '<div class="enhanced-timeline-cell ' + cls + '" title="' + escapeHtml(label) + '"></div>';
            } else {
              html += '<div></div>';
            }
          }
        }

        html += '</div></div>';

        // Footer
        var activeDays = 0;
        for (var k in dm) { if (dm[k] > 0) activeDays++; }
        html += '<div class="enhanced-timeline-footer">';
        html += '<span>' + mode.totalLabel(dm) + ' in ' + activeDays + ' days</span>';
        html += '<div class="enhanced-timeline-legend">';
        html += '<span>Less</span>';
        for (var li = 0; li < mode.legendColors.length; li++) {
          html += '<div class="enhanced-timeline-legend-cell" style="background:' + mode.legendColors[li] + ';"></div>';
        }
        html += '<span>More</span>';
        html += '</div></div>';

        return html;
      }

      function renderMode(modeKey) {
        currentMode = modeKey;
        var gridContainer = content.querySelector('.enhanced-timeline-grid-area');
        if (gridContainer) gridContainer.innerHTML = buildGrid(modes[modeKey]);
        // Update toggle button active states
        var btns = content.querySelectorAll('.enhanced-timeline-toggle-btn');
        btns.forEach(function (btn) {
          var bm = btn.getAttribute('data-mode');
          if (bm === modeKey) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      // Build toggle bar + grid container
      var outerHtml = '<div class="enhanced-timeline-toggle-bar">';
      ['achievements', 'mastered', 'beaten'].forEach(function (key) {
        var m = modes[key];
        var activeClass = key === 'achievements' ? ' active' : '';
        outerHtml += '<button class="enhanced-timeline-toggle-btn' + activeClass + '" data-mode="' + key + '" '
          + 'style="--toggle-color:' + m.color + ';--toggle-bg:' + m.bg + ';">'
          + m.label + '</button>';
      });
      outerHtml += '</div>';
      outerHtml += '<div class="enhanced-timeline-grid-area">' + buildGrid(modes.achievements) + '</div>';

      content.innerHTML = outerHtml;

      // Bind toggle clicks
      content.querySelectorAll('.enhanced-timeline-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          renderMode(btn.getAttribute('data-mode'));
        });
      });
    }

    // --- Fetch dashboard data ---
    // --- Scrape Console Breakdown from existing DOM ---
    function scrapeConsoleBreakdown() {
      var rows = document.querySelectorAll('li.progression-status-row');
      var consoles = [];
      var domTotalGames = 0;
      var domTotalMastered = 0;
      var foundTotalRow = false;

      rows.forEach(function (row) {
        var link = row.querySelector('a');
        if (!link) return;

        var img = link.querySelector('img');
        var nameEl = link.querySelector('p');
        if (!nameEl) return;

        var shortName = nameEl.textContent.trim();
        var iconUrl = img ? img.src : '';
        var consoleName = img ? (img.alt || '').replace(' console icon', '') : shortName;

        // Get cell links: [console link, unfinished, beaten, mastered]
        var allLinks = row.querySelectorAll('a');

        // Parse numbers from a cell (handles .tally divs or plain text)
        function parseCellNumbers(cell) {
          var nums = [];
          var tallies = cell.querySelectorAll('.tally');
          if (tallies.length > 0) {
            tallies.forEach(function (t) {
              var n = parseInt(t.textContent.trim(), 10);
              if (!isNaN(n)) nums.push(n);
            });
          } else {
            var n = parseInt(cell.textContent.trim(), 10);
            if (!isNaN(n)) nums.push(n);
          }
          return nums;
        }

        // Cells: index 1=unfinished, 2=beaten, 3=mastered
        var unfinished = 0, beaten = 0, mastered = 0;
        if (allLinks.length >= 2) {
          var uNums = parseCellNumbers(allLinks[1]);
          unfinished = uNums.reduce(function (s, n) { return s + n; }, 0);
        }
        if (allLinks.length >= 3) {
          var bNums = parseCellNumbers(allLinks[2]);
          beaten = bNums.reduce(function (s, n) { return s + n; }, 0);
        }
        if (allLinks.length >= 4) {
          var mNums = parseCellNumbers(allLinks[3]);
          mastered = mNums.reduce(function (s, n) { return s + n; }, 0);
        }

        var totalCount = unfinished + beaten + mastered;

        // Skip "Total" row but extract its data for stats
        if (shortName === 'Total') {
          foundTotalRow = true;
          domTotalGames = totalCount;
          domTotalMastered = mastered;
          return;
        }

        if (totalCount > 0) {
          consoles.push({
            shortName: shortName,
            consoleName: consoleName,
            iconUrl: iconUrl,
            count: totalCount,
            mastered: mastered
          });
        }
      });

      // If no Total row found, sum from individual consoles
      if (!foundTotalRow) {
        consoles.forEach(function (c) {
          domTotalGames += c.count;
          domTotalMastered += c.mastered;
        });
      }

      return { consoles: consoles, totalGames: domTotalGames, totalMastered: domTotalMastered };
    }

    function fetchDashboardData() {
      // Scrape console data from DOM immediately
      var domData = scrapeConsoleBreakdown();

      // Render Console Breakdown from DOM data right away (no API needed)
      if (domData.consoles.length > 0) {
        domData.consoles.sort(function (a, b) { return b.count - a.count; });
        renderConsoleBreakdown(domData.consoles.slice(0, 10));
      } else {
        var list = consoleSection.querySelector('.enhanced-console-list');
        list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No console data found on page.</div>';
      }

      var summaryUrl = 'https://retroachievements.org/API/API_GetUserSummary.php'
        + '?u=' + encodeURIComponent(targetUser)
        + '&y=' + encodeURIComponent(apiKey)
        + '&g=0&a=0';

      var recentAllUrl = 'https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php'
        + '?u=' + encodeURIComponent(targetUser)
        + '&y=' + encodeURIComponent(apiKey)
        + '&c=50&o=0';

      var recentAchUrl = 'https://retroachievements.org/API/API_GetUserRecentAchievements.php'
        + '?u=' + encodeURIComponent(targetUser)
        + '&y=' + encodeURIComponent(apiKey)
        + '&m=43200'; // 30 days in minutes

      var awardsUrl = 'https://retroachievements.org/API/API_GetUserAwards.php'
        + '?u=' + encodeURIComponent(targetUser)
        + '&y=' + encodeURIComponent(apiKey);

      // Build quarterly URLs for 1-year timeline (4 chunks of ~91 days)
      var now = Math.floor(Date.now() / 1000);
      var oneYearAgo = now - 365 * 24 * 60 * 60;
      var quarterSec = Math.ceil((now - oneYearAgo) / 4);
      var yearlyChunkUrls = [];
      for (var q = 0; q < 4; q++) {
        var f = oneYearAgo + q * quarterSec;
        var t = (q < 3) ? (oneYearAgo + (q + 1) * quarterSec) : now;
        yearlyChunkUrls.push(
          'https://retroachievements.org/API/API_GetAchievementsEarnedBetween.php'
          + '?u=' + encodeURIComponent(targetUser)
          + '&y=' + encodeURIComponent(apiKey)
          + '&f=' + f + '&t=' + t
        );
      }

      // Fetch summary + recent games + recent achievements (30d) + awards + yearly chunks in parallel
      var corePromises = [
        gmFetch(summaryUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; }),
        gmFetch(recentAllUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; }),
        gmFetch(recentAchUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; }),
        gmFetch(awardsUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; })
      ];
      var yearlyPromises = yearlyChunkUrls.map(function (url) {
        return gmFetch(url, 20000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return []; });
      });

      Promise.all(corePromises.concat(yearlyPromises)).then(function (results) {
        var summary = results[0];
        var recentGames = results[1];
        var recentAchievements = results[2]; // 30-day data for rarest
        var awardsData = results[3]; // user awards (mastered/beaten dates)

        // Merge 4 quarterly chunks into yearlyAchievements
        var yearlyAchievements = [];
        for (var q = 0; q < 4; q++) {
          var chunk = results[4 + q];
          if (Array.isArray(chunk)) {
            yearlyAchievements = yearlyAchievements.concat(chunk);
          }
        }
        // Deduplicate by AchievementID + Date (in case of overlapping boundaries)
        var seen = {};
        yearlyAchievements = yearlyAchievements.filter(function (a) {
          var key = a.AchievementID + '|' + a.Date + '|' + a.HardcoreMode;
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });

        // --- Stats Cards ---
        var points = 0;
        var rank = '—';
        if (summary) {
          points = parseInt(summary.TotalPoints, 10) || 0;
          rank = summary.Rank || '—';
        }

        renderStatsCards({
          totalGames: domData.totalGames,
          mastered: domData.totalMastered,
          points: points,
          rank: rank
        });

        // --- Almost There ---
        var almostGames = [];
        if (recentGames && Array.isArray(recentGames)) {
          recentGames.forEach(function (g) {
            var earned = parseInt(g.NumAchieved, 10) || 0;
            var total = parseInt(g.NumPossibleAchievements, 10) || 0;
            if (total > 0 && earned < total) {
              var pct = earned / total;
              if (pct >= 0.5) {
                almostGames.push({
                  gameId: g.GameID,
                  title: g.Title || '',
                  imageIcon: g.ImageIcon || '',
                  earned: earned,
                  total: total,
                  pct: pct
                });
              }
            }
          });
          // Sort by pct descending (closest to 100% first)
          almostGames.sort(function (a, b) { return b.pct - a.pct; });
          almostGames = almostGames.slice(0, 5);
        }
        renderAlmostThere(almostGames);

        // --- Streak Tracker (uses yearly data for better accuracy) ---
        if (yearlyAchievements && yearlyAchievements.length > 0) {
          renderStreakTracker(yearlyAchievements);
        } else {
          streakSection.querySelector('.enhanced-streak-content').innerHTML =
            '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load streak data.</div>';
        }

        // --- Rarest Achievements (30-day data) ---
        if (recentAchievements && Array.isArray(recentAchievements)) {
          renderRarestAchievements(recentAchievements);
        } else {
          rarestSection.querySelector('.enhanced-rare-list').innerHTML =
            '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load rarity data.</div>';
        }

        // --- Activity Timeline (yearly data + awards) ---
        // Process awards for mastered/beaten heatmap modes
        var masteredDayMap = {};
        var beatenDayMap = {};
        var oneYearAgoDate = new Date();
        oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 365);
        oneYearAgoDate.setHours(0, 0, 0, 0);

        if (awardsData && Array.isArray(awardsData.VisibleUserAwards)) {
          awardsData.VisibleUserAwards.forEach(function (award) {
            if (!award.AwardedAt) return;
            var awardDate = new Date(award.AwardedAt);
            if (awardDate < oneYearAgoDate) return;
            var dayStr = awardDate.toISOString().substring(0, 10);

            // AwardType + AwardDataExtra: "Game Beaten" = beaten, "Mastery/Completion" with Extra=1 = mastered, Extra=0 = completed (softcore mastery)
            var aType = (award.AwardType || '').toLowerCase();
            if (aType === 'mastery/completion' || aType === 'mastery') {
              masteredDayMap[dayStr] = (masteredDayMap[dayStr] || 0) + 1;
            } else if (aType === 'game beaten') {
              beatenDayMap[dayStr] = (beatenDayMap[dayStr] || 0) + 1;
            }
          });
        }

        if (yearlyAchievements && yearlyAchievements.length > 0) {
          renderActivityTimeline(yearlyAchievements, masteredDayMap, beatenDayMap);
        } else {
          timelineSection.querySelector('.enhanced-timeline-content').innerHTML =
            '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load activity data.</div>';
        }

        log.info('Dashboard loaded for ' + targetUser);
      }).catch(function (err) {
        log.warn('Dashboard failed: ' + err.message);
        statsRow.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;grid-column:1/-1;">Failed to load dashboard</div>';
      });
    }

    fetchDashboardData();

    function renderPaginator(container, offset, hasMore) {
      var currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
      lastKnownHasMore = hasMore;

      // Update highest known page
      if (currentPage > highestKnownPage) highestKnownPage = currentPage;
      if (hasMore && currentPage >= highestKnownPage) highestKnownPage = currentPage + 1;

      container.innerHTML = '';
      container.className = 'enhanced-pagination';

      function addBtn(label, page, disabled, isActive) {
        var btn = document.createElement('button');
        btn.textContent = label;
        btn.disabled = !!disabled;
        if (isActive) btn.className = 'active';
        if (!disabled) {
          btn.addEventListener('click', function () {
            doLoadPage((page - 1) * ITEMS_PER_PAGE);
          });
        }
        container.appendChild(btn);
      }

      // First button
      addBtn('First', 1, currentPage === 1, false);

      // Previous button (<) — goes back one page, disabled on page 1
      addBtn('\u276E', currentPage - 1, currentPage === 1, false);

      // Calculate visible page range (show up to 5 numbered buttons)
      var lastPage = highestKnownPage;
      var startP = Math.max(1, currentPage - 2);
      var endP = Math.min(lastPage, startP + 4);
      if (endP - startP < 4) startP = Math.max(1, endP - 4);

      // Ellipsis before
      if (startP > 1) {
        var dots = document.createElement('span');
        dots.className = 'page-info';
        dots.textContent = '...';
        container.appendChild(dots);
      }

      // Numbered page buttons
      for (var p = startP; p <= endP; p++) {
        addBtn(String(p), p, false, p === currentPage);
      }

      // Ellipsis after (if we know there are more pages beyond what we show)
      if (endP < lastPage || hasMore) {
        var dotsAfter = document.createElement('span');
        dotsAfter.className = 'page-info';
        dotsAfter.textContent = '...';
        container.appendChild(dotsAfter);
      }

      // Next button (>) — goes forward one page
      var nextTarget = currentPage + 1;
      var nextDisabled = !hasMore && currentPage >= lastPage;
      addBtn('\u276F', nextTarget, nextDisabled, false);
    }

    // ConsoleID → { short name, icon filename } mapping (from RAWeb config/systems.php)
    var consoleIdMap = {
      1:{s:'MD',i:'md'},2:{s:'N64',i:'n64'},3:{s:'SNES',i:'snes'},4:{s:'GB',i:'gb'},
      5:{s:'GBA',i:'gba'},6:{s:'GBC',i:'gbc'},7:{s:'NES',i:'nes'},8:{s:'PCE',i:'pce'},
      9:{s:'SCD',i:'scd'},10:{s:'32X',i:'32-x'},11:{s:'SMS',i:'sms'},12:{s:'PS1',i:'ps1'},
      13:{s:'Lynx',i:'lynx'},14:{s:'NGP',i:'ngp'},15:{s:'GG',i:'gg'},16:{s:'GC',i:'gc'},
      17:{s:'JAG',i:'jag'},18:{s:'DS',i:'ds'},19:{s:'Wii',i:'wii'},20:{s:'WiiU',i:'wii-u'},
      21:{s:'PS2',i:'ps2'},22:{s:'Xbox',i:'xbox'},23:{s:'MO2',i:'mo-2'},24:{s:'MINI',i:'mini'},
      25:{s:'2600',i:'2600'},27:{s:'ARC',i:'arc'},28:{s:'VB',i:'vb'},29:{s:'MSX',i:'msx'},
      33:{s:'SG1K',i:'sg-1-k'},37:{s:'CPC',i:'cpc'},38:{s:'A2',i:'a2'},39:{s:'SAT',i:'sat'},
      40:{s:'DC',i:'dc'},41:{s:'PSP',i:'psp'},43:{s:'3DO',i:'3-do'},44:{s:'CV',i:'cv'},
      45:{s:'INTV',i:'intv'},46:{s:'VECT',i:'vect'},47:{s:'80/88',i:'8088'},49:{s:'PC-FX',i:'pc-fx'},
      51:{s:'7800',i:'7800'},53:{s:'WS',i:'ws'},56:{s:'NGCD',i:'ngcd'},57:{s:'CHF',i:'chf'},
      63:{s:'WSV',i:'wsv'},69:{s:'DUCK',i:'duck'},71:{s:'ARD',i:'ard'},72:{s:'WASM4',i:'wasm-4'},
      73:{s:'A2001',i:'a2001'},74:{s:'VC4000',i:'vc-4000'},75:{s:'ELEK',i:'elek'},
      76:{s:'PCCD',i:'pccd'},77:{s:'JCD',i:'jcd'},78:{s:'DSi',i:'dsi'},80:{s:'UZE',i:'uze'},
      81:{s:'FDS',i:'fds'},102:{s:'EXE',i:'exe'}
    };

    function getConsoleInfo(consoleId) {
      var entry = consoleIdMap[consoleId];
      if (entry) {
        return {
          shortName: entry.s,
          iconUrl: 'https://static.retroachievements.org/assets/images/system/' + entry.i + '.png'
        };
      }
      return { shortName: '', iconUrl: 'https://static.retroachievements.org/assets/images/system/unknown.png' };
    }

    // Cache for fetched achievement data per game
    var achievementCache = {};
    var playerCountCache = {};

    function renderSkeletonBadges(container, count) {
      container.innerHTML = '';
      for (var i = 0; i < Math.min(count, 20); i++) {
        var span = document.createElement('span');
        span.className = 'inline';
        span.innerHTML = '<div style="width:48px;height:48px;border-radius:6px;background:rgba(255,255,255,0.08);animation:enhanced-skeleton-pulse 1.5s ease-in-out infinite;animation-delay:' + (i * 0.05) + 's;"></div>';
        container.appendChild(span);
      }
    }

    function fetchAndRenderAchievements(gameId, gridContainer, gameName) {
      if (achievementCache[gameId]) {
        renderAchievementBadges(achievementCache[gameId], gridContainer, gameName, playerCountCache[gameId] || 0);
        return;
      }

      renderSkeletonBadges(gridContainer, 12);

      var url = 'https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php'
        + '?g=' + gameId
        + '&u=' + encodeURIComponent(targetUser)
        + '&y=' + encodeURIComponent(apiKey);

      gmFetch(url, 15000).then(function (resp) {
        var data = JSON.parse(resp.responseText);
        var achievements = data.Achievements || {};
        var numPlayers = parseInt(data.NumDistinctPlayers, 10) || 0;
        achievementCache[gameId] = achievements;
        playerCountCache[gameId] = numPlayers;
        renderAchievementBadges(achievements, gridContainer, gameName, numPlayers);
      }).catch(function () {
        gridContainer.innerHTML = '<div style="color:#ef4444;grid-column:1/-1;">Failed to load achievements</div>';
      });
    }

    function renderAchievementBadges(achievements, gridContainer, gameName, numPlayers) {
      gridContainer.innerHTML = '';
      var achList = Object.values(achievements);

      // Separate unlocked and locked, sort each by DisplayOrder
      var unlocked = achList.filter(function (a) { return a.DateEarned || a.DateEarnedHardcore; });
      var locked = achList.filter(function (a) { return !a.DateEarned && !a.DateEarnedHardcore; });

      // Unlocked: most recently earned first
      unlocked.sort(function (a, b) {
        var da = a.DateEarnedHardcore || a.DateEarned || '';
        var db = b.DateEarnedHardcore || b.DateEarned || '';
        return da > db ? -1 : da < db ? 1 : 0;
      });
      // Locked: by display order
      locked.sort(function (a, b) { return (a.DisplayOrder || 0) - (b.DisplayOrder || 0); });

      var sorted = unlocked.concat(locked);

      sorted.forEach(function (ach) {
        var isUnlocked = !!(ach.DateEarned || ach.DateEarnedHardcore);
        var badgeName = ach.BadgeName || '';
        var badgeUrl = isUnlocked
          ? 'https://media.retroachievements.org/Badge/' + badgeName + '.png'
          : 'https://media.retroachievements.org/Badge/' + badgeName + '_lock.png';
        var imgClass = isUnlocked ? 'goldimage' : 'badgeimglarge';

        var unlockText = '';
        if (ach.DateEarnedHardcore) {
          unlockText = '\nUnlocked ' + ach.DateEarnedHardcore + ' (hardcore)';
        } else if (ach.DateEarned) {
          unlockText = '\nUnlocked ' + ach.DateEarned;
        }

        // Calculate rarity from NumAwarded
        var rarityText = '';
        var borderStyle = '';
        var numAwarded = parseInt(ach.NumAwarded, 10) || 0;
        if (enableRarityIndicator && numPlayers > 0 && numAwarded > 0) {
          var pct = (numAwarded / numPlayers) * 100;
          var tier = getRarityTier(pct);
          rarityText = '\n' + tier.label + ' (' + pct.toFixed(1) + '% unlock rate)';
          borderStyle = 'border: 2px solid ' + tier.color + '; border-radius: 8px;';
        }

        var titleText = ach.Title + '\n' + (ach.Description || '') + '\n' + (ach.Points || 0) + ' points'
          + '\n' + (gameName || '') + unlockText + rarityText;

        var span = document.createElement('span');
        span.className = 'inline';
        span.innerHTML = '<a class="inline-block" href="https://retroachievements.org/achievement/' + ach.ID + '" title="' + escapeHtml(titleText) + '">'
          + '<img loading="lazy" decoding="async" width="48" height="48" src="' + badgeUrl + '" alt="' + escapeHtml(ach.Title || '') + '" class="' + imgClass + '"'
          + (borderStyle ? ' style="' + borderStyle + '"' : '') + '>'
          + '</a>';

        gridContainer.appendChild(span);
      });

      if (sorted.length === 0) {
        gridContainer.innerHTML = '<div style="color:#a3a3a3;grid-column:1/-1;">No achievements</div>';
      }
    }

    function renderGames(games) {
      gamesList.innerHTML = '';
      if (games.length === 0) {
        gamesList.innerHTML = '<div style="color:#a3a3a3;padding:12px;">No more games found.</div>';
        return;
      }
      games.forEach(function (game) {
        var imgSrc = game.ImageIcon
          ? "https://retroachievements.org" + game.ImageIcon
          : "";

        var numAchieved = game.NumAchieved || 0;
        var numHC = game.NumAchievedHardcore || 0;
        var numTotal = game.NumPossibleAchievements || 0;
        var totalScore = game.PossibleScore || 0;
        var hcScore = game.ScoreAchievedHardcore || 0;
        var scScore = game.ScoreAchieved || 0;
        var exclusiveSoftcore = Math.max(scScore - hcScore, 0);
        var leftPoints = hcScore >= exclusiveSoftcore ? hcScore : exclusiveSoftcore;

        // Progress percentages
        var hcPct = numTotal > 0 ? Math.floor((numHC / numTotal) * 100) : 0;
        var totalPct = numTotal > 0 ? Math.floor((numAchieved / numTotal) * 100) : 0;
        var softcoreBarWidth = Math.max(totalPct - hcPct, 0);

        // Achievement count text
        var achHtml = '';
        if (numTotal > 0) {
          if (numAchieved === numTotal) {
            achHtml = 'All <span class="font-bold">' + numAchieved + '</span> achievements';
          } else {
            achHtml = '<span class="font-bold">' + numAchieved + '</span> of <span class="font-bold">' + numTotal + '</span> achievements';
          }
        }

        // Points text
        var pointsHtml = '';
        if (totalScore > 0) {
          pointsHtml = '<span class="font-bold">' + leftPoints + '</span> of <span class="font-bold">' + totalScore + '</span> points';
          if (exclusiveSoftcore > 0 && exclusiveSoftcore < hcScore) {
            pointsHtml += ' (+<span class="font-bold">' + exclusiveSoftcore + '</span> softcore)';
          } else if (hcScore > 0 && exclusiveSoftcore > hcScore) {
            pointsHtml += ' (+<span class="font-bold">' + hcScore + '</span> hardcore)';
          }
        }

        // Last played date
        var lastPlayedLabel = '';
        if (game.LastPlayed) {
          var d = new Date(game.LastPlayed);
          var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          lastPlayedLabel = months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear();
        }

        // Console info (short name + icon URL)
        var consoleInfo = getConsoleInfo(game.ConsoleID);

        // Determine award state (infer from progress — API doesn't provide HighestAwardKind)
        var awardKind = '';
        if (numTotal > 0 && numHC === numTotal) {
          awardKind = 'mastered';
        } else if (numTotal > 0 && numAchieved === numTotal) {
          awardKind = 'completed';
        }

        // Award title labels
        var awardTitles = { 'mastered':'Mastered', 'completed':'Completed', 'beaten-hardcore':'Beaten', 'beaten-softcore':'Beaten (softcore)' };
        var awardTitle = awardTitles[awardKind] || 'Unfinished';

        // Progress bar HTML (reusing site's existing CSS classes)
        var progressBarHtml = '';
        if (numTotal > 0) {
          progressBarHtml = '<div class="cprogress-pbar__root">'
            + '<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + totalPct + '">'
            + '<div style="width:' + hcPct + '%"' + (hcPct === 100 ? ' class="rounded-r"' : '') + '></div>'
            + '<div style="width:' + softcoreBarWidth + '%"' + (hcPct === 0 ? ' class="rounded-l"' : '') + (totalPct === 100 ? ' class="rounded-r"' : '') + '></div>'
            + '</div>'
            + '<p class="text-2xs flex justify-between w-full">' + totalPct + '%</p>'
            + '</div>';
        } else {
          progressBarHtml = '<div class="cprogress-pbar__root">'
            + '<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>'
            + '<p class="text-2xs flex justify-between w-full">No achievements yet</p>'
            + '</div>';
        }

        // Award indicator HTML (reusing site's CSS classes)
        var awardIndicatorHtml = '<div class="cprogress-ind__root" data-award="' + awardKind + '" title="' + awardTitle + '">'
          + '<div><div></div><div></div></div>'
          + '</div>';

        // Console badge as <a> with icon image (matching original site structure)
        var consoleBadgeHtml = '<a href="https://retroachievements.org/user/' + encodeURIComponent(targetUser) + '/progress?filter%5Bsystem%5D=' + game.ConsoleID + '"'
          + ' class="hidden sm:flex gap-x-1 items-center rounded bg-zinc-950 light:bg-zinc-300 py-0.5 px-2">'
          + '<img src="' + consoleInfo.iconUrl + '" width="18" height="18" alt="' + escapeHtml(game.ConsoleName) + ' console icon">'
          + '<p>' + escapeHtml(consoleInfo.shortName || game.ConsoleName) + '</p>'
          + '</a>';

        // Build the card matching the site's original structure
        var item = document.createElement("div");
        item.className = 'relative flex flex-col w-full px-2 py-2 transition-all rounded-sm'
          + (awardKind ? ' bg-zinc-950/60 light:bg-stone-200' : ' bg-embed');

        item.innerHTML =
          '<div class="flex flex-col sm:flex-row w-full sm:justify-between sm:items-center gap-x-2">'
            + '<div class="flex sm:items-center gap-x-2.5">'
              // Game image
              + '<a href="/game/' + game.GameID + '">'
              + '<img src="' + imgSrc + '" width="58" height="58" class="rounded-sm w-[58px] h-[58px]" loading="lazy" decoding="async" />'
              + '</a>'
              // Primary meta
              + '<div class="cprogress-pmeta__root">'
                + '<a href="/game/' + game.GameID + '">' + escapeHtml(game.Title) + '</a>'
                + (achHtml ? '<div class="flex flex-col"><p>' + achHtml + '</p>' + (pointsHtml ? '<p>' + pointsHtml + '</p>' : '') + '</div>' : '')
                + (lastPlayedLabel ? '<div class="flex !flex-col-reverse"><p><span>Last played</span> ' + lastPlayedLabel + '</p></div>' : '')
              + '</div>'
            + '</div>'
            // Right side: console badge + progress bar + award + toggle
            + '<div class="mt-1 sm:mt-0">'
              + '<div class="flex gap-x-2 items-center sm:gap-x-4 sm:divide-x divide-neutral-700 ml-[68px] sm:ml-0">'
                + consoleBadgeHtml
                + progressBarHtml
                + awardIndicatorHtml
                + '<div class="absolute sm:static top-0 right-0 sm:pl-4">'
                  + '<button class="btn transition-transform lg:active:scale-95 duration-75 re-toggle-btn"'
                  + (numTotal <= 0 ? ' disabled' : '') + '>'
                  + '<div class="transition-transform duration-300 re-chevron-icon">'
                  + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/></svg>'
                  + '</div></button></div>'
              + '</div>'
            + '</div>'
          + '</div>'
          // Expandable achievements section
          + '<div class="re-expand-section" style="max-height:0;opacity:0;overflow:hidden;transition:all 300ms ease-in-out;">'
            + '<hr class="mt-2 border-embed-highlight">'
            + '<div class="py-4 place-content-center grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] px-0.5 sm:px-4 re-badges-grid"></div>'
          + '</div>';

        // Toggle button click handler
        var toggleBtn = item.querySelector('.re-toggle-btn');
        var expandSection = item.querySelector('.re-expand-section');
        var chevronIcon = item.querySelector('.re-chevron-icon');
        var badgesGrid = item.querySelector('.re-badges-grid');
        var isExpanded = false;
        var hasFetched = false;

        if (toggleBtn && numTotal > 0) {
          toggleBtn.addEventListener('click', function () {
            isExpanded = !isExpanded;
            if (isExpanded) {
              expandSection.style.maxHeight = '2000px';
              expandSection.style.opacity = '1';
              chevronIcon.style.transform = 'rotate(180deg)';
              if (!hasFetched) {
                hasFetched = true;
                fetchAndRenderAchievements(game.GameID, badgesGrid, game.Title);
              }
            } else {
              expandSection.style.maxHeight = '0';
              expandSection.style.opacity = '0';
              chevronIcon.style.transform = 'rotate(0deg)';
            }
          });
        }

        gamesList.appendChild(item);
      });
    }

    function doLoadPage(offset) {
      currentOffset = offset;

      // Page 1: show original server-rendered content (only if default 5 items)
      if (offset === 0 && ITEMS_PER_PAGE === 5) {
        existingList.style.display = "";
        gamesList.innerHTML = '';
        recentH2.textContent = originalHeadingText;
        renderPaginator(paginationDiv, 0, true);
        return;
      }

      // Other pages: hide original, load from API
      existingList.style.display = "none";
      renderSkeletonCards(gamesList, ITEMS_PER_PAGE);

      var url = "https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php"
        + "?u=" + encodeURIComponent(targetUser)
        + "&y=" + encodeURIComponent(apiKey)
        + "&c=" + ITEMS_PER_PAGE
        + "&o=" + offset;

      gmFetch(url, 15000)
        .then(function (resp) {
          var games = JSON.parse(resp.responseText);
          var hasMore = games.length === ITEMS_PER_PAGE;
          renderGames(games);
          renderPaginator(paginationDiv, offset, hasMore);

          // Update heading
          var start = offset + 1;
          var end = offset + games.length;
          if (games.length > 0) {
            recentH2.textContent = "Recently Played Games (" + start + "–" + end + ")";
          }

          recentH2.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch(function (err) {
          gamesList.innerHTML = '<div style="color:#ef4444;padding:12px;">Failed to load games: ' + escapeHtml(err.message) + '</div>';
        });
    }

    // Initial paginator (page 1 already visible from server render)
    renderPaginator(paginationDiv, 0, true);

    log.info("User pagination initialized for: " + targetUser);
  }

  // =========================================
  //   User Wall — Linkify URLs + YouTube Embed
  // =========================================
  function initWallLinkify() {
    if (!/^\/user\/[^\/]+(\/(comments)?)?$/i.test(location.pathname)) return;

    // Inject CSS once
    if (!document.getElementById('enhanced-wall-linkify-style')) {
      var style = document.createElement('style');
      style.id = 'enhanced-wall-linkify-style';
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

    // Check if URL points to an image
    var imageExtRegex = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)(\?[^#]*)?$/i;
    function isImageUrl(url) {
      return imageExtRegex.test(url);
    }

    // Extract YouTube video ID from various URL formats
    function extractYouTubeId(url) {
      var m = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    }

    function linkifyCommentBody(bodyEl) {
      if (bodyEl.getAttribute('data-enhanced-linkified')) return;
      bodyEl.setAttribute('data-enhanced-linkified', '1');

      // Process text nodes only (preserve existing HTML structure)
      var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      // URL regex — match http(s) and www. URLs
      var urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

      var youtubeIds = [];
      var imageUrls = [];

      textNodes.forEach(function (node) {
        var text = node.textContent;
        if (!urlRegex.test(text)) return;
        urlRegex.lastIndex = 0;

        var frag = document.createDocumentFragment();
        var lastIdx = 0;
        var match;

        while ((match = urlRegex.exec(text)) !== null) {
          // Add text before the match
          if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
          }

          var rawUrl = match[0].replace(/[.,;:!?)]+$/, ''); // trim trailing punctuation
          var href = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl;

          var a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'enhanced-wall-link';
          a.textContent = rawUrl;
          frag.appendChild(a);

          // Check for YouTube
          var ytId = extractYouTubeId(href);
          if (ytId && youtubeIds.indexOf(ytId) === -1) {
            youtubeIds.push(ytId);
          }

          // Check for image
          if (isImageUrl(href) && imageUrls.indexOf(href) === -1) {
            imageUrls.push(href);
          }

          lastIdx = match.index + match[0].length;
          // Adjust if we trimmed trailing punctuation
          var trimmed = match[0].length - rawUrl.length;
          if (trimmed > 0) {
            frag.appendChild(document.createTextNode(match[0].slice(match[0].length - trimmed)));
          }
        }

        // Remaining text after last match
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        node.parentNode.replaceChild(frag, node);
      });

      // Append YouTube embeds after the comment body
      youtubeIds.forEach(function (ytId) {
        var wrapper = document.createElement('div');
        wrapper.className = 'enhanced-yt-embed';
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(ytId);
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        wrapper.appendChild(iframe);
        bodyEl.appendChild(wrapper);
      });

      // Append image previews
      imageUrls.forEach(function (imgUrl) {
        var img = document.createElement('img');
        img.className = 'enhanced-img-preview';
        img.src = imgUrl;
        img.alt = 'Image preview';
        img.loading = 'lazy';
        img.title = 'Click to open in new tab';
        img.addEventListener('click', function () {
          window.open(imgUrl, '_blank', 'noopener,noreferrer');
        });
        bodyEl.appendChild(img);
      });
    }

    function processAllComments() {
      var commentItems = document.querySelectorAll(
        'tr.comment.group, .commentscomponent tr.comment, ul.highlighted-list > li'
      );

      commentItems.forEach(function (el) {
        var bodyEl = null;

        // Strategy 1: element with word-break style
        var candidates = el.querySelectorAll('[style*="word-break"]');
        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i].textContent.trim()) {
            bodyEl = candidates[i];
            break;
          }
        }

        // Strategy 2: legacy Blade — td with colspan
        if (!bodyEl) {
          var td = el.querySelector('td[colspan]') || el.querySelector('td.w-full');
          if (td) {
            var divs = td.querySelectorAll(':scope > div');
            for (var j = divs.length - 1; j >= 0; j--) {
              var txt = divs[j].textContent.trim();
              if (txt && !divs[j].querySelector('.smalldate') && txt.length > 2) {
                bodyEl = divs[j];
                break;
              }
            }
          }
        }

        // Strategy 3: React — p inside div.w-full
        if (!bodyEl) {
          var contentDiv = el.querySelector('div.w-full');
          if (contentDiv) {
            var ps = contentDiv.querySelectorAll(':scope > p');
            for (var k = ps.length - 1; k >= 0; k--) {
              var t = ps[k].textContent.trim();
              if (t && !ps[k].querySelector('.smalldate') && t.length > 2) {
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

    var linkifyObserver = new MutationObserver(function () {
      processAllComments();
    });
    var container = document.querySelector('.commentscomponent')
      || document.querySelector('ul.highlighted-list')
      || document.querySelector('main')
      || document.body;
    linkifyObserver.observe(container, { childList: true, subtree: true });

    log.info('Wall linkify initialized');
  }

  // =========================================
  //   User Wall Comment Translation
  // =========================================
  async function initWallTranslation() {
    // Run on user profile pages and user comments pages
    if (!/^\/user\/[^\/]+(\/(comments)?)?$/i.test(location.pathname)) return;

    var wallLang = await GM_getValue("translateLang", "pt-BR");

    function wallTranslateText(text, targetLang) {
      return translateWithRateLimit(text, targetLang);
    }

    // Inject CSS once (reuses same class names as achievement translate)
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
      // Legacy profile page: <tr class="comment group"> inside <table id="feed">
      //   Comment body: <div style="word-break: break-word;"> inside <td>
      // React /comments page: <li class="group ..."> inside <ul class="highlighted-list">
      //   Comment body: <p style="word-break: break-word">
      var commentItems = document.querySelectorAll(
        'tr.comment.group, .commentscomponent tr.comment, ul.highlighted-list > li'
      );

      commentItems.forEach(function (el) {
        if (el.querySelector('.enhanced-wall-translate-btn')) return;

        // Find the comment body element (<div> or <p> with word-break style)
        var bodyEl = null;

        // Strategy 1: any element with word-break in style (works for both legacy <div> and React <p>)
        var candidates = el.querySelectorAll('[style*="word-break"]');
        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i].textContent.trim()) {
            bodyEl = candidates[i];
            break;
          }
        }

        // Strategy 2: For legacy Blade — <td> with colspan, last <div> child
        if (!bodyEl) {
          var td = el.querySelector('td[colspan]') || el.querySelector('td.w-full');
          if (td) {
            var divs = td.querySelectorAll(':scope > div');
            for (var j = divs.length - 1; j >= 0; j--) {
              var txt = divs[j].textContent.trim();
              if (txt && !divs[j].querySelector('.smalldate') && txt.length > 2) {
                bodyEl = divs[j];
                break;
              }
            }
          }
        }

        // Strategy 3: For React — <p> inside div.w-full
        if (!bodyEl) {
          var contentDiv = el.querySelector('div.w-full');
          if (contentDiv) {
            var ps = contentDiv.querySelectorAll(':scope > p');
            for (var k = ps.length - 1; k >= 0; k--) {
              var t = ps[k].textContent.trim();
              if (t && !ps[k].querySelector('.smalldate') && t.length > 2) {
                bodyEl = ps[k];
                break;
              }
            }
          }
        }

        if (!bodyEl || !bodyEl.textContent.trim()) return;

        var btn = document.createElement('button');
        btn.className = 'enhanced-wall-translate-btn';

        var commentText = bodyEl.textContent.trim();
        if (commentText.length > 500) {
          btn.classList.add('disabled');
          btn.title = 'Text exceeds 500 character limit for translation (' + commentText.length + ' chars)';
          btn.innerHTML = '&#x1F310; Too long';
          bodyEl.after(btn);
          return;
        }

        btn.title = 'Translate to ' + wallLang;
        btn.innerHTML = '&#x1F310; Translate';

        var isTranslated = false;
        var originalText = bodyEl.innerHTML;
        var translatedText = null;

        btn.addEventListener('click', function () {
          if (btn.classList.contains('translating')) return;

          if (isTranslated) {
            bodyEl.innerHTML = originalText;
            btn.innerHTML = '&#x1F310; Translate';
            btn.classList.remove('translated');
            isTranslated = false;
            return;
          }

          if (translatedText) {
            bodyEl.innerHTML = translatedText;
            btn.innerHTML = '&#x1F310; Original';
            btn.classList.add('translated');
            isTranslated = true;
            return;
          }

          btn.classList.add('translating');
          btn.innerHTML = '&#x23F3; ...';

          wallTranslateText(bodyEl.textContent.trim(), wallLang)
            .then(function (result) {
              // Preserve line breaks
              translatedText = escapeHtml(result).replace(/\n/g, '<br>');
              bodyEl.innerHTML = translatedText;
              btn.innerHTML = '&#x1F310; Original';
              btn.classList.remove('translating');
              btn.classList.add('translated');
              isTranslated = true;
            })
            .catch(function (err) {
              log.warn('Wall translation failed: ' + err.message);
              var isRateLimit = err.message && err.message.indexOf('RATE_LIMIT') === 0;
              btn.innerHTML = isRateLimit ? '&#x26D4; Limit' : '&#x26A0; Error';
              btn.title = isRateLimit ? err.message.replace('RATE_LIMIT: ', '') : 'Translation failed';
              btn.classList.remove('translating');
              if (!isRateLimit) {
                setTimeout(function () {
                  btn.innerHTML = '&#x1F310; Translate';
                  btn.title = 'Translate to ' + wallLang;
                }, 2000);
              }
            });
        });

        // Insert button after the comment body element
        bodyEl.after(btn);
      });
    }

    // Run with delay to let page render, then observe for dynamic changes
    await new Promise(function (r) { setTimeout(r, 1000); });
    injectWallTranslateButtons();

    var wallObserver = new MutationObserver(function () {
      injectWallTranslateButtons();
    });
    var wallContainer = document.querySelector('.commentscomponent')
      || document.querySelector('ul.highlighted-list')
      || document.querySelector('main')
      || document.body;
    wallObserver.observe(wallContainer, { childList: true, subtree: true });

    log.info('Wall translation initialized');
  }

  // =========================================
  //   Hydration-aware Startup
  // =========================================
  // RAWeb uses hydrateRoot in production (SSR).
  // During hydration, the DOM is replaced/reconciled by React.
  // We must wait for hydration to complete before injecting.

  function waitForHydration(timeout) {
    return new Promise(function (resolve) {
      var el = document.getElementById("app");
      // No app element = not an Inertia page, run immediately
      if (!el) return resolve();

      // If the app already has React's internal fiber key, it's hydrated
      var hasReactFiber = Object.keys(el).some(function (k) {
        return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
      });
      if (hasReactFiber) return resolve();

      // Otherwise, observe for React to attach
      var observer = new MutationObserver(function () {
        var hydrated = Object.keys(el).some(function (k) {
          return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
        });
        if (hydrated) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(el, { childList: true, subtree: true, attributes: true });

      setTimeout(function () {
        observer.disconnect();
        resolve(); // proceed anyway after timeout
      }, timeout || 5000);
    });
  }

  // =========================================
  //     SPA Navigation Support
  // =========================================
  var _lastInitUrl = null;
  var _initTimer = null;

  function runAll() {
    var url = location.pathname + location.search;
    if (_lastInitUrl === url) {
      log.debug("Skipping duplicate init for: " + url);
      return;
    }
    _lastInitUrl = url;
    init();
    initUserPagination();
    initWallLinkify();
    initWallTranslation();
  }

  function scheduleInit(delay) {
    if (_initTimer) clearTimeout(_initTimer);
    _initTimer = setTimeout(function () {
      _initTimer = null;
      runAll();
    }, delay);
  }

  // Run on initial page load (after hydration)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      waitForHydration(5000).then(function () { scheduleInit(0); });
    });
  } else {
    waitForHydration(5000).then(function () { scheduleInit(0); });
  }

  // Re-run on Inertia SPA navigations
  document.addEventListener("inertia:navigate", function () {
    _lastInitUrl = null; // allow re-init on actual navigation
    scheduleInit(300);
  });
})();
