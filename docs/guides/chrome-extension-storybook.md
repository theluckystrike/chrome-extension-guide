---
layout: default
title: "Chrome Extension Storybook Integration — Developer Guide"
description: "Learn Chrome extension storybook integration with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-storybook/"
---
# Setting Up Storybook for Chrome Extension Development

Storybook builds UI components in isolation—ideal for Chrome extensions where you can develop and test without loading the full extension.

## Why Storybook? {#why-storybook}

- **Isolated Development**: Build without extension reloads
- **Visual Testing**: Catch UI regressions early
- **Documentation**: Auto-generate component docs

## Installation {#installation}

```bash
npx storybook@latest init
```

Select your framework (React, Vue, Svelte).

## Configuration {#configuration}

Create `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  framework: { name: '@storybook/react-vite', options: {} },
};

export default config;
```

## Mocking Chrome APIs {#mocking-chrome-apis}

Chrome APIs aren't available in Storybook. Create a decorator in `.storybook/preview.ts`:

```typescript
import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [
    (Story) => {
      chrome.storage = { local: { get: async () => ({}), set: async () => {} } } as any;
      chrome.runtime = { id: 'mock-id', getURL: (path: string) => `mock/${path}` } as any;
      return <Story />;
    },
  ],
};

export default preview;
```

## Extension Viewport Decorator {#extension-viewport-decorator}

Simulate popup dimensions (400x600):

```typescript
{% raw %}
export const popupViewport: Decorator = (Story, context) => {
  if (context.parameters.viewport === 'popup') {
    return <div style={{ width: '400px', height: '600px', border: '1px solid #ccc' }}><Story /></div>;
  }
  return <Story />;
};
{% endraw %}
```

## Popup Component Story {#popup-component-story}

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { PopupHeader } from './PopupHeader';

const meta: Meta<typeof PopupHeader> = { title: 'Popup/PopupHeader', component: PopupHeader };
export default meta;

export const Default: StoryObj<typeof PopupHeader> = {
  args: { title: 'My Extension', onSettingsClick: () => {} },
};

export const DarkMode: StoryObj<typeof PopupHeader> = {
  parameters: { backgrounds: { default: 'dark' } },
  args: { title: 'My Extension', theme: 'dark' },
};
```

## Recommended Addons {#recommended-addons}

- **@storybook/addon-a11y** - Accessibility testing
- **@storybook/addon-viewport** - Device simulation
- **@storybook/addon-themes** - Theme switching

## Visual Regression Testing {#visual-regression-testing}

Integrate Chromatic: `npm install -D chromatic && npx chromatic --project-token=YOUR_TOKEN`

## Related Guides {#related-guides}

- [React Setup](./chrome-extension-react-setup.md)
- [Design System](./chrome-extension-design-system.md)
- [Testing Strategies](./chrome-extension-testing-strategies.md)

## Related Articles {#related-articles}

## Related Articles

- [Design System](../guides/chrome-extension-design-system.md)
- [React Setup](../guides/chrome-extension-react-setup.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
