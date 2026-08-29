/**
 * The paginated "Last N Games Played" list.
 */

import { escapeHtml } from '../../core/dom.js';
import { fetchAndRenderAchievements } from './achievements.js';
import { getConsoleInfo } from './consoles.js';

export function renderGames(games, ctx) {
  const { targetUser } = ctx;
  gamesList.innerHTML = '';
  if (games.length === 0) {
    gamesList.innerHTML = '<div style="color:#a3a3a3;padding:12px;">No more games found.</div>';
    return;
  }
  games.forEach(function (game) {
    var imgSrc = game.ImageIcon
      ? "https://retroachievements.org" + game.ImageIcon
      : "";

    var numAchieved = game.NumAchieved || 0;
    var numHC = game.NumAchievedHardcore || 0;
    var numTotal = game.NumPossibleAchievements || 0;
    var totalScore = game.PossibleScore || 0;
    var hcScore = game.ScoreAchievedHardcore || 0;
    var scScore = game.ScoreAchieved || 0;
    var exclusiveSoftcore = Math.max(scScore - hcScore, 0);
    var leftPoints = hcScore >= exclusiveSoftcore ? hcScore : exclusiveSoftcore;

    // Progress percentages
    var hcPct = numTotal > 0 ? Math.floor((numHC / numTotal) * 100) : 0;
    var totalPct = numTotal > 0 ? Math.floor((numAchieved / numTotal) * 100) : 0;
    var softcoreBarWidth = Math.max(totalPct - hcPct, 0);

    // Achievement count text
    var achHtml = '';
    if (numTotal > 0) {
      if (numAchieved === numTotal) {
        achHtml = 'All <span class="font-bold">' + numAchieved + '</span> achievements';
      } else {
        achHtml = '<span class="font-bold">' + numAchieved + '</span> of <span class="font-bold">' + numTotal + '</span> achievements';
      }
    }

    // Points text
    var pointsHtml = '';
    if (totalScore > 0) {
      pointsHtml = '<span class="font-bold">' + leftPoints + '</span> of <span class="font-bold">' + totalScore + '</span> points';
      if (exclusiveSoftcore > 0 && exclusiveSoftcore < hcScore) {
        pointsHtml += ' (+<span class="font-bold">' + exclusiveSoftcore + '</span> casual)';
      } else if (hcScore > 0 && exclusiveSoftcore > hcScore) {
        pointsHtml += ' (+<span class="font-bold">' + hcScore + '</span> hardcore)';
      }
    }

    // Last played date
    var lastPlayedLabel = '';
    if (game.LastPlayed) {
      var d = new Date(game.LastPlayed);
      var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      lastPlayedLabel = months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear();
    }

    // Console info (short name + icon URL)
    var consoleInfo = getConsoleInfo(game.ConsoleID);

    // Determine award state — prefer gameAwardsMap (accurate), fallback to progress inference
    var awardKind = '';
    var awardInfo = gameAwardsMap[String(game.GameID)];
    if (awardInfo) {
      awardKind = awardInfo.awardKind;
    } else if (numTotal > 0 && numHC === numTotal) {
      awardKind = 'mastered';
    } else if (numTotal > 0 && numAchieved === numTotal) {
      awardKind = 'completed';
    }

    // Award title labels
    var awardTitles = { 'mastered':'Mastered', 'completed':'Completed', 'beaten-hardcore':'Beaten', 'beaten-softcore':'Beaten (casual)' };
    var awardTitle = awardTitles[awardKind] || 'Unfinished';

    // Progress bar HTML (reusing site's existing CSS classes)
    var progressBarHtml = '';
    if (numTotal > 0) {
      progressBarHtml = '<div class="cprogress-pbar__root">'
        + '<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + totalPct + '">'
        + '<div style="width:' + hcPct + '%"' + (hcPct === 100 ? ' class="rounded-r"' : '') + '></div>'
        + '<div style="width:' + softcoreBarWidth + '%"' + (hcPct === 0 ? ' class="rounded-l"' : '') + (totalPct === 100 ? ' class="rounded-r"' : '') + '></div>'
        + '</div>'
        + '<p class="text-2xs flex justify-between w-full">' + totalPct + '%</p>'
        + '</div>';
    } else {
      progressBarHtml = '<div class="cprogress-pbar__root">'
        + '<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>'
        + '<p class="text-2xs flex justify-between w-full">No achievements yet</p>'
        + '</div>';
    }

    // Award indicator HTML (reusing site's CSS classes)
    var awardIndicatorHtml = '<div class="cprogress-ind__root" data-award="' + awardKind + '" title="' + awardTitle + '">'
      + '<div><div></div><div></div></div>'
      + '</div>';

    // Console badge as <a> with icon image (matching original site structure)
    var consoleBadgeHtml = '<a href="https://retroachievements.org/user/' + encodeURIComponent(targetUser) + '/progress?filter%5Bsystem%5D=' + game.ConsoleID + '"'
      + ' class="hidden sm:flex gap-x-1 items-center rounded bg-zinc-950 light:bg-zinc-300 py-0.5 px-2">'
      + '<img src="' + consoleInfo.iconUrl + '" width="18" height="18" alt="' + escapeHtml(game.ConsoleName) + ' console icon">'
      + '<p>' + escapeHtml(consoleInfo.shortName || game.ConsoleName) + '</p>'
      + '</a>';

    // Build the card matching the site's original structure
    var item = document.createElement("div");
    item.className = 'relative flex flex-col w-full px-2 py-2 transition-all rounded-sm'
      + (awardKind ? ' bg-zinc-950/60 light:bg-stone-200' : ' bg-embed');

    item.innerHTML =
      '<div class="flex flex-col sm:flex-row w-full sm:justify-between sm:items-center gap-x-2">'
        + '<div class="flex sm:items-center gap-x-2.5">'
          // Game image
          + '<a href="/game/' + game.GameID + '">'
          + '<img src="' + imgSrc + '" width="58" height="58" class="rounded-sm w-[58px] h-[58px]" loading="lazy" decoding="async" />'
          + '</a>'
          // Primary meta
          + '<div class="cprogress-pmeta__root">'
            + '<a href="/game/' + game.GameID + '">' + escapeHtml(game.Title) + '</a>'
            + (achHtml ? '<div class="flex flex-col"><p>' + achHtml + '</p>' + (pointsHtml ? '<p>' + pointsHtml + '</p>' : '') + '</div>' : '')
            + (lastPlayedLabel ? '<div class="flex !flex-col-reverse"><p><span>Last played</span> ' + lastPlayedLabel + '</p>' + (awardKind && awardTitles[awardKind] ? '<p><span class="hidden md:inline lg:hidden">&bull;</span> ' + awardTitles[awardKind] + (awardInfo && awardInfo.awardedAt ? ' <span style="color:#a3a3a3;font-size:0.75rem;">' + escapeHtml(new Date(awardInfo.awardedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })) + '</span>' : '') + '</p>' : '') + '</div>' : '')
          + '</div>'
        + '</div>'
        // Right side: console badge + progress bar + award + toggle
        + '<div class="mt-1 sm:mt-0">'
          + '<div class="flex gap-x-2 items-center sm:gap-x-4 sm:divide-x divide-neutral-700 ml-[68px] sm:ml-0">'
            + consoleBadgeHtml
            + progressBarHtml
            + awardIndicatorHtml
            + '<div class="absolute sm:static top-0 right-0 sm:pl-4">'
              + '<button class="btn transition-transform lg:active:scale-95 duration-75 re-toggle-btn"'
              + (numTotal <= 0 ? ' disabled' : '') + '>'
              + '<div class="transition-transform duration-300 re-chevron-icon">'
              + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/></svg>'
              + '</div></button></div>'
          + '</div>'
        + '</div>'
      + '</div>'
      // Expandable achievements section
      + '<div class="re-expand-section" style="max-height:0;opacity:0;overflow:hidden;transition:all 300ms ease-in-out;">'
        + '<hr class="mt-2 border-embed-highlight">'
        + '<div class="py-4 place-content-center grid grid-cols-[repeat(auto-fill,minmax(52px,52px))] px-0.5 sm:px-4 re-badges-grid"></div>'
      + '</div>';

    // Toggle button click handler
    var toggleBtn = item.querySelector('.re-toggle-btn');
    var expandSection = item.querySelector('.re-expand-section');
    var chevronIcon = item.querySelector('.re-chevron-icon');
    var badgesGrid = item.querySelector('.re-badges-grid');
    var isExpanded = false;
    var hasFetched = false;

    if (toggleBtn && numTotal > 0) {
      toggleBtn.addEventListener('click', function () {
        isExpanded = !isExpanded;
        if (isExpanded) {
          expandSection.style.maxHeight = '2000px';
          expandSection.style.opacity = '1';
          chevronIcon.style.transform = 'rotate(180deg)';
          if (!hasFetched) {
            hasFetched = true;
            fetchAndRenderAchievements(game.GameID, badgesGrid, game.Title, ctx);
          }
        } else {
          expandSection.style.maxHeight = '0';
          expandSection.style.opacity = '0';
          chevronIcon.style.transform = 'rotate(0deg)';
        }
      });
    }

    gamesList.appendChild(item);
  });
}

export function renderPaginator(container, offset, hasMore, ctx) {
  const { itemsPerPage: ITEMS_PER_PAGE, loadPage: doLoadPage } = ctx;
  var currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
  ctx.hasMore = hasMore;

  // Update highest known page
  if (currentPage > ctx.highestKnownPage) ctx.highestKnownPage = currentPage;
  if (hasMore && currentPage >= ctx.highestKnownPage) ctx.highestKnownPage = currentPage + 1;

  container.innerHTML = '';
  container.className = 'enhanced-pagination';

  function addBtn(label, page, disabled, isActive) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = !!disabled;
    if (isActive) btn.className = 'active';
    if (!disabled) {
      btn.addEventListener('click', function () {
        doLoadPage((page - 1) * ITEMS_PER_PAGE);
      });
    }
    container.appendChild(btn);
  }

  // First button
  addBtn('First', 1, currentPage === 1, false);

  // Previous button (<) — goes back one page, disabled on page 1
  addBtn('\u276E', currentPage - 1, currentPage === 1, false);

  // Calculate visible page range (show up to 5 numbered buttons)
  var lastPage = ctx.highestKnownPage;
  var startP = Math.max(1, currentPage - 2);
  var endP = Math.min(lastPage, startP + 4);
  if (endP - startP < 4) startP = Math.max(1, endP - 4);

  // Ellipsis before
  if (startP > 1) {
    var dots = document.createElement('span');
    dots.className = 'page-info';
    dots.textContent = '...';
    container.appendChild(dots);
  }

  // Numbered page buttons
  for (var p = startP; p <= endP; p++) {
    addBtn(String(p), p, false, p === currentPage);
  }

  // Ellipsis after (if we know there are more pages beyond what we show)
  if (endP < lastPage || hasMore) {
    var dotsAfter = document.createElement('span');
    dotsAfter.className = 'page-info';
    dotsAfter.textContent = '...';
    container.appendChild(dotsAfter);
  }

  // Next button (>) — goes forward one page
  var nextTarget = currentPage + 1;
  var nextDisabled = !hasMore && currentPage >= lastPage;
  addBtn('\u276F', nextTarget, nextDisabled, false);

  // Page range info (e.g. "6–10")
  var rangeStart = offset + 1;
  var rangeEnd = offset + ITEMS_PER_PAGE;
  var rangeSpan = document.createElement('span');
  rangeSpan.className = 'page-info';
  rangeSpan.style.cssText = 'margin-left:8px;font-size:0.75rem;color:#a3a3a3;';
  rangeSpan.textContent = '(' + rangeStart + '–' + rangeEnd + ')';
  container.appendChild(rangeSpan);
}
