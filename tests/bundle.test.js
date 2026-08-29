import { describe, expect, it } from 'vitest';

import { settingsPage } from './fixtures/raweb.js';
import {
  currentVersion,
  installCanvasStub,
  installGmMocks,
  readUserscript,
  waitFor,
} from './helpers/harness.js';

/**
 * Smoke tests for the artefact people actually install.
 *
 * Every other suite imports src/ directly; these evaluate the built bundle to
 * prove the build wires it together correctly — and that the published file
 * carries no way to switch debug logging on.
 */

function evaluateBundle({ store = {}, html = '' } = {}) {
  document.head.innerHTML = '';
  document.body.innerHTML = html;
  window.history.replaceState({}, '', 'https://retroachievements.org/settings');

  installCanvasStub(window);
  const gm = installGmMocks(window, { store });

  const app = document.getElementById('app');
  if (app) app['__reactFiber$test'] = {};

  // Indirect eval runs it in global scope, the way Tampermonkey does.
  // eslint-disable-next-line no-eval
  (0, eval)(readUserscript());

  return gm;
}

describe('the published bundle', () => {
  it('carries the userscript header', () => {
    const bundle = readUserscript();

    expect(bundle.startsWith('// ==UserScript==')).toBe(true);
    expect(bundle).toContain('// @name         RA Toolkit');
    expect(bundle).toContain(`// @version      ${currentVersion()}`);
    expect(bundle).toContain('// ==/UserScript==');
  });

  it('is a single self-executing bundle', () => {
    const bundle = readUserscript();

    expect(bundle).toMatch(/\(\(\) => \{/);
    expect(bundle.trimEnd().endsWith('})();')).toBe(true);
    expect(bundle).not.toContain('import ');
    expect(bundle).not.toContain('export ');
  });

  it('still declares every host it fetches from', () => {
    const header = readUserscript().split('==/UserScript==')[0];

    for (const host of ['myrient.erista.me', 'archive.org', 'retroachievements.org']) {
      expect(header).toContain(`@connect      ${host}`);
    }
  });

  it('runs on load and injects the settings panel', async () => {
    evaluateBundle({
      store: { lastSeenVersion: currentVersion() },
      html: settingsPage(),
    });

    await waitFor(() => document.getElementById('enhanced-settings'), { timeout: 5000 });
  });

  it('ships no way to turn on debug logging', () => {
    const bundle = readUserscript();

    expect(bundle).not.toContain('enhanced-debuglog');
    expect(bundle).not.toContain('Enable debug logging');
  });
});
