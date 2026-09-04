/**
 * Achievement badges shown when a game row is expanded.
 */

import { escapeHtml } from '../../core/dom.js';
import { gmFetch } from '../../core/gm.js';
import { log } from '../../core/log.js';
import { getRarityTier } from '../../core/rarity.js';
import { renderSkeletonBadges } from './skeletons.js';

// Achievements and player counts are fetched once per game, then reused
// while the user pages back and forth.
const achievementCache = {};
const playerCountCache = {};

// Dropped when the page size changes, so a new page refetches with the new
// rarity settings instead of replaying stale badges.
export function clearAchievementCache() {
  for (const key in achievementCache) delete achievementCache[key];
  for (const key in playerCountCache) delete playerCountCache[key];
}

export function fetchAndRenderAchievements(gameId, gridContainer, gameName, ctx) {
  const { targetUser, apiKey, enableRarityIndicator } = ctx;
  if (achievementCache[gameId]) {
    renderAchievementBadges(achievementCache[gameId], gridContainer, gameName, playerCountCache[gameId] || 0, enableRarityIndicator);
    return;
  }

  renderSkeletonBadges(gridContainer, 12);

  var url = 'https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php'
    + '?g=' + gameId
    + '&u=' + encodeURIComponent(targetUser)
    + '&y=' + encodeURIComponent(apiKey);

  gmFetch(url, 15000).then(function (resp) {
    var data = JSON.parse(resp.responseText);
    var achievements = data.Achievements || {};
    var numPlayers = parseInt(data.NumDistinctPlayers, 10) || 0;
    achievementCache[gameId] = achievements;
    playerCountCache[gameId] = numPlayers;
    renderAchievementBadges(achievements, gridContainer, gameName, numPlayers, enableRarityIndicator);
  }).catch(function () {
    gridContainer.innerHTML = '<div style="color:#ef4444;grid-column:1/-1;">Failed to load achievements</div>';
  });
}

export function renderAchievementBadges(achievements, gridContainer, gameName, numPlayers, enableRarityIndicator) {
  gridContainer.innerHTML = '';
  var achList = Object.values(achievements);

  // Separate unlocked and locked, sort each by DisplayOrder
  var unlocked = achList.filter(function (a) { return a.DateEarned || a.DateEarnedHardcore; });
  var locked = achList.filter(function (a) { return !a.DateEarned && !a.DateEarnedHardcore; });

  // Unlocked: most recently earned first
  unlocked.sort(function (a, b) {
    var da = a.DateEarnedHardcore || a.DateEarned || '';
    var db = b.DateEarnedHardcore || b.DateEarned || '';
    return da > db ? -1 : da < db ? 1 : 0;
  });
  // Locked: by display order
  locked.sort(function (a, b) { return (a.DisplayOrder || 0) - (b.DisplayOrder || 0); });

  var sorted = unlocked.concat(locked);

  sorted.forEach(function (ach) {
    var isUnlocked = !!(ach.DateEarned || ach.DateEarnedHardcore);
    var badgeName = ach.BadgeName || '';
    var badgeUrl = isUnlocked
      ? 'https://media.retroachievements.org/Badge/' + badgeName + '.png'
      : 'https://media.retroachievements.org/Badge/' + badgeName + '_lock.png';
    var imgClass = isUnlocked ? 'goldimage' : 'badgeimglarge';

    var unlockText = '';
    if (ach.DateEarnedHardcore) {
      unlockText = '\nUnlocked ' + ach.DateEarnedHardcore + ' (hardcore)';
    } else if (ach.DateEarned) {
      unlockText = '\nUnlocked ' + ach.DateEarned;
    }

    // Calculate rarity from NumAwarded
    var rarityText = '';
    var borderStyle = '';
    var numAwarded = parseInt(ach.NumAwarded, 10) || 0;
    if (enableRarityIndicator && numPlayers > 0 && numAwarded > 0) {
      var pct = (numAwarded / numPlayers) * 100;
      var tier = getRarityTier(pct);
      rarityText = '\n' + tier.label + ' (' + pct.toFixed(1) + '% unlock rate)';
      borderStyle = 'border: 2px solid ' + tier.color + '; border-radius: 8px;';
    }

    var titleText = ach.Title + '\n' + (ach.Description || '') + '\n' + (ach.Points || 0) + ' points'
      + '\n' + (gameName || '') + unlockText + rarityText;

    var span = document.createElement('span');
    span.className = 'inline';
    span.innerHTML = '<a class="inline-block" href="https://retroachievements.org/achievement/' + ach.ID + '" title="' + escapeHtml(titleText) + '">'
      + '<img loading="lazy" decoding="async" width="48" height="48" src="' + badgeUrl + '" alt="' + escapeHtml(ach.Title || '') + '" class="' + imgClass + '"'
      + (borderStyle ? ' style="' + borderStyle + '"' : '') + '>'
      + '</a>';

    gridContainer.appendChild(span);
  });

  if (sorted.length === 0) {
    gridContainer.innerHTML = '<div style="color:#a3a3a3;grid-column:1/-1;">No achievements</div>';
  }
}
