/**
 * GM_xmlhttpRequest wrapped in a promise with typed errors.
 */

// =========================================
//  GM_xmlhttpRequest wrapper with errors
// =========================================
export function gmFetch(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      timeout: timeoutMs,
      onload: function (response) {
        if (response.status >= 200 && response.status < 400) {
          resolve(response);
        } else {
          reject(new Error("HTTP " + response.status + " for " + url));
        }
      },
      onerror: function (err) {
        reject(new Error("Network error fetching " + url + ": " + (err.error || "unknown")));
      },
      ontimeout: function () {
        reject(new Error("Timeout fetching " + url));
      }
    });
  });
}
