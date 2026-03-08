---
layout: default
title: "Chrome Extension Csp Workarounds — Best Practices"
description: "Navigate Content Security Policy restrictions in Chrome extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/csp-workarounds/"
---

# CSP Workarounds in Chrome Extensions (MV3)

Chrome Extensions in Manifest V3 operate under strict Content Security Policy (CSP) constraints that differ significantly from web pages. Understanding these constraints and their workarounds is essential for building secure, functional extensions.

## MV3 CSP Constraints {#mv3-csp-constraints}

The default CSP for MV3 extensions prohibits three key capabilities:
- **No `eval()`** - Code execution from strings is forbidden
- **No inline scripts** - `<script>` tags with inline code are blocked
- **No remote code** - Loading and executing external scripts is not allowed

## Replacing `eval()` {#replacing-eval}

### Function Constructor Alternatives {#function-constructor-alternatives}

Instead of `eval()`, use the `Function` constructor with careful input validation:

```javascript
// Avoid: eval('return ' + userInput)
const safeCompute = new Function('a', 'b', 'return a + b');
```

### Structured Data Parsing {#structured-data-parsing}

For dynamic data processing, use built-in parsing methods:

```javascript
const data = JSON.parse(userInput);
const result = data.reduce((acc, item) => acc + item.value, 0);
```

## Replacing Inline Scripts {#replacing-inline-scripts}

### Move to Separate .js Files {#move-to-separate-js-files}

All executable code should reside in external JavaScript files:

```html
<!-- Bad -->
<script>console.log('inline');</script>

<!-- Good -->
<script src="background.js"></script>
```

### Event Listeners {#event-listeners}

Use event-driven patterns instead of inline event handlers:

```javascript
document.getElementById('btn').addEventListener('click', handleClick);
```

## Replacing Remote Code {#replacing-remote-code}

### Bundle All Code Locally {#bundle-all-code-locally}

All functionality must be included in the extension package:

```json
{
  "content_scripts": [{
    "js": ["content.js", "helpers.js", "utils.js"]
  }]
}
```

### Config-Driven Behavior {#config-driven-behavior}

Use configuration objects to control behavior without remote code:

```javascript
const features = { enableFeatureX: true, theme: 'dark' };
if (features.enableFeatureX) { /* ... */ }
```

## Dynamic Code Patterns {#dynamic-code-patterns}

### Safe Template Engines {#safe-template-engines}

Use template libraries that don't rely on `eval()`:

```javascript
import { html } from 'lit-html';
const template = html`<p>Hello, ${name}!</p>`;
```

### Safe Alternatives to innerHTML {#safe-alternatives-to-innerhtml}

Use DOMParser or template elements:

```javascript
const parser = new DOMParser();
const doc = parser.parseFromString(htmlString, 'text/html');
const safeElement = doc.body.firstChild;
container.appendChild(safeElement);
```

## Sandboxed Pages {#sandboxed-pages}

For pages requiring `eval()` (e.g., legacy template engines), use sandboxing:

### Manifest Configuration {#manifest-configuration}

```json
{
  "sandbox": {
    "pages": ["sandbox.html"]
  }
}
```

### Using postMessage for Communication {#using-postmessage-for-communication}

```javascript
// Main page
window.postMessage({ code: 'return 1 + 1' }, '*');

// Sandbox page
window.addEventListener('message', (e) => {
  const result = new Function(e.data.code)();
  e.source.postMessage(result, e.origin);
});
```

## WebAssembly Alternative {#webassembly-alternative}

For computationally intensive logic, consider WebAssembly:

```javascript
const wasmModule = await WebAssembly.instantiate(wasmBytes);
const result = wasmModule.exports.compute(input);
```

## Content Script CSP {#content-script-csp}

Content scripts inherit the host page's CSP plus the extension's CSP. This means:
- Inline scripts in the page are blocked
- External resources may be restricted by page CSP
- Extension APIs remain available regardless of page CSP

## Debugging CSP Violations {#debugging-csp-violations}

Check the console for CSP violation messages:

```
Refused to evaluate a string as JavaScript because 'unsafe-eval' is not 
allowed in the Content-Security-Policy.
```

Use Chrome's extension debugger to identify specific violation sources.

## See Also {#see-also}

- [CSP Reference](../reference/csp-reference.md)
- [MV3 Content Security Policy](../mv3/content-security-policy.md)
- [Security Best Practices](../guides/security-best-practices.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
