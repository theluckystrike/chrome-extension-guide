---
layout: default
title: "Chrome Extension Internationalization — Developer Guide"
description: "Learn Chrome extension internationalization with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/internationalization/"
---
# Internationalization (i18n) for Chrome Extensions

## Introduction {#introduction}
- Chrome's built-in i18n system via `chrome.i18n` API
- No permission required — available to all extensions
- Supports 50+ locales

## Directory Structure {#directory-structure}
```
extension/
  _locales/
    en/
      messages.json
    es/
      messages.json
    fr/
      messages.json
  manifest.json
```
- Each locale gets a folder under `_locales/`
- `"default_locale": "en"` required in manifest.json when `_locales/` exists

## messages.json Format {#messagesjson-format}
```json
{
  "extensionName": {
    "message": "My Extension",
    "description": "The name of the extension"
  },
  "greeting": {
    "message": "Hello, $USER$!",
    "description": "Greeting message",
    "placeholders": {
      "user": {
        "content": "$1",
        "example": "John"
      }
    }
  }
}
```
- `message`: The translated string
- `description`: Context for translators
- `placeholders`: Named substitutions with `$NAME$` syntax

## Using Translations {#using-translations}

### In JavaScript {#in-javascript}
```javascript
const name = chrome.i18n.getMessage("extensionName");
const greeting = chrome.i18n.getMessage("greeting", ["John"]);
```
- Second argument is array of placeholder substitutions

### In manifest.json {#in-manifestjson}
```json
{
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__"
}
```
- Use `__MSG_messageName__` syntax in manifest fields

### In HTML {#in-html}
- No direct support — use JavaScript to set `textContent`
- Common pattern: `data-i18n` attributes + init script
```html
<span data-i18n="greeting"></span>
<script>
document.querySelectorAll('[data-i18n]').forEach(el => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});
</script>
```

### In CSS {#in-css}
```css
body {
  direction: __MSG_@@bidi_dir__;
}
```
- Predefined messages: `@@bidi_dir`, `@@bidi_reversed_dir`, `@@bidi_start_edge`, `@@bidi_end_edge`, `@@ui_locale`, `@@extension_id`

## chrome.i18n API {#chromei18n-api}

### getMessage(messageName, substitutions?) {#getmessagemessagename-substitutions}
- Returns translated string for current locale
- Falls back: user locale -> default_locale -> empty string

### getUILanguage() {#getuilanguage}
```javascript
const lang = chrome.i18n.getUILanguage(); // "en-US"
```

### detectLanguage(text) {#detectlanguagetext}
```javascript
chrome.i18n.detectLanguage("Bonjour le monde", (result) => {
  console.log(result.languages); // [{ language: "fr", percentage: 100 }]
});
```

### getAcceptLanguages() {#getacceptlanguages}
- Returns user's preferred languages list

## Locale Fallback Chain {#locale-fallback-chain}
1. Exact match: `en_US`
2. Language match: `en`
3. Default locale (from manifest)
4. Empty string

## Best Practices {#best-practices}
- Always set `"default_locale"` in manifest.json
- Keep message IDs descriptive: `buttonSaveSettings` not `btn1`
- Include `description` for every message — helps translators
- Use placeholders for dynamic content — don't concatenate strings
- Test RTL languages (Arabic, Hebrew) — use `@@bidi_dir`
- Store user's language preference with `@theluckystrike/webext-storage` if offering manual language override

## Chrome Web Store Localization {#chrome-web-store-localization}
- Store listing is separate from extension i18n
- Provide translations in the Developer Dashboard
- Localized screenshots for each supported language increase installs
- Cross-ref: `docs/publishing/listing-optimization.md`

## Common Mistakes {#common-mistakes}
- Missing `"default_locale"` in manifest when `_locales/` exists — extension won't load
- Typo in message key — `getMessage` returns empty string silently
- Forgetting to add new strings to ALL locale files — causes fallback to default
- Using string concatenation instead of placeholders — breaks word order in some languages

## Related Articles {#related-articles}

## Related Articles

- [i18n API Reference](../api-reference/i18n-api.md)
- [Advanced i18n](../patterns/advanced-i18n.md)
