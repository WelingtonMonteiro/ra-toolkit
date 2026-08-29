/**
 * Games closest to completion.
 */

import { escapeHtml } from '../../../core/dom.js';

export function renderAlmostThere(games, almostSection) {
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
