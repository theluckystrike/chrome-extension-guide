---
layout: default
title: "Chrome Extension Extension Internationalization Runtime. Best Practices"
description: "Implement runtime internationalization for dynamic translations."
canonical_url: "https://bestchromeextensions.com/patterns/extension-internationalization-runtime/"
---

Runtime Internationalization Patterns

Beyond `chrome.i18n.getMessage`, Chrome extensions can use modern JavaScript APIs for runtime localization.

DOM Translation with Data Attributes {#dom-translation-with-data-attributes}

```javascript
function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) el.textContent = message;
  });
}
```

```html
<span data-i18n="greeting"></span>
<button data-i18n="submitButton"></button>
```

Dynamic Content Translation {#dynamic-content-translation}

For programmatically generated strings, use substitution arrays:

```javascript
const msg = chrome.i18n.getMessage('itemCount', [5, 'items']);
// "You have 5 items" (with __MSG_itemCount__ defined as "You have $1 $2")
```

Number Formatting {#number-formatting}

```javascript
function formatNumber(num, locale) {
  return new Intl.NumberFormat(locale).format(num);
}
formatNumber(1234567.89, 'de-DE'); // "1.234.567,89"
```

Date Formatting {#date-formatting}

```javascript
function formatDate(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(date);
}
```

Relative Time {#relative-time}

```javascript
function formatRelative(date, locale) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = date - Date.now();
  const minutes = Math.round(diff / 60000);
  return rtf.format(minutes, 'minute');
}
formatRelative(Date.now() + 300000, 'en'); // "in 5 minutes"
```

Plural Rules {#plural-rules}

```javascript
function getPluralForm(count, locale) {
  const pl = new Intl.PluralRules(locale);
  return pl.select(count); // 'zero', 'one', 'two', 'few', 'many', 'other'
}
```

List Formatting {#list-formatting}

```javascript
function formatList(items, locale) {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
}
formatList(['A', 'B', 'C'], 'en'); // "A, B, and C"
```

RTL Layout Support {#rtl-layout-support}

```html
<div dir="auto">مرحبا</div>
```

```css
/* Use logical properties */
.element {
  margin-inline-start: 10px;
  padding-inline-end: 8px;
  text-align: start;
}
```

Locale Detection {#locale-detection}

```javascript
const uiLang = chrome.i18n.getUILanguage(); // Extension UI language
const browserLang = navigator.language;     // Browser locale

// Fallback chain
const locale = userPreference || uiLang || browserLang || 'en';
```

Cross References {#cross-references}

- [Internationalization Guide](../guides/internationalization.md)
- [Advanced i18n Patterns](./extension-internationalization-advanced.md)
- [i18n API Reference](../api-reference/i18n-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
