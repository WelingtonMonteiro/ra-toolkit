/**
 * Rendering the ROMs section: download rows, DLC and the empty state.
 */

import { escapeHtml } from '../../core/dom.js';
import { makeCollapsible } from './collapsible.js';
import { getHashBadge } from './hashes.js';
import { removeExt } from './rom-name.js';

// =========================================
//         Create Content Functions
// =========================================
export function createNoRomsNotification(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, divRoms, knownHashes } = ctx;

  const searchQuery = encodeURIComponent(gameTitle + " " + consoleName);
  const archiveUrl = "https://archive.org/search?query=" + searchQuery;
  const myrientUrl = "https://myrient.erista.me/files/" + encodeURIComponent(consoleName);

  const h3 = document.createElement("h3");
  h3.textContent = "ROMs";
  h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
  divRoms.appendChild(h3);

  const msgDiv = document.createElement("div");
  msgDiv.style.cssText = "padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);";
  msgDiv.innerHTML =
    '<p style="margin:0 0 8px;color:#a3a3a3;font-size:0.9em;">No ROMs found for <strong style="color:#e5e5e5;">' + escapeHtml(gameTitle) + '</strong>.</p>' +
    '<p style="margin:0 0 4px;color:#a3a3a3;font-size:0.85em;">Try searching manually:</p>' +
    '<div style="display:flex;flex-direction:column;gap:4px;">' +
      '<a href="' + archiveUrl + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; Archive.org</a>' +
      '<a href="' + myrientUrl + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; Myrient</a>' +
      '<a href="https://romsfun.com/?s=' + searchQuery + '" target="_blank" rel="noopener" style="color:#5b9bd5;font-size:0.85em;text-decoration:none;">&#x1F50D; RomsFun</a>' +
    '</div>';
  divRoms.appendChild(msgDiv);
  makeCollapsible(divRoms, 'roms');
}

export function createDownloads(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, divRoms, knownHashes } = ctx;

  const style = document.createElement("style");
  style.textContent = `
    #enhanced-romsdl .dl-link {
      color: #5b9bd5;
      text-decoration: none;
    }
    #enhanced-romsdl .dl-link:hover {
      text-decoration: underline;
    }
    #enhanced-romsdl .rom-row {
      display: flex;
      align-items: center;
      padding: 2px 0;
    }
    .enhanced-trophy-badge:hover {
      transform: scale(1.15);
    }
  `;
  document.head.appendChild(style);

  const h3 = document.createElement("h3");
  h3.textContent = "ROMs";
  h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em;";
  divRoms.appendChild(h3);

  for (var i = 0; i < results.length; i++) {
    let dlLink = results[i].url.replace(/ /g, "%20");
    const wrapper = document.createElement("div");
    wrapper.className = "rom-row";
    var badge = getHashBadge(results[i].name, knownHashes);
    wrapper.innerHTML = '<a class="dl-link" href="' + encodeURI(dlLink) + '" target="_blank" rel="noopener">' + escapeHtml(removeExt(results[i].name)) + '</a>' + badge;
    divRoms.appendChild(wrapper);
  }

  if (collection.url !== "") {
    const fromDiv = document.createElement("div");
    fromDiv.style.marginTop = "1em";
    fromDiv.innerHTML = `From <a href="${encodeURI(collection.url)}" style="color: #5b9bd5;">${escapeHtml(collection.name)}</a>`;
    divRoms.appendChild(fromDiv);
  }
  makeCollapsible(divRoms, 'roms');
}

export function createDlcs(ctx) {
  const { gameTitle, consoleName, results, resultsDlcs, collection, divRoms, knownHashes } = ctx;

  const h3 = document.createElement("h3");
  h3.textContent = "DLCs";
  h3.style.cssText = "font-size: 1.17em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;";
  divRoms.appendChild(h3);

  for (var i = 0; i < resultsDlcs.length; i++) {
    let dlLink = resultsDlcs[i].url.replace(/ /g, "%20");
    const a = document.createElement("a");
    a.className = "dl-link";
    a.href = dlLink;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = removeExt(resultsDlcs[i].name);
    divRoms.appendChild(a);
  }

  const fromDiv = document.createElement("div");
  fromDiv.style.marginTop = "1em";
  fromDiv.innerHTML = `From <a href="https://archive.org/download/PSP-DLC/%5BNo-Intro%5D%20PSP%20DLC" style="color: #5b9bd5;">PSP-DLC (No-Intro)</a>`;
  divRoms.appendChild(fromDiv);
}
