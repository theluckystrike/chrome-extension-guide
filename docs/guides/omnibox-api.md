# Omnibox API Guide

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
