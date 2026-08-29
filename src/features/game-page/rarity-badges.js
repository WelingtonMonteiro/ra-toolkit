/**
 * Colour-coded rarity badges on achievement rows.
 */

import { getRarityTier } from '../../core/rarity.js';

// =========================================
//     Achievement Rarity Indicator
// =========================================
export function injectRarityIndicators() {
  // Inject rarity CSS once
  if (!document.getElementById("enhanced-rarity-style")) {
    var rarityStyle = document.createElement("style");
    rarityStyle.id = "enhanced-rarity-style";
    rarityStyle.textContent = `
      .enhanced-rarity-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.65em;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
        vertical-align: middle;
        margin-left: 6px;
        line-height: 1.6;
      }
      .enhanced-rarity-badge .enhanced-rarity-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      li.game-set-item.enhanced-rarity-bordered {
        border-left: 3px solid var(--enhanced-rarity-color, transparent);
        padding-left: 4px;
      }
    `;
    document.head.appendChild(rarityStyle);
  }

  var items = document.querySelectorAll("li.game-set-item");
  items.forEach(function (li) {
    if (li.querySelector(".enhanced-rarity-badge")) return;

    // Parse unlock percentage from the DOM (language-agnostic)
    // The dedicated unlock rate <p> has class "text-center text-2xs"
    // e.g. "45.25% unlock rate" (en) or "45,25% taxa de desbloqueio" (pt-BR)
    var percentage = null;

    // Primary: find the dedicated unlock rate paragraph by its text-center class
    var centerPs = li.querySelectorAll("p.text-center");
    for (var i = 0; i < centerPs.length; i++) {
      var txt = centerPs[i].textContent || '';
      var match = txt.match(/([\d,.]+)\s*%/);
      if (match) {
        percentage = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    // Fallback: any <p> with a percentage followed by unlock-related text
    if (percentage === null) {
      var textEls = li.querySelectorAll("p");
      for (var j = 0; j < textEls.length; j++) {
        var txt2 = textEls[j].textContent || '';
        var match2 = txt2.match(/([\d,.]+)\s*%\s*(?:unlock\s*rate|taxa\s*de\s*desbloqueio)/i);
        if (match2) {
          percentage = parseFloat(match2[1].replace(',', '.'));
          break;
        }
      }
    }

    if (percentage === null || isNaN(percentage)) return;

    var tier = getRarityTier(percentage);

    // Add colored left border
    li.classList.add("enhanced-rarity-bordered");
    li.style.setProperty("--enhanced-rarity-color", tier.color);

    // Find the title area (after the title link) to inject the badge
    var titleSpan = li.querySelector("a.font-medium");
    if (!titleSpan) return;

    var badge = document.createElement("span");
    badge.className = "enhanced-rarity-badge";
    badge.style.cssText = "color:" + tier.color + ";background:" + tier.bg + ";border:1px solid " + tier.color + "30;";
    badge.title = percentage.toFixed(2) + "% unlock rate";
    badge.innerHTML = '<span class="enhanced-rarity-dot" style="background:' + tier.color + ';"></span>' + tier.label;

    // Insert after the title link's parent span
    var titleContainer = titleSpan.parentElement;
    if (titleContainer) {
      titleContainer.appendChild(badge);
    }
  });
}
