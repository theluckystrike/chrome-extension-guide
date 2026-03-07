# Internationalization (i18n) for Chrome Extensions

## Introduction
- Chrome's built-in i18n system via `chrome.i18n` API
- No permission required — available to all extensions
- Supports 50+ locales out of the box

## Directory Structure
```
extension/
├── _locales/
│   ├── en/messages.json
│   ├── es/messages.json
│   ├── fr/messages.json
│   └── ar/messages.json
├── manifest.json
├── popup.html
└── styles.css
```
- Each locale gets a folder under `_locales/`
- `"default_locale": "en"` required in manifest.json when `_locales/` exists

## messages.json Format
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
  },
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

## Using Translations

### In JavaScript
```javascript
// Basic usage
const name = chrome.i18n.getMessage("extensionName");

// With substitution
const greeting = chrome.i18n.getMessage("greeting", ["John"]);
const count = chrome.i18n.getMessage("itemCount", ["42"]);

// In popup.js
document.getElementById("title").textContent = 
  chrome.i18n.getMessage("extensionName");
```

### In manifest.json
```json
{
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "default_locale": "en"
}
```
- Use `__MSG_key__` syntax for translatable fields

### In HTML
```html
<h1 data-i18n="extensionName"></h1>
<p data-i18n="extensionDescription"></p>
<script>
document.querySelectorAll("[data-i18n]").forEach(el => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});
</script>
```

### In CSS
```css
body {
  direction: __MSG_@@bidi_dir__;
}
.sidebar {
  margin-__MSG_@@bidi_end_edge__: 20px;
  float: __MSG_@@bidi_start_edge__;
}
```

## Predefined Messages

| Key | Description | Example Values |
|-----|-------------|----------------|
| `@@extension_id` | Unique extension ID | `abcdef...123` |
| `@@ui_locale` | Current UI locale | `en`, `es`, `zh_CN` |
| `@@bidi_dir` | Text direction | `ltr`, `rtl` |
| `@@bidi_start_edge` | Start edge | `left`/`right` |
| `@@bidi_end_edge` | End edge | `right`/`left` |

## chrome.i18n API Methods

### getMessage(messageName, substitutions?)
```javascript
// Returns translated string
const msg = chrome.i18n.getMessage("greeting", ["User"]);

// Falls back: user locale → default_locale → ""
// Silent failure - returns empty string if key not found
```

### getUILanguage()
```javascript
const lang = chrome.i18n.getUILanguage(); // "en-US", "es", "zh-CN"
```

### getAcceptLanguages()
```javascript
chrome.i18n.getAcceptLanguages((langs) => {
  console.log(langs); // ["en-US", "en", "es"]
});
```

### detectLanguage(text)
```javascript
chrome.i18n.detectLanguage("Bonjour le monde", (result) => {
  console.log(result.languages);
  // [{ language: "fr", percentage: 100 }]
});
```

## Locale Fallback Chain
1. Exact match: `en_US`
2. Language match: `en`
3. Default locale (from manifest)
4. Empty string

## RTL Language Support

### Supported RTL Locales
Arabic (ar), Hebrew (he), Persian (fa), Urdu (ur), etc.

### CSS RTL Pattern
```css
body {
  direction: __MSG_@@bidi_dir__;
  text-align: __MSG_@@bidi_start_edge__;
}
.icon {
  margin-__MSG_@@bidi_end_edge__: 10px;
}
```

### JS RTL Check
```javascript
function isRTL() {
  return chrome.i18n.getMessage("@@bidi_dir") === "rtl";
}
```

## Best Practices for Managing Translations at Scale

### 1. Structured Message Keys
```javascript
// Good: hierarchical keys
"popup_button_save"
"options_section_general"
"error_network_timeout"
```

### 2. Use Placeholders, Not Concatenation
```javascript
// Bad - breaks word order in other languages
const bad = chrome.i18n.getMessage("hello") + " " + name;

// Good - maintains proper word order
const good = chrome.i18n.getMessage("helloWithName", [name]);
```

### 3. Extraction Script Example
```javascript
// extract-messages.js
const fs = require('fs');
const glob = require('glob');

function extractMessages() {
  const messages = {};
  const files = glob.sync('**/*.js');
  
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

### 4. Validation Script
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

### 5. Error Handling
```javascript
function safeGetMessage(key, substitutions = []) {
  const msg = chrome.i18n.getMessage(key, substitutions);
  return msg || key; // Return key as fallback
}
```

## Chrome Web Store Localization
- Store listing is separate from extension i18n
- Provide translations in the Developer Dashboard
- Localized screenshots for each language increase installs

## Common Mistakes
- Missing `"default_locale"` in manifest — extension won't load
- Typo in message key — silent empty string failure
- Not adding new strings to ALL locale files
- Using string concatenation instead of placeholders
- No descriptions for translators
- Hardcoding strings instead of using messages.json
- Not testing RTL layouts

## Reference
- [chrome.i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [Internationalization Guide](https://developer.chrome.com/docs/extensionsInternationalization)
- [Locale Codes Table](https://developer.chrome.com/docs/webstore/i18n/#locale-table)
