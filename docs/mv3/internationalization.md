---
layout: default
title: "Chrome Extension Internationalization — Manifest V3 Guide"
description: "Implement internationalization in Manifest V3 extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/mv3/internationalization/"
---

# Internationalization in Chrome Extensions (MV3)

Chrome's i18n system supports multiple languages in extensions.

## Directory Structure {#directory-structure}

```
my-extension/
├── _locales/
│   ├── en/messages.json
│   ├── es/messages.json
│   └── fr/messages.json
├── manifest.json
└── ...
```

## messages.json Format {#messagesjson-format}

```json
{
  "extension_name": {
    "message": "My Extension",
    "description": "The extension name"
  },
  "greeting_message": {
    "message": "Hello, $NAME$!",
    "placeholders": {
      "NAME": { "content": "$1", "example": "John" }
    }
  }
}
```

Use `$NAME$` for named placeholders and `$1`, `$2` for positional arguments.

## Manifest Configuration {#manifest-configuration}

```json
{
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "default_locale": "en",
  "manifest_version": 3
}
```

## Using Messages in JavaScript {#using-messages-in-javascript}

### chrome.i18n.getMessage() {#chromei18ngetmessage}

```javascript
const name = chrome.i18n.getMessage('greeting_message', ['World']);
// Returns: "Hello, World!"

// You can also pass a single string instead of an array:
const greeting = chrome.i18n.getMessage('greeting_message', 'Alice');
// Returns: "Hello, Alice!"
```

> **Note:** The `substitutions` parameter accepts a string or an array of up to 9 strings. It does NOT accept an object. Named placeholders like `$NAME$` are defined in `messages.json` and map to positional substitutions (`$1`, `$2`, etc.).

### Detecting User Language {#detecting-user-language}

```javascript
const uiLang = chrome.i18n.getUILanguage();

chrome.i18n.getAcceptLanguages((languages) => {
  console.log('Accepted languages:', languages);
});
```

## Predefined Messages {#predefined-messages}

| Key | Description |
|-----|-------------|
| `@@extension_id` | Extension's unique ID |
| `@@ui_locale` | Current UI locale |
| `@@bidi_dir` | "ltr" or "rtl" |
| `@@bidi_reversed_dir` | Opposite of @@bidi_dir |
| `@@bidi_start_edge` | "left" for ltr, "right" for rtl |
| `@@bidi_end_edge` | "right" for ltr, "left" for rtl |

```javascript
const extId = chrome.i18n.getMessage('@@extension_id');
const direction = chrome.i18n.getMessage('@@bidi_dir');
```

## Using Messages in CSS {#using-messages-in-css}

For RTL support:

```css
body {
  direction: __MSG_@@bidi_dir__;
}
```

## Storing User Language Preference {#storing-user-language-preference}

Use `@theluckystrike/webext-storage`:

```javascript
import { Storage } from '@theluckystrike/webext-storage';

const storage = new Storage();

async function setUserLanguage(lang) {
  await storage.set('userLanguage', lang);
}

async function getUserLanguage() {
  const { userLanguage } = await storage.get('userLanguage');
  return userLanguage || chrome.i18n.getUILanguage();
}
```

## Dynamic Locale Switching {#dynamic-locale-switching}

```javascript
// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTranslations') {
    const translations = {};
    request.keys.forEach(key => {
      translations[key] = chrome.i18n.getMessage(key, request.params);
    });
    sendResponse(translations);
  }
});
```

## Best Practices {#best-practices}

- **English fallback** - Ensure default locale has all keys
- **Consistent keys** - Use naming like `menu_open`, `notification_new`
- **Use descriptions** - Help translators understand context
- **Test RTL languages** - Use @@bidi_dir for proper RTL support

## Related Resources {#related-resources}

See [Internationalization Guide](../guides/internationalization.md).

## References {#references}

- [Chrome i18n API](https://developer.chrome.com/docs/extensions/i18n)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
