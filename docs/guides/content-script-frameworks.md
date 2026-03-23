---
layout: default
title: "Chrome Extension Content Script Frameworks. Developer Guide"
description: "Learn Chrome extension content script frameworks with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/content-script-frameworks/"
---
# Using Frameworks in Content Scripts

Overview {#overview}

Content scripts can inject full UI frameworks like React, Vue, Svelte, or Preact into web pages. This enables building complex floating panels, overlays, toolbars, and interactive widgets.

Why Use a Framework {#why-use-a-framework}

- Complex injected UIs: Floating panels, sidebars, and modals benefit from component architecture
- Component reuse: Share UI between popup, options page, and content script
- State management: Frameworks handle predictable state for interactive widgets
- Developer experience: Hot reloading, TypeScript, and familiar tooling

Shadow DOM Foundation {#shadow-dom-foundation}

Shadow DOM provides essential isolation for injected UI:

```js
const host = document.createElement('div');
host.id = 'my-extension-root';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });
// Framework mounts inside shadow root
```

Key benefits: CSS isolation, correct event bubbling, and no style leakage.

React in Content Scripts {#react-in-content-scripts}

```jsx
import { createRoot } from 'react-dom/client';
import { App } from './App';

const host = document.createElement('div');
host.id = 'react-extension-root';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });

const style = document.createElement('style');
style.textContent = '.button { background: #2563eb; color: white; padding: 8px 16px; }';
shadow.appendChild(style);

const root = createRoot(shadow);
root.render(<App />);
```

Preact alternative: Use Preact for smaller bundle (~3KB vs ~40KB):

```jsx
import { h, render } from 'preact';
import { useState } from 'preact/hooks';

render(<App />, shadow);
```

Vue in Content Scripts {#vue-in-content-scripts}

```js
import { createApp } from 'vue';
import App from './App.vue';

const host = document.createElement('div');
host.id = 'vue-extension-root';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });

const mountPoint = document.createElement('div');
mountPoint.id = 'app';
shadow.appendChild(mountPoint);

createApp(App).mount(mountPoint);
```

Vue's scoped styles work well with shadow DOM.

Svelte in Content Scripts {#svelte-in-content-scripts}

Svelte offers the smallest bundle size:

```js
import Component from './Widget.svelte';

const host = document.createElement('div');
host.id = 'svelte-extension-root';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });

new Component({ target: shadow, props: { message: 'Hello!' } });
```

Svelte's compiled styles are scoped by default, ideal for isolation.

Build Configuration {#build-configuration}

```js
// esbuild.config.js
esbuild.build({
  entryPoints: ['src/content-ui/index.tsx'],
  bundle: true,
  outfile: 'dist/content-ui.js',
  external: [],  // Bundle all dependencies
  minify: true,
  treeShaking: true,
  target: ['chrome100'],
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
});
```

manifest.json:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-ui.js"],
    "run_at": "document_idle"
  }]
}
```

CSS Strategies {#css-strategies}

CSS-in-JS for Dynamic Injection {#css-in-js-for-dynamic-injection}

```js
const styles = `.panel { position: fixed; top: 20px; right: 20px; background: white; }`;
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);
shadow.adoptedStyleSheets = [styleSheet];
```

Inline Styles {#inline-styles}

```js
const style = document.createElement('style');
style.textContent = `...css content...`;
shadow.appendChild(style);
```

Communication with Service Worker {#communication-with-service-worker}

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getPageData: { request: void; response: { title: string; url: string } };
};

const msg = createMessenger<Messages>();
const data = await msg.send("getPageData");
```

Cross-references {#cross-references}

- [Content Script Patterns](/docs/guides/content-script-patterns.md)
- [Content Script Isolation](/docs/guides/content-script-isolation.md)
- [Building with React](/docs/guides/building-with-react.md)
- [Building with Svelte](/docs/guides/building-with-svelte.md)

Related Articles {#related-articles}

Related Articles

- [Content Script Patterns](../guides/content-script-patterns.md)
- [Content Script Lifecycle](../patterns/content-script-lifecycle.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
