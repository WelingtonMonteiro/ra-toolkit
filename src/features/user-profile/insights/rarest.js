/**
 * The player's rarest recent unlocks.
 */

import { escapeHtml } from '../../../core/dom.js';

export function renderRarestAchievements(achievements, rarestSection) {
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

    var item = document.createElement('a');
    item.className = 'enhanced-rare-item';
    item.href = '/achievement/' + a.AchievementID;
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
