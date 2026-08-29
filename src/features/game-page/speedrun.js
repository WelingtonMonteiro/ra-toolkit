/**
 * speedrun.com world records and the gameplay video embed.
 */

import { escapeHtml } from '../../core/dom.js';
import { gmFetch } from '../../core/gm.js';
import { log } from '../../core/log.js';
import { makeCollapsible } from './collapsible.js';
import { parseIso8601, toEmbedUrl } from './media.js';
import { RAConsole, SRConsole } from './consoles.js';

/**
 * Looks the game up on speedrun.com and renders the world-record list and
 * the gameplay video, according to the user's settings.
 */
export function initSpeedrunSection(options) {
  const { gameTitle, consoleName, container, enableSpeedrun, enableGameplayVideo } = options;

  var srRoot = "https://www.speedrun.com/api/v1/";
  var srLogo = "";
  var srVideoUrl = "";
  var srGamelink = "";
  var srGameId = "";
  var srRuns = [];

  function createSpeedrun() {
    const h3 = document.createElement("h3");
    h3.textContent = "World Records";
    h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
    container.appendChild(h3);
  
    if (srRuns.length > 0) {
      srRuns.forEach((runsData) => {
        const div = document.createElement("div");
        div.innerHTML = `<a href="${encodeURI(runsData.link)}" style="color: #5b9bd5;">${escapeHtml(runsData.category)}:</a> ${escapeHtml(runsData.time)} by ${escapeHtml(runsData.runner)}`;
        container.appendChild(div);
      });
    } else {
      const div = document.createElement("div");
      div.textContent = "Couldn't find this game on Speedrun.com";
      container.appendChild(div);
    }
    makeCollapsible(container, 'speedrun');
  }

  function createVideo() {
    if (srVideoUrl === "") return;
    // Prevent duplicate video iframes
    if (document.querySelector("iframe.enhanced-video")) return;
    log.debug("Creating video with URL: " + srVideoUrl);
  
    // Insert after the screenshots container in the main article
    const gameShow = document.querySelector('[data-testid="game-show"]');
    if (gameShow && gameShow.firstElementChild) {
      const iframe = document.createElement("iframe");
      iframe.className = "enhanced-video";
      iframe.style.cssText = "display: block; width: 100%; height: 315px; padding-bottom: 1em; border: none; border-radius: 0.5rem;";
      iframe.src = srVideoUrl;
      iframe.allowFullscreen = true;
      iframe.setAttribute("autoplay", "false");
      // Insert after the screenshots section
      const screenshotsDiv = gameShow.firstElementChild;
      screenshotsDiv.after(iframe);
    }
  }

  // =========================================
  //         Speedrun.com Functions
  // =========================================
  function getSrConsoleId(cName) {
    const map = {
      [RAConsole.ATARI2600]: SRConsole.ATARI2600,
      [RAConsole.ATARI7800]: SRConsole.ATARI7800,
      [RAConsole.APPLEII]: SRConsole.APPLEII,
      [RAConsole.ARCADE]: SRConsole.ARCADE,
      [RAConsole.COLECO]: SRConsole.COLECOVISION,
      [RAConsole.DREAMCAST]: SRConsole.DREAMCAST,
      [RAConsole.GAMEBOY]: SRConsole.GAMEBOY,
      [RAConsole.GAMEBOYADVANCE]: SRConsole.GAMEBOYADVANCE,
      [RAConsole.GAMEBOYCOLOR]: SRConsole.GAMEBOYCOLOR,
      [RAConsole.MEGADRIVE]: SRConsole.MEGADRIVE,
      [RAConsole.GAMEGEAR]: SRConsole.GAMEGEAR,
      [RAConsole.NINTENDO64]: SRConsole.NINTENDO64,
      [RAConsole.SATURN]: SRConsole.SEGASATURN,
      [RAConsole.MASTERSYSTEM]: SRConsole.MASTERSYSTEM,
      [RAConsole.NINTENDODS]: SRConsole.NINTENDODS,
      [RAConsole.NEC8800]: SRConsole.NEC8800,
      [RAConsole.NEOGEOPOCKET]: SRConsole.NEOGEOPOCKETCOLOR,
      [RAConsole.NES]: SRConsole.NES,
      [RAConsole.P3DO]: SRConsole.PANASONIC3D0,
      [RAConsole.PCENGINE]: SRConsole.PCENGINE,
      [RAConsole.POKEMINI]: SRConsole.POKÉMONMINI,
      [RAConsole.PS1]: SRConsole.PS1,
      [RAConsole.PSP]: SRConsole.PLAYSTATIONPORTABLE,
      [RAConsole.SEGA32X]: SRConsole.SEGA32X,
      [RAConsole.SEGACD]: SRConsole.SEGACD,
      [RAConsole.SG1000]: SRConsole.MASTERSYSTEM,
      [RAConsole.SNES]: SRConsole.SNES,
      [RAConsole.VIRTUALBOY]: SRConsole.VIRTUALBOY,
      [RAConsole.AMSTRADCPC]: SRConsole.AMSTRADCPC,
    };
    return map[cName] || "";
  }

  function getSpeedruns(gameName) {
    var consoleId = getSrConsoleId(consoleName);
    var srSearchUrl = encodeURI(srRoot + "games?name=" + gameName + "&platform=" + consoleId);
  
    return gmFetch(srSearchUrl)
    .then(function (gamesResponse) {
      var gamesData = JSON.parse(gamesResponse.responseText).data;
      if (gamesData.length > 0) {
        srGamelink = gamesData[0].weblink;
        srGameId = gamesData[0].id;
        return gamesData[0].links[3].uri;
      } else {
        throw new Error("Couldn't find this game on Speedrun.com (" + srSearchUrl + ").");
      }
    })
    .then(function (link) {
      return gmFetch(link).then(function (response) {
        return JSON.parse(response.responseText).data;
      });
    })
    .then(function (categories) {
      return Promise.all(categories.map(function (category) {
        return gmFetch(srRoot + "runs?game=" + srGameId + "&category=" + category.id + "&status=verified")
        .then(function (runsResponse) {
          var runsData = JSON.parse(runsResponse.responseText).data[0];
          if (runsData != undefined && runsData.status.status !== "rejected") {
            if (srVideoUrl === "" && runsData.videos)
              srVideoUrl = toEmbedUrl(runsData.videos.links[0].uri);
          }
          return runsData;
        })
        .then(function (runsData) {
          if (runsData == undefined) return false;
          var isGuest = runsData.players[0].rel === "guest";
  
          return gmFetch(srRoot + "users/" + runsData.players[0].id)
          .then(function (userRes) {
            var userData = JSON.parse(userRes.responseText).data;
            srRuns.push({
              category: category.name,
              time: parseIso8601(runsData.times.primary),
              runner: isGuest ? runsData.players[0].name : userData.names.international,
              link: runsData.videos ? runsData.videos.links[0].uri : ""
            });
            return true;
          }).catch(function (err) {
            log.warn("Failed to fetch user data: " + err.message);
            srRuns.push({
              category: category.name,
              time: parseIso8601(runsData.times.primary),
              runner: isGuest ? runsData.players[0].name : "Unknown",
              link: runsData.videos ? runsData.videos.links[0].uri : ""
            });
            return true;
          });
        })
        .catch(function (err) {
          log.warn("Failed to fetch runs for category: " + err.message);
          return false;
        });
      }))
      .then(function () {
        if (enableSpeedrun) createSpeedrun();
        if (enableGameplayVideo) createVideo();
      });
    })
    .catch(function (err) {
      log.error("Speedrun fetch error: " + err.message);
      if (enableSpeedrun) {
        var div = document.createElement("div");
        div.textContent = "Couldn't find this game on Speedrun.com";
        container.appendChild(div);
      }
    });
  }

  if (enableGameplayVideo || enableSpeedrun) getSpeedruns(gameTitle);
}
