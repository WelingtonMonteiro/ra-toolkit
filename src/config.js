/**
 * User settings and the styles derived from them.
 */

import { IS_DEBUG_BUILD } from './build-flags.js';
import { LOG_LEVELS, setLogLevel } from './core/log.js';
import { isLightMode } from './core/theme.js';

/** Reads the user's settings and applies the styles that depend on them. */
export async function loadConfig() {
  // Debug logging can only be switched on in a debug build; the published
  // bundle drops this block and always reports false.
  let enableDebugLog = false;
  DEBUG: if (IS_DEBUG_BUILD) {
    enableDebugLog = await GM_getValue('enableDebugLog', true);
  }

  return {
    enableSpeedrun: await GM_getValue("enableSpeedrun", false),
    enableRomSearch: await GM_getValue("enableRomSearch", true),
    enableCustomBG: await GM_getValue("enableCustomBG", true),
    enableGameplayVideo: await GM_getValue("enableGameplayVideo", true),
    enableEmuparadise: await GM_getValue("enableEmuparadise", false),
    prioritizeEmuparadise: await GM_getValue("prioritizeEmuparadise", false),
    enableGlassEffect: await GM_getValue("enableGlassEffect", true),
    enableHashCheck: await GM_getValue("enableHashCheck", true),
    enableRomsFun: await GM_getValue("enableRomsFun", true),
    enableDebugLog,
    enableRarityIndicator: await GM_getValue("enableRarityIndicator", true),
    translateLang: await GM_getValue("translateLang", "pt-BR"),
    accentColor: await GM_getValue("accentColor", "#3b82f6"),
  };
}

/** Injects the accent-colour and light-mode stylesheets. */
export function applyGlobalStyles(config) {
  setLogLevel(config.enableDebugLog ? LOG_LEVELS.debug : LOG_LEVELS.info);

  var accentColor = config.accentColor;
  var accentStyle = document.getElementById('enhanced-accent-style');
  if (!accentStyle) {
    accentStyle = document.createElement('style');
    accentStyle.id = 'enhanced-accent-style';
    document.head.appendChild(accentStyle);
  }
  accentStyle.textContent = ':root { --ra-accent: ' + accentColor + '; }'
    + ' .enhanced-switch[data-state="checked"] { background-color: ' + accentColor + ' !important; }'
    + ' .enhanced-translate-btn.translated { color: ' + accentColor + '; border-color: ' + accentColor + '40; }'
    + ' #enhanced-changelog-ok { background: ' + accentColor + ' !important; }';
  var lightStyle = document.getElementById('enhanced-light-style');
  if (!lightStyle) {
    lightStyle = document.createElement('style');
    lightStyle.id = 'enhanced-light-style';
    document.head.appendChild(lightStyle);
  }
  lightStyle.textContent = isLightMode() ? `
    .enhanced-translate-btn { color: #525252; border-color: rgba(0,0,0,0.15); }
    .enhanced-translate-btn:hover { background: rgba(0,0,0,0.06); color: #1a1a1a; border-color: rgba(0,0,0,0.25); }
    #enhanced-romsdl a { color: #2563eb !important; }
    #enhanced-romsdl a:hover { color: #1d4ed8 !important; }
    .enhanced-rom-noresults { background: rgba(0,0,0,0.03) !important; border-color: rgba(0,0,0,0.1) !important; }
    .enhanced-rom-noresults p { color: #525252 !important; }
    .enhanced-rom-noresults strong { color: #1a1a1a !important; }
  ` : '';
}
