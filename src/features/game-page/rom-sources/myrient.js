/**
 * Myrient directory listings — the primary ROM source.
 */

import { parseHtml } from '../../../core/dom.js';
import { gmFetch } from '../../../core/gm.js';
import { log } from '../../../core/log.js';

// =========================================
//          Myrient Search Function
// =========================================
export function chainSearchMyrient(urls, ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  let promise = searchMyrient(urls[0], ctx);
  for (let i = 1; i < urls.length; i++) {
    promise = promise.then(() => {
      if (results.length === 0) {
        return searchMyrient(urls[i], ctx);
      }
    });
  }
  return promise;
}

export function searchMyrient(mainDir, ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  return gmFetch(mainDir).then(function (response) {
    var doc = parseHtml(response.responseText);
    var cells = doc.querySelectorAll("td > :first-child");

    cells.forEach(function (el) {
      var textContent = el.textContent;
      var match = /([^\/]+)\/?$/g.exec(textContent);
      if (!match) return;
      var title = match[1];

      if (refinedCompare(title, gameTitle)) {
        var fullUrl = mainDir.endsWith("/") ?
          mainDir + el.getAttribute("href") : mainDir + "/" + el.getAttribute("href");
        results.push({ name: title, url: fullUrl });
      }
    });

    if (results.length === 0) {
      cells.forEach(function (el) {
        var textContent = el.textContent;
        var match = /([^\/]+)\/?$/g.exec(textContent);
        if (!match) return;
        var title = match[1];

        if (compare(title, gameTitle)) {
          var fullUrl = mainDir.endsWith("/") ?
            mainDir + el.getAttribute("href") : mainDir + "/" + el.getAttribute("href");
          results.push({ name: title, url: fullUrl });
        }
      });
    }
    return true;
  }).catch(function (err) {
    log.warn("Myrient search failed: " + err.message);
    return true;
  });
}
