/**
 * The slices of RetroAchievements' own source that RA Toolkit hooks onto.
 *
 * `npm run raweb:sync` copies these out of a local ./RAWeb checkout into
 * tests/fixtures/raweb-source.js, which is what the tests actually read. That
 * keeps ./RAWeb a local reference that never has to be committed or cloned in
 * CI, while the tests still assert against the site's real markup.
 *
 * Each entry is extracted from `start` up to and including the line holding
 * `end`, plus `extraLines` trailing lines.
 */
export const snippets = [
  {
    name: 'appLayout',
    file: 'resources/js/common/layouts/AppLayout/AppLayout.tsx',
    start: 'const AppLayoutBase',
    end: 'const AppLayoutSidebar',
    extraLines: 2,
  },
  {
    name: 'settingsPage',
    file: 'resources/js/pages/settings.tsx',
    start: 'const Settings: AppPage',
    end: 'export default Settings',
  },
  {
    name: 'appBlade',
    file: 'resources/views/layouts/app.blade.php',
    start: '    <x-content>',
    end: '    </x-content>',
  },
  {
    name: 'settingsRoot',
    file: 'resources/js/features/settings/components/+root/SettingsRoot.tsx',
    start: '    <BaseTabs value={currentTab}',
    end: '    </BaseTabs>',
  },
  {
    name: 'baseCard',
    file: 'resources/js/common/components/+vendor/BaseCard.tsx',
    start: 'const BaseCard = React.forwardRef',
    end: "BaseCard.displayName = 'BaseCard';",
  },
  {
    name: 'baseButton',
    file: 'resources/js/common/components/+vendor/BaseButton.tsx',
    start: 'const baseButtonVariants',
    end: '  defaultVariants: {',
    extraLines: 4,
  },
  {
    name: 'gameShowSidebarRoot',
    file: 'resources/js/features/games/components/+show-sidebar/GameShowSidebarRoot.tsx',
    start: '    <div data-testid="sidebar"',
    end: '      <PlayableBoxArtImage src={game.imageBoxArtUrl} />',
  },
  {
    name: 'gameShowMainRoot',
    file: 'resources/js/features/games/components/+show/GameShowMainRoot.tsx',
    start: '    <div data-testid="game-show"',
    end: '    <div data-testid="game-show"',
  },
  {
    name: 'playableBoxArtImage',
    file: 'resources/js/common/components/PlayableBoxArtImage/PlayableBoxArtImage.tsx',
    start: '    <div className="overflow-hidden text-center">',
    end: '    </div>',
  },
  {
    name: 'achievementsListItemTitle',
    file: 'resources/js/common/components/AchievementsListItem/AchievementsListItem.tsx',
    start: '    <motion.li',
    end: '          <p className="leading-4">',
    extraLines: 3,
  },
  {
    name: 'achievementsListItemStats',
    file: 'resources/js/common/components/AchievementsListItem/AchievementsListItem.tsx',
    start: '            <p className="-mt-1.5 hidden text-center text-2xs md:block">',
    end: '            </p>',
  },
  {
    name: 'commentList',
    file: 'resources/js/common/components/CommentList/CommentList.tsx',
    start: '          <ul className="highlighted-list',
    end: '          <ul className="highlighted-list',
  },
  {
    name: 'commentListItem',
    file: 'resources/js/common/components/CommentList/CommentListItem.tsx',
    start: '    <li',
    end: '      <div className="w-full">',
  },
  {
    name: 'commentListItemBody',
    file: 'resources/js/common/components/CommentList/CommentListItem.tsx',
    start: '        <p',
    end: '        </p>',
  },
  {
    name: 'dropdownBlade',
    file: 'resources/views/components/dropdown.blade.php',
    start: '<div class="dropdown',
    end: '</div>',
  },
  {
    name: 'navDropdownBlade',
    file: 'resources/views/components/nav-dropdown.blade.php',
    start: '<x-dropdown',
    end: '</x-dropdown>',
  },
  {
    name: 'statElementBlade',
    file: 'resources/views/components/user/profile/stat-element.blade.php',
    start: '<div class="relative flex w-full items-center justify-between',
    end: '    <p class="z-2 bg-embed pl-2',
  },
  {
    name: 'userProfileMetaLabels',
    file: 'app/Community/Components/UserProfileMeta.php',
    // Not contiguous: collected line by line.
    grep: "'label' => '",
  },
  {
    name: 'recentlyPlayedBlade',
    file: 'resources/views/components/user/recently-played/index.blade.php',
    start: '    <h2 class="text-h4">',
    end: '    <div class="flex flex-col gap-y-1">',
  },
  {
    name: 'progressionRowBlade',
    file: 'resources/views/components/user/progression-status/console-progression-list-item.blade.php',
    start: '<li class="progression-status-row">',
    end: '        :totalGamesCount="$totalGamesCount"',
  },
  {
    name: 'progressionRowTally',
    file: 'resources/views/components/user/progression-status/console-progression-list-item.blade.php',
    start: '            <div class="tally text-zinc-400',
    end: '            </div>',
  },
  {
    name: 'siteAwardGroup',
    file: 'app/Helpers/render/site-award.php',
    start: "    echo \"<div id='\"",
    end: "    echo \"<div class='component",
  },
  {
    name: 'siteAwardCounter',
    file: 'app/Helpers/render/site-award.php',
    start: '    $counter =',
    end: '        </div>";',
  },
  {
    name: 'siteAwardBadgeClasses',
    file: 'app/Helpers/render/site-award.php',
    start: "    $imgclass = 'badgeimg siteawards';",
    end: '            $imgclass = ',
    extraLines: 1,
  },
  {
    name: 'gamesToolbar',
    file: 'resources/js/features/game-list/components/GamesDataTableContainer/DataTableToolbar/DataTableDesktopToolbar.tsx',
    start: '    <div className="flex w-full flex-col justify-between gap-2">',
    end: '    <div className="flex w-full flex-col justify-between gap-2">',
  },
];

/** Legacy web API endpoints the script calls; asserted to exist in public/API. */
export const apiEndpoints = [
  'API_GetGameHashes',
  'API_GetUserAwards',
  'API_GetUserSummary',
  'API_GetUserRecentlyPlayedGames',
  'API_GetUserRecentAchievements',
  'API_GetAchievementsEarnedBetween',
  'API_GetGameInfoAndUserProgress',
];
