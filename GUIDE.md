<p align="center">
  <img src="https://retroachievements.org/assets/images/ra-logo.webp" alt="RetroAchievements" width="80">
</p>

<h1 align="center">📖 RA Toolkit — User Guide</h1>

<p align="center">
  Step-by-step guide for every feature in <strong>RA Toolkit v2.9.0</strong><br>
  <em>A Tampermonkey userscript for <a href="https://retroachievements.org">RetroAchievements.org</a></em>
</p>

---

## Table of Contents

1. [Getting Started](#-getting-started)
2. [Settings Panel](#%EF%B8%8F-settings-panel)
3. [ROM Search](#-rom-search)
4. [Achievement & Wall Translation](#-achievement--wall-translation)
5. [Player Insights Dashboard](#-player-insights-dashboard)
6. [Activity Timeline](#-activity-timeline)
7. [Enhanced User Stats](#-enhanced-user-stats)
8. [Progression Status Dashboard](#-progression-status-dashboard)
9. [Achievement Rarity Indicator](#-achievement-rarity-indicator)
10. [Profile Pagination (Last Games Played)](#-profile-pagination-last-games-played)
11. [Game Awards — Mastered & Beaten Tabs](#-game-awards--mastered--beaten-tabs)
12. [User Wall Enhancements](#-user-wall-enhancements)
13. [Speedrun.com Integration](#-speedruncom-integration)
14. [Games Page — Most Mastered Tab](#-games-page--most-mastered-tab)
15. [Achievements Dropdown Menu](#-achievements-dropdown-menu)
16. [Extras](#-extras)
17. [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🚀 Getting Started

### Step 1 — Install Tampermonkey

| Browser | Link |
|---------|------|
| Chrome  | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Edge    | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari  | [Mac App Store](https://apps.apple.com/app/tampermonkey/id1482490089) |
| Opera   | [Opera Add-ons](https://addons.opera.com/extensions/details/tampermonkey-beta/) |

### Step 2 — Install RA Toolkit

👉 **[Click here to install RA Toolkit](https://update.greasyfork.org/scripts/570282/RA%20Toolkit.user.js)**

Tampermonkey will show an install confirmation screen — click **Install**.

### Step 3 — Set up your API key

Many features require a **RetroAchievements Web API key**:

1. Log in to [retroachievements.org](https://retroachievements.org)
2. Go to **Settings → Keys** (or visit `retroachievements.org/settings`)
3. Copy your **Web API Key**
4. On the same Settings page, scroll to the bottom to find the **RA Toolkit** card
5. Paste the key in the **"RA API Key"** field
6. Click **"Atualizar"** (Save) — the page will reload

> **Which features need the API key?**
>
> | Feature | Needs API Key? |
> |---------|:-:|
> | ROM Search | No* |
> | ROM Hash Verification (🏆 badge) | ✅ Yes |
> | Player Insights Dashboard | ✅ Yes |
> | Activity Timeline | ✅ Yes |
> | Profile Pagination (page 2+) | ✅ Yes |
> | Game Awards (Beaten tab) | ✅ Yes |
> | Translation | No |
> | Speedrun.com stats | No |
> | Rarity Indicator | No |
> | Wall Enhancements | No |
> | Most Mastered tab | No |
> | Achievements dropdown | No |

---

## ⚙️ Settings Panel

### How to open

1. Go to [retroachievements.org/settings](https://retroachievements.org/settings)
2. Scroll to the bottom of the page — you'll see a **"RA Toolkit"** card below the native settings cards.
   Since v2.9.0 the settings page is split into tabs (*Profile*, *Notifications*, *Account*,
   *Applications*); the card stays below whichever tab is open.

### Available options

#### Toggles (on/off switches)

| Toggle | Default | What it does |
|--------|:-------:|-------------|
| **Enable ROMs search** | ✅ On | Shows ROM download links on game pages |
| **Verify ROM hashes with RA API** | ✅ On | Adds 🏆 badge to ROMs verified against RA hash database |
| **Add Emuparadise to ROMs search** | ❌ Off | Includes Emuparadise as a ROM source |
| **Prioritize Emuparadise** | ❌ Off | Searches Emuparadise first before other sources |
| **Add RomsFun to ROMs search** | ✅ On | Includes RomsFun as a ROM source |
| **Enable Speedrun.com stats** | ❌ Off | Shows World Records section on game pages |
| **Enable gameplay video** | ✅ On | Embeds speedrun video on game pages |
| **Enable custom game page background** | ✅ On | Adds blurred in-game screenshot as page background |
| **Enable glass background effect** | ✅ On | Semi-transparent glass effect on sidebar/article |
| **Achievement rarity indicator** | ✅ On | Color-coded rarity badges on achievements |

#### Other controls

| Control | Default | What it does |
|---------|---------|-------------|
| **Translation language** (dropdown) | `pt-BR` | Choose from: Portuguese, Spanish, French, German, Italian, Japanese, Korean, Chinese, Russian, Arabic |
| **RA API Key** (password field) | — | Your RetroAchievements Web API key |
| **Accent color** (color picker) | `#3b82f6` (blue) | Custom highlight color for buttons, badges, and accents |
| **Reset** (button) | — | Resets accent color to the default blue |

### Saving changes

Click the **"Atualizar"** button at the bottom of the card — you'll see a ✓ confirmation, then the page reloads automatically.

---

## 🔍 ROM Search

> **Where:** Sidebar of any game page (`/game/{id}`)

### How to use

1. Navigate to any game page (e.g., `retroachievements.org/game/1`)
2. In the sidebar (right side), look for the **"ROMs"** section below the box art
3. The script automatically searches for matching ROMs across multiple sources
4. Results appear as a list of downloadable links

### What you'll see

- **ROM links** — click to download. Each link shows the filename and source
- **🏆 RA badge** — gold trophy icon means the ROM's hash matches the official RA database (verified compatible)
  - Hover over the badge to see the MD5 hash and compatibility labels
- **Source icons** — shows whether the ROM came from Myrient, Archive.org, Emuparadise, or RomsFun
- **DLC section** — for PSP games, DLCs are listed separately
- **No results** — if nothing is found, manual search links to Archive.org, Myrient, and RomsFun are shown

### Search sources (in priority order)

1. **Local cache** — previously found results are cached for 24 hours
2. **Myrient** — primary source for most consoles
3. **Archive.org** — No-Intro 2016 collection (fallback)
4. **Emuparadise** — optional, enable in settings
5. **RomsFun** — optional, enabled by default

### Supported consoles

50+ systems including: NES, SNES, Game Boy, GBC, GBA, N64, DS, GameCube, Wii, PS1, PS2, PSP, Genesis/Mega Drive, Master System, Game Gear, Saturn, Dreamcast, Sega CD, 32X, Atari 2600/7800/Jaguar/Lynx, PC Engine, Neo Geo, WonderSwan, MSX, 3DO, Arcade, and many more.

### Collapse/Expand

Click the **"ROMs"** heading to collapse or expand the section. The state is remembered across visits.

---

## 🌐 Achievement & Wall Translation

> **Where:** Game pages (achievement cards) and profile wall comments

### Translating achievements on a game page

1. Go to any game page with achievements (e.g., `/game/1`)
2. Each achievement card has a **"🌐 Translate"** button next to the description
3. Click it — the button shows "⏳ ..." while loading
4. The title and description are translated into your chosen language
5. Click **"🌐 Original"** to switch back to the English text
6. Click again to toggle between translated and original

### Translating wall comments

1. Go to any user profile (`/user/{username}`) or their comments page
2. Each wall comment has a **"🌐 Translate"** button
3. Click to translate, click again to see the original

### Limits & notes

- **Free tier:** 5,000 characters per day (resets at midnight)
- **Too long:** Texts over 500 characters show "🌐 Too long" with a tooltip showing the character count — these cannot be translated due to API limits
- **Rate limit:** When you've used all 5,000 characters, buttons show "⛔ Limit"
- **Language:** Change the translation language in Settings → RA Toolkit → Translation Language

---

## 📊 Player Insights Dashboard

> **Where:** User profile pages (`/user/{username}`), above "Last Games Played"
>
> **Requires:** RA API Key

### What you'll see

The dashboard contains several modules that give you detailed analytics about any player's profile:

#### 1. Stats Cards (4 cards in a row)

| Card | Description |
|------|-------------|
| **Games Played** | Total number of games the player has started |
| **Mastered** | Number of games with 100% completion (gold highlight) |
| **Mastery Rate** | Percentage of played games that are mastered |
| **Points & Rank** | Total points earned and site ranking |

#### 2. Almost There 🎯

Shows up to **5 games closest to 100% completion** (must be ≥50% done):

- Game icon and title (clickable link)
- Number of remaining achievements
- Current completion percentage
- Visual progress bar

> **Tip:** Use this to find which games you're closest to mastering!

#### 3. Streak Tracker 🔥

Tracks your daily achievement-earning consistency over the past 365 days:

- **Current Streak** — how many consecutive days you've earned at least one achievement
- **Best Streak** — your longest consecutive streak ever (within the past year)
- **Active Days** — total number of days with at least one achievement
- **Total Achievements** — sum of all achievements earned in the past year

#### 4. Rarest Achievements 💎

Your **top 5 rarest achievements** (sorted by TrueRatio):

- Achievement badge image
- Title (clickable link to `/achievement/{id}`)
- Game name
- Points earned
- Rarity multiplier (e.g., "×3.5" = 3.5× more valuable than a common achievement)

### Loading state

While data is being fetched from the API, each section shows animated skeleton placeholders.

---

## 📅 Activity Timeline

> **Where:** Inside the Player Insights Dashboard (first section)
>
> **Requires:** RA API Key

### What it is

A **GitHub-style contribution heatmap** showing your activity over the past 365 days (52 weeks × 7 days).

### How to read it

- Each small square represents **one day**
- **Darker color = more activity** that day (5 intensity levels)
- Hover over any square to see the **exact date** and **counts**

### Toggle modes (multi-select)

Three toggle buttons above the heatmap:

| Button | Color | What it tracks |
|--------|-------|---------------|
| **🏆 Achievements** | Blue shades | Achievements earned per day |
| **👑 Mastered** | Gold shades | Games mastered per day |
| **✅ Beaten** | Gray shades | Games beaten per day |

- **All three are active by default**
- Click any button to toggle it on/off
- **At least one must remain active**
- When multiple modes are active, each day's square uses **priority coloring**: Mastered (gold) > Beaten (gray) > Achievements (blue)

### Tooltip

Hover over any day square to see:

```
Mar 19, 2026
🏆 5 achievements
👑 1 mastered
✅ 2 beaten
```

### Footer

Below the heatmap, you'll see:
- Total counts per active mode
- Number of active days
- Color legend

---

## 📈 Enhanced User Stats

> **Where:** Replaces the native "User Stats" section on profile pages

### What it shows

The native User Stats section is replaced with a modern card-style layout divided into 3 areas:

#### Primary Stats (6 metric cards)

| Card | Icon | Description |
|------|------|-------------|
| **Points** | 💎 | Total points earned (with weighted sub-value) |
| **Site Rank** | 🏅 | Current ranking (with "of X total" sub-value) |
| **Achievements** | 🏆 | Total achievements unlocked |
| **RetroRatio** | 📊 | Your retro ratio score |
| **Games Beaten** | 🎮 | Total games beaten (with retail sub-value) |
| **Beaten Rate** | 📈 | Percentage of started games that are beaten |

#### Recent Activity (4 cards, if data exists)

- Points earned (last 7 days)
- Points earned (last 30 days)
- Average points per week
- Average completion percentage

#### Casual Stats (3 cards, if applicable)

- Casual (formerly "softcore") points, rank, and achievements (dimmer styling)

---

## 🎨 Progression Status Dashboard

> **Where:** Replaces the native "Progression Status" section on profile pages

### What it shows

A full visual dashboard with charts and interactive visualizations:

#### 1. KPI Grid (4 summary cards)

| Card | Description |
|------|-------------|
| **Total Games** | Number of games with any progress |
| **Beaten** | Games beaten (purple accent) |
| **Mastered** | Games mastered (gold accent) |
| **% Completed** | Overall completion rate (green accent) |

#### 2. Overview Donut Chart (left column)

A Chart.js donut chart showing the split between:
- Unfinished games
- Beaten games
- Mastered games

Center shows the overall completion percentage. A legend is displayed below.

#### 3. Completion by Console (right column)

Horizontal stacked bars showing completion % for up to 12 consoles, sorted by completion rate.

#### 4. Interactive Visualization

Two view modes (toggle buttons):

- **Bubbles** — Animated bouncing circles sized by game count per console, colored by completion status. Hover to see details.
- **Treemap** — Proportional rectangles showing console distribution.

Three filter options:
- **All** — All consoles
- **With Progress** — Only consoles where you have progress
- **Mastered** — Only consoles with mastered games

#### 5. Mastered vs Beaten Bar Chart

A Chart.js grouped bar chart comparing mastered vs beaten counts for your top 8 consoles.

---

## 🏅 Achievement Rarity Indicator

> **Where:** Game pages (achievement list) and profile pages (achievement badges)

### On game pages

Each achievement card gets:
- A **colored left border** (3px) indicating rarity
- A **rarity label** after the title (e.g., "🔵 Rare")

### On profile pages

Achievement badge images get a **colored border** matching their rarity tier.

### Rarity tiers

| Unlock Rate | Label | Color | Emoji |
|-------------|-------|-------|:-----:|
| ≥ 50% | Common | Gray | ⚪ |
| 25% – 49% | Uncommon | Green | 🟢 |
| 10% – 24% | Rare | Blue | 🔵 |
| 5% – 9% | Very Rare | Purple | 🟣 |
| 2% – 4% | Ultra Rare | Amber | 🟡 |
| < 2% | Legendary | Red | 🔴 |

### Toggle

Enable or disable in **Settings → RA Toolkit → Achievement rarity indicator**.

---

## 📄 Profile Pagination (Last Games Played)

> **Where:** User profile pages (`/user/{username}`), "Last Games Played" section
>
> **Requires:** RA API Key (for pages beyond page 1)

### How to use

1. Go to any user profile
2. The "Last Games Played" section now has pagination controls

### Controls

- **Per-page selector** (dropdown next to the section heading): Choose 5, 10, 15, 20, 30, or 50 items per page
- **Pagination bar** (below the games list):
  - **First** / **‹ Prev** / **1 2 3 ...** / **Next ›** / **Last**
  - Shows page range info (e.g., "6–10 of 47")

### Game cards

Each card shows:
- Game icon (clickable link to the game page)
- Game title
- Achievement count (e.g., "5 of 20")
- Points earned
- Console badge with icon
- Last played date
- Progress bar (hardcore % + casual %)
- Award label (Mastered ✨, Completed, Beaten 🏆, or Beaten (casual)) with date

### Expanding achievements

Click the **chevron (▶)** on any game card to expand and see all individual achievement badges:
- Each badge has a colored border indicating its rarity tier
- Unlocked achievements are shown in full color
- Locked achievements are dimmed

### Loading state

While loading a new page, animated skeleton cards are shown as placeholders.

---

## 🏆 Game Awards — Mastered & Beaten Tabs

> **Where:** User profile sidebar, inside the "Game Awards" section (`#gameawards`)
>
> **Requires:** RA API Key (for Beaten tab)

### How to use

1. Go to any user profile
2. In the sidebar, find the **Game Awards** section
3. Two tabs appear above the badge grid:

| Tab | What it shows |
|-----|--------------|
| **👑 Mastered** (default) | The native mastered/completed badge grid (unchanged) |
| **🏆 Beaten** | All beaten games with trophy icon and count |

### Beaten tab details

- Hardcore beaten badges are shown in **gold**
- Casual beaten badges are slightly **dimmed**
- Hover over any badge to see the game info tooltip
- The heading counter updates to show beaten HC/SC counts

---

## 💬 User Wall Enhancements

> **Where:** User profile pages and comments pages (`/user/{name}`, `/user/{name}/comments`)

### 1. URL Linkify

Plain text URLs posted in wall comments are automatically converted into **clickable links** (highlighted in your accent color, opens in a new tab).

**Before:** `https://example.com/some-page`
**After:** [https://example.com/some-page](https://example.com/some-page) (clickable)

### 2. YouTube Embed

YouTube links in wall comments automatically show an **inline video player** below the comment.

- Supports: `youtube.com/watch`, `youtu.be`, and `/shorts/` URLs
- Player: 360px max width, 16:9 aspect ratio
- Uses `youtube-nocookie.com` for privacy

### 3. Image Preview

Image URLs in comments (`.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.svg`, `.avif`) show an **inline image preview** below the comment.

- Max preview size: 360×300px
- Click the preview to open the full image in a new tab

### Dynamic loading

New comments loaded dynamically (e.g., "Load more") are automatically enhanced thanks to a built-in `MutationObserver`.

---

## 🎬 Speedrun.com Integration

> **Where:** Game page sidebar
>
> **Requires:** "Enable Speedrun.com stats" toggle in settings

### How to enable

1. Go to **Settings → RA Toolkit**
2. Turn on **"Enable Speedrun.com stats"**
3. Optionally turn on **"Enable gameplay video on the game page"**
4. Click **"Atualizar"** to save

### World Records section

A **"World Records"** section appears in the sidebar showing:
- Category name (e.g., "Any%", "100%")
- Best time
- Runner's name (linked)

Click the heading to collapse/expand. State is remembered.

### Gameplay video

If enabled, the first speedrun's video (YouTube or Twitch) is embedded as an iframe on the game page, below the screenshots section.

---

## 👑 Games Page — Most Mastered Tab

> **Where:** `/games` page (the All Games listing)

### How to use

1. Go to [retroachievements.org/games](https://retroachievements.org/games)
2. A **tab bar** appears above the game table with two options:

| Tab | Description |
|-----|-------------|
| **📋 All Games** | The default native game table |
| **👑 Most Mastered** | Card grid ranked by most players |

3. Click **"👑 Most Mastered"** to switch views

### Most Mastered view

Games are displayed as cards in a grid, sorted by total player count (descending). Each card shows:

- **Rank number** (#1, #2, #3, ...)
- **Game icon** (48×48) and **title** (clickable link)
- **Badges:**
  - 👥 Total players
  - 🏆 Times beaten
  - ⭐ Number of achievements
  - System/console tag

### Pagination

- 25 games per page
- Navigation: **First** / **‹ Prev** / **numbered pages** / **Next ›** / **Last**

> **Note:** This feature uses the internal RAWeb API and doesn't require an API key — it works with your logged-in session.

---

## 🎮 Achievements Dropdown Menu

> **Where:** Site navigation bar (header)

### What it adds

A new **"Achievements"** dropdown menu is added to the header navigation, next to the "Games" dropdown:

| Menu Item | Link |
|-----------|------|
| **All Achievements** | `/achievementList.php` |
| **🟢 Easy Achievements** | `/achievementList.php?s=4&p=2` |
| **🔴 Hardest Achievements** | `/achievementList.php?s=14&p=2` |

This restores the Achievements navigation that was removed in a site update.

---

## 🎯 Extras

### Custom Background on Game Pages

- When enabled, the game's in-game screenshot is used as a blurred background behind the page content
- Combined with the glass effect, it gives game pages a unique visual style
- Toggle both options in Settings

### Accent Color

1. Go to **Settings → RA Toolkit**
2. Click the **color picker** next to "Accent color"
3. Choose any color — it's applied immediately to buttons, badges, links, and highlights across all features
4. Click **"Reset"** to go back to the default blue (`#3b82f6`)

### Light Mode Support

The script automatically detects the RA site theme (dark, light, or system preference) and adapts all injected UI elements accordingly.

### Mobile Support

On screens narrower than 1024px, sidebar sections (ROMs, World Records) are injected into the main content area instead.

### Changelog Popup

After each update, a popup shows what's new. Click **"Got it!"** to dismiss. It only appears once per version.

### Guide Link

If a game has an official RA guide, a 📖 button appears in the sidebar linking to it.

---

## ❓ FAQ & Troubleshooting

### The dashboard/pagination isn't loading

**Check your API key.** Go to Settings → RA Toolkit and make sure you've pasted a valid RetroAchievements Web API key. You can find it at **Settings → Keys** on the RA site.

### ROM search shows no results

- The game's console might not be supported yet
- Try enabling additional sources (Emuparadise, RomsFun) in settings
- Cached results expire after 24 hours — the next search will try fresh

### Translation button shows "⛔ Limit"

You've reached the daily 5,000-character translation limit (MyMemory free tier). It resets at midnight.

### Translation button shows "🌐 Too long"

The text exceeds 500 characters, which is the maximum for a single translation request. This is an API limitation.

### Features aren't appearing after update

1. Click the Tampermonkey icon → **Utilities** → **Check for userscript updates**
2. Refresh the RA page (`Ctrl+Shift+R` for a hard refresh)
3. If still not working, try disabling and re-enabling the script in Tampermonkey

### How do I check for updates?

The script auto-updates via Tampermonkey. To check manually: Tampermonkey icon → **Utilities** → **Check for userscript updates**.

### The settings card doesn't appear

Make sure you're on `retroachievements.org/settings` (not a sub-page). The card is injected at the bottom of the page, below the native settings cards, on any of the four tabs. If it is missing on v2.8.2 or older, update the script — RetroAchievements rebuilt that page as a tabbed layout.

### Can I use this on mobile?

Yes! The script works on mobile browsers that support Tampermonkey (e.g., Firefox for Android with Tampermonkey extension). Sidebar features are automatically moved to the main content area on small screens.

---

<p align="center">
  Made with ❤️ for the <a href="https://retroachievements.org">RetroAchievements</a> community<br>
  <a href="https://github.com/WelingtonMonteiro/ra-toolkit">GitHub</a> · <a href="https://github.com/WelingtonMonteiro/ra-toolkit/issues">Report a Bug</a>
</p>
