/**
 * The headline metric cards.
 */

import { escapeHtml } from '../../../core/dom.js';

// --- Render functions ---
export function renderStatsCards(data, statsRow) {
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
