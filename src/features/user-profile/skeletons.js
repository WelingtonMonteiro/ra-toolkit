/**
 * Loading placeholders for the game list and badge grids.
 */

export function renderSkeletonCards(container, count) {
  container.innerHTML = '';
  for (var i = 0; i < count; i++) {
    var card = document.createElement('div');
    card.className = 'enhanced-skeleton-card';
    card.style.animationDelay = (i * 0.1) + 's';
    card.innerHTML =
      '<div class="enhanced-skeleton-img"></div>'
      + '<div class="enhanced-skeleton-content">'
        + '<div class="enhanced-skeleton-line w-60"></div>'
        + '<div class="enhanced-skeleton-line w-40"></div>'
        + '<div class="enhanced-skeleton-line w-30"></div>'
        + '<div class="enhanced-skeleton-bar"></div>'
      + '</div>';
    container.appendChild(card);
  }
}

export function renderSkeletonBadges(container, count) {
  container.innerHTML = '';
  for (var i = 0; i < Math.min(count, 20); i++) {
    var span = document.createElement('span');
    span.className = 'inline';
    span.innerHTML = '<div style="width:48px;height:48px;border-radius:6px;background:rgba(255,255,255,0.08);animation:enhanced-skeleton-pulse 1.5s ease-in-out infinite;animation-delay:' + (i * 0.05) + 's;"></div>';
    container.appendChild(span);
  }
}
