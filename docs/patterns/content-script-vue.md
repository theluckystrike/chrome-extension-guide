---
layout: default
title: "Chrome Extension Content Script Vue. Best Practices"
description: "Integrate Vue.js with content scripts."
canonical_url: "https://bestchromeextensions.com/patterns/content-script-vue/"
---

Content Script Vue Pattern

Guide for integrating Vue.js into Chrome extension content scripts with proper isolation.

Shadow DOM Mounting {#shadow-dom-mounting}

Content scripts run in the context of the host page, so style isolation is critical. Vue apps must mount inside a shadow DOM to prevent styles from bleeding into or out of your extension UI.

```typescript
import { createApp, defineComponent } from 'vue';

function createShadowHost(): HTMLElement {
  const host = document.createElement('div');
  host.id = 'my-extension-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  return shadow as unknown as HTMLElement;
}

const App = defineComponent({
  template: `<div class="widget">Hello Vue!</div>`,
  styles: [`.widget { background: white; padding: 16px; }`]
});

const shadowHost = createShadowHost();
const app = createApp(App);
app.mount(shadowHost);
```

Vue 3 createApp in Content Scripts {#vue-3-createapp-in-content-scripts}

Use `defineComponent` for type-safe components. Mount directly to the shadow root element, not the host. The runtime-only build is required since there's no compile step in content scripts.

Scoped Styles {#scoped-styles}

Shadow DOM provides automatic style isolation, extension styles won't affect the page, and page styles won't affect your app. Combine with CSS modules for component-level scoping:

```typescript
import styles from './Widget.module.css';

const Widget = defineComponent({
  module: { styles },
  template: `<div :class="$style.widget">Content</div>`
});
```

Reactivity in Content Scripts {#reactivity-in-content-scripts}

Vue's reactivity system works normally inside shadow DOM. All features, composables, reactivity refs, computed properties, function as expected.

Communication with Background {#communication-with-background}

Create a composable for messaging:

```typescript
import { ref } from 'vue';

export function useExtensionMessaging() {
  const response = ref(null);
  
  function sendMessage(message: object) {
    chrome.runtime.sendMessage(message, (res) => {
      response.value = res;
    });
  }
  
  return { sendMessage, response };
}
```

Pinia Store in Content Scripts {#pinia-store-in-content-scripts}

Pinia works in content scripts for shared state management. Keep stores lightweight since they're loaded per page:

```typescript
import { defineStore } from 'pinia';

export const useWidgetStore = defineStore('widget', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++; }
  }
});
```

Bundle Considerations {#bundle-considerations}

Vue 3 runtime is ~30KB gzipped. Use runtime-only builds, no template compiler in content scripts. Configure Vite to exclude the compiler:

```javascript
export default {
  build: {
    rollupOptions: {
      external: ['vue']
    }
  }
}
```

Teleport Limitations {#teleport-limitations}

Vue teleport targets can't escape shadow DOM boundaries. Keep all teleported content within the shadow root, or use fixed-position portals inside the shadow tree.

Building with Vite {#building-with-vite}

Use `vite-plugin-web-extension` for building Vue content scripts. Configure it to output ESM and handle the Vue runtime:

```javascript
import webExtension from 'vite-plugin-web-extension';
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [webExtension(), vue()]
}
```

Hot Reload Limitations {#hot-reload-limitations}

Content script hot reload is limited, changes may require page refresh. Use `chrome.runtime.reload()` carefully during development.

Alternative: Petite Vue {#alternative-petite-vue}

For simpler injections, consider [Petite Vue](https://github.com/vuejs/petite-vue) (~6KB). It lacks full Vue features but works well for lightweight widgets.

Related Patterns {#related-patterns}

- [Building with Svelte](./building-with-svelte.md)
- [Content Script React](./content-script-react.md)
- [Shadow DOM Advanced](./shadow-dom-advanced.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
