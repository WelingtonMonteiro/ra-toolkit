# 📅 Activity Timeline

> **Where:** Inside the Player Insights Dashboard (first section), on user profile pages
>
> **Requires:** [RA API Key](Getting-Started#step-3--set-up-your-api-key)

## What it is

A **GitHub-style contribution heatmap** showing activity over the past **365 days** (52 weeks × 7 days), with month labels and day-of-week indicators.

<img width="1024" height="284" alt="image" src="images/1e7afd99-29a0-4abb-9ac9-08b053206972.png" />

## How to read it

- Each small square represents **one day**
- **Darker color = more activity** that day (5 intensity levels: empty → level 4)
- Rows = days of the week (Mon–Sun)
- Columns = weeks

## Toggle modes (multi-select)

Three toggle buttons above the heatmap:

<img width="464" height="123" alt="image" src="images/6a41c2ba-15cd-4bae-be32-b2c4f39de8e4.png" />

| Button | Color | What it tracks |
|--------|-------|---------------|
| **🏆 Achievements** | Blue shades | Achievements earned per day |
| **👑 Mastered** | Gold shades | Games mastered per day |
| **✅ Beaten** | Gray shades | Games beaten per day |

### How multi-select works

- **All three are active by default**
- Click any button to toggle it on/off
- **At least one must remain active**

## Tooltip

Hover over any day square to see a detailed popup:

<img width="470" height="229" alt="image" src="images/a967454b-ed8c-4164-ad6e-0b838280f3b4.png" />

```
Mar 19, 2026
🏆 5 achievements
👑 1 mastered
✅ 2 beaten
```

The tooltip shows the full date (with year) and a breakdown per active mode with icons.

## Achievements Activity: 
<img width="1025" height="262" alt="image" src="images/f60ab39d-72c5-46b6-8ce7-71e8b33ab2a4.png" />

## Beaten Activity:
<img width="1025" height="262" alt="image" src="images/1f947829-45ca-4691-89a1-4c26519a131f.png" />

## Mastered Activity:
<img width="1025" height="262" alt="image" src="images/c665ff11-9384-40b4-bc0c-8f84fa6c0043.png" />

## All Activity:
<img width="1025" height="267" alt="image" src="images/83557af8-f9c9-4b0a-bb62-9c173f73915e.png" />

- When multiple modes are active, each day's square uses **priority coloring**:
  - **Mastered** (gold) > **Beaten** (gray) > **Achievements** (blue)
  - The highest-priority event type present on that day determines the cell color


## Footer

<img width="1015" height="125" alt="image" src="images/6cb1bf73-72e8-4251-8df6-6853fd401672.png" />

Below the heatmap:
- Total counts per active mode (e.g., "🏆 1,234 achievements · 👑 45 mastered · ✅ 78 beaten")
- Number of active days
- Color legend (single mode = color scale; multi mode = colored dots per mode)

## Data source

- **Achievements:** Fetched via `API_GetAchievementsEarnedBetween` in 4 quarterly chunks (bypasses the 500-record API limit)
- **Mastered/Beaten dates:** Fetched via `API_GetUserAwards`
