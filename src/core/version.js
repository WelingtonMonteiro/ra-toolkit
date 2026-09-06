/**
 * Version, changelog and the post-update popup.
 */

import { escapeHtml } from './dom.js';

// =========================================
//   Changelog Popup (after version update)
// =========================================
export var CURRENT_VERSION = "2.10.0";

export var CHANGELOG = [
  { version: "2.10.0", changes: [
    "Rarest Achievements: now computed from your entire achievement history (like the mobile app), not just the last 30 days",
    "Rarest Achievements: paginated (5 per page by default, configurable) with sort filters — Rarest first, Least rare first, Most recent",
    "Rarest Achievements: each card now shows its unlock-rate % and rarity tier badge",
    "Changelog popup: long changelogs now show 3 entries at a time, with a Show more / Show less toggle"
  ]},
  { version: "2.9.2", changes: [
    "Profile: fixed the Player Insights dashboard failing to load (stats, Almost There, streaks, rarest and the activity timeline stayed empty)",
    "Profile: Beaten/Mastered labels are back on the paginated games list",
    "Game page: fixed the arcade ROM search on Final Burn Neo and the RomsFun source",
    "Profile: fixed the console icons on the games list"
  ]},
  { version: "2.9.0", changes: [
    "Settings: restored the RA Toolkit panel on the new tabbed /settings page",
    "Settings: panel is re-attached when switching settings tabs",
    "Game page: ROMs and Speedrun sections are re-attached if React re-renders the sidebar",
    "User Stats: reads the renamed \"casual\" labels (RetroAchievements renamed softcore to casual)",
    "Game Awards: fixed the Beaten tab failing to render its badges",
    "Settings: the debug logging toggle is now only in a separate developer build"
  ]},
  { version: "2.8.2", changes: [
    "Achievement pages: linkify URLs and embed YouTube/images in achievement comments",
    "Achievement pages: added Translate button for achievement comments"
  ]},
  { version: "2.8.1", changes: [
    "Docs: added complete User Guide wiki with 18 pages covering all features"
  ]},
  { version: "2.8.0", changes: [
    "Games Page: new 'Most Mastered' tab on /games — browse games ranked by most players",
    "Games Page: card grid with rank, players, beaten count, achievements, and system tag",
    "Games Page: paginated results with internal API integration"
  ]},
  { version: "2.7.2", changes: [
    "Header: restored Achievements dropdown menu (Easy Achievements, Hardest Achievements)"
  ]},
  { version: "2.7.0", changes: [
    "Game Awards: new Mastered/Beaten tabs in sidebar section",
    "Game Awards: Beaten tab shows all beaten games with trophy icon and count",
    "Game Awards: hardcore badges shown in gold, softcore slightly dimmed"
  ]},
  { version: "2.6.5", changes: [
    "Rarest Achievements: items are now clickable links to /achievement/{id}",
    "Last Games Played: Beaten/Mastered award labels shown on all paginated pages (via awards API)",
    "Last Games Played: page range info moved from heading to pagination bar"
  ]},
  { version: "2.6.4", changes: [
    "Progression Status: replaced native section with modern dark-theme dashboard",
    "Progression Status: KPI grid (total games, beaten, mastered, % completed)",
    "Progression Status: donut overview chart + completion % bar chart by console",
    "Progression Status: animated bubble / treemap canvas visualization with filter",
    "Progression Status: Mastered vs Beaten bar chart (Chart.js)",
    "Added Chart.js @require for chart rendering"
  ]},
  { version: "2.6.3", changes: [
    "User Stats: recent activity and softcore sections now use metric cards with icons (consistent with primary stats)",
    "User Stats: CSS refactored to generic class names (stats-grid-3/4, metric-card, card-top, etc.)",
    "Activity Timeline: all 3 modes (Achievements, Mastered, Beaten) active by default"
  ]},
  { version: "2.6.2", changes: [
    "Activity Timeline: multi-select now uses priority coloring per cell (Mastered > Beaten > Achievements) instead of single emerald color",
    "Activity Timeline: each day shows the color of the highest-priority event type present"
  ]},
  { version: "2.6.1", changes: [
    "User Stats: redesigned with clean 3-section layout (primary grid, recent activity, softcore)",
    "User Stats: new metric cards with icons, weighted/softcore sub-values",
    "Removed Console Breakdown section (redundant with native Progression Status)"
  ]},
  { version: "2.6.0", changes: [
    "Enhanced User Stats: replaces native User Stats with beautiful card-style layout",
    "User Stats: primary stats (Points, Rank, Achievements, RetroRatio, Games Beaten) with icons and colors",
    "User Stats: expandable secondary stats (7/30 day points, avg points/week, avg completion, softcore)"
  ]},
  { version: "2.5.5", changes: [
    "Activity Timeline: rich custom tooltip with date header and per-mode icon breakdown",
    "Activity Timeline: tooltip shows \ud83c\udfc6 \ud83d\udc51 \u2705 icons next to each line"
  ]},
  { version: "2.5.4", changes: [
    "Activity Timeline: multi-select toggle buttons — select multiple modes (Achievements + Mastered + Beaten) to see combined heatmap",
    "Activity Timeline: combined mode uses emerald green color scheme",
    "Activity Timeline: tooltip and footer show per-mode breakdown when multiple modes are active"
  ]},
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

export function showChangelogPopup() {
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

    // Flatten every version's changes into one list, so "show 3 at a time"
    // paginates by individual feature/fix rather than by version block
    // (a single version can carry far more than 3 entries).
    var flatItems = [];
    newChanges.forEach(function (entry) {
      entry.changes.forEach(function (c) {
        flatItems.push({ version: entry.version, text: c });
      });
    });

    var PAGE_SIZE = 3;
    var visibleCount = Math.min(PAGE_SIZE, flatItems.length);

    function buildListHtml(count) {
      var html = '';
      var openVersion = null;
      for (var i = 0; i < count; i++) {
        var item = flatItems[i];
        if (item.version !== openVersion) {
          if (openVersion !== null) html += '</ul></div>';
          html += '<div style="margin-bottom:10px;"><strong style="color:var(--ra-accent,#3b82f6);">v'
            + escapeHtml(item.version) + '</strong><ul style="margin:4px 0 0 16px;padding:0;list-style:disc;">';
          openVersion = item.version;
        }
        html += '<li style="margin:2px 0;">' + escapeHtml(item.text) + '</li>';
      }
      if (openVersion !== null) html += '</ul></div>';
      return html;
    }

    var overlay = document.createElement('div');
    overlay.id = 'enhanced-changelog-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);';
    overlay.innerHTML =
      '<div style="background:var(--box-bg-color,#232323);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;color:var(--text-color,#c8c8c8);font-size:0.9rem;box-shadow:0 8px 32px rgba(0,0,0,0.5);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
      + '<h3 style="margin:0;font-size:1.2rem;color:var(--heading-color,#d2d2d2);">🎮 RA Toolkit Updated!</h3>'
      + '<button id="enhanced-changelog-close" style="background:none;border:none;color:var(--text-color,#c8c8c8);font-size:1.4rem;cursor:pointer;padding:0 4px;line-height:1;">&times;</button>'
      + '</div>'
      + '<div id="enhanced-changelog-list" style="line-height:1.5;"></div>'
      + '<div style="text-align:center;margin-top:8px;">'
      + '<button id="enhanced-changelog-toggle" style="padding:4px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--ra-accent,#3b82f6);font-size:0.8rem;cursor:pointer;"></button>'
      + '</div>'
      + '<div style="text-align:center;margin-top:12px;">'
      + '<button id="enhanced-changelog-ok" style="padding:8px 24px;border-radius:8px;border:none;background:var(--ra-accent,#3b82f6);color:#fff;font-size:0.9rem;cursor:pointer;font-weight:600;">Got it!</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    var listEl = document.getElementById('enhanced-changelog-list');
    var toggleBtn = document.getElementById('enhanced-changelog-toggle');

    function renderList() {
      listEl.innerHTML = buildListHtml(visibleCount);
      if (flatItems.length <= PAGE_SIZE) {
        toggleBtn.style.display = 'none';
        return;
      }
      toggleBtn.style.display = '';
      if (visibleCount < flatItems.length) {
        toggleBtn.textContent = 'Show more (+' + Math.min(PAGE_SIZE, flatItems.length - visibleCount) + ')';
      } else {
        toggleBtn.textContent = 'Show less';
      }
    }

    toggleBtn.addEventListener('click', function () {
      visibleCount = visibleCount < flatItems.length
        ? Math.min(visibleCount + PAGE_SIZE, flatItems.length)
        : Math.min(PAGE_SIZE, flatItems.length);
      renderList();
    });

    renderList();

    function closePopup() { overlay.remove(); }
    document.getElementById('enhanced-changelog-close').addEventListener('click', closePopup);
    document.getElementById('enhanced-changelog-ok').addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePopup(); });
  });
}
