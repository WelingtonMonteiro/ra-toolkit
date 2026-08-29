/**
 * Linkifying comments and embedding YouTube/images.
 */

import { log } from '../../core/log.js';

// =========================================
//   Comments (User Wall + Achievement Pages) — Linkify + Media Embed
// =========================================
export function initWallLinkify() {
  var isUserCommentsPage = /^\/user\/[^\/]+(\/(comments)?)?$/i.test(location.pathname);
  var isAchievementPage = /^\/achievement\/\d+(\/.*)?$/i.test(location.pathname);
  if (!isUserCommentsPage && !isAchievementPage) return;

  // Inject CSS once
  if (!document.getElementById('enhanced-wall-linkify-style')) {
    var style = document.createElement('style');
    style.id = 'enhanced-wall-linkify-style';
    style.textContent = `
      .enhanced-wall-link {
        color: var(--ra-accent, #3b82f6);
        text-decoration: underline;
        word-break: break-all;
      }
      .enhanced-wall-link:hover {
        opacity: 0.8;
      }
      .enhanced-yt-embed {
        display: block;
        margin-top: 6px;
        border-radius: 6px;
        overflow: hidden;
        max-width: 360px;
        aspect-ratio: 16/9;
      }
      .enhanced-yt-embed iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }
      .enhanced-img-preview {
        display: block;
        margin-top: 6px;
        max-width: 360px;
        max-height: 300px;
        border-radius: 6px;
        object-fit: contain;
        cursor: pointer;
      }
      .enhanced-img-preview:hover {
        opacity: 0.85;
      }
    `;
    document.head.appendChild(style);
  }

  // Check if URL points to an image
  var imageExtRegex = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)(\?[^#]*)?$/i;
  function isImageUrl(url) {
    return imageExtRegex.test(url);
  }

  // Extract YouTube video ID from various URL formats
  function extractYouTubeId(url) {
    var m = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function linkifyCommentBody(bodyEl) {
    if (bodyEl.getAttribute('data-enhanced-linkified')) return;
    bodyEl.setAttribute('data-enhanced-linkified', '1');

    // Process text nodes only (preserve existing HTML structure)
    var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    // URL regex — match http(s) and www. URLs
    var urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

    var youtubeIds = [];
    var imageUrls = [];

    textNodes.forEach(function (node) {
      var text = node.textContent;
      if (!urlRegex.test(text)) return;
      urlRegex.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var lastIdx = 0;
      var match;

      while ((match = urlRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }

        var rawUrl = match[0].replace(/[.,;:!?)]+$/, ''); // trim trailing punctuation
        var href = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl;

        var a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'enhanced-wall-link';
        a.textContent = rawUrl;
        frag.appendChild(a);

        // Check for YouTube
        var ytId = extractYouTubeId(href);
        if (ytId && youtubeIds.indexOf(ytId) === -1) {
          youtubeIds.push(ytId);
        }

        // Check for image
        if (isImageUrl(href) && imageUrls.indexOf(href) === -1) {
          imageUrls.push(href);
        }

        lastIdx = match.index + match[0].length;
        // Adjust if we trimmed trailing punctuation
        var trimmed = match[0].length - rawUrl.length;
        if (trimmed > 0) {
          frag.appendChild(document.createTextNode(match[0].slice(match[0].length - trimmed)));
        }
      }

      // Remaining text after last match
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      node.parentNode.replaceChild(frag, node);
    });

    // Append YouTube embeds after the comment body
    youtubeIds.forEach(function (ytId) {
      var wrapper = document.createElement('div');
      wrapper.className = 'enhanced-yt-embed';
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(ytId);
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      wrapper.appendChild(iframe);
      bodyEl.appendChild(wrapper);
    });

    // Append image previews
    imageUrls.forEach(function (imgUrl) {
      var img = document.createElement('img');
      img.className = 'enhanced-img-preview';
      img.src = imgUrl;
      img.alt = 'Image preview';
      img.loading = 'lazy';
      img.title = 'Click to open in new tab';
      img.addEventListener('click', function () {
        window.open(imgUrl, '_blank', 'noopener,noreferrer');
      });
      bodyEl.appendChild(img);
    });
  }

  function processAllComments() {
    var commentItems = document.querySelectorAll(
      'tr.comment.group, .commentscomponent tr.comment, ul.highlighted-list > li'
    );

    commentItems.forEach(function (el) {
      var bodyEl = null;

      // Strategy 1: element with word-break style
      var candidates = el.querySelectorAll('[style*="word-break"]');
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].textContent.trim()) {
          bodyEl = candidates[i];
          break;
        }
      }

      // Strategy 2: legacy Blade — td with colspan
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

      // Strategy 3: React — p inside div.w-full
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

      if (!bodyEl) return;
      linkifyCommentBody(bodyEl);
    });
  }

  setTimeout(processAllComments, 800);

  var linkifyObserver = new MutationObserver(function () {
    processAllComments();
  });
  var container = document.querySelector('.commentscomponent')
    || document.querySelector('ul.highlighted-list')
    || document.querySelector('main')
    || document.body;
  linkifyObserver.observe(container, { childList: true, subtree: true });

  log.info('Comments linkify initialized');
}
