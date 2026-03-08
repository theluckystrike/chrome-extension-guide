---
layout: default
title: "Building Omnibox Extensions for Chrome — Complete Tutorial"
description: "A comprehensive tutorial on building Chrome extension omnibox experiences: keyword registration, input events, suggestions, rich suggestions, and integrating with search APIs."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/omnibox-api-guide/"
---

# Building Omnibox Extensions for Chrome

The Chrome Omnibox API transforms your extension into a powerful command center accessible directly from the address bar. This tutorial walks you through building feature-rich omnibox experiences, from basic keyword registration to advanced search integration with real-time suggestions.

## Overview {#overview}

The omnibox (Chrome's address bar) provides a powerful interface for extensions to create custom search experiences, command palettes, and quick-action tools. When users type your defined keyword followed by a space, they enter your extension's context, where you can provide real-time suggestions and execute actions based on their input.

Key capabilities include:
- Custom keyword activation from the address bar
- Real-time suggestions as users type
- Rich suggestions with descriptions and formatting
- Default suggestions for initial display
- Seamless navigation on selection
- Integration with external search APIs

## Manifest Configuration {#manifest-configuration}

### Basic Keyword Registration

The first step is registering your extension's keyword in the manifest. Unlike most APIs, the Omnibox doesn't require a permission—only the `omnibox` key in your manifest.

```json
{
  "manifest_version": 3,
  "name": "Quick Search Extension",
  "version": "1.0",
  "description": "Quick search across multiple services",
  "omnibox": {
    "keyword": "qs"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

The `keyword` field defines what users type to activate your extension. Choose something short, memorable, and unlikely to conflict with search engines.

### Multiple Keywords (Advanced)

You can also provide localized keywords:

```json
{
  "omnibox": {
    "keyword": "search",
    "keywords": ["search", "s"]
  }
}
```

## Event Handling {#event-handling}

The Omnibox API provides three core events that form the lifecycle of user interaction: input started, input changed, and input entered.

### onInputStarted

Fired when the user activates your keyword in the omnibox (types your keyword followed by a space). This is your opportunity to initialize state and prepare for input.

```javascript
// background.js
chrome.omnibox.onInputStarted.addListener(() => {
  console.log('User entered omnibox mode');
  
  // Set up the default suggestion
  chrome.omnibox.setDefaultSuggestion({
    description: 'Search the web for %s'
  });
  
  // Initialize any session state if needed
  // This event only fires once per omnibox activation
});
```

### onInputChanged

Fired each time the user changes their input while in your extension's context. This is where you'll typically fetch and provide suggestions.

```javascript
// background.js
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  console.log('Input changed:', text);
  
  if (!text.trim()) {
    // No input - provide default suggestions
    suggestCallback([
      {
        content: 'help',
        description: 'Show help and documentation'
      },
      {
        content: 'settings',
        description: 'Open extension settings'
      }
    ]);
    return;
  }
  
  // Example: Filter suggestions based on input
  const allSuggestions = [
    { content: 'chrome extensions', description: 'Search Chrome extensions' },
    { content: 'javascript tutorials', description: 'Search JavaScript tutorials' },
    { content: 'css tricks', description: 'Search CSS tricks and tips' },
    { content: 'web development', description: 'Search web development topics' }
  ];
  
  const filtered = allSuggestions.filter(s => 
    s.description.toLowerCase().includes(text.toLowerCase())
  );
  
  suggestCallback(filtered);
});
```

### onInputEntered

Fired when the user presses Enter or selects a suggestion. This is where you handle the final action.

```javascript
// background.js
chrome.omnibox.onInputEntered.addListener((text) => {
  console.log('User entered:', text);
  
  // Navigate to a search URL based on input
  const searchUrl = `https://example.com/search?q=${encodeURIComponent(text)}`;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.update(tabs[0].id, { url: searchUrl });
    }
  });
});
```

### onInputCancelled

Fired when the user exits omnibox mode without making a selection. Use this to clean up any state.

```javascript
// background.js
chrome.omnibox.onInputCancelled.addListener(() => {
  console.log('User cancelled omnibox');
  // Clean up any temporary state
});
```

## Providing Suggestions {#providing-suggestions}

### Basic Suggestions

The `suggest()` method accepts an array of suggestion objects. Each suggestion requires:

- `content`: The actual value that gets passed to `onInputEntered`
- `description`: The text displayed in the dropdown

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  const suggestions = [
    {
      content: 'bookmarks',
      description: '📚 Browse your bookmarks'
    },
    {
      content: 'history',
      description: '🕐 Search browsing history'
    },
    {
      content: 'tabs',
      description: '🔖 Manage open tabs'
    }
  ];
  
  suggestCallback(suggestions);
});
```

### Rich Suggestions

For more sophisticated suggestions, you can use XML-style formatting in descriptions:

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  const suggestions = [
    {
      content: 'javascript',
      description: '<match>JavaScript</match> - Programming language tutorials',
      deletable: true
    },
    {
      content: 'python',
      description: '<match>Python</match> - Data science & AI tutorials',
      deletable: true
    },
    {
      content: 'rust',
      description: '<match>Rust</match> - Systems programming language',
      deletable: true
    }
  ];
  
  // Filter based on input
  const filtered = suggestions.filter(s => 
    s.description.toLowerCase().includes(text.toLowerCase())
  );
  
  suggestCallback(filtered);
});
```

Formatting options available:
- `<match>`: Highlights matching text
- `<url>`: Displays as a clickable link (read-only)

### Default Suggestions

The default suggestion appears in the omnibox input field itself and is what gets submitted if the user presses Enter without selecting a suggestion.

```javascript
// Set the default suggestion
chrome.omnibox.setDefaultSuggestion({
  description: 'Search everything for "%s"'
});

// Or with more details
chrome.omnibox.setDefaultSuggestion({
  description: 'Press Enter to search for %s on Google',
  // Optional: Provide a content value for the default
  content: 'default-search'
});
```

The `%s` placeholder is replaced with the current user input.

## Navigation on Selection {#navigation}

### Basic URL Navigation

The most common pattern is navigating to a URL based on user input:

```javascript
chrome.omnibox.onInputEntered.addListener((text) => {
  const baseUrl = 'https://www.google.com/search?q=';
  const url = baseUrl + encodeURIComponent(text);
  
  chrome.tabs.update({ url });
});
```

### Different Behaviors Based on Input

You can implement context-aware navigation:

```javascript
chrome.omnibox.onInputEntered.addListener((text) => {
  const commands = {
    'bookmarks': () => {
      chrome.tabs.update({ url: 'chrome://bookmarks' });
    },
    'downloads': () => {
      chrome.tabs.update({ url: 'chrome://downloads' });
    },
    'history': () => {
      chrome.tabs.update({ url: 'chrome://history' });
    }
  };
  
  // Check if input matches a command
  const command = commands[text.toLowerCase()];
  if (command) {
    command();
    return;
  }
  
  // Default: search behavior
  const searchUrl = `https://example.com/search?q=${encodeURIComponent(text)}`;
  chrome.tabs.update({ url: searchUrl });
});
```

### Opening in New Tab

```javascript
chrome.omnibox.onInputEntered.addListener((text) => {
  const url = `https://example.com/page?q=${encodeURIComponent(text)}`;
  
  chrome.tabs.create({ url });
});
```

## Combining with Search APIs {#search-apis}

### Integrating with External Search Services

Here's a complete example that integrates with an external search API:

```javascript
// background.js

// Set default suggestion when user enters omnibox
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Search GitHub for %s'
  });
});

// Handle input changes and fetch suggestions from API
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  if (!text || text.length < 2) {
    suggestCallback([]);
    return;
  }
  
  // Example: Fetch suggestions from a search API
  fetch(`https://api.example.com/suggestions?q=${encodeURIComponent(text)}`)
    .then(response => response.json())
    .then(data => {
      const suggestions = data.results.map(result => ({
        content: result.url,
        description: `<match>${result.title}</match> - ${result.description}`
      }));
      suggestCallback(suggestions);
    })
    .catch(error => {
      console.error('Error fetching suggestions:', error);
      // Fallback suggestions
      suggestCallback([
        {
          content: `https://example.com/search?q=${encodeURIComponent(text)}`,
          description: `Search for "${text}" on Example.com`
        }
      ]);
    });
});

// Handle final selection
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  let url;
  
  // Determine URL based on input
  if (text.startsWith('http')) {
    url = text;
  } else {
    url = `https://example.com/search?q=${encodeURIComponent(text)}`;
  }
  
  // Handle different window dispositions
  switch (disposition) {
    case 'newForegroundTab':
      chrome.tabs.create({ url });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url, active: false });
      break;
    default:
      chrome.tabs.update({ url });
  }
});
```

### Debouncing API Requests

For better performance, debounce your API calls:

```javascript
// background.js
let debounceTimer;

chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    // Perform search
    fetchSuggestions(text, suggestCallback);
  }, 150); // Wait 150ms after last keystroke
});

function fetchSuggestions(text, suggestCallback) {
  // ... fetch logic here
}
```

### Caching Suggestions

Cache results to reduce API calls:

```javascript
// background.js
const suggestionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  // Check cache first
  const cached = suggestionCache.get(text);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    suggestCallback(cached.results);
    return;
  }
  
  // Fetch fresh results
  fetch(`https://api.example.com/suggest?q=${encodeURIComponent(text)}`)
    .then(res => res.json())
    .then(results => {
      // Cache the results
      suggestionCache.set(text, {
        results,
        timestamp: Date.now()
      });
      suggestCallback(results);
    });
});
```

## Complete Example {#complete-example}

Here's a working example that combines all the concepts:

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Dev Docs Search",
  "version": "1.0",
  "description": "Quick search through developer documentation",
  "omnibox": {
    "keyword": "dev"
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

### background.js

```javascript
// Dev Docs Search - Complete Example

// Documentation sources
const DOC_SOURCES = [
  { name: 'MDN', url: 'https://developer.mozilla.org/search?q=', icon: '📚' },
  { name: 'React', url: 'https://react.dev/search?q=', icon: '⚛️' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/docs/?q=', icon: '💎' },
  { name: 'Chrome Extensions', url: 'https://developer.chrome.com/docs/extensions/search/', icon: '🔧' }
];

// Initialize when user enters omnibox
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Search developer documentation for %s'
  });
});

// Handle input changes
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  if (!text) {
    // Show available sources when no input
    const sources = DOC_SOURCES.map(source => ({
      content: `source:${source.name.toLowerCase()}`,
      description: `${source.icon} Search ${source.name}`
    }));
    suggestCallback(sources);
    return;
  }
  
  // Check for source-specific search
  if (text.startsWith('source:')) {
    const sourceName = text.replace('source:', '').trim();
    const source = DOC_SOURCES.find(s => 
      s.name.toLowerCase() === sourceName.toLowerCase()
    );
    
    if (source) {
      suggestCallback([{
        content: `${source.url}getting-started`,
        description: `Search ${source.name} for "getting-started"`
      }]);
      return;
    }
  }
  
  // Generate suggestions for each source
  const suggestions = DOC_SOURCES.map(source => ({
    content: `${source.url}${encodeURIComponent(text)}`,
    description: `${source.icon} Search ${source.name} for "${text}"`
  }));
  
  suggestCallback(suggestions);
});

// Handle selection
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  let url;
  
  // Handle source-specific search
  if (text.startsWith('source:')) {
    const sourceName = text.replace('source:', '').trim();
    const source = DOC_SOURCES.find(s => 
      s.name.toLowerCase() === sourceName.toLowerCase()
    );
    
    if (source) {
      url = source.url + 'getting-started';
    } else {
      // Default to first source
      url = DOC_SOURCES[0].url + encodeURIComponent(sourceName);
    }
  } else if (text.startsWith('http')) {
    // Direct URL
    url = text;
  } else {
    // Default: search first source
    url = DOC_SOURCES[0].url + encodeURIComponent(text);
  }
  
  // Handle tab opening based on disposition
  switch (disposition) {
    case 'newForegroundTab':
      chrome.tabs.create({ url });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url, active: false });
      break;
    case 'currentTab':
    default:
      chrome.tabs.update({ url });
  }
});
```

## Best Practices {#best-practices}

1. **Choose memorable keywords** - Keep them short and unique. Avoid common words that might conflict with search engines.

2. **Provide immediate feedback** - Set a default suggestion so users know what will happen if they press Enter.

3. **Handle empty input gracefully** - Show useful default options when there's no input.

4. **Debounce API calls** - Wait for the user to stop typing before making expensive requests.

5. **Cache results** - Reduce latency and API load by caching recent suggestions.

6. **Use clear descriptions** - Make it obvious what each suggestion will do.

7. **Consider the user workflow** - Provide shortcuts for common actions.

8. **Test thoroughly** - The omnibox has specific behavior in different Chrome modes (incognito, etc.).

## Common Pitfalls {#common-pitfalls}

- **Forgetting setDefaultSuggestion** - Users won't know what happens on Enter
- **Not encoding URLs** - Special characters can break navigation
- **Too many suggestions** - Keep the list focused and relevant
- **Ignoring error handling** - API failures should have graceful fallbacks
- **Not handling disposition** - Users may expect different tab behaviors

---

## Related Articles {#related-articles}

- [Omnibox API Reference](/chrome-extension-guide/guides/omnibox-api/) — Complete API documentation and reference
- [Omnibox Patterns](/chrome-extension-guide/patterns/omnibox-api/) — Advanced patterns and architectural guidance
- [Commands API - Keyboard Shortcuts](/chrome-extension-guide/guides/commands-keyboard-shortcuts/) — Adding keyboard shortcuts to your extension

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
