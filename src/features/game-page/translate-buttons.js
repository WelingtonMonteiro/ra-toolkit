/**
 * Per-achievement translate buttons on the game page.
 */

import { translateWithRateLimit } from '../../core/translate.js';
import { log } from '../../core/log.js';

// =========================================
//     Achievement Translation Feature
// =========================================
function translateText(text, targetLang) {
  return translateWithRateLimit(text, targetLang);
}

export function injectTranslateButtons(translateLang) {
  // Inject CSS once
  if (!document.getElementById("enhanced-translate-style")) {
    var style = document.createElement("style");
    style.id = "enhanced-translate-style";
    style.textContent = `
      .enhanced-translate-btn {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        background: transparent;
        color: #a3a3a3;
        font-size: 0.7em;
        cursor: pointer;
        transition: all 0.2s;
        vertical-align: middle;
        margin-left: 6px;
      }
      .enhanced-translate-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #e5e5e5;
        border-color: rgba(255,255,255,0.25);
      }
      .enhanced-translate-btn.translating {
        opacity: 0.6;
        pointer-events: none;
      }
      .enhanced-translate-btn.translated {
        color: #3b82f6;
        border-color: rgba(59,130,246,0.3);
      }
      .enhanced-translate-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Find all achievement list items
  var items = document.querySelectorAll("li.game-set-item");
  items.forEach(function (li) {
    // Skip if already has a translate button
    if (li.querySelector(".enhanced-translate-btn")) return;

    // Find the description paragraph — it's the <p class="leading-4"> inside the title/description area
    var descPs = li.querySelectorAll("p.leading-4");
    var descP = null;
    for (var i = 0; i < descPs.length; i++) {
      // The description <p> is the one that doesn't contain progress bar info
      // It's typically the first p.leading-4 that has direct text content
      var txt = descPs[i].textContent.trim();
      if (txt && !txt.match(/^\d+\s*(of|de)\s*\d+/)) {
        descP = descPs[i];
        break;
      }
    }
    if (!descP) return;

    // Find the title link
    var titleLink = li.querySelector("a.font-medium");

    var btn = document.createElement("button");
    btn.className = "enhanced-translate-btn";

    var originalDesc = descP.textContent;
    var originalTitle = titleLink ? titleLink.textContent : "";
    var textToCheck = (originalTitle ? originalTitle + "\n" : "") + originalDesc;

    if (textToCheck.length > 500) {
      btn.classList.add("disabled");
      btn.title = "Text exceeds 500 character limit for translation (" + textToCheck.length + " chars)";
      btn.innerHTML = '&#x1F310; Too long';
      descP.appendChild(btn);
      return;
    }

    btn.title = "Translate to " + translateLang;
    btn.innerHTML = '&#x1F310; Translate';

    var isTranslated = false;
    var translatedDesc = null;
    var translatedTitle = null;

    btn.addEventListener("click", function () {
      if (btn.classList.contains("translating")) return;

      // Toggle back to original
      if (isTranslated) {
        descP.textContent = originalDesc;
        if (titleLink) titleLink.textContent = originalTitle;
        btn.innerHTML = '&#x1F310; Translate';
        btn.classList.remove("translated");
        isTranslated = false;
        return;
      }

      // Use cached translation if available
      if (translatedDesc) {
        descP.textContent = translatedDesc;
        if (titleLink && translatedTitle) titleLink.textContent = translatedTitle;
        btn.innerHTML = '&#x1F310; Original';
        btn.classList.add("translated");
        isTranslated = true;
        return;
      }

      // Fetch translation
      btn.classList.add("translating");
      btn.innerHTML = '&#x23F3; ...';

      var textToTranslate = originalDesc;
      if (titleLink && originalTitle) {
        textToTranslate = originalTitle + "\n" + originalDesc;
      }

      translateText(textToTranslate, translateLang)
        .then(function (result) {
          var parts = result.split("\n");
          if (titleLink && originalTitle && parts.length >= 2) {
            translatedTitle = parts[0];
            translatedDesc = parts.slice(1).join("\n");
            titleLink.textContent = translatedTitle;
          } else {
            translatedDesc = result;
          }
          descP.textContent = translatedDesc;
          btn.innerHTML = '&#x1F310; Original';
          btn.classList.remove("translating");
          btn.classList.add("translated");
          isTranslated = true;
        })
        .catch(function (err) {
          log.warn("Translation failed: " + err.message);
          var isRateLimit = err.message && err.message.indexOf('RATE_LIMIT') === 0;
          btn.innerHTML = isRateLimit ? '&#x26D4; Limit' : '&#x26A0; Error';
          btn.title = isRateLimit ? err.message.replace('RATE_LIMIT: ', '') : 'Translation failed';
          btn.classList.remove("translating");
          if (!isRateLimit) {
            setTimeout(function () {
              btn.innerHTML = '&#x1F310; Translate';
              btn.title = 'Translate to ' + translateLang;
            }, 2000);
          }
        });
    });

    // Insert the button after the description
    descP.appendChild(btn);
  });
}
