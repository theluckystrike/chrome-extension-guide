---
layout: default
title: "Chrome Extension User Scripts Patterns — Best Practices"
description: "Manage and inject user scripts with the User Scripts API."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/user-scripts-patterns/"
---

# UserScripts API Patterns (Chrome 120+)

The `chrome.userScripts` API allows Chrome extensions to register and manage user-provided scripts, similar to how Tampermonkey and Greasemonkey work. This enables users to customize web page behavior with their own JavaScript.

## API Overview

The userScripts API provides four main methods:

| Method | Description |
|--------|-------------|
| `register(scripts)` | Register one or more user scripts |
| `update(scripts)` | Update existing registered scripts |
| `unregister(scriptIds)` | Unregister scripts by their IDs |
| `getScripts()` | Retrieve all registered user scripts |

## Script Properties

When defining a user script, the following properties are available:

```javascript
{
  id: string,              // Unique identifier for the script
  matches: string[],       // URL patterns to inject into (e.g., ["<all_urls>"])
  excludeMatches?: string[], // URL patterns to exclude
  js: Array<{code: string} | {file: string}>, // Script content or file
  runAt?: "document_start" | "document_end" | "document_idle",
  world?: "USER_SCRIPT" | "ISOLATED"  // Execution world (default: USER_SCRIPT)
}
```

## Execution Worlds

User scripts can run in one of two worlds:

- **`USER_SCRIPT`**: Separate JavaScript world with limited API access. Scripts in this world share state and can access some Chrome extension APIs.
- **`ISOLATED`**: Same world as content scripts, full API access but no shared state.

## Registering Scripts Dynamically

```javascript
async function registerUserScript(script) {
  try {
    await chrome.userScripts.register([{
      id: script.id,
      matches: script.matches,
      js: [{ code: script.code }],
      runAt: 'document_idle',
      world: 'USER_SCRIPT'
    }]);
    console.log(`Script ${script.id} registered successfully`);
  } catch (error) {
    console.error('Failed to register script:', error);
  }
}
```

## Script Management

```javascript
// List active scripts
async function getActiveScripts() {
  const scripts = await chrome.userScripts.getScripts();
  return scripts;
}

// Disable a script (by unregistering)
async function disableScript(scriptId) {
  await chrome.userScripts.unregister([scriptId]);
}

// Enable a script (re-register with stored config)
async function enableScript(scriptConfig) {
  await chrome.userScripts.register([scriptConfig]);
}
```

## Userscript Header Parser

Userscripts typically include metadata in comments:

```javascript
// ==UserScript==
// @name         My Custom Script
// @match        https://example.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function parseUserscriptHeader(code) {
  const metadata = {};
  const headerMatch = code.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  
  if (headerMatch) {
    const lines = headerMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\/\/ @(\w+)\s+(.+)$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }
  }
  
  return {
    name: metadata.name || 'Unnamed Script',
    matches: metadata.match ? [metadata.match] : [],
    code: code.replace(headerMatch?.[0] || '', '').trim()
  };
}
```

## Security Considerations

- User scripts run in a restricted environment with limited API access
- Only available when extension is in developer mode
- Requires `"userScripts"` permission in manifest
- Scripts in `USER_SCRIPT` world have reduced API surface for security

## Permission Requirements

```json
{
  "permissions": ["userScripts"],
  "host_permissions": ["<all_urls>"]
}
```

Note: The extension must also have developer mode enabled for userScripts to function.

## Limitations

- Developer mode must be enabled for userScripts to run
- Not suitable for extensions distributed to general users via Chrome Web Store
- Primarily intended for personal use or developer testing

## Migration from Content Scripts

To migrate from dynamic content scripts to userScripts:

1. Replace `chrome.scripting.registerContentScripts` with `chrome.userScripts.register`
2. Add `world: "USER_SCRIPT"` for user script behavior
3. Implement userscript header parsing for compatibility
4. Add UI for users to import/edit scripts

## Related Patterns

- [User Scripts API](./user-scripts-api.md) - Full API reference
- [Scripting API](../api-reference/scripting-api.md) - Chrome's scripting API
- [Dynamic Content Scripts](../mv3/dynamic-content-scripts.md) - MV3 dynamic scripts
