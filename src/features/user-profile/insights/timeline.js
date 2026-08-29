/**
 * The GitHub-style activity heatmap.
 */

import { escapeHtml } from '../../../core/dom.js';

export function renderActivityTimeline(achievements, masteredDayMap, beatenDayMap, timelineSection) {
  var content = timelineSection.querySelector('.enhanced-timeline-content');
  if (!achievements || achievements.length === 0) {
    content.innerHTML = '<div style="font-size:0.78rem;color:#525252;padding:4px 0;">No recent activity.</div>';
    return;
  }

  // Update total in title
  var totalEl = document.getElementById('enhanced-timeline-total');
  if (totalEl) totalEl.textContent = '— ' + achievements.length + ' achievements';

  // Group achievements by day
  var achDayMap = {};
  achievements.forEach(function (a) {
    if (!a.Date) return;
    var day = a.Date.substring(0, 10);
    achDayMap[day] = (achDayMap[day] || 0) + 1;
  });

  // Build 365-day calendar grid structure (shared across modes)
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var todayDow = today.getDay();
  var startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364 - todayDow);
  var totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  var numWeeks = Math.ceil(totalDays / 7);

  var baseCells = [];
  for (var w = 0; w < numWeeks; w++) {
    for (var dow = 0; dow < 7; dow++) {
      var d = new Date(startDate);
      d.setDate(d.getDate() + w * 7 + dow);
      if (d > today) continue;
      baseCells.push({ date: d.toISOString().substring(0, 10), day: d, week: w, dow: dow });
    }
  }

  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Month label positions
  var monthCols = {};
  baseCells.forEach(function (c) {
    if (c.dow === 0) {
      var key = c.day.getFullYear() + '-' + c.day.getMonth();
      if (!(key in monthCols)) monthCols[key] = { week: c.week, month: c.day.getMonth() };
    }
  });

  // Three data modes
  var modes = {
    achievements: {
      dayMap: achDayMap,
      prefix: 'level',
      icon: '🏆',
      label: '🏆 Achievements',
      totalLabel: function (dm) { var t = 0; for (var k in dm) t += dm[k]; return t + ' achievements'; },
      tooltipSingular: 'achievement',
      tooltipPlural: 'achievements',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
      legendColors: ['rgba(255,255,255,0.04)','rgba(59,130,246,0.25)','rgba(59,130,246,0.5)','rgba(59,130,246,0.75)','#3b82f6']
    },
    mastered: {
      dayMap: masteredDayMap || {},
      prefix: 'mastered',
      icon: '👑',
      label: '👑 Mastered',
      totalLabel: function (dm) { var t = 0; for (var k in dm) t += dm[k]; return t + ' games mastered'; },
      tooltipSingular: 'game mastered',
      tooltipPlural: 'games mastered',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.12)',
      legendColors: ['rgba(255,255,255,0.04)','rgba(251,191,36,0.25)','rgba(251,191,36,0.5)','rgba(251,191,36,0.75)','#fbbf24']
    },
    beaten: {
      dayMap: beatenDayMap || {},
      prefix: 'beaten',
      icon: '✅',
      label: '✅ Beaten',
      totalLabel: function (dm) { var t = 0; for (var k in dm) t += dm[k]; return t + ' games beaten'; },
      tooltipSingular: 'game beaten',
      tooltipPlural: 'games beaten',
      color: '#a3a3a3',
      bg: 'rgba(163,163,163,0.12)',
      legendColors: ['rgba(255,255,255,0.04)','rgba(163,163,163,0.25)','rgba(163,163,163,0.5)','rgba(163,163,163,0.75)','#a3a3a3']
    }
  };

  var activeModes = { achievements: true, mastered: true, beaten: true };

  function getActiveKeys() {
    var keys = [];
    for (var k in activeModes) { if (activeModes[k]) keys.push(k); }
    return keys;
  }

  function buildGrid() {
    var activeKeys = getActiveKeys();
    if (activeKeys.length === 0) return '';

    var isSingle = activeKeys.length === 1;
    var theme = isSingle ? modes[activeKeys[0]] : null;

    // Merge dayMaps from active modes
    var mergedDayMap = {};
    activeKeys.forEach(function (key) {
      var dm = modes[key].dayMap;
      for (var d in dm) mergedDayMap[d] = (mergedDayMap[d] || 0) + dm[d];
    });

    var maxCount = 0;
    var cellData = baseCells.map(function (c) {
      var count = mergedDayMap[c.date] || 0;
      if (count > maxCount) maxCount = count;
      return { date: c.date, count: count, day: c.day, week: c.week, dow: c.dow };
    });

    function getLevel(count) {
      if (count === 0) return 0;
      if (maxCount <= 4) return Math.min(count, 4);
      var pct = count / maxCount;
      if (pct <= 0.25) return 1;
      if (pct <= 0.5) return 2;
      if (pct <= 0.75) return 3;
      return 4;
    }

    var cellSize = Math.max(8, Math.floor((content.offsetWidth - 32) / (numWeeks + 1)));
    if (cellSize > 14) cellSize = 14;

    var levelPrefix = theme ? (theme.prefix === 'level' ? 'level' : theme.prefix) : null;

    // Priority order for multi-mode cell coloring: mastered > beaten > achievements
    var priorityOrder = ['mastered', 'beaten', 'achievements'];
    function getCellPrefix(date) {
      if (levelPrefix) return levelPrefix;
      for (var i = 0; i < priorityOrder.length; i++) {
        var k = priorityOrder[i];
        if (activeModes[k] && modes[k].dayMap[date]) return modes[k].prefix === 'level' ? 'level' : modes[k].prefix;
      }
      return 'level';
    }

    var html = '<div class="enhanced-timeline-wrapper">';
    html += '<div class="enhanced-timeline-table" style="grid-template-columns:28px repeat(' + numWeeks + ',' + cellSize + 'px);grid-template-rows:auto repeat(7,' + cellSize + 'px);">';

    // Month labels row
    html += '<div></div>';
    var monthLabelsArr = [];
    for (var wi = 0; wi < numWeeks; wi++) monthLabelsArr.push('');
    Object.keys(monthCols).forEach(function (key) {
      var info = monthCols[key];
      monthLabelsArr[info.week] = monthNames[info.month];
    });
    for (var wi = 0; wi < numWeeks; wi++) {
      html += '<div class="enhanced-timeline-month-label">' + monthLabelsArr[wi] + '</div>';
    }

    // Cell lookup
    var cellMap = {};
    cellData.forEach(function (c) {
      if (!cellMap[c.week]) cellMap[c.week] = {};
      cellMap[c.week][c.dow] = c;
    });

    for (var dow = 0; dow < 7; dow++) {
      if (dow === 1 || dow === 3 || dow === 5) {
        html += '<div class="enhanced-timeline-day-label">' + dayLabels[dow] + '</div>';
      } else {
        html += '<div class="enhanced-timeline-day-label"></div>';
      }
      for (var wi = 0; wi < numWeeks; wi++) {
        var cell = cellMap[wi] && cellMap[wi][dow];
        if (cell) {
          var level = getLevel(cell.count);
          // Build tooltip data attributes
          var tooltipLines = [];
          activeKeys.forEach(function (key) {
            var c = modes[key].dayMap[cell.date] || 0;
            if (c > 0) {
              var unit = c === 1 ? modes[key].tooltipSingular : modes[key].tooltipPlural;
              tooltipLines.push(modes[key].icon + '|' + c + ' ' + unit);
            }
          });
          var dateStr = monthNames[cell.day.getMonth()] + ' ' + cell.day.getDate() + ', ' + cell.day.getFullYear();
          var cellPfx = level === 0 ? 'level' : getCellPrefix(cell.date);
          var cls = level === 0 ? 'level-0' : (cellPfx + '-' + level);
          html += '<div class="enhanced-timeline-cell ' + cls + '" data-tip-date="' + escapeHtml(dateStr) + '" data-tip-lines="' + escapeHtml(tooltipLines.join(';;')) + '"></div>';
        } else {
          html += '<div></div>';
        }
      }
    }

    html += '</div></div>';

    // Footer with per-mode stats
    var footerParts = [];
    activeKeys.forEach(function (key) {
      footerParts.push(modes[key].totalLabel(modes[key].dayMap));
    });
    var activeDays = 0;
    for (var k in mergedDayMap) { if (mergedDayMap[k] > 0) activeDays++; }
    html += '<div class="enhanced-timeline-footer">';
    html += '<span>' + footerParts.join(', ') + ' in ' + activeDays + ' days</span>';
    html += '<div class="enhanced-timeline-legend">';
    if (isSingle) {
      html += '<span>Less</span>';
      for (var li = 0; li < theme.legendColors.length; li++) {
        html += '<div class="enhanced-timeline-legend-cell" style="background:' + theme.legendColors[li] + ';"></div>';
      }
      html += '<span>More</span>';
    } else {
      activeKeys.forEach(function (key) {
        html += '<span style="display:inline-flex;align-items:center;gap:3px;margin-right:8px;">' + modes[key].icon + '<div class="enhanced-timeline-legend-cell" style="background:' + modes[key].color + ';"></div></span>';
      });
    }
    html += '</div></div>';

    return html;
  }

  function renderModes() {
    var gridContainer = content.querySelector('.enhanced-timeline-grid-area');
    if (gridContainer) gridContainer.innerHTML = buildGrid();
    // Update toggle button active states
    var btns = content.querySelectorAll('.enhanced-timeline-toggle-btn');
    btns.forEach(function (btn) {
      var bm = btn.getAttribute('data-mode');
      if (activeModes[bm]) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    // Update total in title
    var totalEl = document.getElementById('enhanced-timeline-total');
    if (totalEl) {
      var activeKeys = getActiveKeys();
      var totalParts = [];
      activeKeys.forEach(function (key) {
        var dm = modes[key].dayMap;
        var t = 0;
        for (var d in dm) t += dm[d];
        if (key === 'achievements') totalParts.push(t + ' achievements');
        else if (key === 'mastered') totalParts.push(t + ' mastered');
        else if (key === 'beaten') totalParts.push(t + ' beaten');
      });
      totalEl.textContent = '— ' + totalParts.join(', ');
    }
  }

  // Build toggle bar + grid container
  var outerHtml = '<div class="enhanced-timeline-toggle-bar">';
  ['achievements', 'mastered', 'beaten'].forEach(function (key) {
    var m = modes[key];
    var activeClass = ' active';
    outerHtml += '<button class="enhanced-timeline-toggle-btn' + activeClass + '" data-mode="' + key + '" '
      + 'style="--toggle-color:' + m.color + ';--toggle-bg:' + m.bg + ';">'
      + m.label + '</button>';
  });
  outerHtml += '</div>';
  outerHtml += '<div class="enhanced-timeline-grid-area">' + buildGrid() + '</div>';

  content.innerHTML = outerHtml;

  // Bind toggle clicks (multi-select: toggle on/off, at least 1 must stay active)
  content.querySelectorAll('.enhanced-timeline-toggle-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      var activeKeys = getActiveKeys();
      if (activeModes[mode] && activeKeys.length <= 1) return; // prevent deselecting last one
      activeModes[mode] = !activeModes[mode];
      renderModes();
    });
  });

  // Custom tooltip
  var tooltip = document.createElement('div');
  tooltip.className = 'enhanced-timeline-tooltip';
  document.body.appendChild(tooltip);

  content.addEventListener('mouseover', function (e) {
    var cell = e.target.closest('.enhanced-timeline-cell');
    if (!cell || !cell.dataset.tipDate) return;
    var dateStr = cell.dataset.tipDate;
    var linesRaw = cell.dataset.tipLines;
    var html = '<div class="tooltip-date">' + escapeHtml(dateStr) + '</div>';
    if (linesRaw) {
      var lines = linesRaw.split(';;');
      lines.forEach(function (line) {
        if (!line) return;
        var parts = line.split('|');
        var icon = parts[0] || '';
        var text = parts[1] || '';
        html += '<div class="tooltip-line"><span class="tooltip-icon">' + icon + '</span> ' + escapeHtml(text) + '</div>';
      });
    } else {
      html += '<div class="tooltip-no-activity">No activity</div>';
    }
    tooltip.innerHTML = html;
    tooltip.classList.add('visible');
  });

  content.addEventListener('mousemove', function (e) {
    if (!tooltip.classList.contains('visible')) return;
    var x = e.clientX + 12;
    var y = e.clientY - tooltip.offsetHeight - 8;
    if (y < 4) y = e.clientY + 16;
    if (x + tooltip.offsetWidth > window.innerWidth - 4) x = e.clientX - tooltip.offsetWidth - 12;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  });

  content.addEventListener('mouseout', function (e) {
    var cell = e.target.closest('.enhanced-timeline-cell');
    if (!cell) return;
    tooltip.classList.remove('visible');
  });
}
