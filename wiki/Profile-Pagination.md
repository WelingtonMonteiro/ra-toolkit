# 📄 Profile Pagination (Last Games Played)

> **Where:** User profile pages (`/user/{username}`), "Last Games Played" section
>
> **Requires:** [RA API Key](Getting-Started#step-3--set-up-your-api-key) for pages beyond page 1

## What it does

Replaces the limited "Last X Games Played" list with a fully paginated view, allowing you to browse through all of a player's recently played games.

<img width="1061" height="695" alt="image" src="images/43bd8e8b-0971-4431-92fc-841f02a2db4d.png" />

## Controls

### Per-page selector

A dropdown next to the section heading lets you choose how many games to show per page:
- **5** / **10** / **15** / **20** / **30** / **50** items

<img width="515" height="235" alt="image" src="images/c4943154-ec6a-49ee-ac54-b372251a82d9.png" />

### Pagination bar

Below the games list:

<img width="491" height="138" alt="image" src="images/4aef949f-4093-4bea-8e87-6239e793738d.png" />

- **First** — go to the first page
- **‹ Prev** — go to the previous page
- **1 2 3 ...** — numbered page buttons (up to 5 visible)
- **Next ›** — go to the next page
- **Last** — go to the last page
- Page range info (e.g., "6–10 of 47")

## Game cards

Each game card displays:

<img width="1028" height="494" alt="image" src="images/d85e9cec-d48b-4932-a5d6-aefed89f2de1.png" />

| Element | Description |
|---------|-------------|
| **Game icon** | 58×58px, clickable link to the game page |
| **Title** | Game name |
| **Achievement count** | e.g., "5 of 20" |
| **Points** | Points earned in this game |
| **Console badge** | Icon + short name (e.g., "SNES", "PS1") |
| **Last played** | Date of last activity |
| **Progress bar** | Hardcore % (solid) + casual % (lighter) |
| **Award label** | Mastered ✨, Completed, Beaten 🏆, or Beaten (casual) — with award date |

## Expanding achievements

Click the **chevron (▶)** on any game card to expand and see all individual achievement badges:

<img width="1015" height="447" alt="image" src="images/38846a8f-34b2-4b8b-a713-dafcb5ef6917.png" />

- Each badge has a **colored border** indicating its [[rarity tier|Achievement-Rarity]]
- **Unlocked** achievements are shown in full color
- **Locked** achievements are dimmed
- Badges are loaded on-demand from the API

## Loading state

While a new page is loading, animated skeleton cards with pulse animation serve as placeholders.
