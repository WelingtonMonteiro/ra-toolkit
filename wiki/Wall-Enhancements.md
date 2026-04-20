# 💬 User Wall Enhancements

> **Where:** User profile pages and comments pages (`/user/{name}`, `/user/{name}/comments`)

## 1. URL Linkify

Plain text URLs posted in wall comments are automatically converted into **clickable links**.

- Links are highlighted in your [accent color](Settings-Panel)
- Links open in a **new tab** (`target="_blank"`)
- Only plain-text URLs are converted — existing `<a>` links are left unchanged

**Before:**
```
Check out https://retroachievements.org/game/1 for more info
```

**After:**
```
Check out [https://retroachievements.org/game/1] for more info
               ^^ clickable link ^^
```

## 2. YouTube Embed

YouTube links in wall comments automatically show an **inline video player** below the comment.

**Supported URL formats:**
- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://www.youtube.com/shorts/...`

**Player details:**
- Max width: 360px
- Aspect ratio: 16:9
- Uses `youtube-nocookie.com` for privacy (no tracking cookies)

## 3. Image Preview

Image URLs in comments show an **inline image preview** below the comment.

**Supported formats:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`, `.avif`

**Preview details:**
- Max size: 360×300px
- Click the preview to open the full image in a new tab

## Dynamic loading

New comments loaded dynamically (e.g., via "Load more" or infinite scroll) are automatically enhanced. The script uses a `MutationObserver` to watch for new comment DOM nodes.

Each comment is processed only once (marked with `data-enhanced-linkified` to prevent duplicates).
