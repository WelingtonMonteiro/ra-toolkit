/**
 * Collapsible sidebar sections, with the open/closed state remembered.
 */

// =========================================
//    Collapse/Expand Sidebar Sections
// =========================================
export function injectCollapseStyle() {
  if (document.getElementById("enhanced-collapse-style")) return;
  var style = document.createElement("style");
  style.id = "enhanced-collapse-style";
  style.textContent = `
    .enhanced-collapse-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      padding: 2px 0;
      transition: opacity 0.15s;
    }
    .enhanced-collapse-header:hover {
      opacity: 0.8;
    }
    .enhanced-collapse-arrow {
      font-size: 0.75em;
      transition: transform 0.2s ease;
      color: #a3a3a3;
      margin-left: 6px;
    }
    .enhanced-collapse-arrow.collapsed {
      transform: rotate(-90deg);
    }
    .enhanced-collapse-content {
      overflow: hidden;
      transition: max-height 0.25s ease, opacity 0.2s ease;
      max-height: 2000px;
      opacity: 1;
    }
    .enhanced-collapse-content.collapsed {
      max-height: 0;
      opacity: 0;
    }
  `;
  document.head.appendChild(style);
}

export function makeCollapsible(containerEl, sectionKey) {
  if (!containerEl) return;
  // Find the h3 header inside this container
  var h3 = containerEl.querySelector("h3");
  if (!h3 || h3.classList.contains("enhanced-collapse-header")) return;

  injectCollapseStyle();

  // Read persisted collapse state
  var storeKey = "sidebarCollapsed_" + sectionKey;
  var isCollapsed = false;

  // Wrap all siblings after h3 into a content div
  var contentDiv = document.createElement("div");
  contentDiv.className = "enhanced-collapse-content";

  // Collect all siblings after h3
  var siblings = [];
  var next = h3.nextSibling;
  while (next) {
    siblings.push(next);
    next = next.nextSibling;
  }
  siblings.forEach(function (node) {
    contentDiv.appendChild(node);
  });
  containerEl.appendChild(contentDiv);

  // Make h3 a clickable header
  h3.classList.add("enhanced-collapse-header");
  var arrow = document.createElement("span");
  arrow.className = "enhanced-collapse-arrow";
  arrow.textContent = "▼";
  h3.appendChild(arrow);

  function setCollapseState(collapsed) {
    isCollapsed = collapsed;
    if (collapsed) {
      contentDiv.classList.add("collapsed");
      arrow.classList.add("collapsed");
    } else {
      contentDiv.classList.remove("collapsed");
      arrow.classList.remove("collapsed");
    }
    GM_setValue(storeKey, collapsed);
  }

  h3.addEventListener("click", function () {
    setCollapseState(!isCollapsed);
  });

  // Apply persisted state
  Promise.resolve(GM_getValue(storeKey, false)).then(function (saved) {
    if (saved) setCollapseState(true);
  });
}
