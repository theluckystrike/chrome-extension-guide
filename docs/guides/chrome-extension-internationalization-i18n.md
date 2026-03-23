---
layout: default
title: "Chrome Extension i18n: Complete Internationalization Guide"
description: "Learn how to internationalize your Chrome extension with this comprehensive guide covering chrome.i18n API, locales, RTL support, pluralization, and localization tools."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-internationalization-i18n/"
---

Chrome Extension i18n: Complete Internationalization Guide

Internationalization (i18n) transforms your Chrome extension from a single-language product into a global tool that serves users worldwide. When you invest in proper internationalization, you unlock access to billions of potential users who prefer interacting with applications in their native language. This guide covers everything you need to build, test, and maintain multilingual Chrome extensions using the chrome.i18n API and related tools.

Understanding Chrome Extension Internationalization

Chrome extensions support internationalization through a built-in system that separates translatable content from your code. This approach allows you to add new languages without modifying your JavaScript, HTML, or CSS files. The system uses message files stored in a `_locales` directory, with each language having its own subdirectory containing a `messages.json` file.

The internationalization system works across all extension components, including the popup, options page, background service worker, content scripts, and even the Chrome Web Store listing. By implementing i18n correctly, you ensure consistency in your user's experience regardless of their language preference.

The _locales Directory Structure

The `_locales` directory sits at the root of your extension folder and contains language-specific subdirectories. Each subdirectory uses a two-letter language code following the ISO 639-1 standard, with optional region codes for regional variants. For example, `en` for English, `es` for Spanish, `pt_BR` for Brazilian Portuguese, and `zh_CN` for Simplified Chinese.

Your extension directory structure should look like this:

```
my-extension/
 _locales/
    en/messages.json
    es/messages.json
    fr/messages.json
    de/messages.json
    ja/messages.json
    zh_CN/messages.json
 manifest.json
 popup.html
 popup.js
 background.js
 styles.css
 icons/
     icon16.png
     icon48.png
     icon128.png
```

The `default_locale` field in your manifest.json specifies the fallback language when a translation is missing. Always use a complete translation file for your default locale, as it serves as the source of truth for your messages.

messages.json Format and Placeholders

The messages.json file contains key-value pairs where each key identifies a translatable string. Each message object includes the `message` field containing the actual translated text, and optionally a `description` field that helps translators understand the context.

```json
{
  "extension_name": {
    "message": "My Productivity Extension",
    "description": "The name of the extension shown in the Chrome Web Store"
  },
  "extension_description": {
    "message": "Boost your productivity with smart task management",
    "description": "Short description of what the extension does"
  },
  "welcome_message": {
    "message": "Welcome, $USER_NAME$!",
    "description": "Greeting message when user opens the extension"
  },
  "task_count": {
    "message": "You have $COUNT$ tasks remaining",
    "description": "Message showing number of pending tasks"
  },
  "item_price": {
    "message": "Price: $PRICE$",
    "description": "Label for displaying item price",
    "placeholders": {
      "PRICE": {
        "content": "$1",
        "example": "$9.99"
      }
    }
  }
}
```

Placeholder Types

Chrome's i18n system supports both named and positional placeholders. Named placeholders use the `$NAME$` syntax and are defined in the `placeholders` object. Positional placeholders use `$1`, `$2`, and so on, representing the first, second, and additional arguments passed to the getMessage function.

Named placeholders improve code readability and make translations more maintainable. Positional placeholders are simpler but can become confusing with multiple parameters. For complex messages with many variables, prefer named placeholders.

chrome.i18n API Basics

The chrome.i18n API provides all the functionality you need to retrieve translations and detect user language preferences. This API is available in both background scripts and content scripts without requiring any special permissions.

getMessage()

The primary function you'll use is `chrome.i18n.getMessage(messageName, substitutions)`. This retrieves the translated string for the specified message name, optionally substituting placeholder values.

```javascript
// Basic message retrieval
const greeting = chrome.i18n.getMessage("welcome_message");
console.log(greeting); // Output: "Welcome, $USER_NAME$!" (or translated version)

// With substitutions
const userName = "John";
const personalizedGreeting = chrome.i18n.getMessage("welcome_message", userName);
console.log(personalizedGreeting); // Output: "Welcome, John!"

// Multiple placeholders
const taskCount = 5;
const taskMessage = chrome.i18n.getMessage("task_count", taskCount);
console.log(taskMessage); // Output: "You have 5 tasks remaining"
```

Detecting User Language

You can determine the user's preferred language using `chrome.i18n.getAcceptLanguages()` and `chrome.i18n.getUILanguage()`. The former returns an array of language codes sorted by user preference, while the latter returns the Chrome UI language.

```javascript
// Get all accepted languages
chrome.i18n.getAcceptLanguages((languages) => {
  console.log("User's preferred languages:", languages);
  // Example: ["en-US", "en", "es", "fr"]
});

// Get the UI language
const uiLanguage = chrome.i18n.getUILanguage();
console.log("Chrome UI language:", uiLanguage); // Example: "en-US"
```

Error Handling

When a message is not found, getMessage returns an empty string by default. You can change this behavior by providing a fallback message as the third parameter:

```javascript
const message = chrome.i18n.getMessage("nonexistent_key", null, "Default text");
// Returns "Default text" if the key doesn't exist
```

Using getMessage() in JavaScript, HTML, CSS, and Manifest

JavaScript Integration

In JavaScript files, you can call chrome.i18n.getMessage directly. For extension popups and options pages, you often want to translate content when the page loads:

```javascript
// popup.js or options.js
document.addEventListener("DOMContentLoaded", () => {
  // Set document direction for RTL languages
  document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir") || "ltr";
  document.documentElement.lang = chrome.i18n.getMessage("@@ui_language");

  // Translate static elements
  document.getElementById("title").textContent = chrome.i18n.getMessage("extension_name");
  document.getElementById("description").textContent = chrome.i18n.getMessage("extension_description");

  // Update dynamic content
  updateTaskList();
});

function updateTaskList() {
  const tasks = getTasks();
  const message = chrome.i18n.getMessage("task_count", tasks.length);
  document.getElementById("task-count").textContent = message;
}
```

HTML Integration

For HTML files, you can use the `__MSG_message_name__` syntax to embed translations directly in your markup. This approach works before any JavaScript runs:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1 id="title">__MSG_extension_name__</h1>
  <p id="description">__MSG_extension_description__</p>
  <button id="action-btn">__MSG_action_button__</button>
  <span id="status">__MSG_status_idle__</span>
</body>
</html>
```

This syntax works in any HTML attribute as well, making it easy to translate placeholders, titles, and alt text:

```html
<input type="text" placeholder="__MSG_search_placeholder__" title="__MSG_search_title__">
<img src="icon.png" alt="__MSG_icon_description__">
```

CSS Integration

CSS files don't support direct message substitution, but you can use JavaScript to apply language-specific styles. For RTL languages, Chrome automatically applies the correct text direction, but you may need additional styling:

```javascript
// Apply RTL styles
function applyRTLStyles() {
  const isRTL = chrome.i18n.getMessage("@@bidi_dir") === "rtl";
  
  if (isRTL) {
    document.body.classList.add("rtl");
    document.body.style.direction = "rtl";
    document.body.style.textAlign = "right";
  }
}

document.addEventListener("DOMContentLoaded", applyRTLStyles);
```

```css
/* styles.css */
.rtl .sidebar {
  left: auto;
  right: 0;
}

.rtl .icon-with-text {
  flex-direction: row-reverse;
}

.rtl .menu {
  text-align: right;
  padding-left: 0;
  padding-right: 16px;
}
```

Manifest Configuration

In manifest.json, use the `__MSG_message_name__` syntax for translatable fields:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "default_locale": "en",
  "version": "1.0.0"
}
```

Chrome also provides special system messages prefixed with `@@`:

- `@@extension_id`: The unique ID of your extension
- `@@ui_language`: The current UI language code
- `@@bidi_dir`: Either "rtl" or "ltr" based on the language direction

RTL Language Support

Right-to-left (RTL) languages include Arabic, Hebrew, Persian, Urdu, and others. Proper RTL support requires more than just translating text, it involves mirroring the entire user interface to feel natural for RTL users.

Chrome's i18n system handles direction automatically when you use the `@@bidi_dir` message. The system detects whether the current language is RTL and sets the direction accordingly. However, you need to design your UI to work in both directions.

Design Principles for RTL

Always use CSS logical properties instead of physical ones. Logical properties like `margin-inline-start` and `padding-inline-end` automatically adapt to the text direction, while physical properties like `margin-left` always refer to the left side regardless of direction.

```css
/* Good: Logical properties */
.container {
  margin-inline-start: 16px;
  padding-inline-end: 24px;
  border-inline-start: 1px solid #ccc;
}

/* Avoid: Physical properties */
.container {
  margin-left: 16px;
  padding-right: 24px;
  border-left: 1px solid #ccc;
}
```

For flexbox and grid layouts, use `start` and `end` values instead of `left` and `right`:

```css
.flex-container {
  justify-content: flex-start;  /* Starts at the logical beginning */
  align-items: flex-end;         /* Aligns to the logical end */
}
```

Testing RTL Support

Test your extension with Arabic or Hebrew to ensure all UI elements render correctly. Pay special attention to:

- Icons that convey direction (arrows, back/forward buttons)
- Form inputs and their labels
- Tables and data grids
- Navigation menus
- Dialogs and popups

Pluralization Patterns

Different languages handle plurals differently. English has two forms (one and other), while Slavic languages like Russian have three forms, and Arabic has six. Chrome's i18n system handles this complexity through the `PluralMessage` syntax.

Defining Plural Messages

In your messages.json, use the `pluralMessage` field to define plural-aware translations:

```json
{
  "item_count": {
    "message": "You have $COUNT$ items",
    "placeholders": {
      "COUNT": {
        "content": "$1",
        "example": "5"
      }
    }
  },
  "item_count_plural": {
    "pluralMessage": "You have $COUNT$ items",
    "placeholders": {
      "COUNT": {
        "content": "$1",
        "example": "5"
      }
    }
  }
}
```

Using Plural Messages

The getMessage function automatically selects the correct plural form based on the count value:

```javascript
// English: 1 = "item", anything else = "items"
const message1 = chrome.i18n.getMessage("item_count_plural", 1);
// Output: "You have 1 item"

const message5 = chrome.i18n.getMessage("item_count_plural", 5);
// Output: "You have 5 items"
```

For languages with complex plural rules like Russian, Chrome automatically applies the correct form:

```json
{
  "unread_messages": {
    "message": "You have $COUNT$ unread message",
    "other": "You have $COUNT$ unread messages"
  }
}
```

Dynamic Locale Switching

While Chrome extensions typically use the browser's language setting, you may want to allow users to manually select their preferred language. This is common in extensions that offer in-app language switching.

Storing User Preference

Store the user's language choice in the extension storage:

```javascript
// settings.js
async function setLanguage(langCode) {
  await chrome.storage.local.set({ preferredLanguage: langCode });
  applyLanguage(langCode);
}

function applyLanguage(langCode) {
  // Update document attributes
  document.documentElement.lang = langCode;
  
  // Determine RTL
  const rtlLanguages = ["ar", "he", "fa", "ur", "ps", "yi"];
  document.documentElement.dir = rtlLanguages.includes(langCode) ? "rtl" : "ltr";
  
  // Update all translatable elements
  translatePage();
}
```

Message Lookup with Custom Locale

To retrieve messages for a specific locale (different from the user's Chrome language), use the fourth parameter of getMessage:

```javascript
// Get Spanish translation regardless of user language
const spanishHello = chrome.i18n.getMessage("hello", null, "Default", "es");
// This requires the Spanish locale to be available
```

Testing Translations

Thorough testing ensures your internationalized extension works correctly across all supported languages.

Manual Testing

Test each language by changing Chrome's language settings:

1. Open Chrome and navigate to Settings > Languages
2. Add the target language and move it to the top of the list
3. Restart Chrome
4. Test your extension in the new language

Automated Testing

Create unit tests that verify message files are valid JSON and contain all required keys:

```javascript
// tests/i18n.test.js
const fs = require("fs");
const path = require("path");

describe("Internationalization", () => {
  const localesDir = path.join(__dirname, "../_locales");
  const locales = fs.readdirSync(localesDir);

  const requiredKeys = [
    "extension_name",
    "extension_description",
    "action_button",
    "settings_title"
  ];

  locales.forEach((locale) => {
    const messagesPath = path.join(localesDir, locale, "messages.json");
    const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));

    requiredKeys.forEach((key) => {
      it(`${locale} should have "${key}" translation`, () => {
        expect(messages[key]).toBeDefined();
        expect(messages[key].message).toBeTruthy();
      });
    });
  });
});
```

Testing for Placeholder Replacements

Verify that all placeholder substitutions work correctly:

```javascript
// tests/placeholders.test.js
function testPlaceholderReplacements() {
  const testCases = [
    { key: "welcome_message", args: "John", expected: "Welcome, John!" },
    { key: "task_count", args: 0, expected: "You have 0 tasks" },
    { key: "task_count", args: 1, expected: "You have 1 task" },
    { key: "task_count", args: 5, expected: "You have 5 tasks" }
  ];

  testCases.forEach(({ key, args, expected }) => {
    const result = chrome.i18n.getMessage(key, args);
    expect(result).toBe(expected);
  });
}
```

Chrome Web Store Listing Localization

Your extension's Chrome Web Store listing can be localized to appear differently in each region's store. This goes beyond the in-extension translations and affects how your extension appears in search results and on its store listing page.

Localized Store Assets

In the Chrome Web Store Developer Dashboard, you can provide localized screenshots, videos, and promotional images. Create region-specific assets that show your extension's UI in that language.

Multi-Language Store Descriptions

The developer dashboard allows you to add separate descriptions for each language. Provide thorough, well-written descriptions for each supported language, machine-translated descriptions often appear unprofessional and can hurt conversion rates.

Keyword Localization

Research and include popular search terms in each language's store listing. Keywords that work in English may not translate directly, so use tools like the Chrome Web Store's search suggestions to find appropriate terms for each language.

For more detailed guidance on optimizing your store listing, see our [Chrome Web Store Listing Optimization](../publishing/cws-listing-optimization.md) guide.

Localization Tools and Workflows

VS Code i18n-ally Extension

The i18n-ally extension provides excellent support for Chrome extension i18n within VS Code. Configure it to recognize your `_locales` directory structure:

```json
// .vscode/settings.json
{
  "i18n-ally.locales": ["en", "es", "fr", "de", "ja", "zh_CN"],
  "i18n-ally.sourceLocale": "en",
  "i18n-ally.paths": {
    "_locales/{locale}/messages.json": "{locale}"
  },
  "i18n-ally.enabledFrameworks": ["chrome-ext"]
}
```

This extension provides:

- Inline translation preview
- Key extraction from code
- Translation status indicators
- Quick navigation between translation files

Crowdin Integration

For larger projects with multiple languages, consider using Crowdin, a professional translation management platform. Crowdin integrates with GitHub and can automatically sync translation files.

To set up Crowdin with your Chrome extension:

1. Create a Crowdin project and connect it to your GitHub repository
2. Configure the file pattern to match your `_locales` structure
3. Crowdin will automatically create translation requests for new or modified strings
4. Professional translators or community members can provide translations
5. Approved translations sync back to your repository automatically

```yaml
crowdin.yml
files:
  - source: /_locales/en/messages.json
    translation: /_locales/%locale%/messages.json
```

Crowdin supports:

- Machine translation suggestions
- Translation memory
- Glossary management
- QA checks for common translation errors
- Integration with translation agencies

Translation Memory and Reuse

As your extension grows, you'll accumulate common phrases across different parts of your extension. Create a glossary of standard translations for frequently used terms to ensure consistency:

```json
{
  "settings": {
    "message": "Settings",
    "description": "Navigation item for accessing settings"
  },
  "save": {
    "message": "Save",
    "description": "Button to save changes"
  },
  "cancel": {
    "message": "Cancel",
    "description": "Button to cancel an action"
  }
}
```

Best Practices Summary

Follow these guidelines for successful internationalization:

Always externalize strings from your code from the beginning of your project. Adding i18n later requires updating every file that contains user-facing text, making it a tedious refactoring task.

Use descriptive message keys that indicate the context, such as `popup_settings_title` rather than `title4`. This helps translators understand where each message appears.

Provide clear descriptions for all messages, especially those with placeholders. Include example values to show translators how the placeholder will be filled.

Test with real translations, not just simulated text. Languages have different lengths, and a string that fits nicely in English may overflow in German or require more space in French.

Support both LTR and RTL languages from the start. Using CSS logical properties makes this much easier.

Keep messages concise. Screen space is limited in extension popups, and long translations can break layouts.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*

---
Related Guides

- [Chrome Extension Manifest V3](../mv3/index.md). Complete reference for MV3 features and configuration
- [Publishing Your Extension](../publishing/publishing-guide.md). Learn how to publish and distribute your internationalized extension
- [Chrome Web Store Listing Optimization](../publishing/cws-listing-optimization.md). Optimize your store presence for global audiences
