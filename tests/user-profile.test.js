import { beforeEach, describe, expect, it } from 'vitest';

import { userProfilePage } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, navigate, waitFor } from './helpers/harness.js';

/**
 * The profile page is still Blade-rendered. The toolkit hooks onto the
 * "Last N Games Played" heading (components/user/recently-played/index.blade.php)
 * and the "User Stats" block (components/user/profile-meta.blade.php), whose
 * stat labels come from app/Community/Components/UserProfileMeta.php.
 */

let api;
let store;

async function renderProfile(options) {
  document.body.innerHTML = userProfilePage(options);
  navigate('/user/Welington');
  await api.initUserPagination();
  await waitFor(() => document.querySelector('.stats-root') || document.getElementById('enhanced-pagination'), {
    timeout: 3000,
  });
}

beforeEach(async () => {
  store = { lastSeenVersion: currentVersion(), raApiKey: 'test-key' };
  ({ api } = await loadToolkit({
    url: 'https://retroachievements.org/user/Welington',
    store,
    respond: () => null,
  }));
});

describe('guards', () => {
  it('does nothing without an API key', async () => {
    delete store.raApiKey;
    document.body.innerHTML = userProfilePage();
    navigate('/user/Welington');

    await api.initUserPagination();
    await flush(600);

    expect(document.getElementById('enhanced-pagination')).toBeNull();
  });

  it('does nothing off the profile route', async () => {
    document.body.innerHTML = userProfilePage();
    navigate('/game/1');

    await api.initUserPagination();
    await flush(600);

    expect(document.querySelector('.stats-root')).toBeNull();
  });
});

describe('recently played pagination', () => {
  it('adds a per-page selector next to the heading', async () => {
    await renderProfile();

    const heading = [...document.querySelectorAll('h2')].find((h2) =>
      /Last.*Games Played/i.test(h2.textContent),
    );
    expect(heading).toBeDefined();
    expect(heading.parentElement.querySelector('select')).not.toBeNull();
  });

  it('removes the native "more..." link it replaces', async () => {
    await renderProfile();

    expect(document.querySelector('a[href*="?g="]')).toBeNull();
  });
});

describe('enhanced user stats', () => {
  it('reads the primary stats and hides the native block', async () => {
    await renderProfile();

    const root = document.querySelector('.stats-root');
    expect(root).not.toBeNull();
    expect(root.textContent).toContain('12,345');
    expect(root.textContent).toContain('#1,111');
    expect(root.textContent).toContain('1.90');

    const native = document.querySelector('[x-data]');
    expect(native.style.display).toBe('none');
  });

  it('splits weighted points and rank totals into sub-values', async () => {
    await renderProfile();

    const root = document.querySelector('.stats-root');
    expect(root.textContent).toContain('23,456 weighted');
    expect(root.textContent).toContain('of 500,000');
  });

  it('renders the recent activity section', async () => {
    await renderProfile();

    const root = document.querySelector('.stats-root');
    expect(root.textContent).toContain('Points (7 days)');
    expect(root.textContent).toContain('Avg pts / week');
  });

  it('reads the renamed "casual" labels RAWeb now ships', async () => {
    await renderProfile({ casual: true });

    const root = document.querySelector('.stats-root');
    expect(root.textContent).toContain('Casual');
    expect(root.textContent).toContain('#5,678');
    expect(root.textContent).toContain('456');
  });

  it('still reads the old "softcore" labels', async () => {
    await renderProfile({ casual: false });

    const root = document.querySelector('.stats-root');
    expect(root.textContent).toContain('Casual');
    expect(root.textContent).toContain('#5,678');
  });
});

describe('progression status scraping', () => {
  it('builds the insights dashboard from the console rows', async () => {
    await renderProfile();
    await waitFor(() => document.getElementById('pd-root'), { timeout: 3000 });

    const dashboard = document.getElementById('pd-root');
    expect(dashboard).not.toBeNull();
    expect(dashboard.textContent).toContain('MD');
  });

  it('excludes the "Total" row from the per-console breakdown', async () => {
    await renderProfile();
    await waitFor(() => document.getElementById('pd-root'), { timeout: 3000 });

    const labels = [...document.querySelectorAll('#pd-root .pd-tog-btn, #pd-root')].map(
      (el) => el.textContent,
    );
    expect(labels.join(' ')).not.toMatch(/\bTotal\b.*console/i);
  });
});

/**
 * The dashboard renders into elements created by initUserPagination
 * (src/features/user-profile/index.js) and passed down as ctx. Every render
 * function takes its target element as an argument — a call site that forgets
 * it fails with "Cannot set properties of undefined (setting 'innerHTML')"
 * and the whole dashboard collapses into "Failed to load dashboard".
 */
describe('player insights dashboard', () => {
  // Mirrors the day arithmetic in insights/streaks.js so the fixture lines up
  // with the streak window regardless of the machine's timezone.
  function dayStamp(daysAgo) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().substring(0, 10) + ' 12:00:00';
  }

  function respondWith(payloads) {
    return (options) => {
      const endpoint = Object.keys(payloads).find((name) => options.url.includes(name));
      if (!endpoint) return null;
      return { responseText: JSON.stringify(payloads[endpoint]) };
    };
  }

  const fullPayloads = {
    'API_GetUserSummary.php': { TotalPoints: 12345, Rank: 678 },
    'API_GetUserRecentlyPlayedGames.php': [
      { GameID: 11, Title: 'Chrono Trigger', ImageIcon: '/Images/11.png', NumAchieved: 9, NumPossibleAchievements: 10 },
      { GameID: 22, Title: 'Barely Started', ImageIcon: '/Images/22.png', NumAchieved: 1, NumPossibleAchievements: 40 },
    ],
    'API_GetUserAwards.php': {
      VisibleUserAwards: [
        { AwardType: 'Mastery/Completion', AwardData: '11', AwardDataExtra: 1, AwardedAt: new Date().toISOString() },
      ],
    },
    // Also doubles as the "rarest achievements" source (whole account
    // history), so it carries the display fields that endpoint needs too.
    'API_GetAchievementsEarnedBetween.php': [
      { AchievementID: 1, Title: 'The Hard One', GameTitle: 'Chrono Trigger', BadgeURL: '/Badge/1.png', Date: dayStamp(0), HardcoreMode: 1, Points: 10, TrueRatio: 90 },
      { AchievementID: 2, Title: 'The Easy One', GameTitle: 'Chrono Trigger', BadgeURL: '/Badge/2.png', Date: dayStamp(1), HardcoreMode: 1, Points: 10, TrueRatio: 12 },
      { AchievementID: 3, Title: 'The Middle One', GameTitle: 'Chrono Trigger', BadgeURL: '/Badge/3.png', Date: dayStamp(2), HardcoreMode: 1, Points: 5, TrueRatio: 8 },
    ],
  };

  async function renderDashboard(respond) {
    ({ api } = await loadToolkit({
      url: 'https://retroachievements.org/user/Welington',
      store: { lastSeenVersion: currentVersion(), raApiKey: 'test-key' },
      respond,
    }));
    document.body.innerHTML = userProfilePage();
    navigate('/user/Welington');
    await api.initUserPagination();
  }

  it('fills every section instead of collapsing into the failure message', async () => {
    await renderDashboard(respondWith(fullPayloads));

    await waitFor(() => document.querySelector('.enhanced-almost-item'), { timeout: 3000 });

    const statsRow = document.querySelector('.enhanced-stats-row');
    expect(statsRow.textContent).not.toContain('Failed to load dashboard');
    expect(statsRow.textContent).toContain('Rank 678');

    // Only the game past 50% shows up, with the remaining count spelled out.
    const almost = document.querySelectorAll('.enhanced-almost-item');
    expect(almost).toHaveLength(1);
    expect(almost[0].textContent).toContain('Chrono Trigger');
    expect(almost[0].textContent).toContain('1 achievement remaining (90%)');

    // Three consecutive days ending today.
    expect(document.querySelector('.enhanced-streak-big').textContent).toBe('3');

    // Sorted by TrueRatio, so the rarest unlock leads.
    const rarest = document.querySelectorAll('.enhanced-rare-item');
    expect(rarest[0].textContent).toContain('The Hard One');
    expect(rarest[0].textContent).toContain('x9.0');

    expect(document.querySelector('.enhanced-timeline-content').children.length).toBeGreaterThan(0);
  });

  it('degrades to per-section empty states when the API gives nothing back', async () => {
    await renderDashboard(() => null);

    await waitFor(() => document.querySelector('.enhanced-almost-list').textContent.trim(), { timeout: 3000 });

    const dashboard = document.querySelector('.enhanced-stats-row').parentElement;
    expect(dashboard.textContent).not.toContain('Failed to load dashboard');

    expect(document.querySelector('.enhanced-almost-list').textContent).toContain('No games close to mastery found.');
    expect(document.querySelector('.enhanced-streak-content').textContent).toContain('Could not load streak data.');
    expect(document.querySelector('.enhanced-rare-list').textContent).toContain('Could not load rarity data.');
    expect(document.querySelector('.enhanced-timeline-content').textContent).toContain('Could not load activity data.');
  });
});
