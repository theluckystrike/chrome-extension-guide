---
layout: default
title: "Chrome Extension Search Api Patterns. Best Practices"
description: "Implement search functionality with the Search API."
canonical_url: "https://bestchromeextensions.com/patterns/search-api-patterns/"
---

# Chrome Search API Patterns

The `chrome.search` API enables programmatic web searches from your Chrome extension. This document covers patterns for implementing search functionality in extensions.

Basic Usage: chrome.search.query() {#basic-usage-chromesearchquery}

The primary method is `chrome.search.query()`, which triggers a search using the user's default search engine.

```javascript
chrome.search.query({
  text: 'search term',
  disposition: 'CURRENT_TAB' // or 'NEW_TAB', 'NEW_WINDOW'
});
```

Disposition Options {#disposition-options}

- `CURRENT_TAB`: Opens results in the active tab (replaces current page)
- `NEW_TAB`: Opens results in a new tab
- `NEW_WINDOW`: Opens results in a new window

Common Use Cases {#common-use-cases}

1. Search from Context Menu {#1-search-from-context-menu}

```javascript
// manifest.json
{
  "permissions": ["search", "contextMenus"]
}

// background.js
chrome.contextMenus.create({
  id: 'search-selection',
  title: 'Search for: "%s"',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'search-selection') {
    chrome.search.query({
      text: info.selectionText,
      disposition: 'NEW_TAB'
    });
  }
});
```

2. Search from Omnibox {#2-search-from-omnibox}

```javascript
// manifest.json
{
  "permissions": ["search", "omnibox"]
}

// background.js
chrome.omnibox.onInputEntered.addListener((text) => {
  chrome.search.query({
    text: text,
    disposition: 'NEW_TAB'
  });
});
```

3. Search Selected Text {#3-search-selected-text}

```javascript
// Search selected text via keyboard shortcut or context menu
chrome.commands.onCommand.addListener((command) => {
  if (command === 'search-selection') {
    chrome.tabs.executeScript({ code: 'window.getSelection().toString()' }, (results) => {
      const selectedText = results[0];
      if (selectedText) {
        chrome.search.query({ text: selectedText, disposition: 'CURRENT_TAB' });
      }
    });
  }
});
```

Combining with Omnibox API for Custom Search Engines {#combining-with-omnibox-api-for-custom-search-engines}

```javascript
// Multi-engine search via omnibox
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const suggestions = [
    { content: `https://www.google.com/search?q=${text}`, description: `Google: ${text}` },
    { content: `https://www.bing.com/search?q=${text}`, description: `Bing: ${text}` },
    { content: `https://duckduckgo.com/?q=${text}`, description: `DuckDuckGo: ${text}` }
  ];
  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener((url) => {
  chrome.tabs.update({ url });
});
```

Building Multi-Engine Search {#building-multi-engine-search}

```javascript
const searchEngines = {
  google: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  bing: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  duckduckgo: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  custom: (query) => `https://your-search-endpoint.com/search?q=${encodeURIComponent(query)}`
};

function searchWithEngine(query, engine = 'google', disposition = 'NEW_TAB') {
  const url = searchEngines[engine](query);
  chrome.search.query({ text: query, disposition });
}
```

Search Suggestions with chrome.omnibox.onInputChanged {#search-suggestions-with-chromeomniboxoninputchanged}

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (text.length < 2) return;
  
  // Fetch suggestions from your API
  fetch(`https://api.example.com/suggestions?q=${text}`)
    .then(res => res.json())
    .then(suggestions => {
      const results = suggestions.map(s => ({
        content: s.url,
        description: s.title
      }));
      suggest(results);
    });
});
```

Search History Integration with chrome.history {#search-history-integration-with-chromehistory}

```javascript
// Get recent searches for suggestions
chrome.history.search({ text: query, maxResults: 10 }, (results) => {
  const searchSuggestions = results.map(r => ({
    content: r.url,
    description: r.title || query
  }));
  suggest(searchSuggestions);
});
```

Permission Requirements {#permission-requirements}

Add `"search"` to your `manifest.json` permissions:

```json
{
  "permissions": ["search"]
}
```

Limitations {#limitations}

- Can only trigger searches: The API cannot read search results programmatically
- Uses default search engine: By default, uses the user's configured search engine
- No direct results access: Cannot parse or analyze search engine results through this API

Alternative: Direct API Calls {#alternative-direct-api-calls}

For programmatic results, call search engine APIs directly:

```javascript
fetch('https://custom-search-api.example.com/search?q=query')
  .then(res => res.json())
  .then(data => {
    // Process results programmatically
    data.results.forEach(result => {
      console.log(result.title, result.url);
    });
  });
```

Building a Search Aggregator Popup {#building-a-search-aggregator-popup}

```javascript
// popup.js - Display results from multiple engines
async function searchAllEngines(query) {
  const engines = ['google', 'bing', 'duckduckgo'];
  const results = await Promise.all(
    engines.map(engine => 
      fetch(`/api/${engine}?q=${query}`).then(r => r.json())
    )
  );
  
  // Aggregate and display results
  results.forEach((engineResults, index) => {
    displayResults(engineResults, engines[index]);
  });
}
```

Code Examples Summary {#code-examples-summary}

| Pattern | File | Description |
|---------|------|-------------|
| Context menu search | `examples/context-menu-search/` | Right-click to search selected text |
| Multi-engine search | `examples/multi-engine-search/` | Search with Google, Bing, DuckDuckGo |
| Omnibox search provider | `examples/omnibox-search/` | Custom search via address bar |

Cross-References {#cross-references}

- [Permissions: search](../permissions/search.md)
- [Omnibox API Patterns](omnibox-api.md)
- [History API Reference](../api-reference/history-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
