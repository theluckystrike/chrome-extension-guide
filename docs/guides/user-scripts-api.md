---
layout: default
title: "Chrome Extension User Scripts API — How to Inject User-Provided Scripts"
description: "A comprehensive developer guide for using the chrome.userScripts API to inject user-provided scripts, including MAIN world execution, script registration, and security best practices."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/user-scripts-api/"
---

# Chrome Extension User Scripts API — How to Inject User-Provided Scripts

## Overview {#overview}

The Chrome Extension User Scripts API (`chrome.userScripts`) is a powerful API designed specifically for building user script managers like Tampermonkey or Violentmonkey directly within Chrome extensions. Unlike traditional content scripts that are packaged with your extension, the User Scripts API allows extensions to execute scripts provided by users at runtime, enabling users to customize web pages with their own JavaScript code.

This API is particularly valuable for developers building extension platforms that support user-created scripts, as it provides a secure mechanism for registering and executing third-party code within web pages. The User Scripts API bridges the gap between the extension's controlled environment and the dynamic nature of user-generated content.

## Understanding the User Scripts API {#understanding-user-scripts-api}

The `chrome.userScripts` API enables extensions to register user scripts that can be executed on web pages. These scripts are stored and managed by your extension, allowing users to add their own JavaScript code that runs alongside the extension's built-in functionality.

To use this API, your extension must declare the `"userScripts"` permission in the manifest:

```json
{
  "name": "User Script Manager",
  "version": "1.0",
  "permissions": [
    "userScripts"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

The API provides several key methods for managing user scripts:

- `chrome.userScripts.register(scripts)` — Register one or more user scripts
- `chrome.userScripts.unregister(scriptIdsOrMatchPatterns)` — Unregister user scripts
- `chrome.userScripts.getScripts()` — Retrieve all registered user scripts
- `chrome.userScripts.update(updateScriptOptions)` — Update existing user scripts

## Registering User Scripts {#registering-user-scripts}

When registering user scripts, you define their behavior using a `UserScript` object that specifies the script content, matching patterns, and execution details:

```javascript
async function registerUserScript(scriptContent, matchPattern) {
  const userScript = {
    id: 'my-user-script-' + Date.now(),
    matches: [matchPattern],
    js: [{ code: scriptContent }],
    runAt: 'document_end'
  };

  await chrome.userScripts.register([userScript]);
  console.log('User script registered successfully');
}
```

The `UserScript` object supports several properties:

- **id** — A unique identifier for the script
- **matches** — An array of match patterns specifying which URLs the script applies to
- **js** — An array of script sources (files or inline code) to inject
- **css** — An array of CSS files to inject
- **runAt** — When to inject the script (`document_start`, `document_end`, or `document_idle`)
- **world** — The execution world (`ISOLATED` or `MAIN`)

## The MAIN World Execution {#main-world-execution}

One of the most powerful features of the User Scripts API is the ability to execute scripts in the MAIN world rather than the isolated world used by traditional content scripts.

The `world` property allows you to specify where the script runs:

```javascript
const userScript = {
  id: 'main-world-script',
  matches: ['<all_urls>'],
  js: [{ code: 'console.log("Running in MAIN world");' }],
  world: 'MAIN'  // Execute in the page's context
};
```

### Why MAIN World Matters

Running scripts in the MAIN world provides significant advantages:

1. **Access to page variables** — Scripts can read and modify global variables defined by the page
2. **DOM access without restrictions** — Full access to the document without content script sandboxing
3. **Interaction with page JavaScript** — Can call functions defined by the page's own JavaScript
4. **Better debugging** — Scripts appear in the page's debugger alongside the site's code

However, this power comes with important security implications that we'll discuss later.

## User Script Managers {#user-script-managers}

The User Scripts API is the foundation for building user script managers—extensions that allow users to install and manage scripts from repositories like GreasyFork or OpenUserJS.

A typical user script manager architecture includes:

1. **Script storage** — Persisting user scripts using chrome.storage or a database
2. **Script editor** — A UI for users to write or edit their scripts
3. **Script compilation** — Converting user scripts into the format expected by the API
4. **Automatic updates** — Checking for script updates from external sources
5. **Script injection** — Registering scripts when matching pages load

Here's a simplified implementation pattern:

```javascript
class UserScriptManager {
  constructor() {
    this.scripts = new Map();
  }

  async addScript(scriptData) {
    const userScript = this.convertToUserScript(scriptData);
    this.scripts.set(userScript.id, userScript);
    await chrome.userScripts.register([userScript]);
  }

  async removeScript(scriptId) {
    this.scripts.delete(scriptId);
    await chrome.userScripts.unregister([scriptId]);
  }

  async reloadAll() {
    await chrome.userScripts.unregister(
      this.scripts.keys()
    );
    await chrome.userScripts.register(
      Array.from(this.scripts.values())
    );
  }

  convertToUserScript(scriptData) {
    return {
      id: scriptData.id,
      matches: scriptData.matches,
      js: [{ code: scriptData.code }],
      runAt: scriptData.runAt || 'document_end',
      world: scriptData.mainWorld ? 'MAIN' : 'ISOLATED'
    };
  }
}
```

## Security Considerations {#security-considerations}

When building extensions that execute user-provided scripts, security must be your top priority. The User Scripts API provides powerful capabilities, but with great power comes great responsibility.

### Main World Security Risks

Running scripts in the MAIN world introduces several security concerns:

1. **XSS vulnerabilities** — User scripts can inadvertently create cross-site scripting vulnerabilities if they don't properly sanitize their inputs
2. **Page compromise** — Malicious user scripts could steal session cookies or authentication tokens
3. **Extension API exposure** — Scripts running in MAIN world may have indirect access to extension APIs through message passing

### Best Practices

Follow these security guidelines when implementing user script functionality:

```javascript
// Always validate and sanitize user script content
function validateUserScript(script) {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /document\.cookie/,
    /localStorage/,
    /sessionStorage/,
    /eval\s*\(/,
    /new Function\s*\(/
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(script.code)) {
      console.warn('Potentially dangerous code detected');
      return false;
    }
  }

  return true;
}

// Implement script approval workflow
async function approveScript(script) {
  if (!validateUserScript(script)) {
    throw new Error('Script validation failed');
  }

  // Limit MAIN world access
  if (script.requestMainWorld) {
    const userConfirmed = await showConfirmationDialog(
      'This script requests MAIN world access. This is potentially dangerous. Continue?'
    );
    if (!userConfirmed) {
      throw new Error('User rejected MAIN world access');
    }
  }
}
```

### Recommended Security Measures

- **Sandbox user scripts by default** — Use `world: 'ISOLATED'` unless MAIN world is absolutely necessary
- **Implement content security policies** — Restrict what user scripts can do
- **Provide clear warnings** — Alert users when scripts request privileged access
- **Audit suspicious scripts** — Scan user scripts for known malicious patterns
- **Use subresource integrity** — Verify script integrity when loading from external sources

## Conclusion {#conclusion}

The Chrome Extension User Scripts API provides a robust foundation for building extensions that can execute user-provided scripts. By understanding how to register scripts, leverage MAIN world execution, and implement proper security measures, you can create powerful user script managers that enhance the browsing experience while maintaining security.

Whether you're building a full-featured user script manager or adding script injection capabilities to your extension, the User Scripts API offers the flexibility and control needed to handle dynamic script execution safely and effectively.
