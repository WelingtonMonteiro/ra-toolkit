/**
 * jQuery-free HTML/XML parsing and HTML escaping.
 */

// =========================================
//     HTML/XML Parsing (jQuery-free)
// =========================================
const domParser = new DOMParser();

export function parseHtml(htmlString) {
  return domParser.parseFromString(htmlString, "text/html");
}

export function parseXml(xmlString) {
  return domParser.parseFromString(xmlString, "text/xml");
}

export function escapeHtml(str) {
  // Escapes quotes too: scraped ROM/game names are interpolated into
  // attributes (title=, value=), which a text-node round-trip leaves open.
  return String(str === null || str === undefined ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
