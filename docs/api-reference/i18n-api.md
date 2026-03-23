---
layout: default
title: "Chrome i18n API Complete Reference"
description: "The Chrome i18n API provides internationalization and localization support for Chrome extensions, enabling multilingual extensions without requiring any permissions."
canonical_url: "https://bestchromeextensions.com/api-reference/i18n-api/"
---

# chrome.i18n API Reference

The `chrome.i18n` API provides internationalization support for Chrome Extensions without requiring permissions.

## Overview {#overview}

- **Permission**: None - always available in all extension contexts
- **Manifest**: `default_locale` required in manifest.json
- **Available In**: Service worker, content scripts, popup, options page

## Message Files {#message-files}

Location: `_locales/{locale}/messages.json`

```json
{
  "extensionName": {
    "message": "My Extension",
    "description": "The name"
  },
  "greetingMessage": {
    "message": "Hello, $1!",
    "placeholders": { "1": { "content": "$1" } }
  }
}
```

**Manifest:** `{ "default_locale": "en", "name": "__MSG_extensionName__" }`

## API Methods {#api-methods}

### chrome.i18n.getMessage(messageName, substitutions?) {#chromei18ngetmessagemessagename-substitutions}

Returns localized string from messages.json.

```javascript
chrome.i18n.getMessage("greeting");                  // "Hello!"
chrome.i18n.getMessage("greetingMessage", "John");   // "Hello, John!"
```

- `messageName`: Key from messages.json
- `substitutions`: Optional string/array for $1, $2... placeholders
- Returns: Translated string or empty string if not found

### chrome.i18n.getUILanguage() {#chromei18ngetuilanguage}

Returns browser UI language (e.g., "en-US", "es").

```javascript
const uiLang = chrome.i18n.getUILanguage();
```

### chrome.i18n.getAcceptLanguages(callback) {#chromei18ngetacceptlanguagescallback}

Returns user's preferred languages array.

```javascript
chrome.i18n.getAcceptLanguages((langs) => console.log(langs));
// ["en-US", "es", "fr"]
```

### chrome.i18n.detectLanguage(text, callback) {#chromei18ndetectlanguagetext-callback}

Detects language of text using CLD.

```javascript
chrome.i18n.detectLanguage("Hello world", (result) => {
  console.log(result.isReliable);   // true/false
  console.log(result.languages);   // [{language: "en", percentage: 95}]
});
```

## Predefined Messages (@@) {#predefined-messages}

Built-in messages (no definition needed):

| Key | Description | Value |
|-----|-------------|-------|
| `@@extension_id` | Extension's unique ID | "abcdefgh..." |
| `@@ui_locale` | Current locale | "en" |
| `@@bidi_dir` | Text direction | "ltr" or "rtl" |
| `@@bidi_reversed_dir` | Opposite direction | "rtl" or "ltr" |
| `@@bidi_start_edge` | Start edge | "left" or "right" |
| `@@bidi_end_edge` | End edge | "right" or "left" |

```javascript
document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir");
```

## Using in Manifest {#using-in-manifest}

Use `__MSG_*__` syntax for name, description, action.default_title, etc.

```json
{
  "name": "__MSG_extension_name__",
  "description": "__MSG_description__"
}
```

## Locale Fallback {#locale-fallback}

Search order: exact locale → language only → default_locale

Example: `pt_BR → pt → en → (fallback)` when default_locale is "en"

## Code Examples {#code-examples}

**Basic message:**
```javascript
// messages.json: { "welcome": { "message": "Welcome, $1!" } }
chrome.i18n.getMessage("welcome", "John"); // "Welcome, John!"
```

**Language detection:**
```javascript
chrome.i18n.detectLanguage(text, (r) => console.log(r.languages));
```

**RTL support:**
```javascript
document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir");
```

## Cross-References {#cross-references}

- [MV3 Internationalization](./mv3/internationalization.md)
- [Internationalization Guide](../guides/internationalization.md)
- [Advanced i18n Patterns](../patterns/advanced-i18n.md)

## See Also {#see-also}

- [Chrome i18n Docs](https://developer.chrome.com/docs/extensions/i18n)
## Frequently Asked Questions

### How do I internationalize my extension?
Use messages.json files in the _locales directory and reference them with __MSG_messagename__ in your code.

### How do I get user's locale in code?
Use chrome.i18n.getMessage() to retrieve translated strings, and chrome.i18n.getAcceptLanguages() for user's languages.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
