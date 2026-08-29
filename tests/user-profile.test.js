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

beforeEach(() => {
  store = { lastSeenVersion: currentVersion(), raApiKey: 'test-key' };
  ({ api } = loadToolkit({
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
