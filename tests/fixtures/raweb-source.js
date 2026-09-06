/**
 * Frozen copies of the RetroAchievements markup RA Toolkit hooks onto.
 *
 * GENERATED — do not edit by hand. Run `npm run raweb:sync` against a local
 * ./RAWeb checkout to refresh it; the resulting diff shows what the site
 * changed. ./RAWeb itself stays local and is never committed.
 *
 * Source: https://github.com/RetroAchievements/RAWeb
 */

export const rawebRef = {
  repo: 'RetroAchievements/RAWeb',
  commit: '730359907',
  committedAt: '2026-08-30',
};

/** Legacy web API endpoints present in public/API at the ref above. */
export const rawebApiEndpoints = [
  "API_GetGameHashes",
  "API_GetUserAwards",
  "API_GetUserSummary",
  "API_GetUserRecentlyPlayedGames",
  "API_GetAchievementsEarnedBetween",
  "API_GetGameInfoAndUserProgress"
];

export const rawebSource = {
  appLayout: {
    file: 'resources/js/common/layouts/AppLayout/AppLayout.tsx',
    code: `
const AppLayoutBase: FC<AppLayoutBaseProps> = ({ children, withSidebar }) => {
  return (
    <div className="container lg:max-w-none xl:max-w-(--breakpoint-xl)">
      <main className={withSidebar ? 'with-sidebar' : undefined} data-scroll-target>
        {children}
      </main>
    </div>
  );
};

interface AppLayoutMainProps {
  children: ReactNode;

  className?: string;
}

const AppLayoutMain: FC<AppLayoutMainProps> = ({ children, className }) => {
  return (
    <article className={cn('relative z-10 min-w-0 px-2.5! sm:px-4! md:px-5!', className)}>
      {children}
    </article>
  );
};

interface AppLayoutSidebarProps {
  children: ReactNode;
}

const AppLayoutSidebar: FC<AppLayoutSidebarProps> = ({ children }) => {
  return <aside className="relative z-5">{children}</aside>;
};
`,
  },

  settingsPage: {
    file: 'resources/js/pages/settings.tsx',
    code: `
const Settings: AppPage = () => {
  const { initialTab, requestedUsername } =
    usePageProps<App.Community.Data.UserSettingsPageProps>();

  const { t } = useTranslation();

  useHydrateAtoms([
    [settingsTabAtom, initialTab],
    [requestedUsernameAtom, requestedUsername ?? undefined],
    //
  ]);

  return (
    <>
      <SEO title={t('Settings')} description="Adjust your account's settings and preferences." />

      <AppLayout.Main>
        <SettingsRoot />
      </AppLayout.Main>
    </>
  );
};

Settings.layout = (page) => <AppLayout withSidebar={false}>{page}</AppLayout>;

export default Settings;
`,
  },

  appBlade: {
    file: 'resources/views/layouts/app.blade.php',
    code: `
    <x-content>
        @if (!empty($page))
            @inertia
        @else
            <x-slot name="header">
                {{ $header ?? '' }}
            </x-slot>

            <x-slot name="breadcrumb">
                {{ $breadcrumb ?? '' }}
            </x-slot>

            <x-main :sidebarPosition="$sidebarPosition ?? 'right'">
                @if (!empty($page))
                    @inertia
                @endif

                <x-slot name="sidebar">
                    {{ $sidebar ?? '' }}
                </x-slot>

                {{ $slot ?? '' }}
            </x-main>
        @endif
    </x-content>
`,
  },

  settingsRoot: {
    file: 'resources/js/features/settings/components/+root/SettingsRoot.tsx',
    code: `
    <BaseTabs value={currentTab} onValueChange={handleValueChange} className="block">
      <div className="w-full">
        <h1>{t('Settings')}</h1>

        <div className="-mx-2.5 mb-4 overflow-x-auto md:hidden">
          <BaseTabsList
            className={cn(
              'flex min-w-full justify-start rounded-none border-b border-neutral-600 bg-neutral-900 py-0',
              'light:bg-neutral-200/40',
            )}
          >
            {tabs.map(({ value, label }) => (
              <BaseTabsTrigger
                key={value}
                value={value}
                variant="underlined"
                className="transition-none"
              >
                {label}
              </BaseTabsTrigger>
            ))}
          </BaseTabsList>
        </div>

        <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
          <nav aria-label={t('Settings')} className="hidden md:block">
            <BaseTabsList
              aria-orientation="vertical"
              className={cn(
                'flex h-auto w-full flex-col items-stretch justify-start gap-1 rounded-md bg-transparent p-0',
                'light:bg-transparent',
              )}
            >
              {tabs.map(({ value, label, IconComponent }) => (
                <BaseTabsTrigger key={value} value={value} variant="sidebar">
                  <IconComponent aria-hidden={true} className="size-4 min-w-4" />
                  {label}
                </BaseTabsTrigger>
              ))}
            </BaseTabsList>
          </nav>

          <div className="min-w-0">
            {tabs.map(({ value, label, panel }) => (
              <BaseTabsContent key={value} value={value} className="mt-0">
                <h2 ref={panelHeadingRef} tabIndex={-1} className="sr-only">
                  {label}
                </h2>
                {panel}
              </BaseTabsContent>
            ))}
          </div>
        </div>
      </div>
    </BaseTabs>
`,
  },

  baseCard: {
    file: 'resources/js/common/components/+vendor/BaseCard.tsx',
    code: `
const BaseCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'text-card-foreground rounded-lg border border-embed-highlight bg-embed shadow-xs',
        'light:border-neutral-300 light:bg-white',
        className,
      )}
      {...props}
    />
  ),
);
BaseCard.displayName = 'BaseCard';
`,
  },

  baseButton: {
    file: 'resources/js/common/components/+vendor/BaseButton.tsx',
    code: `
const baseButtonVariants = cva(['btn-base'], {
  variants: {
    variant: {
      default: 'btn-base--default',
      defaultDisabled: 'btn-base--default-disabled',
      destructive: 'btn-base--destructive',
      outline: 'btn-base--outline',
      secondary: 'btn-base--secondary',
      ghost: 'btn-base--ghost',
      link: 'btn-base--link',
    },
    size: {
      default: 'btn-base--size-default',
      xs: 'btn-base--size-xs',
      sm: 'btn-base--size-sm',
      lg: 'btn-base--size-lg',
      icon: 'btn-base--size-icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});
`,
  },

  gameShowSidebarRoot: {
    file: 'resources/js/features/games/components/+show-sidebar/GameShowSidebarRoot.tsx',
    code: `
    <div data-testid="sidebar" className="flex flex-col gap-6">
      <PlayableBoxArtImage src={game.imageBoxArtUrl} />
`,
  },

  gameShowMainRoot: {
    file: 'resources/js/features/games/components/+show/GameShowMainRoot.tsx',
    code: `
    <div data-testid="game-show" className="flex flex-col gap-3">
`,
  },

  playableBoxArtImage: {
    file: 'resources/js/common/components/PlayableBoxArtImage/PlayableBoxArtImage.tsx',
    code: `
    <div className="overflow-hidden text-center">
      <ZoomableImage src={src} alt={t('boxart')} isPixelated={false}>
        <img className="max-w-full rounded-xs" src={src} alt={t('boxart')} />
      </ZoomableImage>
    </div>
`,
  },

  achievementsListItemTitle: {
    file: 'resources/js/common/components/AchievementsListItem/AchievementsListItem.tsx',
    code: `
    <motion.li
      className="game-set-item"
      initial={{ opacity: 0, transform: 'translateY(10px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      exit={{ opacity: 0, transform: 'translateY(10px)' }}
      transition={{
        duration: 0.12,
        delay: isLargeList
          ? Math.min(index * 0.008, 0.15) // Cap at 150ms for large lists
          : Math.min(index * 0.015, 0.2), // Cap at 200ms for small lists
      }}
    >
      <div className="flex flex-col gap-y-1 md:mt-1">
        <AchievementAvatar
          {...achievement}
          showLabel={false}
          hasTooltip={false}
          size={64}
          displayLockedStatus="auto"
        />
      </div>

      <div className="grid w-full gap-x-5 gap-y-1.5 leading-4 md:grid-cols-6">
        {/* Title and description area */}
        <div className="md:col-span-4">
          <div className="mb-0.5 flex justify-between gap-x-2">
            {/* Title */}
            <div className="-mt-1 mb-0.5 md:mt-0">
              <span className="mr-2">
                <InertiaLink
                  href={route('achievement.show', { achievement: achievement.id })}
                  prefetch="desktop-hover-only"
                  className="font-medium"
                >
                  {title}
                  {game?.title ? ' ' : null}
                </InertiaLink>

                {game?.title ? (
                  <Trans
                    i18nKey="<1>from</1> <2>{{gameTitle}}</2>"
                    components={{
                      1: <span />,
                      2: <AchievementGameTitle game={game} />,
                    }}
                  />
                ) : null}
              </span>

              <AchievementPoints
                isEvent={!!eventAchievement}
                points={achievement.points ?? 0}
                pointsWeighted={shouldShowWeightedPoints ? achievement.pointsWeighted : undefined}
              />
            </div>

            {/* Meta chips (Mobile) */}
            {metaChips ? (
              <div className="-mt-1.5 md:hidden">
                <div className="-mt-1.5 flex items-center gap-x-1">{metaChips}</div>
              </div>
            ) : null}
          </div>

          {/* Description */}
          <p className="leading-4">
            {decorator ? \`\${decorator}: \` : null}
            {description}
          </p>
`,
  },

  achievementsListItemStats: {
    file: 'resources/js/common/components/AchievementsListItem/AchievementsListItem.tsx',
    code: `
            <p className="-mt-1.5 hidden text-center text-2xs md:block">
              {t('{{percentage}} unlock rate', {
                percentage: formatPercentage(unlockPercentage),
              })}
            </p>
`,
  },

  commentList: {
    file: 'resources/js/common/components/CommentList/CommentList.tsx',
    code: `
          <ul className="highlighted-list flex flex-col">
`,
  },

  commentListItem: {
    file: 'resources/js/common/components/CommentList/CommentListItem.tsx',
    code: `
    <li
      id={\`comment_\${comment.id}\`}
      className="group flex w-full scroll-mt-20 items-start gap-4 p-2 target:outline-2 target:outline-text"
    >
      <div className="mt-1">
        {comment.isAutomated ? (
          <div className="size-8" />
        ) : (
          <UserAvatar {...comment.user} showLabel={false} />
        )}
      </div>

      <div className="w-full">
`,
  },

  commentListItemBody: {
    file: 'resources/js/common/components/CommentList/CommentListItem.tsx',
    code: `
        <p
          style={{ wordBreak: 'break-word' }}
          className={comment.isAutomated ? 'mt-1 text-xs text-neutral-500' : ''}
        >
          <FormatNewlines>{comment.payload}</FormatNewlines>
        </p>
`,
  },

  dropdownBlade: {
    file: 'resources/views/components/dropdown.blade.php',
    code: `
<div class="dropdown {{ $class ?? '' }} {{ ($active ?? false) ? 'active' : '' }}">
    <x-dropdown-trigger
        triggerClass="{{ $triggerClass ?? '' }}"
        id="dropdownTrigger{{ $id }}"
        title="{{ $title ?? '' }}"
        :desktopHref="($desktopHref && $canUseDesktopHref) ? $desktopHref : null"
    >
        {{ $trigger }}
    </x-dropdown-trigger>

    <div
        class="dropdown-menu {{ $dropdownClass ?? '' }}"
        aria-labelledby="dropdownTrigger{{ $id }}"
    >
        {{ $slot }}
    </div>
`,
  },

  navDropdownBlade: {
    file: 'resources/views/components/nav-dropdown.blade.php',
    code: `
<x-dropdown
    class="nav-item {{ $class ?? '' }}"
    trigger-class="nav-link {{ $triggerClass ?? '' }}"
    :dropdown-class="$dropdownClass ?? ''"
    :active="$active ?? false"
    :title="$title ?? ''"
    :desktopHref="$desktopHref"
>
    <x-slot name="trigger">{{ $trigger }}</x-slot>
    {{ $slot }}
</x-dropdown>
`,
  },

  statElementBlade: {
    file: 'resources/views/components/user/profile/stat-element.blade.php',
    code: `
<div class="relative flex w-full items-center justify-between text-2xs">
    <p class="z-2 bg-embed pr-2">{{ $label }}</p>

    <div class="absolute left-0 right-0 border-t border-dotted border-text-muted"></div>

    <p class="z-2 bg-embed pl-2 {{ $isMuted ? 'text-muted italic' : '' }} {{ $shouldEnableBolding && !$isMuted ? 'font-bold' : '' }}">
`,
  },

  userProfileMetaLabels: {
    file: 'app/Community/Components/UserProfileMeta.php',
    code: `
'label' => 'Achievement sets worked on',
'label' => 'Achievements unlocked by players',
'label' => 'Points awarded to players',
'label' => 'Code notes created',
'label' => 'Leaderboards created',
'label' => 'Open tickets',
'label' => 'Points',
'label' => 'Site rank',
'label' => 'Achievements unlocked',
'label' => 'RetroRatio',
'label' => 'Total games beaten',
'label' => 'Started games beaten',
'label' => 'Points earned in the last 7 days',
'label' => 'Points earned in the last 30 days',
'label' => 'Average points per week',
'label' => 'Average completion',
'label' => 'Forum posts',
'label' => 'Achievement sets requested',
'label' => 'Points (casual)',
'label' => 'Casual rank',
'label' => 'Achievements unlocked (casual)',
`,
  },

  recentlyPlayedBlade: {
    file: 'resources/views/components/user/recently-played/index.blade.php',
    code: `
    <h2 class="text-h4">
        @if ($recentlyPlayedCount === 1)
            Last game played
        @else
            Last {{ localized_number($recentlyPlayedCount) }} Games Played
        @endif
    </h2>

    <div class="flex flex-col gap-y-1">
`,
  },

  progressionRowBlade: {
    file: 'resources/views/components/user/progression-status/console-progression-list-item.blade.php',
    code: `
<li class="progression-status-row">
    <a
        href="{{ $cellUrls['totals'] }}"
        class="border-embed-highlight w-[102px] min-w-[92px]! pl-2 rounded-l-sm hover:border-link-hover"
        @if (!$label) title="{{ $consoleTooltipLabel }}" @endif
    >
        <img
            src="{{ $gameSystemIconSrc }}"
            width="18"
            height="18"
            alt="{{ $label ? 'RA icon' : $consoleTooltipLabel }} console icon"
        >
        <p class="block tracking-tighter">{{ $displayLabel }}</p>
    </a>

    <x-user.progression-status.list-item-cell-link
        cellType="unfinished"
        :href="$cellUrls['unfinished']"
        :widthMode="$widthMode"
        :cellGamesCounts="[$unfinishedCount]"
        :totalGamesCount="$totalGamesCount"
`,
  },

  progressionRowTally: {
    file: 'resources/views/components/user/progression-status/console-progression-list-item.blade.php',
    code: `
            <div class="tally text-zinc-400 light:text-zinc-600 group-hover:text-link-hover">
                <div class="dot border border-zinc-400 light:border-zinc-600 group-hover:border-link-hover"></div>
                {{ $beatenCasualCount }}
            </div>
`,
  },

  siteAwardGroup: {
    file: 'app/Helpers/render/site-award.php',
    code: `
    echo "<div id='" . strtolower(str_replace(' ', '', $title)) . "'>";
    echo "<h3 class='flex justify-between gap-2'><span class='grow'>$title</span>$counters</h3>";
    echo "<div class='component w-full place-content-center bg-embed gap-2 grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] xl:rounded xl:py-2'>";
`,
  },

  siteAwardCounter: {
    file: 'app/Helpers/render/site-award.php',
    code: `
    $counter =
        "<div class='cursor-help flex gap-x-1 text-sm' title='$tooltip'>
            <div class='text-2xs'>$icon</div><div class='numitems'>$numItems</div>
        </div>";
`,
  },

  siteAwardBadgeClasses: {
    file: 'app/Helpers/render/site-award.php',
    code: `
    $imgclass = 'badgeimg siteawards';

    if ($awardType === AwardType::Mastery->toLegacyInteger()) {
        if ($awardDataExtra == '1') {
            $awarded = "Mastered on $awardDate";
            $imgclass = 'goldimage';
        } else {
`,
  },

  gamesToolbar: {
    file: 'resources/js/features/game-list/components/GamesDataTableContainer/DataTableToolbar/DataTableDesktopToolbar.tsx',
    code: `
    <div className="flex w-full flex-col justify-between gap-2">
`,
  },
};
