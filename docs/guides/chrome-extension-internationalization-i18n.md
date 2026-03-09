---
layout: default
title: "Chrome Extension i18n: Complete Internationalization Guide"
description: "Master Chrome extension internationalization with this comprehensive guide covering chrome.i18n API, locales, messages.json, RTL support, pluralization, and translation workflow."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-internationalization-i18n/"
---

# Chrome Extension i18n: Complete Internationalization Guide

Internationalization (i18n) is essential for reaching a global audience with your Chrome extension. This guide covers everything you need to build multilingual extensions using Chrome's built-in i18n infrastructure, from basic setup to advanced patterns like RTL support and pluralization.

---

## chrome.i18n API Basics {#chrome-i18n-api-basics}

Chrome provides a powerful `chrome.i18n` API specifically designed for extension internationalization. This API enables you to retrieve translated strings, detect user languages, and handle complex localization scenarios without external dependencies.

### Core API Methods

The `chrome.i18n` API provides several key methods for working with translations:

```javascript
// Get a translated message by its key
const greeting = chrome.i18n.getMessage("greeting", "User");

// Get the language code for the extension's current locale
const currentLocale = chrome.i18n.getUILanguage();

// Get all supported language codes
chrome.i18n.getAcceptLanguages((languages) => {
  console.log("Supported languages:", languages);
});

// Detect the language of a specific string
chrome.i18n.detectLanguage("Hello World", (result) => {
  console.log("Detected:", result.languages);
});
```

The `getMessage()` method is the primary way to retrieve translations. It accepts the message key as the first argument and optional substitution values as the second argument. When the message isn't found, Chrome returns an empty string or the message key itself (depending on your manifest configuration).

### Manifest Configuration

To enable internationalization, you must specify default_locale in your manifest.json:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "default_locale": "en",
  "version": "1.0.0"
}
```

The `__MSG_*__` syntax tells Chrome to replace these placeholders with translations from your messages.json file. This applies to the name, description, and several other manifest fields.

---

## _locales Directory Structure {#locales-directory-structure}

The `_locales` directory contains all your translation files. Each supported language has its own subdirectory named with the language code (ISO 639-1 format).

### Directory Layout

```
_extension/
├── _locales/
│   ├── en/
│   │   └── messages.json
│   ├── es/
│   │   └── messages.json
│   ├── fr/
│   │   └── messages.json
│   ├── de/
│   │   └── messages.json
│   ├── ja/
│   │   └── messages.json
│   ├── ar/
│   │   └── messages.json
│   └── zh_CN/
│       └── messages.json
├── manifest.json
├── background.js
└── ...
```

Each locale directory contains a `messages.json` file with translations for that language. Chrome loads translations from the directory matching the user's Chrome UI language, falling back to the default_locale if needed.

### Language Code Conventions

Use standard BCP 47 language tags for locale directories:

| Language | Directory | Notes |
|----------|-----------|-------|
| English | `en` | Default (required) |
| Spanish | `es` | |
| French | `fr` | |
| German | `de` | |
| Japanese | `ja` | |
| Chinese (Simplified) | `zh_CN` | |
| Arabic | `ar` | RTL language |
| Hebrew | `he` | RTL language |
| Portuguese (Brazil) | `pt_BR` | |

---

## messages.json Format and Placeholders {#messages-json-format}

The messages.json file contains all translation strings for a locale. Each message has a unique key and supports various features including placeholders, pluralization, and gender-specific forms.

### Basic Structure

```json
{
  "extension_name": {
    "message": "My Extension",
    "description": "The name of the extension shown in the Chrome Web Store"
  },
  "greeting": {
    "message": "Hello, $USER$!",
    "description": "Greeting message for the user"
  },
  "items_count": {
    "message": "You have $COUNT$ item(s)",
    "placeholders": {
      "count": {
        "content": "$1",
        "example": "5"
      }
    }
  }
}
```

### Placeholder Types

Chrome i18n supports several placeholder types:

**Direct Substitution** — Use `$1`, `$2`, etc. for positional arguments:

```json
{
  "welcome_message": {
    "message": "Welcome, $1! You have $2 notifications.",
    "description": "Welcome message with user name and notification count"
  }
}
```

Usage: `chrome.i18n.getMessage("welcome_message", ["John", 3])`

**Named Placeholders** — More readable and maintainable:

```json
{
  "bookmarks_saved": {
    "message": "$NUM_BOOKMARKS$ bookmarks saved",
    "placeholders": {
      "num_bookmarks": {
        "content": "$1",
        "example": "42"
      }
    }
  }
}
```

Usage: `chrome.i18n.getMessage("bookmarks_saved", [bookmarkCount])`

---

## getMessage() Usage in JavaScript, HTML, and CSS {#getmessage-usage}

### JavaScript Usage

In JavaScript files, use `chrome.i18n.getMessage()` directly:

```javascript
// Simple message
document.getElementById("title").textContent = chrome.i18n.getMessage("extension_title");

// With substitution
const message = chrome.i18n.getMessage("item_count", [itemCount]);
document.getElementById("status").textContent = message;

// Setting badge text
chrome.action.setBadgeText({ text: chrome.i18n.getMessage("badge_new") });
```

### HTML Usage

In HTML files, you can use the `__MSG_*__` syntax directly:

```html
<!-- In popup.html or options.html -->
<h1 __MSG_extension_title__></h1>
<button __MSG_save_button__></button>

<!-- For dynamic content, use JavaScript -->
<script>
  document.querySelector(".error").textContent = chrome.i18n.getMessage("error_generic");
</script>
```

### CSS Usage

CSS files don't support the `__MSG_*__` syntax directly. Instead, use JavaScript to apply translated content:

```css
/* styles.css */
[data-i18n="title"]::before {
  content: attr(data-i18n-text);
}
```

```javascript
// Apply translations to elements with data-i18n attribute
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    element.setAttribute("data-i18n-text", chrome.i18n.getMessage(key));
  });
}
```

### Manifest Usage

The manifest.json supports `__MSG_*__` syntax for specific fields:

```json
{
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "default_title": "__MSG_default_toolbar_title__"
}
```

---

## RTL Language Support {#rtl-language-support}

Right-to-left (RTL) languages like Arabic, Hebrew, and Persian require special handling. Chrome extensions can detect RTL languages and automatically adjust layouts.

### Detecting RTL Languages

```javascript
function isRTL() {
  const language = chrome.i18n.getUILanguage();
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  
  // Check if the language code starts with an RTL language
  return rtlLanguages.some((rtl) => language.startsWith(rtl));
}

// Apply RTL styles dynamically
if (isRTL()) {
  document.body.classList.add("rtl");
}
```

### CSS RTL Patterns

```css
/* Default (LTR) styles */
.container {
  direction: ltr;
  text-align: left;
}

/* RTL overrides */
.rtl .container {
  direction: rtl;
  text-align: right;
}

.rtl .icon-arrow {
  transform: scaleX(-1);
}

.rtl .margin-start {
  margin-left: 0;
  margin-right: 16px;
}

.rtl .margin-end {
  margin-right: 0;
  margin-left: 16px;
}
```

Use logical properties (inline-start, inline-end, margin-block-start) instead of directional properties for better RTL support:

```css
/* Modern approach using logical properties */
.container {
  margin-inline-start: 16px;
  padding-inline-end: 24px;
  border-inline-width: 1px;
}
```

---

## Pluralization Patterns {#pluralization-patterns}

Different languages have different pluralization rules. Chrome i18n supports pluralization through special message formats.

### Basic Pluralization

```json
{
  "items_selected": {
    "message": "You selected $COUNT$ item",
    "placeholders": {
      "count": {
        "content": "$1",
        "example": "5"
      }
    }
  },
  "items_selected_plural": {
    "message": "You selected $COUNT$ items"
  }
}
```

Wait for the proper pluralization API — Chrome i18n uses CLDR plural categories. For extensions, implement custom plural logic:

```javascript
function getPluralMessage(key, count, translations) {
  const lang = chrome.i18n.getUILanguage();
  const pluralForm = getPluralForm(lang, count);
  return translations[`${key}_${pluralForm}`] || translations[key];
}

function getPluralForm(lang, count) {
  // English: one, other
  if (lang.startsWith("en")) {
    return count === 1 ? "one" : "other";
  }
  // Russian: one, few, many, other
  if (lang.startsWith("ru")) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
    if (mod10 === 0 || mod10 >= 5 || mod10 >= 11 && mod100 >= 15) return "many";
    return "other";
  }
  // Default fallback
  return count === 1 ? "one" : "other";
}
```

---

## Dynamic Locale Switching {#dynamic-locale-switching}

By default, Chrome extensions use the user's Chrome UI language. However, you can implement custom locale switching for extensions that need to support language selection.

### Getting User Language Preference

```javascript
// Check current locale
const currentLocale = chrome.i18n.getUILanguage();

// Get accept languages
chrome.i18n.getAcceptLanguages((languages) => {
  console.log("User's preferred languages:", languages);
});
```

### Implementing Language Switching

```javascript
// Store user's language preference
async function setExtensionLocale(locale) {
  await chrome.storage.local.set({ extensionLocale: locale });
  applyLocale(locale);
}

function applyLocale(locale) {
  // Update document direction for RTL languages
  const rtlLocales = ["ar", "he", "fa", "ur"];
  document.dir = rtlLocales.includes(locale) ? "rtl" : "ltr";
  
  // Reload content with new locale
  refreshContent();
}

// Load messages for a specific locale
function loadLocaleMessages(locale) {
  return fetch(`_locales/${locale}/messages.json`)
    .then((response) => response.json())
    .catch(() => fetch("_locales/en/messages.json"));
}
```

---

## Testing Translations {#testing-translations}

Testing i18n requires checking all supported languages and verifying that translations display correctly.

### Manual Testing

1. **Change Chrome language** — Go to Chrome Settings > Languages and add/test different languages
2. **Load unpacked extension** — Chrome loads translations from the matching locale directory
3. **Test all UI elements** — Verify buttons, labels, messages, and tooltips

### Automated Testing

```javascript
// Test that all message keys are defined
async function validateMessages() {
  const locales = ["en", "es", "fr", "de", "ja", "ar"];
  const missingKeys = {};
  
  for (const locale of locales) {
    const messages = await loadLocaleMessages(locale);
    const keys = Object.keys(messages);
    
    // Check for missing keys compared to English
    if (locale !== "en") {
      const enKeys = Object.keys(await loadLocaleMessages("en"));
      missingKeys[locale] = enKeys.filter((k) => !keys.includes(k));
    }
  }
  
  console.log("Missing translations:", missingKeys);
}
```

### Testing RTL Layout

```javascript
function testRTL() {
  const testLocales = ["ar", "he", "fa"];
  const originalLocale = chrome.i18n.getUILanguage();
  
  testLocales.forEach((locale) => {
    // Simulate RTL locale
    const isRTL = testLocales.includes(locale);
    console.log(`Locale ${locale} is RTL:`, isRTL);
    
    // Verify CSS classes are applied
    const hasRTLClass = document.body.classList.contains("rtl");
    console.log(`RTL class applied:`, hasRTLClass);
  });
}
```

---

## Chrome Web Store Listing Localization {#cws-listing-localization}

The Chrome Web Store (CWS) supports localized listings to reach users in their native language. Each locale can have its own title, description, and promotional material.

### Localized Store Listings

In the Chrome Web Store Developer Dashboard, you can add translations for:

- **Title** — Up to 75 characters
- **Description** — Up to 4,000 characters (with formatting)
- **Promotional tagline** — Short description for store search results

### Store Listing Best Practices

1. **Prioritize key markets** — Start with English (en), then add languages based on your target audience
2. **Don't machine translate** — Human translation ensures quality and cultural appropriateness
3. **Include keywords** — Different languages may use different search terms
4. **Update consistently** — Keep translations in sync with extension updates

For detailed publishing guidance, see the [Publishing Guide](../publishing/publishing-guide.md) and [Chrome Web Store API](../guides/chrome-web-store-api.md).

---

## Tools: i18n-ally and Crowdin Integration {#tools}

### VS Code i18n-ally

The i18n-ally extension provides excellent i18n support directly in VS Code:

```json
// .vscode/settings.json
{
  "i18n-ally.localesPaths": ["_locales"],
  "i18n-ouldriven": false,
  "i18n-ally.sourceLanguage": "en",
  "i18n-ally.displayLanguage": "en",
  "i18n-ally.keystyle": "nested"
}
```

Features include inline translation preview, missing key detection, and quick navigation between translations.

### Crowdin Integration

Crowdin provides professional translation management with:

- **Translation memory** — Reuse previous translations
- **In-context translation** — Translate directly in your extension UI
- **Glossary management** — Maintain consistent terminology
- **Team collaboration** — Work with professional translators

```yaml
# crowdin.yml configuration
files:
  - source: /_locales/en/messages.json
    translation: /_locales/%locale_with_underscore%/messages.json
```

### Alternative Tools

| Tool | Best For | Pricing |
|------|----------|---------|
| Crowdin | Large projects, team translation | Free tier available |
| Weblate | Open source projects | Free (self-hosted) |
| Lokalise | Professional translation services | Paid |
| POEditor | Simple translation management | Free tier available |

---

## Internationalization Best Practices {#i18n-best-practices}

Following best practices ensures maintainable translations and a consistent user experience across languages.

### Message Key Naming Conventions

Use descriptive, hierarchical key names that make translation management easier:

```json
{
  "extension": {
    "name": "My Extension",
    "description": "A productivity tool"
  },
  "button": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm"
  },
  "message": {
    "error": {
      "generic": "An error occurred",
      "network": "Network error. Please check your connection.",
      "auth": "Authentication failed"
    },
    "success": {
      "saved": "Changes saved successfully",
      "deleted": "Item deleted"
    }
  }
}
```

### Translation Strategy

Develop a clear strategy for managing translations across your extension:

**Start with English as source** — Use English (en) as your primary source language and translate from it. This ensures consistency and simplifies maintenance.

**Plan for text expansion** — Some languages expand significantly when translated. German can be 30% longer than English. Design your UI with flexibility:

```css
/* Allow room for text expansion */
.button {
  min-width: 80px;
  padding: 8px 16px;
  white-space: nowrap;
}

/* For longer languages, use flexible layouts */
.extension-container {
  width: min-content;
  max-width: 400px;
}
```

**Separate content from code** — Keep all user-facing text in messages.json files. Never hardcode strings in JavaScript, HTML, or CSS:

```javascript
// Bad
document.getElementById("title").textContent = "Settings";

// Good
document.getElementById("title").textContent = chrome.i18n.getMessage("settings_title");
```

### Handling Date and Time

Dates and times require locale-aware formatting. Use the Intl API:

```javascript
function formatDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function formatTime(time, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(time);
}

// Usage
const locale = chrome.i18n.getUILanguage();
const formattedDate = formatDate(new Date(), locale);
const formattedTime = formatDate(new Date(), locale);
```

### Handling Numbers

Numbers also require locale-specific formatting:

```javascript
function formatNumber(number, locale) {
  return new Intl.NumberFormat(locale).format(number);
}

function formatCurrency(amount, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency
  }).format(amount);
}

// Usage
const locale = chrome.i18n.getUILanguage();
const count = formatNumber(1234.56, locale); // "1,234.56" in en-US
const price = formatCurrency(99.99, "USD", locale); // "$99.99" in en-US
```

### Error Handling

Implement robust error handling for missing translations:

```javascript
function safeGetMessage(key, substitutions) {
  try {
    const message = chrome.i18n.getMessage(key, substitutions);
    if (!message) {
      console.warn(`Missing translation for key: ${key}`);
      return key; // Fallback to key itself
    }
    return message;
  } catch (error) {
    console.error(`Error getting translation for ${key}:`, error);
    return key;
  }
}

// Usage
const errorMsg = safeGetMessage("error_network");
const itemMsg = safeGetMessage("item_count", [itemCount]);
```

---

## Performance Considerations {#performance-considerations}

Internationalization impacts extension performance. Consider these optimizations:

### Lazy Loading Translations

For extensions with many translations, load messages on demand:

```javascript
const messageCache = new Map();

async function getMessage(key, substitutions) {
  // Check cache first
  if (messageCache.has(key)) {
    return interpolate(messageCache.get(key), substitutions);
  }
  
  // Load messages file if needed
  const locale = chrome.i18n.getUILanguage();
  const messages = await loadMessages(locale);
  
  messageCache.set(key, messages[key]?.message || key);
  return interpolate(messageCache.get(key), substitutions);
}
```

### Avoiding Runtime JSON Parsing

Prefer compile-time extraction for performance-critical paths:

```javascript
// Build-time: Extract messages to a JS file
// messages.js
export const messages = {
  extension_name: "My Extension",
  button_save: "Save",
  // ...
};

// Runtime: Direct property access
const title = messages.extension_name;
```

---

## Common Pitfalls {#common-pitfalls}

Avoid these common i18n mistakes:

### Pitfall 1: Hardcoded Strings

Never hardcode user-facing text:

```javascript
// Bad
document.body.innerHTML = "<h1>Settings</h1>";

// Good
document.body.innerHTML = `<h1>${chrome.i18n.getMessage("settings_title")}</h1>`;
```

### Pitfall 2: Ignoring Text Direction

Always account for RTL languages:

```javascript
// Bad
element.style.marginLeft = "10px";

// Good
element.style.marginInlineStart = "10px";
```

### Pitfall 3: Missing Fallback Languages

Always define fallback behavior:

```javascript
// Bad - Will show empty string if key missing
const title = chrome.i18n.getMessage("missing_key");

// Good - Has fallback
const title = chrome.i18n.getMessage("missing_key") || "Default Title";
```

### Pitfall 4: Improper Placeholder Syntax

Use correct placeholder formatting:

```json
// Bad - Missing placeholder definition
{
  "greeting": {
    "message": "Hello, $USER$!"
  }
}

// Good - Proper placeholder definition
{
  "greeting": {
    "message": "Hello, $USER$!",
    "placeholders": {
      "user": {
        "content": "$1",
        "example": "John"
      }
    }
  }
}
```

---

## Related Guides {#related-guides}

- [Publishing Guide](../publishing/publishing-guide.md) — Manual publishing process and CWS setup
- [Manifest Reference](../guides/manifest-json-reference.md) — Complete manifest.json reference
- [Internationalization API](../guides/i18n-api.md) — Detailed chrome.i18n API reference
- [Accessibility Guide](../guides/accessibility.md) — Making extensions accessible to all users

---

## Related Articles {#related-articles}

- [Chrome Web Store Listing Optimization](../guides/chrome-web-store-listing-optimization.md)
- [Extension Localization Workflow](../guides/extension-localization-workflow.md)
- [Manifest V3 Fields](../guides/manifest-v3-fields.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
