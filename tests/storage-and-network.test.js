import { beforeEach, describe, expect, it } from 'vitest';

import { currentVersion, loadToolkit } from './helpers/harness.js';

/**
 * The plumbing shared by every block: the GM_xmlhttpRequest wrapper, the
 * MyMemory rate limiter, the ROM cache and the changelog/cleanup bookkeeping.
 */

let api;
let store;
let respond;

async function load(responder = () => null) {
  respond = responder;
  store = { lastSeenVersion: currentVersion() };
  ({ api } = await loadToolkit({ store, respond: (options) => respond(options) }));
  return api;
}

beforeEach(async () => {
  await load();
});

describe('gmFetch', () => {
  it('resolves on a 2xx response', async () => {
    await load(() => ({ status: 200, responseText: 'hello' }));

    await expect(api.gmFetch('https://myrient.erista.me/files/')).resolves.toMatchObject({
      status: 200,
      responseText: 'hello',
    });
  });

  it('rejects on an HTTP error', async () => {
    await load(() => ({ status: 500, responseText: '' }));

    await expect(api.gmFetch('https://archive.org/x')).rejects.toThrow('HTTP 500');
  });

  it('rejects on a network error', async () => {
    await load(() => null);

    await expect(api.gmFetch('https://archive.org/x')).rejects.toThrow(/Network error/);
  });

  it('rejects on a timeout', async () => {
    await load(() => 'timeout');

    await expect(api.gmFetch('https://archive.org/x')).rejects.toThrow(/Timeout fetching/);
  });
});

describe('translation rate limiter', () => {
  const ok = {
    status: 200,
    responseText: JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: 'Olá' },
    }),
  };

  it('translates and records the character spend', async () => {
    await load(() => ok);

    await expect(api.translateWithRateLimit('Hello', 'pt-BR')).resolves.toBe('Olá');
    expect(store.translateUsage.chars).toBe(5);
    expect(store.translateUsage.date).toBe(api.getTodayKey());
  });

  it('sends the target language as a MyMemory langpair', async () => {
    let requested = '';
    await load((options) => {
      requested = options.url;
      return ok;
    });

    await api.translateWithRateLimit('Hello', 'ja-JP');

    expect(requested).toContain('api.mymemory.translated.net');
    expect(requested).toContain('langpair=en|ja');
  });

  it('refuses once the daily budget is spent', async () => {
    await load(() => ok);
    store.translateUsage = { date: api.getTodayKey(), chars: 5000 };

    await expect(api.translateWithRateLimit('Hello', 'pt-BR')).rejects.toThrow(
      /RATE_LIMIT: Daily translation limit/,
    );
  });

  it('refuses a text longer than the remaining budget', async () => {
    await load(() => ok);
    store.translateUsage = { date: api.getTodayKey(), chars: 4998 };

    await expect(api.translateWithRateLimit('Hello', 'pt-BR')).rejects.toThrow(
      /Only 2 chars remaining/,
    );
  });

  it('resets the budget on a new day', async () => {
    await load(() => ok);
    store.translateUsage = { date: '2000-01-01', chars: 5000 };

    await expect(api.translateWithRateLimit('Hello', 'pt-BR')).resolves.toBe('Olá');
  });

  it('surfaces a MyMemory error response', async () => {
    await load(() => ({
      status: 200,
      responseText: JSON.stringify({ responseStatus: 403, responseDetails: 'QUOTA EXCEEDED' }),
    }));

    await expect(api.translateWithRateLimit('Hello', 'pt-BR')).rejects.toThrow('QUOTA EXCEEDED');
  });
});

describe('ROM cache', () => {
  it('namespaces the key by console and normalised title', async () => {
    expect(api.getRomCacheKey('Sonic the Hedgehog', 'Genesis/Mega Drive')).toBe(
      'romCache_Genesis/Mega Drive_sonic_the_hedgehog',
    );
  });

  it('stores and reads back results', async () => {
    api.setCachedRomResults('Sonic', 'MD', [{ name: 'a', url: 'b' }], [], 'Myrient', 'https://x/');

    const cached = await api.getCachedRomResults('Sonic', 'MD');
    expect(cached.results).toHaveLength(1);
    expect(cached.collection).toEqual({ name: 'Myrient', url: 'https://x/' });
  });

  it('returns null and evicts entries older than 24h', async () => {
    api.setCachedRomResults('Sonic', 'MD', [{ name: 'a', url: 'b' }], [], 'Myrient', 'https://x/');
    const key = api.getRomCacheKey('Sonic', 'MD');
    store[key].ts = Date.now() - 25 * 60 * 60 * 1000;

    expect(await api.getCachedRomResults('Sonic', 'MD')).toBeNull();
    expect(key in store).toBe(false);
  });

  it('returns null when nothing was cached', async () => {
    expect(await api.getCachedRomResults('Unknown', 'MD')).toBeNull();
  });
});

describe('changelog popup', () => {
  it('shows the changes when the stored version is older', async () => {
    store.lastSeenVersion = '0.0.0';

    await api.showChangelogPopup();

    const overlay = document.getElementById('enhanced-changelog-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain(api.CHANGELOG[0].version);
    expect(store.lastSeenVersion).toBe(currentVersion());
  });

  it('stays quiet for a release with nothing worth announcing', async () => {
    // A version that only changes links has no changelog entry, so the user
    // is not interrupted — but it is still recorded as seen.
    store.lastSeenVersion = api.CHANGELOG[0].version;

    await api.showChangelogPopup();

    expect(document.getElementById('enhanced-changelog-overlay')).toBeNull();
    expect(store.lastSeenVersion).toBe(currentVersion());
  });

  it('stays hidden when the user already saw this version', async () => {
    await api.showChangelogPopup();

    expect(document.getElementById('enhanced-changelog-overlay')).toBeNull();
  });

  it('closes on the OK button', async () => {
    store.lastSeenVersion = '0.0.0';
    await api.showChangelogPopup();

    document.getElementById('enhanced-changelog-ok').click();

    expect(document.getElementById('enhanced-changelog-overlay')).toBeNull();
  });
});

describe('cleanup', () => {
  it('removes every container the toolkit injects', async () => {
    document.body.innerHTML =
      '<div id="enhanced-settings"></div>' +
      '<div id="enhanced-romsdl"></div>' +
      '<div id="enhanced-speedruncom"></div>' +
      '<div id="re-most-mastered-tab"></div>' +
      '<div id="re-game-awards-tabs"></div>' +
      '<iframe class="enhanced-video"></iframe>' +
      '<button class="enhanced-translate-btn"></button>' +
      '<span class="enhanced-rarity-badge"></span>' +
      '<div class="enhanced-yt-embed"></div>' +
      '<div id="keep-me"></div>';

    api.cleanup();

    expect(document.querySelectorAll('[id^="enhanced-"], [id^="re-"]')).toHaveLength(0);
    expect(document.querySelector('.enhanced-translate-btn')).toBeNull();
    expect(document.querySelector('.enhanced-rarity-badge')).toBeNull();
    expect(document.getElementById('keep-me')).not.toBeNull();
  });
});
