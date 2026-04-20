# 🎯 Extras

## Custom Background on Game Pages

When enabled, the game's in-game screenshot is used as a **blurred background** behind the page content.

- Combined with the **glass effect**, it gives game pages a unique visual style
- Toggle both options in [Settings](Settings-Panel):
  - **Enable custom game page background** (default: On)
  - **Enable glass background effect** (default: On)

## Accent Color

Customize the highlight color used across all RA Toolkit features:

1. Go to **[Settings](Settings-Panel) → RA Toolkit**
2. Click the **color picker** next to "Accent color"
3. Choose any color — it's applied to buttons, badges, links, and highlights
4. Click **"Reset"** to go back to the default blue (`#3b82f6`)
5. Click **"Atualizar"** to save

## Light Mode Support

The script automatically detects the RA site theme and adapts all injected UI elements:

| RA Theme Setting | Result |
|-----------------|--------|
| **Dark** | Dark-themed UI (default) |
| **Light** | Light-themed UI with appropriate contrast |
| **System** | Follows your OS preference |

No configuration needed — it's automatic.

## Mobile Support

On screens **narrower than 1024px**:
- Sidebar features (ROMs, World Records) are injected into the **main content area** instead
- All layouts adapt to smaller screens

## Changelog Popup

After each script update, a popup shows what's new:
- Lists all changes since your last seen version
- Click **"Got it!"** to dismiss
- Only appears once per version

## Guide Link

If a game has an official RA guide, a **📖 Guide** button appears in the sidebar linking to it. This is detected automatically from the game's page data.

## SPA Navigation Support

The script is aware of RetroAchievements' single-page application navigation (Inertia.js). When you navigate between pages:
- Features are automatically re-initialized
- No page refresh needed
- Listens for `inertia:navigate` events

## Structured Logging

For troubleshooting, enable **"Enable debug logging"** in [Settings](Settings-Panel):
- Logs appear in the Tampermonkey console (Tampermonkey icon → Dashboard → select script → Console)
- 4 log levels: debug, info, warn, error
- Disabled by default to avoid console noise
