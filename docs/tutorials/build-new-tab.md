---
layout: default
title: "Chrome Extension New Tab — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-new-tab/"
---
# Build a Custom New Tab Page

## What You'll Build {#what-youll-build}
Custom new tab with clock, greeting, quick links from top sites, search bar, and todo list.

## Manifest {#manifest}
```json
{
  "manifest_version": 3,
  "name": "Custom New Tab",
  "version": "1.0.0",
  "permissions": ["storage", "topSites"],
  "chrome_url_overrides": { "newtab": "newtab/newtab.html" }
}
```

## HTML Structure {#html-structure}
- Greeting (Good morning/afternoon/evening + user name)
- Large clock display with date
- Search bar (redirects to Google or navigates to URL)
- Quick links grid (auto-populated from `chrome.topSites.get()`, user can add/remove)
- Todo list with add/complete/delete

## CSS (Matrix/dark theme) {#css-matrixdark-theme}
- Background: linear-gradient #0d0d1a to #1a1a2e
- Accent color: #00ff41 (green)
- Clock: 64px font-weight 200 white
- Cards: rgba(255,255,255,0.05) with #333 border, hover shows green border
- Todo checkboxes: accent-color #00ff41
- Responsive grid for quick links

## JavaScript Features {#javascript-features}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  userName: 'string',
  quickLinks: 'string',   // JSON: Array<{ title, url }>
  todos: 'string'          // JSON: Array<{ id, text, done }>
}), 'local');
```

### Clock & Greeting {#clock-greeting}
- `setInterval(updateClock, 1000)` with locale time formatting
- Greeting based on hour: morning (<12), afternoon (<17), evening
- First-run prompt for user's name, stored in storage

### Search {#search}
- Enter key handler on search input
- If starts with `http` — navigate directly
- Otherwise redirect to Google search with `encodeURIComponent`

### Quick Links {#quick-links}
- Default: `chrome.topSites.get()` sliced to 8
- Grid of cards showing title + domain
- Add button with URL/title prompts
- Remove button (x) on each card
- Stored in `@theluckystrike/webext-storage`

### Todo List {#todo-list}
- Add via input + button or Enter key
- Toggle done with checkbox (strikethrough style)
- Delete with x button
- Stored in `@theluckystrike/webext-storage`

## Next Steps {#next-steps}
- Background images (unsplash API or custom)
- Weather widget
- Bookmarks integration
- Theme customization
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
