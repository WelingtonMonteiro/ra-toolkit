/**
 * Reading page data out of the Inertia root RAWeb renders.
 */

import { log } from './log.js';

// =========================================
//       Inertia Props Helper
// =========================================
// The new RAWeb uses Inertia.js + React. Page data is stored
// as a JSON blob in the #app element's data-page attribute.

export function getInertiaProps() {
  const appEl = document.getElementById("app");
  if (!appEl) return null;
  try {
    const pageData = JSON.parse(appEl.getAttribute("data-page") || "{}");
    return pageData.props || null;
  } catch (e) {
    log.error("Failed to parse Inertia props: " + e);
    return null;
  }
}

// =========================================
//       Get Logged User
// =========================================
export function getLoggedUser() {
  const props = getInertiaProps();
  if (props && props.auth && props.auth.user) {
    return props.auth.user.displayName || props.auth.user.display_name || "";
  }
  // Fallback: try dropdown-header text
  const header = document.querySelector(".dropdown-header");
  if (header) return header.textContent.trim();
  return "";
}
