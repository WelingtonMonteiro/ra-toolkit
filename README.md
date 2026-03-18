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
  <img src="https://img.shields.io/badge/version-2.8.2-blue" alt="Version">
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

👉 **[Click here to install RA Toolkit](https://github.com/WelingtonMonteiro/ra-toolkit/raw/main/RA_Toolkit.user.js)**

Tampermonkey will detect the `.user.js` file automatically and show an install screen. Click **Install**.

**Option B — Manual install:**

1. Copy the script URL:
   ```
   https://github.com/WelingtonMonteiro/ra-toolkit/raw/main/RA_Toolkit.user.js
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

### 🌐 Achievement Translation
- Per-card **Translate** button using MyMemory API (free tier)
- Language selector in settings panel
- Daily rate limiter (5000 chars/day) with persistent counter
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
| **Activity Timeline** | 365-day contribution heatmap (GitHub-style, 52 weeks × 7 days) |

### 📄 Profile Pagination
- Paginated "Last Games Played" with numbered buttons
- Items per page selector (5/10/15/20/30/50)
- Cards rendered with native RA CSS classes
- Achievement toggle per game card (expand badges)
- Skeleton loaders during page transitions

### 🎬 Extras
- Speedrun.com video embed on game pages
- SPA-aware (Inertia.js navigation support)
- Glass-effect settings panel with styled toggles
- Structured logging (debug/info/warn/error)

### 🆕 v2.6.0
- **ROM search cache** — results cached for 24h (`GM_setValue` + TTL), no re-searching the same game
- **Changelog popup** — shows what's new after each update
- **Custom accent color** — color picker in settings to customize toggles, buttons, and UI highlights
- **Light mode support** — auto-detects `data-scheme` (dark/light/black/system) and adapts colors
- **Mobile layout support** — sidebar injections work on viewports <1024px
- **Guide link detection** — shows 📖 RA Achievement Guide button when a guide exists for the game

### 🆕 v2.8.0
- **1-year Activity Timeline** — GitHub-style contribution heatmap (52 weeks × 7 days) with month labels and day-of-week indicators
- **Streak Tracker upgraded** — now uses 365-day data for accurate streak and active-day counts
- **Quarterly API fetching** — uses `API_GetAchievementsEarnedBetween` in 4 chunks to bypass the 500-record limit

### 🆕 v2.7.0
- **Achievement rarity indicator** — color-coded badges on each achievement by unlock %:
  - ⚪ Common (≥50%), 🟢 Uncommon (25–49%), 🔵 Rare (10–24%), 🟣 Very Rare (5–9%), 🟡 Ultra Rare (2–4%), 🔴 Legendary (<2%)
  - Color-bordered achievement badges on profile pages
  - Toggleable in settings
- **Collapse/expand sidebar sections** — click ROMs or World Records headers to collapse/expand; state remembered across visits

---

## ⚙️ Configuration

Click the **⚙️ RA Toolkit** button (bottom-right corner) to open the settings panel. You can toggle:

- ROM search sources (Archive.org, Myrient, Emuparadise, RomsFun)
- Hash verification (RA Trophy badges)
- Translation language
- Custom accent color (color picker + reset)
- Debug logging

---

## 🛠️ Tech Stack

- **Tampermonkey** userscript (vanilla JS, no frameworks)
- **RA Web API** (`API_GetUserSummary`, `API_GetUserRecentlyPlayedGames`, `API_GetUserRecentAchievements`, `API_GetAchievementsEarnedBetween`, `API_GetGameInfoAndUserProgress`, `API_GetGameHashes`)
- **MyMemory API** for translations
- **DOM scraping** for console breakdown (Progression Status section)
- **GM_xmlhttpRequest** for cross-origin requests
- **GM_setValue/GM_getValue** for persistent settings and rate limiting

---

## 📋 Roadmap

### High Priority
- [x] ~~Cache search results (`GM_setValue` with TTL)~~ ✅ v2.6.0
- [x] ~~Light mode support (detect `data-scheme`)~~ ✅ v2.6.0
- [x] ~~Mobile layout support (`GameShowMobileRoot`)~~ ✅ v2.6.0

### Medium Priority
- [ ] "Translate All" bulk button
- [ ] Achievement filter (Unlocked / Locked / All)
- [x] ~~Guide links detection (RA Guides)~~ ✅ v2.6.0
- [x] ~~Missing consoles (Amstrad CPC, Apple II, Uzebox, WASM4)~~ ✅ v2.7.1

### Low Priority
- [x] ~~Custom accent color theme~~ ✅ v2.6.0
- [x] ~~Achievement rarity indicator (color by unlock %)~~ ✅ v2.7.0
- [x] ~~Collapse/expand sidebar sections~~ ✅ v2.7.0
- [x] ~~Changelog popup after update~~ ✅ v2.6.0

---

## 🙏 Credits & Origin

This project is a **fork** of [**Retro Enhanced**](https://openuserjs.org/scripts/Miagui/Retro_Enhanced) (v1.4.5) by [**Miagui**](https://github.com/miagui), which provided the original ROM search functionality for RetroAchievements.org.

**RA Toolkit** builds on that foundation with extensive new features:
- 📊 Player Insights Dashboard (6 analytical modules)
- 🌐 Achievement translation system (MyMemory API)
- 📄 Profile pagination with skeleton loaders
- 🏆 RA Trophy badge for hash-verified ROMs
- 🔍 Additional ROM sources (RomsFun)
- ⚙️ Redesigned settings panel
- 🔄 SPA navigation support (Inertia.js)
- 📈 Rate limiting, structured logging, and more

Thank you **Miagui** for the original script that made this possible! 🎮

- Built for the [RetroAchievements](https://retroachievements.org) community

---

## 📄 License

[MIT](LICENSE)
