---
layout: default
title: "Internationalizing Your Chrome Extension — Developer Guide"
description: "Learn how to build a multilingual Chrome extension with complete i18n support, RTL languages, locale fallback, and Chrome Web Store localization."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/internationalization-guide/"
---

# Internationalizing Your Chrome Extension

## Overview {#overview}

Internationalization (i18n) is essential for reaching a global audience with your Chrome extension. Chrome provides a built-in i18n system that requires no permissions and supports over 50 languages, including right-to-left (RTL) scripts like Arabic, Hebrew, and Persian.

This tutorial covers the complete workflow for adding multilingual support to your extension, from setting up the `_locales` directory to publishing localized listings in the Chrome Web Store.

## Prerequisites {#prerequisites}

- A Chrome Extension project with a `manifest.json` file
- Basic understanding of JSON format
- Familiarity with JavaScript/TypeScript

## Step 1: Set Up the _locales Directory {#step-1-set-up-locales}

Create the `_locales` directory in your extension's root folder. Each supported language gets its own subdirectory named using the [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes):

```
my-extension/
├── _locales/
│   ├── en/messages.json      # English (default)
│   ├── es/messages.json      # Spanish
│   ├── fr/messages.json      # French
│   ├── de/messages.json      # German
│   ├── ja/messages.json     # Japanese
│   ├── ar/messages.json      # Arabic (RTL)
│   └── zh_CN/messages.json  # Chinese (Simplified)
├── manifest.json
├── background.js
├── popup.html
└── styles.css
```

### Configure Default Locale

Add the `default_locale` field to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "default_locale": "en",
  "version": "1.0.0"
}
```

**Important:** The `default_locale` field is required if you use `__MSG_*__` placeholders in your manifest. It specifies the fallback locale when a user's language isn't available.

## Step 2: Create messages.json Files {#step-2-create-messages}

Each locale directory must contain a `messages.json` file with translation strings.

### English (Default) — `_locales/en/messages.json`

```json
{
  "extension_name": {
    "message": "My Weather Extension",
    "description": "The name of the extension"
  },
  "extension_description": {
    "message": "Get real-time weather updates for your location",
    "description": "Extension description"
  },
  "menu_settings": {
    "message": "Settings",
    "description": "Settings menu item"
  },
  "menu_about": {
    "message": "About",
    "description": "About menu item"
  },
  "greeting": {
    "message": "Hello, $1!",
    "description": "Greeting message with user name"
  },
  "weather_temp": {
    "message": "The temperature in $CITY$ is $TEMP$°C",
    "description": "Weather report message",
    "placeholders": {
      "city": {
        "content": "$1",
        "example": "Tokyo"
      },
      "temp": {
        "content": "$2",
        "example": "22"
      }
    }
  },
  "items_count": {
    "message": "You have $COUNT$ item(s)",
    "description": "Item count message",
    "placeholders": {
      "count": {
        "content": "$1",
        "example": "5"
      }
    }
  },
  "button_save": {
    "message": "Save",
    "description": "Save button text"
  },
  "button_cancel": {
    "message": "Cancel",
    "description": "Cancel button text"
  }
}
```

### Spanish — `_locales/es/messages.json`

```json
{
  "extension_name": {
    "message": "Mi Extensión del Clima",
    "description": "The name of the extension"
  },
  "extension_description": {
    "message": "Obtén actualizaciones del clima en tiempo real para tu ubicación",
    "description": "Extension description"
  },
  "menu_settings": {
    "message": "Configuración",
    "description": "Settings menu item"
  },
  "menu_about": {
    "message": "Acerca de",
    "description": "About menu item"
  },
  "greeting": {
    "message": "¡Hola, $1!",
    "description": "Greeting message with user name"
  },
  "weather_temp": {
    "message": "La temperatura en $CITY$ es $TEMP$°C",
    "description": "Weather report message",
    "placeholders": {
      "city": {
        "content": "$1",
        "example": "Tokio"
      },
      "temp": {
        "content": "$2",
        "example": "22"
      }
    }
  },
  "items_count": {
    "message": "Tienes $COUNT$ elemento(s)",
    "description": "Item count message",
    "placeholders": {
      "count": {
        "content": "$1",
        "example": "5"
      }
    }
  },
  "button_save": {
    "message": "Guardar",
    "description": "Save button text"
  },
  "button_cancel": {
    "message": "Cancelar",
    "description": "Cancel button text"
  }
}
```

### Arabic (RTL) — `_locales/ar/messages.json`

```json
{
  "extension_name": {
    "message": "امتداد الطقس الخاص بي",
    "description": "The name of the extension"
  },
  "extension_description": {
    "message": "احصل على تحديثات الطقس في الوقت الفعلي لموقعك",
    "description": "Extension description"
  },
  "menu_settings": {
    "message": "الإعدادات",
    "description": "Settings menu item"
  },
  "menu_about": {
    "message": "حول",
    "description": "About menu item"
  },
  "greeting": {
    "message": "مرحباً، $1!",
    "description": "Greeting message with user name"
  },
  "weather_temp": {
    "message": "درجة الحرارة في $CITY$ هي $TEMP$°م",
    "description": "Weather report message",
    "placeholders": {
      "city": {
        "content": "$1",
        "example": "طوكيو"
      },
      "temp": {
        "content": "$2",
        "example": "22"
      }
    }
  },
  "items_count": {
    "message": "لديك $COUNT$ عنصر(عناصر)",
    "description": "Item count message",
    "placeholders": {
      "count": {
        "content": "$1",
        "example": "5"
      }
    }
  },
  "button_save": {
    "message": "حفظ",
    "description": "Save button text"
  },
  "button_cancel": {
    "message": "إلغاء",
    "description": "Cancel button text"
  }
}
```

## Step 3: Use Messages in Your Extension {#step-3-use-messages}

### In manifest.json

Reference messages using the `__MSG_key_name__` syntax:

```json
{
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__"
}
```

### In HTML Files

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1 data-i18n="extension_name"></h1>
  <button id="settings" data-i18n="menu_settings"></button>
  <button id="save" data-i18n="button_save"></button>
  <button id="cancel" data-i18n="button_cancel"></button>
  
  <p id="greeting"></p>
  <p id="weather"></p>
  
  <script src="popup.js"></script>
</body>
</html>
```

### In JavaScript/TypeScript

The `chrome.i18n` API provides methods for retrieving translated strings:

```javascript
// popup.js

// Get a simple message
const extensionName = chrome.i18n.getMessage("extension_name");
console.log(extensionName); // "My Weather Extension"

// Get message with positional arguments
const greeting = chrome.i18n.getMessage("greeting", ["John"]);
console.log(greeting); // "Hello, John!"

// Get message with named placeholders
const weather = chrome.i18n.getMessage("weather_temp", ["Tokyo", "22"]);
console.log(weather); // "The temperature in Tokyo is 22°C"

// Get message with array of arguments
const items = chrome.i18n.getMessage("items_count", [5]);
console.log(items); // "You have 5 item(s)"
```

### Automatic HTML Translation

Create a helper function to translate all elements with `data-i18n` attributes:

```javascript
// i18n.js - Helper for translating HTML elements

function translatePage() {
  // Find all elements with data-i18n attribute
  const elements = document.querySelectorAll("[data-i18n]");
  
  elements.forEach((element) => {
    const messageKey = element.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(messageKey);
    
    if (message) {
      element.textContent = message;
    }
  });
}

// Translate on page load
document.addEventListener("DOMContentLoaded", translatePage);

// Also translate when the language might change
chrome.i18n.getAcceptLanguages((languages) => {
  console.log("Accepted languages:", languages);
});
```

## Step 4: Handle RTL Languages {#step-4-handle-rtl}

For languages like Arabic, Hebrew, and Persian that read right-to-left, you need to adjust your CSS.

### Detect RTL in JavaScript

```javascript
// Check if the current locale is RTL
function isRTL() {
  const language = chrome.i18n.getUILanguage();
  // Common RTL language codes
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  return rtlLanguages.includes(language.split("-")[0]);
}

// Apply RTL class to body
if (isRTL()) {
  document.body.classList.add("rtl");
}
```

### CSS for RTL Support

```css
/* styles.css */

/* Default LTR styles */
.container {
  direction: ltr;
  text-align: left;
}

.button {
  margin-right: 10px;
  padding: 8px 16px;
}

.icon {
  margin-right: 8px;
}

/* RTL-specific styles */
body.rtl .container {
  direction: rtl;
  text-align: right;
}

body.rtl .button {
  margin-right: 0;
  margin-left: 10px;
}

body.rtl .icon {
  margin-right: 0;
  margin-left: 8px;
}

/* Use logical properties (recommended) */
.flex-container {
  display: flex;
  gap: 16px; /* Replaces margin/padding in most cases */
}

.card {
  padding: 16px;
  border-start-start-radius: 8px;  /* Logical border-radius */
  border-end-end-radius: 8px;
}
```

### Using `dir` Attribute

Set the `dir` attribute dynamically:

```javascript
function updateDocumentDirection() {
  const language = chrome.i18n.getUILanguage();
  const rtlLanguages = ["ar", "he", "fa", "ur", "yi", "ps"];
  
  const isRTL = rtlLanguages.includes(language.split("-")[0]);
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

document.addEventListener("DOMContentLoaded", updateDocumentDirection);
```

## Step 5: Understand Locale Fallback Chain {#step-5-locale-fallback}

Chrome uses a fallback chain when a translation isn't available in the user's preferred language:

1. **User's preferred language** (e.g., `fr_FR`)
2. **Language without region** (e.g., `fr`)
3. **Default locale** (specified in `default_locale`)
4. **English (en)** as final fallback

### Example Fallback Chain

If user's language is `fr_FR` and you only have `fr` and `en`:

```
fr_FR → fr → en (default_locale) → en (hardcoded)
```

### Check Available Languages

```javascript
// Get languages accepted by the browser
chrome.i18n.getAcceptLanguages((languages) => {
  console.log("Accept languages:", languages);
  // Output: ["en-US", "en", "fr-FR", "fr", "es", "es-419"]
});

// Get the current UI language
const uiLanguage = chrome.i18n.getUILanguage();
console.log("UI Language:", uiLanguage);
// Output: "fr-FR"
```

### Handle Missing Translations Gracefully

```javascript
function getMessageSafe(key, substitutions) {
  try {
    return chrome.i18n.getMessage(key, substitutions);
  } catch (error) {
    console.warn(`Missing translation for key: ${key}`);
    return key; // Fall back to showing the key
  }
}
```

## Step 6: Use Predefined Messages {#step-6-predefined-messages}

Chrome provides built-in messages for common UI elements:

| Message Key | Description | Example Output |
|-------------|-------------|----------------|
| `@@extension_id` | Extension's unique ID | `knpkdiapbgcjkpjfjgjhenjhhplbjhn` |
| `@@ui_locale` | Current locale | `en` |
| `@@bidi_dir` | Text direction | `ltr` or `rtl` |
| `@@bidi_reversed_dir` | Reversed text direction | `rtl` or `ltr` |
| `@@bidi_start_edge` | Start edge position | `left` or `right` |
| `@@bidi_end_edge` | End edge position | `right` or `left` |

### Using Predefined Messages

```javascript
// Get extension ID (useful for dynamic resource URLs)
const extensionId = chrome.i18n.getMessage("@@extension_id");
console.log(extensionId);

// Get text direction
const direction = chrome.i18n.getMessage("@@bidi_dir");
console.log(direction); // "ltr" or "rtl"

// Using in CSS via JavaScript
document.documentElement.setAttribute("dir", 
  chrome.i18n.getMessage("@@bidi_dir")
);
```

## Step 7: Testing Locales {#step-7-testing-locales}

### Test in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select your extension folder
4. Click the extension icon → puzzle piece → manage
5. Under "Language", select a different language
6. Restart Chrome or reload the extension

### Programmatic Testing

```javascript
// Test different languages
async function testLanguage(locale) {
  // Create a temporary element to test translations
  const testElement = document.createElement("div");
  testElement.setAttribute("data-i18n", "extension_name");
  document.body.appendChild(testElement);
  
  translatePage();
  console.log(`Locale ${locale}:`, testElement.textContent);
  
  document.body.removeChild(testElement);
}

// Test multiple locales
["en", "es", "fr", "de", "ar", "zh_CN"].forEach(testLanguage);
```

### Using Chrome Flags

You can force Chrome to use a specific language for testing:

1. Right-click Chrome shortcut
2. Add `--lang=es` to the target path
3. Restart Chrome

### Extension Reloader Extension

Install the [Extension Reloader](https://chrome.google.com/webstore/detail/extension-reloader/fimgfedafeadlierhkkfjlppnodhabdm) extension to quickly reload your extension during development.

## Step 8: Chrome Web Store Localized Listings {#step-8-cws-localized-listings}

When publishing to the Chrome Web Store, you can provide localized listings for different regions and languages.

### Store Listing Fields to Localize

- **Title** - Extension name
- **Description** - Detailed description
- **Short Description** - Brief summary
- **Promotional Graphics** - Store banners (may need region-specific images)

### Upload Localized Screenshots

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Select your extension
3. Go to **Store Listing**
4. Scroll to **Localized listings**
5. Add translations for each target language/region

### Example: English Store Listing

```
Title: My Weather Extension
Description: Get real-time weather updates for your location. 
Features: - Current temperature - 7-day forecast - Severe weather alerts
```

### Example: Spanish Store Listing

```
Title: Mi Extensión del Clima
Description: Obtén actualizaciones del clima en tiempo real para tu ubicación. 
Características: - Temperatura actual - Pronóstico de 7 días - Alertas de clima severo
```

### Best Practices for Store Listings

1. **Don't just translate** - Adapt content for cultural differences
2. **Keep titles under 45 characters** to avoid truncation
3. **Use screenshots** that show localized UI
4. **Test in multiple languages** before publishing

## Complete Example Project Structure {#complete-example}

```
weather-extension/
├── _locales/
│   ├── en/messages.json
│   ├── es/messages.json
│   ├── fr/messages.json
│   ├── de/messages.json
│   ├── ja/messages.json
│   ├── ar/messages.json
│   └── zh_CN/messages.json
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── styles.css
├── images/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "1.0.0",
  "default_locale": "en",
  "icons": {
    "16": "images/icon-16.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "images/icon-16.png",
      "48": "images/icon-48.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["geolocation"]
}
```

## Related Articles {#related-articles}

- [i18n API Reference](/docs/api-reference/i18n-api/) - Complete reference for the chrome.i18n API
- [Accessibility in Extensions](/docs/guides/accessibility/) - Building accessible extensions for all users
- [Publishing to Chrome Web Store](/docs/tutorials/publishing-to-chrome-web-store/) - Guide to publishing and managing your extension

---

Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).
