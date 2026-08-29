/**
 * The link to the game's RetroAchievements guide, when one exists.
 */

import { escapeHtml } from '../../core/dom.js';
import { log } from '../../core/log.js';

// =========================================
//        Guide Link Detection
// =========================================
export function injectGuideLink(props, divRoms, injectionTarget) {
  // Try Inertia props first, then DOM scraping
  var guideUrl = null;
  if (props && props.backingGame && props.backingGame.guideUrl) {
    guideUrl = props.backingGame.guideUrl;
  } else if (props && props.game && props.game.guideUrl) {
    guideUrl = props.game.guideUrl;
  }
  // Fallback: check if there's already a guide link in the DOM
  if (!guideUrl) {
    var existingGuide = document.querySelector('a[href*="github.com/RetroAchievements/guides"]');
    if (existingGuide) guideUrl = existingGuide.href;
  }
  if (!guideUrl) {
    log.debug("[Guide] No guide URL found for this game");
    return;
  }
  // Don't inject if there's already a visible guide button
  if (document.getElementById('enhanced-guide-link')) return;

  log.info("[Guide] Found guide: " + guideUrl);

  var guideDiv = document.createElement("div");
  guideDiv.id = "enhanced-guide-link";
  guideDiv.style.cssText = "margin:0.75em 0;";
  guideDiv.innerHTML =
    '<a href="' + escapeHtml(guideUrl) + '" target="_blank" rel="noopener" '
    + 'style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;'
    + 'background:rgba(59,130,246,0.08);border:1px solid var(--ra-accent,#3b82f6);'
    + 'color:var(--ra-accent,#3b82f6);text-decoration:none;font-weight:600;font-size:0.9em;transition:all 0.2s;"'
    + ' onmouseover="this.style.background=\'rgba(59,130,246,0.15)\'"'
    + ' onmouseout="this.style.background=\'rgba(59,130,246,0.08)\'">'
    + '<span style="font-size:1.2em;">📖</span>'
    + '<span>RA Achievement Guide</span>'
    + '<span style="margin-left:auto;font-size:0.85em;opacity:0.7;">↗</span>'
    + '</a>';

  // Insert before ROM section in sidebar
  if (divRoms && divRoms.parentNode) {
    divRoms.parentNode.insertBefore(guideDiv, divRoms);
  } else if (injectionTarget) {
    injectionTarget.appendChild(guideDiv);
  }
}
