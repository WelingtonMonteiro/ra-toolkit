/**
 * The blurred in-game screenshot behind the page, and the glass panels.
 */

// =========================================
//           Custom Background
// =========================================
export function applyGamePageBackground(gameImg, enableCustomBG) {
  if (!gameImg || gameImg.includes('/Images/000002.png') || !enableCustomBG) return;

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    body:before {
      content: "";
      position: fixed;
      width: 110%;
      height: 110%;
      background-image: url(${gameImg});
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: -1;
      overflow: hidden;
      filter: blur(8px);
      -moz-filter: blur(8px);
      -webkit-filter: blur(8px);
      -o-filter: blur(8px);
    }
  `;
  document.head.appendChild(styleEl);
}

/** Semi-transparent panels so the blurred screenshot shows through. */
export function applyGlassEffect(enableGlassEffect) {
  if (!enableGlassEffect) return;

  const glassStyle = document.createElement("style");
  glassStyle.textContent = `
    :root { --box-bg-color: rgba(35, 35, 35, 0.95); }
    main.with-sidebar > article { background: var(--box-bg-color); border-radius: 0.5rem; }
    main.with-sidebar > aside { background: var(--box-bg-color); border-radius: 0.5rem; }
  `;
  document.head.appendChild(glassStyle);
}
