/**
 * Translate buttons on wall and achievement comments.
 */

import { escapeHtml } from '../../core/dom.js';
import { log } from '../../core/log.js';
import { translateWithRateLimit } from '../../core/translate.js';

// =========================================
//   Comment Translation (User Wall + Achievement Pages)
// =========================================
export async function initWallTranslation() {
  var isUserCommentsPage = /^\/user\/[^\/]+(\/(comments)?)?$/i.test(location.pathname);
  var isAchievementPage = /^\/achievement\/\d+(\/.*)?$/i.test(location.pathname);
  if (!isUserCommentsPage && !isAchievementPage) return;

  var wallLang = await GM_getValue("translateLang", "pt-BR");

  function wallTranslateText(text, targetLang) {
    return translateWithRateLimit(text, targetLang);
  }

  // Inject CSS once (reuses same class names as achievement translate)
  if (!document.getElementById("enhanced-wall-translate-style")) {
    var style = document.createElement("style");
    style.id = "enhanced-wall-translate-style";
    style.textContent = `
      .enhanced-wall-translate-btn {
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
        margin-top: 4px;
      }
      .enhanced-wall-translate-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #e5e5e5;
        border-color: rgba(255,255,255,0.25);
      }
      .enhanced-wall-translate-btn.translating {
        opacity: 0.6;
        pointer-events: none;
      }
      .enhanced-wall-translate-btn.translated {
        color: #3b82f6;
        border-color: rgba(59,130,246,0.3);
      }
      .enhanced-wall-translate-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function injectWallTranslateButtons() {
    // Legacy profile page: <tr class="comment group"> inside <table id="feed">
    //   Comment body: <div style="word-break: break-word;"> inside <td>
    // React /comments page: <li class="group ..."> inside <ul class="highlighted-list">
    //   Comment body: <p style="word-break: break-word">
    var commentItems = document.querySelectorAll(
      'tr.comment.group, .commentscomponent tr.comment, ul.highlighted-list > li'
    );

    commentItems.forEach(function (el) {
      if (el.querySelector('.enhanced-wall-translate-btn')) return;

      // Find the comment body element (<div> or <p> with word-break style)
      var bodyEl = null;

      // Strategy 1: any element with word-break in style (works for both legacy <div> and React <p>)
      var candidates = el.querySelectorAll('[style*="word-break"]');
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].textContent.trim()) {
          bodyEl = candidates[i];
          break;
        }
      }

      // Strategy 2: For legacy Blade — <td> with colspan, last <div> child
      if (!bodyEl) {
        var td = el.querySelector('td[colspan]') || el.querySelector('td.w-full');
        if (td) {
          var divs = td.querySelectorAll(':scope > div');
          for (var j = divs.length - 1; j >= 0; j--) {
            var txt = divs[j].textContent.trim();
            if (txt && !divs[j].querySelector('.smalldate') && txt.length > 2) {
              bodyEl = divs[j];
              break;
            }
          }
        }
      }

      // Strategy 3: For React — <p> inside div.w-full
      if (!bodyEl) {
        var contentDiv = el.querySelector('div.w-full');
        if (contentDiv) {
          var ps = contentDiv.querySelectorAll(':scope > p');
          for (var k = ps.length - 1; k >= 0; k--) {
            var t = ps[k].textContent.trim();
            if (t && !ps[k].querySelector('.smalldate') && t.length > 2) {
              bodyEl = ps[k];
              break;
            }
          }
        }
      }

      if (!bodyEl || !bodyEl.textContent.trim()) return;

      var btn = document.createElement('button');
      btn.className = 'enhanced-wall-translate-btn';

      var commentText = bodyEl.textContent.trim();
      if (commentText.length > 500) {
        btn.classList.add('disabled');
        btn.title = 'Text exceeds 500 character limit for translation (' + commentText.length + ' chars)';
        btn.innerHTML = '&#x1F310; Too long';
        bodyEl.after(btn);
        return;
      }

      btn.title = 'Translate to ' + wallLang;
      btn.innerHTML = '&#x1F310; Translate';

      var isTranslated = false;
      var originalText = bodyEl.innerHTML;
      var translatedText = null;

      btn.addEventListener('click', function () {
        if (btn.classList.contains('translating')) return;

        if (isTranslated) {
          bodyEl.innerHTML = originalText;
          btn.innerHTML = '&#x1F310; Translate';
          btn.classList.remove('translated');
          isTranslated = false;
          return;
        }

        if (translatedText) {
          bodyEl.innerHTML = translatedText;
          btn.innerHTML = '&#x1F310; Original';
          btn.classList.add('translated');
          isTranslated = true;
          return;
        }

        btn.classList.add('translating');
        btn.innerHTML = '&#x23F3; ...';

        wallTranslateText(bodyEl.textContent.trim(), wallLang)
          .then(function (result) {
            // Preserve line breaks
            translatedText = escapeHtml(result).replace(/\n/g, '<br>');
            bodyEl.innerHTML = translatedText;
            btn.innerHTML = '&#x1F310; Original';
            btn.classList.remove('translating');
            btn.classList.add('translated');
            isTranslated = true;
          })
          .catch(function (err) {
            log.warn('Wall translation failed: ' + err.message);
            var isRateLimit = err.message && err.message.indexOf('RATE_LIMIT') === 0;
            btn.innerHTML = isRateLimit ? '&#x26D4; Limit' : '&#x26A0; Error';
            btn.title = isRateLimit ? err.message.replace('RATE_LIMIT: ', '') : 'Translation failed';
            btn.classList.remove('translating');
            if (!isRateLimit) {
              setTimeout(function () {
                btn.innerHTML = '&#x1F310; Translate';
                btn.title = 'Translate to ' + wallLang;
              }, 2000);
            }
          });
      });

      // Insert button after the comment body element
      bodyEl.after(btn);
    });
  }

  // Run with delay to let page render, then observe for dynamic changes
  await new Promise(function (r) { setTimeout(r, 1000); });
  injectWallTranslateButtons();

  var wallObserver = new MutationObserver(function () {
    injectWallTranslateButtons();
  });
  var wallContainer = document.querySelector('.commentscomponent')
    || document.querySelector('ul.highlighted-list')
    || document.querySelector('main')
    || document.body;
  wallObserver.observe(wallContainer, { childList: true, subtree: true });

  log.info('Comment translation initialized');
}
