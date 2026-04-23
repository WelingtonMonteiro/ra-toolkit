# 🎬 Speedrun.com Integration

> **Where:** Game page sidebar (World Records) and main article (video embed)
>
> **Requires:** Enabled in [Settings](Settings-Panel)

## How to enable

1. Go to **[Settings](Settings-Panel) → RA Toolkit**
2. Turn on **"Enable Speedrun.com stats"**
3. Optionally turn on **"Enable gameplay video on the game page"**
4. Click **"Atualizar"** to save

<img width="935" height="464" alt="image" src="images/c4fdb71d-88c7-4ff6-9abc-79e0d60bd143.png" />

## World Records section

A **"World Records"** section appears in the game page sidebar showing:

| Column | Description |
|--------|-------------|
| **Category** | Speedrun category name (e.g., "Any%", "100%") |
| **Time** | Best verified time |
| **Runner** | Runner's name (linked to the run) |

Only categories with verified runs are shown.

<img width="386" height="586" alt="image" src="images/0a3196a5-d6e7-47f4-b4e3-94606939968c.png" />

### Collapse/Expand

Click the **"World Records"** heading to collapse or expand. State is persisted across visits.

<img width="382" height="211" alt="image" src="images/d608dfeb-0aaa-4f82-a711-58a72d15eaaf.png" />

## Gameplay video embed

If **"Enable gameplay video"** is also turned on:

<img width="880" height="525" alt="image" src="images/bd300185-1687-403d-875b-e970eb4a8bbc.png" />

- The first speedrun's video (YouTube or Twitch) is embedded as an iframe on the game page
- Appears in the main article area, below the screenshots section
- Width: 100%, Height: 315px

<img width="909" height="716" alt="image" src="images/9eedc579-bc03-4767-b4b9-da0e355d0e19.png" />

## Data source

Speedrun.com REST API v1:
1. Searches for the game by name + platform
2. Fetches categories
3. Gets verified runs per category
4. Resolves runner usernames
