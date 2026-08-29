/**
 * Mastered/Beaten tabs in the profile's Game Awards section.
 */

import { escapeHtml } from '../../core/dom.js';
import { gmFetch } from '../../core/gm.js';
import { log } from '../../core/log.js';

// =========================================
//   Game Awards — Beaten Tab
// =========================================
export async function initGameAwardsBeaten() {
  var page = location.pathname;
  var userMatch = page.match(/^\/user\/([^\/?#]+)/);
  if (!userMatch) return;

  var targetUser = decodeURIComponent(userMatch[1]);
  var apiKey = await GM_getValue("raApiKey", "");
  if (!apiKey) return;

  // Find the native Game Awards section in the sidebar
  var gameAwardsDiv = document.getElementById('gameawards');
  if (!gameAwardsDiv) return;

  // Already injected?
  if (document.getElementById('re-game-awards-tabs')) return;

  var heading = gameAwardsDiv.querySelector('h3');
  var nativeGrid = gameAwardsDiv.querySelector('.component');
  if (!heading || !nativeGrid) return;

  // Parse native counters from heading
  var nativeCounters = heading.querySelector('.grow');
  var nativeCounterSpans = heading.querySelectorAll('.cursor-help');

  // Save reference to native heading counters for tab switching
  var headingCountersContainer = heading;
  var originalCountersHtml = '';
  // Capture all counter divs (mastered + completed)
  var counterDivs = heading.querySelectorAll('.cursor-help');
  counterDivs.forEach(function (el) { originalCountersHtml += el.outerHTML; });

  // Inject styles
  if (!document.getElementById('re-game-awards-style')) {
    var style = document.createElement('style');
    style.id = 're-game-awards-style';
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

  // Build tabs UI
  var tabsDiv = document.createElement('div');
  tabsDiv.id = 're-game-awards-tabs';
  tabsDiv.className = 're-awards-tabs';

  var masteredTab = document.createElement('button');
  masteredTab.className = 're-awards-tab active';
  masteredTab.innerHTML = '👑 Mastered <span class="re-tab-count" id="re-mastered-count">-</span>';

  var beatenTab = document.createElement('button');
  beatenTab.className = 're-awards-tab';
  beatenTab.innerHTML = '🏆 Beaten <span class="re-tab-count" id="re-beaten-count">-</span>';

  tabsDiv.appendChild(masteredTab);
  tabsDiv.appendChild(beatenTab);

  // Insert tabs before the grid
  nativeGrid.parentNode.insertBefore(tabsDiv, nativeGrid);

  // Create beaten grid (hidden by default) — same classes as native grid
  var beatenGrid = document.createElement('div');
  beatenGrid.className = 'component w-full place-content-center bg-embed gap-2 grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] xl:rounded xl:py-2';
  beatenGrid.style.display = 'none';
  beatenGrid.innerHTML = '<div class="re-beaten-empty">Loading...</div>';
  nativeGrid.parentNode.insertBefore(beatenGrid, nativeGrid.nextSibling);

  // Count mastered from native section
  var masteredBadges = nativeGrid.querySelectorAll('.goldimage');
  var completedBadges = nativeGrid.querySelectorAll('.badgeimg.siteawards');
  var masteredCount = masteredBadges.length + completedBadges.length;
  var masteredCountEl = document.getElementById('re-mastered-count');
  if (masteredCountEl) masteredCountEl.textContent = String(masteredCount);

  // Variables to hold counts for heading update
  var beatenTotalCount = 0;
  var masteredTotalCount = masteredCount;
  var beatenHcCount = 0;
  var beatenScCount = 0;

  function updateHeadingCounters(mode) {
    // Remove existing counter divs from heading
    var existing = headingCountersContainer.querySelectorAll('.cursor-help');
    existing.forEach(function (el) { el.remove(); });

    if (mode === 'mastered') {
      // Restore original mastered/completed counters
      var temp = document.createElement('div');
      temp.innerHTML = originalCountersHtml;
      while (temp.firstChild) {
        headingCountersContainer.appendChild(temp.firstChild);
      }
    } else {
      // Show beaten counters
      if (beatenHcCount > 0) {
        var hcDiv = document.createElement('div');
        hcDiv.className = 'cursor-help flex gap-x-1 text-sm';
        hcDiv.title = beatenHcCount + (beatenHcCount === 1 ? ' game' : ' games') + ' beaten';
        hcDiv.innerHTML = '<div class="text-2xs">🏆</div><div class="numitems">' + beatenHcCount + '</div>';
        headingCountersContainer.appendChild(hcDiv);
      }
      if (beatenScCount > 0) {
        var scDiv = document.createElement('div');
        scDiv.className = 'cursor-help flex gap-x-1 text-sm';
        scDiv.title = beatenScCount + (beatenScCount === 1 ? ' game' : ' games') + ' beaten (casual)';
        scDiv.innerHTML = '<div class="text-2xs">🎖️</div><div class="numitems">' + beatenScCount + '</div>';
        headingCountersContainer.appendChild(scDiv);
      }
      if (beatenHcCount === 0 && beatenScCount === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'cursor-help flex gap-x-1 text-sm';
        emptyDiv.title = '0 games beaten';
        emptyDiv.innerHTML = '<div class="text-2xs">🏆</div><div class="numitems">0</div>';
        headingCountersContainer.appendChild(emptyDiv);
      }
    }
  }

  // Tab switching
  masteredTab.addEventListener('click', function () {
    masteredTab.classList.add('active');
    beatenTab.classList.remove('active');
    nativeGrid.style.display = '';
    beatenGrid.style.display = 'none';
    updateHeadingCounters('mastered');
  });

  beatenTab.addEventListener('click', function () {
    beatenTab.classList.add('active');
    masteredTab.classList.remove('active');
    nativeGrid.style.display = 'none';
    beatenGrid.style.display = '';
    updateHeadingCounters('beaten');
  });

  // Fetch beaten games from API
  var awardsUrl = 'https://retroachievements.org/API/API_GetUserAwards.php'
    + '?u=' + encodeURIComponent(targetUser)
    + '&y=' + encodeURIComponent(apiKey);

  gmFetch(awardsUrl, 15000).then(function (resp) {
    var data = JSON.parse(resp.responseText);
    var awards = data.VisibleUserAwards || [];

    // Filter beaten awards (exclude events)
    var beatenAwards = awards.filter(function (a) {
      return (a.AwardType || '').toLowerCase() === 'game beaten'
        && a.ConsoleName !== 'Events';
    });

    // Also update mastered count from API for accuracy
    var masteredAwards = awards.filter(function (a) {
      var aType = (a.AwardType || '').toLowerCase();
      return (aType === 'mastery/completion' || aType === 'mastery')
        && a.ConsoleName !== 'Events';
    });
    masteredTotalCount = masteredAwards.length;
    if (masteredCountEl) masteredCountEl.textContent = String(masteredAwards.length);

    // Count beaten by mode
    beatenHcCount = beatenAwards.filter(function (a) { return parseInt(a.AwardDataExtra, 10) === 1; }).length;
    beatenScCount = beatenAwards.filter(function (a) { return parseInt(a.AwardDataExtra, 10) !== 1; }).length;
    beatenTotalCount = beatenAwards.length;

    var beatenCountEl = document.getElementById('re-beaten-count');
    if (beatenCountEl) beatenCountEl.textContent = String(beatenAwards.length);

    // Render beaten badges
    beatenGrid.innerHTML = '';
    if (beatenAwards.length === 0) {
      beatenGrid.innerHTML = '<div class="re-beaten-empty">No beaten games yet.</div>';
      return;
    }

    beatenAwards.forEach(function (award) {
      var gameId = award.AwardData;
      var imageIcon = award.ImageIcon || '';
      var isHardcore = parseInt(award.AwardDataExtra, 10) === 1;
      var imgSrc = imageIcon ? 'https://media.retroachievements.org' + imageIcon : '';
      var imgClass = isHardcore ? 'goldimage' : 'badgeimg siteawards';

      // Use same structure as native mastered badges with Alpine.js tooltip
      var wrapper = document.createElement('span');
      wrapper.className = 'inline';
      wrapper.setAttribute('x-data', "tooltipComponent($el, { dynamicType: 'game', dynamicId: '" + gameId + "', dynamicContext: '" + escapeHtml(targetUser) + "' })");
      // setAttribute() rejects "@mouseover" (not a valid XML Name), which
      // aborted the whole render. Alpine's long form is a valid name.
      wrapper.setAttribute('x-on:mouseover', 'showTooltip($event)');
      wrapper.setAttribute('x-on:mouseleave', 'hideTooltip');
      wrapper.setAttribute('x-on:mousemove', 'trackMouseMovement($event)');
      wrapper.innerHTML = '<a class="inline-block" href="/game/' + gameId + '">'
        + '<img loading="lazy" decoding="async" width="48" height="48"'
        + ' src="' + escapeHtml(imgSrc) + '"'
        + ' alt="" class="' + imgClass + '">'
        + '</a>';

      beatenGrid.appendChild(wrapper);
    });

    // Initialize Alpine.js on the dynamically created tooltip elements
    if (window.Alpine && Alpine.initTree) {
      Alpine.initTree(beatenGrid);
    }

  }).catch(function (err) {
    beatenGrid.innerHTML = '<div class="re-beaten-empty">Failed to load beaten games.</div>';
    log.warn('Game Awards Beaten fetch failed: ' + err.message);
  });
}
