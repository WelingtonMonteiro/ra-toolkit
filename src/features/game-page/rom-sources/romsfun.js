/**
 * RomsFun, via their WordPress API.
 */

import { gmFetch } from '../../../core/gm.js';
import { log } from '../../../core/log.js';
import { RAConsole } from '../consoles.js';

export function searchRomsFun(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  var searchUrl = "https://romsfun.com/wp-json/wp/v2/rom?search=" + encodeURIComponent(gameTitle) + "&per_page=10";
  var expectedSlug = romsfunConsoleSlug[consoleName] || "";

  return gmFetch(searchUrl, 15000).then(function (resp) {
    var data = JSON.parse(resp.responseText);
    if (!Array.isArray(data) || data.length === 0) return;

    // First pass: refined match with console filter
    data.forEach(function (rom) {
      var romTitle = (rom.title && rom.title.rendered) || "";
      var romLink = rom.link || "";
      var romSlug = rom.slug || "";
      var romId = rom.id;

      // Filter by console slug in the URL if available
      if (expectedSlug && !romLink.includes("/roms/" + expectedSlug + "/")) return;

      if (refinedCompare(romTitle, gameTitle)) {
        results.push({
          name: romTitle + " (RomsFun)",
          url: "https://romsfun.com/download/" + romSlug + "-" + romId
        });
      }
    });

    // Second pass: loose match if nothing found
    if (results.length === 0) {
      data.forEach(function (rom) {
        var romTitle = (rom.title && rom.title.rendered) || "";
        var romLink = rom.link || "";
        var romSlug = rom.slug || "";
        var romId = rom.id;

        if (expectedSlug && !romLink.includes("/roms/" + expectedSlug + "/")) return;

        if (compare(romTitle, gameTitle)) {
          results.push({
            name: romTitle + " (RomsFun)",
            url: "https://romsfun.com/download/" + romSlug + "-" + romId
          });
        }
      });
    }
    return true;
  }).catch(function (err) {
    log.warn("RomsFun search failed: " + err.message);
    return true;
  });
}
