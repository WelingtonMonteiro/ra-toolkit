# 📈 Enhanced User Stats

> **Where:** Replaces the native "User Stats" section on user profile pages (`/user/{username}`)

<img width="1047" height="574" alt="image" src="images/3e366220-e4f1-4544-8f6c-11284a029269.png" />


## What it does

The native RA "User Stats" section is replaced with a modern card-style layout with icons and colors, divided into 3 areas.

## Primary Stats (6 metric cards)

Displayed in a 3-column grid:

<img width="1070" height="282" alt="image" src="images/b52e314c-7e22-4be5-bd0f-077cef9693a5.png" />


| Card | Icon | Description |
|------|:----:|-------------|
| **Points** | 💎 | Total points earned (with weighted sub-value) |
| **Site Rank** | 🏅 | Current ranking (with "of X total" sub-value) |
| **Achievements** | 🏆 | Total achievements unlocked |
| **RetroRatio** | 📊 | Your retro ratio score |
| **Games Beaten** | 🎮 | Total games beaten (with retail sub-value) |
| **Beaten Rate** | 📈 | Percentage of started games that are beaten |

## Recent Activity (4 cards)

Only shown if the player has recent activity data:

<img width="1052" height="150" alt="image" src="images/4f9a02f0-692d-4656-ba55-e97692f71d89.png" />


| Card | Description |
|------|-------------|
| **Points (7 days)** | Points earned in the last week |
| **Points (30 days)** | Points earned in the last month |
| **Avg pts/week** | Average points earned per week |
| **Avg completion** | Average completion percentage across games |

## Casual Stats (3 cards)

Only shown if the player has casual (formerly "softcore") activity. Uses dimmer styling:

<img width="1032" height="167" alt="image" src="images/aa1f2193-b48e-4713-9549-2f58dcbd1a93.png" />

| Card | Description |
|------|-------------|
| **Points** | Casual points |
| **Rank** | Casual rank |
| **Achievements** | Casual achievements |

## Data source

All data is scraped from the native RA User Stats DOM (no extra API calls needed).

> **Since v2.9.0:** RetroAchievements renamed its "softcore" stat labels to
> **casual** (`Points (casual)`, `Casual rank`, `Achievements unlocked (casual)`).
> The script reads the new labels and still falls back to the old ones.
