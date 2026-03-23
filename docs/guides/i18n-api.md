# Chrome Internationalization (i18n) API

The Chrome Extensions i18n API provides a powerful system for creating multilingual extensions. This guide covers the complete `chrome.i18n` API and best practices for building fully localized extensions.

## Overview

Chrome's built-in internationalization system allows extensions to display user interface in the user's preferred language, support multiple locales, handle dynamic content with placeholders, and support RTL languages. The i18n system requires no permissions.

## Directory Structure

Extensions use a standardized directory structure:

```
my-extension/
 _locales/
    en/messages.json      # English (default)
    es/messages.json      # Spanish
    fr/messages.json      # French
    zh_CN/messages.json   # Chinese
 manifest.json
 styles.css
```

The `default_locale` field in manifest.json is required:

```json
{ "name": "__MSG_extension_name__", "default_locale": "en" }
```

## messages.json Format

```json
{
  "extension_name": { "message": "My Weather", "description": "Extension name" },
  "greeting": { "message": "Hello, $1!", "description": "Greeting" },
  "weather_report": {
    "message": "Temperature in $city$ is $temp$°C",
    "placeholders": {
      "city": { "content": "$1", "example": "Tokyo" },
      "temp": { "content": "$2", "example": "22" }
    }
  }
}
```

## Placeholders and Substitutions

```javascript
// Positional: $1, $2, etc.
const greeting = chrome.i18n.getMessage("greeting", ["John"]);
console.log(greeting); // "Hello, John!"

// With named placeholders
const weather = chrome.i18n.getMessage("weather_report", ["Tokyo", "22"]);
```

## Predefined Messages

| Message | Description | Value |
|---------|-------------|-------|
| `@@bidi_dir` | Text direction | `"ltr"` or `"rtl"` |
| `@@bidi_start_edge` | Start edge | `"left"` or `"right"` |
| `@@bidi_end_edge` | End edge | `"right"` or `"left"` |
| `@@ui_locale` | UI locale | `"en-US"` |
| `@@extension_id` | Extension ID | `"abc123"` |

### CSS Usage

```css
body { direction: __MSG_@@bidi_dir__; }
.toolbar { margin-__MSG_@@bidi_start_edge__: 10px; }
```

## chrome.i18n API

### getMessage(messageName, substitutions?)

```javascript
const title = chrome.i18n.getMessage("extension_name");
const msg = chrome.i18n.getMessage("greeting", ["Alice"]);
const missing = chrome.i18n.getMessage("nonexistent"); // ""
```

Fallback: user locale → default_locale → empty string.

### getUILanguage()

Returns the browser's UI language:

```javascript
const uiLang = chrome.i18n.getUILanguage(); // "en-US"

// Setup RTL
if (uiLang.startsWith("ar") || uiLang.startsWith("he")) {
  document.documentElement.dir = "rtl";
}
```

### getAcceptLanguages()

Returns user's preferred languages in order:

```javascript
chrome.i18n.getAcceptLanguages((langs) => console.log(langs));
// ["en-US", "es", "fr"]
```

### detectLanguage(text, callback?)

Detects language of given text using CLD:

```javascript
chrome.i18n.detectLanguage("Bonjour le monde", (result) => {
  console.log(result.languages); // [{ language: "fr", percentage: 100 }]
});
```

## CSS and HTML Localization

### CSS

```css
body { direction: __MSG_@@bidi_dir__; }
.icon { margin-inline-end: 8px; }  /* Auto RTL flip */
:lang(zh) body { font-family: "Microsoft YaHei", sans-serif; }
```

### HTML

HTML doesn't support `__MSG_` directly. Use JavaScript:

```html
<h1 data-i18n="extension_name"></h1>
<button data-i18n="btn_save"></button>
```

```javascript
document.querySelectorAll("[data-i18n]").forEach(el => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});
```

## RTL Language Support

Extensions supporting Arabic, Hebrew need special handling:

```javascript
function setupRTL() {
  const lang = chrome.i18n.getUILanguage();
  const isRTL = ["ar", "he", "fa", "ur"].some(l => lang.startsWith(l));
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
}
```

### CSS Logical Properties

```css
.card { margin-inline-start: 10px; padding-block: 16px; }
```

### Date/Number Formatting

```javascript
new Intl.DateTimeFormat(chrome.i18n.getUILanguage()).format(date);
new Intl.NumberFormat(chrome.i18n.getUILanguage()).format(num);
```

## Building a Fully Localized Extension

### 1. Define Messages

```json
// _locales/en/messages.json
{
  "extension_name": { "message": "Weather Now", "description": "Name" },
  "menu_settings": { "message": "Settings", "description": "Menu" },
  "btn_search": { "message": "Search", "description": "Button" },
  "btn_save": { "message": "Save", "description": "Save button" },
  "error_network": { "message": "Network error", "description": "Error" },
  "loading": { "message": "Loading...", "description": "Loading" }
}
```

### 2. Use in Manifest

```json
{ "name": "__MSG_extension_name__", "default_locale": "en" }
```

### 3. Use in JavaScript

```javascript
// Background script
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    preferredLanguage: chrome.i18n.getUILanguage() 
  });
});

// Context menu
chrome.contextMenus.create({
  id: "settings",
  title: chrome.i18n.getMessage("menu_settings")
});
```

### 4. Localize Content

```javascript
function initI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
  });
}
```

## Locale Fallback Chain

Chrome uses: exact locale → language match → default_locale → empty string.

## Best Practices

1. Always include `default_locale` when `_locales/` exists
2. Use descriptive keys: `button_save_settings` not `btn1`
3. Provide descriptions for translators
4. Use placeholders, never concatenate strings
5. Test RTL languages (Arabic, Hebrew)
6. Use logical CSS properties (`margin-inline-start`)

## Reference

- Official: [developer.chrome.com/docs/extensions/reference/api/i18n](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- Store i18n: [developer.chrome.com/docs/webstore/i18n](https://developer.chrome.com/docs/webstore/i18n)
