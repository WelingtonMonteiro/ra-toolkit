/**
 * Finding where to inject the RA Toolkit card on the tabbed settings page.
 */

// =========================================
//     Settings Page Injection Helpers
// =========================================
// RAWeb renders /settings through AppLayout with `withSidebar={false}`, so
// `main` no longer carries the `with-sidebar` class, and the section cards
// now live inside Radix tab panels (Profile / Notifications / Account /
// Applications) instead of a flat flex column.
export function findSettingsPanelHost(root) {
  if (!root) return null;

  // The host wraps every tab panel, so it survives tab switches.
  var activePanel = root.querySelector('[role="tabpanel"][data-state="active"]');
  if (activePanel && activePanel.parentElement) return activePanel.parentElement;

  var anyPanel = root.querySelector('[role="tabpanel"]');
  if (anyPanel && anyPanel.parentElement) return anyPanel.parentElement;

  // Pre-tabs layout: a flat column of section cards.
  var legacy = root.querySelector("div.flex.flex-col > div.flex.flex-col");
  return legacy || root;
}
