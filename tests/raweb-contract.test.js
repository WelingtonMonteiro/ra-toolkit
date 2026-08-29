import { describe, expect, it } from 'vitest';

import { rawebApiEndpoints, rawebRef, rawebSource } from './fixtures/raweb-source.js';
import { readSource, readUserscript } from './helpers/harness.js';

/**
 * Contract tests: the userscript hooks onto RetroAchievements' own markup, so
 * every selector it relies on is asserted against frozen copies of that markup
 * in fixtures/raweb-source.js.
 *
 * Those copies are generated from a local ./RAWeb checkout with
 * `npm run raweb:sync`, so these tests run anywhere — including CI, which has
 * no checkout. When RetroAchievements ships a redesign: refresh the fixtures,
 * read the diff, and whatever fails here is what needs fixing in the script.
 */

// Assertions about the toolkit read src/, not the generated bundle.
const script = readSource();
const bundle = readUserscript();
const source = (name) => rawebSource[name].code;

describe('fixture provenance', () => {
  it('records which RAWeb revision the markup was copied from', async () => {
    expect(rawebRef.repo).toBe('RetroAchievements/RAWeb');
    expect(rawebRef.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(rawebRef.committedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('covers every snippet the tests below read', async () => {
    for (const [name, entry] of Object.entries(rawebSource)) {
      expect(entry.file, `${name} has no source file`).toBeTruthy();
      expect(entry.code.trim().length, `${name} is empty`).toBeGreaterThan(0);
    }
  });
});

describe('layout', () => {
  it('only marks <main> with `with-sidebar` on sidebar pages', async () => {
    expect(source('appLayout')).toContain("withSidebar ? 'with-sidebar' : undefined");
    expect(source('appLayout')).toMatch(/<article/);
    expect(source('appLayout')).toMatch(/<aside/);
  });

  it('renders /settings without a sidebar, so the script must not require the class', async () => {
    expect(source('settingsPage')).toContain('withSidebar={false}');
    expect(script).not.toContain('main.with-sidebar article');
  });

  it('serves Inertia props from the #app data-page blob', async () => {
    expect(source('appBlade')).toContain('@inertia');
    expect(script).toContain('data-page');
  });
});

describe('settings page', () => {
  it('groups the section cards into tab panels', async () => {
    expect(source('settingsRoot')).toContain('BaseTabsContent');
    expect(source('settingsRoot')).toContain('BaseTabsList');
    expect(script).toContain('[role="tabpanel"][data-state="active"]');
  });

  it('keeps the card and button classes the script mirrors', async () => {
    expect(source('baseCard')).toContain('rounded-lg border border-embed-highlight bg-embed');
    expect(source('baseButton')).toContain('btn-base');
    expect(source('baseButton')).toContain('btn-base--default');
    expect(source('baseButton')).toContain('btn-base--size-default');

    expect(script).toContain('border-embed-highlight bg-embed');
    expect(script).toContain('btn-base btn-base--default btn-base--size-default');
  });
});

describe('game page', () => {
  it('exposes the sidebar and main roots by test id', async () => {
    expect(source('gameShowSidebarRoot')).toContain('data-testid="sidebar"');
    expect(source('gameShowMainRoot')).toContain('data-testid="game-show"');
    expect(script).toContain('[data-testid="game-show"], [data-testid="sidebar"]');
  });

  it('still renders the box art wrapper the ROM section anchors to', async () => {
    expect(source('playableBoxArtImage')).toContain('overflow-hidden text-center');
    expect(source('gameShowSidebarRoot')).toContain('PlayableBoxArtImage');
    expect(script).toContain('div.overflow-hidden.text-center');
  });
});

describe('achievement list items', () => {
  it('keeps the game-set-item class', async () => {
    expect(source('achievementsListItemTitle')).toContain('className="game-set-item"');
    expect(script).toContain('li.game-set-item');
  });

  it('keeps the title link and description hooks', async () => {
    expect(source('achievementsListItemTitle')).toContain('className="font-medium"');
    expect(source('achievementsListItemTitle')).toContain('<p className="leading-4">');

    expect(script).toContain('a.font-medium');
    expect(script).toContain('p.leading-4');
  });

  it('keeps the unlock rate paragraph the rarity badge parses', async () => {
    expect(source('achievementsListItemStats')).toContain('text-center text-2xs');
    expect(source('achievementsListItemStats')).toContain('unlock rate');

    expect(script).toContain('p.text-center');
  });
});

describe('comments', () => {
  it('keeps the highlighted-list wrapper and word-break body', async () => {
    expect(source('commentList')).toContain('highlighted-list');
    expect(source('commentListItemBody')).toContain("wordBreak: 'break-word'");
    expect(source('commentListItem')).toContain('className="w-full"');

    expect(script).toContain('ul.highlighted-list > li');
    expect(script).toContain('[style*="word-break"]');
  });
});

describe('navbar', () => {
  it('keeps the dropdown/nav-item/nav-link structure', async () => {
    expect(source('dropdownBlade')).toContain('class="dropdown');
    expect(source('dropdownBlade')).toContain('dropdown-menu');
    expect(source('navDropdownBlade')).toContain('nav-item');
    expect(source('navDropdownBlade')).toContain('nav-link');

    expect(script).toContain('.dropdown.nav-item');
  });
});

describe('user profile', () => {
  it('keeps the stat row markup the User Stats card scrapes', async () => {
    expect(source('statElementBlade')).toContain(
      'relative flex w-full items-center justify-between',
    );
    expect(script).toContain('.relative.flex.w-full.items-center.justify-between');
  });

  it.each([
    'Points',
    'Site rank',
    'Achievements unlocked',
    'RetroRatio',
    'Total games beaten',
    'Started games beaten',
    'Points earned in the last 7 days',
    'Points earned in the last 30 days',
    'Average points per week',
    'Average completion',
    'Points (casual)',
    'Casual rank',
    'Achievements unlocked (casual)',
  ])('reads the "%s" stat label', (label) => {
    expect(source('userProfileMetaLabels'), `RAWeb no longer emits "${label}"`).toContain(
      `'label' => '${label}'`,
    );
    expect(script, `the script no longer reads "${label}"`).toContain(label);
  });

  it('keeps the "Last N Games Played" heading and its game list', async () => {
    expect(source('recentlyPlayedBlade')).toContain('Games Played');
    expect(source('recentlyPlayedBlade')).toContain('flex flex-col gap-y-1');
  });

  it('keeps the progression status rows and tallies', async () => {
    expect(source('progressionRowBlade')).toContain('class="progression-status-row"');
    expect(source('progressionRowTally')).toContain('class="tally');

    expect(script).toContain('li.progression-status-row');
    expect(script).toContain('.tally');
  });

  it('keeps the Game Awards section id, counters and badge classes', async () => {
    // `<div id='gameawards'>` is built from the group title.
    expect(source('siteAwardGroup')).toContain("strtolower(str_replace(' ', '', $title))");
    expect(source('siteAwardGroup')).toContain("class='component");
    expect(source('siteAwardCounter')).toContain('cursor-help');
    expect(source('siteAwardBadgeClasses')).toContain("'badgeimg siteawards'");
    expect(source('siteAwardBadgeClasses')).toContain("'goldimage'");

    expect(script).toContain("getElementById('gameawards')");
    expect(script).toContain('.goldimage');
    expect(script).toContain('.badgeimg.siteawards');
  });
});

describe('games list', () => {
  it('keeps the toolbar wrapper the Most Mastered tab attaches to', async () => {
    expect(source('gamesToolbar')).toContain('flex w-full flex-col justify-between gap-2');
    expect(script).toContain('div.flex.w-full.flex-col.justify-between.gap-2');
  });
});

describe('legacy web API', () => {
  it.each(rawebApiEndpoints)('%s is still called by the script', async (endpoint) => {
    expect(script).toContain(`${endpoint}.php`);
  });
});

describe('userscript hygiene', () => {
  it('never builds attribute names setAttribute would reject', async () => {
    expect(script).not.toMatch(/setAttribute\(\s*['"]@/);
  });

  it('declares every host it fetches from in @connect', async () => {
    const header = bundle.slice(0, bundle.indexOf('==/UserScript=='));
    for (const host of [
      'myrient.erista.me',
      'archive.org',
      'retroachievements.org',
      'api.mymemory.translated.net',
      'romsfun.com',
      'speedrun.com',
    ]) {
      expect(header).toContain(`@connect      ${host}`);
    }
  });
});
