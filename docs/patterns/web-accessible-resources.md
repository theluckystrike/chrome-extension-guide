---
layout: default
title: "Chrome Extension Web Accessible Resources. Best Practices"
description: "Configure web accessible resources in Manifest V3 for content script and page access."
canonical_url: "https://bestchromeextensions.com/patterns/web-accessible-resources/"
---

Web Accessible Resources Patterns

Overview {#overview}

The [web accessible resources reference](../mv3/web-accessible-resources.md) covers manifest configuration. This guide focuses on practical patterns: injecting UI into pages, secure resource loading, dynamic resource URLs, fingerprint protection, and communication between web pages and extension resources.

---

How Web Accessible Resources Work {#how-web-accessible-resources-work}

Web accessible resources are extension files that web pages can load. In MV3, you must declare which origins can access which resources:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["widget.html", "widget.js", "widget.css", "images/*"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

Without this declaration, web pages cannot load `chrome-extension://<id>/widget.html`. the request will fail.

---

Pattern 1: Injecting a Full UI Widget {#pattern-1-injecting-a-full-ui-widget}

Use web accessible resources to inject complex UI into web pages via iframes:

```ts
// content.ts. Inject an extension iframe into the page
function injectWidget() {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("widget.html");
  iframe.id = "my-ext-widget";

  // Style the iframe to float over the page
  Object.assign(iframe.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    width: "360px",
    height: "480px",
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
    zIndex: "2147483647",
  });

  // Prevent the page from interfering with the iframe
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");

  document.body.appendChild(iframe);
  return iframe;
}
```

```html
<!-- widget.html. Served from extension, loaded in page context -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="widget.css" />
</head>
<body>
  <div id="widget-root">
    <header>
      <h2>My Extension</h2>
      <button id="close-widget">X</button>
    </header>
    <main id="widget-content"></main>
  </div>
  <script src="widget.js"></script>
</body>
</html>
```

Communication Between Iframe and Content Script {#communication-between-iframe-and-content-script}

```ts
// widget.js. Inside the extension iframe
document.getElementById("close-widget")?.addEventListener("click", () => {
  // Send message to parent content script
  window.parent.postMessage({ type: "ext-widget-close" }, "*");
});

// Receive data from content script
window.addEventListener("message", (event) => {
  if (event.data?.type === "ext-widget-data") {
    renderData(event.data.payload);
  }
});
```

```ts
// content.ts. Listen for messages from the widget iframe
window.addEventListener("message", (event) => {
  // Verify the message is from our iframe
  if (event.data?.type === "ext-widget-close") {
    document.getElementById("my-ext-widget")?.remove();
  }
});

// Send data to the widget
function sendToWidget(data: unknown) {
  const iframe = document.getElementById("my-ext-widget") as HTMLIFrameElement;
  iframe?.contentWindow?.postMessage(
    { type: "ext-widget-data", payload: data },
    chrome.runtime.getURL("")
  );
}
```

---

Pattern 2: Injecting CSS from Extension {#pattern-2-injecting-css-from-extension}

Load extension-bundled stylesheets into web pages:

```ts
// content.ts. Inject extension CSS
function injectExtensionCSS() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("injected-styles.css");
  document.head.appendChild(link);
  return link;
}

// Or inject as a style element to avoid FOUC
async function injectCSSInline() {
  const url = chrome.runtime.getURL("injected-styles.css");
  const response = await fetch(url);
  const css = await response.text();

  const style = document.createElement("style");
  style.textContent = css;
  style.setAttribute("data-ext-id", chrome.runtime.id);
  document.head.appendChild(style);
  return style;
}
```

Declare in manifest:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["injected-styles.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

Pattern 3: Extension Images in Web Pages {#pattern-3-extension-images-in-web-pages}

Display extension-bundled images in content scripts:

```ts
// content.ts
function createExtensionImage(path: string, alt: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL(path);
  img.alt = alt;
  return img;
}

// Usage
const logo = createExtensionImage("images/logo.png", "Extension logo");
document.getElementById("my-ext-container")?.appendChild(logo);
```

SVG Icons {#svg-icons}

```ts
// Load SVG as inline content for CSS styling
async function inlineExtensionSVG(path: string): Promise<SVGElement> {
  const url = chrome.runtime.getURL(path);
  const response = await fetch(url);
  const svgText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.documentElement as unknown as SVGElement;
}
```

---

Pattern 4: Dynamic Resource URL Generation {#pattern-4-dynamic-resource-url-generation}

Generate URLs at runtime for resources that depend on state:

```ts
// content.ts
function getThemedResource(resource: string): string {
  // All variants must be declared in web_accessible_resources
  return chrome.runtime.getURL(`themes/${getCurrentTheme()}/${resource}`);
}

// Manifest must include all possible paths
// "resources": ["themes/light/*", "themes/dark/*"]
```

URL with Cache Busting {#url-with-cache-busting}

```ts
// Force reload of cached resources after extension update
function getVersionedURL(path: string): string {
  const version = chrome.runtime.getManifest().version;
  return `${chrome.runtime.getURL(path)}?v=${version}`;
}
```

---

Pattern 5: Secure Resource Access {#pattern-5-secure-resource-access}

Restrict which origins can access your resources to prevent fingerprinting and data exfiltration:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["widget.html", "widget.js", "widget.css"],
      "matches": ["https://*.myapp.com/*"]
    },
    {
      "resources": ["shared-config.json"],
      "extension_ids": ["abcdefghijklmnopqrstuvwxyz"]
    },
    {
      "resources": ["content-injected.css"],
      "matches": ["<all_urls>"],
      "use_dynamic_url": true
    }
  ]
}
```

Dynamic URLs (Chrome 110+) {#dynamic-urls-chrome-110}

Dynamic URLs change on every browser session, preventing fingerprinting:

```ts
// With use_dynamic_url: true, chrome.runtime.getURL() returns
// a session-specific URL that changes on restart.
// This prevents websites from using the predictable
// chrome-extension://<id>/path pattern to detect your extension.

const dynamicUrl = chrome.runtime.getURL("content-injected.css");
// Returns something like: chrome-extension://abc.../content-injected.css?dynamic=xyz
```

---

Pattern 6: Injecting Scripts into the Page World {#pattern-6-injecting-scripts-into-the-page-world}

Sometimes you need to run code in the page's JavaScript context (not the isolated content script world). Web accessible resources enable this:

```ts
// content.ts. Inject a script that runs in the page's world
function injectPageScript(scriptPath: string) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(scriptPath);
  script.type = "module";
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove(); // clean up the script tag
}

injectPageScript("page-script.js");
```

```ts
// page-script.js. Runs in the page's world, can access page variables
// This file MUST be declared in web_accessible_resources

// Intercept fetch calls (page world only)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  // Notify the content script about the request
  window.postMessage({
    type: "ext-fetch-intercepted",
    url: args[0]?.toString(),
    status: response.status,
  }, "*");
  return response;
};
```

```ts
// content.ts. Receive messages from page script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "ext-fetch-intercepted") {
    // Forward to background
    chrome.runtime.sendMessage({
      type: "fetch-logged",
      url: event.data.url,
      status: event.data.status,
    });
  }
});
```

MV3 Alternative: chrome.scripting.executeScript with MAIN world {#mv3-alternative-chromescriptingexecutescript-with-main-world}

```ts
// background.ts. Preferred MV3 approach (no web_accessible_resources needed)
chrome.scripting.executeScript({
  target: { tabId },
  world: "MAIN",
  func: () => {
    // This runs in the page's JavaScript context
    console.log("Running in page world");
  },
});
```

---

Pattern 7: Font Loading {#pattern-7-font-loading}

Load custom fonts from your extension:

```css
/* injected-styles.css. declared as web accessible */
@font-face {
  font-family: "ExtensionFont";
  src: url("chrome-extension://__MSG_@@extension_id__/fonts/custom.woff2") format("woff2");
  /* Note: __MSG_@@extension_id__ only works in CSS files, not in JS */
}

.ext-widget {
  font-family: "ExtensionFont", system-ui, sans-serif;
}
```

Better approach using JavaScript:

```ts
// content.ts
function loadExtensionFont() {
  const fontUrl = chrome.runtime.getURL("fonts/custom.woff2");
  const font = new FontFace("ExtensionFont", `url(${fontUrl})`);

  font.load().then((loaded) => {
    document.fonts.add(loaded);
  });
}
```

---

Pattern 8: Resource Preloading {#pattern-8-resource-preloading}

Preload web accessible resources for faster injection:

```ts
// content.ts. Preload resources that will be needed
function preloadExtensionResources() {
  const resources = [
    "widget.html",
    "widget.css",
    "widget.js",
    "images/logo.png",
  ];

  for (const resource of resources) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = chrome.runtime.getURL(resource);
    link.as = resource.endsWith(".css") ? "style"
      : resource.endsWith(".js") ? "script"
      : resource.endsWith(".html") ? "document"
      : "image";
    document.head.appendChild(link);
  }
}

// Call early, before the resources are actually needed
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", preloadExtensionResources);
} else {
  preloadExtensionResources();
}
```

---

Security Considerations {#security-considerations}

Extension Fingerprinting {#extension-fingerprinting}

Any web page in your `matches` list can probe for your extension by trying to load its resources:

```js
// A malicious page could do this:
const img = new Image();
img.src = "chrome-extension://known-extension-id/images/logo.png";
img.onload = () => console.log("Extension is installed!");
img.onerror = () => console.log("Extension not found");
```

Mitigations:
1. Use `use_dynamic_url: true` (Chrome 110+)
2. Restrict `matches` to only the origins that need access
3. Minimize the number of web accessible resources
4. Never make sensitive configuration files web accessible

Content Security Policy {#content-security-policy}

Web accessible resources loaded in iframes respect the extension's CSP, not the page's. This provides isolation but means your widget code runs under extension CSP rules.

---

Summary {#summary}

| Pattern | Use Case |
|---------|----------|
| iframe widget | Rich UI overlays on web pages |
| CSS injection | Styled content modifications |
| Extension images | Badges, icons, logos in page content |
| Dynamic URLs | Prevent extension fingerprinting |
| Page world scripts | Intercept page APIs, access page variables |
| Font loading | Custom typography in injected UI |
| Resource preloading | Faster widget initialization |
| Secure access | Restrict to specific origins only |

Web accessible resources are the bridge between your extension and the web page. Use them deliberately. expose only what's needed, restrict access to specific origins, and prefer `use_dynamic_url` to prevent fingerprinting.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
