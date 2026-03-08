---
layout: default
title: "Chrome Extension Theme Sync — Best Practices"
description: "Synchronize extension themes with browser themes."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/theme-sync/"
---

# Theme Sync Pattern

## Overview

- Sync extension theme with system/browser dark mode
- Consistent theming across popup, options, side panel, content script UI
- Respect user preference while supporting auto-detection

---

## Detecting System Theme

Use `window.matchMedia` to detect the system's color scheme preference in popup, options, and side panel contexts:

```typescript
// theme-detector.ts
function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function watchSystemTheme(callback: (theme: "light" | "dark") => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
```

**Important**: `matchMedia` is not available in service workers. Use an offscreen document if you need to detect system theme in the background context.

---

## Theme Storage

Store the user's theme preference using `chrome.storage.sync` for cross-device synchronization:

```typescript
// theme-storage.ts
type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "themeMode";

async function getThemeMode(): Promise<ThemeMode> {
  const result = await chrome.storage.sync.get(THEME_KEY);
  return (result[THEME_KEY] as ThemeMode) || "system";
}

async function setThemeMode(mode: ThemeMode): Promise<void> {
  await chrome.storage.sync.set({ [THEME_KEY]: mode });
}
```

Three modes: "light" (forced light), "dark" (forced dark), "system" (auto-detect from OS).

---

## CSS Implementation

Use CSS custom properties with a `data-theme` attribute for clean theming:

```css
:root {
  --bg: #ffffff;
  --text: #000000;
  --primary: #0066cc;
  --border: #e0e0e0;
}

:root[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #e0e0e0;
  --primary: #4da6ff;
  --border: #333333;
}

body {
  background-color: var(--bg);
  color: var(--text);
  transition: background-color 0.2s ease, color 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    transition: none;
  }
}
```

Apply the theme attribute to `document.documentElement` in each UI context.

---

## Cross-Context Consistency

Sync theme across all extension contexts using `chrome.storage.onChanged`:

```typescript
// theme-bridge.ts
function broadcastTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
}

async function initThemeSync(): Promise<void> {
  const mode = await getThemeMode();
  const resolved = mode === "system" ? getSystemTheme() : mode;
  broadcastTheme(resolved);

  // Watch for storage changes from other contexts
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[THEME_KEY]) {
      const newMode = changes[THEME_KEY].newValue as ThemeMode;
      const resolved = newMode === "system" ? getSystemTheme() : newMode;
      broadcastTheme(resolved);
    }
  });
}
```

For content scripts injected into pages, receive theme via messaging:

```typescript
// content-script.ts
chrome.runtime.sendMessage({ type: "GET_THEME" }, (response) => {
  if (response?.theme) {
    document.documentElement.dataset.theme = response.theme;
  }
});
```

---

## Service Worker Theme Awareness

The service worker cannot access `matchMedia`. Rely on stored preference and broadcast changes:

```typescript
// background.ts
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[THEME_KEY]) {
    const mode = changes[THEME_KEY].newValue as ThemeMode;
    const theme = mode === "system" ? "light" : mode; // default for SW
    updateBadgeColor(theme);
    notifyContexts(theme);
  }
});

function updateBadgeColor(theme: "light" | "dark"): void {
  chrome.action.setBadgeBackgroundColor({
    color: theme === "dark" ? "#333333" : "#ffffff",
  });
}
```

Forward theme changes to all open contexts using message passing.

---

## Transition Animation

Smooth theme transitions prevent jarring visual changes:

```css
:root {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  :root {
    transition: none;
  }
}
```

---

## Code Examples Summary

| Component | Purpose |
|-----------|---------|
| `theme-detector.ts` | System theme detection with change listener |
| `theme-storage.ts` | Persist user preference via chrome.storage.sync |
| `theme-bridge.ts` | Sync theme across popup, options, side panel |
| `background.ts` | Service worker theme coordination and badge updates |

---

## Cross-references

- [Theming Dark Mode](./theming-dark-mode.md) - Extended dark mode patterns
- [State Management](./state-management.md) - Centralized state patterns
- [Accessibility](./accessibility.md) - Reduced motion and accessibility considerations
