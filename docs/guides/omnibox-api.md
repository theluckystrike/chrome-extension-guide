---
layout: default
title: "Chrome Extension Omnibox API — How to Add Custom Address Bar Commands"
description: "A comprehensive guide to the Chrome Omnibox API. Learn how to add custom address bar commands with keyword triggers, suggestions, default suggestions, onInputChanged handlers, and rich suggestions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/omnibox-api/"
---

# Chrome Extension Omnibox API — How to Add Custom Address Bar Commands

The Chrome Omnibox API allows you to extend Chrome's address bar with custom commands and suggestions. When users type a keyword you define in the omnibox (Chrome's address bar), your extension can provide custom suggestions, handle user input, and perform actions—all without requiring users to open a popup or navigate to a separate page. This powerful API transforms the address bar into a command center for your extension.

## Required Permissions

To use the Omnibox API, you need to declare the `"omnibox"` permission in your `manifest.json`:

```json
{
  "permissions": ["omnibox"],
  "omnibox": {
    "keyword": "myext"
  }
}
```

The `omnibox` key defines the keyword that triggers your extension's custom behavior. When users type this keyword followed by a space in the address bar, Chrome switches to your extension's context and begins sending input events to your background script.

## Setting Up the Keyword Trigger

The keyword trigger is the entry point for your omnibox functionality. In the manifest, you specify a single keyword that users will type to activate your extension's omnibox features. Once activated, Chrome sends all subsequent keystrokes to your extension's `onInputChanged` event handler.

For more advanced use cases, you can programmatically set or update the keyword using the `setDefaultSuggestion` method. This is particularly useful if you want to change the keyword based on user preferences or extension state:

```javascript
// In your background script
chrome.omnibox.setDefaultSuggestion({
  description: "Search my extension: %s"
});
```

The `%s` placeholder gets replaced with what the user types after your keyword. This default suggestion appears in the address bar dropdown and provides users with context about what your extension does.

## Handling User Input with onInputChanged

The `onInputChanged` event is the core of your omnibox implementation. This event fires whenever the user types after activating your keyword, and it's where you generate suggestions based on their input:

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  // text contains what the user typed after your keyword
  const suggestions = [];
  
  // Generate suggestions based on user input
  if (text.startsWith('bug')) {
    suggestions.push({
      content: 'bug ' + text.substring(4),
      description: 'Report a bug: ' + text.substring(4)
    });
  } else if (text.startsWith('search')) {
    suggestions.push({
      content: 'search ' + text.substring(7),
      description: 'Search in extension'
    });
  }
  
  // Pass suggestions back to Chrome
  suggestCallback(suggestions);
});
```

The `suggestCallback` function accepts an array of suggestion objects. Each suggestion must have a `content` (the value that gets passed to your onInputEntered handler) and a `description` (what displays in the dropdown).

For asynchronous suggestion generation—such as fetching data from an API or searching through stored data—use the callback pattern shown above. Chrome will wait for your callback to be invoked before displaying suggestions.

## Creating Suggestions

The suggestions you provide through the Omnibox API can be simple text or rich suggestions with additional formatting. Each suggestion object supports these properties:

- **content**: The string that's passed to your action handler when the user selects this suggestion
- **description**: The text displayed in the dropdown (supports XML-like formatting)
- **descriptionStyles**: Styling for portions of the description
- **icon**: An icon to display next to the suggestion (can be a URL or a relative path)

Here's an example of creating multiple suggestions:

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  const suggestions = [
    {
      content: 'open-dashboard',
      description: '📊 Open Dashboard'
    },
    {
      content: 'open-settings',
      description: '⚙️ Open Settings'
    },
    {
      content: 'new-project',
      description: '➕ Create New Project'
    }
  ];
  
  // Filter suggestions based on input
  const filtered = suggestions.filter(s => 
    s.description.toLowerCase().includes(text.toLowerCase())
  );
  
  suggestCallback(filtered);
});
```

## Default Suggestion

The default suggestion is special—it's the first item in the dropdown and represents the action that will be taken if the user presses Enter without selecting a specific suggestion. You can set this using `setDefaultSuggestion`:

```javascript
chrome.omnibox.setDefaultSuggestion({
  description: 'Press Enter to open the extension dashboard'
});
```

The default suggestion updates dynamically based on what the user types. This is useful for showing contextual information or the most likely action:

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  // Update the default suggestion based on input
  chrome.omnibox.setDefaultSuggestion({
    description: text.length > 0 
      ? `Search for "${text}" in the extension`
      : 'Type to search or select an option'
  });
  
  // ... generate and pass suggestions
});
```

## Rich Suggestions

For more visually appealing suggestions, you can use rich suggestion formatting with styled portions. This allows you to highlight parts of the description, add icons, and create a more polished user experience:

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggestCallback) => {
  const suggestions = [
    {
      content: 'project-alpha',
      description: '<url>project-alpha.dev</url> — Active project',
      descriptionStyles: [
        { type: 'url', start: 0, end: 19 },
        { type: 'dim', start: 19, end: 32 }
      ]
    },
    {
      content: 'project-beta',
      description: '<url>project-beta.io</url> — <match>Pending</match> review',
      descriptionStyles: [
        { type: 'url', start: 0, end: 16 },
        { type: 'match', start: 27, end: 34 }
      ]
    }
  ];
  
  suggestCallback(suggestions);
});
```

The `descriptionStyles` array lets you apply different styles to portions of the description:
- **url**: Displays as a URL (blue, underlined)
- **match**: Highlights matching text (bold)
- **dim**: Displays dimmed text for secondary information

## Handling User Selection

Finally, you need to handle what happens when the user selects a suggestion or presses Enter. The `onInputEntered` event provides the `content` of the selected suggestion:

```javascript
chrome.omnibox.onInputEntered.addListener((text) => {
  if (text === 'open-dashboard') {
    chrome.tabs.create({ url: 'dashboard.html' });
  } else if (text === 'open-settings') {
    chrome.tabs.create({ url: 'settings.html' });
  } else if (text.startsWith('search ')) {
    const query = text.substring(7);
    // Perform search or navigate
    chrome.tabs.create({ url: `search.html?q=${encodeURIComponent(query)}` });
  }
});
```

## Conclusion

The Omnibox API transforms Chrome's address bar into a powerful command interface for your extension. By defining a keyword trigger, handling user input with `onInputChanged`, providing contextual suggestions, and using rich suggestion formatting, you can create a seamless user experience that feels like a native part of Chrome. Whether you're building a quick-access menu, a search interface, or a productivity tool, the Omnibox API provides the foundation for intuitive address bar interactions.
