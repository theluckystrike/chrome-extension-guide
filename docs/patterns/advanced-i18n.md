---
layout: default
title: "Chrome Extension Advanced I18n — Best Practices"
description: "Advanced internationalization patterns for multi-language extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/advanced-i18n/"
---

# Advanced Internationalization Patterns

## Overview {#overview}

The [basic i18n guide](../guides/internationalization.md) covers `chrome.i18n` fundamentals. This article tackles real-world patterns: dynamic locale switching, pluralization, RTL support, formatted dates/numbers, and type-safe message keys.

---

## Pattern 1: Type-Safe Message Keys {#pattern-1-type-safe-message-keys}

Prevent typos by generating TypeScript types from your `messages.json`:

```ts
// scripts/generate-i18n-types.ts
import fs from "fs";
import path from "path";

const messages = JSON.parse(
  fs.readFileSync(
    path.resolve("_locales/en/messages.json"),
    "utf-8"
  )
);

const keys = Object.keys(messages);
const union = keys.map((k) => `  | "${k}"`).join("\n");

const output = `// Auto-generated — do not edit
export type MessageKey =
${union};

export function getMessage(key: MessageKey, substitutions?: string[]): string {
  return chrome.i18n.getMessage(key, substitutions);
}
`;

fs.writeFileSync("src/i18n.generated.ts", output);
console.log(`Generated ${keys.length} message keys`);
```

Usage:

```ts
import { getMessage } from "./i18n.generated";

// Autocomplete and compile-time checking
const name = getMessage("extensionName"); // OK
const bad = getMessage("typoHere");       // TS error
```

Add to your build:

```json
{
  "scripts": {
    "i18n:types": "ts-node scripts/generate-i18n-types.ts",
    "build": "npm run i18n:types && vite build"
  }
}
```

---

## Pattern 2: Pluralization {#pattern-2-pluralization}

Chrome's i18n has no built-in pluralization. Implement it with ICU-style patterns:

```ts
// i18n/plural.ts
type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

const PLURAL_RULES: Record<string, Intl.PluralRules> = {};

function getPluralRules(locale?: string): Intl.PluralRules {
  const lang = locale ?? chrome.i18n.getUILanguage();
  if (!PLURAL_RULES[lang]) {
    PLURAL_RULES[lang] = new Intl.PluralRules(lang);
  }
  return PLURAL_RULES[lang];
}

interface PluralMessages {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export function plural(count: number, messages: PluralMessages): string {
  const category = getPluralRules().select(count) as PluralCategory;
  const template = messages[category] ?? messages.other;
  return template.replace("{count}", String(count));
}
```

Usage:

```ts
import { plural } from "./i18n/plural";

// English: "1 tab" / "5 tabs"
const msg = plural(tabCount, {
  one: "{count} tab",
  other: "{count} tabs",
});

// Russian: proper declensions
// one: "{count} вкладка"
// few: "{count} вкладки"
// many: "{count} вкладок"
// other: "{count} вкладок"
```

---

## Pattern 3: Dynamic Locale Switching {#pattern-3-dynamic-locale-switching}

Chrome extensions use the browser's locale by default. To let users choose their own locale:

```ts
// i18n/dynamic-locale.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  userLocale: "" as string, // empty = use browser default
});

const storage = createStorage({ schema, area: "sync" });

// Load all message bundles at build time
const bundles: Record<string, Record<string, { message: string }>> = {
  en: require("../../_locales/en/messages.json"),
  es: require("../../_locales/es/messages.json"),
  fr: require("../../_locales/fr/messages.json"),
  ja: require("../../_locales/ja/messages.json"),
};

let currentLocale = chrome.i18n.getUILanguage().split("-")[0];
let currentBundle = bundles[currentLocale] ?? bundles.en;

export async function initLocale(): Promise<void> {
  const userLocale = await storage.get("userLocale");
  if (userLocale && bundles[userLocale]) {
    currentLocale = userLocale;
    currentBundle = bundles[userLocale];
  }
}

export function t(key: string, substitutions?: string[]): string {
  const entry = currentBundle[key];
  if (!entry) return chrome.i18n.getMessage(key, substitutions) || key;

  let msg = entry.message;
  if (substitutions) {
    substitutions.forEach((sub, i) => {
      msg = msg.replace(`$${i + 1}`, sub);
    });
  }
  return msg;
}

export async function setLocale(locale: string): Promise<void> {
  if (!bundles[locale]) throw new Error(`Unknown locale: ${locale}`);
  await storage.set("userLocale", locale);
  currentLocale = locale;
  currentBundle = bundles[locale];
}

export function getLocale(): string {
  return currentLocale;
}
```

---

## Pattern 4: RTL (Right-to-Left) Support {#pattern-4-rtl-right-to-left-support}

Extensions must handle RTL languages like Arabic, Hebrew, and Persian:

```ts
// i18n/rtl.ts
const RTL_LOCALES = new Set([
  "ar", "arc", "dv", "fa", "ha", "he", "khw", "ks",
  "ku", "ps", "ur", "yi",
]);

export function isRTL(locale?: string): boolean {
  const lang = (locale ?? chrome.i18n.getUILanguage()).split("-")[0];
  return RTL_LOCALES.has(lang);
}

export function getDirection(locale?: string): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}
```

Apply direction in your popup or options page:

```ts
// popup.ts
import { isRTL } from "./i18n/rtl";

document.addEventListener("DOMContentLoaded", () => {
  if (isRTL()) {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = chrome.i18n.getUILanguage();
  }
});
```

CSS patterns for RTL:

```css
/* Use logical properties instead of physical ones */
.sidebar {
  /* Bad: breaks in RTL */
  /* margin-left: 16px; */

  /* Good: works in both directions */
  margin-inline-start: 16px;
}

.icon-label {
  display: flex;
  /* Automatically reverses in RTL */
  gap: 8px;
}

/* For the rare cases where logical properties aren't enough */
[dir="rtl"] .custom-arrow {
  transform: scaleX(-1);
}
```

---

## Pattern 5: Formatted Dates and Numbers {#pattern-5-formatted-dates-and-numbers}

Use `Intl` APIs with the extension's locale for consistent formatting:

```ts
// i18n/format.ts
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const locale = chrome.i18n.getUILanguage();
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  date: Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = chrome.i18n.getUILanguage();
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatRelativeTime(date: Date): string {
  const locale = chrome.i18n.getUILanguage();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMs = date.getTime() - Date.now();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffSecs) < 60) return rtf.format(diffSecs, "second");
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  return rtf.format(diffDays, "day");
}
```

Usage:

```ts
import { formatNumber, formatDate, formatRelativeTime } from "./i18n/format";

// English: "1,234.56"  German: "1.234,56"  Arabic: "١٬٢٣٤٫٥٦"
formatNumber(1234.56);

// English: "3/6/2026"  Japanese: "2026/3/6"
formatDate(new Date());

// English: "2 hours ago"  Spanish: "hace 2 horas"
formatRelativeTime(twoHoursAgo);
```

---

## Pattern 6: DOM Localization with Data Attributes {#pattern-6-dom-localization-with-data-attributes}

Automatically translate static UI elements without manual JavaScript:

```html
<!-- popup.html -->
<h1 data-i18n="popupTitle"></h1>
<p data-i18n="popupDescription"></p>
<button data-i18n="saveButton"></button>
<input data-i18n-placeholder="searchPlaceholder" />
<img data-i18n-alt="logoAlt" src="logo.png" />
```

```ts
// i18n/dom.ts
export function localizeDOM(root: Document | Element = document): void {
  // Text content
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n")!;
    el.textContent = chrome.i18n.getMessage(key);
  });

  // Attributes
  const attrMap = [
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-alt", "alt"],
    ["data-i18n-title", "title"],
    ["data-i18n-aria-label", "aria-label"],
  ] as const;

  for (const [dataAttr, targetAttr] of attrMap) {
    root.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      const key = el.getAttribute(dataAttr)!;
      el.setAttribute(targetAttr, chrome.i18n.getMessage(key));
    });
  }
}

// Call on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => localizeDOM());
```

---

## Pattern 7: Locale-Aware Manifest Fields {#pattern-7-locale-aware-manifest-fields}

Chrome automatically localizes manifest fields prefixed with `__MSG_`:

```json
{
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "action": {
    "default_title": "__MSG_actionTitle__"
  }
}
```

This works for:
- `name`
- `description`
- `action.default_title`
- `action.default_popup` (for locale-specific popup pages)

---

## Pattern 8: Missing Translation Fallback Chain {#pattern-8-missing-translation-fallback-chain}

When a message isn't available in the user's locale, implement a fallback chain:

```ts
// i18n/fallback.ts
export function getMessageWithFallback(
  key: string,
  substitutions?: string[]
): string {
  // chrome.i18n.getMessage already falls back to default_locale
  const message = chrome.i18n.getMessage(key, substitutions);

  if (message) return message;

  // If even the default locale doesn't have it, return a dev-friendly string
  if (process.env.NODE_ENV === "development") {
    console.warn(`Missing i18n key: "${key}"`);
    return `[${key}]`;
  }

  return key;
}
```

---

## Validation Script {#validation-script}

Catch missing translations before they ship:

```ts
// scripts/validate-i18n.ts
import fs from "fs";
import path from "path";

const localesDir = path.resolve("_locales");
const locales = fs.readdirSync(localesDir);

const allKeys = new Map<string, Set<string>>();

for (const locale of locales) {
  const file = path.join(localesDir, locale, "messages.json");
  if (!fs.existsSync(file)) continue;

  const messages = JSON.parse(fs.readFileSync(file, "utf-8"));
  allKeys.set(locale, new Set(Object.keys(messages)));
}

const defaultKeys = allKeys.get("en")!;
let hasErrors = false;

for (const [locale, keys] of allKeys) {
  if (locale === "en") continue;

  const missing = [...defaultKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !defaultKeys.has(k));

  if (missing.length > 0) {
    console.error(`${locale}: missing ${missing.length} keys: ${missing.join(", ")}`);
    hasErrors = true;
  }
  if (extra.length > 0) {
    console.warn(`${locale}: ${extra.length} extra keys: ${extra.join(", ")}`);
  }
}

process.exit(hasErrors ? 1 : 0);
```

---

## Summary {#summary}

| Pattern | Problem It Solves |
|---------|------------------|
| Type-safe keys | Typos in message keys caught at compile time |
| Pluralization | Correct grammar across languages |
| Dynamic locale | User-selectable language preference |
| RTL support | Proper layout for Arabic, Hebrew, etc. |
| Intl formatting | Locale-correct dates, numbers, relative times |
| DOM localization | Declarative UI translation without boilerplate |
| Validation script | Catch missing translations in CI |

Combine these patterns with the [base i18n guide](../guides/internationalization.md) for complete internationalization coverage in your Chrome extension.
