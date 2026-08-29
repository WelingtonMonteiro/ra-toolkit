/**
 * The spinner shown in the sidebar while ROM sources are queried.
 */

import { escapeHtml } from '../../core/dom.js';

// Show loading indicator while searching
var loadingEl = null;
export function showLoading(container, text) {
  loadingEl = document.createElement("div");
  loadingEl.id = "enhanced-loading";
  loadingEl.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 0;color:#a3a3a3;font-size:0.9em;";
  loadingEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" style="animation:enhanced-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>'
    + '<span>' + escapeHtml(text) + '</span>';
  var spinStyle = document.getElementById("enhanced-spin-style");
  if (!spinStyle) {
    spinStyle = document.createElement("style");
    spinStyle.id = "enhanced-spin-style";
    spinStyle.textContent = "@keyframes enhanced-spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(spinStyle);
  }
  container.appendChild(loadingEl);
}
export function hideLoading() {
  if (loadingEl) { loadingEl.remove(); loadingEl = null; }
}
