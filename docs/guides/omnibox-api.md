---
layout: default
title: "Chrome Extension Omnibox API — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/omnibox-api/"
---
# Omnibox API Guide

## Overview {#overview}
- The omnibox (address bar) can be used as a custom search/command interface
- User types your keyword, then a space, then their query
- Extension provides suggestions in real-time
- Requires `"omnibox"` key in manifest.json (not a permission)

## Manifest Configuration {#manifest-configuration}
```json
{
  "omnibox": {
    "keyword": "ext"
  }
}
```
- When user types `ext ` (keyword + space), your extension activates
- Choose a short, memorable keyword
- Only ONE keyword per extension

## Handling Input {#handling-input}
```javascript
// Fires as user types (after keyword + space)
chrome.omnibox.onInputStarted.addListener(() => {
  // User activated the keyword — set up state
  console.log('Omnibox session started');
});

// Provide suggestions as user types
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const suggestions = getSuggestions(text);
  suggest(suggestions.map(s => ({
    content: s.url,           // Value sent to onInputEntered
    description: s.label      // Displayed to user (supports XML markup)
  })));
});

// User selected a suggestion or pressed Enter
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  // disposition: "currentTab" | "newForegroundTab" | "newBackgroundTab"
  const url = text.startsWith('http') ? text : `https://search.example.com/?q=${encodeURIComponent(text)}`;

  switch (disposition) {
    case 'currentTab':
      chrome.tabs.update({ url });
      break;
    case 'newForegroundTab':
      chrome.tabs.create({ url });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url, active: false });
      break;
  }
});

chrome.omnibox.onInputCancelled.addListener(() => {
  // User pressed Escape or clicked away
  console.log('Omnibox session cancelled');
});
```

## Rich Suggestions with XML Markup {#rich-suggestions-with-xml-markup}
```javascript
// Description supports limited XML for styling
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest([
    {
      content: 'https://example.com/docs',
      description: '<match>Docs</match> - <dim>Official documentation</dim>'
    },
    {
      content: 'https://example.com/api',
      description: '<url>example.com/api</url> - API Reference'
    }
  ]);
});

// Supported tags:
// <match>text</match>  — highlighted text (bold)
// <dim>text</dim>      — dimmed/secondary text
// <url>text</url>      — URL-styled text
```

## Setting Default Suggestion {#setting-default-suggestion}
```javascript
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  // The default suggestion appears at the top
  chrome.omnibox.setDefaultSuggestion({
    description: `Search for "<match>${escapeXml(text)}</match>" in extension docs`
  });

  suggest([/* other suggestions */]);
});

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

## Practical Example: Command Palette {#practical-example-command-palette}
```javascript
const COMMANDS = [
  { name: 'settings', url: chrome.runtime.getURL('options.html'), desc: 'Open settings' },
  { name: 'history', url: 'chrome://history', desc: 'Browse history' },
  { name: 'downloads', url: 'chrome://downloads', desc: 'View downloads' },
  { name: 'extensions', url: 'chrome://extensions', desc: 'Manage extensions' },
];

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const matches = COMMANDS.filter(c => c.name.includes(text.toLowerCase()));
  suggest(matches.map(c => ({
    content: c.url,
    description: `<match>${c.name}</match> - <dim>${c.desc}</dim>`
  })));
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const cmd = COMMANDS.find(c => c.name === text.toLowerCase());
  const url = cmd ? cmd.url : text;
  chrome.tabs.update({ url });
});
```

## Storing Search History {#storing-search-history}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  omniboxHistory: 'string' // JSON: string[] of recent queries
}), 'local');

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const raw = await storage.get('omniboxHistory');
  const history = raw ? JSON.parse(raw) : [];
  history.unshift(text);
  await storage.set('omniboxHistory', JSON.stringify(history.slice(0, 100)));
});

// Show recent queries as suggestions
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const raw = await storage.get('omniboxHistory');
  const history = raw ? JSON.parse(raw) : [];
  const matches = history.filter(h => h.includes(text));
  suggest(matches.slice(0, 5).map(h => ({
    content: h,
    description: `<dim>Recent:</dim> <match>${escapeXml(h)}</match>`
  })));
});
```

## Common Mistakes {#common-mistakes}
- Forgetting to escape XML in descriptions (causes rendering errors)
- Not handling all three `disposition` values in `onInputEntered`
- Slow suggestion callbacks (keep under 200ms — use caching)
- Not setting a default suggestion (confuses users)
- Using a keyword that conflicts with common URLs or search terms

## Related Articles {#related-articles}

## Related Articles

- [Command Palette](../patterns/command-palette.md)
- [Commands API](../api-reference/commands-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
