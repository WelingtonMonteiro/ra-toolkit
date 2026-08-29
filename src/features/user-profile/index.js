/**
 * The /user/{name} dashboard: pagination, stats, insights, timeline.
 */

import { injectProfileStyles } from './styles.js';
import { renderGames, renderPaginator } from './game-list.js';
import { fetchDashboardData } from './insights/data.js';
import { renderProgressionDashboard } from './insights/progression.js';
import { renderSkeletonCards } from './skeletons.js';
import { enhanceUserStats } from './user-stats.js';
import { escapeHtml } from '../../core/dom.js';
import { gmFetch } from '../../core/gm.js';
import { log } from '../../core/log.js';
import { getRarityTier } from '../../core/rarity.js';

// =========================================
//   User Profile Pagination (standalone)
// =========================================
// Runs outside init() to also work on legacy Blade pages
export async function initUserPagination() {
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

  injectProfileStyles();

  // Remove existing "more" link if present (it's a sibling of componentRoot inside outerWrapper)
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

  enhanceUserStats();

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









  renderProgressionDashboard();
  fetchDashboardData({
    targetUser: targetUser,
    apiKey: apiKey,
    statsRow: statsRow,
    almostSection: almostSection,
    streakSection: streakSection,
    rarestSection: rarestSection,
    timelineSection: timelineSection,
  });


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


  // Cache for fetched achievement data per game

  // Map GameID → { awardKind, awardedAt } from API_GetUserAwards
  var gameAwardsMap = {};





  // ITEMS_PER_PAGE changes when the user picks a different page size, so read
  // it through a getter rather than capturing the value once.
  const paginatorContext = {
    get itemsPerPage() { return ITEMS_PER_PAGE; },
    get hasMore() { return lastKnownHasMore; },
    set hasMore(value) { lastKnownHasMore = value; },
    get highestKnownPage() { return highestKnownPage; },
    set highestKnownPage(value) { highestKnownPage = value; },
    loadPage: function (offset) { doLoadPage(offset); },
  };

  function doLoadPage(offset) {
    currentOffset = offset;

    // Page 1: show original server-rendered content (only if default 5 items)
    if (offset === 0 && ITEMS_PER_PAGE === 5) {
      existingList.style.display = "";
      gamesList.innerHTML = '';
      recentH2.textContent = originalHeadingText;
      renderPaginator(paginationDiv, 0, true, paginatorContext);
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
        renderGames(games, { targetUser: targetUser, apiKey: apiKey, enableRarityIndicator: enableRarityIndicator });
        renderPaginator(paginationDiv, offset, hasMore, paginatorContext);

        // Update heading (keep clean, range info is in paginator)
        if (games.length > 0) {
          recentH2.textContent = 'Recently Played Games';
        }

        recentH2.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function (err) {
        gamesList.innerHTML = '<div style="color:#ef4444;padding:12px;">Failed to load games: ' + escapeHtml(err.message) + '</div>';
      });
  }

  // Initial paginator (page 1 already visible from server render)
  renderPaginator(paginationDiv, 0, true, paginatorContext);

  log.info("User pagination initialized for: " + targetUser);
}
