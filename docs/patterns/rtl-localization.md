---
layout: default
title: "Chrome Extension Rtl Localization — Best Practices"
description: "Implement right-to-left (RTL) localization support for Chrome extensions targeting Arabic, Hebrew, and other RTL languages."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/rtl-localization/"
---

# RTL and Advanced Localization Patterns

## Overview

Supporting right-to-left (RTL) languages like Arabic, Hebrew, and Persian in a Chrome extension goes far beyond translating strings. Layouts must mirror, text direction must adapt per-element, and formatting rules for dates, numbers, and plurals vary dramatically across locales. Chrome's `chrome.i18n` API handles basic message substitution, but advanced localization -- dynamic locale switching, ICU plural rules, bidirectional text in mixed content -- requires deliberate architecture. This guide covers eight patterns for building extensions that work correctly in every script direction and locale.

---

## RTL Language Reference

| Language | Code | Script Direction | Plural Categories | Calendar |
|----------|------|-----------------|-------------------|----------|
| Arabic | `ar` | RTL | zero, one, two, few, many, other | Hijri / Gregorian |
| Hebrew | `he` | RTL | one, two, other | Hebrew / Gregorian |
| Persian | `fa` | RTL | one, other | Persian / Gregorian |
| Urdu | `ur` | RTL | one, other | Gregorian |
| English | `en` | LTR | one, other | Gregorian |
| Japanese | `ja` | LTR | other | Gregorian |

---

## Pattern 1: RTL Layout Detection and CSS Logical Properties

The foundation of RTL support is detecting the active direction and using CSS logical properties instead of physical ones. Logical properties automatically flip in RTL contexts:

```ts
// lib/rtl-detection.ts

export function getDocumentDirection(): "ltr" | "rtl" {
  // Check the extension's own UI locale first
  const uiLocale = chrome.i18n.getUILanguage();
  return isRtlLocale(uiLocale) ? "rtl" : "ltr";
}

export function isRtlLocale(locale: string): boolean {
  const rtlLangs = new Set([
    "ar", "arc", "dv", "fa", "ha", "he", "khw", "ks",
    "ku", "ps", "ur", "yi",
  ]);
  const lang = locale.split("-")[0].toLowerCase();
  return rtlLangs.has(lang);
}

// Apply direction to the extension popup or options page
export function applyDirection(root: HTMLElement = document.documentElement): void {
  const dir = getDocumentDirection();
  root.setAttribute("dir", dir);
  root.setAttribute("lang", chrome.i18n.getUILanguage());
}
```

```css
/* popup.css -- use logical properties throughout */

.sidebar {
  /* Physical (breaks in RTL): */
  /* margin-left: 16px; padding-right: 8px; border-left: 2px solid; */

  /* Logical (works in both directions): */
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  border-inline-start: 2px solid var(--border-color);
}

.container {
  display: flex;
  /* flex-direction: row automatically reverses in RTL when dir="rtl" is set */
}

.icon-with-text {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Gap works correctly in both directions */
}

.notification-badge {
  position: absolute;
  /* Physical (breaks in RTL): */
  /* top: -4px; right: -4px; */

  /* Logical: */
  inset-block-start: -4px;
  inset-inline-end: -4px;
}

.search-input {
  /* Text alignment follows direction automatically when using: */
  text-align: start;
  /* Width and block-size are direction-agnostic: */
  inline-size: 100%;
}
```

The key rule: replace every `left`/`right` with `inline-start`/`inline-end`, and every `top`/`bottom` with `block-start`/`block-end`. Flexbox and grid layouts reverse automatically when the `dir` attribute is set.

---

## Pattern 2: Bidirectional Text Handling in Extension UI

Mixed-direction content -- such as an Arabic sentence containing an English brand name or a URL -- requires explicit Unicode bidirectional controls and the `dir="auto"` attribute:

```ts
// lib/bidi-text.ts

/**
 * Wrap user-generated content in a bidi-isolated span.
 * This prevents directional "leaking" into surrounding text.
 */
export function bidiIsolate(text: string, dir?: "ltr" | "rtl" | "auto"): string {
  const direction = dir ?? "auto";
  return `<span dir="${direction}" style="unicode-bidi: isolate;">${escapeHtml(text)}</span>`;
}

/**
 * Detect the dominant direction of a string by checking
 * for the presence of RTL Unicode characters.
 */
export function detectTextDirection(text: string): "ltr" | "rtl" {
  // Match RTL characters: Arabic, Hebrew, Thaana, NKo, Syriac, etc.
  const rtlPattern = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  const ltrPattern = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

  const rtlMatch = text.match(new RegExp(rtlPattern.source, "g"));
  const ltrMatch = text.match(new RegExp(ltrPattern.source, "g"));

  const rtlCount = rtlMatch?.length ?? 0;
  const ltrCount = ltrMatch?.length ?? 0;

  return rtlCount > ltrCount ? "rtl" : "ltr";
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
```

```ts
// popup.ts -- rendering a list with mixed-direction content

interface ListItem {
  title: string;     // May be in any language
  url: string;       // Always LTR
  timestamp: number;
}

function renderItem(item: ListItem): string {
  return `
    <li class="item" dir="auto">
      <span class="item-title">${bidiIsolate(item.title)}</span>
      <span class="item-url" dir="ltr">${escapeHtml(item.url)}</span>
      <time class="item-time">${formatTime(item.timestamp)}</time>
    </li>
  `;
}
```

Always mark URLs, file paths, code snippets, and numbers as `dir="ltr"` -- they are inherently left-to-right regardless of the surrounding text direction. Use `unicode-bidi: isolate` on user-generated content to prevent directional bleeding.

---

## Pattern 3: Dynamic Locale Switching Without Restart

Chrome's `chrome.i18n.getMessage()` is bound to the browser's UI locale at startup. To let users switch languages within the extension without restarting, maintain your own message catalog:

```ts
// lib/locale-manager.ts

type MessageCatalog = Record<string, { message: string; placeholders?: Record<string, { content: string }> }>;

class LocaleManager {
  private catalogs: Map<string, MessageCatalog> = new Map();
  private activeLocale: string;
  private listeners: Set<(locale: string) => void> = new Set();

  constructor(defaultLocale: string = "en") {
    this.activeLocale = defaultLocale;
  }

  async loadLocale(locale: string): Promise<void> {
    if (this.catalogs.has(locale)) return;

    // Load from the extension's _locales directory via fetch
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Locale ${locale} not found`);
      const catalog: MessageCatalog = await response.json();
      this.catalogs.set(locale, catalog);
    } catch (err) {
      console.warn(`Failed to load locale "${locale}":`, err);
    }
  }

  async switchLocale(locale: string): Promise<void> {
    await this.loadLocale(locale);
    if (!this.catalogs.has(locale)) {
      throw new Error(`Locale "${locale}" is not available`);
    }

    this.activeLocale = locale;
    await chrome.storage.local.set({ preferredLocale: locale });

    // Update document direction
    const dir = isRtlLocale(locale) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);

    // Notify all listeners
    for (const listener of this.listeners) {
      listener(locale);
    }
  }

  getMessage(key: string, substitutions?: string[]): string {
    const catalog = this.catalogs.get(this.activeLocale);
    const entry = catalog?.[key];
    if (!entry) {
      // Fall back to chrome.i18n for the browser locale
      return chrome.i18n.getMessage(key, substitutions) || key;
    }

    let msg = entry.message;
    if (substitutions && entry.placeholders) {
      for (const [name, { content }] of Object.entries(entry.placeholders)) {
        // content is like "$1", "$2", etc.
        const index = parseInt(content.replace("$", ""), 10) - 1;
        if (substitutions[index] !== undefined) {
          msg = msg.replace(new RegExp(`\\$${name}\\$`, "gi"), substitutions[index]);
        }
      }
    }
    return msg;
  }

  onLocaleChange(listener: (locale: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getActiveLocale(): string {
    return this.activeLocale;
  }
}

export const localeManager = new LocaleManager();
```

```ts
// popup.ts -- re-render UI on locale change

import { localeManager } from "./lib/locale-manager";

async function init(): Promise<void> {
  const { preferredLocale } = await chrome.storage.local.get("preferredLocale");
  const locale = preferredLocale ?? chrome.i18n.getUILanguage();

  await localeManager.loadLocale("en"); // Always load fallback
  await localeManager.loadLocale(locale);
  await localeManager.switchLocale(locale);

  localeManager.onLocaleChange(() => renderUI());
  renderUI();
}

function renderUI(): void {
  document.getElementById("title")!.textContent =
    localeManager.getMessage("popup_title");
  document.getElementById("description")!.textContent =
    localeManager.getMessage("popup_description");
}

init();
```

This pattern lets users override the browser locale for just your extension. The `switchLocale` method updates `dir` and `lang` attributes and re-renders all registered UI components.

---

## Pattern 4: Pluralization and ICU Message Format

Chrome's built-in `chrome.i18n` has no plural support. For correct pluralization, use the `Intl.PluralRules` API with ICU-style message patterns:

```ts
// lib/plural.ts

type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

interface PluralMessages {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Select the correct plural form for a given count and locale.
 *
 * Example:
 *   pluralize("en", 5, {
 *     one: "$count item selected",
 *     other: "$count items selected",
 *   })
 *   // => "5 items selected"
 */
export function pluralize(
  locale: string,
  count: number,
  messages: PluralMessages
): string {
  const rules = new Intl.PluralRules(locale);
  const category = rules.select(count) as PluralCategory;

  const template = messages[category] ?? messages.other;
  return template.replace(/\$count/g, count.toLocaleString(locale));
}

/**
 * Parse an ICU-style plural message string.
 *
 * Input:  "{count, plural, one {# item} other {# items}}"
 * Output: PluralMessages object
 */
export function parseICUPlural(pattern: string): PluralMessages {
  const messages: Partial<PluralMessages> = {};

  const bodyMatch = pattern.match(/\{[^,]+,\s*plural\s*,\s*(.*)\}\s*$/s);
  if (!bodyMatch) return { other: pattern };

  const body = bodyMatch[1];
  const categoryPattern = /(zero|one|two|few|many|other)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = categoryPattern.exec(body)) !== null) {
    const category = match[1] as PluralCategory;
    messages[category] = match[2].replace(/#/g, "$count");
  }

  return { other: pattern, ...messages };
}
```

```ts
// Usage in UI rendering

const tabMessages: PluralMessages = {
  zero: "No tabs open",
  one: "$count tab open",
  two: "$count tabs open",       // Used in Arabic for exactly 2
  few: "$count tabs open",       // Arabic: 3-10
  many: "$count tabs open",      // Arabic: 11-99
  other: "$count tabs open",
};

// English: "1 tab open", "5 tabs open"
// Arabic:  "tab" adjusts for zero/one/two/few/many/other
const text = pluralize("ar", 3, tabMessages);
```

Arabic has six plural categories; English has two. Always define at least `one` and `other`. The `Intl.PluralRules` API is available in service workers and content scripts across all modern browsers.

---

## Pattern 5: Date and Number Formatting Per Locale

Use the `Intl` APIs consistently for all formatted output. Avoid hardcoded format strings:

```ts
// lib/locale-format.ts

export class LocaleFormatter {
  constructor(private locale: string) {}

  formatDate(date: Date | number, style: "short" | "medium" | "long" = "medium"): string {
    const options: Intl.DateTimeFormatOptions =
      style === "short"
        ? { month: "numeric", day: "numeric" }
        : style === "long"
          ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
          : { year: "numeric", month: "short", day: "numeric" };

    return new Intl.DateTimeFormat(this.locale, options).format(date);
  }

  formatRelativeTime(date: Date | number): string {
    const now = Date.now();
    const target = typeof date === "number" ? date : date.getTime();
    const diffMs = target - now;
    const diffSec = Math.round(diffMs / 1000);

    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });

    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
    if (Math.abs(diffSec) < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (Math.abs(diffSec) < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    return rtf.format(Math.round(diffSec / 86400), "day");
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const formatted = this.formatNumber(size, {
      maximumFractionDigits: 1,
    });
    return `${formatted} ${units[unitIndex]}`;
  }

  formatPercent(value: number): string {
    return this.formatNumber(value, {
      style: "percent",
      maximumFractionDigits: 1,
    });
  }

  formatCurrency(value: number, currency: string): string {
    return this.formatNumber(value, { style: "currency", currency });
  }
}
```

```ts
// Usage

const fmt = new LocaleFormatter("ar-SA");
fmt.formatDate(new Date());            // "٦ مارس ٢٠٢٦"
fmt.formatNumber(1234567.89);          // "١٬٢٣٤٬٥٦٧٫٨٩"
fmt.formatRelativeTime(Date.now() - 3600000); // "قبل ساعة واحدة"
fmt.formatFileSize(1536000);           // "١٫٥ MB"
fmt.formatPercent(0.847);              // "٨٤٫٧٪"

const fmtEn = new LocaleFormatter("en-US");
fmtEn.formatDate(new Date());         // "Mar 6, 2026"
fmtEn.formatCurrency(29.99, "USD");   // "$29.99"
```

Never concatenate formatted numbers with hardcoded text -- different locales use different decimal separators, digit grouping, and numeral systems (Arabic-Indic vs. Western Arabic).

---

## Pattern 6: RTL-Aware Icon and Image Mirroring

Some icons need to be mirrored in RTL layouts (arrows, progress indicators), while others must remain unchanged (play buttons, checkmarks, clocks). Define a mirroring policy:

```css
/* icon-mirroring.css */

/* Icons that SHOULD mirror in RTL */
[dir="rtl"] .icon-arrow-forward,
[dir="rtl"] .icon-arrow-back,
[dir="rtl"] .icon-reply,
[dir="rtl"] .icon-redo,
[dir="rtl"] .icon-undo,
[dir="rtl"] .icon-open-external,
[dir="rtl"] .icon-chevron-start,
[dir="rtl"] .icon-indent,
[dir="rtl"] .icon-sort,
[dir="rtl"] .icon-list-bullet {
  transform: scaleX(-1);
}

/* Icons that should NOT mirror (keep this list explicit for documentation): */
/* .icon-play, .icon-pause, .icon-check, .icon-close, .icon-search,
   .icon-clock, .icon-star, .icon-heart, .icon-trash, .icon-download,
   .icon-upload, .icon-volume, .icon-music, .icon-camera */
```

```ts
// lib/icon-manager.ts

const MIRRORED_ICONS = new Set([
  "arrow-forward", "arrow-back", "reply", "redo", "undo",
  "open-external", "chevron-start", "indent", "sort", "list-bullet",
]);

/**
 * Returns the correct icon path, using a mirrored variant if available
 * and the current locale is RTL.
 */
export function getIconPath(
  iconName: string,
  locale: string,
  basePath: string = "icons"
): string {
  if (isRtlLocale(locale) && MIRRORED_ICONS.has(iconName)) {
    // Prefer a pre-rendered RTL variant if it exists
    return `${basePath}/rtl/${iconName}.svg`;
  }
  return `${basePath}/${iconName}.svg`;
}
```

For CSS-based mirroring, `transform: scaleX(-1)` is the simplest approach. For complex icons or illustrations with embedded text, provide separate RTL asset files instead of CSS transforms. SVG icons with `text` elements will render mirrored text if you use `scaleX(-1)`, which is rarely correct.

---

## Pattern 7: Testing RTL Layouts in Extensions

Automated testing for RTL requires checking both visual layout and text rendering. Set up a testing harness that toggles direction:

```ts
// tests/rtl-layout.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

function createDOM(dir: "ltr" | "rtl" = "ltr"): JSDOM {
  return new JSDOM(
    `<!DOCTYPE html>
     <html dir="${dir}" lang="${dir === "rtl" ? "ar" : "en"}">
       <head><style>
         .container { display: flex; }
         .sidebar { margin-inline-start: 16px; padding-inline-end: 8px; }
       </style></head>
       <body></body>
     </html>`,
    { pretendToBeVisual: true }
  );
}

describe("RTL layout", () => {
  it("should set dir attribute on document element", () => {
    const dom = createDOM("rtl");
    expect(dom.window.document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("should detect RTL locales correctly", () => {
    const rtlLocales = ["ar", "ar-SA", "he", "fa", "ur", "he-IL"];
    const ltrLocales = ["en", "en-US", "fr", "ja", "zh-CN", "de"];

    for (const locale of rtlLocales) {
      expect(isRtlLocale(locale)).toBe(true);
    }
    for (const locale of ltrLocales) {
      expect(isRtlLocale(locale)).toBe(false);
    }
  });

  it("should isolate bidirectional text", () => {
    const html = bidiIsolate("Hello world");
    expect(html).toContain('dir="auto"');
    expect(html).toContain("unicode-bidi: isolate");
  });
});

describe("Pluralization", () => {
  it("should select correct plural category for Arabic", () => {
    const messages = {
      zero: "no files",
      one: "file",
      two: "two files",
      few: "$count files",
      many: "$count files",
      other: "$count files",
    };

    expect(pluralize("ar", 0, messages)).toBe("no files");
    expect(pluralize("ar", 1, messages)).toBe("file");
    expect(pluralize("ar", 2, messages)).toBe("two files");
    expect(pluralize("ar", 5, messages)).toContain("5");
  });

  it("should handle English two-form plurals", () => {
    const messages = { one: "$count item", other: "$count items" };
    expect(pluralize("en", 1, messages)).toBe("1 item");
    expect(pluralize("en", 42, messages)).toBe("42 items");
  });
});
```

```ts
// tests/visual-rtl-check.ts
// A manual/visual testing helper for extension popup

export function injectRTLToggle(): void {
  const toggle = document.createElement("button");
  toggle.textContent = "Toggle RTL/LTR";
  toggle.style.cssText =
    "position:fixed;bottom:8px;right:8px;z-index:99999;padding:4px 8px;font-size:11px;";

  toggle.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("dir") ?? "ltr";
    const next = current === "ltr" ? "rtl" : "ltr";
    html.setAttribute("dir", next);
    html.setAttribute("lang", next === "rtl" ? "ar" : "en");
    toggle.textContent = `Dir: ${next.toUpperCase()}`;
  });

  document.body.appendChild(toggle);
}

// Add to popup in dev mode:
// if (import.meta.env.DEV) injectRTLToggle();
```

The visual toggle is invaluable during development -- inject it only in dev builds and flip between LTR and RTL to catch layout issues interactively. In CI, use the unit tests to verify direction detection, plural selection, and bidi isolation logic.

---

## Pattern 8: Locale-Specific Content Script Behavior

Content scripts that inject UI into web pages must respect both the page's locale and the extension's locale, which may differ:

```ts
// content-script.ts

interface LocaleContext {
  pageDir: "ltr" | "rtl";
  pageLocale: string;
  extensionLocale: string;
  extensionDir: "ltr" | "rtl";
}

function detectLocaleContext(): LocaleContext {
  // Detect the host page's direction
  const htmlEl = document.documentElement;
  const pageDir = (htmlEl.getAttribute("dir") as "ltr" | "rtl") ??
    (getComputedStyle(htmlEl).direction as "ltr" | "rtl") ??
    "ltr";
  const pageLocale = htmlEl.getAttribute("lang") ?? navigator.language;

  // The extension's own locale
  const extensionLocale = chrome.i18n.getUILanguage();
  const extensionDir = isRtlLocale(extensionLocale) ? "rtl" : "ltr";

  return { pageDir, pageLocale, extensionLocale, extensionDir };
}

/**
 * Create an isolated container for extension UI that uses the
 * extension's locale and direction, regardless of the host page.
 */
function createExtensionContainer(): HTMLElement {
  const ctx = detectLocaleContext();

  const shadow = document.createElement("div");
  shadow.id = "ext-container";

  // Use Shadow DOM to isolate styles
  const shadowRoot = shadow.attachShadow({ mode: "closed" });

  const wrapper = document.createElement("div");
  wrapper.setAttribute("dir", ctx.extensionDir);
  wrapper.setAttribute("lang", ctx.extensionLocale);

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      inset-block-start: 16px;
      inset-inline-end: 16px;
      z-index: 2147483647;
    }
    .ext-panel {
      direction: ${ctx.extensionDir};
      font-family: system-ui, sans-serif;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      inline-size: 320px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .ext-panel * {
      text-align: start;
    }
  `;

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(wrapper);
  document.body.appendChild(shadow);

  return wrapper;
}

// Adapt injected content to the host page's direction when appropriate
function injectInlineAnnotation(element: HTMLElement, text: string): void {
  const ctx = detectLocaleContext();
  const annotation = document.createElement("span");

  // Use the page's direction for inline annotations that sit within page content
  annotation.setAttribute("dir", ctx.pageDir);
  annotation.style.cssText = `
    display: inline;
    unicode-bidi: isolate;
    margin-inline-start: 4px;
    color: #1976d2;
    font-size: 0.85em;
  `;
  annotation.textContent = text;
  element.appendChild(annotation);
}
```

The critical distinction: extension UI panels (floating toolbars, sidebars) should follow the extension's locale, while inline annotations inserted into page content should follow the page's locale. Shadow DOM isolates the extension's styles and direction from the host page's CSS.

---

## Cross-References

- [Advanced i18n Patterns](advanced-i18n.md) -- Message catalogs, fallback chains, and locale negotiation
- [Internationalization Guide](../guides/internationalization.md) -- Setting up `_locales` and `chrome.i18n` basics
