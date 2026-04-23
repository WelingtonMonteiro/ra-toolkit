# 🔍 ROM Search

> **Where:** Sidebar of any game page (`/game/{id}`)
>
> **API Key:** Not required (except for hash verification)
<img width="875" height="94" alt="image" src="images/edc9369b-586a-43c6-b414-45f0ba3bce3f.png" />

## How it works

1. Navigate to any game page (e.g., `retroachievements.org/game/1`)
2. In the sidebar (right side), look for the **"ROMs"** section below the box art
3. The script automatically searches for matching ROMs across multiple sources
4. Results appear as a list of downloadable links

<img width="383" height="476" alt="image" src="images/5780dec3-df11-40aa-886b-c0bf7dac0676.png" />


## What you'll see

### World Records session 

<img width="388" height="586" alt="image" src="images/5e274569-7317-4159-bfcc-e61adf7424e3.png" />


### ROM links
Each result shows the filename and source. Click to download.

<img width="427" height="631" alt="image" src="images/adc1ce70-fbc2-48ac-b04a-644366efcc40.png" />

### 🏆 RA Trophy Badge
A gold trophy icon means the ROM's hash matches the official RA database — **verified compatible** with RetroAchievements.

<img width="402" height="626" alt="image" src="images/44923b4c-5b4b-4965-af95-c62b4ada3585.png" />

> Hover over the badge to see the MD5 hash, labels, and compatibility details.

**Requires:** RA API Key enabled in [Settings](Settings-Panel).

<img width="875" height="94" alt="image" src="images/52e07b48-a26f-4683-ae8b-31162f63df08.png" />

### No results
If nothing is found, manual search links to Archive.org, Myrient, and RomsFun are shown.

<img width="390" height="224" alt="image" src="images/2bdc1080-00f0-4667-a1d6-c899e771f217.png" />


### PSP DLCs
For PSP games, DLCs are listed in a separate section.

## Search sources

ROMs are searched in this priority order:

| # | Source | Notes |
|---|--------|-------|
| 1 | **Cache** | Previously found results, cached for 24 hours |
| 2 | **Myrient** | Primary source for most consoles |
| 3 | **Archive.org** | No-Intro 2016 collection (fallback) |
| 4 | **Emuparadise** | Optional — enable in [Settings](Settings-Panel) |
| 5 | **RomsFun** | Optional — enabled by default |

For Arcade games, a specialized search using FBNeo DAT files is used.

## Title matching

The script uses smart title matching:
- Normalizes titles (strips articles like "The", punctuation, region tags)
- Tries exact match first, then falls back to substring matching
- Region-aware comparison

## Supported consoles

50+ systems including:

NES, SNES, Game Boy, GBC, GBA, N64, DS, DSi, GameCube, Wii, PS1, PS2, PSP, Genesis/Mega Drive, Master System, Game Gear, Saturn, Dreamcast, Sega CD, 32X, Atari 2600, Atari 7800, Atari Jaguar, Atari Lynx, PC Engine, PC-FX, Neo Geo CD, Neo Geo Pocket, WonderSwan, MSX, Vectrex, 3DO, ColecoVision, Virtual Boy, SG-1000, Apple II, Arduboy, Arcadia 2001, Fairchild, Magnavox Odyssey 2, Intellivision, VC 4000, Mega Duck, Watara, Zeebo, Amstrad CPC, Uzebox, WASM-4, Arcade

## Collapse/Expand

Click the **"ROMs"** heading to collapse or expand the section. The state is remembered across visits.

<img width="380" height="223" alt="image" src="images/bff2a094-bde5-4404-bc3a-f3cbfb1e5cb4.png" />


## Settings

| Setting | Default | Description |
|---------|:-------:|-------------|
| Enable ROMs search | ✅ On | Toggle the entire ROM search feature |
| Verify ROM hashes | ✅ On | Enable 🏆 badge (requires API key) |
| Add Emuparadise | ❌ Off | Include Emuparadise as a source |
| Prioritize Emuparadise | ❌ Off | Search Emuparadise first |
| Add RomsFun | ✅ On | Include RomsFun as a source |
