/**
 * The player's rarest recent unlocks (paginated, sortable, with per-card rarity %).
 */

import { escapeHtml } from '../../../core/dom.js';
import { getRarityTier } from '../../../core/rarity.js';
import { fetchGameRarityData } from '../achievements.js';

export function renderRarestAchievements(achievements, rarestSection, ctx) {
  ctx = ctx || {};
  var targetUser = ctx.targetUser;
  var apiKey = ctx.apiKey;
  var enableRarityIndicator = ctx.enableRarityIndicator;

  var list = rarestSection.querySelector('.enhanced-rare-list');
  var paginationDiv = rarestSection.querySelector('#enhanced-rare-pagination');
  var sortSlot = rarestSection.querySelector('#enhanced-rare-sort');

  if (!achievements || achievements.length === 0) {
    list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No achievement data available.</div>';
    if (paginationDiv) paginationDiv.innerHTML = '';
    if (sortSlot) sortSlot.innerHTML = '';
    return;
  }

  // The multiplier (TrueRatio / Points) is what the "x3.4" on each card shows
  // and the better measure of "rarest": raw TrueRatio rewards expensive
  // achievements, while the multiplier measures how far above its point
  // value one actually is (same rule the mobile app's rarest list uses).
  function multiplierOf(a) {
    var trueRatio = parseInt(a.TrueRatio, 10) || 0;
    var points = parseInt(a.Points, 10) || 0;
    return trueRatio > 0 && points > 0 ? trueRatio / points : null;
  }

  // Base set: only achievements with a usable multiplier, de-duplicated by ID.
  var base = achievements.slice().filter(function (a) {
    return multiplierOf(a) !== null;
  });
  var seen = {};
  base = base.filter(function (a) {
    if (seen[a.AchievementID]) return false;
    seen[a.AchievementID] = true;
    return true;
  });

  if (base.length === 0) {
    list.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No rarity data available.</div>';
    if (paginationDiv) paginationDiv.innerHTML = '';
    if (sortSlot) sortSlot.innerHTML = '';
    return;
  }

  var itemsPerPage = 5;
  var currentPage = 1;
  var sortMode = 'rarest'; // 'rarest' | 'common' | 'recent'

  function sortedList() {
    var arr = base.slice();
    if (sortMode === 'common') {
      arr.sort(function (a, b) {
        var byRatio = multiplierOf(a) - multiplierOf(b);
        return byRatio !== 0 ? byRatio : (parseInt(a.TrueRatio, 10) || 0) - (parseInt(b.TrueRatio, 10) || 0);
      });
    } else if (sortMode === 'recent') {
      arr.sort(function (a, b) {
        var da = a.Date || '';
        var db = b.Date || '';
        return da > db ? -1 : da < db ? 1 : 0;
      });
    } else {
      arr.sort(function (a, b) {
        var byRatio = multiplierOf(b) - multiplierOf(a);
        // Same ratio: the costlier (higher TrueRatio) achievement is the harder one.
        return byRatio !== 0 ? byRatio : (parseInt(b.TrueRatio, 10) || 0) - (parseInt(a.TrueRatio, 10) || 0);
      });
    }
    return arr;
  }

  function fillRarityBadge(tierSlot, gameId, achievementId) {
    if (!enableRarityIndicator || !gameId) return;
    fetchGameRarityData(gameId, targetUser, apiKey).then(function (data) {
      var achData = (data.achievements || {})[String(achievementId)] || (data.achievements || {})[achievementId];
      if (!achData || !data.numPlayers) return;
      var numAwarded = parseInt(achData.NumAwarded, 10) || 0;
      if (!numAwarded) return;
      var pct = (numAwarded / data.numPlayers) * 100;
      var tier = getRarityTier(pct);
      var badgeStyle = 'display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:4px;'
        + 'font-size:0.65rem;font-weight:600;letter-spacing:0.02em;white-space:nowrap;line-height:1.6;'
        + 'color:' + tier.color + ';background:' + tier.bg + ';border:1px solid ' + tier.color + '30;';
      var dotStyle = 'width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block;background:' + tier.color + ';';
      tierSlot.innerHTML = '<span style="' + badgeStyle + '"><span style="' + dotStyle + '"></span>'
        + tier.label + ' · ' + pct.toFixed(1) + '%</span>';
    }).catch(function () {});
  }

  function renderItems() {
    var sorted = sortedList();
    var totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * itemsPerPage;
    var pageItems = sorted.slice(start, start + itemsPerPage);

    list.innerHTML = '';
    pageItems.forEach(function (a) {
      var badgeUrl = a.BadgeURL || '';
      if (badgeUrl && !badgeUrl.startsWith('http')) {
        badgeUrl = 'https://media.retroachievements.org' + badgeUrl;
      }
      var trueRatio = parseInt(a.TrueRatio, 10) || 0;
      var points = parseInt(a.Points, 10) || 0;
      var ratio = trueRatio > 0 && points > 0 ? (trueRatio / points).toFixed(1) : '—';

      var item = document.createElement('a');
      item.className = 'enhanced-rare-item';
      item.href = '/achievement/' + a.AchievementID;
      item.innerHTML =
        '<img class="enhanced-rare-badge" src="' + escapeHtml(badgeUrl) + '" alt="" loading="lazy">'
        + '<div class="enhanced-rare-info">'
          + '<div class="enhanced-rare-title" title="' + escapeHtml(a.Title || '') + '">' + escapeHtml(a.Title || '') + '</div>'
          + '<div class="enhanced-rare-meta">' + escapeHtml(a.GameTitle || '') + ' · ' + points + ' pts</div>'
          + '<div class="enhanced-rare-tier"></div>'
        + '</div>'
        + '<div class="enhanced-rare-ratio" title="TrueRatio: ' + trueRatio + ' (x' + ratio + ' rarity)">'
          + 'x' + ratio
        + '</div>';
      list.appendChild(item);

      fillRarityBadge(item.querySelector('.enhanced-rare-tier'), a.GameID, a.AchievementID);
    });

    renderPager(totalPages);
  }

  function renderPager(totalPages) {
    if (!paginationDiv) return;
    paginationDiv.innerHTML = '';
    paginationDiv.className = 'enhanced-pagination';

    function addBtn(label, page, disabled, isActive) {
      var btn = document.createElement('button');
      btn.textContent = label;
      btn.disabled = !!disabled;
      if (isActive) btn.className = 'active';
      if (!disabled) {
        btn.addEventListener('click', function () {
          currentPage = page;
          renderItems();
        });
      }
      paginationDiv.appendChild(btn);
    }

    addBtn('First', 1, currentPage === 1, false);
    addBtn('❮', currentPage - 1, currentPage === 1, false);

    var startP = Math.max(1, currentPage - 2);
    var endP = Math.min(totalPages, startP + 4);
    if (endP - startP < 4) startP = Math.max(1, endP - 4);

    if (startP > 1) {
      var dots = document.createElement('span');
      dots.className = 'page-info';
      dots.textContent = '...';
      paginationDiv.appendChild(dots);
    }

    for (var p = startP; p <= endP; p++) {
      addBtn(String(p), p, false, p === currentPage);
    }

    if (endP < totalPages) {
      var dotsAfter = document.createElement('span');
      dotsAfter.className = 'page-info';
      dotsAfter.textContent = '...';
      paginationDiv.appendChild(dotsAfter);
    }

    addBtn('❯', currentPage + 1, currentPage === totalPages, false);

    // Page range info (e.g. "1–5")
    var rangeStart = (currentPage - 1) * itemsPerPage + 1;
    var rangeEnd = Math.min(base.length, currentPage * itemsPerPage);
    var rangeSpan = document.createElement('span');
    rangeSpan.className = 'page-info';
    rangeSpan.style.cssText = 'margin-left:8px;font-size:0.75rem;color:#a3a3a3;';
    rangeSpan.textContent = '(' + rangeStart + '–' + rangeEnd + ')';
    paginationDiv.appendChild(rangeSpan);

    // Items per page selector, next to the paginator
    var perPageWrapper = document.createElement('div');
    perPageWrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:12px;';
    var perPageLabel = document.createElement('label');
    perPageLabel.textContent = 'Show:';
    perPageLabel.style.cssText = 'font-size:0.75rem;color:#a3a3a3;';
    var perPageSelect = document.createElement('select');
    perPageSelect.style.cssText = 'background:#18181b;color:#e4e4e7;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.75rem;cursor:pointer;';
    [5, 10, 15, 20, 30, 50].forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      if (n === itemsPerPage) opt.selected = true;
      perPageSelect.appendChild(opt);
    });
    perPageSelect.addEventListener('change', function () {
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
    sortSlot.innerHTML = '';
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
    var label = document.createElement('label');
    label.textContent = 'Sort:';
    label.style.cssText = 'font-size:0.7rem;color:#a3a3a3;font-weight:400;text-transform:none;letter-spacing:normal;';
    var select = document.createElement('select');
    select.style.cssText = 'background:#18181b;color:#e4e4e7;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:0.75rem;cursor:pointer;';
    [
      { value: 'rarest', label: 'Rarest first' },
      { value: 'common', label: 'Least rare first' },
      { value: 'recent', label: 'Most recent' },
    ].forEach(function (opt) {
      var el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.value === sortMode) el.selected = true;
      select.appendChild(el);
    });
    select.addEventListener('change', function () {
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
