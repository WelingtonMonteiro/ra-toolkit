import { beforeEach, describe, expect, it } from 'vitest';

import { achievementListItem, gamePage, gamePageProps } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, navigate, waitFor } from './helpers/harness.js';

/**
 * The game page anchors on GameShowSidebarRoot (`aside > [data-testid=sidebar]`,
 * with PlayableBoxArtImage as its first child) and GameShowMainRoot
 * (`[data-testid=game-show]`, listing `li.game-set-item` achievements).
 */

let api;
let store;
let responses;

/** Serves an Apache-style Myrient directory index. */
function myrientIndex(fileNames) {
  const rows = fileNames
    .map((name) => `<tr><td><a href="${encodeURIComponent(name)}">${name}</a></td></tr>`)
    .join('');
  return { status: 200, responseText: `<html><body><table>${rows}</table></body></html>` };
}

async function renderGamePage(options = {}) {
  document.body.innerHTML = gamePage(options);
  navigate('/game/1');
  await api.init();
  await flush();
}

const sidebar = () => document.querySelector('aside [data-testid="sidebar"]');
const romsSection = () => document.getElementById('enhanced-romsdl');

beforeEach(() => {
  store = { lastSeenVersion: currentVersion(), enableSpeedrun: false, enableGameplayVideo: false };
  responses = new Map();
  ({ api } = loadToolkit({
    url: 'https://retroachievements.org/game/1',
    store,
    respond: (options) => {
      for (const [fragment, response] of responses) {
        if (options.url.includes(fragment)) return response;
      }
      return null; // network error, like an unreachable mirror
    },
  }));
});

describe('sidebar injection', () => {
  it('creates the ROMs and Speedrun containers inside the sidebar', async () => {
    await renderGamePage();

    expect(romsSection()).not.toBeNull();
    expect(document.getElementById('enhanced-speedruncom')).not.toBeNull();
    expect(sidebar().contains(romsSection())).toBe(true);
  });

  it('places the ROMs section directly after the box art', async () => {
    await renderGamePage();

    const boxArt = sidebar().querySelector('div.overflow-hidden.text-center');

    expect(boxArt.nextElementSibling).toBe(romsSection());
  });

  it('still injects when the game has no box art', async () => {
    await renderGamePage({ withBoxArt: false });

    expect(sidebar().contains(romsSection())).toBe(true);
  });

  it('re-attaches the sections when React re-renders the sidebar', async () => {
    await renderGamePage();
    const host = sidebar();

    host.innerHTML = '<div class="overflow-hidden text-center"></div>';
    expect(romsSection()).toBeNull();

    await waitFor(() => romsSection());
    expect(host.contains(document.getElementById('enhanced-speedruncom'))).toBe(true);
  });

  it('skips hub pages, which have no console name', async () => {
    const props = gamePageProps();
    delete props.game.system;
    props.game.title = 'Hub';

    document.body.innerHTML = gamePage({ props });
    navigate('/game/1');
    await api.init();
    await flush();

    expect(romsSection()).toBeNull();
  });
});

describe('ROM search results', () => {
  it('lists matching ROMs from the Myrient index', async () => {
    responses.set(
      'myrient.erista.me',
      myrientIndex(['Sonic the Hedgehog (USA, Europe).zip', 'Streets of Rage (USA).zip']),
    );

    await renderGamePage();
    await waitFor(() => romsSection().querySelector('a.dl-link'), { timeout: 5000 });

    const links = [...romsSection().querySelectorAll('a.dl-link')];
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Sonic the Hedgehog');
    expect(links[0].href).toContain('myrient.erista.me');
  });

  it('caches results so a second visit does not hit the network', async () => {
    responses.set('myrient.erista.me', myrientIndex(['Sonic the Hedgehog (USA, Europe).zip']));

    await renderGamePage();
    await waitFor(() => romsSection().querySelector('a.dl-link'), { timeout: 5000 });

    const cacheKey = api.getRomCacheKey('Sonic the Hedgehog', 'Genesis/Mega Drive');
    expect(store[cacheKey].results).toHaveLength(1);

    responses.clear(); // every request now fails
    await renderGamePage();
    await waitFor(() => romsSection().querySelector('a.dl-link'), { timeout: 5000 });

    expect(romsSection().querySelectorAll('a.dl-link')).toHaveLength(1);
  });

  it('shows manual search links when no ROM is found', async () => {
    await renderGamePage();
    await waitFor(() => romsSection().querySelector('.enhanced-rom-noresults, div'), {
      timeout: 5000,
    });
    await waitFor(() => romsSection().textContent.includes('No ROMs found'), { timeout: 5000 });

    const hrefs = [...romsSection().querySelectorAll('a')].map((a) => a.href);
    expect(hrefs.some((href) => href.includes('archive.org'))).toBe(true);
    expect(hrefs.some((href) => href.includes('myrient.erista.me'))).toBe(true);
  });

  it('does not search when the ROM feature is disabled', async () => {
    store.enableRomSearch = false;

    await renderGamePage();
    await flush(50);

    expect(romsSection().textContent).toBe('');
  });
});

describe('page decorations', () => {
  it('applies the in-game screenshot as a blurred background', async () => {
    await renderGamePage();

    const styles = [...document.head.querySelectorAll('style')].map((el) => el.textContent);
    expect(styles.some((css) => css.includes('ingame.png') && css.includes('blur'))).toBe(true);
  });

  it('honours the custom background toggle', async () => {
    store.enableCustomBG = false;

    await renderGamePage();

    const styles = [...document.head.querySelectorAll('style')].map((el) => el.textContent);
    expect(styles.some((css) => css.includes('ingame.png'))).toBe(false);
  });

  it('applies the glass effect to the article and sidebar', async () => {
    await renderGamePage();

    const styles = [...document.head.querySelectorAll('style')].map((el) => el.textContent);
    expect(styles.some((css) => css.includes('main.with-sidebar > article'))).toBe(true);
  });
});

describe('achievement rarity badges', () => {
  async function renderAndTriggerObserver(achievementsHtml) {
    await renderGamePage({ achievementsHtml });
    // The rarity pass also runs from a MutationObserver on <main>.
    document.querySelector('main').appendChild(document.createElement('span'));
    await waitFor(() => document.querySelector('.enhanced-rarity-badge'), { timeout: 5000 });
  }

  it('labels a 12.34% achievement as Rare', async () => {
    await renderAndTriggerObserver(achievementListItem({ unlockPercentage: '12.34%' }));

    const badge = document.querySelector('.enhanced-rarity-badge');
    expect(badge.textContent).toContain('Rare');
    expect(badge.title).toBe('12.34% unlock rate');
  });

  it('reads localised percentages that use a decimal comma', async () => {
    await renderAndTriggerObserver(achievementListItem({ unlockPercentage: '1,50%' }));

    expect(document.querySelector('.enhanced-rarity-badge').textContent).toContain('Legendary');
  });

  it('adds one badge per achievement and never duplicates them', async () => {
    await renderAndTriggerObserver(
      achievementListItem({ id: 1 }) + achievementListItem({ id: 2, unlockPercentage: '80.00%' }),
    );
    document.querySelector('main').appendChild(document.createElement('span'));
    await flush(20);

    expect(document.querySelectorAll('.enhanced-rarity-badge')).toHaveLength(2);
  });

  it('stays out of the way when the indicator is disabled', async () => {
    store.enableRarityIndicator = false;

    await renderGamePage();
    await flush(50);

    expect(document.querySelector('.enhanced-rarity-badge')).toBeNull();
  });
});

describe('achievement translate buttons', () => {
  it('adds a translate button to each achievement description', async () => {
    await renderGamePage();
    document.querySelector('main').appendChild(document.createElement('span'));

    await waitFor(() => document.querySelector('.enhanced-translate-btn'), { timeout: 5000 });

    const button = document.querySelector('.enhanced-translate-btn');
    expect(button.parentElement.classList.contains('leading-4')).toBe(true);
  });
});

describe('guide link', () => {
  it('links to the RA guide when the game has one', async () => {
    const props = gamePageProps();
    props.backingGame.guideUrl = 'https://github.com/RetroAchievements/guides/wiki/Sonic';

    await renderGamePage({ props });

    const guide = document.getElementById('enhanced-guide-link');
    expect(guide).not.toBeNull();
    expect(guide.querySelector('a').href).toContain('RetroAchievements/guides');
    expect(guide.nextElementSibling.id).toBe('enhanced-romsdl');
  });

  it('stays away when the game has no guide', async () => {
    await renderGamePage();

    expect(document.getElementById('enhanced-guide-link')).toBeNull();
  });
});

describe('ROM hash verification', () => {
  const hashesPayload = {
    Results: [
      { Name: 'Sonic the Hedgehog (USA, Europe).md', MD5: 'abc123', Labels: 'nointro' },
    ],
  };

  it('badges a ROM whose filename matches a known RA hash', async () => {
    store.raApiKey = 'test-key';
    responses.set('myrient.erista.me', myrientIndex(['Sonic the Hedgehog (USA, Europe).zip']));
    responses.set('API_GetGameHashes.php', {
      status: 200,
      responseText: JSON.stringify(hashesPayload),
    });

    await renderGamePage();
    await waitFor(() => romsSection().querySelector('.enhanced-trophy-badge'), { timeout: 5000 });

    const badge = romsSection().querySelector('.enhanced-trophy-badge');
    expect(badge.title).toContain('Compatible with RetroAchievements');
    expect(badge.title).toContain('abc123');
  });

  it('leaves ROMs unbadged when no API key is configured', async () => {
    responses.set('myrient.erista.me', myrientIndex(['Sonic the Hedgehog (USA, Europe).zip']));

    await renderGamePage();
    await waitFor(() => romsSection().querySelector('a.dl-link'), { timeout: 5000 });

    expect(romsSection().querySelector('.enhanced-trophy-badge')).toBeNull();
  });

  it('skips the hash check when the setting is off', async () => {
    store.raApiKey = 'test-key';
    store.enableHashCheck = false;
    responses.set('myrient.erista.me', myrientIndex(['Sonic the Hedgehog (USA, Europe).zip']));
    responses.set('API_GetGameHashes.php', {
      status: 200,
      responseText: JSON.stringify(hashesPayload),
    });

    await renderGamePage();
    await waitFor(() => romsSection().querySelector('a.dl-link'), { timeout: 5000 });

    expect(romsSection().querySelector('.enhanced-trophy-badge')).toBeNull();
  });
});

describe('speedrun.com integration', () => {
  it('is skipped unless the user enables it', async () => {
    await renderGamePage();
    await flush(50);

    expect(document.getElementById('enhanced-speedruncom').textContent).toBe('');
  });

  it('survives an unreachable speedrun.com', async () => {
    store.enableSpeedrun = true;

    await renderGamePage();
    await flush(100);

    // The sidebar containers must still be in place.
    expect(document.getElementById('enhanced-speedruncom')).not.toBeNull();
    expect(romsSection()).not.toBeNull();
  });
});
