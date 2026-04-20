# 👑 Games Page — Most Mastered Tab

> **Where:** `/games` page (All Games listing)
>
> **API Key:** Not required (uses internal RAWeb API with your logged-in session)

## How to use

1. Go to [retroachievements.org/games](https://retroachievements.org/games)
2. A **tab bar** appears above the game table
3. Click **"👑 Most Mastered"** to switch views

## Tabs

| Tab | Description |
|-----|-------------|
| **📋 All Games** (default) | The native game table with filters and sorting |
| **👑 Most Mastered** | Card grid ranked by total player count |

## Most Mastered view

Games are displayed as cards in a grid, sorted by total player count (descending). Each card shows:

| Element | Description |
|---------|-------------|
| **Rank** | Position number (#1, #2, #3, ...) |
| **Game icon** | 48×48px thumbnail |
| **Title** | Game name (clickable link to game page) |
| **👥 Players** | Total number of players |
| **🏆 Beaten** | Times beaten count |
| **⭐ Achievements** | Number of achievements |
| **System tag** | Console/system name |

## Pagination

- **25 games per page**
- Navigation buttons: **First** / **‹ Prev** / **numbered pages** / **Next ›** / **Last**

## Data source

Uses the internal RAWeb API endpoint (`/internal-api/games?sort=-playersTotal&filter[achievementsPublished]=has`) with same-origin credentials — works with your logged-in session, no API key needed.
