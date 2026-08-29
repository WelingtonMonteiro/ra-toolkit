/**
 * Emuparadise, behind an opt-in setting.
 */

import { parseHtml } from '../../../core/dom.js';
import { gmFetch } from '../../../core/gm.js';
import { log } from '../../../core/log.js';
import { RAConsole } from '../consoles.js';

// =========================================
//       Emuparadise Search Function
// =========================================
export function searchEmuparadise(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  var mainDir = "https://www.emuparadise.me";
  var consoleUrlMap = {
    [RAConsole.SNES]: "Super_Nintendo_Entertainment_System_(SNES)_ROMs/List-All-Titles/5",
    [RAConsole.NES]: "Nintendo_Entertainment_System_ROMs/List-All-Titles/13",
    [RAConsole.GAMEBOY]: "Nintendo_Game_Boy_ROMs/List-All-Titles/12",
    [RAConsole.GAMEBOYCOLOR]: "Nintendo_Game_Boy_Color_ROMs/List-All-Titles/11",
    [RAConsole.GAMEBOYADVANCE]: "Nintendo_Gameboy_Advance_ROMs/List-All-Titles/31",
    [RAConsole.NINTENDO64]: "Nintendo_64_ROMs/List-All-Titles/9",
    [RAConsole.GAMECUBE]: "Nintendo_Gamecube_ISOs/List-All-Titles/42",
    [RAConsole.NINTENDODS]: "Nintendo_DS_ROMs/List-All-Titles/32",
    [RAConsole.MEGADRIVE]: "Sega_Genesis_-_Sega_Megadrive_ROMs/List-All-Titles/6",
    [RAConsole.MASTERSYSTEM]: "Sega_Master_System_ROMs/List-All-Titles/15",
    [RAConsole.SEGA32X]: "Sega_32X_ROMs/61",
    [RAConsole.SATURN]: "Sega_Saturn_ISOs/List-All-Titles/3",
    [RAConsole.SEGACD]: "Sega_CD_ISOs/List-All-Titles/10",
    [RAConsole.GAMEGEAR]: "Sega_Game_Gear_ROMs/List-All-Titles/14",
    [RAConsole.NEOGEOPOCKET]: "Neo_Geo_Pocket_-_Neo_Geo_Pocket_Color_(NGPx)_ROMs/38",
    [RAConsole.ATARI2600]: "Atari_2600_ROMs/List-All-Titles/49",
    [RAConsole.ATARI7800]: "Atari_7800_ROMs/47",
    [RAConsole.PCENGINE]: "PC_Engine_-_TurboGrafx16_ROMs/List-All-Titles/16",
    [RAConsole.APPLEII]: "Apple_][_ROMs/List-All-Titles/24",
    [RAConsole.PS1]: "Sony_Playstation_ISOs/List-All-Titles/2",
    [RAConsole.PS2]: "Sony_Playstation_2_ISOs/List-All-Titles/41",
    [RAConsole.PSP]: "PSP_ISOs/List-All-Titles/44",
    [RAConsole.P3DO]: "Panasonic_3DO_(3DO_Interactive_Multiplayer)_ISOs/List-All-Titles/20",
  };

  var consoleUrl = consoleUrlMap[consoleName];
  if (!consoleUrl) return Promise.resolve();

  return gmFetch(mainDir + "/" + consoleUrl).then(function (response) {
    var doc = parseHtml(response.responseText);
    var items = doc.querySelectorAll(".index.gamelist");

    function buildDownloadPageUrl(href) {
      // href like /Console_ROMs/Game_Name/151200 — link to the download page
      var clean = href.replace(/\/+$/, '');
      return mainDir + clean;
    }

    items.forEach(function (el) {
      var href = el.getAttribute("href") || "";
      if (!href) return;
      if (refinedCompare(el.textContent, gameTitle)) {
        results.push({
          name: el.textContent,
          url: buildDownloadPageUrl(href)
        });
      }
    });

    if (results.length === 0) {
      items.forEach(function (el) {
        var href = el.getAttribute("href") || "";
        if (!href) return;
        if (compare(el.textContent, gameTitle)) {
          results.push({
            name: el.textContent,
            url: buildDownloadPageUrl(href)
          });
        }
      });
    }
    return true;
  }).catch(function (err) {
    log.warn("Emuparadise search failed: " + err.message);
    return true;
  });
}
