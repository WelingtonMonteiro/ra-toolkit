import { beforeEach, describe, expect, it, vi } from 'vitest';

import { gamesPage, navbar } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, navigate, waitFor } from './helpers/harness.js';

/**
 * Navbar dropdowns come from components/nav-dropdown.blade.php
 * (`.dropdown.nav-item` + `.nav-link` trigger + `.dropdown-menu`).
 * The /games toolbar comes from DataTableDesktopToolbar.tsx
 * (`div.flex.w-full.flex-col.justify-between.gap-2`).
 */

let api;
let store;

beforeEach(async () => {
  store = { lastSeenVersion: currentVersion() };
  ({ api } = await loadToolkit({ url: 'https://retroachievements.org/games', store }));
});

describe('achievements nav dropdown', () => {
  it('inserts an Achievements dropdown right after Games', async () => {
    document.body.innerHTML = navbar();

    api.initAchievementNavLinks();

    const dropdown = document.getElementById('re-achievements-dropdown');
    expect(dropdown).not.toBeNull();
    expect(dropdown.previousElementSibling.textContent).toContain('Games');
    expect(dropdown.classList.contains('dropdown')).toBe(true);
    expect(dropdown.classList.contains('nav-item')).toBe(true);
  });

  it('links to the achievement list pages', async () => {
    document.body.innerHTML = navbar();

    api.initAchievementNavLinks();

    const hrefs = [...document.querySelectorAll('#re-achievements-dropdown a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual([
      '/achievementList.php',
      '/achievementList.php?s=4&p=2',
      '/achievementList.php?s=14&p=2',
    ]);
  });

  it('does not inject twice', async () => {
    document.body.innerHTML = navbar();

    api.initAchievementNavLinks();
    api.initAchievementNavLinks();

    expect(document.querySelectorAll('#re-achievements-dropdown')).toHaveLength(1);
  });

  it('does nothing when the navbar is missing', async () => {
    document.body.innerHTML = '<div></div>';

    api.initAchievementNavLinks();

    expect(document.getElementById('re-achievements-dropdown')).toBeNull();
  });
});

describe('most mastered tab on /games', () => {
  const gamesResponse = {
    items: [
      {
        game: {
          id: 1,
          title: 'Sonic the Hedgehog',
          badgeUrl: 'https://media.retroachievements.org/Images/1.png',
          playersTotal: 50000,
          achievementsPublished: 50,
          system: { name: 'Genesis/Mega Drive' },
        },
      },
    ],
    total: 1,
    lastPage: 1,
  };

  async function renderGames(fetchImpl) {
    vi.stubGlobal('fetch', fetchImpl);
    document.body.innerHTML = gamesPage();
    navigate('/games');
    await api.initGamesMostMastered();
  }

  it('adds the tab bar above the toolbar', async () => {
    await renderGames(vi.fn());

    const tabs = document.getElementById('re-most-mastered-tab');
    expect(tabs).not.toBeNull();
    expect(tabs.nextElementSibling.className).toContain('flex w-full flex-col justify-between gap-2');
    expect(tabs.textContent).toContain('Most Mastered');
  });

  it('stays off other routes', async () => {
    document.body.innerHTML = gamesPage();
    navigate('/game/1');

    await api.initGamesMostMastered();

    expect(document.getElementById('re-most-mastered-tab')).toBeNull();
  });

  it('queries the internal games API sorted by player count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => gamesResponse });
    await renderGames(fetchMock);

    document.getElementById('re-most-mastered-tab').children[1].click();
    await waitFor(() => document.querySelector('.re-mm-card'));

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/internal-api/games');
    expect(url).toContain('sort=-playersTotal');
    expect(url).toContain('filter%5BachievementsPublished%5D=has');
  });

  it('renders a card per game and hides the native table', async () => {
    await renderGames(vi.fn().mockResolvedValue({ ok: true, json: async () => gamesResponse }));

    const [allTab, masteredTab] = document.getElementById('re-most-mastered-tab').children;
    masteredTab.click();
    await waitFor(() => document.querySelector('.re-mm-card'));

    const card = document.querySelector('.re-mm-card');
    expect(card.textContent).toContain('Sonic the Hedgehog');
    expect(card.querySelector('a').getAttribute('href')).toContain('/game/1');
    expect(document.getElementById('re-most-mastered-container').style.display).toBe('');

    allTab.click();
    expect(document.getElementById('re-most-mastered-container').style.display).toBe('none');
  });

  it('fetches only once when toggling back and forth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => gamesResponse });
    await renderGames(fetchMock);

    const [allTab, masteredTab] = document.getElementById('re-most-mastered-tab').children;
    masteredTab.click();
    await waitFor(() => document.querySelector('.re-mm-card'));
    allTab.click();
    masteredTab.click();
    await flush(20);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a failed request instead of leaving a spinner', async () => {
    await renderGames(vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    document.getElementById('re-most-mastered-tab').children[1].click();
    await waitFor(() =>
      document.getElementById('re-most-mastered-container').textContent.includes('Failed to load'),
    );
  });
});
