/**
 * Normalising and comparing ROM filenames against a game title.
 */

import { RAConsole } from './consoles.js';

// Normalize ROM filename: strip extension and brackets, keep region (parentheses)
export function normalizeRomName(name) {
  return name
    .toLowerCase()
    .replace(/\.(zip|7z|chd|bin|cue|iso|nds|gba|gbc|gb|nes|sfc|smc|md|gen|z64|n64|v64|a26|a78|lnx|pce|ngp|ngc|ws|wsc|min|col|rom|mx1|mx2|dsk|tap|fds)$/i, "")
    .replace(/\s*\[.*?\]/g, "")  // remove [!], [b], [h], etc.
    .replace(/\s+/g, " ")
    .trim();
}

// Title-only: strip extension, brackets AND region parentheses
export function titleOnlyRomName(name) {
  return normalizeRomName(name)
    .replace(/\s*\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Extract region tags from parentheses, e.g. "(USA, Europe)" → ["usa","europe"]
export function extractRegions(name) {
  var regions = [];
  var re = /\(([^)]+)\)/g;
  var m;
  while ((m = re.exec(name.toLowerCase())) !== null) {
    m[1].split(/\s*,\s*/).forEach(function (r) {
      regions.push(r.trim());
    });
  }
  return regions;
}

/** Same game, ignoring punctuation, articles and region tags. */
export function refinedCompare(a, b, consoleName) {
  return simplifyTitle(a, consoleName) === simplifyTitle(b, consoleName);
}

/** Looser match: `a` contains `b` once both are simplified. */
export function compare(a, b, consoleName) {
  return simplifyTitle(a, consoleName).includes(simplifyTitle(b, consoleName));
}

export function simplifyTitle(str, consoleName) {
  if (consoleName === RAConsole.DREAMCAST)
    str = str.replace(/v[0-9].[0-9]{3}/gs, "");

  return str
    .replace(/\.(zip|7z)$/, "")
    .replace(/^The /g, '')
    .replace(", The", '')
    .replace(/'s/gs, '')
    .replace('&', 'and')
    .replace(/:|-| |\.|!|\?|\/|'/gs, '')
    .replace(/(\r\n|\n|\r)/gs, "")
    .split('|')[0]
    .replace(',', "")
    .replace(/\(.+\)/gs, "")
    .replace(/\[.+\]/gs, "")
    .toLowerCase();
}

export function removeExt(str) {
  return str.replace(/\.(zip|7z|chd)$/, "");
}
