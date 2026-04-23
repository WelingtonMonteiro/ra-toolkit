# 🌐 Achievement & Comment Translation

> **Where:** Game pages (achievement cards), user profile wall comments, and achievement comment pages (`/achievement/{id}`)

## Translating achievements on a game page

1. Go to any game page with achievements (e.g., `/game/1`)
2. Each achievement card has a **"🌐 Translate"** button next to the description
3. Click it — the button shows **"⏳ ..."** while loading
4. The title and description are translated into your chosen language
5. The button becomes **"🌐 Original"** (highlighted in your accent color)
6. Click again to toggle back to the English text

## Translating wall comments

1. Go to any user profile (`/user/{username}`) or their comments page
2. Each wall comment has a **"🌐 Translate"** button
3. Click to translate, click again to see the original

## Translating achievement comments

1. Open any achievement page (example: `/achievement/309`)
2. In the comments section, each comment has a **"🌐 Translate"** button
3. Click to translate, click **"🌐 Original"** to switch back

## Translation language

Change the target language in **[Settings](Settings-Panel) → Translation Language**.

Available languages:
- 🇧🇷 Portuguese (pt-BR) — default
- 🇪🇸 Spanish (es-ES)
- 🇫🇷 French (fr-FR)
- 🇩🇪 German (de-DE)
- 🇮🇹 Italian (it-IT)
- 🇯🇵 Japanese (ja-JP)
- 🇰🇷 Korean (ko-KR)
- 🇨🇳 Chinese (zh-CN)
- 🇷🇺 Russian (ru-RU)
- 🇸🇦 Arabic (ar-SA)

## Limits

| Limit | Value | Details |
|-------|-------|---------|
| **Daily character limit** | 5,000 chars/day | MyMemory free tier; resets at midnight |
| **Max text length** | 500 chars | Single request limit from the API |

### Button states

| Button text | Meaning |
|-------------|---------|
| 🌐 Translate | Ready to translate |
| ⏳ ... | Translation in progress |
| 🌐 Original | Showing translated text — click to revert |
| 🌐 Too long | Text exceeds 500 chars (hover to see char count) |
| ⛔ Limit | Daily 5,000-character limit reached |
