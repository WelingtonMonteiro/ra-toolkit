<p align="center">
  <img src="https://retroachievements.org/assets/images/ra-logo.webp" alt="RetroAchievements" width="96">
</p>

<h1 align="center">🎮 RA Toolkit</h1>

<p align="center">
  <strong>Toolkit for <a href="https://retroachievements.org">RetroAchievements.org</a></strong><br>
  ROMs, translations, player dashboard, pagination and more.<br><br>
  <em>Fork of <a href="https://openuserjs.org/scripts/Miagui/Retro_Enhanced">Retro Enhanced</a> by <a href="https://github.com/miagui">Miagui</a> — with major new features and improvements.</em>
</p>

<p align="center">
  <a href="https://github.com/WelingtonMonteiro/ra-toolkit/raw/main/RA_Toolkit.user.js">
    <img src="https://img.shields.io/badge/Install-Tampermonkey-green?logo=tampermonkey" alt="Install">
  </a>
  <img src="https://img.shields.io/badge/version-2.6.3-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License">
</p>

---

## 📥 Installation

### Step 1 — Install Tampermonkey

Tampermonkey is a browser extension that lets you run userscripts on any website.

| Browser | Link |
|---------|------|
| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | [Mac App Store](https://apps.apple.com/app/tampermonkey/id1482490089) |
| Opera | [Opera Add-ons](https://addons.opera.com/extensions/details/tampermonkey-beta/) |

1. Click the link for your browser above
2. Click **Add to browser** / **Install**
3. Confirm the installation when prompted
4. You should see the Tampermonkey icon (🔲) in your browser toolbar

### Step 2 — Install RA Toolkit

**Option A — One click (recommended):**

👉 **[Click here to install RA Toolkit](https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js)**

Tampermonkey will detect the `.user.js` file automatically and show an install screen. Click **Install**.

**Option B — Manual install:**

1. Copy the script URL:
   ```
   https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js
   ```
2. Click the Tampermonkey icon in your toolbar → **Create a new script**
3. Delete the default template content
4. Open the URL above in a new tab, select all (`Ctrl+A`), copy (`Ctrl+C`)
5. Paste into the Tampermonkey editor (`Ctrl+V`) → **File → Save** (`Ctrl+S`)

### Step 3 — Enjoy!

1. Visit [retroachievements.org](https://retroachievements.org)
2. Navigate to any game page to see ROM search, translations, and more
3. Visit your profile (`/user/{username}`) to see the Player Insights Dashboard
4. Click the **⚙️ RA Toolkit** button (bottom-right corner) to configure settings

> **Auto-update:** The script updates automatically via Tampermonkey when a new version is pushed to this repository. You can also check for updates manually: Tampermonkey icon → **Utilities** → **Check for userscript updates**.

---

## ✨ Features

### 🔍 ROM Search
- Multi-source ROM search: **Archive.org**, **Myrient**, **Emuparadise**, **RomsFun**
- 🏆 **RA Trophy Badge** on ROMs verified against RA hash database
- 50+ consoles mapped with icons and short names
- Smart title matching (normalized + region-aware)
- Configurable per-source toggles in settings

### 🌐 Achievement & Wall Translation
- Per-card **Translate** button using MyMemory API (free tier)
- Wall comment translation on user profile pages
- Language selector in settings panel
- Daily rate limiter (5000 chars/day) with persistent counter
- Auto-disable for texts exceeding 500-char API query limit
- Toggle between original and translated text

### 📊 Player Insights Dashboard
Injected on user profile pages (`/user/{username}`) with 6 modules:

| Module | Description |
|--------|-------------|
| **Stats Cards** | Games Played, Mastered, Mastery Rate, Points & Rank |
| **Almost There** | Top 5 games closest to 100% (≥50% progress) |
| **Console Breakdown** | Top 10 consoles with horizontal bars and icons |
| **Streak Tracker** | Current streak, best streak, active days (365d) |
| **Rarest Achievements** | Top 5 by TrueRatio with badge and multiplier |
| **Activity Timeline** | 365-day contribution heatmap (GitHub-style, 52 weeks × 7 days) with toggle modes |

### 📅 Activity Timeline
- GitHub-style contribution heatmap (52 weeks × 7 days) with month labels and day-of-week indicators
- **3 toggle modes (multi-select):** 🏆 Achievements (blue), 👑 Mastered (gold), ✅ Beaten (gray) — select any combination; combined view uses emerald green
- Total achievements count shown in section title
- Year shown in cell tooltips (e.g. "Mar 19, 2026: 5 achievements")
- Streak Tracker uses 365-day data for accurate streak and active-day counts
- Quarterly API fetching to bypass the 500-record limit

### 🏅 Achievement Rarity Indicator
- Color-coded badges on each achievement by unlock %:
  - ⚪ Common (≥50%), 🟢 Uncommon (25–49%), 🔵 Rare (10–24%), 🟣 Very Rare (5–9%), 🟡 Ultra Rare (2–4%), 🔴 Legendary (<2%)
- Color-bordered achievement badges on profile pages
- Works on game pages with all languages (i18n-safe)
- Toggleable in settings

### 💬 User Wall Enhancements
- **Linkify** — plain text URLs in comments become clickable links (opens in new tab)
- **YouTube embed** — YouTube links in wall comments show an inline mini video player
- **Image preview** — image links (png, jpg, gif, webp, etc.) show inline preview, click to open

### 📄 Profile Pagination
- Paginated "Last Games Played" with numbered buttons
- Items per page selector (5/10/15/20/30/50)
- Cards rendered with native RA CSS classes
- Achievement toggle per game card (expand badges with rarity borders)
- Skeleton loaders during page transitions

### 🎬 Extras
- Speedrun.com video embed on game pages
- Collapse/expand sidebar sections (ROMs, World Records) — state remembered
- SPA-aware (Inertia.js navigation support)
- Glass-effect settings panel with styled toggles
- Structured logging (debug/info/warn/error)

---

## 📋 Changelog

### v2.6.3
- User Stats: recent activity and softcore sections now use metric cards with icons (consistent with primary stats)
- User Stats: CSS refactored to generic class names for cleaner structure
- Activity Timeline: all 3 modes (Achievements, Mastered, Beaten) now active by default

### v2.6.2
- Activity Timeline: multi-select now uses priority coloring per cell (Mastered gold > Beaten gray > Achievements blue) instead of single emerald color
- Each day's square shows the color of the highest-priority event type present

### v2.6.1
- User Stats: redesigned with clean 3-section layout (primary grid, recent activity, softcore)
- User Stats: new metric cards with icons, weighted/softcore sub-values
- Removed Console Breakdown section (redundant with native Progression Status)

### v2.6.0
- Enhanced User Stats: replaces native RA User Stats section with beautiful card-style layout
- Primary stats with icons and colors: Points, Rank, Achievements, RetroRatio, Games Beaten, Beaten %
- Expandable secondary stats: 7/30 day points, avg points/week, avg completion, softcore stats

### v2.5.5
- Activity Timeline: rich custom tooltip with date header and per-mode icon breakdown (🏆 👑 ✅)

### v2.5.4
- Activity Timeline: multi-select toggle buttons — select multiple modes (Achievements + Mastered + Beaten) to see combined heatmap
- Activity Timeline: combined mode uses emerald green color scheme with per-mode breakdown in tooltips and footer

### v2.5.3
- Updated install/update URLs for Greasy Fork publication

### v2.5.2
- Activity Timeline: tooltip now shows year (e.g. "Mar 19, 2026: 5 achievements")

### v2.5.1
- Translate: disable button for texts exceeding 500-char API query limit
- Translate: show "Too long" label with character count tooltip on hover

### v2.5.0
- Activity Timeline: total achievements count shown in title
- Activity Timeline: toggle buttons to switch between Achievements (blue), Mastered (gold), and Beaten (gray) heatmaps
- New API integration: GetUserAwards for mastered/beaten game dates

### v2.4.4
- Fix: rarity indicators on game page now work with all languages (i18n-safe percentage parsing)

### v2.4.3
- Fix: enableRarityIndicator variable scope — rarity indicators now work correctly in achievement badges pagination

### v2.4.2
- Image preview in wall comments — image links (png, jpg, gif, webp, etc.) show inline preview, click to open

### v2.4.1
- Activity Timeline moved above Player Insights stats for better visibility

### v2.4.0
- User Wall linkify — plain text URLs in comments become clickable links (opens in new tab)
- YouTube embed — YouTube links in wall comments show an inline mini video player

### v2.3.3
- Emuparadise fix — links to download page instead of direct file (avoids referer block)

### v2.3.2
- Emuparadise download fix — correct game ID extraction and direct download link with workaround

### v2.3.1
- Timeline layout fix — uniform cell sizes and month labels overflow like GitHub's contribution graph

### v2.3.0
- 1-year Activity Timeline — GitHub-style contribution heatmap (52 weeks × 7 days)
- Streak Tracker now uses 365-day data for more accurate streak and active-day counts
- Yearly data fetched via quarterly API chunks to bypass 500-record limit

### v2.2.1
- Missing consoles — added ROM search support for Amstrad CPC, Apple II, Uzebox, and WASM-4

### v2.2.0
- Achievement rarity indicator — color-coded badges (Common to Legendary) on game page and profile
- Collapse/expand sidebar sections — click headers to collapse/expand, state persisted

### v2.1.1
- Save button in settings panel — "Atualizar" button to confirm and reload

### v2.1.0
- ROM search cache (24h TTL)
- Changelog popup after updates
- Custom accent color (color picker in settings)
- Light mode support (adapts to RA site theme)
- Mobile layout support (sidebar injections on mobile)
- Guide link detection (RA Guide button on game pages)

### v2.0.0
- Player Insights Dashboard (6 modules)
- RomsFun ROM source
- RA Trophy badge for hash-verified ROMs
- Pagination skeleton loaders
- Previous/Next pagination buttons
- MyMemory API rate limiter

---

## ⚙️ Configuration

Click the **⚙️ RA Toolkit** button (bottom-right corner) to open the settings panel. You can toggle:

- ROM search sources (Archive.org, Myrient, Emuparadise, RomsFun)
- Hash verification (RA Trophy badges)
- Translation language
- Achievement rarity indicator
- Custom accent color (color picker + reset)
- Debug logging

---

## 🛠️ Tech Stack

- **Tampermonkey** userscript (vanilla JS, no frameworks)
- **RA Web API** (`API_GetUserSummary`, `API_GetUserRecentlyPlayedGames`, `API_GetUserRecentAchievements`, `API_GetAchievementsEarnedBetween`, `API_GetGameInfoAndUserProgress`, `API_GetGameHashes`, `API_GetUserAwards`)
- **MyMemory API** for translations
- **DOM scraping** for console breakdown (Progression Status section)
- **GM_xmlhttpRequest** for cross-origin requests
- **GM_setValue/GM_getValue** for persistent settings and rate limiting

---

## 🙏 Credits & Origin

This project is a **fork** of [**Retro Enhanced**](https://openuserjs.org/scripts/Miagui/Retro_Enhanced) (v1.4.5) by [**Miagui**](https://github.com/miagui), which provided the original ROM search functionality for RetroAchievements.org.

**RA Toolkit** builds on that foundation with extensive new features:
- 📊 Player Insights Dashboard (6 analytical modules)
- 📅 Activity Timeline with 3 toggle modes (Achievements/Mastered/Beaten)
- 🌐 Achievement & wall comment translation system
- 💬 User Wall enhancements (linkify, YouTube, image preview)
- 🏅 Achievement rarity indicator (6 tiers)
- 📄 Profile pagination with skeleton loaders
- 🏆 RA Trophy badge for hash-verified ROMs
- 🔍 Additional ROM sources (RomsFun)
- ⚙️ Redesigned settings panel with accent color
- 🔄 SPA navigation support (Inertia.js)

Thank you **Miagui** for the original script that made this possible! 🎮

- Built for the [RetroAchievements](https://retroachievements.org) community

---

## 📄 License

[MIT](LICENSE)
