/**
 * The Most Mastered tab on /games.
 */

import { escapeHtml } from '../../core/dom.js';
import { log } from '../../core/log.js';

// =========================================
//   Games Page — Most Mastered Filter Tab
// =========================================
export async function initGamesMostMastered() {
  if (!/^\/games\/?$/i.test(location.pathname)) return;

  // Already injected?
  if (document.getElementById('re-most-mastered-tab')) return;

  // Wait for the React toolbar to render (the bg-embed filter row)
  var toolbar = null;
  for (var attempt = 0; attempt < 20; attempt++) {
    toolbar = document.querySelector('div.flex.w-full.flex-col.justify-between.gap-2');
    if (toolbar) break;
    await new Promise(function (r) { setTimeout(r, 300); });
  }
  if (!toolbar) {
    log.warn('Most Mastered: toolbar not found');
    return;
  }

  // Inject styles
  if (!document.getElementById('re-most-mastered-style')) {
    var style = document.createElement('style');
    style.id = 're-most-mastered-style';
    style.textContent = [
      '.re-mm-tabs{display:flex;gap:0;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);margin-bottom:4px}',
      '.re-mm-tab{flex:none;padding:6px 14px;font-size:0.8rem;font-weight:600;text-align:center;cursor:pointer;background:transparent;color:#a3a3a3;border:none;transition:all 0.2s;display:flex;align-items:center;gap:6px}',
      '.re-mm-tab:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}',
      '.re-mm-tab.active{background:rgba(255,255,255,0.1);color:#e4e4e7}',
      '.re-mm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:8px 0}',
      '.re-mm-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);transition:all 0.2s}',
      '.re-mm-card:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15)}',
      '.re-mm-card img{width:48px;height:48px;border-radius:6px;object-fit:cover}',
      '.re-mm-card-info{flex:1;min-width:0}',
      '.re-mm-card-title{font-size:0.85rem;font-weight:600;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;display:block}',
      '.re-mm-card-title:hover{color:#60a5fa;text-decoration:underline}',
      '.re-mm-card-meta{font-size:0.72rem;color:#737373;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap}',
      '.re-mm-card-badge{font-size:0.65rem;padding:1px 6px;border-radius:10px;display:inline-flex;align-items:center;gap:3px}',
      '.re-mm-badge-players{background:rgba(59,130,246,0.15);color:#60a5fa}',
      '.re-mm-badge-beaten{background:rgba(34,197,94,0.15);color:#4ade80}',
      '.re-mm-badge-achievements{background:rgba(234,179,8,0.15);color:#facc15}',
      '.re-mm-rank{font-size:0.75rem;font-weight:700;color:#525252;min-width:24px;text-align:center}',
      '.re-mm-loading{text-align:center;padding:24px;color:#737373;font-size:0.85rem}',
      '.re-mm-pagination{display:flex;justify-content:center;gap:6px;padding:12px 0}',
      '.re-mm-page-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#a3a3a3;cursor:pointer;font-size:0.8rem;transition:all 0.2s}',
      '.re-mm-page-btn:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}',
      '.re-mm-page-btn.active{background:rgba(255,255,255,0.1);color:#e4e4e7;font-weight:600}',
      '.re-mm-page-btn:disabled{opacity:0.4;cursor:default}',
      '.re-mm-system-tag{font-size:0.65rem;padding:1px 5px;border-radius:4px;background:rgba(139,92,246,0.15);color:#a78bfa}',
      '@media (prefers-color-scheme:light){',
      '  .re-mm-tab{color:#525252}',
      '  .re-mm-tab:hover,.re-mm-tab.active{background:rgba(0,0,0,0.06);color:#1a1a1a}',
      '  .re-mm-card{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.08)}',
      '  .re-mm-card:hover{background:rgba(0,0,0,0.06);border-color:rgba(0,0,0,0.15)}',
      '  .re-mm-card-title{color:#1a1a1a}',
      '  .re-mm-card-title:hover{color:#2563eb}',
      '  .re-mm-card-meta{color:#737373}',
      '  .re-mm-rank{color:#a3a3a3}',
      '  .re-mm-page-btn{color:#525252;border-color:rgba(0,0,0,0.1)}',
      '  .re-mm-page-btn.active{background:rgba(0,0,0,0.06);color:#1a1a1a}',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // Build tabs bar
  var tabsBar = document.createElement('div');
  tabsBar.id = 're-most-mastered-tab';
  tabsBar.className = 're-mm-tabs';

  var defaultTab = document.createElement('button');
  defaultTab.className = 're-mm-tab active';
  defaultTab.textContent = '📋 All Games';

  var masteredTab = document.createElement('button');
  masteredTab.className = 're-mm-tab';
  masteredTab.innerHTML = '👑 Most Mastered';

  tabsBar.appendChild(defaultTab);
  tabsBar.appendChild(masteredTab);

  // Insert tabs above the toolbar
  toolbar.parentNode.insertBefore(tabsBar, toolbar);

  // Create container for most mastered results (hidden by default)
  var mmContainer = document.createElement('div');
  mmContainer.id = 're-most-mastered-container';
  mmContainer.style.display = 'none';

  // Find the existing table container (next sibling of toolbar)
  var existingTableWrapper = toolbar.parentNode;

  // Insert after the toolbar's parent
  existingTableWrapper.parentNode.insertBefore(mmContainer, existingTableWrapper.nextSibling);

  // State
  var mmLoaded = false;
  var mmCurrentPage = 1;
  var mmPageSize = 25;
  var mmTotalPages = 1;
  var mmData = [];

  function renderMasteredGrid(items, page, totalPages, total) {
    var startRank = (page - 1) * mmPageSize + 1;

    var html = '<div class="re-mm-loading" style="padding:4px 0;font-size:0.8rem;color:#737373;text-align:right">'
      + '👑 ' + total.toLocaleString() + ' games with achievements — sorted by most players'
      + '</div>'
      + '<div class="re-mm-grid">';

    items.forEach(function (entry, i) {
      var game = entry.game || entry;
      var rank = startRank + i;
      var title = game.title || 'Unknown';
      var imgUrl = game.badgeUrl || '';
      var playersTotal = game.playersTotal || 0;
      var timesBeatenHc = game.timesBeatenHardcore || 0;
      var achievements = game.achievementsPublished || 0;
      var systemName = (game.system && game.system.name) ? game.system.name : '';
      var gameId = game.id || 0;

      html += '<div class="re-mm-card">'
        + '<div class="re-mm-rank">#' + rank + '</div>'
        + '<a href="/game/' + gameId + '">'
        + '<img loading="lazy" decoding="async" src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(title) + '">'
        + '</a>'
        + '<div class="re-mm-card-info">'
        + '<a class="re-mm-card-title" href="/game/' + gameId + '" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</a>'
        + '<div class="re-mm-card-meta">'
        + '<span class="re-mm-card-badge re-mm-badge-players">👥 ' + playersTotal.toLocaleString() + ' players</span>'
        + (timesBeatenHc > 0 ? '<span class="re-mm-card-badge re-mm-badge-beaten">🏆 ' + timesBeatenHc.toLocaleString() + ' beaten</span>' : '')
        + '<span class="re-mm-card-badge re-mm-badge-achievements">⭐ ' + achievements + ' achievements</span>'
        + (systemName ? '<span class="re-mm-system-tag">' + escapeHtml(systemName) + '</span>' : '')
        + '</div>'
        + '</div>'
        + '</div>';
    });

    html += '</div>';

    // Pagination
    if (totalPages > 1) {
      html += '<div class="re-mm-pagination">';
      html += '<button class="re-mm-page-btn" data-page="1"' + (page <= 1 ? ' disabled' : '') + '>First</button>';
      html += '<button class="re-mm-page-btn" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>‹ Prev</button>';

      var startPage = Math.max(1, page - 2);
      var endPage = Math.min(totalPages, page + 2);
      for (var p = startPage; p <= endPage; p++) {
        html += '<button class="re-mm-page-btn' + (p === page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
      }

      html += '<button class="re-mm-page-btn" data-page="' + (page + 1) + '"' + (page >= totalPages ? ' disabled' : '') + '>Next ›</button>';
      html += '<button class="re-mm-page-btn" data-page="' + totalPages + '"' + (page >= totalPages ? ' disabled' : '') + '>Last</button>';
      html += '</div>';
    }

    mmContainer.innerHTML = html;

    // Bind pagination click events
    mmContainer.querySelectorAll('.re-mm-page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetPage = parseInt(btn.getAttribute('data-page'), 10);
        if (targetPage && targetPage !== mmCurrentPage && targetPage >= 1 && targetPage <= mmTotalPages) {
          mmCurrentPage = targetPage;
          fetchMasteredPage(targetPage);
        }
      });
    });
  }

  function fetchMasteredPage(page) {
    mmContainer.innerHTML = '<div class="re-mm-loading">Loading most mastered games...</div>';

    var apiUrl = '/internal-api/games'
      + '?page%5Bnumber%5D=' + page
      + '&page%5Bsize%5D=' + mmPageSize
      + '&sort=-playersTotal'
      + '&filter%5BachievementsPublished%5D=has';

    fetch(apiUrl, {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
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
      })
      .catch(function (err) {
        log.warn('Most Mastered fetch failed: ' + err.message);
        mmContainer.innerHTML = '<div class="re-mm-loading">Failed to load games. ' + escapeHtml(err.message) + '</div>';
      });
  }

  // Tab switching
  defaultTab.addEventListener('click', function () {
    defaultTab.classList.add('active');
    masteredTab.classList.remove('active');
    existingTableWrapper.style.display = '';
    mmContainer.style.display = 'none';
  });

  masteredTab.addEventListener('click', function () {
    masteredTab.classList.add('active');
    defaultTab.classList.remove('active');
    existingTableWrapper.style.display = 'none';
    mmContainer.style.display = '';

    if (!mmLoaded) {
      fetchMasteredPage(1);
    }
  });

  log.info('Most Mastered tab initialized on /games');
}
