import { describe, expect, it } from 'vitest';

import { settingsPage } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, waitFor } from './helpers/harness.js';

/**
 * RAWeb server-renders Inertia pages and hydrates them (resources/js/app.tsx),
 * falling back to a plain client render when SSR is unavailable. The script
 * must wait for whichever path runs before it touches the DOM.
 */

describe('waitForHydration', () => {
  it('resolves immediately when there is no Inertia root', async () => {
    const { api } = loadToolkit();
    document.body.innerHTML = '<main></main>';

    await expect(api.waitForHydration(50)).resolves.toBeUndefined();
  });

  it('resolves immediately when React already hydrated the root', async () => {
    const { api } = loadToolkit();
    document.body.innerHTML = '<div id="app"></div>';
    document.getElementById('app')['__reactFiber$abc'] = {};

    await expect(api.waitForHydration(50)).resolves.toBeUndefined();
  });

  it('waits for React to attach, then resolves', async () => {
    const { api } = loadToolkit();
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById('app');

    const pending = api.waitForHydration(2000);
    setTimeout(() => {
      app['__reactFiber$abc'] = {};
      app.appendChild(document.createElement('div'));
    }, 20);

    await expect(pending).resolves.toBeUndefined();
  });

  it('gives up after the timeout so a client-only render still gets decorated', async () => {
    const { api } = loadToolkit();
    document.body.innerHTML = '<div id="app"></div>';

    await expect(api.waitForHydration(50)).resolves.toBeUndefined();
  });
});

describe('auto start', () => {
  it('injects on load once the page is hydrated', async () => {
    loadToolkit({
      url: 'https://retroachievements.org/settings',
      store: { lastSeenVersion: currentVersion() },
      html: settingsPage(),
      hydrated: true,
      autoStart: true,
    });

    await waitFor(() => document.getElementById('enhanced-settings'), { timeout: 3000 });
  });

  it('re-runs on Inertia SPA navigation', async () => {
    const { api } = loadToolkit({
      url: 'https://retroachievements.org/',
      store: { lastSeenVersion: currentVersion() },
      html: '<div id="app"></div>',
      hydrated: true,
      autoStart: true,
    });
    await flush(20);

    document.body.innerHTML = settingsPage();
    window.history.pushState({}, '', '/settings');
    document.dispatchEvent(new window.Event('inertia:navigate'));

    await waitFor(() => document.getElementById('enhanced-settings'), { timeout: 3000 });
    expect(api).toBeDefined();
  });

  it('skips a duplicate run for the same URL', async () => {
    const { api } = loadToolkit({
      url: 'https://retroachievements.org/settings',
      store: { lastSeenVersion: currentVersion() },
      html: settingsPage(),
      hydrated: true,
      autoStart: true,
    });

    await waitFor(() => document.getElementById('enhanced-settings'), { timeout: 3000 });
    api.runAll();
    await flush(20);

    expect(document.querySelectorAll('#enhanced-settings')).toHaveLength(1);
  });
});
