---
layout: default
title: "Chrome Extension Scripting API — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Scripting API Guide

## Overview

The Chrome Extension Scripting API (`chrome.scripting`) is a powerful API introduced in Manifest V3 that provides fine-grained control over content script injection, CSS manipulation, and dynamic script registration. It replaces many of the capabilities that were previously handled by the Tabs API in Manifest V2.

The Scripting API is essential for extensions that need to:
- Inject JavaScript into web pages programmatically
- Apply or remove CSS styles dynamically
- Register content scripts at runtime based on conditions
- Work with different execution worlds (MAIN vs ISOLATED)

## Manifest Configuration

To use the Scripting API, you must declare the `"scripting"` permission in your manifest.json:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "permissions": [
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "manifest_version": 3
}
```

The `"scripting"` permission is required for all Scripting API methods. Additionally, you'll often need either `"activeTab"` (for user-invoked actions) or host permissions (like `"<all_urls>"`) to target specific pages.

## ExecuteScript Basics

The `chrome.scripting.executeScript()` method injects JavaScript code into a page. This is the primary method for programmatically running content scripts.

### Basic Syntax

```javascript
chrome.scripting.executeScript(
  {
    target: { tabId: 12345 },
    func: () => {
      document.body.style.backgroundColor = 'red';
    }
  },
  (results) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    console.log('Script executed:', results);
  }
);
```

### Injecting Files

You can inject an external JavaScript file instead of inline code:

```javascript
chrome.scripting.executeScript(
  {
    target: { tabId: 12345 },
    files: ['content-script.js']
  },
  (results) => {
    console.log(`Injected ${results.length} scripts`);
  }
);
```

### Return Values

The executeScript method returns the results of the injected function for each frame:

```javascript
// Injected function can return a value
chrome.scripting.executeScript(
  {
    target: { tabId: 12345, allFrames: true },
    func: () => {
      return {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      };
    }
  },
  (results) => {
    // results is an array - one per frame
    results.forEach((result, frameIndex) => {
      console.log(`Frame ${frameIndex}:`, result);
    });
  }
);
```

## Injecting CSS

The Scripting API provides methods for dynamically manipulating CSS in web pages.

### insertCSS

Insert CSS into a page to style its content:

```javascript
chrome.scripting.insertCSS(
  {
    target: { tabId: 12345 },
    css: `
      .highlight {
        background-color: yellow;
        padding: 2px 4px;
      }
    `
  },
  () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to insert CSS:', chrome.runtime.lastError);
    } else {
      console.log('CSS inserted successfully');
    }
  }
);
```

You can also inject from a file:

```javascript
chrome.scripting.insertCSS(
  {
    target: { tabId: 12345 },
    files: ['styles/highlight.css']
  }
);
```

### removeCSS

Remove previously injected CSS:

```javascript
chrome.scripting.removeCSS(
  {
    target: { tabId: 12345 },
    css: `
      .highlight {
        background-color: yellow;
        padding: 2px 4px;
      }
    `
  }
);
```

To remove previously injected CSS, call `removeCSS` with the same CSS string or file that was originally injected:

```javascript
const cssText = '.highlight { background: yellow; }';

async function injectHighlight(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    css: cssText
  });
  // insertCSS returns Promise<void> — no injection results
}

async function removeHighlight(tabId) {
  await chrome.scripting.removeCSS({
    target: { tabId },
    css: cssText
  });
}
```

## Dynamic Content Script Registration

The `chrome.scripting.registerContentScripts()` method allows you to register content scripts programmatically at runtime, without requiring them to be declared in the manifest.

### Registering Scripts

```javascript
chrome.scripting.registerContentScripts([
  {
    id: 'my-script',
    matches: ['https://*.example.com/*'],
    js: ['content-script.js'],
    css: ['styles.css'],
    runAt: 'document_end'
  }
]).then(() => {
  console.log('Content script registered successfully');
}).catch((error) => {
  console.error('Failed to register content script:', error);
});
```

### Script Registration Options

The registration object supports several options:

```javascript
chrome.scripting.registerContentScripts([
  {
    id: 'advanced-script',
    // Match patterns for pages where the script should run
    matches: [
      '<all_urls>',
      'https://*.example.com/*',
      'https://example.org/path/*'
    ],
    // Files to inject
    js: ['content-script.js'],
    css: ['styles.css'],
    // When to inject: "document_start", "document_end", "document_idle"
    runAt: 'document_idle',
    // Run in all frames or specific frames
    allFrames: false,
    // Match CSS only if a specific frame matches
    matchOriginAsFallback: true,
    // Specify which frames (main frame, subframes, etc.)
    frameIds: [0]  // Only main frame
  }
]);
```

### Managing Registered Scripts

You can get and unregister content scripts:

```javascript
// Get all registered scripts
chrome.scripting.getRegisteredContentScripts((scripts) => {
  console.log('Registered scripts:', scripts);
});

// Unregister a specific script by filter
chrome.scripting.unregisterContentScripts({ ids: ['my-script'] });

// Unregister all scripts (no filter)
chrome.scripting.unregisterContentScripts();
```

## World Isolation: MAIN vs ISOLATED

Chrome extensions execute content scripts in one of two JavaScript worlds:

### ISOLATED World (Default)

Content scripts run in the Isolated World, separate from the page's JavaScript:

```javascript
// This runs in the ISOLATED world
chrome.scripting.executeScript(
  {
    target: { tabId: 12345 },
    world: 'ISOLATED',  // Default
    func: () => {
      // Variables here don't leak to the page
      const myExtensionVar = 'secret';
      
      // Can access DOM
      document.querySelectorAll('.item');
    }
  }
);

// Page JavaScript cannot access myExtensionVar
```

### MAIN World

The MAIN world shares the page's JavaScript context:

```javascript
chrome.scripting.executeScript(
  {
    target: { tabId: 12345 },
    world: 'MAIN',
    func: () => {
      // Can access variables defined by page's JavaScript
      const pageVar = window.pageVariable;
      
      // Can call page's functions
      window.pageFunction();
      
      // Can interact with page's JavaScript-defined objects
      console.log(window.angular || window.React);
    }
  }
);
```

### When to Use MAIN World

Use the MAIN world when you need to:
- Interact with page's JavaScript frameworks (React, Angular, Vue)
- Access page-defined global variables
- Call page-defined functions
- Work with page's SPA router state

### When to Use ISOLATED World

Use the ISOLATED world (default) when:
- Avoiding conflicts with page JavaScript
- Security is a concern (isolation protects against page JS accessing extension code)
- Working primarily with DOM manipulation

## Targeting Specific Tabs and Frames

The Scripting API allows precise targeting of where code should execute.

### Targeting Specific Tabs

```javascript
// Get the active tab and inject
async function injectIntoActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    console.error('No active tab found');
    return;
  }
  
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log('Injected into:', document.title)
  });
}
```

### Targeting Specific Frames

```javascript
// Inject only into a specific frame by frameId
chrome.scripting.executeScript(
  {
    target: { tabId: 12345, frameId: 5 },
    func: () => console.log('Injected into frame:', window.location.href)
  }
);

// Inject into all frames
chrome.scripting.executeScript(
  {
    target: { tabId: 12345, allFrames: true },
    func: () => console.log('Frame URL:', window.location.href)
  }
);
```

### Finding Frame IDs

To find frame IDs, you can use the debugging API:

```javascript
chrome.debugger.sendCommand({ tabId: 12345 }, 'Page.getFrameTree', (response) => {
  // response.frameTree contains the frame hierarchy
  // Each frame has a frameId property
  console.log(response.frameTree);
});
```

Or use the script injection result to identify frames:

```javascript
chrome.scripting.executeScript(
  {
    target: { tabId: 12345, allFrames: true },
    func: () => ({
      frameId: window.frameId,
      url: window.location.href
    })
  },
  (results) => {
    results.forEach(r => console.log(r));
  }
);
```

## MV3 Migration from chrome.tabs.executeScript

If you're migrating from Manifest V2, here's how to convert your code:

### MV2 Code

```javascript
// Manifest V2 - chrome.tabs.executeScript
chrome.tabs.executeScript(
  tabId,
  {
    file: 'content-script.js',
    allFrames: true,
    runAt: 'document_end'
  },
  (results) => {
    console.log('Script results:', results);
  }
);
```

### MV3 Equivalent

```javascript
// Manifest V3 - chrome.scripting.executeScript
chrome.scripting.executeScript(
  {
    target: {
      tabId: tabId,
      allFrames: true
    },
    files: ['content-script.js'],
    world: 'ISOLATED',  // Default, equivalent to MV2 behavior
    injectImmediately: true  // If false/omitted, injects at document_idle
  },
  (results) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      return;
    }
    console.log('Script results:', results);
  }
);
```

### Permission Changes

| MV2 Permission | MV3 Permission |
|---------------|----------------|
| `"tabs"` (for tab access) | `"scripting"` + host permissions |
| `"<all_urls>"` | `"host_permissions": ["<all_urls>"]` |
| Automatic on page load | Must use `registerContentScripts` or inject on demand |

### Key Differences

1. **Permissions**: MV3 requires explicit host permissions for each site
2. **Promise-based**: MV3 supports promises (can use async/await)
3. **World option**: MV3 adds the `world` option for MAIN/ISOLATED choice
4. **No more automatic injection**: Use `registerContentScripts` for automatic loading

### Full Migration Example

```javascript
// MV2 Background Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'inject') {
    chrome.tabs.executeScript(
      sender.tab.id,
      {
        code: `console.log('Hello from MV2!');`,
        allFrames: true
      },
      (results) => sendResponse(results)
    );
    return true; // Keep message channel open for async response
  }
});

// MV3 Service Worker
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'inject') {
    const results = await chrome.scripting.executeScript({
      target: {
        tabId: sender.tab.id,
        allFrames: true
      },
      func: () => console.log('Hello from MV3!')
    });
    return results;
  }
});
```

## Error Handling

Proper error handling is crucial when working with the Scripting API:

```javascript
// Wrap in try-catch for sync operations
try {
  chrome.scripting.executeScript(
    {
      target: { tabId: 12345 },
      func: () => document.title
    },
    (results) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.error('Scripting error:', chrome.runtime.lastError.message);
        return;
      }
      console.log('Results:', results);
    }
  );
} catch (error) {
  console.error('Synchronous error:', error);
}

// Use promises with async/await for cleaner error handling
async function injectScript(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.title
    });
    return results[0].result;
  } catch (error) {
    // Handle permission errors, tab not found, etc.
    console.error('Injection failed:', error.message);
    throw error;
  }
}
```

Common errors include:
- `"No tab with id: XXX"` - Tab was closed or doesn't exist
- `"Scripting cannot be used"` - Missing permissions
- `"Permission denied"` - Host permission missing
- `"Frame not found"` - Frame was destroyed before injection

## Best Practices

1. **Use activeTab when possible**: This grants temporary access to the active tab without broad host permissions

2. **Check tab permissions before injecting**:
   ```javascript
   async function canInject(tabId) {
     try {
       await chrome.scripting.executeScript({
         target: { tabId },
         func: () => true
       });
       return true;
     } catch {
       return false;
     }
   }
   ```

3. **Use content script registration for automatic injection**: Register scripts in the manifest or dynamically for pages that need them always

4. **Prefer functions over strings**: Using `func` instead of `code` is safer and more performant

5. **Handle frame hierarchies carefully**: Remember that `allFrames` includes all frames, including iframes from different origins

6. **Clean up injected CSS**: Remove injected styles when they're no longer needed to avoid memory leaks

7. **Use world appropriately**: Only use MAIN world when necessary, as it can expose extension code to page scripts

## Summary

The Scripting API is essential for Manifest V3 extensions that need to:
- Programmatically inject JavaScript or CSS into web pages
- Register content scripts dynamically based on runtime conditions
- Work with both isolated and main execution contexts
- Precisely target specific tabs, frames, or all frames

Understanding the differences between ISOLATED and MAIN worlds, proper error handling, and the migration path from Manifest V2 will help you build robust and secure extensions.
