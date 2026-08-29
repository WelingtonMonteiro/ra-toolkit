/**
 * The card-style User Stats block that replaces RAWeb's.
 */

import { escapeHtml } from '../../core/dom.js';

// =========================================
//   Enhanced User Stats (replaces native)
// =========================================
export function enhanceUserStats() {
  var userStatsH2 = null;
  var allH2s = document.querySelectorAll('h2');
  for (var h = 0; h < allH2s.length; h++) {
    if (/User\s*Stats/i.test(allH2s[h].textContent)) {
      userStatsH2 = allH2s[h];
      break;
    }
  }
  if (!userStatsH2) return;

  var statsContainer = userStatsH2.closest('[x-data]');
  if (!statsContainer) statsContainer = userStatsH2.parentElement.parentElement;
  if (!statsContainer) return;

  // Scrape all stat elements: label → value pairs
  var statEls = statsContainer.querySelectorAll('.relative.flex.w-full.items-center.justify-between');
  var s = {};
  statEls.forEach(function (el) {
    var ps = el.querySelectorAll('p');
    if (ps.length >= 2) {
      var label = (ps[0].textContent || '').trim();
      var value = (ps[1].textContent || '').trim();
      if (label) s[label] = value;
    }
  });

  if (Object.keys(s).length === 0) return;

  // Parse helpers
  function val(key) {
    if (Array.isArray(key)) {
      for (var ki = 0; ki < key.length; ki++) {
        if (s[key[ki]]) return s[key[ki]];
      }
      return '';
    }
    return s[key] || '';
  }
  function extractWeighted(raw) {
    var m = raw.match(/^([\d,.\s]+)\s*\((.+)\)$/);
    return m ? { main: m[1].trim(), weighted: m[2].trim() } : { main: raw, weighted: '' };
  }
  function extractRankTotal(raw) {
    var m = raw.match(/#([\d,]+)\s*of\s*([\d,]+)/i);
    return m ? { rank: '#' + m[1], total: 'of ' + m[2] } : { rank: raw, total: '' };
  }
  function extractBeatenRetail(raw) {
    var m = raw.match(/^(\d+)\s*\((.+)\)$/);
    return m ? { count: m[1], retail: m[2].trim() } : { count: raw, retail: '' };
  }

  // Primary cards
  var pts = extractWeighted(val('Points'));
  var rank = extractRankTotal(val('Site rank'));
  var beaten = extractBeatenRetail(val('Total games beaten'));

  var primaryHtml = ''
    + '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">Points</span><span class="card-icon">⭐</span></div>'
      + '<div class="metric-value" style="color:#a78bfa;">' + escapeHtml(pts.main) + '</div>'
      + (pts.weighted ? '<div class="metric-sub">' + escapeHtml(pts.weighted) + ' weighted</div>' : '')
    + '</div>'
    + '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">Site rank</span><span class="card-icon">🏅</span></div>'
      + '<div class="metric-value-sm" style="color:#fbbf24;">' + escapeHtml(rank.rank) + '</div>'
      + (rank.total ? '<div class="metric-sub">' + escapeHtml(rank.total) + '</div>' : '')
    + '</div>'
    + '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">Achievements</span><span class="card-icon">🏆</span></div>'
      + '<div class="metric-value" style="color:#3b82f6;">' + escapeHtml(val('Achievements unlocked')) + '</div>'
    + '</div>'
    + '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">RetroRatio</span><span class="card-icon">📊</span></div>'
      + '<div class="metric-value" style="color:#10b981;">' + escapeHtml(val('RetroRatio')) + '</div>'
    + '</div>'
    + '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">Games beaten</span><span class="card-icon">🎮</span></div>'
      + '<div class="metric-value" style="color:#f472b6;">' + escapeHtml(beaten.count) + '</div>'
      + (beaten.retail ? '<div class="metric-sub">' + escapeHtml(beaten.retail) + '</div>' : '')
    + '</div>'
    + '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">Beaten rate</span><span class="card-icon">📈</span></div>'
      + '<div class="metric-value" style="color:#38bdf8;">' + escapeHtml(val('Started games beaten')) + '</div>'
    + '</div>';

  // Recent activity section
  var recentDefs = [
    { key: 'Points earned in the last 7 days', label: 'Points (7 days)', icon: '📅' },
    { key: 'Points earned in the last 30 days', label: 'Points (30 days)', icon: '📆' },
    { key: 'Average points per week', label: 'Avg pts / week', icon: '📉' },
    { key: 'Average completion', label: 'Avg completion', icon: '🎯' },
  ];
  var recentHtml = '';
  var hasRecent = false;
  recentDefs.forEach(function (def) {
    var v = val(def.key);
    if (!v) return;
    hasRecent = true;
    recentHtml += '<div class="metric-card">'
      + '<div class="card-top"><span class="metric-label">' + escapeHtml(def.label) + '</span><span class="card-icon">' + def.icon + '</span></div>'
      + '<div class="metric-value" style="color:#e4e4e7;">' + escapeHtml(v) + '</div>'
      + '</div>';
  });

  // Casual section — RetroAchievements renamed "softcore" to "casual",
  // so read the new labels first and fall back to the old ones.
  var casualDefs = [
    { key: ['Points (casual)', 'Points (softcore)'], label: 'Points', icon: '⚡' },
    { key: ['Casual rank', 'Softcore rank'], label: 'Rank', icon: '🥈', isRank: true },
    { key: ['Achievements unlocked (casual)', 'Achievements unlocked (softcore)'], label: 'Achievements', icon: '🔓' },
  ];
  var softcoreHtml = '';
  var hasSoftcore = false;
  casualDefs.forEach(function (def) {
    var v = val(def.key);
    if (!v) return;
    hasSoftcore = true;
    var parsed = extractRankTotal(v);
    if (def.isRank && parsed.total) {
      softcoreHtml += '<div class="metric-card">'
        + '<div class="card-top"><span class="metric-label">' + escapeHtml(def.label) + '</span><span class="card-icon">' + def.icon + '</span></div>'
        + '<div class="metric-value-sm" style="color:#737373;">' + escapeHtml(parsed.rank) + '</div>'
        + '<div class="metric-sub">' + escapeHtml(parsed.total) + '</div>'
        + '</div>';
    } else {
      softcoreHtml += '<div class="metric-card">'
        + '<div class="card-top"><span class="metric-label">' + escapeHtml(def.label) + '</span><span class="card-icon">' + def.icon + '</span></div>'
        + '<div class="metric-value" style="color:#737373;">' + escapeHtml(v) + '</div>'
        + '</div>';
    }
  });

  // Build full HTML
  var html = '<div class="stats-root">'
    + '<div class="stats-title">User Stats</div>'
    + '<div class="stats-grid-3">' + primaryHtml + '</div>';

  if (hasRecent) {
    html += '<hr class="stats-divider">'
      + '<div class="section-label">Recent activity</div>'
      + '<div class="stats-grid-4">' + recentHtml + '</div>';
  }

  if (hasSoftcore) {
    html += '<hr class="stats-divider">'
      + '<div class="section-label">Casual</div>'
      + '<div class="stats-grid-3">' + softcoreHtml + '</div>';
  }

  html += '</div>';

  var enhancedDiv = document.createElement('div');
  enhancedDiv.innerHTML = html;

  statsContainer.parentNode.insertBefore(enhancedDiv, statsContainer);
  statsContainer.style.display = 'none';
}
