---
layout: default
title: "Chrome Extension Font Settings Api — Best Practices"
description: "Access and modify user font settings with the Font Settings API."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/font-settings-api/"
---

# Font Settings API in Chrome Extensions

## Overview

The Chrome Font Settings API (`chrome.fontSettings`) enables extensions to read and modify user font preferences at the browser level. This guide covers eight practical patterns from basic font retrieval to accessibility-focused font injection.

---

## Required Permission

```json
{
  "name": "Font Settings Extension",
  "version": "1.0.0",
  "permissions": ["fontSettings"],
  "manifest_version": 3
}
```

---

## Pattern 1: Font Settings API Basics

The API supports six generic font families: `standard`, `sansserif`, `serif`, `fixed`, `cursive`, and `fantasy`.

### Getting the Current Font

```ts
// background.ts or options.ts
interface FontSettings {
  fontId: string;
  genericFamily: string;
  script?: string;
}

async function getCurrentFont(
  genericFamily: string,
  script?: string
): Promise<FontSettings> {
  const details: { genericFamily: string; script?: string } = { genericFamily };
  if (script) details.script = script;
  return await chrome.fontSettings.getFont(details);
}

// Usage
const sansSerifFont = await getCurrentFont("sansserif");
console.log(`Current sans-serif: ${sansSerifFont.fontId}`);
```

### Setting a Font

```ts
async function setFont(
  genericFamily: string,
  fontId: string,
  script?: string
): Promise<void> {
  const details: { genericFamily: string; fontId: string; script?: string } = {
    genericFamily,
    fontId,
  };
  if (script) details.script = script;
  await chrome.fontSettings.setFont(details);
}

// Usage
await setFont("standard", "Open Sans");
await setFont("fixed", "Fira Code");
```

---

## Pattern 2: Reading Current Font Configuration

### Getting All Installed Fonts

```ts
interface FontDescriptor {
  fontId: string;
  displayName: string;
  localizedName?: string;
}

async function getInstalledFonts(): Promise<FontDescriptor[]> {
  return await chrome.fontSettings.getFontList();
}

// Populate dropdown
async function populateFontDropdown(dropdownId: string): Promise<void> {
  const fonts = await getInstalledFonts();
  const dropdown = document.getElementById(dropdownId) as HTMLSelectElement;
  fonts.sort((a, b) => a.displayName.localeCompare(b.displayName));
  dropdown.innerHTML = '<option value="">-- Select Font --</option>';
  for (const font of fonts) {
    const option = document.createElement("option");
    option.value = font.fontId;
    option.textContent = font.displayName;
    dropdown.appendChild(option);
  }
}
```

### Loading All Font Preferences

```ts
// storage/fontConfig.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const fontConfigSchema = defineSchema({
  fontPreferences: {
    type: "object",
    default: { standard: "", sansserif: "", serif: "", fixed: "" },
  },
  minimumFontSize: { type: "number", default: 0 },
});

const fontStorage = createStorage(fontConfigSchema);

async function loadAllFontPreferences(): Promise<Record<string, string>> {
  const families = ["standard", "sansserif", "serif", "fixed", "cursive", "fantasy"];
  const preferences: Record<string, string> = {};
  
  for (const family of families) {
    try {
      const font = await getCurrentFont(family);
      preferences[family] = font.fontId;
    } catch {
      preferences[family] = "";
    }
  }
  
  await fontStorage.set("fontPreferences", preferences);
  return preferences;
}
```

### Minimum Font Size

```ts
async function getMinimumFontSize(): Promise<number> {
  const result = await chrome.fontSettings.getMinimumFontSize();
  return result.pixelSize;
}

async function setMinimumFontSize(pixelSize: number): Promise<void> {
  await chrome.fontSettings.setMinimumFontSize({ pixelSize });
}
```

---

## Pattern 3: Font Override by Script/Language

Script codes: `Jpan` (Japanese), `Hang` (Korean), `Hans` (Simplified Chinese), `Hant` (Traditional Chinese), `Arab` (Arabic), `Latn` (Latin).

### Setting Script-Specific Fonts

```ts
const SCRIPT_CODES = {
  JAPANESE: "Jpan",
  KOREAN: "Hang",
  CHINESE_SIMPLIFIED: "Hans",
  CHINESE_TRADITIONAL: "Hant",
} as const;

async function setJapaneseFont(fontId: string): Promise<void> {
  await setFont("standard", fontId, SCRIPT_CODES.JAPANESE);
  await setFont("sansserif", fontId, SCRIPT_CODES.JAPANESE);
}

async function configureMultilingualFonts(): Promise<void> {
  await setJapaneseFont("Noto Sans JP");
  await setFont("sansserif", "Noto Sans KR", SCRIPT_CODES.KOREAN);
  await setFont("sansserif", "Noto Sans SC", SCRIPT_CODES.CHINESE_SIMPLIFIED);
  await setFont("sansserif", "Noto Sans TC", SCRIPT_CODES.CHINESE_TRADITIONAL);
}
```

### Getting Script Fonts

```ts
const AVAILABLE_SCRIPTS = [
  { code: "Latn", name: "Latin" },
  { code: "Jpan", name: "Japanese" },
  { code: "Hang", name: "Korean" },
  { code: "Hans", name: "Chinese Simplified" },
];

async function getAllScriptFonts(genericFamily: string): Promise<Map<string, string>> {
  const fontMap = new Map<string, string>();
  for (const script of AVAILABLE_SCRIPTS) {
    try {
      const font = await getCurrentFont(genericFamily, script.code);
      fontMap.set(script.code, font.fontId);
    } catch { /* ignore */ }
  }
  return fontMap;
}
```

---

## Pattern 4: Font Preferences UI

### Options Page HTML

```html
<!-- options.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Font Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <main class="options-container">
    <h1>Font Preferences</h1>
    
    <section>
      <h2>Font Families</h2>
      <div class="font-row">
        <label for="font-standard">Standard:</label>
        <select id="font-standard" data-family="standard"></select>
      </div>
      <div class="font-row">
        <label for="font-sansserif">Sans-Serif:</label>
        <select id="font-sansserif" data-family="sansserif"></select>
      </div>
    </section>
    
    <section>
      <h2>Live Preview</h2>
      <div id="font-preview" class="preview-box">
        <p>The quick brown fox jumps over the lazy dog.</p>
        <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
      </div>
    </section>
    
    <section class="actions">
      <button id="reset-defaults">Reset to Defaults</button>
      <button id="save-settings">Save Settings</button>
    </section>
  </main>
  <script src="options.js"></script>
</body>
</html>
```

### Options Page TypeScript

```ts
// options.ts
import { fontStorage } from "./storage/fontConfig";

const FAMILIES = ["standard", "sansserif", "serif", "fixed", "cursive", "fantasy"] as const;

async function init(): Promise<void> {
  const fonts = await getInstalledFonts();
  populateDropdowns(fonts);
  
  const prefs = await fontStorage.get();
  applyPreferences(prefs.fontPreferences);
  
  setupListeners();
}

function populateDropdowns(fonts: FontDescriptor[]): void {
  for (const family of FAMILIES) {
    const select = document.getElementById(`font-${family}`) as HTMLSelectElement;
    select.innerHTML = '<option value="">System Default</option>';
    for (const font of fonts.sort((a, b) => a.displayName.localeCompare(b.displayName))) {
      const opt = document.createElement("option");
      opt.value = font.fontId;
      opt.textContent = font.displayName;
      select.appendChild(opt);
    }
  }
}

function applyPreferences(fonts: Record<string, string>): void {
  for (const [family, fontId] of Object.entries(fonts)) {
    const select = document.getElementById(`font-${family}`) as HTMLSelectElement;
    if (select && fontId) select.value = fontId;
  }
  updatePreview();
}

function setupListeners(): void {
  document.getElementById("save-settings")?.addEventListener("click", saveSettings);
  document.getElementById("reset-defaults")?.addEventListener("click", resetDefaults);
  
  for (const family of FAMILIES) {
    document.getElementById(`font-${family}`)?.addEventListener("change", updatePreview);
  }
}

async function saveSettings(): Promise<void> {
  const fonts: Record<string, string> = {};
  for (const family of FAMILIES) {
    const select = document.getElementById(`font-${family}`) as HTMLSelectElement;
    fonts[family] = select?.value || "";
  }
  
  await fontStorage.set("fonts", fonts);
  
  for (const [family, fontId] of Object.entries(fonts)) {
    if (fontId) await setFont(family, fontId);
  }
  
  showStatus("Settings saved!", "success");
}

async function resetDefaults(): Promise<void> {
  if (!confirm("Reset to system defaults?")) return;
  
  await fontStorage.set("fonts", { standard: "", sansserif: "", serif: "", fixed: "", cursive: "", fantasy: "" });
  
  const fonts = await getInstalledFonts();
  populateDropdowns(fonts);
  updatePreview();
  showStatus("Reset complete", "success");
}

function updatePreview(): void {
  const preview = document.getElementById("font-preview") as HTMLElement;
  const standard = (document.getElementById("font-standard") as HTMLSelectElement)?.value;
  preview.style.fontFamily = standard || "inherit";
}

function showStatus(message: string, type: string): void {
  const status = document.getElementById("status-message");
  if (status) {
    status.textContent = message;
    status.className = `status-${type}`;
  }
}

document.addEventListener("DOMContentLoaded", init);
```

---

## Pattern 5: Per-Site Font Override via Content Script

### Storage Schema

```ts
// storage/siteFonts.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const siteFontsSchema = defineSchema({
  siteFontRules: { type: "object", default: {} },
  globalOverrideEnabled: { type: "boolean", default: false },
});

export const siteFontStorage = createStorage(siteFontsSchema);

export interface SiteFontRule {
  domain: string;
  fontFamily: string;
  fontSize?: number;
  enabled: boolean;
}
```

### Content Script

```ts
// content-scripts/fontOverride.ts
import { siteFontStorage } from "../storage/siteFonts";

async function applySiteFontOverrides(): Promise<void> {
  const { siteFontRules, globalOverrideEnabled } = await siteFontStorage.get();
  if (!globalOverrideEnabled) return;
  
  const domain = window.location.hostname;
  const rules = Object.values(siteFontRules).filter(
    (r: SiteFontRule) => r.enabled && domain.includes(r.domain)
  );
  
  for (const rule of rules) {
    injectFontOverride(rule);
  }
}

function injectFontOverride(rule: SiteFontRule): void {
  const style = document.createElement("style");
  style.id = "font-override-style";
  
  const fontFamily = rule.fontFamily.includes(" ") ? `"${rule.fontFamily}"` : rule.fontFamily;
  const fontSize = rule.fontSize ? `font-size: ${rule.fontSize}px !important;` : "";
  
  style.textContent = `
    body, body * { font-family: ${fontFamily} !important; ${fontSize} }
  `;
  document.head.appendChild(style);
}

function removeOverrides(): void {
  document.getElementById("font-override-style")?.remove();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "UPDATE_FONTS") {
    removeOverrides().then(applySiteFontOverrides);
  }
});

document.addEventListener("DOMContentLoaded", applySiteFontOverrides);
```

### Custom Fonts with @font-face

```ts
function loadCustomFonts(): void {
  const CUSTOM_FONTS = [
    { family: "MyFont", url: "fonts/MyFont-Regular.woff2", weight: "normal" },
    { family: "MyFont", url: "fonts/MyFont-Bold.woff2", weight: "bold" },
  ];
  
  const style = document.createElement("style");
  style.textContent = CUSTOM_FONTS.map(f => 
    `@font-face { font-family: '${f.family}'; src: url('${f.url}'); font-weight: ${f.weight}; }`
  ).join("\n");
  document.head.appendChild(style);
}
```

---

## Pattern 6: Reading Mode with Custom Typography

### Storage

```ts
// storage/readingMode.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const readingModeSchema = defineSchema({
  enabled: { type: "boolean", default: false },
  fontFamily: { type: "string", default: "Georgia" },
  fontSize: { type: "number", default: 18 },
  lineHeight: { type: "number", default: 1.6 },
  maxWidth: { type: "number", default: 680 },
  textColor: { type: "string", default: "#333333" },
  backgroundColor: { type: "string", default: "#fafafa" },
});

export const readingModeStorage = createStorage(readingModeSchema);
```

### Content Script

```ts
// content-scripts/readingMode.ts
import { readingModeStorage } from "../storage/readingMode";

let originalContent: string | null = null;

async function toggleReadingMode(): Promise<void> {
  const settings = await readingModeStorage.get();
  
  if (settings.enabled) {
    disableReadingMode();
  } else {
    enableReadingMode(settings);
  }
}

function enableReadingMode(settings: typeof readingModeSchema): void {
  originalContent = document.body.innerHTML;
  
  const container = document.createElement("div");
  container.id = "reading-container";
  container.style.cssText = `
    max-width: ${settings.maxWidth}px; margin: 0 auto; padding: 40px 20px;
    font-family: ${settings.fontFamily}, serif; font-size: ${settings.fontSize}px;
    line-height: ${settings.lineHeight}; color: ${settings.textColor};
    background: ${settings.backgroundColor};
  `;
  
  // Extract main content
  const main = document.querySelector("article") || document.querySelector("main") || document.body;
  const content = main.cloneNode(true) as Element;
  content.querySelectorAll("script, style, nav, footer, aside").forEach(el => el.remove());
  container.innerHTML = content.innerHTML;
  
  document.body.innerHTML = "";
  document.body.appendChild(container);
  document.body.classList.add("reading-mode");
  
  readingModeStorage.set("enabled", true);
}

function disableReadingMode(): void {
  if (originalContent) {
    document.body.innerHTML = originalContent;
    document.body.classList.remove("reading-mode");
  }
  readingModeStorage.set("enabled", false);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE_READING_MODE") toggleReadingMode();
});

// Init
readingModeStorage.get("enabled").then(enabled => {
  if (enabled) readingModeStorage.get().then(enableReadingMode);
});
```

### Background Script for Toggle

```ts
// background.ts
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_READING_MODE" });
  }
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "toggle-reading-mode") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_READING_MODE" });
  }
});
```

---

## Pattern 7: Font Change Monitoring

```ts
// background.ts / listeners/fontChangeListener.ts
import { fontStorage } from "../storage/fontConfig";

interface FontChangedEvent {
  fontId: string;
  genericFamily: string;
  script?: string;
}

function initFontListeners(): void {
  chrome.fontSettings.onFontChanged.addListener((event: FontChangedEvent) => {
    console.log("Font changed:", event.genericFamily, "->", event.fontId);
    
    fontStorage.get("fonts").then(prefs => {
      const fonts = { ...prefs.fonts };
      fonts[event.genericFamily] = event.fontId;
      fontStorage.set("fonts", fonts);
    });
    
    notifyViews("FONT_CHANGED", { family: event.genericFamily, font: event.fontId });
  });
  
  chrome.fontSettings.onMinimumFontSizeChanged.addListener((event) => {
    console.log("Min font size changed:", event.pixelSize);
    fontStorage.set("minimumFontSize", event.pixelSize);
    notifyViews("MIN_FONT_SIZE_CHANGED", { pixelSize: event.pixelSize });
  });
}

function notifyViews(type: string, data: unknown): void {
  chrome.runtime.sendMessage({ type, data }).catch(() => {});
}

// Fallback polling if listeners fail
let pollInterval: number | null = null;

function startPolling(): void {
  if (pollInterval) return;
  
  let lastFonts: Record<string, string> = {};
  loadAllFontPreferences().then(f => { lastFonts = f; });
  
  pollInterval = window.setInterval(async () => {
    const current = await loadAllFontPreferences();
    for (const [family, font] of Object.entries(current)) {
      if (lastFonts[family] !== font) {
        notifyViews("FONT_CHANGED", { family, font });
      }
    }
    lastFonts = current;
  }, 5000);
}
```

---

## Pattern 8: Accessibility Font Patterns

### Dyslexia-Friendly Mode

```ts
// content-scripts/dyslexiaFont.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const dyslexiaSchema = defineSchema({
  enabled: { type: "boolean", default: false },
  fontSize: { type: "number", default: 18 },
  letterSpacing: { type: "number", default: 0.1 },
});

export const dyslexiaStorage = createStorage(dyslexiaSchema);

const DYSLEXIA_FONTS = ["OpenDyslexic", "Comic Sans MS", "Arial"];

async function applyDyslexiaMode(): Promise<void> {
  const s = await dyslexiaStorage.get();
  if (!s.enabled) return;
  
  const style = document.createElement("style");
  style.id = "dyslexia-style";
  const fonts = DYSLEXIA_FONTS.map(f => `'${f}'`).join(", ");
  
  style.textContent = `
    body, body * { font-family: ${fonts}, sans-serif !important; }
    body { font-size: ${s.fontSize}px !important; letter-spacing: ${s.letterSpacing}em !important; line-height: 1.8 !important; }
    p, li { max-width: 60ch !important; }
  `;
  document.head.appendChild(style);
}

function removeDyslexiaMode(): void {
  document.getElementById("dyslexia-style")?.remove();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE_DYSLEXIA") {
    document.getElementById("dyslexia-style") ? removeDyslexiaMode() : applyDyslexiaMode();
  }
});
```

### High Readability Mode

```ts
// content-scripts/highReadability.ts
const highReadabilitySchema = defineSchema({
  enabled: { type: "boolean", default: false },
  fontSize: { type: "number", default: 20 },
  lineHeight: { type: "number", default: 2.0 },
  contrast: { type: "string", default: "high" },
});

export const highReadabilityStorage = createStorage(highReadabilitySchema);

const THEMES = {
  normal: { bg: "#fafafa", text: "#333" },
  high: { bg: "#fff", text: "#000" },
  maximum: { bg: "#ffffcc", text: "#000" },
};

async function applyHighReadability(): Promise<void> {
  const s = await highReadabilityStorage.get();
  if (!s.enabled) return;
  
  const theme = THEMES[s.contrast as keyof typeof THEMES] || THEMES.high;
  const style = document.createElement("style");
  style.id = "high-readability";
  style.textContent = `
    body { background: ${theme.bg} !important; color: ${theme.text} !important; }
    body > * { max-width: 800px; margin: 0 auto; }
    body { font-size: ${s.fontSize}px !important; line-height: ${s.lineHeight} !important; }
  `;
  document.head.appendChild(style);
}
```

### System Preference Detection

```ts
function getSystemPreferences() {
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    highContrast: window.matchMedia("(prefers-contrast: more)").matches,
    darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  };
}

// Listen for changes
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", e => {
  console.log("Reduced motion:", e.matches);
});
```

---

## Summary Table

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| **1. Basics** | Read/write font preferences | `getFont()`, `setFont()` |
| **2. Configuration** | Enumerate fonts, system defaults | `getFontList()`, `getMinimumFontSize()` |
| **3. Script Override** | CJK/multilingual support | Script-specific `setFont()` |
| **4. Preferences UI** | Options page with preview | Storage + UI handlers |
| **5. Per-Site Override** | Domain-specific fonts | Content script + CSS |
| **6. Reading Mode** | Distraction-free reading | Typography settings |
| **7. Change Monitoring** | Real-time sync | `onFontChanged`, `onMinimumFontSizeChanged` |
| **8. Accessibility** | Dyslexia, high readability | Font injection + system prefs |

### Quick Reference

```ts
// Permission: "fontSettings"

// Get/set font
const font = await chrome.fontSettings.getFont({ genericFamily: "sansserif" });
await chrome.fontSettings.setFont({ genericFamily: "sansserif", fontId: "Arial" });

// All fonts
const fonts = await chrome.fontSettings.getFontList();

// Min font size
const minSize = (await chrome.fontSettings.getMinimumFontSize()).pixelSize;

// Events
chrome.fontSettings.onFontChanged.addListener(e => {});
chrome.fontSettings.onMinimumFontSizeChanged.addListener(e => {});
```

### Best Practices

1. Request only necessary permissions — `fontSettings` triggers a warning
2. Cache preferences with `@theluckystrike/webext-storage` for performance
3. Handle errors gracefully — fonts may not exist on all systems
4. Respect user preferences — don't override without consent
5. Test multilingual scripts thoroughly
6. Provide accessibility options — dyslexia mode, high contrast
