/**
 * Test harness for RA_Toolkit.user.js.
 *
 * The userscript is a single IIFE with no exports, so we append an export
 * statement to its last line before evaluating it. That keeps the shipped file
 * free of test-only code while still letting each block be unit tested.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SCRIPT_PATH = path.resolve(here, '../../RA_Toolkit.user.js');
export const RAWEB_PATH = path.resolve(here, '../../RAWeb');

export function readUserscript() {
  return fs.readFileSync(SCRIPT_PATH, 'utf8');
}

/** Reads a file from the vendored RAWeb checkout (the site's own source). */
export function readRaweb(relativePath) {
  return fs.readFileSync(path.join(RAWEB_PATH, relativePath), 'utf8');
}

export function hasRaweb() {
  return fs.existsSync(RAWEB_PATH);
}

/** The version the userscript reports, used to silence the changelog popup. */
export function currentVersion() {
  const match = readUserscript().match(/var CURRENT_VERSION = "([^"]+)"/);
  if (!match) throw new Error('Could not read CURRENT_VERSION from the userscript.');
  return match[1];
}

/** Function declarations at the IIFE's top level are indented by two spaces. */
export function topLevelFunctionNames(source) {
  const names = new Set();
  const re = /^ {2}(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    names.add(match[1]);
  }
  return [...names];
}

const AUTOSTART_MARKER = '  // Run on initial page load (after hydration)';

function instrument(source) {
  const names = topLevelFunctionNames(source);
  const closing = '\n})();';
  const at = source.lastIndexOf(closing);
  if (at === -1) {
    throw new Error('Could not find the closing IIFE of the userscript.');
  }

  const autoStartAt = source.indexOf(AUTOSTART_MARKER);
  if (autoStartAt === -1 || autoStartAt > at) {
    throw new Error('Could not find the auto-start block of the userscript.');
  }

  const exposure =
    '\n  globalThis.__RA_TOOLKIT__ = {' +
    names.map((name) => `\n    ${name}: ${name},`).join('') +
    '\n  };\n';

  // Gate the auto-start so tests drive each block explicitly instead of racing
  // a background pass that would `cleanup()` their injected nodes.
  return (
    source.slice(0, autoStartAt) +
    '  if (globalThis.__RA_TOOLKIT_AUTOSTART__) {\n' +
    source.slice(autoStartAt, at) +
    '\n  }\n' +
    exposure +
    source.slice(at)
  );
}

/**
 * Installs the Tampermonkey `GM_*` API on the given window.
 *
 * `store` backs GM_getValue/GM_setValue, and `respond` stands in for the
 * network: it receives the GM_xmlhttpRequest options and returns either a
 * response object (`{ status, responseText }`) or `null` for a network error.
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

  return state;
}

/**
 * Tracks every MutationObserver the script creates so a previous load's
 * observers can be torn down before the next one, keeping tests isolated.
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
 * Evaluates the userscript in the current jsdom window and returns its
 * internals plus the GM mock state.
 *
 * The script auto-runs on load. Callers get a bare document by default, so the
 * automatic pass is a no-op and each test can drive `init()` itself.
 */
export function loadToolkit({
  url = 'https://retroachievements.org/',
  store,
  respond,
  autoStart = false,
  html,
  hydrated = false,
} = {}) {
  // Observers, styles and containers injected by an earlier load would
  // otherwise leak between tests in the same file.
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

  globalThis.__RA_TOOLKIT_AUTOSTART__ = autoStart;
  installCanvasStub(window);
  const gm = installGmMocks(window, { store, respond });
  const code = instrument(readUserscript());

  // Indirect eval keeps the script in global scope, like Tampermonkey does.
  // eslint-disable-next-line no-eval
  (0, eval)(code);

  return { api: globalThis.__RA_TOOLKIT__, gm, store: gm.store };
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
