---
layout: default
title: "Chrome Extension Theming Dark Mode — Best Practices"
description: "Implement dark mode and theme synchronization for extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/theming-dark-mode/"
---

# Theming and Dark Mode Patterns

Chrome extensions live across multiple surfaces -- popup, options page, side panel, and content scripts injected into arbitrary sites. Keeping a consistent theme across all of them while respecting user preferences requires a deliberate architecture. These eight patterns build from simple system-theme detection to a full multi-surface theme engine.

---

## Pattern 1: System Theme Detection {#pattern-1-system-theme-detection}

Use `prefers-color-scheme` to follow the OS setting in your extension UI.

```typescript
// theme-detect.ts -- works in popup, options, or side panel
function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function watchSystemTheme(callback: (theme: "light" | "dark") => void): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", (e) => {
    callback(e.matches ? "dark" : "light");
  });
}

// Apply on load and watch for changes
document.documentElement.dataset.theme = getSystemTheme();
watchSystemTheme((theme) => {
  document.documentElement.dataset.theme = theme;
});
```

Pair this with a CSS rule that keys off the `data-theme` attribute:

```css
[data-theme="dark"] {
  --bg: #1a1a2e;
  --text: #e0e0e0;
}
[data-theme="light"] {
  --bg: #ffffff;
  --text: #1a1a1a;
}
body {
  background: var(--bg);
  color: var(--text);
}
```

---

## Pattern 2: User-Selectable Theme with chrome.storage {#pattern-2-user-selectable-theme-with-chromestorage}

Let users choose between system, light, and dark. Persist the choice and broadcast changes.

```typescript
type ThemeChoice = "system" | "light" | "dark";

async function getThemeChoice(): Promise<ThemeChoice> {
  const { themeChoice = "system" } = await chrome.storage.sync.get("themeChoice");
  return themeChoice as ThemeChoice;
}

async function setThemeChoice(choice: ThemeChoice): Promise<void> {
  await chrome.storage.sync.set({ themeChoice: choice });
}

function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return choice;
}

// Initialize
async function initTheme(): Promise<void> {
  const choice = await getThemeChoice();
  document.documentElement.dataset.theme = resolveTheme(choice);

  // React to storage changes from other tabs or the options page
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.themeChoice) {
      const newChoice = changes.themeChoice.newValue as ThemeChoice;
      document.documentElement.dataset.theme = resolveTheme(newChoice);
    }
  });

  // Also react to OS changes when set to "system"
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async () => {
    const current = await getThemeChoice();
    if (current === "system") {
      document.documentElement.dataset.theme = resolveTheme("system");
    }
  });
}
```

Calling `chrome.storage.sync.set` fires `onChanged` in every open extension page, so every surface updates simultaneously.

---

## Pattern 3: CSS Custom Properties Theme System {#pattern-3-css-custom-properties-theme-system}

Define a complete design token set using CSS custom properties, then swap them by toggling a single attribute.

```typescript
interface ThemeTokens {
  bg: string;
  bgSurface: string;
  text: string;
  textMuted: string;
  primary: string;
  border: string;
  shadow: string;
}

const THEMES: Record<"light" | "dark", ThemeTokens> = {
  light: {
    bg: "#ffffff",
    bgSurface: "#f5f5f5",
    text: "#1a1a1a",
    textMuted: "#666666",
    primary: "#2563eb",
    border: "#e0e0e0",
    shadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  dark: {
    bg: "#0f0f23",
    bgSurface: "#1a1a2e",
    text: "#e0e0e0",
    textMuted: "#888888",
    primary: "#60a5fa",
    border: "#2a2a4a",
    shadow: "0 1px 3px rgba(0,0,0,0.4)",
  },
};

function applyThemeTokens(theme: "light" | "dark"): void {
  const tokens = THEMES[theme];
  const root = document.documentElement;
  root.style.setProperty("--bg", tokens.bg);
  root.style.setProperty("--bg-surface", tokens.bgSurface);
  root.style.setProperty("--text", tokens.text);
  root.style.setProperty("--text-muted", tokens.textMuted);
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--border", tokens.border);
  root.style.setProperty("--shadow", tokens.shadow);
  root.dataset.theme = theme;
}
```

Components only reference `var(--bg)`, `var(--text)`, etc. Swapping the theme requires zero DOM manipulation beyond setting seven properties.

---

## Pattern 4: Content Script Page Theme Injection {#pattern-4-content-script-page-theme-injection}

Inject dark mode into any website by inserting a stylesheet into the page.

```typescript
// content-dark-mode.ts
function buildDarkCSS(): string {
  return `
    html {
      filter: invert(1) hue-rotate(180deg) !important;
      background: #111 !important;
    }
    img, video, canvas, svg, [style*="background-image"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
}

let injectedStyle: HTMLStyleElement | null = null;

function enableDarkMode(): void {
  if (injectedStyle) return;
  injectedStyle = document.createElement("style");
  injectedStyle.id = "ext-dark-mode";
  injectedStyle.textContent = buildDarkCSS();
  document.documentElement.appendChild(injectedStyle);
}

function disableDarkMode(): void {
  injectedStyle?.remove();
  injectedStyle = null;
}

// Listen for toggle commands from the background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE_DARK") {
    injectedStyle ? disableDarkMode() : enableDarkMode();
  }
  if (msg.type === "SET_DARK") {
    msg.enabled ? enableDarkMode() : disableDarkMode();
  }
});
```

The `invert + hue-rotate` trick is a quick approximation. Images and video get a second invert to restore their original colors. For higher fidelity, replace the filter approach with per-element color remapping.

---

## Pattern 5: Theme Sync Across All Surfaces {#pattern-5-theme-sync-across-all-surfaces}

Coordinate theme state between popup, options page, side panel, and content scripts using a shared message bus.

```typescript
// background.ts -- central theme coordinator
interface ThemeState {
  choice: "system" | "light" | "dark";
  resolved: "light" | "dark";
}

async function broadcastTheme(state: ThemeState): Promise<void> {
  // Update all extension pages via storage
  await chrome.storage.session.set({ currentTheme: state });

  // Update all content scripts via tab messaging
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "THEME_CHANGED",
        theme: state.resolved,
      }).catch(() => {});
    }
  }
}

// React to user changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.themeChoice) {
    const choice = changes.themeChoice.newValue as ThemeState["choice"];
    const resolved = await resolveInBackground(choice);
    await broadcastTheme({ choice, resolved });
  }
});

async function resolveInBackground(
  choice: "system" | "light" | "dark"
): Promise<"light" | "dark"> {
  if (choice !== "system") return choice;
  // Service workers have no window.matchMedia -- ask an open page
  const views = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.POPUP],
  });
  if (views.length > 0) {
    const resp = await chrome.runtime.sendMessage({ type: "GET_SYSTEM_THEME" });
    return resp.theme;
  }
  // Fallback: default to dark
  return "dark";
}
```

Content scripts listen for `THEME_CHANGED` and toggle their injected stylesheet. Extension pages listen via `chrome.storage.session.onChanged`.

---

## Pattern 6: Per-Site Theme Overrides {#pattern-6-per-site-theme-overrides}

Let users save a theme preference per domain so certain sites always keep their original appearance.

```typescript
interface SiteOverride {
  domain: string;
  theme: "light" | "dark" | "none"; // "none" = don't touch
}

async function getSiteOverrides(): Promise<Record<string, SiteOverride>> {
  const { siteOverrides = {} } = await chrome.storage.sync.get("siteOverrides");
  return siteOverrides;
}

async function setSiteOverride(domain: string, theme: SiteOverride["theme"]): Promise<void> {
  const overrides = await getSiteOverrides();
  overrides[domain] = { domain, theme };
  await chrome.storage.sync.set({ siteOverrides: overrides });
}

async function removeSiteOverride(domain: string): Promise<void> {
  const overrides = await getSiteOverrides();
  delete overrides[domain];
  await chrome.storage.sync.set({ siteOverrides: overrides });
}

// Content script: check override before applying theme
async function resolvePageTheme(): Promise<"light" | "dark" | "none"> {
  const domain = window.location.hostname;
  const overrides = await getSiteOverrides();
  if (overrides[domain]) return overrides[domain].theme;

  // Fall back to global setting
  const { themeChoice = "system" } = await chrome.storage.sync.get("themeChoice");
  if (themeChoice === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themeChoice as "light" | "dark";
}
```

Expose `setSiteOverride` through the popup so users can right-click and exclude sites where forced dark mode breaks the layout.

---

## Pattern 7: Dynamic Icon Switching Based on Theme {#pattern-7-dynamic-icon-switching-based-on-theme}

Swap the toolbar icon between light and dark variants so it stays visible regardless of the browser's toolbar color.

```typescript
// background.ts
async function updateIcon(theme: "light" | "dark"): Promise<void> {
  const suffix = theme === "dark" ? "light" : "dark";
  await chrome.action.setIcon({
    path: {
      16: `icons/icon-${suffix}-16.png`,
      32: `icons/icon-${suffix}-32.png`,
      48: `icons/icon-${suffix}-48.png`,
    },
  });
}

// Option A: react to theme preference changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.currentTheme) {
    const state = changes.currentTheme.newValue as { resolved: "light" | "dark" };
    updateIcon(state.resolved);
  }
});

// Option B: use chrome.action.setIcon with a canvas for tinting
async function tintIcon(color: string): Promise<void> {
  const offscreen = await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({
    type: "TINT_ICON",
    color,
    target: "offscreen",
  });
  if (response?.imageData) {
    await chrome.action.setIcon({ imageData: response.imageData });
  }
}
```

Place icon variants in your extension's `icons/` directory: `icon-light-16.png` for display on dark toolbars, `icon-dark-16.png` for light toolbars. The naming convention is the icon color, not the toolbar color.

---

## Pattern 8: High Contrast and Forced Colors Support {#pattern-8-high-contrast-and-forced-colors-support}

Respect the `forced-colors` media query for users who enable Windows High Contrast or similar OS features.

```typescript
function detectForcedColors(): boolean {
  return window.matchMedia("(forced-colors: active)").matches;
}

function watchForcedColors(callback: (active: boolean) => void): void {
  const mq = window.matchMedia("(forced-colors: active)");
  mq.addEventListener("change", (e) => callback(e.matches));
}

// Apply high-contrast overrides
function applyHighContrast(): void {
  document.documentElement.dataset.contrast = "high";
}

function removeHighContrast(): void {
  delete document.documentElement.dataset.contrast;
}
```

Then in CSS, use system colors that adapt to the user's high-contrast palette:

```css
[data-contrast="high"] {
  --bg: Canvas;
  --text: CanvasText;
  --primary: LinkText;
  --border: ButtonBorder;
}

[data-contrast="high"] button {
  border: 2px solid ButtonBorder;
  background: ButtonFace;
  color: ButtonText;
}

/* Also support the media query directly for content scripts */
@media (forced-colors: active) {
  .ext-injected-panel {
    border: 2px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    forced-color-adjust: none;
  }
}
```

The `forced-color-adjust: none` declaration tells the browser your element handles high-contrast colors explicitly, preventing it from overriding your custom colors. Use it sparingly and only on elements where you have already mapped to system color keywords.

Combine with `prefers-contrast: more` for users who want higher contrast without full forced-colors mode:

```css
@media (prefers-contrast: more) {
  :root {
    --text: #000000;
    --bg: #ffffff;
    --border: #000000;
  }
}
```

---

## Summary {#summary}

| # | Pattern | Key Mechanism | Use Case |
|---|---------|---------------|----------|
| 1 | System theme detection | `prefers-color-scheme` media query | Follow OS light/dark setting |
| 2 | User-selectable theme | `chrome.storage.sync` + `onChanged` | Persist explicit user preference |
| 3 | CSS custom properties | `setProperty` on `:root` | Token-based theme engine |
| 4 | Page theme injection | Content script `<style>` + CSS filters | Dark mode for any website |
| 5 | Cross-surface sync | `storage.session` + `tabs.sendMessage` | Unified theme everywhere |
| 6 | Per-site overrides | Domain-keyed storage map | Exclude or customize per site |
| 7 | Dynamic icon switching | `chrome.action.setIcon` | Toolbar icon visibility |
| 8 | High contrast support | `forced-colors` + system color keywords | Accessibility compliance |
