/**
 * The per-page entry point: decides what to inject for the current route.
 */

import { loadConfig, applyGlobalStyles } from './config.js';
import { cleanup } from './core/cleanup.js';
import { showChangelogPopup } from './core/version.js';
import { renderGamePage } from './features/game-page/index.js';
import { renderSettingsPage } from './features/settings/index.js';

const GAME_PAGE = /^\/game\/[0-9]+/;

export async function init() {
  console.log('[RA Toolkit] \u2699\ufe0f  init() starting on: ' + location.pathname);
  cleanup();

  const page = location.pathname;
  const config = await loadConfig();

  applyGlobalStyles(config);
  showChangelogPopup();

  if (page === '/settings') {
    await renderSettingsPage(config);
  } else if (GAME_PAGE.test(page)) {
    await renderGamePage(config);
  }
}
