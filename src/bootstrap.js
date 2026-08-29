/**
 * Startup: wait for hydration, run every feature, and re-run on SPA navigation.
 */

import { init } from './app.js';
import { initWallLinkify } from './features/comments/linkify.js';
import { initWallTranslation } from './features/comments/translate.js';
import { initGameAwardsBeaten } from './features/game-awards/index.js';
import { initGamesMostMastered } from './features/games-list/index.js';
import { initAchievementNavLinks } from './features/navbar/index.js';
import { initUserPagination } from './features/user-profile/index.js';

// =========================================
//   Hydration-aware Startup
// =========================================
// RAWeb uses hydrateRoot in production (SSR).
// During hydration, the DOM is replaced/reconciled by React.
// We must wait for hydration to complete before injecting.

export function waitForHydration(timeout) {
  return new Promise(function (resolve) {
    var el = document.getElementById("app");
    // No app element = not an Inertia page, run immediately
    if (!el) return resolve();

    // If the app already has React's internal fiber key, it's hydrated
    var hasReactFiber = Object.keys(el).some(function (k) {
      return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
    });
    if (hasReactFiber) return resolve();

    // Otherwise, observe for React to attach
    var observer = new MutationObserver(function () {
      var hydrated = Object.keys(el).some(function (k) {
        return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
      });
      if (hydrated) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(el, { childList: true, subtree: true, attributes: true });

    setTimeout(function () {
      observer.disconnect();
      resolve(); // proceed anyway after timeout
    }, timeout || 5000);
  });
}

var _lastInitUrl = null;
var _initTimer = null;

export function runAll() {
  var url = location.pathname + location.search;
  if (_lastInitUrl === url) {
    console.log('[RA Toolkit] ⏩ Skipping duplicate init for: ' + url);
    return;
  }
  console.log('[RA Toolkit] 🚀 runAll() → ' + url);
  _lastInitUrl = url;
  init().catch(function (err) { console.error('[RA Toolkit] ❌ init() threw:', err); });
  initAchievementNavLinks();
  initUserPagination().catch(function (err) { console.error('[RA Toolkit] ❌ initUserPagination() threw:', err); });
  initGameAwardsBeaten().catch(function (err) { console.error('[RA Toolkit] ❌ initGameAwardsBeaten() threw:', err); });
  initGamesMostMastered().catch(function (err) { console.error('[RA Toolkit] ❌ initGamesMostMastered() threw:', err); });
  initWallLinkify();
  initWallTranslation();
}

export function scheduleInit(delay) {
  if (_initTimer) clearTimeout(_initTimer);
  _initTimer = setTimeout(function () {
    _initTimer = null;
    runAll();
  }, delay);
}

/** Wires the listeners that drive runAll(). Called once, from main.js. */
export function start() {
  // Run on initial page load (after hydration)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      console.log('[RA Toolkit] 🟡 DOMContentLoaded — waiting for hydration...');
      waitForHydration(5000).then(function () { scheduleInit(0); });
    });
  } else {
    console.log('[RA Toolkit] 🟢 Document already ready — waiting for hydration...');
    waitForHydration(5000).then(function () { scheduleInit(0); });
  }

  // Re-run on Inertia SPA navigations
  document.addEventListener("inertia:navigate", function () {
    _lastInitUrl = null; // allow re-init on actual navigation
    scheduleInit(300);
  });
}
