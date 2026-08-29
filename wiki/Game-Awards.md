# 🏆 Game Awards — Mastered & Beaten Tabs

> **Where:** User profile sidebar, inside the "Game Awards" section (`#gameawards`)
>
> **Requires:** [RA API Key](Getting-Started#step-3--set-up-your-api-key) for the Beaten tab

## What it does

Adds two tabs above the native Game Awards badge grid, letting you switch between mastered and beaten game views.

<img width="415" height="275" alt="image" src="images/0a29f334-3b4b-4b2a-a78b-ba4c8379ddff.png" />

## Tabs

- **Hardcore** beaten badges are shown in **gold** styling
- **Casual** (formerly "softcore") beaten badges are slightly **dimmed**
- Hover over any badge to see the game info tooltip (uses the native RA tooltip system)
- The section heading icon and counter update when switching tabs to reflect beaten HC/SC counts

| Tab | Description |
|-----|-------------|
| **👑 Mastered** (default) | Shows the native mastered/completed badge grid (unchanged) |
| **🏆 Beaten** | Shows all beaten games fetched from the API |

## How to use

1. Go to any user profile
2. In the sidebar, find the **Game Awards** section
3. Click the tabs to switch between **Mastered** and **Beaten** views

## Mastered tab details

- **Hardcore** beaten badges are shown in **gold** styling
- **Casual** beaten badges are slightly **dimmed**

<img width="443" height="274" alt="image" src="images/cc89c4a3-f6ee-4ea8-b220-cb29b28a691d.png" />

## Beaten tab details

- **Hardcore** beaten badges are shown in **gold** styling
- **Casual** beaten badges are slightly **dimmed**
- Hover over any badge to see the game info tooltip (uses the native RA tooltip system)
- The section heading icon and counter update when switching tabs to reflect beaten HC/SC counts

<img width="452" height="389" alt="image" src="images/539a674b-fd87-4420-829a-91b2f05d498f.png" />

## Data source

- **Mastered tab:** Native DOM content (no API call)
- **Beaten tab:** Fetched from `API_GetUserAwards` endpoint

## Troubleshooting

If the **Beaten** tab shows *"Failed to load beaten games"*, update to **v2.9.0
or newer** — earlier versions built the badge tooltips with an attribute name
the browser rejects, which aborted the render.
