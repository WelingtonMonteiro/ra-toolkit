/**
 * Light/dark/black scheme detection from RAWeb's data-scheme attribute.
 */

// =========================================
//    Theme Detection (light/dark/black)
// =========================================
export function getScheme() {
  var html = document.documentElement;
  var scheme = html.getAttribute('data-scheme') || '';
  if (scheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return scheme || 'dark';
}

export function isLightMode() {
  return getScheme() === 'light';
}
