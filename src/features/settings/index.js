/**
 * The RA Toolkit card on /settings.
 */

import { IS_DEBUG_BUILD } from '../../build-flags.js';
import { escapeHtml } from '../../core/dom.js';
import { log } from '../../core/log.js';
import { keepSettingsCardAttached } from '../../core/reattach.js';
import { waitForElement } from '../../core/wait.js';
import { findSettingsPanelHost } from './panel-host.js';

// =========================================
//            Settings Page
// =========================================
export async function renderSettingsPage(config) {
  const { enableSpeedrun, enableRomSearch, enableCustomBG, enableGameplayVideo, enableEmuparadise, prioritizeEmuparadise, enableGlassEffect, enableHashCheck, enableRomsFun, enableDebugLog, enableRarityIndicator, translateLang, accentColor } = config;

  try {
    // Wait for the React settings page to render
    const settingsContainer = await waitForElement("main article");
    // Find the element that hosts the settings tab panels
    const panelHost = findSettingsPanelHost(settingsContainer);

    if (panelHost && !document.getElementById("enhanced-settings")) {
      // Inject toggle switch styles (matching RAWeb BaseSwitch)
      const switchStyle = document.getElementById("enhanced-switch-style") || document.createElement("style");
      switchStyle.id = "enhanced-switch-style";
      switchStyle.textContent = `
        .enhanced-switch {
          position: relative;
          display: inline-flex;
          height: 1.5rem;
          width: 2.75rem;
          flex-shrink: 0;
          cursor: pointer;
          align-items: center;
          border-radius: 9999px;
          border: 2px solid transparent;
          transition: background-color 0.2s;
          background-color: #404040;
        }
        .enhanced-switch[data-state="checked"] {
          background-color: #3b82f6;
        }
        .enhanced-switch-thumb {
          pointer-events: none;
          display: block;
          height: 1.25rem;
          width: 1.25rem;
          border-radius: 9999px;
          background-color: #fafafa;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,.1);
          transition: transform 0.2s;
          transform: translateX(0);
        }
        .enhanced-switch[data-state="checked"] .enhanced-switch-thumb {
          transform: translateX(1.25rem);
        }
        .enhanced-switch:focus-visible {
          outline: 2px solid #d4d4d4;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(switchStyle);

      function createSwitchHtml(id, checked) {
        var state = checked ? "checked" : "unchecked";
        return '<button id="' + id + '" role="switch" type="button" aria-checked="' + checked + '" data-state="' + state + '" class="enhanced-switch" tabindex="0"><span class="enhanced-switch-thumb"></span></button>';
      }

      function bindSwitch(id, gmKey) {
        var btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener("click", function () {
          var isChecked = this.getAttribute("data-state") === "checked";
          var newState = !isChecked;
          this.setAttribute("data-state", newState ? "checked" : "unchecked");
          this.setAttribute("aria-checked", String(newState));
          GM_setValue(gmKey, newState);
        });
      }

      var settingsItems = [
        { id: "enhanced-romsearch", key: "enableRomSearch", val: enableRomSearch, label: "Enable ROMs search" },
        { id: "enhanced-hashcheck", key: "enableHashCheck", val: enableHashCheck, label: "Verify ROM hashes with RA API",
          hint: "Marks ROMs whose filename matches a known RA hash (requires RA API key in settings below)" },
        { id: "enhanced-epromsearch", key: "enableEmuparadise", val: enableEmuparadise, label: "Add Emuparadise to ROMs search",
          hint: "For Chrome users: enable mixed content; for all browsers: must click \"Add Exception\" the first time" },
        { id: "enhanced-prioritize_ep", key: "prioritizeEmuparadise", val: prioritizeEmuparadise, label: "Prioritize Emuparadise for ROMs search",
          hint: "Must have \"Add Emuparadise to ROMs search\" enabled" },
        { id: "enhanced-romsfun", key: "enableRomsFun", val: enableRomsFun, label: "Add RomsFun to ROMs search",
          hint: "Search romsfun.com for ROMs via their WordPress API" },
        { id: "enhanced-speedrun", key: "enableSpeedrun", val: enableSpeedrun, label: "Enable Speedrun.com stats" },
        { id: "enhanced-gameplayvideo", key: "enableGameplayVideo", val: enableGameplayVideo, label: "Enable gameplay video on the game page" },
        { id: "enhanced-custombg", key: "enableCustomBG", val: enableCustomBG, label: "Enable custom game page background" },
        { id: "enhanced-glassEffect", key: "enableGlassEffect", val: enableGlassEffect, label: "Enable glass background effect" },
        { id: "enhanced-rarity", key: "enableRarityIndicator", val: enableRarityIndicator, label: "Achievement rarity indicator",
          hint: "Color-coded badges on achievements by unlock % (Common, Uncommon, Rare, Very Rare, Ultra Rare, Legendary)" },
      ];

      // Debug logging is only exposed in a debug build, so it can't be turned
      // on from the public script. The DEBUG label is dropped at build time,
      // so this block is absent from the published bundle entirely.
      // See build.js and src/build-flags.js.
      DEBUG: if (IS_DEBUG_BUILD) {
        settingsItems.push({
          id: "enhanced-debuglog", key: "enableDebugLog", val: enableDebugLog,
          label: "Enable debug logging",
          hint: "Outputs detailed debug-level logs to the Tampermonkey console",
        });
      }

      var rowsHtml = settingsItems.map(function (item) {
        var hintHtml = item.hint ? '<span style="display:block;font-size:0.8em;color:#b9b9b9;margin-top:2px;">' + item.hint + '</span>' : '';
        return '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;">'
          + '<label for="' + item.id + '" class="text-menu-link cursor-pointer" style="flex:1;">' + item.label + hintHtml + '</label>'
          + createSwitchHtml(item.id, item.val)
          + '</div>';
      }).join('');

      // Translation language selector
      var langOptions = [
        { code: "pt-BR", label: "Português (BR)" },
        { code: "es-ES", label: "Español" },
        { code: "fr-FR", label: "Français" },
        { code: "de-DE", label: "Deutsch" },
        { code: "it-IT", label: "Italiano" },
        { code: "ja-JP", label: "日本語" },
        { code: "ko-KR", label: "한국어" },
        { code: "zh-CN", label: "中文 (简体)" },
        { code: "ru-RU", label: "Русский" },
        { code: "ar-SA", label: "العربية" },
      ];
      var langOptionsHtml = langOptions.map(function (opt) {
        return '<option value="' + opt.code + '"' + (translateLang === opt.code ? ' selected' : '') + '>' + escapeHtml(opt.label) + '</option>';
      }).join('');
      var langSelectorHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);">'
        + '<label for="enhanced-translate-lang" class="text-menu-link" style="flex:1;">Translation language <span style="font-size:0.8em;color:#b9b9b9;">(for achievement card translate buttons)</span></label>'
        + '<select id="enhanced-translate-lang" style="width:200px;padding:4px 8px;border-radius:6px;border:1px solid #525252;background:#262626;color:#e5e5e5;font-size:0.875rem;cursor:pointer;">'
        + langOptionsHtml
        + '</select>'
        + '</div>';

      // API Key input
      var currentApiKey = await GM_getValue("raApiKey", "");
      var apiKeyHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);">'
        + '<label for="enhanced-apikey" class="text-menu-link" style="flex:1;">RA API Key <span style="font-size:0.8em;color:#b9b9b9;">(for hash verification — find yours at Settings > Keys)</span></label>'
        + '<input id="enhanced-apikey" type="password" value="' + escapeHtml(currentApiKey) + '" placeholder="Your web API key" '
        + 'style="width:200px;padding:4px 8px;border-radius:6px;border:1px solid #525252;background:#262626;color:#e5e5e5;font-size:0.875rem;" />'
        + '</div>';

      // Accent color picker
      var accentColorHtml = '<div class="flex w-full items-center justify-between gap-3" style="min-height:2.5rem;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1);">'
        + '<label for="enhanced-accent-color" class="text-menu-link" style="flex:1;">Accent color <span style="font-size:0.8em;color:#b9b9b9;">(custom highlight color for toggles, buttons, and UI elements)</span></label>'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<input id="enhanced-accent-color" type="color" value="' + escapeHtml(accentColor) + '" style="width:40px;height:32px;border:1px solid #525252;border-radius:6px;background:#262626;cursor:pointer;padding:2px;" />'
        + '<button id="enhanced-accent-reset" style="padding:4px 10px;border-radius:6px;border:1px solid #525252;background:#262626;color:#a3a3a3;font-size:0.8rem;cursor:pointer;" title="Reset to default blue">Reset</button>'
        + '</div>'
        + '</div>';

      const enhancedDiv = document.createElement("div");
      enhancedDiv.id = "enhanced-settings";
      enhancedDiv.className = "w-full rounded-lg border border-embed-highlight bg-embed p-6 text-card-foreground shadow-xs light:border-neutral-300 light:bg-white";
      enhancedDiv.innerHTML = '<h3 class="pb-2 border-b-0 text-2xl font-semibold leading-none tracking-tight">RA Toolkit</h3>'
        + '<div class="flex flex-col gap-4" style="margin-top:1rem;">'
        + rowsHtml
        + langSelectorHtml
        + apiKeyHtml
        + accentColorHtml
        + '</div>'
        + '<div class="flex w-full justify-end" style="margin-top:1rem;"><button id="enhanced-settings-save" class="btn-base btn-base--default btn-base--size-default" type="button">Atualizar</button></div>';

      // Append below the active tab panel and survive tab switches.
      panelHost.appendChild(enhancedDiv);
      keepSettingsCardAttached(panelHost, enhancedDiv);

      // Bind all toggle switches
      settingsItems.forEach(function (item) {
        bindSwitch(item.id, item.key);
      });

      // Bind language selector
      var langSelect = document.getElementById("enhanced-translate-lang");
      if (langSelect) {
        langSelect.addEventListener("change", function () {
          GM_setValue("translateLang", this.value);
        });
      }

      // Bind API key input
      var apiKeyInput = document.getElementById("enhanced-apikey");
      if (apiKeyInput) {
        apiKeyInput.addEventListener("change", function () {
          GM_setValue("raApiKey", this.value);
        });
      }

      // Bind accent color picker
      var accentInput = document.getElementById("enhanced-accent-color");
      if (accentInput) {
        accentInput.addEventListener("input", function () {
          GM_setValue("accentColor", this.value);
          var s = document.getElementById('enhanced-accent-style');
          if (s) {
            s.textContent = ':root { --ra-accent: ' + this.value + '; }'
              + ' .enhanced-switch[data-state="checked"] { background-color: ' + this.value + ' !important; }'
              + ' .enhanced-translate-btn.translated { color: ' + this.value + '; border-color: ' + this.value + '40; }';
          }
          // Update all visible checked switches immediately
          document.querySelectorAll('.enhanced-switch[data-state="checked"]').forEach(function (sw) {
            sw.style.backgroundColor = accentInput.value;
          });
        });
      }
      var accentReset = document.getElementById("enhanced-accent-reset");
      if (accentReset) {
        accentReset.addEventListener("click", function () {
          var defaultColor = "#3b82f6";
          GM_setValue("accentColor", defaultColor);
          if (accentInput) accentInput.value = defaultColor;
          accentInput.dispatchEvent(new Event("input"));
        });
      }

      // Bind save/update button
      var saveBtn = document.getElementById("enhanced-settings-save");
      if (saveBtn) {
        saveBtn.addEventListener("click", function () {
          // All settings are already saved on change, just reload to apply
          var originalText = saveBtn.textContent;
          saveBtn.textContent = "✓ Salvo!";
          saveBtn.style.opacity = "0.7";
          saveBtn.disabled = true;
          setTimeout(function () {
            location.reload();
          }, 600);
        });
      }
    }
  } catch (e) {
    log.error("Settings page injection failed: " + e);
  }
}
