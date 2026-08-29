/**
 * Verifying a ROM filename against RetroAchievements' known hashes.
 */

import { escapeHtml } from '../../core/dom.js';
import { gmFetch } from '../../core/gm.js';
import { log } from '../../core/log.js';
import { extractRegions, normalizeRomName, titleOnlyRomName } from './rom-name.js';

// =========================================
//       Hash Verification via RA API
// =========================================

export function fetchGameHashes(gId, enableHashCheck) {
  return Promise.resolve(GM_getValue("raApiKey", "")).then(function (apiKey) {
    log.info("[HashCheck] enableHashCheck=" + enableHashCheck + " apiKey=" + (apiKey ? "set (" + apiKey.length + " chars)" : "EMPTY"));
    if (!apiKey || !enableHashCheck) {
      log.warn("[HashCheck] Skipped: " + (!apiKey ? "no API key" : "hash check disabled"));
      return [];
    }
    var url = "https://retroachievements.org/API/API_GetGameHashes.php?i=" + encodeURIComponent(gId) + "&y=" + encodeURIComponent(apiKey);
    log.info("[HashCheck] Fetching hashes for game ID: " + gId);
    return gmFetch(url, 15000).then(function (resp) {
      var data = JSON.parse(resp.responseText);
      var results = (data.Results || []).map(function (h) {
        var labels = h.Labels;
        if (typeof labels === "string") labels = labels ? labels.split(",") : [];
        if (!Array.isArray(labels)) labels = [];
        return { name: (h.Name || "").toLowerCase(), md5: h.MD5, labels: labels };
      });
      log.info("[HashCheck] Found " + results.length + " known hashes");
      if (results.length > 0) {
        log.info("[HashCheck] Sample hash: " + results[0].name + " (MD5: " + results[0].md5 + ")");
      }
      return results;
    }).catch(function (err) {
      log.warn("[HashCheck] Hash fetch failed: " + err.message);
      return [];
    });
  }).catch(function (err) {
    log.warn("[HashCheck] GM_getValue failed: " + err.message);
    return [];
  });
}

export function getHashBadge(romName, knownHashes) {
  if (knownHashes.length === 0) {
    log.debug("[HashBadge] No known hashes loaded, skipping badge for: " + romName);
    return "";
  }
  var normRom = normalizeRomName(romName);
  var romRegions = extractRegions(romName);

  // Level 1: exact normalized match (name + region)
  var match = knownHashes.find(function (h) {
    return normalizeRomName(h.name) === normRom;
  });

  // Level 2: same base title AND at least one region in common
  if (!match) {
    var titleRom = titleOnlyRomName(romName);
    match = knownHashes.find(function (h) {
      if (titleOnlyRomName(h.name) !== titleRom) return false;
      if (romRegions.length === 0) return true; // no region info — allow
      var hashRegions = extractRegions(h.name);
      if (hashRegions.length === 0) return true; // hash has no region — allow
      return romRegions.some(function (r) { return hashRegions.indexOf(r) !== -1; });
    });
  }

  log.debug("[HashBadge] ROM: " + romName + " | normalized: " + normRom + " | match: " + (match ? match.name : "NONE"));

  if (match) {
    var labelsArr = Array.isArray(match.labels) ? match.labels : [];
    var labelTxt = labelsArr.length > 0 ? labelsArr.join(", ") : "";
    var tooltipLines = [
      "\u2705 Compatible with RetroAchievements",
      "MD5: " + match.md5,
    ];
    if (labelTxt) tooltipLines.push("Labels: " + labelTxt);
    if (match.name) tooltipLines.push("Hash: " + match.name);
    var tooltip = escapeHtml(tooltipLines.join("\n"));

    return ' <span class="enhanced-trophy-badge" title="' + tooltip + '"'
      + ' style="display:inline-flex;align-items:center;gap:2px;font-size:0.75em;padding:1px 6px;border-radius:4px;'
      + 'background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#78350f;vertical-align:middle;margin-left:4px;'
      + 'cursor:help;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.15);transition:transform 0.15s;">'
      + '\uD83C\uDFC6 RA</span>';
  }

  return '';
}
