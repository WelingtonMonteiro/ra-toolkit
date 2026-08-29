/**
 * The Achievements dropdown restored to the navbar.
 */

// =========================================
//   Achievements Nav Links (restored from removed header menu)
// =========================================
export function initAchievementNavLinks() {
  // Already injected?
  if (document.getElementById('re-achievements-dropdown')) return;

  // Find all nav-item dropdowns in the navbar
  var navItems = document.querySelectorAll('.dropdown.nav-item');
  if (!navItems.length) return;

  // Find the "Games" dropdown by checking trigger text
  var gamesDropdown = null;
  for (var i = 0; i < navItems.length; i++) {
    var trigger = navItems[i].querySelector('.nav-link');
    if (trigger && /\bgames?\b/i.test(trigger.textContent)) {
      gamesDropdown = navItems[i];
      break;
    }
  }
  if (!gamesDropdown) return;

  // Build the Achievements dropdown with same structure as native dropdowns
  var achDropdown = document.createElement('div');
  achDropdown.id = 're-achievements-dropdown';
  achDropdown.className = 'dropdown nav-item';

  var btn = document.createElement('button');
  btn.className = 'nav-link';
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Achievements';
  btn.innerHTML = '<span style="font-size:0.85em;">🏆</span> <span class="ml-1 hidden sm:inline-block">Achievements</span>';

  var menu = document.createElement('div');
  menu.className = 'dropdown-menu';

  var links = [
    { href: '/achievementList.php', text: 'All Achievements' },
    { href: '/achievementList.php?s=4&p=2', text: '🟢 Easy Achievements' },
    { href: '/achievementList.php?s=14&p=2', text: '🔴 Hardest Achievements' }
  ];

  links.forEach(function (item, idx) {
    if (idx === 1) {
      var div = document.createElement('div');
      div.className = 'dropdown-divider';
      menu.appendChild(div);
    }
    var a = document.createElement('a');
    a.className = 'dropdown-item';
    a.href = item.href;
    a.textContent = item.text;
    menu.appendChild(a);
  });

  achDropdown.appendChild(btn);
  achDropdown.appendChild(menu);

  // Insert after the Games dropdown
  gamesDropdown.parentNode.insertBefore(achDropdown, gamesDropdown.nextSibling);
}
