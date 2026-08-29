/**
 * Re-attaching injected nodes when React re-renders around them.
 */

var _settingsHostObserver = null;

// Radix unmounts inactive tab panels, which reorders the host's children.
// Re-append the card whenever React drops it.
export function keepSettingsCardAttached(host, card) {
  if (_settingsHostObserver) _settingsHostObserver.disconnect();
  if (!host || !card) return;

  _settingsHostObserver = new MutationObserver(function () {
    if (!host.isConnected) {
      _settingsHostObserver.disconnect();
      _settingsHostObserver = null;
      return;
    }
    if (!host.contains(card)) host.appendChild(card);
  });
  _settingsHostObserver.observe(host, { childList: true });
}

var _sidebarObserver = null;

// The game page sidebar is re-rendered when the user switches achievement
// sets, and again when SSR falls back to a client-side render.
export function keepSidebarSectionsAttached(target, nodes) {
  if (_sidebarObserver) _sidebarObserver.disconnect();
  if (!target) return;

  _sidebarObserver = new MutationObserver(function () {
    if (!target.isConnected) {
      _sidebarObserver.disconnect();
      _sidebarObserver = null;
      return;
    }
    nodes.forEach(function (node) {
      if (node && !target.contains(node)) target.appendChild(node);
    });
  });
  _sidebarObserver.observe(target, { childList: true });
}

/** Drops both observers, e.g. before re-injecting on SPA navigation. */
export function disconnectReattachObservers() {
  if (_settingsHostObserver) { _settingsHostObserver.disconnect(); _settingsHostObserver = null; }
  if (_sidebarObserver) { _sidebarObserver.disconnect(); _sidebarObserver = null; }
}
