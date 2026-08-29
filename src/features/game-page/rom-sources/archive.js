/**
 * archive.org collections: FB Neo, No-Intro 2016, generic and PSP DLC.
 */

import { parseHtml } from '../../../core/dom.js';
import { gmFetch } from '../../../core/gm.js';
import { log } from '../../../core/log.js';
import { RAConsole } from '../consoles.js';

// =========================================
//       Arcade Search Function
// =========================================
export function searchArcade(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  var mainDir = "//archive.org/download/2020_01_06_fbn/roms/arcade.zip/arcade%2F";
  var datDir = "https://raw.githubusercontent.com/libretro/FBNeo/master/dats/FinalBurn%20Neo%20(ClrMame%20Pro%20XML%2C%20Arcade%20only).dat";

  return gmFetch(datDir).then(function (response) {
    var xmlDoc = parseXml(response.responseText);

    xmlDoc.querySelectorAll("game").forEach(function (el) {
      var descEl = el.querySelector("description");
      var name = descEl ? descEl.textContent : "";
      if (tag === "" && name.toLowerCase().includes("hack")) return;
      if (tag === "Hack" && !name.toLowerCase().includes("hack")) return;
      if (refinedCompare(name, gameTitle)) {
        results.push({
          name: name,
          url: mainDir + el.getAttribute("name") + ".zip"
        });
      }
    });

    if (results.length === 0) {
      xmlDoc.querySelectorAll("game").forEach(function (el) {
        var descEl = el.querySelector("description");
        var name = descEl ? descEl.textContent : "";
        if (tag === "" && name.toLowerCase().includes("hack")) return;
        if (tag === "Hack" && !name.toLowerCase().includes("hack")) return;
        if (compare(name, gameTitle)) {
          results.push({
            name: name,
            url: mainDir + el.getAttribute("name") + ".zip"
          });
        }
      });
    }
    return true;
  }).catch(function (err) {
    log.warn("Arcade search failed: " + err.message);
    return true;
  });
}

// =========================================
//      No-Intro 2016 Search Function
// =========================================
export function searchNoIntro2016(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  var mainDir = "https://archive.org/download/No-Intro-Collection_2016-01-03_Fixed/";
  var consoleDir = "";
  var secondaryConsoleDir = "";

  const consoleDirMap = {
    [RAConsole.SNES]: "Nintendo - Super Nintendo Entertainment System",
    [RAConsole.NES]: "Nintendo - Nintendo Entertainment System",
    [RAConsole.GAMEBOY]: "Nintendo - Game Boy",
    [RAConsole.GAMEBOYCOLOR]: "Nintendo - Game Boy Color",
    [RAConsole.GAMEBOYADVANCE]: "Nintendo - Game Boy Advance",
    [RAConsole.NINTENDO64]: "Nintendo - Nintendo 64",
    [RAConsole.ATARI7800]: "Atari - 7800",
    [RAConsole.PCENGINE]: "NEC - PC Engine - TurboGrafx 16",
    [RAConsole.MEGADRIVE]: "Sega - Mega Drive - Genesis",
    [RAConsole.MASTERSYSTEM]: "Sega - Master System - Mark III",
    [RAConsole.GAMEGEAR]: "Sega - Game Gear",
    [RAConsole.POKEMINI]: "Nintendo - Pokemon Mini",
    [RAConsole.VIRTUALBOY]: "Nintendo - Virtual Boy",
    [RAConsole.SG1000]: "Sega - SG-1000",
    [RAConsole.COLECO]: "Coleco - ColecoVision",
    [RAConsole.VECTREX]: "GCE - Vectrex",
  };

  consoleDir = consoleDirMap[consoleName] || "";

  if (consoleName === RAConsole.NEOGEOPOCKET) {
    consoleDir = "SNK - Neo Geo Pocket";
    secondaryConsoleDir = "SNK - Neo Geo Pocket Color";
  }
  if (consoleName === RAConsole.MSX) {
    consoleDir = "Microsoft - MSX";
    secondaryConsoleDir = "Microsoft - MSX 2";
  }
  if (consoleName === RAConsole.WONDERSWAN) {
    consoleDir = "Bandai - WonderSwan Color";
    secondaryConsoleDir = "Bandai - WonderSwan Color";
  }

  consoleDir = consoleDir.replace(/ /g, "%20").concat(".zip/");
  secondaryConsoleDir = secondaryConsoleDir.replace(/ /g, "%20").concat(".zip/");

  function parseNoIntroResults(responseText) {
    var doc = parseHtml(responseText);
    doc.querySelectorAll("td > :first-child").forEach(function (el) {
      if (refinedCompare(el.textContent, gameTitle)) {
        results.push({ name: el.textContent, url: el.getAttribute("href") });
      }
    });
    if (results.length === 0) {
      doc.querySelectorAll("td > :first-child").forEach(function (el) {
        if (compare(el.textContent, gameTitle)) {
          results.push({ name: el.textContent, url: el.getAttribute("href") });
        }
      });
    }
  }

  return gmFetch(mainDir + consoleDir).then(function (response) {
    parseNoIntroResults(response.responseText);
    return true;
  }).catch(function (err) {
    log.warn("NoIntro2016 primary search failed: " + err.message);
    return true;
  })
  .then(function () {
    if (secondaryConsoleDir !== ".zip/") {
      return gmFetch(mainDir + secondaryConsoleDir).then(function (response) {
        parseNoIntroResults(response.responseText);
        return true;
      }).catch(function (err) {
        log.warn("NoIntro2016 secondary search failed: " + err.message);
        return true;
      });
    }
  });
}

// =========================================
//      Archive.org Generic Search
// =========================================
export function searchArchive(mainDir, ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  return gmFetch(mainDir).then(function (response) {
    var doc = parseHtml(response.responseText);
    var cells = doc.querySelectorAll("td > :first-child");

    cells.forEach(function (el) {
      var match = /([^\/]+)\/?$/g.exec(el.textContent);
      if (!match) return;
      var title = match[1];
      var href = el.getAttribute("href") || "";
      var fullUrl = href.startsWith("//archive.org/download/") ?
        href : mainDir + "/" + href;

      if (refinedCompare(title, gameTitle)) {
        results.push({ name: title, url: fullUrl });
      }
    });

    if (results.length === 0) {
      cells.forEach(function (el) {
        var match = /([^\/]+)\/?$/g.exec(el.textContent);
        if (!match) return;
        var title = match[1];
        var href = el.getAttribute("href") || "";
        var fullUrl = href.startsWith("//archive.org/download/") ?
          href : mainDir + "/" + href;

        if (compare(title, gameTitle)) {
          results.push({ name: title, url: fullUrl });
        }
      });
    }
    return true;
  }).catch(function (err) {
    log.warn("Archive search failed: " + err.message);
    return true;
  });
}

// =========================================
//       Archive.org DLC Search
// =========================================
export function searchArchiveDlc(mainDir, ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, compare, refinedCompare } = ctx;

  return gmFetch(mainDir).then(function (response) {
    var doc = parseHtml(response.responseText);
    var cells = doc.querySelectorAll("td > :first-child");

    cells.forEach(function (el) {
      var match = /([^\/]+)\/?$/g.exec(el.textContent);
      if (!match) return;
      var title = match[1];
      var href = el.getAttribute("href") || "";
      var fullUrl = href.startsWith("//archive.org/download/") ?
        href : mainDir + "/" + href;

      if (refinedCompare(title, gameTitle)) {
        resultsDlcs.push({ name: title, url: fullUrl });
      }
    });

    if (resultsDlcs.length === 0) {
      cells.forEach(function (el) {
        var match = /([^\/]+)\/?$/g.exec(el.textContent);
        if (!match) return;
        var title = match[1];
        var href = el.getAttribute("href") || "";
        var fullUrl = href.startsWith("//archive.org/download/") ?
          href : mainDir + "/" + href;

        if (compare(title, gameTitle)) {
          resultsDlcs.push({ name: title, url: fullUrl });
        }
      });
    }
    return true;
  }).catch(function (err) {
    log.warn("Archive DLC search failed: " + err.message);
    return true;
  });
}
