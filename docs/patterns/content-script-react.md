---
layout: default
title: "Chrome Extension Content Script React. Best Practices"
description: "Integrate React with content scripts for dynamic DOM manipulation in web pages."
canonical_url: "https://bestchromeextensions.com/patterns/content-script-react/"
---

# Integrating React into Chrome Extension Content Scripts

The Challenge {#the-challenge}

Content scripts run in the context of the web page, not the extension. The page already has its own DOM, and injecting React directly into the page DOM creates two problems: style leakage (your CSS affects the page, page CSS affects your UI) and potential conflicts if the page already uses React.

---

Shadow DOM Mounting {#shadow-dom-mounting}

React needs a DOM root to render into. For content scripts, create a Shadow DOM host element:

```typescript
// content/scripts/react-mount.tsx
import { createRoot } from 'react-dom/client';

function createShadowHost() {
  const host = document.createElement('div');
  host.id = 'my-extension-root';
  host.style.cssText = 'position: fixed; z-index: 999999;';
  document.body.appendChild(host);
  
  const shadow = host.attachShadow({ mode: 'open' });
  return shadow;
}

const shadowRoot = createShadowHost();
const container = document.createElement('div');
shadowRoot.appendChild(container);

const root = createRoot(container);
root.render(<App />);
```

The Shadow DOM provides style isolation. global page CSS won't affect your React components.

---

CSS-in-JS with Shadow DOM {#css-in-js-with-shadow-dom}

Use Emotion or styled-components with the `container` option to inject styles into Shadow DOM:

```typescript
/ @jsxImportSource @emotion/react */
import { css } from '@emotion/react';

const widgetStyle = css`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 16px;
  font-family: system-ui, sans-serif;
`;

// Configure Emotion to inject into shadowRoot
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const cache = createCache({ container: shadowRoot });
```

---

Bundling Configuration {#bundling-configuration}

Content scripts must be bundled as standalone IIFE (Immediately Invoked Function Expression). they can't use ES modules. Configure your bundler:

```javascript
// vite.config.js content script entry
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: 'src/content/index.tsx',
      },
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
      },
    },
  },
});
```

In `manifest.json`, reference the bundled file:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_end"
  }]
}
```

---

State Management {#state-management}

For content scripts, avoid Redux/Context. they add overhead. Use lightweight alternatives:

```typescript
// Using zustand (no provider needed)
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// Usage in component. no Provider wrapper required
function Counter() {
  const { count, increment } = useStore();
  return <button onClick={increment}>{count}</button>;
}
```

Jotai is another excellent choice for atomic state management.

---

Communicating with Background {#communicating-with-background}

```typescript
// content/hooks/useBackgroundMessage.ts
import { useEffect, useState } from 'react';

export function useBackgroundMessage(channel: string) {
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.channel === channel) setMessage(msg.data);
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [channel]);

  const send = (data: any) => 
    chrome.runtime.sendMessage({ channel, data });

  return { message, send };
}
```

---

Hot Module Replacement {#hot-module-replacement}

HMR doesn't work reliably in content scripts. the script executes in the page context, not the extension. Each reload requires re-injecting into the page. Use standard development patterns: build → reload extension → refresh page.

---

Avoiding React Conflicts {#avoiding-react-conflicts}

If the page uses React, your content script's React instance could conflict. Shadow DOM isolation prevents this. each React instance is entirely separate. The page's React won't mount into your Shadow DOM, and your React won't be affected by the page's React.

---

Bundle Size {#bundle-size}

React adds ~40KB (minified) to your content script. Consider alternatives:

- Preact: ~3KB drop-in replacement, works with same patterns
- htm: No build step, uses template literals

```javascript
// Using Preact with Vite
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  resolve: { alias: { react: 'preact/compat' } },
});
```

---

Cross-References {#cross-references}

- [Building Chrome Extensions with React](/docs/patterns/building-with-react.md). Full React extension architecture
- [Shadow DOM Advanced](/docs/patterns/shadow-dom-advanced.md). Detailed look on Shadow DOM patterns
- [Content Script Isolation](/docs/patterns/content-script-isolation.md). Complete isolation strategies
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
