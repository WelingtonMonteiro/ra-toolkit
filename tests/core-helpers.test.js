import { beforeAll, describe, expect, it } from 'vitest';

import { gamePageProps, inertiaRoot } from './fixtures/raweb.js';
import { loadToolkit } from './helpers/harness.js';

let api;

beforeAll(async () => {
  ({ api } = await loadToolkit());
});

describe('HTML/XML parsing', () => {
  it('parses an HTML string into a detached document', async () => {
    const doc = api.parseHtml('<ul><li class="a">one</li><li class="a">two</li></ul>');

    expect(doc.querySelectorAll('li.a')).toHaveLength(2);
  });

  it('parses an XML string (speedrun.com responses)', async () => {
    const doc = api.parseXml('<runs><run id="abc" /></runs>');

    expect(doc.querySelector('run').getAttribute('id')).toBe('abc');
  });

  it('escapes HTML so scraped ROM names cannot inject markup', async () => {
    expect(api.escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
  });

  it('escapes single quotes and ampersands', async () => {
    expect(api.escapeHtml(`Tom & Jerry's`)).toBe('Tom &amp; Jerry&#039;s');
  });
});

describe('getInertiaProps', () => {
  it('reads props out of the #app data-page blob', async () => {
    document.body.innerHTML = inertiaRoot('<main></main>', gamePageProps());

    const props = api.getInertiaProps();

    expect(props.game.title).toBe('Sonic the Hedgehog');
    expect(props.game.system.name).toBe('Genesis/Mega Drive');
  });

  it('returns null when the page is not an Inertia page', async () => {
    document.body.innerHTML = '<main></main>';

    expect(api.getInertiaProps()).toBeNull();
  });

  it('returns null instead of throwing on malformed data-page', async () => {
    document.body.innerHTML = '<div id="app" data-page="{not json"></div>';

    expect(api.getInertiaProps()).toBeNull();
  });
});

describe('getLoggedUser', () => {
  it('prefers the display name from Inertia auth props', async () => {
    document.body.innerHTML = inertiaRoot('<main></main>', gamePageProps({ displayName: 'Miagui' }));

    expect(api.getLoggedUser()).toBe('Miagui');
  });

  it('falls back to the account dropdown header on legacy pages', async () => {
    document.body.innerHTML = '<div class="dropdown-header"> Welington </div>';

    expect(api.getLoggedUser()).toBe('Welington');
  });

  it('returns an empty string when logged out', async () => {
    document.body.innerHTML = '<main></main>';

    expect(api.getLoggedUser()).toBe('');
  });
});

describe('theme detection', () => {
  it('reads data-scheme from <html>, as set by layouts/app.blade.php', async () => {
    document.documentElement.setAttribute('data-scheme', 'light');
    expect(api.getScheme()).toBe('light');
    expect(api.isLightMode()).toBe(true);

    document.documentElement.setAttribute('data-scheme', 'black');
    expect(api.getScheme()).toBe('black');
    expect(api.isLightMode()).toBe(false);
  });

  it('defaults to dark when no scheme cookie was set', async () => {
    document.documentElement.removeAttribute('data-scheme');

    expect(api.getScheme()).toBe('dark');
  });
});

describe('getRarityTier', () => {
  it.each([
    [90, 'Common'],
    [50, 'Common'],
    [49.9, 'Uncommon'],
    [25, 'Uncommon'],
    [24.9, 'Rare'],
    [10, 'Rare'],
    [9.9, 'Very Rare'],
    [5, 'Very Rare'],
    [4.9, 'Ultra Rare'],
    [2, 'Ultra Rare'],
    [1.9, 'Legendary'],
    [0, 'Legendary'],
  ])('maps %s%% unlock rate to %s', (percentage, label) => {
    expect(api.getRarityTier(percentage).label).toBe(label);
  });

  it('returns a colour and background for the badge', async () => {
    const tier = api.getRarityTier(1);

    expect(tier.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tier.bg).toMatch(/^rgba\(/);
  });
});

describe('waitForElement', () => {
  it('resolves immediately when the element is already rendered', async () => {
    document.body.innerHTML = '<div data-testid="sidebar"></div>';

    await expect(api.waitForElement('[data-testid="sidebar"]')).resolves.toBeTruthy();
  });

  it('resolves once React renders the element', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const pending = api.waitForElement('[data-testid="game-show"]', 1000);
    setTimeout(() => {
      document.getElementById('app').innerHTML = '<div data-testid="game-show"></div>';
    }, 20);

    await expect(pending).resolves.toBeTruthy();
  });

  it('rejects after the timeout when the selector never matches', async () => {
    document.body.innerHTML = '<main></main>';

    await expect(api.waitForElement('.never-rendered', 50)).rejects.toThrow(/Timeout waiting for/);
  });
});
