---
layout: default
title: "Chrome Scripting API: Programmatic Script and CSS Injection — Developer Guide"
description: "A comprehensive guide to the Chrome Scripting API: executeScript, insertCSS/removeCSS, registerContentScripts, world targeting, injection targets, and migrating from MV2."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/scripting-api-guide/"
---

# Chrome Scripting API: Programmatic Script and CSS Injection

The Chrome Scripting API (`chrome.scripting`) is the cornerstone of programmatic injection in Manifest V3 extensions. It provides fine-grained control over when and how JavaScript and CSS are injected into web pages, replacing the deprecated `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` methods from Manifest V2.

## Overview {#overview}

The Scripting API enables extensions to:

- Inject JavaScript code or files into pages dynamically
- Insert and remove CSS styles programmatically
- Register content scripts at runtime
- Target specific frames and documents
- Execute scripts in different JavaScript worlds (MAIN vs ISOLATED)

## Required Permission {#required-permission}

To use the Scripting API, add the `scripting` permission to your `manifest.json`:

```json
{
  "permissions": ["scripting"]
}
```

For injections that only affect the active tab (user-initiated), you can use the `activeTab` permission instead, which doesn't require host permissions:

```json
{
  "permissions": ["activeTab", "scripting"]
}
```

## executeScript: Injecting JavaScript {#executescript}

The `chrome.scripting.executeScript()` method is the primary way to inject JavaScript into web pages. It supports two injection methods: files and functions.

### Injecting Files {#injecting-files}

Inject a JavaScript file that exists in your extension:

```javascript
// Inject a content script file into a specific tab
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content-script.js']
}, (results) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  console.log('Script injected:', results);
});
```

### Injecting Functions {#injecting-functions}

Inject an inline function that executes in the target page context:

```javascript
// Inject a function (serialized and executed in page context)
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    // This runs in the page's context
    return document.title;
  }
}, (results) => {
  console.log('Page title:', results[0].result);
});
```

When using functions, you can also pass arguments that will be serialized:

```javascript
// Pass arguments to the injected function
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (message, color) => {
    const div = document.createElement('div');
    div.textContent = message;
    div.style.backgroundColor = color;
    div.style.padding = '10px';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.right = '0';
    div.style.zIndex = '999999';
    document.body.appendChild(div);
    return div.id;
  },
  args: ['Hello from extension!', '#ff0000']
});
```

### Return Values {#return-values}

The `executeScript` method returns an array of results, one per frame:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  func: () => window.location.href
}, (results) => {
  results.forEach((result, frameIndex) => {
    console.log(`Frame ${frameIndex}: ${result.result}`);
  });
});
```

## insertCSS and removeCSS: Managing Styles {#insertcss}

The Scripting API provides methods to inject and remove CSS stylesheets.

### insertCSS: Injecting Styles {#insertcss-inject}

Inject CSS from a file:

```javascript
// Inject a CSS file
chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  files: ['styles/injected.css']
});
```

Inject inline CSS:

```javascript
// Inject inline CSS
chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: `
    .extension-highlight {
      background-color: yellow !important;
    }
    .extension-overlay {
      position: fixed;
      top: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      z-index: 999999;
    }
  `
});
```

### removeCSS: Removing Styles {#removecss}

Remove injected CSS styles:

```javascript
// Remove injected CSS by specifying the same content
chrome.scripting.removeCSS({
  target: { tabId: tab.id },
  css: '.extension-highlight { background-color: yellow !important; }'
});

// Remove all CSS from a file (must match exactly what was inserted)
chrome.scripting.removeCSS({
  target: { tabId: tab.id },
  files: ['styles/injected.css']
});
```

### CSS Injection with runAt {#css-runat}

Control when CSS is injected:

```javascript
// Inject CSS before the page loads
chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: 'body { opacity: 0; }',
  injectImmediately: true
});
```

## Injection Targets: Tabs, Frames, and All Frames {#injection-targets}

The Scripting API provides granular control over where scripts are injected.

### Target Specific Tab {#target-tab}

```javascript
// Inject into a specific tab by ID
chrome.scripting.executeScript({
  target: { tabId: 123 },
  files: ['content.js']
});
```

### Target All Frames in a Tab {#target-all-frames}

```javascript
// Inject into all frames in a tab
chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  files: ['content.js']
}, (results) => {
  console.log(`Injected into ${results.length} frames`);
});
```

### Target Specific Frames {#target-specific-frames}

```javascript
// Inject into specific frame IDs
chrome.scripting.executeScript({
  target: { tabId: tab.id, frameIds: [0, 2, 5] },
  files: ['frame-script.js']
});
```

### Get Frame IDs First {#get-frame-ids}

```javascript
// Get all frame IDs in a tab
chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
  const frameIds = frames.map(f => f.frameId);
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: frameIds },
    func: () => console.log('Injected!')
  });
});
```

## World Targeting: MAIN vs ISOLATED {#world-targeting}

Chrome extensions operate in two distinct JavaScript worlds.

### ISOLATED World (Default) {#world-isolated}

Content scripts run in an isolated world by default—they can access the DOM but cannot see page JavaScript variables:

```javascript
// Default: runs in ISOLATED world
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'ISOLATED',  // This is the default
  func: () => {
    // Can access DOM
    const title = document.title;
    const links = document.querySelectorAll('a');
    
    // Cannot access page JavaScript variables
    // window.pageVariable would be undefined
  }
});
```

### MAIN World {#world-main}

The MAIN world allows scripts to access page JavaScript variables and be accessed by page scripts:

```javascript
// Run in the page's MAIN world
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => {
    // Can access page variables
    console.log(window.pageData);
    
    // Page scripts can call this
    window.extensionFunction = () => {
      return 'Called from page!';
    };
  }
});

// Later, the page can call this function
// window.extensionFunction() // Returns 'Called from page!'
```

### Use Cases for MAIN World {#main-world-use-cases}

```javascript
// Use MAIN world to:
// 1. Read page JavaScript variables
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => window.reactStore?.state
});

// 2. Access page's localStorage/sessionStorage
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => localStorage.getItem('authToken')
});

// 3. Call page functions
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => window.someGlobalFunction()
});

// 4. Expose functions to page
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => {
    window.extendPage = {
      notify: (msg) => alert(msg),
      getSelection: () => window.getSelection().toString()
    };
  }
});
```

## registerContentScripts: Dynamic Registration {#register-content-scripts}

The `chrome.scripting.registerContentScripts()` method registers content scripts at runtime, providing an alternative to static declarations in manifest.json.

### Registering Scripts Dynamically {#register-scripts}

```javascript
// Register content scripts at runtime
chrome.scripting.registerContentScripts([{
  id: 'my-content-script',
  matches: ['https://*.example.com/*'],
  js: ['content.js'],
  css: ['styles.css'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  matchOriginAsFallback: true
}], () => {
  if (chrome.runtime.lastError) {
    console.error('Registration failed:', chrome.runtime.lastError);
  } else {
    console.log('Scripts registered successfully');
  }
});
```

### Unregistering Scripts {#unregister-scripts}

```javascript
// Unregister scripts by ID
chrome.scripting.unregisterContentScripts(['my-content-script'], () => {
  console.log('Scripts unregistered');
});

// Unregister all scripts
chrome.scripting.unregisterContentScripts(() => {
  console.log('All scripts unregistered');
});
```

### Getting Registered Scripts {#get-registered-scripts}

```javascript
// Get all registered content scripts
chrome.scripting.getRegisteredContentScripts((scripts) => {
  console.log('Registered scripts:', scripts);
});
```

### Update Scripts {#update-scripts}

```javascript
// Update existing scripts
chrome.scripting.updateContentScripts([{
  id: 'my-content-script',
  css: ['updated-styles.css']
}]);
```

## registerContentScripts vs Manifest content_scripts {#dynamic-vs-static}

There are two ways to declare content scripts: static (manifest) and dynamic (registerContentScripts).

### Static Declaration (Manifest) {#static-declaration}

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

**Pros:**
- Simple, declarative approach
- Automatically injected on matching pages
- No runtime API calls needed

**Cons:**
- Cannot be modified at runtime
- Fixed at extension installation/update
- May inject on pages where it's not needed

### Dynamic Registration (registerContentScripts) {#dynamic-declaration}

```javascript
// Register at runtime based on conditions
async function registerForDomain(domain) {
  await chrome.scripting.registerContentScripts([{
    id: `script-${domain}`,
    matches: [`https://*.${domain}/*`],
    js: ['content.js'],
    runAt: 'document_idle'
  }]);
}
```

**Pros:**
- Can be added/removed at runtime
- Conditional injection based on user preferences
- More flexible for complex extension logic
- User can enable/disable per-site

**Cons:**
- Requires runtime API calls
- Scripts don't persist across browser restarts (must re-register)
- Needs to be re-registered on extension update

### When to Use Each Approach {#when-to-use-which}

| Scenario | Recommended Approach |
|----------|---------------------|
| Always needed on specific sites | Static manifest |
| User-configurable site list | Dynamic registration |
| Context-aware injection | Dynamic registration |
| Simple extension | Static manifest |
| Complex conditional logic | Dynamic registration |

### Persisting Dynamic Scripts Across Sessions {#persisting-scripts}

Since `registerContentScripts` doesn't persist across browser restarts:

```javascript
// On extension startup, restore registered scripts
chrome.runtime.onStartup.addListener(() => {
  restoreUserConfiguredScripts();
});

// Also restore on installation/update
chrome.runtime.onInstalled.addListener(() => {
  restoreUserConfiguredScripts();
});

function restoreUserConfiguredScripts() {
  chrome.storage.local.get(['userConfiguredDomains'], (result) => {
    const domains = result.userConfiguredDomains || [];
    domains.forEach(domain => {
      chrome.scripting.registerContentScripts([{
        id: `dynamic-${domain}`,
        matches: [`https://*.${domain}/*`],
        js: ['content.js'],
        runAt: 'document_idle'
      }]);
    });
  });
}
```

## Replacing tabs.executeScript from MV2 {#migrating-from-mv2}

If you're migrating from Manifest V2, here's how to replace the deprecated methods.

### MV2: chrome.tabs.executeScript {#mv2-executescript}

```javascript
// MV2 (deprecated)
chrome.tabs.executeScript(tabId, {
  file: 'content.js'
}, (results) => {
  // Handle results
});
```

### MV3: chrome.scripting.executeScript {#mv3-executescript}

```javascript
// MV3 (current)
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
}, (results) => {
  // Handle results
});
```

### MV2: chrome.tabs.insertCSS {#mv2-insertcss}

```javascript
// MV2 (deprecated)
chrome.tabs.insertCSS(tabId, {
  file: 'styles.css'
});
```

### MV3: chrome.scripting.insertCSS {#mv3-insertcss}

```javascript
// MV3 (current)
chrome.scripting.insertCSS({
  target: { tabId: tabId },
  files: ['styles.css']
});
```

### Complete Migration Example {#migration-example}

```javascript
// Before (MV2)
function injectContentScript(tabId) {
  chrome.tabs.executeScript(tabId, {
    file: 'content.js'
  }, () => {
    chrome.tabs.insertCSS(tabId, {
      file: 'styles.css'
    });
  });
}

// After (MV3)
async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  });
  
  await chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ['styles.css']
  });
}
```

### Using Callback-Based APIs with Promises {#callback-to-promise}

For compatibility with modern async/await code:

```javascript
// Wrap callback-based API in a promise
function executeScript(tabId, options) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      ...options
    }, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(results);
      }
    });
  });
}

// Now use with async/await
async function main() {
  const results = await executeScript(tabId, {
    func: () => document.title
  });
  console.log(results[0].result);
}
```

## Error Handling {#error-handling}

Proper error handling is essential when working with the Scripting API:

```javascript
async function safeExecuteScript(tabId, options) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      ...options
    });
    return results;
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('No tab with id')) {
      console.error('Tab no longer exists');
    } else if (error.message.includes('Cannot access')) {
      console.error('Permission denied - check host permissions');
    } else {
      console.error('Script injection failed:', error);
    }
    throw error;
  }
}

// Common error scenarios
chrome.scripting.executeScript({
  target: { tabId: 99999 }  // Invalid tab ID
}, () => {});
// Error: No tab with id: 99999

chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['nonexistent.js']
}, () => {});
// Error: Could not load manifest
```

## Best Practices {#best-practices}

1. **Use ISOLATED world by default** - Only use MAIN when you need page access
2. **Minimize permissions** - Use `activeTab` for user-initiated actions
3. **Clean up injected content** - Remove CSS and scripts when no longer needed
4. **Handle errors gracefully** - Check for `chrome.runtime.lastError`
5. **Specify frames carefully** - Avoid `allFrames: true` unless necessary
6. **Consider performance** - Inject only what's needed, when it's needed

## Common Pitfalls {#common-pitfalls}

- **Assuming page is ready** - Use `runAt: 'document_idle'` or wait for DOM ready
- **Memory leaks** - Always disconnect observers and clean up DOM modifications
- **Security risks** - Be careful with `world: 'MAIN'` and user input
- **Timing issues** - Scripts may run before page scripts complete
- **Permission errors** - Ensure proper host permissions for target URLs

---

## Related Articles {#related-articles}

- [Content Scripts Guide](/chrome-extension-guide/tutorials/content-scripts-guide/) — Comprehensive guide to content script injection and isolation
- [Permissions Deep Dive](/chrome-extension-guide/tutorials/permissions-deep-dive/) — Understanding extension permissions and security
- [Messaging Quickstart](/chrome-extension-guide/tutorials/messaging-quickstart/) — Communication between extension components

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
