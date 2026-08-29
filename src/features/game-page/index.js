/**
 * Everything injected on /game/{id}: ROMs, speedruns, rarity, translation.
 */

import { escapeHtml, parseHtml, parseXml } from '../../core/dom.js';
import { gmFetch } from '../../core/gm.js';
import { getInertiaProps } from '../../core/inertia.js';
import { log } from '../../core/log.js';
import { getRarityTier } from '../../core/rarity.js';
import { keepSidebarSectionsAttached } from '../../core/reattach.js';
import { getCachedRomResults, setCachedRomResults } from '../../core/rom-cache.js';
import { translateWithRateLimit } from '../../core/translate.js';
import { waitForElement } from '../../core/wait.js';
import { myrientCollectionDict } from './collections.js';
import { applyGamePageBackground, applyGlassEffect } from './background.js';
import { injectGuideLink } from './guide-link.js';
import { fetchGameHashes, getHashBadge } from './hashes.js';
import { injectRarityIndicators } from './rarity-badges.js';
import { injectTranslateButtons } from './translate-buttons.js';
import { createDlcs, createDownloads, createNoRomsNotification } from './rom-list.js';
import { searchArchive, searchArchiveDlc, searchArcade, searchNoIntro2016 } from './rom-sources/archive.js';
import { searchEmuparadise } from './rom-sources/emuparadise.js';
import { chainSearchMyrient, searchMyrient } from './rom-sources/myrient.js';
import { searchRomsFun } from './rom-sources/romsfun.js';
import { initSpeedrunSection } from './speedrun.js';
import { injectCollapseStyle, makeCollapsible } from './collapsible.js';
import { hideLoading, showLoading } from './loading.js';
import { parseIso8601, toEmbedUrl } from './media.js';
import {
  compare as compareBase,
  extractRegions,
  normalizeRomName,
  refinedCompare as refinedCompareBase,
  removeExt,
  titleOnlyRomName,
} from './rom-name.js';
import { RAConsole, SRConsole } from './consoles.js';

// =========================================
//            Game Page
// =========================================
// Match /game/{id} routes
export async function renderGamePage(config) {
  // These close over the console name, which every comparison needs.
  const refinedCompare = (a, b) => refinedCompareBase(a, b, consoleName);
  const compare = (a, b) => compareBase(a, b, consoleName);

  const { enableSpeedrun, enableRomSearch, enableCustomBG, enableGameplayVideo, enableEmuparadise, prioritizeEmuparadise, enableGlassEffect, enableHashCheck, enableRomsFun, enableDebugLog, enableRarityIndicator, translateLang, accentColor } = config;

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

  applyGamePageBackground(gameImg, enableCustomBG);
  applyGlassEffect(enableGlassEffect);

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

    keepSidebarSectionsAttached(injectionTarget, [divRoms, divSpeedruncom]);
  }



  initSpeedrunSection({
    gameTitle: gameTitle,
    consoleName: consoleName,
    container: divSpeedruncom,
    enableSpeedrun: enableSpeedrun,
    enableGameplayVideo: enableGameplayVideo,
  });

  injectGuideLink(props, divRoms, injectionTarget);

  // Inject translate buttons after the page has rendered achievements
  // Use a small delay + MutationObserver to catch dynamically loaded achievement lists
  setTimeout(function () { injectTranslateButtons(translateLang); }, 1500);
  var achObserver = new MutationObserver(function () {
    injectTranslateButtons(translateLang);
    if (enableRarityIndicator) injectRarityIndicators();
  });
  var mainContent = document.querySelector("main") || document.body;
  achObserver.observe(mainContent, { childList: true, subtree: true });

  if (enableRarityIndicator) {
    setTimeout(injectRarityIndicators, 1500);
  }
  // Stop observing after 30s to avoid performance overhead
  setTimeout(function () { achObserver.disconnect(); }, 30000);

  var knownHashes = [];

  // Everything the ROM source and renderer modules need. `results` is mutated
  // in place, so the array identity has to be preserved.
  const romContext = {
    gameTitle: gameTitle,
    consoleName: consoleName,
    results: results,
    resultsDlcs: resultsDlcs,
    collection: collection,
    compare: compare,
    refinedCompare: refinedCompare,
    divRoms: divRoms,
    knownHashes: knownHashes,
  };

  // =========================================
  //              Rom Search
  // =========================================
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
          results.length = 0;
          results.push.apply(results, cached.results);
          resultsDlcs.length = 0;
          resultsDlcs.push.apply(resultsDlcs, cached.resultsDlcs || []);
          Object.assign(collection, cached.collection || {});
          log.info("[Cache] Using cached ROM results (" + results.length + " ROMs)");
          // Still need hashes for badges
          return fetchGameHashes(gameId, enableHashCheck).then(function (hashes) {
            knownHashes = hashes;
          romContext.knownHashes = hashes;
            romContext.knownHashes = hashes;
          }).catch(function () { knownHashes = []; romContext.knownHashes = []; }).then(function () {
            if (results.length > 0) {
              createDownloads(romContext);
            } else {
              createNoRomsNotification(romContext);
            }
            if (resultsDlcs.length > 0) createDlcs(romContext);
          });
        }

        // No cache — run search chain
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
      var SEARCH_TIMEOUT_MS = 30000; // 30 seconds max for entire search

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
      })
      .then(() => {
        if (enableEmuparadise && results.length === 0) {
          collection.name = "Emuparadise";
          collection.url = "https://www.emuparadise.me/roms-isos-games.php";
          return searchEmuparadise(romContext);
        }
      })
      .then(() => {
        if (enableRomsFun && results.length === 0) {
          collection.name = "RomsFun";
          collection.url = "https://romsfun.com/roms/";
          return searchRomsFun(romContext);
        }
      })
      .then(() => {
        if (consoleName === RAConsole.PSP)
          return searchArchiveDlc("https://archive.org/download/PSP-DLC/%5BNo-Intro%5D%20PSP%20DLC/", romContext);
      })
      .then(() => {
        // Fetch hashes before rendering so we can badge matching ROMs
        return fetchGameHashes(gameId, enableHashCheck).then(function (hashes) {
          knownHashes = hashes;
          romContext.knownHashes = hashes;
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
          createDownloads(romContext);
        } else {
          log.info("No ROMs found");
          createNoRomsNotification(romContext);
        }
        if (resultsDlcs.length > 0) createDlcs(romContext);
      })
      .catch(function (err) {
        hideLoading();
        log.warn("ROM search failed: " + err.message);
        if (results.length > 0) {
          setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collection.name, collection.url);
          createDownloads(romContext);
        } else {
          createNoRomsNotification(romContext);
        }
      });
      }); // end getCachedRomResults.then
    } else {
      log.debug("Searching roms for this system not supported: " + consoleName);
    }
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


  // =========================================
  //           Utility Functions
  // =========================================

}
