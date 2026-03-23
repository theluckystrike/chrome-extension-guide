---
layout: default
title: "Chrome Extension Sandboxed Pages — Best Practices"
description: "Use sandboxed pages for secure user-generated content."
canonical_url: "https://bestchromeextensions.com/patterns/sandboxed-pages/"
---

# Sandboxed Pages in Chrome Extensions

Sandboxed pages are a powerful pattern in Chrome extensions that allow running code with relaxed Content Security Policy (CSP), enabling features that would otherwise be blocked. This pattern is essential for certain use cases but requires careful security considerations.

## Manifest Configuration {#manifest-configuration}

To use sandboxed pages, declare them in your `manifest.json`:

```json
{
  "sandbox": {
    "pages": [
      "sandbox.html",
      "templates/compiler.html"
    ]
  }
}
```

Sandboxed pages run with relaxed CSP that allows `eval()`, `new Function()`, and inline scripts that would otherwise violate the extension's CSP.

## Security Model {#security-model}

Sandboxed pages operate under significant restrictions:

- **No chrome.* APIs**: Cannot access any Chrome extension APIs directly
- **No network requests**: Cannot make XMLHttpRequest or fetch calls
- **No DOM access to parent**: Cannot access the parent page's DOM
- **Isolated origin**: Runs in a unique origin separate from the extension

This security model protects the extension from potentially malicious code running in the sandbox while allowing dangerous operations like `eval` within a controlled environment.

## Communication: postMessage {#communication-postmessage}

Since sandboxed pages cannot directly access extension APIs, communication happens via `postMessage`:

{% raw %}
```javascript
// Main extension page (background.js or popup)
const sandbox = document.createElement('iframe');
sandbox.src = chrome.runtime.getURL('sandbox.html');
document.body.appendChild(sandbox);

sandbox.contentWindow.postMessage({ 
  action: 'render', 
  template: '{{greeting}}', 
  data: { greeting: 'Hello!' } 
}, '*');

window.addEventListener('message', (event) => {
  console.log('Result:', event.data.result);
});
```
{% endraw %}

```javascript
// sandbox.html
window.addEventListener('message', (event) => {
  const { action, template, data } = event.data;
  
  if (action === 'render') {
    // Use Handlebars, EJS, or similar
    const compiled = Handlebars.compile(template);
    const result = compiled(data);
    
    event.source.postMessage({ result }, '*');
  }
});
```

## Use Cases {#use-cases}

### Template Engines {#template-engines}

Many template engines (Handlebars, EJS, Underscore.js) rely on `eval` for runtime compilation:

{% raw %}
```javascript
// sandbox.html - Handlebars example
const Handlebars = window.Handlebars;
const template = Handlebars.compile('{{greeting}}, {{name}}!');
const output = template({ greeting: 'Hello', name: 'World' });
```
{% endraw %}

### User-Provided Scripts {#user-provided-scripts}

Allow users to write custom scripts that get executed safely:

```javascript
// sandbox.html - Safe script execution
const safeEval = (script, context) => {
  with (context) {
    return eval(script);
  }
};
```

### Rich Text Editors {#rich-text-editors}

Some rich text editors use `eval` for dynamic style calculations or markdown parsing.

## Multiple Sandboxed Pages {#multiple-sandboxed-pages}

For different libraries or security requirements, use multiple sandboxes:

```json
{
  "sandbox": {
    "pages": [
      "sandbox/handlebars.html",
      "sandbox/markdown.html",
      "sandbox/user-scripts.html"
    ]
  }
}
```

Each sandbox runs in its own isolated context with separate CSP relaxations.

## Performance Considerations {#performance-considerations}

- **iframe overhead**: Each sandboxed page requires an iframe, adding DOM overhead
- **Message serialization**: Complex data passed via postMessage incurs serialization costs
- **Startup latency**: Loading sandbox pages takes time; consider preloading
- **Memory usage**: Each iframe maintains its own JavaScript context

## Alternatives {#alternatives}

Before using sandboxed pages, consider these alternatives:

1. **Pre-compile templates at build time**: Use Handlebars precompilation to avoid runtime `eval`
2. **Use eval-free libraries**: Libraries like Nunjucks support precompilation
3. **Web Workers**: For heavy computation without DOM requirements
4. **Native JS templating**: Use template literals which don't require `eval`

## Testing Sandboxed Pages {#testing-sandboxed-pages}

For debugging, navigate directly to the sandbox page URL:

```
chrome-extension://<extension-id>/sandbox.html
```

This allows direct inspection and debugging of the sandbox environment.

## Example: Complete Template Engine Sandbox {#example-complete-template-engine-sandbox}

```javascript
// popup.js
function renderWithSandbox(template, data) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sandbox/compiler.html');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const handler = (event) => {
      if (event.data.type === 'compiled') {
        window.removeEventListener('message', handler);
        iframe.remove();
        resolve(event.data.html);
      }
    };
    
    window.addEventListener('message', handler);
    iframe.onload = () => {
      iframe.contentWindow.postMessage({ template, data }, '*');
    };
  });
}
```

```html
<!-- sandbox/compiler.html -->
<script src="handlebars.min.js"></script>
<script>
  window.addEventListener('message', (event) => {
    const { template, data } = event.data;
    const compiled = Handlebars.compile(template);
    const html = compiled(data);
    event.source.postMessage({ type: 'compiled', html }, '*');
  });
</script>
```

## Cross-References {#cross-references}

- [CSP Reference](../reference/csp-reference.md)
- [CSP Workarounds](./csp-workarounds.md)
- [MV3 Content Security Policy](../mv3/content-security-policy.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
