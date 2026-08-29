/**
 * Charts built from the Progression Status table.
 */

import { escapeHtml } from '../../../core/dom.js';

// --- Fetch dashboard data ---
// --- Scrape Console Breakdown from existing DOM ---
export function scrapeConsoleBreakdown() {
  var rows = document.querySelectorAll('li.progression-status-row');
  var consoles = [];
  var domTotalGames = 0;
  var domTotalMastered = 0;
  var domTotalBeaten = 0;
  var foundTotalRow = false;

  rows.forEach(function (row) {
    var link = row.querySelector('a');
    if (!link) return;

    var img = link.querySelector('img');
    var nameEl = link.querySelector('p');
    if (!nameEl) return;

    var shortName = nameEl.textContent.trim();
    var iconUrl = img ? img.src : '';
    var consoleName = img ? (img.alt || '').replace(' console icon', '') : shortName;

    // Get cell links: [console link, unfinished, beaten, mastered]
    var allLinks = row.querySelectorAll('a');

    // Parse numbers from a cell (handles .tally divs or plain text)
    function parseCellNumbers(cell) {
      var nums = [];
      var tallies = cell.querySelectorAll('.tally');
      if (tallies.length > 0) {
        tallies.forEach(function (t) {
          var n = parseInt(t.textContent.trim(), 10);
          if (!isNaN(n)) nums.push(n);
        });
      } else {
        var n = parseInt(cell.textContent.trim(), 10);
        if (!isNaN(n)) nums.push(n);
      }
      return nums;
    }

    // Cells: index 1=unfinished, 2=beaten, 3=mastered
    var unfinished = 0, beaten = 0, mastered = 0;
    if (allLinks.length >= 2) {
      var uNums = parseCellNumbers(allLinks[1]);
      unfinished = uNums.reduce(function (s, n) { return s + n; }, 0);
    }
    if (allLinks.length >= 3) {
      var bNums = parseCellNumbers(allLinks[2]);
      beaten = bNums.reduce(function (s, n) { return s + n; }, 0);
    }
    if (allLinks.length >= 4) {
      var mNums = parseCellNumbers(allLinks[3]);
      mastered = mNums.reduce(function (s, n) { return s + n; }, 0);
    }

    var totalCount = unfinished + beaten + mastered;

    // Skip "Total" row but extract its data for stats
    if (shortName === 'Total') {
      foundTotalRow = true;
      domTotalGames = totalCount;
      domTotalMastered = mastered;
      domTotalBeaten = beaten;
      return;
    }

    if (totalCount > 0) {
      consoles.push({
        shortName: shortName,
        consoleName: consoleName,
        iconUrl: iconUrl,
        count: totalCount,
        unfinished: unfinished,
        beaten: beaten,
        mastered: mastered
      });
    }
  });

  // If no Total row found, sum from individual consoles
  if (!foundTotalRow) {
    consoles.forEach(function (c) {
      domTotalGames += c.count;
      domTotalMastered += c.mastered;
      domTotalBeaten += c.beaten;
    });
  }

  return { consoles: consoles, totalGames: domTotalGames, totalMastered: domTotalMastered, totalBeaten: domTotalBeaten };
}

export function renderProgressionDashboard() {
  if (document.getElementById('pd-root')) return;
  var firstRow = document.querySelector('li.progression-status-row');
  if (!firstRow) return;

  // Walk up to find section container
  var progSection = firstRow.parentElement;
  while (progSection && progSection !== document.body) {
    var cls = progSection.className || '';
    if (progSection.tagName === 'SECTION' || /\bmy-\d/.test(cls)) break;
    progSection = progSection.parentElement;
  }
  if (!progSection || progSection === document.body)
    progSection = firstRow.closest('section') || firstRow.parentElement.parentElement;

  var data = scrapeConsoleBreakdown();
  var consoles = data.consoles;
  if (!consoles.length) return;

  var totalGames = data.totalGames;
  var totalMastered = data.totalMastered;
  var totalBeaten = data.totalBeaten || consoles.reduce(function(s,c){ return s+(c.beaten||0); }, 0);
  var totalUnfinished = totalGames - totalBeaten - totalMastered;
  var pctDone = totalGames > 0 ? Math.round(((totalBeaten+totalMastered)/totalGames)*100) : 0;

  // Inject CSS once
  if (!document.getElementById('pd-style')) {
    var pdStyle = document.createElement('style');
    pdStyle.id = 'pd-style';
    pdStyle.textContent = [
      '.pd-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}',
      '.pd-kpi{background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 14px}',
      '.pd-kpi-val{font-size:22px;font-weight:500;color:#e4e4e7}',
      '.pd-kpi-lbl{font-size:12px;color:#737373;margin-top:2px}',
      '.pd-kpi-val.beaten{color:#7F77DD}',
      '.pd-kpi-val.mastered{color:#EF9F27}',
      '.pd-kpi-val.pct{color:#10b981}',
      '.pd-two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:16px;margin-bottom:14px;align-items:start}',
      '.pd-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.25rem}',
      '.pd-card-title{font-size:13px;font-weight:500;color:#9ca3af;margin-bottom:12px}',
      '.pd-legend-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:6px}',
      '.pd-leg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0;margin-right:6px}',
      '.pd-leg-name{color:#9ca3af;display:flex;align-items:center;flex:1}',
      '.pd-leg-val{color:#e4e4e7;font-weight:500}',
      '.pd-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}',
      '.pd-bar-lbl{font-size:11px;color:#9ca3af;width:42px;flex-shrink:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pd-bar-track{flex:1;height:14px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;display:flex}',
      '.pd-seg-u{background:#3f3f46;height:100%}',
      '.pd-seg-b{background:#7F77DD;height:100%}',
      '.pd-seg-m{background:#EF9F27;height:100%}',
      '.pd-bar-pct{font-size:11px;color:#737373;width:32px;text-align:right;flex-shrink:0}',
      '.pd-viz-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.25rem;margin-bottom:14px}',
      '.pd-viz-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px}',
      '.pd-viz-title{font-size:13px;font-weight:500;color:#9ca3af}',
      '.pd-toggle-wrap{display:flex;background:rgba(255,255,255,0.04);border-radius:20px;padding:3px;gap:2px;border:0.5px solid rgba(255,255,255,0.1)}',
      '.pd-tog-btn{font-size:12px;padding:4px 14px;border-radius:18px;border:none;background:transparent;color:#9ca3af;cursor:pointer;transition:all .18s}',
      '.pd-tog-btn.active{background:rgba(255,255,255,0.1);color:#e4e4e7;font-weight:500}',
      '.pd-filter-row{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}',
      '.pd-filter-btn{font-size:12px;padding:4px 12px;border-radius:20px;border:0.5px solid rgba(255,255,255,0.15);background:transparent;color:#9ca3af;cursor:pointer}',
      '.pd-filter-btn.active{background:rgba(255,255,255,0.08);color:#e4e4e7;font-weight:500}',
      '.pd-viz-legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}',
      '.pd-vl-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#9ca3af}',
      '.pd-vl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}',
      '.pd-viz-wrap{position:relative;width:100%;height:380px}',
      '.pd-viz-tip{position:absolute;background:rgba(20,20,20,.95);border:0.5px solid rgba(255,255,255,.2);border-radius:8px;padding:8px 12px;font-size:12px;color:#e4e4e7;pointer-events:none;display:none;z-index:10;min-width:140px}',
      '.pd-mb-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:1rem 1.25rem}',
      '.pd-donut-wrap{position:relative;height:180px}',
      '.pd-donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none}',
      '.pd-donut-pct{font-size:22px;font-weight:500;color:#e4e4e7}',
      '.pd-donut-sub{font-size:11px;color:#737373}',
      '@media(max-width:600px){.pd-two-col{grid-template-columns:1fr}.pd-kpi-grid{grid-template-columns:repeat(2,1fr)}}'
    ].join('');
    document.head.appendChild(pdStyle);
  }

  // Consoles with progress sorted by completion %
  var consolesWithProg = consoles.filter(function(c){ return (c.beaten||0)+(c.mastered||0)>0; });
  consolesWithProg.sort(function(a,b){
    return ((b.beaten||0)+(b.mastered||0))/b.count - ((a.beaten||0)+(a.mastered||0))/a.count;
  });

  var barsHtml = consolesWithProg.slice(0,12).map(function(d) {
    var bP = Math.round(((d.beaten||0)/d.count)*100);
    var mP = Math.round(((d.mastered||0)/d.count)*100);
    var done = bP+mP;
    return '<div class="pd-bar-row">'
      +'<span class="pd-bar-lbl" title="'+escapeHtml(d.consoleName)+'">'+escapeHtml(d.shortName)+'</span>'
      +'<div class="pd-bar-track">'
        +'<div class="pd-seg-u" style="width:'+(100-done)+'%"></div>'
        +'<div class="pd-seg-b" style="width:'+bP+'%"></div>'
        +'<div class="pd-seg-m" style="width:'+mP+'%"></div>'
      +'</div>'
      +'<span class="pd-bar-pct">'+done+'%</span>'
      +'</div>';
  }).join('');

  var html = '<div class="pd-wrap" id="pd-root">'
    +'<div class="enhanced-dashboard-section-title" style="margin-bottom:12px;">\uD83C\uDFAE Progression Status</div>'
    +'<div class="pd-kpi-grid">'
      +'<div class="pd-kpi"><div class="pd-kpi-val">'+totalGames+'</div><div class="pd-kpi-lbl">Total games</div></div>'
      +'<div class="pd-kpi"><div class="pd-kpi-val beaten">'+totalBeaten+'</div><div class="pd-kpi-lbl">Beaten</div></div>'
      +'<div class="pd-kpi"><div class="pd-kpi-val mastered">'+totalMastered+'</div><div class="pd-kpi-lbl">Mastered</div></div>'
      +'<div class="pd-kpi"><div class="pd-kpi-val pct">'+pctDone+'%</div><div class="pd-kpi-lbl">% completed</div></div>'
    +'</div>'
    +'<div class="pd-two-col">'
      +'<div class="pd-card">'
        +'<div class="pd-card-title">Overview</div>'
        +'<div class="pd-donut-wrap"><canvas id="pd-donut"></canvas>'
          +'<div class="pd-donut-center"><div class="pd-donut-pct">'+pctDone+'%</div><div class="pd-donut-sub">completed</div></div>'
        +'</div>'
        +'<div style="margin-top:14px">'
          +'<div class="pd-legend-row"><span class="pd-leg-name"><span class="pd-leg-dot" style="background:#3f3f46"></span>Unfinished</span><span class="pd-leg-val">'+totalUnfinished+' ('+Math.round((totalUnfinished/totalGames)*100)+'%)</span></div>'
          +'<div class="pd-legend-row"><span class="pd-leg-name"><span class="pd-leg-dot" style="background:#7F77DD"></span>Beaten</span><span class="pd-leg-val">'+totalBeaten+' ('+Math.round((totalBeaten/totalGames)*100)+'%)</span></div>'
          +'<div class="pd-legend-row"><span class="pd-leg-name"><span class="pd-leg-dot" style="background:#EF9F27"></span>Mastered</span><span class="pd-leg-val">'+totalMastered+' ('+Math.round((totalMastered/totalGames)*100)+'%)</span></div>'
        +'</div>'
      +'</div>'
      +'<div class="pd-card">'
        +'<div class="pd-card-title">Completion % by console</div>'
        +(barsHtml||'<div style="color:#737373;font-size:12px;">No completed games yet</div>')
      +'</div>'
    +'</div>'
    +'<div class="pd-viz-card">'
      +'<div class="pd-viz-header">'
        +'<span class="pd-viz-title" id="pd-viz-title">Games by console \xB7 animated bubbles</span>'
        +'<div class="pd-toggle-wrap">'
          +'<button class="pd-tog-btn active" data-v="bubble">Bubbles</button>'
          +'<button class="pd-tog-btn" data-v="treemap">Treemap</button>'
        +'</div>'
      +'</div>'
      +'<div class="pd-viz-legend">'
        +'<div class="pd-vl-item"><div class="pd-vl-dot" style="background:#52525b"></div>Unfinished</div>'
        +'<div class="pd-vl-item"><div class="pd-vl-dot" style="background:#7F77DD"></div>Beaten</div>'
        +'<div class="pd-vl-item"><div class="pd-vl-dot" style="background:#EF9F27"></div>Mastered</div>'
      +'</div>'
      +'<div class="pd-filter-row">'
        +'<button class="pd-filter-btn active" data-f="all">All</button>'
        +'<button class="pd-filter-btn" data-f="progress">With progress</button>'
        +'<button class="pd-filter-btn" data-f="mastered">Mastered</button>'
      +'</div>'
      +'<div class="pd-viz-wrap" id="pd-viz-wrap">'
        +'<canvas id="pd-viz-canvas"></canvas>'
        +'<div class="pd-viz-tip" id="pd-viz-tip"></div>'
      +'</div>'
    +'</div>'
    +'<div class="pd-mb-card">'
      +'<div class="pd-card-title">Mastered vs Beaten \xB7 consoles with progress</div>'
      +'<div style="position:relative;height:180px"><canvas id="pd-mb-chart"></canvas></div>'
    +'</div>'
  +'</div>';

  var pdWrapper = document.createElement('div');
  pdWrapper.innerHTML = html;
  var pdRoot = pdWrapper.firstChild;
  progSection.parentNode.insertBefore(pdRoot, progSection);
  progSection.style.display = 'none';

  // Chart.js charts
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#9ca3af';
    new Chart(document.getElementById('pd-donut').getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Unfinished','Beaten','Mastered'], datasets: [{ data: [totalUnfinished,totalBeaten,totalMastered], backgroundColor: ['#3f3f46','#7F77DD','#EF9F27'], borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(20,20,20,.95)', borderColor: 'rgba(255,255,255,.15)', borderWidth: 1, callbacks: { label: function(ctx){ return ' '+ctx.label+': '+ctx.raw; } } } } }
    });
    if (consolesWithProg.length) {
      var mbData = consolesWithProg.slice(0,8);
      new Chart(document.getElementById('pd-mb-chart').getContext('2d'), {
        type: 'bar',
        data: { labels: mbData.map(function(c){return c.shortName;}), datasets: [ { label: 'Beaten', data: mbData.map(function(c){return c.beaten||0;}), backgroundColor: '#7F77DD', borderRadius: 4 }, { label: 'Mastered', data: mbData.map(function(c){return c.mastered||0;}), backgroundColor: '#EF9F27', borderRadius: 4 } ] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: '#737373', font: { size: 12 } } }, y: { grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: '#737373', font: { size: 11 }, stepSize: 1 } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(20,20,20,.95)', borderColor: 'rgba(255,255,255,.15)', borderWidth: 1, callbacks: { label: function(ctx){ return ' '+ctx.dataset.label+': '+ctx.raw; } } } } }
      });
    }
  }

  // Bubble / Treemap canvas animation
  var vizWrap = document.getElementById('pd-viz-wrap');
  var vizCanvas = document.getElementById('pd-viz-canvas');
  var vizTip = document.getElementById('pd-viz-tip');
  var vizTitleEl = document.getElementById('pd-viz-title');
  var vCtx = vizCanvas.getContext('2d');
  var vizMode = 'bubble';
  var pdCurrentFilter = 'all';
  var vBubbles = [];
  var vAnimFrame = null;
  var vTmRects = [];

  function pdColorFor(d) {
    if ((d.mastered||0) > 0) return { fill: '#4a3600', stroke: '#EF9F27', text: '#fbbf24' };
    if ((d.beaten||0) > 0) return { fill: '#2d2b6e', stroke: '#7F77DD', text: '#a5b4fc' };
    return { fill: '#27272a', stroke: '#52525b', text: '#9ca3af' };
  }

  function pdFiltered(f) {
    if (f === 'progress') return consoles.filter(function(d){ return (d.beaten||0)+(d.mastered||0)>0; });
    if (f === 'mastered') return consoles.filter(function(d){ return (d.mastered||0)>0; });
    return consoles;
  }

  function pdInitBubbles(items) {
    var W = vizWrap.clientWidth, H = 380;
    vizCanvas.width = W; vizCanvas.height = H;
    var maxT = Math.max.apply(null, items.map(function(d){ return d.count; }));
    var minR = 18, maxR = Math.min(W/4, 90);
    vBubbles = items.map(function(d) {
      var r = minR + Math.sqrt(d.count/maxT) * (maxR-minR);
      return { shortName: d.shortName, consoleName: d.consoleName, count: d.count, beaten: d.beaten||0, mastered: d.mastered||0, r: r, x: r+Math.random()*(W-r*2), y: r+Math.random()*(H-r*2), vx: (Math.random()-.5)*.8, vy: (Math.random()-.5)*.8 };
    });
  }

  function pdSimulate() {
    var W = vizCanvas.width, H = vizCanvas.height;
    for (var i = 0; i < vBubbles.length; i++) {
      var a = vBubbles[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x-a.r < 0) { a.x=a.r; a.vx=Math.abs(a.vx); }
      if (a.x+a.r > W) { a.x=W-a.r; a.vx=-Math.abs(a.vx); }
      if (a.y-a.r < 0) { a.y=a.r; a.vy=Math.abs(a.vy); }
      if (a.y+a.r > H) { a.y=H-a.r; a.vy=-Math.abs(a.vy); }
      for (var j = i+1; j < vBubbles.length; j++) {
        var b = vBubbles[j];
        var dx = b.x-a.x, dy = b.y-a.y, dist = Math.sqrt(dx*dx+dy*dy), mn = a.r+b.r+2;
        if (dist < mn && dist > 0) {
          var nx = dx/dist, ny = dy/dist, ov = (mn-dist)/2;
          a.x -= nx*ov; a.y -= ny*ov; b.x += nx*ov; b.y += ny*ov;
          var rv = (a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
          if (rv > 0) { a.vx -= rv*nx*.5; a.vy -= rv*ny*.5; b.vx += rv*nx*.5; b.vy += rv*ny*.5; }
        }
      }
      var spd = Math.sqrt(a.vx*a.vx+a.vy*a.vy);
      if (spd > 1.2) { a.vx = a.vx/spd*1.2; a.vy = a.vy/spd*1.2; }
    }
  }

  function pdDrawBubbles() {
    vCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
    for (var i = 0; i < vBubbles.length; i++) {
      var b = vBubbles[i];
      var c = pdColorFor(b);
      var pct = Math.round(((b.beaten+b.mastered)/b.count)*100);
      vCtx.beginPath(); vCtx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      vCtx.fillStyle = c.fill; vCtx.fill();
      vCtx.strokeStyle = c.stroke; vCtx.lineWidth = 1.5; vCtx.stroke();
      if (b.r > 22) {
        vCtx.fillStyle = c.text; vCtx.textAlign = 'center'; vCtx.textBaseline = 'middle';
        var fs = Math.min(13, Math.max(10, b.r/3.2));
        vCtx.font = '500 '+fs+'px sans-serif';
        vCtx.fillText(b.shortName, b.x, b.r > 34 ? b.y-7 : b.y);
        if (b.r > 32) {
          vCtx.font = '400 '+Math.max(9,fs-2)+'px sans-serif';
          vCtx.fillStyle = c.text+'aa';
          vCtx.fillText(b.count+(pct>0?' \xB7 '+pct+'%':''), b.x, b.y+9);
        }
      }
    }
  }

  function pdBubbleLoop() { pdSimulate(); pdDrawBubbles(); vAnimFrame = requestAnimationFrame(pdBubbleLoop); }

  function pdSquarify(items, x, y, w, h) {
    var rects = [];
    function lay(nodes, lx, ly, lw, lh) {
      if (!nodes.length) return;
      if (nodes.length === 1) { rects.push(Object.assign({}, nodes[0], {x:lx,y:ly,w:lw,h:lh})); return; }
      var acc = 0, split = 0, tot = nodes.reduce(function(s,d){return s+d.value;},0);
      for (var i = 0; i < nodes.length; i++) { acc += nodes[i].value; if (acc >= tot/2) { split=i+1; break; } }
      var aN = nodes.slice(0,split), bN = nodes.slice(split);
      var aS = aN.reduce(function(s,d){return s+d.value;},0);
      if (lw >= lh) { var wa = lw*(aS/tot); lay(aN,lx,ly,wa,lh); lay(bN,lx+wa,ly,lw-wa,lh); }
      else { var ha = lh*(aS/tot); lay(aN,lx,ly,lw,ha); lay(bN,lx,ly+ha,lw,lh-ha); }
    }
    var tot = items.reduce(function(s,d){return s+d.value;},0);
    lay(items.map(function(d){return Object.assign({},d,{value:d.value/tot});}), x, y, w, h);
    return rects;
  }

  function pdDrawTreemap(items) {
    var W = vizWrap.clientWidth, H = 380;
    vizCanvas.width = W; vizCanvas.height = H;
    vCtx.clearRect(0, 0, W, H);
    var sorted = items.slice().map(function(d){return Object.assign({},d,{value:d.count});}).sort(function(a,b){return b.value-a.value;});
    vTmRects = pdSquarify(sorted, 0, 0, W, H);
    vTmRects.forEach(function(r) {
      var pad = 2, c = pdColorFor(r);
      vCtx.fillStyle = c.fill;
      vCtx.beginPath();
      if (vCtx.roundRect) vCtx.roundRect(r.x+pad, r.y+pad, r.w-pad*2, r.h-pad*2, 4);
      else vCtx.rect(r.x+pad, r.y+pad, r.w-pad*2, r.h-pad*2);
      vCtx.fill();
      var fw = r.w-pad*2, fh = r.h-pad*2;
      if (fw > 28 && fh > 18) {
        vCtx.fillStyle = c.text;
        var fs = Math.min(13, Math.max(10, fw/5));
        vCtx.font = '500 '+fs+'px sans-serif'; vCtx.textAlign = 'center'; vCtx.textBaseline = 'middle';
        var tx = r.x+r.w/2, ty = r.y+r.h/2;
        vCtx.fillText(r.shortName, tx, fh>32?ty-6:ty);
        if (fh > 30 && fw > 36) { vCtx.font = '400 '+Math.max(9,fs-2)+'px sans-serif'; vCtx.fillStyle = c.text+'bb'; vCtx.fillText(r.count, tx, ty+9); }
      }
    });
  }

  function pdStartViz() {
    cancelAnimationFrame(vAnimFrame); vAnimFrame = null;
    vizTip.style.display = 'none';
    var items = pdFiltered(pdCurrentFilter);
    if (vizMode === 'bubble') {
      vizTitleEl.textContent = 'Games by console \xB7 animated bubbles';
      pdInitBubbles(items); pdBubbleLoop();
    } else {
      vizTitleEl.textContent = 'Games by console \xB7 proportional size';
      pdDrawTreemap(items);
    }
  }

  pdRoot.querySelectorAll('.pd-tog-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      pdRoot.querySelectorAll('.pd-tog-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active'); vizMode = btn.getAttribute('data-v'); pdStartViz();
    });
  });

  pdRoot.querySelectorAll('.pd-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      pdRoot.querySelectorAll('.pd-filter-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active'); pdCurrentFilter = btn.getAttribute('data-f'); pdStartViz();
    });
  });

  vizWrap.addEventListener('mousemove', function(e) {
    var rect = vizCanvas.getBoundingClientRect();
    var mx = e.clientX-rect.left, my = e.clientY-rect.top;
    var hit = null;
    if (vizMode === 'bubble') {
      for (var i = 0; i < vBubbles.length; i++) { var bb = vBubbles[i]; if (Math.sqrt((mx-bb.x)*(mx-bb.x)+(my-bb.y)*(my-bb.y)) <= bb.r) { hit=bb; break; } }
    } else {
      for (var i = 0; i < vTmRects.length; i++) { var rr = vTmRects[i]; if (mx>=rr.x && mx<=rr.x+rr.w && my>=rr.y && my<=rr.y+rr.h) { hit=rr; break; } }
    }
    if (hit) {
      var pct = Math.round(((hit.beaten+hit.mastered)/hit.count)*100);
      vizTip.innerHTML = '<b>'+escapeHtml(hit.consoleName||hit.shortName)+'</b>'+hit.count+' games \xB7 '+pct+'% completed<br>Beaten: '+hit.beaten+' \xA0\xB7\xA0 Mastered: '+hit.mastered;
      vizTip.style.display = 'block';
      vizTip.style.left = Math.min(e.offsetX+14, vizWrap.clientWidth-160)+'px';
      vizTip.style.top = Math.max(e.offsetY-68, 4)+'px';
    } else { vizTip.style.display = 'none'; }
  });
  vizWrap.addEventListener('mouseleave', function(){ vizTip.style.display='none'; });
  window.addEventListener('resize', pdStartViz);
  pdStartViz();
}
