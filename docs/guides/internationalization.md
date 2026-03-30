---
layout: default
title: "Chrome Extension Internationalization (i18n). How to Translate Your Extension"
description: "Learn how to internationalize your Chrome extension with chrome.i18n API, _locales directory structure, messages.json format, RTL support, and best practices."
canonical_url: "https://bestchromeextensions.com/guides/internationalization/"
last_modified_at: 2026-01-15
---

Chrome Extension Internationalization (i18n). How to Translate Your Extension

Introduction
- Chrome's built-in i18n system via `chrome.i18n` API
- No permission required. available to all extensions
- Supports 50+ locales out of the box

Internationalization (i18n) is essential for reaching a global audience with your Chrome extension. Chrome provides a built-in i18n system through the `chrome.i18n` API that makes it straightforward to support multiple languages without requiring any special permissions. This guide covers everything you need to know to translate your extension and make it accessible to users worldwide.

When you implement proper internationalization, your extension can automatically adapt to the user's language preferences, providing a native experience regardless of where your users are located. The system supports over 50 locales out of the box, including right-to-left (RTL) languages like Arabic and Hebrew.

Setting Up the _locales Directory Structure

The foundation of Chrome extension internationalization lies in the `_locales` directory. This folder must be placed in the root of your extension and contains subdirectories for each language you want to support. Each subdirectory is named using the language code (such as "en" for English, "es" for Spanish, or "fr" for French) and contains a `messages.json` file with the translated strings.

Your extension directory should follow this structure:

```
extension/
  _locales/
    en/
      messages.json
    es/
      messages.json
    fr/
      messages.json
    ar/
      messages.json
  manifest.json
  popup.html
  popup.js
 _locales/
    en/messages.json
    es/messages.json
    fr/messages.json
    ar/messages.json
 manifest.json
 popup.html
 styles.css
```

The `messages.json` file in each locale folder contains the actual translations. When Chrome loads your extension, it automatically selects the appropriate locale based on the user's browser language settings. If a specific language isn't available, Chrome falls back to your default locale.

Remember to specify the `default_locale` property in your `manifest.json` file when using the `_locales` directory. This is a required field that tells Chrome which locale to use as the fallback when a user's preferred language isn't available.

Understanding the messages.json Format

The `messages.json` file uses a JSON structure where each key represents a unique message identifier, and the value contains the translated string along with metadata for translators. Understanding this format is crucial for creating maintainable translation files.

A well-structured messages.json includes the message text, a description for translators, and placeholders for dynamic content:

```json
{
  "extensionName": {
    "message": "My Extension",
    "description": "The name of the extension displayed in the Chrome Web Store"
  },
  "greetingMessage": {
    "message": "Hello, $USER$!",
    "description": "Greeting shown to the user on the popup",
    "placeholders": {
      "user": {
        "content": "$1",
        "example": "John"
      }
    }
  },
  "settingsSaved": {
    "message": "Settings saved successfully",
    "description": "Confirmation message after saving settings"
  }
}
```
  "itemCount": {
    "message": "You have $COUNT$ items",
    "placeholders": {
      "count": {
        "content": "$1",
        "example": "5"
      }
    }
  }
}
```
- `message`: The translated string (required)
- `description`: Context for translators (recommended)
- `placeholders`: Named substitutions using `$NAME$` syntax

The `message` field contains the actual translated text. The `description` field provides context that helps translators understand how and where the string is used, which is invaluable for accurate translations. Placeholders use the `$NAME$` syntax and allow you to insert dynamic values while maintaining proper word order in different languages.

Using the chrome.i18n API

The `chrome.i18n` API provides several methods for retrieving translations in your extension's JavaScript code. The primary method you'll use is `getMessage()`, which retrieves the translated string for a given message name.

```javascript
// Basic usage - get a simple translation
const extensionName = chrome.i18n.getMessage("extensionName");

// With placeholders - pass array of substitutions
const greeting = chrome.i18n.getMessage("greetingMessage", ["John"]);

// Get user's UI language
const uiLanguage = chrome.i18n.getUILanguage(); // Returns "en-US" or similar

// Detect language of a given text
chrome.i18n.detectLanguage("Bonjour le monde", (result) => {
  console.log(result.languages); // [{ language: "fr", percentage: 100 }]
});

// Get all accepted languages
chrome.i18n.getAcceptLanguages((languages) => {
  console.log(languages); // ["en-US", "en", "es"]
});
```

The API also supports retrieving predefined messages that Chrome provides automatically. These include `@@bidi_dir` for text direction, `@@ui_locale` for the current locale, and `@@extension_id` for the extension's unique identifier.

In your `manifest.json`, you can reference translations using the `__MSG_messageName__` syntax:
// Basic usage
const name = chrome.i18n.getMessage("extensionName");

// With substitution
const greeting = chrome.i18n.getMessage("greeting", ["John"]);
const count = chrome.i18n.getMessage("itemCount", ["42"]);

// In popup.js
document.getElementById("title").textContent = 
  chrome.i18n.getMessage("extensionName");
```

```json
{
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "default_locale": "en"
}
```

This approach ensures your extension name and description are properly translated based on the user's locale.

Translating UI Elements

Translating UI elements in HTML requires a different approach since HTML files cannot directly access the i18n system. The common pattern involves using `data-i18n` attributes in your HTML elements and a small JavaScript initialization script to populate them with translated strings.

In your HTML:

```html
<div id="popup">
  <h1 data-i18n="popupTitle"></h1>
  <button id="saveBtn" data-i18n="saveButton"></button>
  <p data-i18n="statusMessage"></p>
</div>
- Use `__MSG_key__` syntax for translatable fields

In HTML
```html
<h1 data-i18n="extensionName"></h1>
<p data-i18n="extensionDescription"></p>
<script>
document.querySelectorAll("[data-i18n]").forEach(el => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});
</script>
```

In your JavaScript:

```javascript
// Initialize all elements with data-i18n attributes
document.querySelectorAll('[data-i18n]').forEach(element => {
  const messageKey = element.getAttribute('data-i18n');
  element.textContent = chrome.i18n.getMessage(messageKey);
});
```

This separation of concerns keeps your HTML clean while enabling full internationalization support. For more complex scenarios, consider using a template system or a framework that handles i18n natively.

Implementing RTL Language Support

Supporting right-to-left (RTL) languages like Arabic, Hebrew, and Persian requires additional considerations beyond simple string translation. RTL languages read from right to left, which means your entire layout needs to mirror appropriately.

Chrome provides built-in support for RTL through predefined messages. Use `@@bidi_dir` to get the current text direction:

```css
/* In your CSS */
body {
  direction: __MSG_@@bidi_dir__;
}

button {
  /* Swap start and end edges for RTL */
  margin-right: __MSG_@@bidi_start_edge__;
  margin-left: __MSG_@@bidi_end_edge__;
}
```

When designing your extension's UI, use CSS logical properties instead of physical ones. Properties like `margin-inline-start` and `padding-inline-end` automatically adapt to RTL layouts, while `margin-left` and `padding-left` do not.

Test your extension thoroughly with RTL languages by changing your browser's language settings to Arabic or Hebrew. Pay attention to icons, arrows, and any visual elements that might need to be mirrored for RTL users.

Best Practices for Multi-Language Extensions

Following best practices ensures your internationalization implementation is maintainable and provides the best experience for users worldwide.

First, always define a `default_locale` in your manifest even if you start with only one language. This is required by Chrome and makes adding languages later much easier. Use descriptive message IDs that indicate the string's purpose, such as `buttonSaveSettings` rather than `btn1` or `msg42`.

Include detailed descriptions for every message to help translators understand the context. A string like "Open" could mean different things depending on context, and translators need this information to provide accurate translations.

Use placeholders for dynamic content rather than string concatenation. Different languages have different word orders, so concatenating strings like "Hello " + userName + "!" will produce awkward translations in many languages. Placeholders allow translators to position dynamic content correctly.

Keep your message files organized and synchronized. When you add a new string to your default locale, remember to add it to all other locale files. Use tools or scripts to identify missing translations and prevent runtime issues.

Consider offering a manual language override option for users who want to use your extension in a specific language regardless of their browser settings. Store this preference using the Chrome Storage API.

Finally, remember that Chrome Web Store listings require separate localization. The extension i18n system handles your extension's interface, but store listing translations must be provided through the Chrome Web Store Developer Dashboard. Localized screenshots and store descriptions significantly improve conversion rates in non-English markets.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
.sidebar {
  margin-__MSG_@@bidi_end_edge__: 20px;
  float: __MSG_@@bidi_start_edge__;
}
```

Predefined Messages

| Key | Description | Example Values |
|-----|-------------|----------------|
| `@@extension_id` | Unique extension ID | `abcdef...123` |
| `@@ui_locale` | Current UI locale | `en`, `es`, `zh_CN` |
| `@@bidi_dir` | Text direction | `ltr`, `rtl` |
| `@@bidi_start_edge` | Start edge | `left`/`right` |
| `@@bidi_end_edge` | End edge | `right`/`left` |

chrome.i18n API Methods

getMessage(messageName, substitutions?)
```javascript
// Returns translated string
const msg = chrome.i18n.getMessage("greeting", ["User"]);

// Falls back: user locale → default_locale → ""
// Silent failure - returns empty string if key not found
```

getUILanguage()
```javascript
const lang = chrome.i18n.getUILanguage(); // "en-US", "es", "zh-CN"
```

getAcceptLanguages()
```javascript
chrome.i18n.getAcceptLanguages((langs) => {
  console.log(langs); // ["en-US", "en", "es"]
});
```

detectLanguage(text)
```javascript
chrome.i18n.detectLanguage("Bonjour le monde", (result) => {
  console.log(result.languages);
  // [{ language: "fr", percentage: 100 }]
});
```

Locale Fallback Chain
1. Exact match: `en_US`
2. Language match: `en`
3. Default locale (from manifest)
4. Empty string

RTL Language Support

Supported RTL Locales
Arabic (ar), Hebrew (he), Persian (fa), Urdu (ur), etc.

CSS RTL Pattern
```css
body {
  direction: __MSG_@@bidi_dir__;
  text-align: __MSG_@@bidi_start_edge__;
}
.icon {
  margin-__MSG_@@bidi_end_edge__: 10px;
}
```

JS RTL Check
```javascript
function isRTL() {
  return chrome.i18n.getMessage("@@bidi_dir") === "rtl";
}
```

Best Practices for Managing Translations at Scale

1. Structured Message Keys
```javascript
// Good: hierarchical keys
"popup_button_save"
"options_section_general"
"error_network_timeout"
```

2. Use Placeholders, Not Concatenation
```javascript
// Bad - breaks word order in other languages
const bad = chrome.i18n.getMessage("hello") + " " + name;

// Good - maintains proper word order
const good = chrome.i18n.getMessage("helloWithName", [name]);
```

3. Extraction Script Example
```javascript
// extract-messages.js
const fs = require('fs');
const glob = require('glob');

function extractMessages() {
  const messages = {};
  const files = glob.sync('/*.js');
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(/getMessage\("([^"]+)"/g);
    for (const match of matches) {
      messages[match[1]] = { message: "", description: "" };
    }
  });
  
  fs.writeFileSync('_locales/en/messages.json', 
    JSON.stringify(messages, null, 2));
}
```

4. Validation Script
```javascript
// validate-i18n.js
function validateLocales(locales) {
  const requiredKeys = ['extensionName', 'greeting', 'buttonSave'];
  
  locales.forEach(locale => {
    const missing = requiredKeys.filter(key => 
      chrome.i18n.getMessage(key) === ""
    );
    if (missing.length) {
      console.error(`Locale ${locale}: missing ${missing.join(', ')}`);
    }
  });
}
```

5. Error Handling
```javascript
function safeGetMessage(key, substitutions = []) {
  const msg = chrome.i18n.getMessage(key, substitutions);
  return msg || key; // Return key as fallback
}
```

Chrome Web Store Localization
- Store listing is separate from extension i18n
- Provide translations in the Developer Dashboard
- Localized screenshots for each language increase installs

Common Mistakes
- Missing `"default_locale"` in manifest. extension won't load
- Typo in message key. silent empty string failure
- Not adding new strings to ALL locale files
- Using string concatenation instead of placeholders
- No descriptions for translators
- Hardcoding strings instead of using messages.json
- Not testing RTL layouts

Reference
- [chrome.i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [Internationalization Guide](https://developer.chrome.com/docs/extensionsInternationalization)
- [Locale Codes Table](https://developer.chrome.com/docs/webstore/i18n/#locale-table)
