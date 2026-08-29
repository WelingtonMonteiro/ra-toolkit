/**
 * 24h cache for ROM search results, backed by GM storage.
 */

import { log } from './log.js';

// =========================================
//     ROM Search Cache (GM_setValue + TTL)
// =========================================
export var ROM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getRomCacheKey(gameTitle, consoleName) {
  return 'romCache_' + consoleName + '_' + gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function getCachedRomResults(gameTitle, consoleName) {
  var key = getRomCacheKey(gameTitle, consoleName);
  return Promise.resolve(GM_getValue(key, null)).then(function (cached) {
    if (!cached) return null;
    if (Date.now() - cached.ts > ROM_CACHE_TTL) {
      GM_deleteValue(key);
      return null;
    }
    log.info("[Cache] Hit for " + gameTitle + " (" + cached.results.length + " results, age " + Math.round((Date.now() - cached.ts) / 60000) + "m)");
    return cached;
  });
}

export function setCachedRomResults(gameTitle, consoleName, results, resultsDlcs, collectionName, collectionUrl) {
  var key = getRomCacheKey(gameTitle, consoleName);
  GM_setValue(key, {
    ts: Date.now(),
    results: results,
    resultsDlcs: resultsDlcs,
    collection: { name: collectionName, url: collectionUrl }
  });
  log.info("[Cache] Stored " + results.length + " results for " + gameTitle);
}
