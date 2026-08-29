/**
 * Current and longest unlock streaks.
 */

import { escapeHtml } from '../../../core/dom.js';

export function renderStreakTracker(achievements, streakSection) {
  var content = streakSection.querySelector('.enhanced-streak-content');
  if (!achievements || achievements.length === 0) {
    content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No recent achievements found.</div>';
    return;
  }

  // Group achievements by date (YYYY-MM-DD)
  var daySet = {};
  achievements.forEach(function (a) {
    if (!a.Date) return;
    var day = a.Date.substring(0, 10); // "YYYY-MM-DD"
    daySet[day] = (daySet[day] || 0) + 1;
  });

  // Calculate current streak (consecutive days ending today or yesterday)
  var today = new Date();
  var streak = 0;
  var bestStreak = 0;
  var tempStreak = 0;

  // Get sorted unique days
  var days = Object.keys(daySet).sort().reverse();
  if (days.length === 0) {
    content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No activity data available.</div>';
    return;
  }

  // Check from today backwards
  var checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);
  var todayStr = checkDate.toISOString().substring(0, 10);

  // If no activity today, check if yesterday had activity (streak might still be alive)
  if (!daySet[todayStr]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    var dStr = checkDate.toISOString().substring(0, 10);
    if (daySet[dStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak in the data
  var sortedDays = Object.keys(daySet).sort();
  tempStreak = 1;
  bestStreak = 1;
  for (var i = 1; i < sortedDays.length; i++) {
    var prev = new Date(sortedDays[i - 1] + 'T00:00:00');
    var curr = new Date(sortedDays[i] + 'T00:00:00');
    var diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  if (streak > bestStreak) bestStreak = streak;

  var totalAch = achievements.length;
  var activeDays = Object.keys(daySet).length;

  content.innerHTML =
    '<div class="enhanced-streak-row">'
      + '<div class="enhanced-streak-big">' + streak + '</div>'
      + '<div>'
        + '<div class="enhanced-streak-info">' + (streak === 1 ? 'day streak' : 'days streak') + (streak > 0 ? ' 🔥' : '') + '</div>'
        + '<div class="enhanced-streak-detail">Best: ' + bestStreak + ' days · ' + activeDays + ' active days · ' + totalAch + ' achievements (365d)</div>'
      + '</div>'
    + '</div>';
}
