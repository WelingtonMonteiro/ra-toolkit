# 🎨 Progression Status Dashboard

> **Where:** Replaces the native "Progression Status" section on user profile pages (`/user/{username}`)

## What it does

The native Progression Status section is hidden and replaced with a modern dark-themed dashboard featuring charts and interactive visualizations.

<img width="1035" height="588" alt="image" src="images/e8c70dc3-8634-4331-8b6b-8554c7a15615.png" />

## Sections

### 1. KPI Grid (4 summary cards)

<img width="997" height="112" alt="image" src="images/6e501ee7-eaf5-412b-89b1-7227dc25824f.png" />

| Card | Accent | Description |
|------|--------|-------------|
| **Total Games** | Default | Number of games with any progress |
| **Beaten** | Purple | Total games beaten |
| **Mastered** | Gold | Total games mastered |
| **% Completed** | Green | Overall completion rate |

### 2. Overview Donut Chart (left column)

<img width="402" height="396" alt="image" src="images/63a26d7f-0b27-4629-ae7c-1df47aa4b895.png" />

A Chart.js donut chart showing the split between:
- **Unfinished** games
- **Beaten** games
- **Mastered** games

The center of the donut shows the overall completion percentage. A legend is displayed below.

### 3. Completion by Console (right column)

Horizontal stacked bars showing the completion % for up to **12 consoles**, sorted by completion rate. Each bar shows beaten vs mastered proportions.

<img width="608" height="296" alt="image" src="images/8a5aa02e-2b00-40c8-b694-09df3f9ef896.png" />

### 4. Interactive Visualization

<img width="988" height="598" alt="image" src="images/2daae4ce-bc9f-407c-bd6a-ee8e04c71350.png" />

Two view modes (toggle buttons):

| Mode | Description |
|------|-------------|
| **Bubbles** | Animated bouncing circles sized by game count per console, colored by status. Physics simulation with collision detection. |
| **Treemap** | Proportional rectangles (squarified algorithm) showing console distribution |

- Bubbles filter:

<img width="963" height="586" alt="image" src="images/6d5ce81f-1499-4d29-8578-5c6c02ae1d72.png" />

- Treemap filter: 

<img width="993" height="610" alt="image" src="images/baa2b06f-79e2-47fa-a833-40198050374b.png" />


Three filter options:
- **All** — Show all consoles
<img width="406" height="137" alt="image" src="images/5ddbc990-1720-4edf-8ae0-5a0c5177d3d6.png" />

- **With Progress** — Only consoles where you have progress
<img width="382" height="135" alt="image" src="images/5b3243e7-5683-45dd-bae8-bdd3a27bcf48.png" />

- **Mastered** — Only consoles with mastered games
<img width="410" height="127" alt="image" src="images/0baadb8a-0aed-4dbd-bd31-e1adb7816fff.png" />


Hover over any bubble or rectangle to see a tooltip with:

<img width="612" height="348" alt="image" src="images/7d692d04-d9ed-4caf-90ea-5df00a9bac38.png" />

- Console name
- Game count
- Completion %
- Beaten/mastered counts

### 5. Mastered vs Beaten Bar Chart

A Chart.js grouped bar chart comparing mastered vs beaten counts for your **top 8 consoles** (sorted by total progress).

<img width="992" height="289" alt="image" src="images/eac70b5f-2485-46a7-945a-0c11092617b4.png" />

## Data source

All data is scraped from the native Progression Status rows in the DOM — no extra API calls.
