# ❓ FAQ & Troubleshooting

## Common Issues

### The dashboard / pagination / timeline isn't loading

**Check your API key.**

1. Go to [retroachievements.org/settings](https://retroachievements.org/settings)
2. Scroll to the **RA Toolkit** card
3. Make sure you've pasted a valid API key in the **"RA API Key"** field
4. Click **"Atualizar"** to save

You can find your Web API Key at **Settings → Keys** on the RA site.

---

### ROM search shows no results

Possible causes:
- The game's console might not be supported yet (50+ are supported)
- Try enabling additional sources (Emuparadise, RomsFun) in [Settings](Settings-Panel)
- Cache from a previous empty search may persist — results cache expires after **24 hours**, then the next search tries fresh sources

---

### Translation button shows "⛔ Limit"

You've reached the daily **5,000-character** translation limit (MyMemory free tier). It resets automatically at **midnight**.

---

### Translation button shows "🌐 Too long"

The text exceeds **500 characters**, which is the maximum for a single translation request. This is an API limitation and can't be changed.

Hover over the button to see the exact character count.

---

### Features aren't appearing after an update

1. Click the **Tampermonkey icon** → **Utilities** → **Check for userscript updates**
2. **Hard refresh** the RA page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. If still not working, try **disabling and re-enabling** the script in the Tampermonkey dashboard

---

### The settings card doesn't appear

Make sure you're on `retroachievements.org/settings` (the main settings page, not a sub-page). The RA Toolkit card is injected below the native settings cards.

---

### How do I check for updates?

The script **auto-updates** via Tampermonkey. To check manually:

1. Click the **Tampermonkey icon** in your browser toolbar
2. Go to **Utilities**
3. Click **"Check for userscript updates"**

---

### Can I use this on mobile?

**Yes!** The script works on mobile browsers that support Tampermonkey:

- **Firefox for Android** with the [Tampermonkey extension](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Sidebar features are automatically moved to the main content area on small screens

---

### The rarity indicator shows wrong colors

Make sure you're on the latest version. Version 2.4.4+ uses language-agnostic percentage parsing that works with all RA site languages.

---

### Speedrun.com section doesn't appear

1. Make sure **"Enable Speedrun.com stats"** is turned **on** in [Settings](Settings-Panel)
2. Not all games have speedrun.com entries — the section only appears if runs are found
3. The game name must match between RA and speedrun.com

---

## Getting Help

- **[Report a Bug](https://github.com/WelingtonMonteiro/ra-toolkit/issues)** — open an issue on GitHub
- Include your browser name, Tampermonkey version, and the RA page URL where the issue occurs
- Enable **debug logging** in [Settings](Settings-Panel) and include relevant console output if possible
