import { beforeEach, describe, expect, it } from 'vitest';

import { gameAwardsBlock } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, navigate, waitFor } from './helpers/harness.js';

/**
 * The sidebar "Game Awards" section is emitted by RenderAwardGroup() in
 * app/Helpers/render/site-award.php: a `#gameawards` wrapper, an `h3` holding
 * `.cursor-help` counters, and a `.component` grid of `.goldimage` (mastered)
 * and `.badgeimg.siteawards` (completed) badges.
 */

const awardsPayload = {
  VisibleUserAwards: [
    { AwardType: 'Game Beaten', AwardData: 11, AwardDataExtra: 1, ImageIcon: '/Images/11.png', ConsoleName: 'Genesis/Mega Drive' },
    { AwardType: 'Game Beaten', AwardData: 12, AwardDataExtra: 0, ImageIcon: '/Images/12.png', ConsoleName: 'SNES/Super Famicom' },
    { AwardType: 'Game Beaten', AwardData: 13, AwardDataExtra: 1, ImageIcon: '/Images/13.png', ConsoleName: 'Events' },
    { AwardType: 'Mastery/Completion', AwardData: 21, AwardDataExtra: 1, ImageIcon: '/Images/21.png', ConsoleName: 'SNES/Super Famicom' },
  ],
};

let api;
let store;

async function renderAwards({ settle = true } = {}) {
  document.body.innerHTML = `<aside>${gameAwardsBlock({ mastered: 2, completed: 1 })}</aside>`;
  navigate('/user/Welington');
  await api.initGameAwardsBeaten();
  if (settle) await flush();
}

const beatenGrid = () => document.querySelector('#gameawards .component').nextElementSibling;

beforeEach(() => {
  store = { lastSeenVersion: currentVersion(), raApiKey: 'test-key' };
  ({ api } = loadToolkit({
    url: 'https://retroachievements.org/user/Welington',
    store,
    respond: (options) =>
      options.url.includes('API_GetUserAwards.php')
        ? { status: 200, responseText: JSON.stringify(awardsPayload) }
        : null,
  }));
});

describe('guards', () => {
  it('requires an API key', async () => {
    delete store.raApiKey;
    await renderAwards();

    expect(document.getElementById('re-game-awards-tabs')).toBeNull();
  });

  it('does nothing when the profile has no Game Awards section', async () => {
    document.body.innerHTML = '<aside></aside>';
    navigate('/user/Welington');

    await api.initGameAwardsBeaten();

    expect(document.getElementById('re-game-awards-tabs')).toBeNull();
  });

  it('does not inject twice', async () => {
    await renderAwards();
    await api.initGameAwardsBeaten();

    expect(document.querySelectorAll('#re-game-awards-tabs')).toHaveLength(1);
  });
});

describe('tabs', () => {
  it('inserts Mastered/Beaten tabs above the native badge grid', async () => {
    await renderAwards();

    const tabs = document.getElementById('re-game-awards-tabs');
    expect(tabs).not.toBeNull();
    expect(tabs.nextElementSibling.classList.contains('component')).toBe(true);
    expect(tabs.textContent).toContain('Mastered');
    expect(tabs.textContent).toContain('Beaten');
  });

  it('counts mastered and completed badges from the rendered markup', async () => {
    // 2 .goldimage + 1 .badgeimg.siteawards, read before the API answers.
    await renderAwards({ settle: false });

    expect(document.getElementById('re-mastered-count').textContent).toBe('3');
  });

  it('counts beaten games from the API, excluding event awards', async () => {
    await renderAwards();

    await waitFor(() => document.getElementById('re-beaten-count').textContent === '2');
    expect(document.getElementById('re-mastered-count').textContent).toBe('1');
  });

  it('renders hardcore badges in gold and casual ones dimmed', async () => {
    await renderAwards();
    await waitFor(() => document.getElementById('re-beaten-count').textContent === '2');

    expect(beatenGrid().querySelectorAll('img.goldimage')).toHaveLength(1);
    expect(beatenGrid().querySelectorAll('img.badgeimg.siteawards')).toHaveLength(1);
    expect(beatenGrid().querySelector('a').getAttribute('href')).toBe('/game/11');
  });

  it('swaps the visible grid and the heading counters when switching tabs', async () => {
    await renderAwards();
    await waitFor(() => document.getElementById('re-beaten-count').textContent === '2');

    const nativeGrid = document.querySelector('#gameawards .component');
    const [masteredTab, beatenTab] = document.getElementById('re-game-awards-tabs').children;

    beatenTab.click();
    expect(nativeGrid.style.display).toBe('none');
    expect(beatenGrid().style.display).toBe('');
    expect(document.querySelector('#gameawards h3').textContent).toContain('🏆');

    masteredTab.click();
    expect(nativeGrid.style.display).toBe('');
    expect(beatenGrid().style.display).toBe('none');
    expect(document.querySelector('#gameawards h3').textContent).toContain('👑');
  });

  it('shows an empty state when the user has beaten nothing', async () => {
    ({ api } = loadToolkit({
      url: 'https://retroachievements.org/user/Welington',
      store,
      respond: () => ({ status: 200, responseText: JSON.stringify({ VisibleUserAwards: [] }) }),
    }));

    await renderAwards();
    await waitFor(() => document.querySelector('.re-beaten-empty')?.textContent.includes('No beaten'));

    expect(document.getElementById('re-beaten-count').textContent).toBe('0');
  });
});
