/**
 * DOM fixtures mirroring the markup RAWeb actually renders.
 *
 * Every helper below is annotated with the RAWeb source file it was derived
 * from, so the fixtures can be re-checked whenever the site is updated. The
 * companion `raweb-contract.test.js` asserts those files still produce the
 * classes/attributes used here.
 */

/** Wraps markup in the Inertia root, as resources/views/layouts/app.blade.php does. */
export function inertiaRoot(innerHtml, props = {}) {
  const page = { component: 'test', props, url: '/', version: '1' };
  return (
    `<div id="app" data-page='${JSON.stringify(page).replace(/'/g, '&apos;')}'>` +
    innerHtml +
    '</div>'
  );
}

/** resources/js/common/layouts/AppLayout/AppLayout.tsx */
export function appLayout({ withSidebar = false, main = '', sidebar = '', banner = '' } = {}) {
  return (
    '<div class="container lg:max-w-none xl:max-w-(--breakpoint-xl)">' +
    `<main${withSidebar ? ' class="with-sidebar"' : ''} data-scroll-target>` +
    (banner ? `<div class="col-span-full">${banner}</div>` : '') +
    `<article class="relative z-10 min-w-0 px-2.5! sm:px-4! md:px-5!">${main}</article>` +
    (withSidebar ? `<aside class="relative z-5">${sidebar}</aside>` : '') +
    '</main></div>'
  );
}

/** resources/js/features/settings/components/SectionFormCard/SectionFormCard.tsx */
export function settingsSectionCard(title) {
  return (
    '<div class="text-card-foreground rounded-lg border border-embed-highlight bg-embed shadow-xs w-full">' +
    `<div class="flex flex-col space-y-1.5 p-6 pb-4"><h3 class="mb-0 border-b-0 text-2xl font-semibold leading-none tracking-tight">${title}</h3></div>` +
    '<form><div class="p-6 pt-0"></div>' +
    '<div class="flex items-center p-6 pt-0"><div class="flex w-full justify-end">' +
    '<button type="submit" class="btn-base btn-base--default btn-base--size-default">Update</button>' +
    '</div></div></form></div>'
  );
}

/**
 * resources/js/pages/settings.tsx + features/settings/components/+root/SettingsRoot.tsx
 *
 * Note `withSidebar={false}`: `main` carries no `with-sidebar` class, and the
 * section cards live inside Radix tab panels.
 */
export function settingsPage({ activeTab = 'profile' } = {}) {
  const tabs = ['profile', 'notifications', 'account', 'applications'];

  const triggers = tabs
    .map(
      (tab) =>
        `<button type="button" role="tab" id="trigger-${tab}" aria-controls="content-${tab}" ` +
        `aria-selected="${tab === activeTab}" data-state="${tab === activeTab ? 'active' : 'inactive'}">${tab}</button>`,
    )
    .join('');

  // Radix only mounts the active panel.
  const panel =
    `<div data-state="active" data-orientation="horizontal" role="tabpanel" id="content-${activeTab}" tabindex="0" class="mt-0">` +
    `<h2 tabindex="-1" class="sr-only">${activeTab}</h2>` +
    '<div class="flex flex-col gap-4">' +
    settingsSectionCard('Profile') +
    settingsSectionCard('Avatar') +
    settingsSectionCard('Preferences') +
    settingsSectionCard('Locale') +
    '</div></div>';

  const root =
    '<div dir="ltr" data-orientation="horizontal" class="block"><div class="w-full">' +
    '<h1>Settings</h1>' +
    '<div class="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">' +
    `<nav aria-label="Settings" class="hidden md:block"><div role="tablist" aria-orientation="vertical">${triggers}</div></nav>` +
    `<div class="min-w-0">${panel}</div>` +
    '</div></div></div>';

  return inertiaRoot(appLayout({ withSidebar: false, main: root }));
}

/** The pre-2026 settings markup, kept to prove the fallback path still works. */
export function legacySettingsPage() {
  const cards =
    settingsSectionCard('Profile') + settingsSectionCard('Avatar') + settingsSectionCard('Preferences');
  const main = `<div class="flex flex-col"><div class="flex flex-col gap-4">${cards}</div></div>`;

  return inertiaRoot(appLayout({ withSidebar: true, main }));
}

/** resources/js/common/components/PlayableBoxArtImage/PlayableBoxArtImage.tsx */
export function boxArt(src = 'https://media.retroachievements.org/Images/box.png') {
  return `<div class="overflow-hidden text-center"><img class="max-w-full rounded-xs" src="${src}" alt="boxart" /></div>`;
}

/** resources/js/features/games/components/+show-sidebar/GameShowSidebarRoot.tsx */
export function gameSidebar({ withBoxArt = true } = {}) {
  return (
    '<div data-testid="sidebar" class="flex flex-col gap-6">' +
    (withBoxArt ? boxArt() : '') +
    '<div class="flex flex-col gap-3"><div>metadata</div></div>' +
    '<div>buttons</div>' +
    '</div>'
  );
}

/** resources/js/common/components/AchievementsListItem/AchievementsListItem.tsx */
export function achievementListItem({
  id = 1,
  title = 'Test Achievement',
  description = 'Do the thing.',
  unlockPercentage = '12.34%',
} = {}) {
  return (
    '<li class="game-set-item">' +
    '<div class="flex flex-col gap-y-1 md:mt-1"><img alt="badge" /></div>' +
    '<div class="grid w-full gap-x-5 gap-y-1.5 leading-4 md:grid-cols-6">' +
    '<div class="md:col-span-4"><div class="mb-0.5 flex justify-between gap-x-2">' +
    '<div class="-mt-1 mb-0.5 md:mt-0"><span class="mr-2">' +
    `<a href="/achievement/${id}" class="font-medium">${title}</a></span>` +
    '<span>(5)</span></div></div>' +
    `<p class="leading-4">${description}</p></div>` +
    '<div class="mt-1 md:col-span-2 md:flex md:flex-col-reverse md:justify-end md:gap-y-1 md:pt-1">' +
    `<p class="-mt-1.5 hidden text-center text-2xs md:block">${unlockPercentage} unlock rate</p>` +
    '<p class="mb-0.5 flex gap-x-1 text-2xs md:mb-0 md:justify-center md:text-center">10 of 81 players</p>' +
    '</div></div></li>'
  );
}

/** resources/js/features/games/components/+show/GameShowMainRoot.tsx */
export function gameMain(achievementsHtml = achievementListItem()) {
  return (
    '<div data-testid="game-show" class="flex flex-col gap-3">' +
    `<ul class="flex flex-col gap-2.5">${achievementsHtml}</ul>` +
    '</div>'
  );
}

/** A full desktop /game/{id} page. */
export function gamePage({
  props = gamePageProps(),
  withBoxArt = true,
  achievementsHtml = achievementListItem(),
} = {}) {
  return inertiaRoot(
    appLayout({
      withSidebar: true,
      main: gameMain(achievementsHtml),
      sidebar: gameSidebar({ withBoxArt }),
    }),
    props,
  );
}

/** Shape of App.Platform.Data.GameShowPageProps as serialised into data-page. */
export function gamePageProps({
  id = 1,
  title = 'Sonic the Hedgehog',
  systemName = 'Genesis/Mega Drive',
  displayName = 'Welington',
} = {}) {
  return {
    auth: { user: { id: 7, displayName } },
    game: {
      id,
      title,
      system: { id: 1, name: systemName },
      imageIngameUrl: 'https://media.retroachievements.org/Images/ingame.png',
      imageBoxArtUrl: 'https://media.retroachievements.org/Images/box.png',
    },
    backingGame: { id, title, badgeUrl: 'https://media.retroachievements.org/Images/badge.png' },
  };
}

/** resources/js/common/components/CommentList/CommentListItem.tsx */
export function commentList(bodies = ['Check https://example.com for details']) {
  const items = bodies
    .map(
      (body, index) =>
        `<li id="comment_${index + 1}" class="group flex w-full scroll-mt-20 items-start gap-4 p-2">` +
        '<div class="mt-1"><img alt="avatar" /></div>' +
        '<div class="w-full"><div class="flex items-center justify-between"><div class="flex items-center gap-2">' +
        '<span class="smalldate">2 days ago</span></div></div>' +
        `<p style="word-break: break-word;">${body}</p></div></li>`,
    )
    .join('');

  return `<ul class="highlighted-list">${items}</ul>`;
}

/** resources/views/components/nav-dropdown.blade.php + components/dropdown.blade.php */
export function navbar() {
  return (
    '<nav class="navbar"><div class="dropdown nav-item">' +
    '<button class="nav-link" type="button">Games</button>' +
    '<div class="dropdown-menu"><a class="dropdown-item" href="/games">All Games</a></div>' +
    '</div><div class="dropdown nav-item">' +
    '<button class="nav-link" type="button">Forums</button><div class="dropdown-menu"></div>' +
    '</div></nav>'
  );
}

/** resources/views/components/user/profile/stat-element.blade.php */
export function statElement(label, value) {
  return (
    '<div class="relative flex w-full items-center justify-between text-2xs">' +
    `<p class="z-2 bg-embed pr-2">${label}</p>` +
    '<div class="absolute left-0 right-0 border-t border-dotted border-text-muted"></div>' +
    `<p class="z-2 bg-embed pl-2">${value}</p></div>`
  );
}

/**
 * resources/views/components/user/profile-meta.blade.php
 * Labels come from app/Community/Components/UserProfileMeta.php.
 */
export function userStatsBlock({ casual = true } = {}) {
  const casualStats = casual
    ? statElement('Points (casual)', '1,234') +
      statElement('Casual rank', '#5,678 of 90,000') +
      statElement('Achievements unlocked (casual)', '456')
    : statElement('Points (softcore)', '1,234') +
      statElement('Softcore rank', '#5,678 of 90,000') +
      statElement('Achievements unlocked (softcore)', '456');

  return (
    '<div x-data="{ isExpanded: true }"><div><div class="flex w-full justify-between items-center">' +
    '<h2 class="text-h4 mb-0!">User Stats</h2></div></div><div class="transition-all">' +
    statElement('Points', '12,345 (23,456)') +
    statElement('Site rank', '#1,111 of 500,000') +
    statElement('Achievements unlocked', '2,345') +
    statElement('RetroRatio', '1.90') +
    statElement('Total games beaten', '42 (40 retail)') +
    statElement('Started games beaten', '55.55%') +
    statElement('Points earned in the last 7 days', '100') +
    statElement('Points earned in the last 30 days', '400') +
    statElement('Average points per week', '90') +
    statElement('Average completion', '61.23%') +
    casualStats +
    '</div></div>'
  );
}

/** resources/views/components/user/recently-played/index.blade.php */
export function recentlyPlayedBlock(count = 5) {
  return (
    '<div class="my-8"><div>' +
    `<h2 class="text-h4">Last ${count} Games Played</h2>` +
    '<div class="flex flex-col gap-y-1"><div class="game-list-item">a game</div></div>' +
    '</div><div class="text-right"><a href="/user/Welington?g=50">more...</a></div></div>'
  );
}

/** app/Helpers/render/site-award.php — RenderAwardGroup() */
export function gameAwardsBlock({ mastered = 2, completed = 1 } = {}) {
  const badges =
    '<div data-gameid="1" data-date="1 Jan 2026"><img class="goldimage" /></div>'.repeat(mastered) +
    '<div data-gameid="2" data-date="1 Jan 2026"><img class="badgeimg siteawards" /></div>'.repeat(
      completed,
    );

  return (
    "<div id='gameawards'>" +
    "<h3 class='flex justify-between gap-2'><span class='grow'>Game Awards</span>" +
    `<div class='cursor-help flex gap-x-1 text-sm' title='${mastered} games mastered'><div class='text-2xs'>👑</div><div class='numitems'>${mastered}</div></div>` +
    `<div class='cursor-help flex gap-x-1 text-sm' title='${completed} games completed'><div class='text-2xs'>🎖️</div><div class='numitems'>${completed}</div></div>` +
    '</h3>' +
    `<div class='component w-full place-content-center bg-embed gap-2 grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] xl:rounded xl:py-2'>${badges}</div>` +
    '</div>'
  );
}

/** resources/views/components/user/progression-status/console-progression-list-item.blade.php */
export function progressionStatusRow({
  label = 'Total',
  unfinished = 10,
  beatenCasual = 2,
  beatenHardcore = 3,
  completed = 1,
  mastered = 4,
} = {}) {
  const tally = (value) => `<div class="tally"><div class="dot"></div>${value}</div>`;

  return (
    '<li class="progression-status-row">' +
    `<a href="#" class="border-embed-highlight w-[102px] min-w-[92px]! pl-2 rounded-l-sm"><img alt="${label} console icon" src="https://static.retroachievements.org/assets/images/system/md.png" /><p>${label}</p></a>` +
    `<a href="#" class="group">${tally(unfinished)}</a>` +
    `<a href="#" class="group">${tally(beatenCasual)}${tally(beatenHardcore)}</a>` +
    `<a href="#" class="group">${tally(completed)}${tally(mastered)}</a>` +
    '</li>'
  );
}

/** features/game-list/.../DataTableToolbar/DataTableDesktopToolbar.tsx */
export function gamesPage() {
  const toolbar =
    '<div class="flex w-full flex-col justify-between gap-2">' +
    '<div class="flex w-full flex-col justify-between gap-2 sm:flex-row"><input placeholder="Search games..." /></div>' +
    '</div>';

  return inertiaRoot(
    appLayout({
      withSidebar: false,
      main: `<div><h1>All Games</h1>${toolbar}<table><tbody></tbody></table></div>`,
    }),
  );
}

/**
 * A trimmed /user/{name} page: RAWeb still renders this one with Blade
 * (resources/views/pages-legacy/userInfo.blade.php).
 */
export function userProfilePage({ casual = true, recentlyPlayedCount = 5 } = {}) {
  return (
    '<div id="app" data-page=\'{"props":{}}\'></div>' +
    '<div class="container"><main class="with-sidebar"><article>' +
    '<h1>Welington</h1>' +
    userStatsBlock({ casual }) +
    '<hr />' +
    '<div class="mt-1 mb-8 bg-embed p-5 rounded-sm">' +
    '<h2 class="text-h4 leading-none! mb-2">Progression Status</h2>' +
    '<ul>' +
    progressionStatusRow({ label: 'Total' }) +
    progressionStatusRow({ label: 'MD', unfinished: 4, beatenCasual: 1, beatenHardcore: 1, completed: 0, mastered: 2 }) +
    '</ul></div>' +
    recentlyPlayedBlock(recentlyPlayedCount) +
    '</article><aside>' +
    gameAwardsBlock() +
    '</aside></main></div>'
  );
}
