/**
 * The surface the test suite drives. Not part of the bundle: main.js is the
 * entry point, so nothing here is shipped unless a feature module imports it.
 */

export { loadConfig, applyGlobalStyles } from './config.js';
export { init } from './app.js';
export { runAll, scheduleInit, start, waitForHydration } from './bootstrap.js';

export { cleanup } from './core/cleanup.js';
export { escapeHtml, parseHtml, parseXml } from './core/dom.js';
export { gmFetch } from './core/gm.js';
export { getInertiaProps, getLoggedUser } from './core/inertia.js';
export { log, LOG_LEVELS, setLogLevel } from './core/log.js';
export { getRarityTier } from './core/rarity.js';
export {
  disconnectReattachObservers,
  keepSettingsCardAttached,
  keepSidebarSectionsAttached,
} from './core/reattach.js';
export {
  getCachedRomResults,
  getRomCacheKey,
  ROM_CACHE_TTL,
  setCachedRomResults,
} from './core/rom-cache.js';
export { getScheme, isLightMode } from './core/theme.js';
export {
  addTranslateUsage,
  getTodayKey,
  getTranslateUsage,
  TRANSLATE_DAILY_LIMIT,
  translateWithRateLimit,
} from './core/translate.js';
export { CHANGELOG, CURRENT_VERSION, showChangelogPopup } from './core/version.js';
export { waitForElement } from './core/wait.js';

export { initWallLinkify } from './features/comments/linkify.js';
export { initWallTranslation } from './features/comments/translate.js';
export { initGameAwardsBeaten } from './features/game-awards/index.js';
export { renderGamePage } from './features/game-page/index.js';
export { initGamesMostMastered } from './features/games-list/index.js';
export { initAchievementNavLinks } from './features/navbar/index.js';
export { findSettingsPanelHost } from './features/settings/panel-host.js';
export { renderSettingsPage } from './features/settings/index.js';
export { initUserPagination } from './features/user-profile/index.js';
