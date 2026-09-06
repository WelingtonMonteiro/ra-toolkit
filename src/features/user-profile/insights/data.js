/**
 * Fetches the API data every insights module renders.
 */

import { gmFetch } from '../../../core/gm.js';
import { log } from '../../../core/log.js';
import { renderAlmostThere } from './almost-there.js';
import { scrapeConsoleBreakdown } from './progression.js';
import { renderActivityTimeline } from './timeline.js';
import { renderRarestAchievements } from './rarest.js';
import { renderStatsCards } from './stats-cards.js';
import { renderStreakTracker } from './streaks.js';

export function fetchDashboardData(ctx) {
  const { targetUser, apiKey, enableRarityIndicator, gameAwardsMap, statsRow, almostSection, streakSection, rarestSection, timelineSection } = ctx;
  // Scrape console data from DOM for totalGames/totalMastered stats
  var domData = scrapeConsoleBreakdown();

  var summaryUrl = 'https://retroachievements.org/API/API_GetUserSummary.php'
    + '?u=' + encodeURIComponent(targetUser)
    + '&y=' + encodeURIComponent(apiKey)
    + '&g=0&a=0';

  var recentAllUrl = 'https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php'
    + '?u=' + encodeURIComponent(targetUser)
    + '&y=' + encodeURIComponent(apiKey)
    + '&c=50&o=0';

  var awardsUrl = 'https://retroachievements.org/API/API_GetUserAwards.php'
    + '?u=' + encodeURIComponent(targetUser)
    + '&y=' + encodeURIComponent(apiKey);

  // Build quarterly URLs for 1-year timeline (4 chunks of ~91 days)
  var now = Math.floor(Date.now() / 1000);
  var oneYearAgo = now - 365 * 24 * 60 * 60;
  var quarterSec = Math.ceil((now - oneYearAgo) / 4);
  var yearlyChunkUrls = [];
  for (var q = 0; q < 4; q++) {
    var f = oneYearAgo + q * quarterSec;
    var t = (q < 3) ? (oneYearAgo + (q + 1) * quarterSec) : now;
    yearlyChunkUrls.push(
      'https://retroachievements.org/API/API_GetAchievementsEarnedBetween.php'
      + '?u=' + encodeURIComponent(targetUser)
      + '&y=' + encodeURIComponent(apiKey)
      + '&f=' + f + '&t=' + t
    );
  }

  // Fetch summary + recent games + awards + yearly chunks in parallel
  var corePromises = [
    gmFetch(summaryUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; }),
    gmFetch(recentAllUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; }),
    gmFetch(awardsUrl, 15000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return null; })
  ];
  var yearlyPromises = yearlyChunkUrls.map(function (url) {
    return gmFetch(url, 20000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return []; });
  });

  Promise.all(corePromises.concat(yearlyPromises)).then(function (results) {
    var summary = results[0];
    var recentGames = results[1];
    var awardsData = results[2]; // user awards (mastered/beaten dates)

    // Merge 4 quarterly chunks into yearlyAchievements
    var yearlyAchievements = [];
    for (var q = 0; q < 4; q++) {
      var chunk = results[3 + q];
      if (Array.isArray(chunk)) {
        yearlyAchievements = yearlyAchievements.concat(chunk);
      }
    }
    // Deduplicate by AchievementID + Date (in case of overlapping boundaries)
    var seen = {};
    yearlyAchievements = yearlyAchievements.filter(function (a) {
      var key = a.AchievementID + '|' + a.Date + '|' + a.HardcoreMode;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    // --- Stats Cards ---
    var points = 0;
    var rank = '—';
    if (summary) {
      points = parseInt(summary.TotalPoints, 10) || 0;
      rank = summary.Rank || '—';
    }

    renderStatsCards({
      totalGames: domData.totalGames,
      mastered: domData.totalMastered,
      points: points,
      rank: rank
    }, statsRow);

    // --- Almost There ---
    var almostGames = [];
    if (recentGames && Array.isArray(recentGames)) {
      recentGames.forEach(function (g) {
        var earned = parseInt(g.NumAchieved, 10) || 0;
        var total = parseInt(g.NumPossibleAchievements, 10) || 0;
        if (total > 0 && earned < total) {
          var pct = earned / total;
          if (pct >= 0.5) {
            almostGames.push({
              gameId: g.GameID,
              title: g.Title || '',
              imageIcon: g.ImageIcon || '',
              earned: earned,
              total: total,
              pct: pct
            });
          }
        }
      });
      // Sort by pct descending (closest to 100% first)
      almostGames.sort(function (a, b) { return b.pct - a.pct; });
      almostGames = almostGames.slice(0, 5);
    }
    renderAlmostThere(almostGames, almostSection);

    // --- Streak Tracker (uses yearly data for better accuracy) ---
    if (yearlyAchievements && yearlyAchievements.length > 0) {
      renderStreakTracker(yearlyAchievements, streakSection);
    } else {
      streakSection.querySelector('.enhanced-streak-content').innerHTML =
        '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load streak data.</div>';
    }

    // --- Rarest Achievements (whole account history, like the mobile app) ---
    fetchAllTimeAchievements(targetUser, apiKey, summary).then(function (allTimeAchievements) {
      if (allTimeAchievements && allTimeAchievements.length > 0) {
        renderRarestAchievements(allTimeAchievements, rarestSection, {
          targetUser: targetUser,
          apiKey: apiKey,
          enableRarityIndicator: enableRarityIndicator,
        });
      } else {
        rarestSection.querySelector('.enhanced-rare-list').innerHTML =
          '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load rarity data.</div>';
      }
    });

    // --- Build gameAwardsMap from awards data (for pagination Beaten/Mastered labels) ---
    var awardPriority = { 'mastered': 4, 'completed': 3, 'beaten-hardcore': 2, 'beaten-softcore': 1 };
    if (awardsData && Array.isArray(awardsData.VisibleUserAwards)) {
      awardsData.VisibleUserAwards.forEach(function (award) {
        if (!award.AwardedAt || !award.AwardData) return;
        var gameId = String(award.AwardData);
        var aType = (award.AwardType || '').toLowerCase();
        var extra = parseInt(award.AwardDataExtra, 10) || 0;
        var kind = '';
        if (aType === 'mastery/completion' || aType === 'mastery') {
          kind = extra === 1 ? 'mastered' : 'completed';
        } else if (aType === 'game beaten') {
          kind = extra === 1 ? 'beaten-hardcore' : 'beaten-softcore';
        }
        if (!kind) return;
        var existing = gameAwardsMap[gameId];
        if (!existing || (awardPriority[kind] || 0) > (awardPriority[existing.awardKind] || 0)) {
          gameAwardsMap[gameId] = { awardKind: kind, awardedAt: award.AwardedAt };
        }
      });
    }

    // --- Activity Timeline (yearly data + awards) ---
    // Process awards for mastered/beaten heatmap modes
    var masteredDayMap = {};
    var beatenDayMap = {};
    var oneYearAgoDate = new Date();
    oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 365);
    oneYearAgoDate.setHours(0, 0, 0, 0);

    if (awardsData && Array.isArray(awardsData.VisibleUserAwards)) {
      awardsData.VisibleUserAwards.forEach(function (award) {
        if (!award.AwardedAt) return;
        var awardDate = new Date(award.AwardedAt);
        if (awardDate < oneYearAgoDate) return;
        var dayStr = awardDate.toISOString().substring(0, 10);

        // AwardType + AwardDataExtra: "Game Beaten" = beaten, "Mastery/Completion" with Extra=1 = mastered, Extra=0 = completed (softcore mastery)
        var aType = (award.AwardType || '').toLowerCase();
        if (aType === 'mastery/completion' || aType === 'mastery') {
          masteredDayMap[dayStr] = (masteredDayMap[dayStr] || 0) + 1;
        } else if (aType === 'game beaten') {
          beatenDayMap[dayStr] = (beatenDayMap[dayStr] || 0) + 1;
        }
      });
    }

    if (yearlyAchievements && yearlyAchievements.length > 0) {
      renderActivityTimeline(yearlyAchievements, masteredDayMap, beatenDayMap, timelineSection);
    } else {
      timelineSection.querySelector('.enhanced-timeline-content').innerHTML =
        '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">Could not load activity data.</div>';
    }

    log.info('Dashboard loaded for ' + targetUser);
  }).catch(function (err) {
    log.warn('Dashboard failed: ' + err.message);
    statsRow.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;grid-column:1/-1;">Failed to load dashboard</div>';
  });
}

// Every unlock since the account was created, walked in one-year chunks
// (mirrors the mobile app's "all time" rarest window). Falls back to the
// last 365 days when MemberSince is missing or implausible.
function fetchAllTimeAchievements(targetUser, apiKey, summary) {
  var now = new Date();
  var floor = new Date(now.getTime() - 365 * 20 * 24 * 60 * 60 * 1000);
  var from = null;
  if (summary && summary.MemberSince) {
    var parsed = new Date(String(summary.MemberSince).replace(' ', 'T') + 'Z');
    if (!isNaN(parsed.getTime())) from = parsed;
  }
  if (!from || from > now || from < floor) {
    from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  var chunkUrls = [];
  var cursor = from;
  while (cursor < now) {
    var next = new Date(cursor.getTime() + 365 * 24 * 60 * 60 * 1000);
    var to = next > now ? now : next;
    chunkUrls.push(
      'https://retroachievements.org/API/API_GetAchievementsEarnedBetween.php'
      + '?u=' + encodeURIComponent(targetUser)
      + '&y=' + encodeURIComponent(apiKey)
      + '&f=' + Math.floor(cursor.getTime() / 1000)
      + '&t=' + Math.floor(to.getTime() / 1000)
    );
    cursor = to;
  }

  return Promise.all(chunkUrls.map(function (url) {
    return gmFetch(url, 20000).then(function (r) { return JSON.parse(r.responseText); }).catch(function () { return []; });
  })).then(function (chunks) {
    var all = [];
    chunks.forEach(function (chunk) {
      if (Array.isArray(chunk)) all = all.concat(chunk);
    });
    // Deduplicate across overlapping chunk boundaries.
    var seen = {};
    return all.filter(function (a) {
      var key = a.AchievementID + '|' + a.Date + '|' + a.HardcoreMode;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  });
}
