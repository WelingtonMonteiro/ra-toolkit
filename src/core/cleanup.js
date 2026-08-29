/**
 * Removing everything the toolkit injected, before injecting again.
 */

import { disconnectReattachObservers } from './reattach.js';

export function cleanup() {
  disconnectReattachObservers();
  const ids = ["enhanced-settings", "enhanced-romsdl", "enhanced-speedruncom",
               "enhanced-custom-bg-style", "enhanced-glass-style", "enhanced-dl-style",
               "enhanced-translate-style", "enhanced-pagination", "enhanced-pagination-style",
               "enhanced-guide-link", "enhanced-changelog-overlay", "enhanced-rarity-style",
               "enhanced-collapse-style", "enhanced-wall-linkify-style",
               "re-game-awards-style", "re-game-awards-tabs",
               "re-achievements-dropdown",
               "re-most-mastered-tab", "re-most-mastered-container", "re-most-mastered-style"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  // Remove injected video iframes, translate buttons, rarity badges, and linkify embeds
  document.querySelectorAll("iframe.enhanced-video").forEach(el => el.remove());
  document.querySelectorAll(".enhanced-translate-btn").forEach(el => el.remove());
  document.querySelectorAll(".enhanced-rarity-badge").forEach(el => el.remove());
  document.querySelectorAll(".enhanced-yt-embed").forEach(el => el.remove());
}
