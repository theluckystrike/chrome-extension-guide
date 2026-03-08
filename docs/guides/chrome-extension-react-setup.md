---
layout: default
title: "Chrome Extension React Setup — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Setting Up React for Chrome Extension Development

This guide covers building Chrome extensions with React, covering project initialization, architecture patterns, and best practices for modern extension development.

## Recommended Stack

- **React 18** - Latest features including concurrent rendering
- **TypeScript** - Type safety across your extension
- **Vite** - Fast dev server and optimized builds
- **CRXJS** - Vite plugin for Chrome extension hot reload

## Project Initialization

Create a new Vite project and add the CRXJS plugin:

```bash
npm create vite@latest my-extension -- --template react-ts
cd my-extension
npm install vite-plugin-chrome-extension
```

Configure `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crx from 'vite-plugin-chrome-extension';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifestJson })
  ]
});
```

## Multiple React Roots

Chrome extensions have multiple entry points (popup, options page, side panel). Each should be a separate React app:

```
src/
├── popup/       # Browser action popup
├── options/     # Extension options page
├── sidepanel/   # Side panel page
└── content/     # Content scripts
```

Configure multiple HTML entry points in Vite and register them in `manifest.json`.

## Shared Components

Create a common UI library used across all extension contexts:

```
packages/ui/
├── Button.tsx
├── Input.tsx
└── Modal.tsx
```

Publish as internal package or use workspace monorepo structure.

## State Management

### Zustand (Recommended)

Lightweight, no provider wrapper needed, works across extension contexts:

```typescript
import { create } from 'zustand';

interface ExtensionStore {
  settings: Settings;
  updateSettings: (settings: Settings) => void;
}

export const useStore = create<ExtensionStore>((set) => ({
  settings: defaultSettings,
  updateSettings: (settings) => set({ settings }),
}));
```

### Redux Toolkit

For complex state needs, Redux Toolkit provides standardized patterns.

## Content Scripts with React

Content scripts run in page context. Use shadow DOM for style isolation:

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.createElement('div');
container.id = 'my-extension-root';
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: 'open' });
const reactRoot = document.createElement('div');
shadow.appendChild(reactRoot);

createRoot(reactRoot).render(<App />);
```

## React DevTools

React DevTools works in extension pages. Enable in `manifest.json`:

```json
{
  "permissions": ["activeTab"]
}
```

Open DevTools on popup, options, or side panel pages to inspect React component trees.

## Routing

Use hash routing for extension pages since they run from `chrome-extension://`:

```typescript
import { HashRouter, Routes, Route } from 'react-router-dom';

<HashRouter>
  <Routes>
    <Route path="/popup" element={<Popup />} />
    <Route path="/options" element={<Options />} />
  </Routes>
</HashRouter>
```

## Styling Options

- **Tailwind CSS** - Utility-first, configure with content paths for extension
- **CSS Modules** - Scoped styles without runtime overhead
- **styled-components** - Component-level styling with theming

## Testing

- **Vitest** - Fast unit testing with Vite
- **React Testing Library** - Component testing
- **jest-chrome** - Mock Chrome extension APIs for tests

## Custom Hooks for Extension APIs

Create reusable hooks for common extension functionality:

```typescript
// useStorage.ts
import { useState, useEffect } from 'react';
import { Storage } from 'webextension-polyfill';

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    Storage.local.get(key).then((result) => {
      setValue(result[key] ?? defaultValue);
    });
  }, [key]);

  const update = (newValue: T) => {
    Storage.local.set({ [key]: newValue });
    setValue(newValue);
  };

  return [value, update];
}

// useMessage.ts
import { useEffect } from 'react';
import { Runtime } from 'webextension-polyfill';

export function useMessage(callback: (message: any) => void) {
  useEffect(() => {
    const listener = (message: any) => callback(message);
    Runtime.onMessage.addListener(listener);
    return () => Runtime.onMessage.removeListener(listener);
  }, [callback]);
}
```

## Performance Optimization

- **Code Splitting** - Lazy load extension pages
- **Dynamic Imports** - Load features on demand
- **Memoization** - Use React.memo and useMemo for expensive operations
- **Background Scripts** - Offload heavy processing from UI

## Related Guides

- [Building with React](./patterns/building-with-react.md)
- [Content Script React](./patterns/content-script-react.md)
- [Vite Extension Setup](./guides/vite-extension-setup.md)

## Related Articles

- [Building with React](../patterns/building-with-react.md)
- [Svelte Setup](../guides/chrome-extension-svelte-setup.md)
