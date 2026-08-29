/**
 * Test harness.
 *
 * The toolkit is a set of ES modules under src/, bundled into the published
 * userscript by `npm run build`. Tests import those modules directly through
 * src/api.js — nothing test-only is added to the shipped bundle.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { vi } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The published bundle, built from src/. */
export const SCRIPT_PATH = path.resolve(here, '../../dist/RA_Toolkit.user.js');
export const SRC_PATH = path.resolve(here, '../../src');
export const RAWEB_PATH = path.resolve(here, '../../RAWeb');

export function readUserscript() {
  return fs.readFileSync(SCRIPT_PATH, 'utf8');
}

/** Concatenates every module under src/, for assertions about the source. */
export function readSource() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) files.push(full);
    }
  };
  walk(SRC_PATH);
  files.sort();
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
}

/** Reads a file from the local RAWeb reference checkout. */
export function readRaweb(relativePath) {
  return fs.readFileSync(path.join(RAWEB_PATH, relativePath), 'utf8');
}

export function hasRaweb() {
  return fs.existsSync(RAWEB_PATH);
}

/** The version the bundle reports, used to silence the changelog popup. */
export function currentVersion() {
  const match = readUserscript().match(/@version\s+(\S+)/);
  if (!match) throw new Error('Could not read the version from the bundle.');
  return match[1];
}

/**
 * Installs the Tampermonkey `GM_*` API on the given window.
 *
 * `store` backs GM_getValue/GM_setValue, and `respond` stands in for the
 * network: it receives the GM_xmlhttpRequest options and returns either a
 * response object (`{ status, responseText }`), the string `'timeout'`, or
 * `null` for a network error.
 */
export function installGmMocks(win, { store = {}, respond = () => null } = {}) {
  const state = { store, respond, requests: [] };

  win.GM_getValue = (key, fallback) => (key in state.store ? state.store[key] : fallback);
  win.GM_setValue = (key, value) => {
    state.store[key] = value;
  };
  win.GM_deleteValue = (key) => {
    delete state.store[key];
  };
  win.GM_listValues = () => Object.keys(state.store);
  win.GM_log = () => {};

  win.GM_xmlhttpRequest = (options) => {
    state.requests.push(options);
    Promise.resolve()
      .then(() => state.respond(options))
      .then((response) => {
        if (response === null || response === undefined) {
          options.onerror?.({ error: 'mocked network failure' });
          return;
        }
        if (response === 'timeout') {
          options.ontimeout?.();
          return;
        }
        options.onload?.({ status: 200, responseText: '', ...response });
      });
  };

  for (const name of ['GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues', 'GM_log', 'GM_xmlhttpRequest']) {
    globalThis[name] = win[name];
  }

  return state;
}

/**
 * Tracks every MutationObserver the modules create so a previous test's
 * observers can be torn down before the next one.
 */
const liveObservers = new Set();

export function installObserverTracker(win) {
  if (win.MutationObserver.__raToolkitTracked) return;

  const Native = win.MutationObserver;

  class TrackedMutationObserver extends Native {
    observe(...args) {
      liveObservers.add(this);
      return super.observe(...args);
    }

    disconnect(...args) {
      liveObservers.delete(this);
      return super.disconnect(...args);
    }
  }

  TrackedMutationObserver.__raToolkitTracked = true;
  win.MutationObserver = TrackedMutationObserver;
  globalThis.MutationObserver = TrackedMutationObserver;
}

export function disconnectObservers() {
  for (const observer of liveObservers) {
    observer.disconnect();
  }
  liveObservers.clear();
}

/**
 * Tracks pending timers the same way, so a `setTimeout` scheduled by one test
 * cannot fire against the DOM of the next one.
 */
const pendingTimers = new Set();

export function installTimerTracker(win) {
  if (win.setTimeout.__raToolkitTracked) return;

  const nativeSetTimeout = win.setTimeout.bind(win);
  const nativeClearTimeout = win.clearTimeout.bind(win);
  const nativeSetInterval = win.setInterval.bind(win);
  const nativeClearInterval = win.clearInterval.bind(win);

  const trackedSetTimeout = (handler, delay, ...args) => {
    const id = nativeSetTimeout(
      (...inner) => {
        pendingTimers.delete(id);
        if (typeof handler === 'function') handler(...inner);
      },
      delay,
      ...args,
    );
    pendingTimers.add(id);
    return id;
  };
  trackedSetTimeout.__raToolkitTracked = true;

  const trackedSetInterval = (...args) => {
    const id = nativeSetInterval(...args);
    pendingTimers.add(id);
    return id;
  };

  win.setTimeout = trackedSetTimeout;
  win.setInterval = trackedSetInterval;
  globalThis.setTimeout = trackedSetTimeout;
  globalThis.setInterval = trackedSetInterval;

  clearTimers.native = { nativeClearTimeout, nativeClearInterval };
}

export function clearTimers() {
  const { nativeClearTimeout, nativeClearInterval } = clearTimers.native ?? {};
  for (const id of pendingTimers) {
    nativeClearTimeout?.(id);
    nativeClearInterval?.(id);
  }
  pendingTimers.clear();
}

/**
 * jsdom ships no canvas implementation, and the insights dashboard draws its
 * charts on one. A no-op 2D context keeps that code path testable.
 */
export function installCanvasStub(win) {
  const make = () => {
    const state = {
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createPattern: () => null,
      getImageData: () => ({ data: [] }),
    };

    return new Proxy(state, {
      get: (target, prop) => (prop in target ? target[prop] : () => {}),
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      },
    });
  };

  win.HTMLCanvasElement.prototype.getContext = make;
  win.HTMLCanvasElement.prototype.toDataURL = () => '';
}

/**
 * Loads the toolkit into the current jsdom window and returns its public
 * surface plus the GM mock state.
 *
 * Modules are re-imported on every call (`vi.resetModules()`), so per-module
 * state — the log level, the reattach observers, the SPA-navigation guard —
 * starts fresh in each test.
 *
 * The bootstrap only runs when `autoStart` is set, so tests drive each block
 * explicitly instead of racing a background pass that would `cleanup()` the
 * nodes they just injected.
 *
 * `debugBuild` stands in for `RA_TOOLKIT_DEBUG=1 npm run build`, which is the
 * only build that exposes the debug-logging toggle.
 */
export async function loadToolkit({
  url = 'https://retroachievements.org/',
  store,
  respond,
  autoStart = false,
  html,
  hydrated = false,
  debugBuild = false,
} = {}) {
  installObserverTracker(window);
  installTimerTracker(window);
  disconnectObservers();
  clearTimers();

  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-scheme');
  window.history.replaceState({}, '', url);

  if (html) {
    document.body.innerHTML = html;
  }
  if (hydrated) {
    const app = document.getElementById('app');
    // React marks hydrated containers with a `__reactFiber$…` property.
    if (app) app['__reactFiber$test'] = {};
  }

  installCanvasStub(window);
  const gm = installGmMocks(window, { store, respond });

  vi.resetModules();
  vi.doUnmock('../../src/build-flags.js');
  if (debugBuild) {
    vi.doMock('../../src/build-flags.js', () => ({ IS_DEBUG_BUILD: true }));
  }

  const api = await import('../../src/api.js');

  if (autoStart) {
    api.start();
  }

  return { api, gm, store: gm.store };
}

/** Navigates without a reload, the way Inertia does. */
export function navigate(pathname) {
  window.history.pushState({}, '', pathname);
}

export function flush(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits until `predicate()` is truthy, polling on the macrotask queue. */
export async function waitFor(predicate, { timeout = 2000, interval = 10 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() > deadline) {
      throw new Error('waitFor timed out');
    }
    await flush(interval);
  }
}
