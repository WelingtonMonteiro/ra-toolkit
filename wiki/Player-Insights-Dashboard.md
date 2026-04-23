# 📊 Player Insights Dashboard

> **Where:** User profile pages (`/user/{username}`), above "Last Games Played"
>
> **Requires:** [RA API Key](Getting-Started#step-3--set-up-your-api-key)

## Modules


## Overview

The Player Insights Dashboard is injected on every user profile page. It provides detailed analytics about the player's gaming activity, streaks, rarest achievements, and progress.

### User Stats:

<img width="772" height="425" alt="image" src="images/6e2ebd41-bcfb-4093-81af-adbf971db7a2.png" />

### Progression Status:

<img width="769" height="436" alt="image" src="images/7e417be1-3f40-4f54-a55f-8e9cdd27e8b3.png" />

## Games by console

### Animated Bubbles:

<img width="733" height="441" alt="image" src="images/b1bf1999-11c0-4588-b8cb-4ee561a81c53.png" />

### Proportional Size:

<img width="734" height="428" alt="image" src="images/21cff4dc-cb4e-4e73-80cc-aa41556eb676.png" />

### Mastered vs Beaten · consoles with progress:

<img width="742" height="228" alt="image" src="images/2fb15661-b3dc-4b2b-8ada-8587c930a370.png" />

##  Activity Timeline (Last 365 Days) 📅

A full GitHub-style heatmap. See the [[Activity Timeline]] page for details.

### 1. All Activity: 

<img width="1024" height="367" alt="image" src="images/0d2eb26d-b210-4543-91a9-c7bf60617c18.png" />

### 2. Achievements Activity: 

<img width="1035" height="282" alt="image" src="images/7a4e08b9-cf85-4ab8-8150-054c42575514.png" />

### 3. Mastered Activity: 

<img width="1066" height="269" alt="image" src="images/4b058360-5d93-4e50-89bd-37619cf3a944.png" />

### 4. Beaten Activity: 

<img width="1052" height="288" alt="image" src="images/a478e3ba-3e61-44c7-99e8-b21472050583.png" />

###  Stats Cards (4 cards in a row)

<img width="1058" height="210" alt="image" src="images/231d7cc2-bb0e-404d-9402-6da2cca309b7.png" />

| Card | Description |
|------|-------------|
| **Games Played** | Total number of games the player has started |
| **Mastered** | Number of games with 100% completion (gold highlight) |
| **Mastery Rate** | Percentage of played games that are mastered (blue) |
| **Points & Rank** | Total points earned and site ranking (purple) |

### Almost There 🎯

Shows up to **5 games closest to 100% completion** (must be ≥50% done).

<img width="1035" height="432" alt="image" src="images/f73d2181-d64d-45fe-ac86-5520863e42e2.png" />

Each entry shows:
- Game icon and title (clickable link to the game page)
- Number of remaining achievements
- Current completion percentage
- Visual progress bar

> **Tip:** Use this to find which games you're closest to mastering!

### Streak Tracker 🔥

Tracks daily achievement-earning consistency over the past **365 days**:

<img width="1052" height="169" alt="image" src="images/979896d4-8b16-4191-ba0a-45b7439fd0ff.png" />

| Metric | Description |
|--------|-------------|
| **Current Streak** | How many consecutive days you've earned at least one achievement |
| **Best Streak** | Longest consecutive streak in the past year |
| **Active Days** | Total number of days with at least one achievement |
| **Total Achievements** | Sum of all achievements earned (365 days) |

### Rarest Achievements 💎

Your **top 5 rarest achievements** (sorted by TrueRatio, descending):

<img width="1063" height="383" alt="image" src="images/638baef7-c8bf-4578-81e6-92674520fc4b.png" />

- Achievement badge image
- Title (clickable link to `/achievement/{id}`)
- Game name
- Points earned
- Rarity multiplier (e.g., "×3.5" = 3.5× more valuable than a common achievement)

## Loading state

While data is being fetched from the API, each section shows animated skeleton placeholders with a pulse animation.
