---
layout: default
title: "Chrome Extension Scripting API — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/scripting-api/"
---
# Scripting API Guide

## Overview {#overview}
# Chrome Scripting API Guide

The Chrome Scripting API (`chrome.scripting`) is the modern way to inject JavaScript and CSS into web pages in Manifest V3 extensions. It replaces the deprecated `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` methods from Manifest V2.

## Required Permission

The Scripting API is essential for extensions that need to:
- Inject JavaScript into web pages programmatically
- Apply or remove CSS styles dynamically
- Register content scripts at runtime based on conditions
- Work with different execution worlds (MAIN vs ISOLATED)

## Manifest Configuration {#manifest-configuration}

To use the Scripting API, you must declare the `"scripting"` permission in your manifest.json:
Add the `scripting` permission to your `manifest.json`:

```json
{ "permissions": ["scripting"] }
```

## chrome.scripting.executeScript

## ExecuteScript Basics {#executescript-basics}

The `chrome.scripting.executeScript()` method injects JavaScript code into a page. This is the primary method for programmatically running content scripts.

### Basic Syntax {#basic-syntax}
Inject JavaScript into web pages using files or functions:

```javascript
// Inject a file
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content-script.js']
}, (results) => console.log(results));

// Inject a function
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => document.title
}, (results) => console.log(results[0].result));

// Inject into all frames
chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  func: () => location.href
});

// Inject into specific frames
chrome.scripting.executeScript({
  target: { tabId: tab.id, frameIds: [0, 2] },
  files: ['frame-script.js']
});
```

### Injecting Files {#injecting-files}
## chrome.scripting.insertCSS

Inject CSS into pages:

```javascript
chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  files: ['styles/injected.css']
});

chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: '.highlight { background: yellow; }'
});
```

### Return Values {#return-values}

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

## Injecting CSS {#injecting-css}

The Scripting API provides methods for dynamically manipulating CSS in web pages.

### insertCSS {#insertcss}

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

### removeCSS {#removecss}
## chrome.scripting.removeCSS

Remove previously injected CSS:

```javascript
chrome.scripting.removeCSS({
  target: { tabId: tab.id },
  css: '.highlight { background: yellow; }'
});
```

## chrome.scripting.registerContentScripts

Register content scripts dynamically at runtime:

```javascript
chrome.scripting.registerContentScripts([{
  id: 'my-script',
  matches: ['https://*.example.com/*'],
  js: ['content-script.js'],
  css: ['styles.css'],
  runAt: 'document_idle'
}], () => console.log('Registered'));
```

## chrome.scripting.unregisterContentScripts

Unregister scripts:

```javascript
chrome.scripting.unregisterContentScripts();
chrome.scripting.unregisterContentScripts({ ids: ['my-script'] });
```

## chrome.scripting.getRegisteredContentScripts

List all registered scripts:

```javascript
chrome.scripting.getRegisteredContentScripts((scripts) => console.log(scripts));
```

## chrome.scripting.updateContentScripts

Update registered scripts:

```javascript
chrome.scripting.updateContentScripts([{
  id: 'my-script',
  excludeMatches: ['https://*.exclude.com/*']
}], () => console.log('Updated'));
```

## InjectionTarget Properties

| Property | Type | Description |
|----------|------|-------------|
| tabId | number | Target tab ID (required) |
| frameIds | number[] | Specific frame IDs |
| allFrames | boolean | Inject into all frames |

## ScriptInjection: files vs func

- **files**: Array of file paths to inject
- **func**: Function to serialize and execute in target context

```javascript
// Use args to pass data to func
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (msg) => console.log(msg),
  args: ['Hello']
});
```

## ExecutionWorld

| World | Description |
|-------|-------------|
| `ISOLATED` | Default. Extension-only scope |
| `MAIN` | Page's main world (page scripts can access) |

```javascript
// Safer - default
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => /* extension-only */
});

// Dangerous - page can see code
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => window.pageVar
});
```

## RunAt

Control script execution timing:

| Value | Description |
|-------|-------------|
| `document_start` | Before DOM construction |
| `document_end` | After DOM, before resources |
| `document_idle` | After DOM complete (default) |

```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['early.js'],
  runAt: 'document_start'
});
```

## Migrating from chrome.tabs.executeScript (MV2)

**MV2:**
```javascript
chrome.tabs.executeScript(tabId, { file: 'script.js', allFrames: true });
```

**MV3:**
```javascript
chrome.scripting.executeScript({
  target: { tabId, allFrames: true },
  files: ['script.js']
});
```

Changes: API moved to `chrome.scripting`, `file` → `files` (array), target is an object.

## Building a User Script Manager

```javascript
class UserScriptManager {
  async register(script) {
    await chrome.scripting.registerContentScripts([{
      id: script.id,
      matches: script.matches,
      js: script.js || [],
      css: script.css || [],
      runAt: script.runAt || 'document_idle'
    }]);
  }
  async unregister(id) {
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
  }
  async execute(tabId, options) {
    return chrome.scripting.executeScript({
      target: { tabId },
      files: options.js,
      world: options.world || 'ISOLATED'
    });
  }
}
const mgr = new UserScriptManager();
await mgr.register({ id: 'demo', matches: ['<all_urls>'], js: ['main.js'] });
```

## Security Considerations

### Principle of Least Privilege
Request only necessary host permissions:
```json
{ "host_permissions": ["https://*.example.com/*"] }
```

### Avoid MAIN World Execution
Page scripts can access code in MAIN world—use ISOLATED (default) when possible.

### Validate Targets Before Injection
```javascript
async function safeExecute(tabId, script) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url.startsWith('http')) throw new Error('Restricted URL');
  return chrome.scripting.executeScript({ target: { tabId }, ...script });
}
```

### Handle CSP Restrictions
Some pages block injection via CSP—handle gracefully:
```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => { try { return document.body.innerHTML; } catch(e){ return null; } }
});
```

## Complete Example: Text Highlighter

```javascript
chrome.runtime.onMessage.addListener((req, sender) => {
  if (req.action === 'highlight') highlightText(req.text, sender.tab.id);
});

async function highlightText(text, tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    css: '.ext-highlight { background: yellow; }'
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

## Dynamic Content Script Registration {#dynamic-content-script-registration}

The `chrome.scripting.registerContentScripts()` method allows you to register content scripts programmatically at runtime, without requiring them to be declared in the manifest.

### Registering Scripts {#registering-scripts}

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

### Script Registration Options {#script-registration-options}

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

### Managing Registered Scripts {#managing-registered-scripts}

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

## World Isolation: MAIN vs ISOLATED {#world-isolation-main-vs-isolated}

Chrome extensions execute content scripts in one of two JavaScript worlds:

### ISOLATED World (Default) {#isolated-world-default}

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

### MAIN World {#main-world}

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

### When to Use MAIN World {#when-to-use-main-world}

Use the MAIN world when you need to:
- Interact with page's JavaScript frameworks (React, Angular, Vue)
- Access page-defined global variables
- Call page-defined functions
- Work with page's SPA router state

### When to Use ISOLATED World {#when-to-use-isolated-world}

Use the ISOLATED world (default) when:
- Avoiding conflicts with page JavaScript
- Security is a concern (isolation protects against page JS accessing extension code)
- Working primarily with DOM manipulation

## Targeting Specific Tabs and Frames {#targeting-specific-tabs-and-frames}

The Scripting API allows precise targeting of where code should execute.

### Targeting Specific Tabs {#targeting-specific-tabs}

```javascript
// Get the active tab and inject
async function injectIntoActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    console.error('No active tab found');
    return;
  }
  
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (searchText) => {
      const walker = document.createTreeWalker(
        document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        const idx = node.textContent.indexOf(searchText);
        if (idx >= 0) {
          const span = document.createElement('span');
          span.className = 'ext-highlight';
          span.textContent = searchText;
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + searchText.length);
          range.surroundContents(span);
          break;
        }
      }
    },
    args: [text]
  });
}
```

### Targeting Specific Frames {#targeting-specific-frames}

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

### Finding Frame IDs {#finding-frame-ids}

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

## MV3 Migration from chrome.tabs.executeScript {#mv3-migration-from-chrometabsexecutescript}

If you're migrating from Manifest V2, here's how to convert your code:

### MV2 Code {#mv2-code}

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

### MV3 Equivalent {#mv3-equivalent}

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

### Permission Changes {#permission-changes}

| MV2 Permission | MV3 Permission |
|---------------|----------------|
| `"tabs"` (for tab access) | `"scripting"` + host permissions |
| `"<all_urls>"` | `"host_permissions": ["<all_urls>"]` |
| Automatic on page load | Must use `registerContentScripts` or inject on demand |

### Key Differences {#key-differences}

1. **Permissions**: MV3 requires explicit host permissions for each site
2. **Promise-based**: MV3 supports promises (can use async/await)
3. **World option**: MV3 adds the `world` option for MAIN/ISOLATED choice
4. **No more automatic injection**: Use `registerContentScripts` for automatic loading

### Full Migration Example {#full-migration-example}

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

## Error Handling {#error-handling}

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

## Best Practices {#best-practices}

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

## Summary {#summary}

The Scripting API is essential for Manifest V3 extensions that need to:
- Programmatically inject JavaScript or CSS into web pages
- Register content scripts dynamically based on runtime conditions
- Work with both isolated and main execution contexts
- Precisely target specific tabs, frames, or all frames

Understanding the differences between ISOLATED and MAIN worlds, proper error handling, and the migration path from Manifest V2 will help you build robust and secure extensions.

## Related Articles {#related-articles}

## Related Articles

- [Scripting API Reference](../api-reference/scripting-api.md)
- [Content Script Injection](../patterns/content-script-injection.md)
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
## Reference

- [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
