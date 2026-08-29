/**
 * The stylesheet behind the pagination, stat cards and insights modules.
 */

/** Injects the stylesheet the profile widgets share. Runs once. */
export function injectProfileStyles() {
  if (document.getElementById("enhanced-pagination-style")) return;

  var style = document.createElement("style");
  style.id = "enhanced-pagination-style";
  style.textContent = `
    @keyframes enhanced-spin { to { transform: rotate(360deg); } }
    .enhanced-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .enhanced-pagination button {
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.15);
      background: transparent;
      color: #a3a3a3;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.2s;
    }
    .enhanced-pagination button:hover:not(:disabled) {
      background: rgba(255,255,255,0.08);
      color: #e5e5e5;
      border-color: rgba(255,255,255,0.25);
    }
    .enhanced-pagination button.active {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;
    }
    .enhanced-pagination button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .enhanced-pagination .page-info {
      color: #a3a3a3;
      font-size: 0.8em;
    }
    .enhanced-games-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    @keyframes enhanced-skeleton-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .enhanced-skeleton-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 6px;
      background: rgba(255,255,255,0.03);
      animation: enhanced-skeleton-pulse 1.5s ease-in-out infinite;
    }
    .enhanced-skeleton-img {
      width: 58px;
      height: 58px;
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .enhanced-skeleton-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .enhanced-skeleton-line {
      height: 12px;
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
    }
    .enhanced-skeleton-line.w-60 { width: 60%; }
    .enhanced-skeleton-line.w-40 { width: 40%; }
    .enhanced-skeleton-line.w-30 { width: 30%; }
    .enhanced-skeleton-bar {
      height: 8px;
      width: 100%;
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      margin-top: 2px;
    }
    /* Enhanced User Stats */
    .stats-root { padding: 0; }
    .stats-title { font-size: 11px; font-weight: 500; color: #9ca3af; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 14px; }
    .stats-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .stats-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .metric-card { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .card-top { display: flex; align-items: center; justify-content: space-between; }
    .metric-label { font-size: 11px; color: #9ca3af; }
    .card-icon { font-size: 14px; line-height: 1; opacity: 0.7; }
    .metric-value { font-size: 20px; font-weight: 500; line-height: 1.1; }
    .metric-value-sm { font-size: 16px; font-weight: 500; line-height: 1.1; }
    .metric-sub { font-size: 11px; color: #9ca3af; }
    .stats-divider { border: none; border-top: 0.5px solid rgba(255,255,255,0.1); margin: 14px 0; }
    .section-label { font-size: 11px; font-weight: 500; color: #9ca3af; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
    /* Player Insights Dashboard */
    .enhanced-dashboard {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .enhanced-dashboard-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e4e4e7;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .enhanced-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .enhanced-stat-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: border-color 0.2s;
    }
    .enhanced-stat-card:hover {
      border-color: rgba(255,255,255,0.15);
    }
    .enhanced-stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #e4e4e7;
      line-height: 1.2;
    }
    .enhanced-stat-label {
      font-size: 0.7rem;
      color: #737373;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .enhanced-dashboard-section {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 14px 16px;
    }
    .enhanced-dashboard-section-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #a3a3a3;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .enhanced-almost-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .enhanced-almost-item:last-child { border-bottom: none; }
    .enhanced-almost-img {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .enhanced-almost-info {
      flex: 1;
      min-width: 0;
    }
    .enhanced-almost-name {
      font-size: 0.8rem;
      color: #e4e4e7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: none;
    }
    .enhanced-almost-name:hover { color: #60a5fa; }
    .enhanced-almost-meta {
      font-size: 0.7rem;
      color: #737373;
    }
    .enhanced-almost-bar-bg {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255,255,255,0.06);
      margin-top: 3px;
    }
    .enhanced-almost-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      transition: width 0.5s ease;
    }

    .enhanced-dashboard-skeleton {
      animation: enhanced-skeleton-pulse 1.5s ease-in-out infinite;
      background: rgba(255,255,255,0.06);
      border-radius: 6px;
    }
    /* Streak Tracker */
    .enhanced-streak-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .enhanced-streak-big {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
      color: #f97316;
      min-width: 56px;
      text-align: center;
    }
    .enhanced-streak-info {
      font-size: 0.78rem;
      color: #a3a3a3;
      line-height: 1.4;
    }
    .enhanced-streak-detail {
      font-size: 0.7rem;
      color: #525252;
    }
    /* Rarest Achievements */
    .enhanced-rare-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .enhanced-rare-item:hover {
      background: rgba(255,255,255,0.06);
    }
    .enhanced-rare-item:last-child { border-bottom: none; }
    .enhanced-rare-badge {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .enhanced-rare-info {
      flex: 1;
      min-width: 0;
    }
    .enhanced-rare-title {
      font-size: 0.8rem;
      color: #e4e4e7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .enhanced-rare-meta {
      font-size: 0.7rem;
      color: #737373;
    }
    .enhanced-rare-ratio {
      font-size: 0.75rem;
      font-weight: 700;
      color: #a78bfa;
      flex-shrink: 0;
      text-align: right;
      min-width: 40px;
    }
    /* Activity Timeline (GitHub contributions style - yearly heatmap) */
    .enhanced-timeline-wrapper {
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .enhanced-timeline-table {
      display: grid;
      gap: 2px;
      min-width: 0;
      width: 100%;
    }
    .enhanced-timeline-month-label {
      font-size: 0.55rem;
      color: #737373;
      text-align: left;
      white-space: nowrap;
      overflow: visible;
      line-height: 1;
      padding-bottom: 1px;
      position: relative;
    }
    .enhanced-timeline-day-label {
      font-size: 0.55rem;
      color: #737373;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 4px;
      line-height: 1;
    }
    .enhanced-timeline-cell {
      border-radius: 2px;
      min-width: 0;
      cursor: default;
    }
    .enhanced-timeline-cell.level-0 { background: rgba(255,255,255,0.04); }
    .enhanced-timeline-cell.level-1 { background: rgba(59,130,246,0.25); }
    .enhanced-timeline-cell.level-2 { background: rgba(59,130,246,0.5); }
    .enhanced-timeline-cell.level-3 { background: rgba(59,130,246,0.75); }
    .enhanced-timeline-cell.level-4 { background: #3b82f6; }
    /* Mastered mode (gold) */
    .enhanced-timeline-cell.mastered-1 { background: rgba(251,191,36,0.25); }
    .enhanced-timeline-cell.mastered-2 { background: rgba(251,191,36,0.5); }
    .enhanced-timeline-cell.mastered-3 { background: rgba(251,191,36,0.75); }
    .enhanced-timeline-cell.mastered-4 { background: #fbbf24; }
    /* Beaten mode (gray) */
    .enhanced-timeline-cell.beaten-1 { background: rgba(163,163,163,0.25); }
    .enhanced-timeline-cell.beaten-2 { background: rgba(163,163,163,0.5); }
    .enhanced-timeline-cell.beaten-3 { background: rgba(163,163,163,0.75); }
    .enhanced-timeline-cell.beaten-4 { background: #a3a3a3; }

    .enhanced-timeline-tooltip {
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      background: #1a1a2e;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.7rem;
      color: #e5e5e5;
      line-height: 1.6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.12s;
    }
    .enhanced-timeline-tooltip.visible { opacity: 1; }
    .enhanced-timeline-tooltip .tooltip-date {
      font-weight: 700;
      margin-bottom: 2px;
      color: #fff;
    }
    .enhanced-timeline-tooltip .tooltip-line {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .enhanced-timeline-tooltip .tooltip-line .tooltip-icon { font-size: 0.75rem; }
    .enhanced-timeline-tooltip .tooltip-no-activity { color: #737373; font-style: italic; }
    .enhanced-timeline-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 0.6rem;
      color: #525252;
    }
    .enhanced-timeline-legend {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6rem;
      color: #525252;
    }
    .enhanced-timeline-legend-cell {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
    .enhanced-timeline-toggle-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }
    .enhanced-timeline-toggle-btn {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #a3a3a3;
      transition: all 0.15s;
    }
    .enhanced-timeline-toggle-btn:hover {
      background: rgba(255,255,255,0.08);
    }
    .enhanced-timeline-toggle-btn.active {
      border-color: var(--toggle-color, #3b82f6);
      color: var(--toggle-color, #3b82f6);
      background: var(--toggle-bg, rgba(59,130,246,0.12));
    }
    .enhanced-timeline-total {
      font-size: 0.75rem;
      font-weight: 600;
      color: #a3a3a3;
      margin-left: 8px;
    }
  `;
  document.head.appendChild(style);
}
