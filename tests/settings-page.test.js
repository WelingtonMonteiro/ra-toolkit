import { beforeEach, describe, expect, it } from 'vitest';

import { legacySettingsPage, settingsPage } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, navigate, waitFor } from './helpers/harness.js';

/**
 * RAWeb rebuilt /settings as a tabbed page rendered by AppLayout with
 * `withSidebar={false}`. The old anchors ("main.with-sidebar article" and a
 * flat column of cards) no longer exist, which is what made the RA Toolkit
 * panel disappear.
 */

let api;
let store;

async function renderSettings(html = settingsPage()) {
  document.body.innerHTML = html;
  navigate('/settings');
  await api.init();
  await flush();
}

const panelHost = () => document.querySelector('div.min-w-0');
const card = () => document.getElementById('enhanced-settings');

beforeEach(async () => {
  store = { lastSeenVersion: currentVersion() };
  ({ api } = await loadToolkit({ url: 'https://retroachievements.org/settings', store }));
});

describe('findSettingsPanelHost', () => {
  it('returns the element that hosts the tab panels', async () => {
    document.body.innerHTML = settingsPage();
    const root = document.querySelector('main article');

    expect(api.findSettingsPanelHost(root)).toBe(panelHost());
  });

  it('falls back to the pre-tabs card column', async () => {
    document.body.innerHTML = legacySettingsPage();
    const root = document.querySelector('main article');

    expect(api.findSettingsPanelHost(root)).toBe(document.querySelector('div.flex.flex-col > div.flex.flex-col'));
  });

  it('falls back to the article itself when nothing matches', async () => {
    document.body.innerHTML = '<main><article><p>hi</p></article></main>';
    const root = document.querySelector('article');

    expect(api.findSettingsPanelHost(root)).toBe(root);
  });

  it('returns null without a root element', async () => {
    expect(api.findSettingsPanelHost(null)).toBeNull();
  });
});

describe('settings panel injection', () => {
  it('injects the RA Toolkit card on the tabbed settings page', async () => {
    await renderSettings();

    expect(card()).not.toBeNull();
    expect(card().textContent).toContain('RA Toolkit');
  });

  it('injects into the tab panel host, not into the panel Radix unmounts', async () => {
    await renderSettings();

    expect(card().parentElement).toBe(panelHost());
    expect(card().closest('[role="tabpanel"]')).toBeNull();
  });

  it('still injects on the pre-tabs layout', async () => {
    await renderSettings(legacySettingsPage());

    expect(card()).not.toBeNull();
  });

  it('does not inject twice when init runs again on the same page', async () => {
    await renderSettings();
    await api.init();
    await flush();

    expect(document.querySelectorAll('#enhanced-settings')).toHaveLength(1);
    expect(document.querySelectorAll('#enhanced-switch-style')).toHaveLength(1);
  });

  it('re-attaches the card when React swaps the active tab panel', async () => {
    await renderSettings();
    const host = panelHost();

    // Radix unmounts the old panel and mounts a new one.
    host.innerHTML = '<div role="tabpanel" data-state="active"><p>Notifications</p></div>';
    expect(card()).toBeNull();

    await waitFor(() => card());
    expect(card().parentElement).toBe(host);
  });

  it('renders every toggle plus the language, API key and accent controls', async () => {
    await renderSettings();

    for (const id of [
      'enhanced-romsearch',
      'enhanced-hashcheck',
      'enhanced-epromsearch',
      'enhanced-prioritize_ep',
      'enhanced-romsfun',
      'enhanced-speedrun',
      'enhanced-gameplayvideo',
      'enhanced-custombg',
      'enhanced-glassEffect',
      'enhanced-rarity',
      'enhanced-translate-lang',
      'enhanced-apikey',
      'enhanced-accent-color',
      'enhanced-settings-save',
    ]) {
      expect(document.getElementById(id), `missing control #${id}`).not.toBeNull();
    }
  });
});

describe('settings persistence', () => {
  it('reflects stored values in the switches', async () => {
    store.enableSpeedrun = true;
    store.enableRomSearch = false;

    await renderSettings();

    expect(document.getElementById('enhanced-speedrun').dataset.state).toBe('checked');
    expect(document.getElementById('enhanced-romsearch').dataset.state).toBe('unchecked');
  });

  it('writes the new value to GM storage when a switch is clicked', async () => {
    await renderSettings();
    const toggle = document.getElementById('enhanced-speedrun');

    toggle.click();

    expect(store.enableSpeedrun).toBe(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.dataset.state).toBe('checked');

    toggle.click();

    expect(store.enableSpeedrun).toBe(false);
    expect(toggle.dataset.state).toBe('unchecked');
  });

  it('saves the translation language', async () => {
    await renderSettings();
    const select = document.getElementById('enhanced-translate-lang');

    select.value = 'ja-JP';
    select.dispatchEvent(new window.Event('change'));

    expect(store.translateLang).toBe('ja-JP');
  });

  it('saves the RA web API key', async () => {
    await renderSettings();
    const input = document.getElementById('enhanced-apikey');

    input.value = 'abc123';
    input.dispatchEvent(new window.Event('change'));

    expect(store.raApiKey).toBe('abc123');
  });

  it('saves the accent colour and restores the default on reset', async () => {
    await renderSettings();
    const picker = document.getElementById('enhanced-accent-color');

    picker.value = '#ff0000';
    picker.dispatchEvent(new window.Event('input'));
    expect(store.accentColor).toBe('#ff0000');
    expect(document.getElementById('enhanced-accent-style').textContent).toContain('#ff0000');

    document.getElementById('enhanced-accent-reset').click();
    expect(store.accentColor).toBe('#3b82f6');
    expect(picker.value).toBe('#3b82f6');
  });

  it('escapes a stored API key instead of injecting it as markup', async () => {
    store.raApiKey = '" onfocus="alert(1)';

    await renderSettings();

    expect(document.getElementById('enhanced-apikey').value).toBe('" onfocus="alert(1)');
  });
});

describe('debug build', () => {
  it('hides the debug-logging toggle in the published build', async () => {
    await renderSettings();

    expect(document.getElementById('enhanced-debuglog')).toBeNull();
  });

  it('offers the toggle when built with RA_TOOLKIT_DEBUG=1', async () => {
    ({ api } = await loadToolkit({
      url: 'https://retroachievements.org/settings',
      store,
      debugBuild: true,
    }));

    await renderSettings();

    const toggle = document.getElementById('enhanced-debuglog');
    expect(toggle).not.toBeNull();
    // A debug build defaults to verbose logging.
    expect(toggle.dataset.state).toBe('checked');

    toggle.click();
    expect(store.enableDebugLog).toBe(false);

    toggle.click();
    expect(store.enableDebugLog).toBe(true);
  });

  it('keeps debug logging off in the published build even if it was stored', async () => {
    store.enableDebugLog = true;

    const config = await api.loadConfig();

    expect(config.enableDebugLog).toBe(false);
  });

  it('reads the stored value in a debug build', async () => {
    ({ api } = await loadToolkit({
      url: 'https://retroachievements.org/settings',
      store,
      debugBuild: true,
    }));

    expect((await api.loadConfig()).enableDebugLog).toBe(true);

    store.enableDebugLog = false;
    expect((await api.loadConfig()).enableDebugLog).toBe(false);
  });
});
