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
## Overview
The Omnibox API allows extensions to add keyword shortcuts to Chrome's address bar. When users type your defined keyword followed by a space, they can interact with your extension directly from the address bar.

## Setting Up in manifest.json
```json
{
  "name": "My Search Extension",
  "version": "1.0",
  "omnibox": {
    "keyword": "mysearch"
  },
  "permissions": ["storage"]
}
```
The `keyword` field defines what users type to activate your extension. Keep it short and unique.

## Handling Input {#handling-input}
## chrome.omnibox.setDefaultSuggestion
Sets the default suggestion that appears in the omnibox dropdown. This is the first result shown before the user presses Enter.
```javascript
chrome.omnibox.setDefaultSuggestion({
  description: 'Search for %s on MySearch'
});
```
The `%s` placeholder gets replaced with the user's current input text.

## chrome.omnibox.onInputStarted
Fired when the user activates your keyword in the omnibox (types your keyword + space). Use this to initialize state or prepare for input.
```javascript
chrome.omnibox.onInputStarted.addListener(() => {
  console.log('User activated omnibox');
  // Initialize any state, reset counters, etc.
});
```

## chrome.omnibox.onInputChanged
Fired whenever the user changes the input text. This is where you provide suggestions based on their query.
```javascript
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  // text = what user typed after your keyword
  
  if (text.length === 0) {
    chrome.omnibox.setDefaultSuggestion({
      description: 'Type to search...'
    });
    return;
  }
  
  // Generate suggestions
  const suggestions = [
    { content: 'search:' + text, description: 'Search for "' + text + '"' },
    { content: 'recent:' + text, description: 'Recent results for "' + text + '"' }
  ];
  
  suggest(suggestions);
});
```

## chrome.omnibox.onInputEntered
Fired when the user presses Enter after selecting a suggestion. This is where you perform the actual action.
```javascript
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  // text = the content of the selected suggestion
  // disposition = 'currentTab', 'newTab', or 'newForegroundTab'
  
  if (text.startsWith('search:')) {
    const query = text.replace('search:', '');
    const url = 'https://mysearch.com?q=' + encodeURIComponent(query);
    
    if (disposition === 'newTab') {
      chrome.tabs.create({ url });
    } else {
      chrome.tabs.update({ url });
    }
  }
});
```

## chrome.omnibox.onInputCancelled
Fired when the user exits the omnibox without making a selection (presses Escape or clicks away).
```javascript
chrome.omnibox.onInputCancelled.addListener(() => {
  console.log('User cancelled omnibox');
  // Clean up any temporary state
});
```

## chrome.omnibox.onDeleteSuggestion
Fired when the user deletes a suggestion from the omnibox history.
```javascript
chrome.omnibox.onDeleteSuggestion.addListener((text) => {
  console.log('User deleted suggestion:', text);
  // Optionally remove from your storage
});
```

## SuggestResult Format
Each suggestion is an object with two properties:
```javascript
{
  content: 'the-value-passed-to-onInputEntered',  // Internal value
  description: 'What the user sees in the dropdown'  // Display text
}
```

## XML-like Markup for Styled Descriptions
You can use simple XML-like tags to style your suggestions:
```javascript
const suggestions = [
  {
    content: 'https://example.com',
    description: '<match>Example</match> Search Engine'
  },
  {
    content: 'https://docs.example.com',
    description: '<url>https://docs.example.com</url> - Documentation'
  },
  {
    content: 'recent',
    description: '<dim>Recent Searches</dim>'
  }
];
```
- `<match>`: Highlights matching text
- `<url>`: Displays as a URL (dimmed)
- `<dim>`: Dims the text

## Async Suggestion Fetching
For suggestions that require async operations (like API calls), use Promises:
```javascript
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  fetchSuggestions(text).then(suggestions => {
    suggest(suggestions);
  });
});

async function fetchSuggestions(query) {
  const response = await fetch('https://api.example.com/suggest?q=' + query);
  const data = await response.json();
  return data.map(item => ({
    content: item.id,
    description: item.name
  }));
}
```

## Debouncing Input for API Calls
To avoid excessive API calls while typing, debounce the input:
```javascript
let debounceTimer;

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  clearTimeout(debounceTimer);
  
  if (text.length < 2) {
    suggest([]);
    return;
  }
  
  debounceTimer = setTimeout(() => {
    fetchSuggestions(text).then(suggestions => {
      suggest(suggestions);
    });
  }, 300);  // Wait 300ms after last keystroke
});
```

## Building a Complete Search Extension
Here's a practical example combining all concepts:
```javascript
// background.js
chrome.omnibox.onInputStarted.addListener(() => {
  console.log('Omnibox activated');
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (!text) {
    chrome.omnibox.setDefaultSuggestion({
      description: 'Enter a search term'
    });
    return;
  }
  
  // Debounced suggestion fetching
  clearTimeout(window.debounceTimer);
  window.debounceTimer = setTimeout(async () => {
    const suggestions = await getSuggestions(text);
    suggest(suggestions);
  }, 250);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = 'https://mysite.com/search?q=' + encodeURIComponent(text);
  
  switch (disposition) {
    case 'newTab':
      chrome.tabs.create({ url });
      break;
    case 'newForegroundTab':
      chrome.tabs.create({ url, active: true });
      break;
    default:
      chrome.tabs.update({ url });
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
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
  console.log('Cancelled');
});

async function getSuggestions(query) {
  // Example: return some dummy suggestions
  return [
    { content: query, description: 'Search for "' + query + '"' },
    { content: query + ' site:example.com', description: 'Search "' + query + '" on example.com' }
  ];
}
```

## Common Mistakes
- Forgetting to set the `keyword` in manifest.json
- Not handling empty input gracefully
- Making too many API calls without debouncing
- Using `content` for display text (use `description` for that)
- Not handling different `disposition` values for tab management

## Reference
- Official Docs: https://developer.chrome.com/docs/extensions/reference/api/omnibox
