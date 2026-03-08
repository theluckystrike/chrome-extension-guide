---
layout: default
title: "Chrome Extension Shadow Dom Content Script Ui — Best Practices"
description: "Create isolated UI components in shadow DOM from content scripts."
---

Shadow DOM UI Patterns for Content Scripts

When building Chrome extensions, injecting UI into existing web pages presents a fundamental challenge: page styles will inevitably leak into your extension UI, and your styles will leak out. Shadow DOM provides the cleanest solution by creating a DOM boundary that encapsulates styles completely.

Why Shadow DOM Matters

Content scripts run in the context of the host page, meaning they share the DOM and inherit global styles. A simple button you add to a page might inherit font-family from the page's body rule, pick up unexpected colors from page CSS, or break when the page redesigns. Shadow DOM creates a shadow root that acts as a style firewall. Nothing from the page penetrates your shadow DOM, and nothing you define escapes to affect the page. This isolation is not optional for professional extension UI. It is the foundation.

Basic Injection Pattern

The simplest approach creates a host element and attaches a shadow root.

```javascript
function createUI() {
  const host = document.createElement('div');
  host.id = 'my-extension-root';
  document.body.appendChild(host);
  
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<button>Click me</button>';
  
  return shadow;
}
```

The open mode allows debugging through chrome devtools. The host element lives in the page DOM but acts as a boundary. All child elements exist inside the shadow root.

Loading CSS with Constructable Stylesheets

Injecting CSS via style tags works, but constructable stylesheets offer better performance and caching.

```javascript
async function loadStyles() {
  const css = await fetch(chrome.runtime.getURL('styles.css')).then(r => r.text());
  const sheet = new CSSStyleSheet();
  sheet.replace(css);
  return sheet;
}

async function createUI() {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  
  const sheet = await loadStyles();
  shadow.adoptedStyleSheets = [sheet];
  
  shadow.innerHTML = '<button class="primary">Action</button>';
}
```

This pattern loads CSS once and reuses it across multiple shadow roots. Chrome caches the sheet automatically.

Tailwind Inside Shadow DOM

Tailwind works inside shadow DOM, but the setup differs from standard web development. The simplest path uses inline styles or generates atomic classes at runtime. A more robust approach injects the Tailwind output as a constructable stylesheet.

```javascript
async function loadTailwind() {
  const response = await fetch(chrome.runtime.getURL('tailwind.css'));
  const text = await response.text();
  const sheet = new CSSStyleSheet();
  sheet.replace(text);
  return sheet;
}
```

Tailwind's reset styles may conflict with host page styles inside shadow DOM. Consider adding a minimal reset that targets only your extension elements.

React Components in Shadow DOM

React's createRoot works with any DOM node, including shadow roots.

```javascript
import { createRoot } from 'react-dom/client';

function mountReactComponent() {
  const host = document.createElement('div');
  host.id = 'react-extension-root';
  document.body.appendChild(host);
  
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  
  const root = createRoot(container);
  root.render(<App />);
  
  return shadow;
}
```

Events bubble normally through the shadow boundary. You do not need special handlers for clicks or form submissions inside the shadow DOM. React's synthetic event system handles everything correctly.

Vue and Svelte Mounting

Vue's mount method accepts any valid CSS selector or DOM element. Pass the shadow root directly.

```javascript
import { createApp } from 'vue';
import App from './App.vue';

function mountVue() {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  
  shadow.innerHTML = '<div id="app"></div>';
  createApp(App).mount(shadow.getElementById('app'));
}
```

Svelte mounts similarly, using the shadow root as the mount target.

Font and Global Asset Handling

Fonts loaded via @font-face inside a constructable stylesheet work normally. For web fonts like Google Fonts, import the stylesheet in your extension's manifest or load it explicitly.

```javascript
const fontSheet = new CSSStyleSheet();
fontSheet.replace(`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');`);
shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, fontSheet];
```

Images and other assets should be loaded through chrome.runtime.getURL to get the correct extension-origin path.

Z-Index and Stacking Context

Shadow DOM does not create a new stacking context by itself. Your overlay may still appear behind page elements with higher z-index. Set an appropriately high z-index on the host element, and consider using chrome.topmostWindow if your extension spans multiple frames.

```javascript
host.style.position = 'fixed';
host.style.zIndex = '2147483647';
host.style.top = '0';
host.style.right = '0';
```

Most extensions use z-index values near the maximum safe integer to stay above page content.

Event Handling Across the Boundary

Events from inside shadow DOM bubble to the document normally. The event target remains the element inside shadow DOM, but listeners on the host element or document will still receive the event. To communicate between the shadow DOM and the page, standard event delegation works seamlessly.

If you need to forward events from the page into your shadow DOM, add listeners on the host element and manually dispatch events inside.

Theming and Dark Mode

Detect the page theme by checking computed styles on the document body or using a media query.

```javascript
function getPageTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bgColor = getComputedStyle(document.body).backgroundColor;
  return parseInt(bgColor.replace(/[^0-9]/g, ''), 10) < 128000 ? 'dark' : 'light';
}
```

Pass the detected theme to your component via context or props, then apply appropriate CSS variables. Your constructable stylesheet can define both themes and switch via CSS custom properties.

This pattern scales from simple floating buttons to complex single-page interfaces. When you need to ship UI that survives page redesigns and never bleeds styles, shadow DOM is the answer. The zovo.one team uses this approach across their extension projects for reliable, maintainable content script interfaces.
