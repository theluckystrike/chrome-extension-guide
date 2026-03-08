# Building a Dark Mode Toggler Chrome Extension

Dark mode has become an essential feature for modern web applications and browser extensions. Users increasingly prefer reduced eye strain and better battery life on OLED displays. Building a dark mode toggler extension requires understanding CSS manipulation, content script injection, and state management across browser contexts. This guide covers building a robust dark mode toggler from scratch.

## Understanding Dark Mode Implementation Approaches

There are three primary approaches to implementing dark mode in web pages:

1. **CSS Variables/Custom Properties** - Modern websites use CSS custom properties (`:root { --bg-color: #ffffff; }`) that can be swapped
2. **CSS Class Toggle** - Adding/removing a `.dark` class on the `<html>` or `<body>` element
3. **Color Scheme Override** - Using `color-scheme: dark` CSS property

A well-designed dark mode toggler should support all three approaches to maximize compatibility across websites.

## Project Structure

```
dark-mode-toggler/
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   └── dark-mode-injector.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── styles.css
│   ├── options/
│   │   ├── options.html
│   │   └── options.ts
│   └── shared/
│       └── types.ts
├── manifest.json
└── tsconfig.json
```

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Dark Mode Toggler",
  "version": "1.0.0",
  "description": "Toggle dark mode on any website",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

## Content Script: Dark Mode Injector

The core logic lives in the content script that injects dark mode styles. Here's a TypeScript implementation:

```typescript
// src/content/dark-mode-injector.ts

interface DarkModeConfig {
  darkTheme: Record<string, string>;
  toggleClass: string;
  useColorScheme: boolean;
}

const DEFAULT_DARK_THEME: Record<string, string> = {
  '--background': '#1a1a1a',
  '--foreground': '#e5e5e5',
  '--primary': '#3b82f6',
  '--secondary': '#374151',
  '--accent': '#8b5cf6',
  '--text-primary': '#f3f4f6',
  '--text-secondary': '#9ca3af',
  '--border': '#374151',
};

class DarkModeInjector {
  private styleElement: HTMLStyleElement | null = null;
  private config: DarkModeConfig = {
    darkTheme: DEFAULT_DARK_THEME,
    toggleClass: 'dark-mode-toggler-active',
    useColorScheme: false,
  };

  constructor(config?: Partial<DarkModeConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Inject dark mode styles into the page
   */
  inject(): void {
    if (this.styleElement) {
      return; // Already injected
    }

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'dark-mode-toggler-styles';
    this.styleElement.textContent = this.generateCSS();
    
    // Inject at the end of head for highest specificity
    document.head.appendChild(this.styleElement);
    
    // Add toggle class to document
    document.documentElement.classList.add(this.config.toggleClass);
    
    if (this.config.useColorScheme) {
      document.documentElement.style.colorScheme = 'dark';
    }
  }

  /**
   * Remove dark mode styles from the page
   */
  eject(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    
    document.documentElement.classList.remove(this.config.toggleClass);
    document.documentElement.style.colorScheme = 'light';
  }

  /**
   * Toggle dark mode on/off
   */
  toggle(): boolean {
    if (this.styleElement) {
      this.eject();
      return false;
    } else {
      this.inject();
      return true;
    }
  }

  /**
   * Check if dark mode is currently active
   */
  isActive(): boolean {
    return this.styleElement !== null;
  }

  /**
   * Generate CSS custom properties based on config
   */
  private generateCSS(): string {
    const vars = Object.entries(this.config.darkTheme)
      .map(([key, value]) => `  --dmt-${key}: ${value};`)
      .join('\n');

    return `
      .${this.config.toggleClass} {
        ${vars}
        /* Fallback styles for common elements */
        background-color: var(--dmt---background, #1a1a1a) !important;
        color: var(--dmt---text-primary, #e5e5e5) !important;
      }

      .${this.config.toggleClass} a {
        color: var(--dmt---primary, #3b82f6) !important;
      }

      .${this.config.toggleClass} button,
      .${this.config.toggleClass} input,
      .${this.config.toggleClass} select,
      .${this.config.toggleClass} textarea {
        background-color: var(--dmt---secondary, #374151) !important;
        color: var(--dmt---text-primary, #e5e5e5) !important;
        border-color: var(--dmt---border, #4b5563) !important;
      }

      .${this.config.toggleClass} img {
        opacity: 0.85;
        filter: brightness(0.9) contrast(1.1);
      }

      .${this.config.toggleClass} iframe {
        filter: invert(1) hue-rotate(180deg);
      }
    `;
  }
}

// Export for use in content script
export { DarkModeInjector, DarkModeConfig };
```

## Background Service Worker: State Management

The background service worker coordinates state across tabs and persists user preferences:

```typescript
// src/background/service-worker.ts

interface ExtensionState {
  enabled: boolean;
  siteOverrides: Record<string, boolean>;
  globalEnabled: boolean;
}

const DEFAULT_STATE: ExtensionState = {
  enabled: false,
  siteOverrides: {},
  globalEnabled: true,
};

// Load state from storage
async function loadState(): Promise<ExtensionState> {
  const stored = await chrome.storage.local.get(['extensionState']);
  return stored.extensionState || DEFAULT_STATE;
}

// Save state to storage
async function saveState(state: ExtensionState): Promise<void> {
  await chrome.storage.local.set({ extensionState: state });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case 'GET_STATE':
      loadState().then(sendResponse);
      return true;

    case 'TOGGLE_DARK_MODE': {
      loadState().then(async (state) => {
        state.enabled = !state.enabled;
        await saveState(state);
        
        // Notify all tabs
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'DARK_MODE_CHANGED',
              payload: { enabled: state.enabled }
            });
          }
        }
        
        sendResponse(state);
      });
      return true;
    }

    case 'SET_SITE_OVERRIDE': {
      const { hostname, enabled } = payload;
      loadState().then(async (state) => {
        state.siteOverrides[hostname] = enabled;
        await saveState(state);
        
        // Notify specific tab
        if (sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'DARK_MODE_CHANGED',
            payload: { 
              enabled: enabled,
              isOverride: true 
            }
          });
        }
        
        sendResponse(state);
      });
      return true;
    }
  }
});

// Handle extension icon click (if no popup)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  const state = await loadState();
  const newState = !state.enabled;
  
  chrome.tabs.sendMessage(tab.id, {
    type: 'DARK_MODE_CHANGED',
    payload: { enabled: newState }
  });
});

export {};
```

## Popup: User Interface

```typescript
// src/popup/popup.ts

interface ExtensionState {
  enabled: boolean;
  globalEnabled: boolean;
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('dark-mode-toggle') as HTMLButtonElement;
  const status = document.getElementById('status-text') as HTMLSpanElement;
  const siteInfo = document.getElementById('site-info') as HTMLDivElement;

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = tab.url ? new URL(tab.url).hostname : 'Unknown';

  // Display current site
  siteInfo.textContent = `Current site: ${hostname}`;

  // Get current state
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  const state: ExtensionState = response;
  
  updateUI(state.enabled);

  // Handle toggle click
  toggle.addEventListener('click', async () => {
    const newState = await chrome.runtime.sendMessage({ 
      type: 'TOGGLE_DARK_MODE' 
    });
    updateUI(newState.enabled);
  });

  function updateUI(enabled: boolean) {
    toggle.textContent = enabled ? '🌙 Dark Mode ON' : '☀️ Enable Dark Mode';
    toggle.classList.toggle('active', enabled);
    status.textContent = enabled ? 'Active' : 'Inactive';
    status.className = enabled ? 'status active' : 'status';
  }
});
```

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="popup-container">
    <h2>Dark Mode Toggler</h2>
    <div id="site-info" class="site-info"></div>
    <button id="dark-mode-toggle" class="toggle-btn">
      Enable Dark Mode
    </button>
    <div class="status-container">
      Status: <span id="status-text">Inactive</span>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

## Advanced: Site-Specific Overrides

Different websites may require different dark mode approaches. Here's how to handle site-specific logic:

```typescript
// src/content/site-detector.ts

interface SiteConfig {
  selector?: string;
  invertImages?: boolean;
  customStyles?: string;
  prefersDarkMode?: boolean;
}

const SITE_CONFIGS: Record<string, SiteConfig> = {
  'twitter.com': {
    selector: '[data-theme="dark"]',
    invertImages: false,
  },
  'reddit.com': {
    selector: 'html[data-theme="dark"]',
    invertImages: true,
  },
  'youtube.com': {
    selector: 'ytd-app[dark]',
    invertImages: false,
    customStyles: `
      ytd-app[dark] {
        --yt-spec-base-background: #0f0f0f !important;
      }
    `,
  },
};

function getSiteConfig(hostname: string): SiteConfig | null {
  for (const [pattern, config] of Object.entries(SITE_CONFIGS)) {
    if (hostname.includes(pattern)) {
      return config;
    }
  }
  return null;
}

export { getSiteConfig, SiteConfig };
```

## Best Practices

1. **Respect User System Preferences**: Use `matchMedia('(prefers-color-scheme: dark)')` to respect OS-level dark mode settings
2. **Smooth Transitions**: Add CSS transitions for color changes to avoid jarring switches
3. **Persist State**: Store dark mode preference per-site in `chrome.storage.local`
4. **Performance**: Use `requestAnimationFrame` for style updates to prevent layout thrashing
5. **Accessibility**: Ensure sufficient contrast ratios in your dark theme colors

## Conclusion

Building a dark mode toggler requires careful handling of CSS injection, state management, and cross-context communication. The patterns shown here provide a solid foundation for creating a robust dark mode extension that works across various websites while respecting user preferences and performance considerations.
