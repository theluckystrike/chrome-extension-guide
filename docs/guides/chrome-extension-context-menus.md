---
layout: default
title: "Chrome Extension Context Menus: Dynamic Right-Click Menus Guide"
description: "Build powerful context menus for Chrome extensions. Learn dynamic menus, nested items, click handlers, content script integration, and stateful menu patterns with TypeScript."
permalink: /guides/chrome-extension-context-menus/
last_modified_at: 2026-01-15
---

Chrome Extension Context Menus: Dynamic Right-Click Menus Guide

Context menus represent one of the most powerful UX features available to Chrome extension developers. When implemented correctly, right-click menus integrate your extension directly into the user's natural workflow, appearing exactly where and when they need specific functionality. Unlike popup windows that require explicit user action to open, or keyboard shortcuts that users must remember, context menus use a universally understood interaction pattern, the right-click, that users employ dozens of times daily while browsing the web.

The `chrome.contextMenus` API enables you to add custom items to Chrome's context menu, appearing when users right-click on pages, links, images, text selections, or other elements. This guide covers everything from basic menu creation to advanced patterns like dynamic menus that adapt to application state, nested hierarchical structures, and smooth integration with content scripts for complex interactions.

Introduction: When Context Menus Are the Right Choice

Context menus excel in specific scenarios where they provide superior user experience compared to other extension interaction patterns. Understanding these use cases helps you make informed design decisions for your extension.

Context menus are ideal when: Users need to act on specific page elements (images, links, text selections) without first navigating to a separate UI. The action is contextual and depends on what the user is currently interacting with. You want to provide quick access to frequently used features without cluttering the extension popup. The action is intuitive enough that users would naturally look for it in a right-click menu.

Consider alternatives when: The action requires significant user input or configuration. You need to display complex, multi-step workflows. The action doesn't relate to the specific element being right-clicked. Users need to access the feature frequently regardless of context, in these cases, toolbar buttons or keyboard shortcuts (covered in our [Chrome Extension Keyboard Shortcuts](/guides/chrome-extension-keyboard-shortcuts/) guide) may be more appropriate.

Many successful extensions combine multiple interaction patterns. For instance, you might use context menus for quick actions on specific elements while providing a full-featured popup for comprehensive functionality. This hybrid approach, detailed in our [Extension Popup Design](/guides/extension-popup-design/) guide, often provides the best user experience.

Context Menu Basics: The chrome.contextMenus API

Before diving into advanced patterns, you need to understand the fundamental API surface. The `chrome.contextMenus` API provides everything needed to create, update, and manage context menu items.

Required Permission in manifest.json

First, add the `contextMenus` permission to your manifest file. This permission is required regardless of menu complexity:

```json
{
  "manifest_version": 3,
  "name": "My Context Menu Extension",
  "version": "1.0.0",
  "permissions": ["contextMenus"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

Note that context menus must be created in a background service worker. This is because menu click events need to be handled somewhere, and the service worker provides the persistent execution context required for this functionality.

Creating Basic Context Menus with TypeScript

The foundation of any context menu implementation is the `chrome.contextMenus.create()` method. Here's a TypeScript implementation with proper typing:

```typescript
// background/contextMenus.ts

interface MenuItemOptions {
  id: string;
  title: string;
  contexts: chrome.contextMenus.ContextType[];
  onclick?: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void;
}

function createBasicMenuItem(options: MenuItemOptions): void {
  chrome.contextMenus.create({
    id: options.id,
    title: options.title,
    contexts: options.contexts,
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to create menu item:', chrome.runtime.lastError.message);
    }
  });
}

// Create a menu item that appears on page and selection
createBasicMenuItem({
  id: 'my-extension-search',
  title: 'Search with My Extension',
  contexts: ['page', 'selection']
});
```

Understanding Context Types

The `contexts` array determines when your menu item appears. Chrome supports numerous context types:

| Context Type | Description |
|-------------|-------------|
| `page` | Appears when right-clicking anywhere on the page |
| `selection` | Appears when text is selected |
| `link` | Appears when right-clicking on a hyperlink |
| `image` | Appears when right-clicking on an image |
| `video` | Appears when right-clicking on a video element |
| `audio` | Appears when right-clicking on an audio element |
| `frame` | Appears when right-clicking on an iframe |
| `editable` | Appears in input fields and textareas |
| `launcher` | Appears in the Chrome app launcher (less common) |
| `browser_action` | Appears when right-clicking the extension icon |
| `page_action` | Appears when right-clicking the page action icon |

You can combine multiple contexts to create versatile menu items:

```typescript
const versatileMenuItem = {
  id: 'process-selected-content',
  title: 'Process with Extension',
  contexts: ['selection', 'link', 'image']
};
```

The OnClickData Interface

When a user clicks a context menu item, your handler receives an `OnClickData` object containing rich information about the click context:

```typescript
interface ContextMenuClickHandler {
  (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): void;
}

const handleMenuClick: ContextMenuClickHandler = (info, tab) => {
  // Unique identifier for the clicked menu item
  console.log('Menu item ID:', info.menuItemId);
  
  // The context type that triggered the menu
  console.log('Context type:', info.contexts);
  
  // For selection context - the selected text
  if (info.selectionText) {
    console.log('Selected text:', info.selectionText);
  }
  
  // For link context - the URL being linked
  if (info.linkUrl) {
    console.log('Link URL:', info.linkUrl);
  }
  
  // For image/video/audio - the media URL
  if (info.mediaType) {
    console.log('Media type:', info.mediaType);
    console.log('Media URL:', info.srcUrl);
  }
  
  // Page information
  console.log('Page URL:', info.pageUrl);
  console.log('Tab ID:', info.tabId);
  
  // For editable context - the element's ID
  if (info.editable) {
    console.log('Editable element ID:', info.targetElementId);
  }
};
```

This information enables you to build context-aware handlers that perform different actions based on what the user right-clicked.

Dynamic Context Menus: Menus That Adapt

Static menus work well for simple extensions, but real-world applications often need menus that adapt to changing conditions, user authentication state, page URL, or extension settings. The contextMenus API supports this through dynamic creation, updating, and removal of menu items.

Creating Menus Conditionally Based on Page URL

You can control menu visibility using the `documentUrlPatterns` property, which accepts URL patterns similar to content script matches:

```typescript
// Create different menus for different domains
function createDomainSpecificMenus(): void {
  // GitHub-specific menu
  chrome.contextMenus.create({
    id: 'github-create-issue',
    title: 'Create Issue',
    contexts: ['page'],
    documentUrlPatterns: ['*://github.com/*', '*://github.com/*/*']
  });
  
  // YouTube-specific menu  
  chrome.contextMenus.create({
    id: 'youtube-add-playlist',
    title: 'Add to Playlist',
    contexts: ['page'],
    documentUrlPatterns: ['*://youtube.com/watch*', '*://youtu.be/*']
  });
  
  // Global menu (no URL restriction)
  chrome.contextMenus.create({
    id: 'global-screenshot',
    title: 'Take Screenshot',
    contexts: ['page']
  });
}
```

The DynamicMenuManager Class

For complex applications with many menu items that change based on state, a manager class provides clean organization:

```typescript
// background/DynamicMenuManager.ts

type MenuState = 'logged-in' | 'logged-out' | 'premium' | 'free';

interface MenuConfig {
  id: string;
  title: string;
  contexts: chrome.contextMenus.ContextType[];
  requiresAuth?: boolean;
  requiresPremium?: boolean;
  action: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void;
}

class DynamicMenuManager {
  private menuConfigs: Map<string, MenuConfig> = new Map();
  private currentState: MenuState = 'logged-out';

  constructor() {
    this.initializeDefaultMenus();
  }

  private initializeDefaultMenus(): void {
    this.registerMenu({
      id: 'user-dashboard',
      title: 'Open Dashboard',
      contexts: ['page'],
      requiresAuth: true,
      action: () => this.openDashboard()
    });

    this.registerMenu({
      id: 'premium-feature',
      title: 'Enable Premium',
      contexts: ['page'],
      requiresAuth: true,
      requiresPremium: false,
      action: () => this.showPremiumUpgrade()
    });

    this.registerMenu({
      id: 'login',
      title: 'Sign In',
      contexts: ['page'],
      requiresAuth: false,
      action: () => this.openLoginPage()
    });
  }

  registerMenu(config: MenuConfig): void {
    this.menuConfigs.set(config.id, config);
  }

  async rebuildMenus(userState: {
    isLoggedIn: boolean;
    isPremium: boolean;
  }): Promise<void> {
    // Update state
    this.currentState = userState.isLoggedIn 
      ? (userState.isPremium ? 'premium' : 'free')
      : 'logged-out';

    // Clear existing menus
    await this.clearAllMenus();

    // Rebuild based on current state
    for (const [id, config] of this.menuConfigs) {
      if (this.shouldShowMenu(config)) {
        this.createMenuItem(config);
      }
    }
  }

  private shouldShowMenu(config: MenuConfig): boolean {
    if (config.requiresAuth && this.currentState === 'logged-out') {
      return false;
    }
    if (config.requiresPremium && this.currentState !== 'premium') {
      return false;
    }
    return true;
  }

  private createMenuItem(config: MenuConfig): void {
    chrome.contextMenus.create({
      id: config.id,
      title: config.title,
      contexts: config.contexts,
      onclick: config.action
    });
  }

  private clearAllMenus(): Promise<void> {
    return new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
          console.warn('Menu clear warning:', chrome.runtime.lastError.message);
        }
        resolve();
      });
    });
  }

  private openDashboard(): void {
    chrome.tabs.create({ url: 'https://example.com/dashboard' });
  }

  private showPremiumUpgrade(): void {
    chrome.tabs.create({ url: 'https://example.com/premium' });
  }

  private openLoginPage(): void {
    chrome.tabs.create({ url: 'https://example.com/login' });
  }
}

export const menuManager = new DynamicMenuManager();
```

This manager can be invoked when user state changes, such as after authentication:

```typescript
// Handle user state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_STATE_CHANGED') {
    menuManager.rebuildMenus({
      isLoggedIn: message.isLoggedIn,
      isPremium: message.isPremium
    });
  }
});
```

Updating and Removing Individual Menus

You can modify existing menus without rebuilding everything:

```typescript
// Update a menu item's title or visibility
chrome.contextMenus.update('existing-menu-id', {
  title: 'New Title',
  enabled: true  // Enable/disable the menu item
});

// Remove specific menu items
chrome.contextMenus.remove('menu-id-to-remove');

// Remove all menus matching a pattern (using internal IDs)
chrome.contextMenus.removeAll();
```

Nested Menu Items: Hierarchical Structure

Complex extensions often benefit from organizing menu items into nested hierarchies. This improves usability by grouping related actions and reducing visual clutter.

Parent-Child Relationships

Create nested menus by specifying a `parentId` when creating child items:

```typescript
function createNestedMenuStructure(): void {
  // Parent menu (appears in root context menu)
  chrome.contextMenus.create({
    id: 'my-extension-parent',
    title: 'My Extension',
    contexts: ['page', 'selection']
  });

  // Child: Save submenu
  chrome.contextMenus.create({
    id: 'save-as-pdf',
    parentId: 'my-extension-parent',
    title: 'Save as PDF',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'save-as-image',
    parentId: 'my-extension-parent',
    title: 'Save as Image',
    contexts: ['page', 'image']
  });

  chrome.contextMenus.create({
    id: 'save-as-text',
    parentId: 'my-extension-parent',
    title: 'Save as Text',
    contexts: ['selection', 'page']
  });

  // Separator (visual divider)
  chrome.contextMenus.create({
    id: 'separator-1',
    parentId: 'my-extension-parent',
    type: 'separator',
    contexts: ['page']
  });

  // Child: Share submenu
  chrome.contextMenus.create({
    id: 'share-twitter',
    parentId: 'my-extension-parent',
    title: 'Share on Twitter',
    contexts: ['page', 'selection']
  });

  chrome.contextMenus.create({
    id: 'share-email',
    parentId: 'my-extension-parent',
    title: 'Share via Email',
    contexts: ['page', 'selection']
  });
}
```

Building Complex Menus from Configuration

For maintainable code, define your menu structure in a configuration object and build programmatically:

```typescript
// background/MenuBuilder.ts

interface MenuNode {
  id: string;
  title: string;
  type?: 'normal' | 'checkbox' | 'radio' | 'separator';
  contexts?: chrome.contextMenus.ContextType[];
  children?: MenuNode[];
  enabled?: boolean;
}

const menuConfiguration: MenuNode = {
  id: 'root',
  title: 'Text Utilities',
  contexts: ['selection'],
  children: [
    {
      id: 'count',
      title: 'Count',
      children: [
        { id: 'count-words', title: 'Word Count', contexts: ['selection'] },
        { id: 'count-chars', title: 'Character Count', contexts: ['selection'] },
        { id: 'count-lines', title: 'Line Count', contexts: ['selection'] }
      ]
    },
    {
      id: 'transform',
      title: 'Transform',
      children: [
        { id: 'uppercase', title: 'UPPERCASE', contexts: ['selection'] },
        { id: 'lowercase', title: 'lowercase', contexts: ['selection'] },
        { id: 'titlecase', title: 'Title Case', contexts: ['selection'] },
        { id: 'camelcase', title: 'camelCase', contexts: ['selection'] }
      ]
    },
    { id: 'sep1', title: '', type: 'separator', contexts: ['selection'] },
    {
      id: 'encode',
      title: 'Encode/Decode',
      children: [
        { id: 'url-encode', title: 'URL Encode', contexts: ['selection'] },
        { id: 'url-decode', title: 'URL Decode', contexts: ['selection'] },
        { id: 'base64-encode', title: 'Base64 Encode', contexts: ['selection'] },
        { id: 'base64-decode', title: 'Base64 Decode', contexts: ['selection'] }
      ]
    },
    {
      id: 'hash',
      title: 'Hash',
      children: [
        { id: 'hash-md5', title: 'MD5', contexts: ['selection'] },
        { id: 'hash-sha1', title: 'SHA-1', contexts: ['selection'] },
        { id: 'hash-sha256', title: 'SHA-256', contexts: ['selection'] }
      ]
    }
  ]
};

class MenuBuilder {
  private actionHandlers: Map<string, (text: string) => string> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.actionHandlers.set('count-words', (text) => 
      `Words: ${text.trim().split(/\s+/).filter(Boolean).length}`
    );
    this.actionHandlers.set('count-chars', (text) => 
      `Characters: ${text.length}`
    );
    this.actionHandlers.set('count-lines', (text) => 
      `Lines: ${text.split('\n').length}`
    );
    this.actionHandlers.set('uppercase', (text) => text.toUpperCase());
    this.actionHandlers.set('lowercase', (text) => text.toLowerCase());
    this.actionHandlers.set('titlecase', (text) => 
      text.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      )
    );
  }

  buildFromConfig(config: MenuNode, parentId?: string): void {
    // Create current level menu items
    if (config.id !== 'root') {
      chrome.contextMenus.create({
        id: config.id,
        title: config.title,
        parentId: parentId,
        type: config.type || 'normal',
        contexts: config.contexts || ['page']
      });
    }

    // Recursively create children
    if (config.children) {
      const currentId = config.id === 'root' ? undefined : config.id;
      for (const child of config.children) {
        this.buildFromConfig(child, currentId);
      }
    }
  }

  handleMenuClick(info: chrome.contextMenus.OnClickData): string | null {
    if (!info.selectionText) return null;
    
    const handler = this.actionHandlers.get(info.menuItemId as string);
    if (handler) {
      return handler(info.selectionText);
    }
    return null;
  }
}

export const menuBuilder = new MenuBuilder();
```

Context-Specific Click Handlers

Different context types require different handling. A solid extension uses a router pattern to dispatch to the appropriate handler based on what was clicked.

The ContextMenuRouter Class

```typescript
// background/ContextMenuRouter.ts

interface ClickHandler {
  (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): Promise<void> | void;
}

class ContextMenuRouter {
  private handlers: Map<string, ClickHandler> = new Map();
  private contextFilters: Map<string, chrome.contextMenus.ContextType[]> = new Map();

  register(menuId: string, handler: ClickHandler, contexts: chrome.contextMenus.ContextType[]): void {
    this.handlers.set(menuId, handler);
    this.contextFilters.set(menuId, contexts);
  }

  async route(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): Promise<void> {
    const menuId = info.menuItemId as string;
    const handler = this.handlers.get(menuId);

    if (!handler) {
      console.warn(`No handler registered for menu: ${menuId}`);
      return;
    }

    try {
      await handler(info, tab);
    } catch (error) {
      console.error(`Error in menu handler ${menuId}:`, error);
      this.showError(`Action failed: ${(error as Error).message}`);
    }
  }

  private showError(message: string): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Extension Error',
      message: message
    });
  }
}

// Example: Register handlers for different contexts
const router = new ContextMenuRouter();

// Selection-based handlers
router.register('search-selection', async (info) => {
  if (info.selectionText) {
    const encoded = encodeURIComponent(info.selectionText);
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encoded}` });
  }
}, ['selection']);

router.register('translate-selection', async (info) => {
  if (info.selectionText) {
    const encoded = encodeURIComponent(info.selectionText);
    chrome.tabs.create({ url: `https://translate.google.com/?text=${encoded}` });
  }
}, ['selection']);

router.register('define-selection', async (info) => {
  if (info.selectionText) {
    const encoded = encodeURIComponent(info.selectionText.trim());
    chrome.tabs.create({ url: `https://www.dictionary.com/browse/${encoded}` });
  }
}, ['selection']);

// Image-specific handlers
router.register('reverse-image-search', async (info) => {
  if (info.srcUrl) {
    const encoded = encodeURIComponent(info.srcUrl);
    chrome.tabs.create({ url: `https://lens.google.com/uploadbyurl?url=${encoded}` });
  }
}, ['image']);

router.register('download-image', async (info, tab) => {
  if (info.srcUrl) {
    chrome.downloads.download({
      url: info.srcUrl,
      filename: `image-${Date.now()}.jpg`
    });
  }
}, ['image']);

// Link-specific handlers
router.register('bookmark-link', async (info) => {
  if (info.linkUrl) {
    chrome.bookmarks.create({
      title: info.selectionText || info.linkUrl,
      url: info.linkUrl
    });
  }
}, ['link']);

router.register('copy-link', async (info) => {
  if (info.linkUrl) {
    await navigator.clipboard.writeText(info.linkUrl);
  }
}, ['link']);

// Page handlers
router.register('full-page-screenshot', async (info, tab) => {
  if (tab.id) {
    // Use the tabs API to capture the page
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      captureBeyondViewport: true
    });
    chrome.downloads.download({
      url: dataUrl,
      filename: `screenshot-${Date.now()}.png`
    });
  }
}, ['page']);

export { router };
```

Integration with Content Scripts

Some menu actions require direct DOM access, for example, extracting specific element data or performing actions that only work within page context. This requires message passing between the background service worker and content scripts.

Message Passing Pattern

```typescript
// background/extractData.ts

// Register menu with content script integration
chrome.contextMenus.create({
  id: 'extract-element-data',
  title: 'Extract Element Data',
  contexts: ['page', 'selection']
});

// Handler that coordinates with content script
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab.id) return;

  if (info.menuItemId === 'extract-element-data') {
    // Send message to content script asking for data
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extract-data',
      context: info.contexts,
      selectionText: info.selectionText,
      linkUrl: info.linkUrl,
      srcUrl: info.srcUrl
    });

    if (response && response.data) {
      // Process the extracted data in background
      await processExtractedData(response.data, info);
    }
  }
});

async function processExtractedData(data: any, info: chrome.contextMenus.OnClickData): Promise<void> {
  // Process and store data
  await chrome.storage.local.set({
    lastExtracted: {
      data: data,
      timestamp: Date.now(),
      sourceUrl: info.pageUrl
    }
  });

  // Show notification with result summary
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Data Extracted',
    message: `Extracted ${data.itemCount} items from page`
  });
}
```

```typescript
// content-script/extractHandler.ts

interface ExtractionRequest {
  action: 'extract-data';
  context: string[];
  selectionText?: string;
  linkUrl?: string;
  srcUrl?: string;
}

interface ExtractionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (request: ExtractionRequest, sender, sendResponse: (response: ExtractionResponse) => void) => {
    if (request.action === 'extract-data') {
      try {
        const extractedData = performExtraction(request);
        sendResponse({ success: true, data: extractedData });
      } catch (error) {
        sendResponse({ 
          success: false, 
          error: (error as Error).message 
        });
      }
    }
    return true; // Keep message channel open for async response
  }
);

function performExtraction(request: ExtractionRequest): any {
  // Handle different extraction contexts
  if (request.context.includes('selection') && request.selectionText) {
    return extractFromSelection(request.selectionText);
  }
  
  if (request.context.includes('link') && request.linkUrl) {
    return extractFromLink(request.linkUrl);
  }
  
  if (request.context.includes('image') && request.srcUrl) {
    return extractFromImage(request.srcUrl);
  }
  
  // Default: extract entire page data
  return extractPageData();
}

function extractFromSelection(text: string): any {
  return {
    type: 'selection',
    content: text,
    wordCount: text.split(/\s+/).length,
    charCount: text.length
  };
}

function extractFromLink(url: string): any {
  return {
    type: 'link',
    url: url,
    domain: new URL(url).hostname
  };
}

function extractFromImage(url: string): any {
  // Find the clicked image element
  const images = document.querySelectorAll('img[src="' + url + '"]');
  const img = images[0];
  
  if (img) {
    return {
      type: 'image',
      src: url,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight
    };
  }
  
  return { type: 'image', src: url };
}

function extractPageData(): any {
  return {
    type: 'page',
    url: window.location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
    links: Array.from(document.querySelectorAll('a')).map(a => a.href).slice(0, 100)
  };
}
```

Context Menus with chrome.action

You can also add context menu items to your extension's toolbar button (the action icon). This is useful for adding options, help, or quick actions directly from the icon.

Action Button Context Menu

```typescript
// Create menu items specifically for the extension icon
chrome.contextMenus.create({
  id: 'action-options',
  title: 'Options',
  contexts: ['action']  // This makes it appear on right-click of extension icon
});

chrome.contextMenus.create({
  id: 'action-help',
  title: 'Help & Documentation',
  contexts: ['action']
});

chrome.contextMenus.create({
  id: 'action-sep',
  type: 'separator',
  contexts: ['action']
});

// Premium feature: Quick actions
chrome.contextMenus.create({
  id: 'action-quick-screenshot',
  title: 'Quick Screenshot',
  contexts: ['action']
});
```

Note that this requires `action` in your contexts array and uses the extension's action (toolbar icon) as the trigger point rather than page elements.

Checkbox and Radio Menu Items

Stateful menu items allow users to toggle settings directly from the context menu without opening a separate options page.

Settings Menu with Checkboxes and Radio Groups

```typescript
// background/SettingsMenuManager.ts

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSave: boolean;
  language: 'en' | 'es' | 'fr';
}

class SettingsMenuManager {
  private settings: SettingsState = {
    theme: 'system',
    notifications: true,
    autoSave: true,
    language: 'en'
  };

  constructor() {
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings) {
      this.settings = { ...this.settings, ...stored.settings };
    }
  }

  async createSettingsMenus(): Promise<void> {
    // Parent menu for settings
    chrome.contextMenus.create({
      id: 'settings-parent',
      title: ' Settings',
      contexts: ['page', 'action']
    });

    // Checkbox: Notifications
    chrome.contextMenus.create({
      id: 'settings-notifications',
      title: 'Enable Notifications',
      type: 'checkbox',
      checked: this.settings.notifications,
      parentId: 'settings-parent',
      contexts: ['page', 'action']
    });

    // Checkbox: Auto-save
    chrome.contextMenus.create({
      id: 'settings-autosave',
      title: 'Auto-save Data',
      type: 'checkbox',
      checked: this.settings.autoSave,
      parentId: 'settings-parent',
      contexts: ['page', 'action']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'settings-sep-theme',
      type: 'separator',
      parentId: 'settings-parent',
      contexts: ['page', 'action']
    });

    // Radio group: Theme
    chrome.contextMenus.create({
      id: 'theme-light',
      title: 'Light Theme',
      type: 'radio',
      checked: this.settings.theme === 'light',
      parentId: 'settings-parent',
      contexts: ['page', 'action']
    });

    chrome.contextMenus.create({
      id: 'theme-dark',
      title: 'Dark Theme',
      type: 'radio',
      checked: this.settings.theme === 'dark',
      parentId: 'settings-parent',
      contexts: ['page', 'action']
    });

    chrome.contextMenus.create({
      id: 'theme-system',
      title: 'System Theme',
      type: 'radio',
      checked: this.settings.theme === 'system',
      parentId: 'settings-parent',
      contexts: ['page', 'action']
    });
  }

  async handleSettingChange(menuItemId: string, checked: boolean): Promise<void> {
    switch (menuItemId) {
      case 'settings-notifications':
        this.settings.notifications = checked;
        break;
      case 'settings-autosave':
        this.settings.autoSave = checked;
        break;
      case 'theme-light':
        this.settings.theme = 'light';
        break;
      case 'theme-dark':
        this.settings.theme = 'dark';
        break;
      case 'theme-system':
        this.settings.theme = 'system';
        break;
    }

    // Persist settings
    await chrome.storage.local.set({ settings: this.settings });

    // Notify content scripts of setting change
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          settings: this.settings
        });
      }
    }
  }
}

export const settingsManager = new SettingsMenuManager();
```

Performance and Limits

Chrome imposes certain limits on context menus that you need to consider for large-scale extensions.

Browser Limits and Best Practices

Chrome limits the number of context menu items you can create. While the exact limit varies by version and platform, a safe practice is to keep menu items under 100 total. If you need more items, consider organizing them into nested submenus or using dynamic menus that show only relevant items.

Service Worker Lifecycle Considerations

In Manifest V3, service workers can be terminated after inactivity. This affects context menus:

1. Menu persistence: Menu items persist even when the service worker is terminated. Chrome maintains the menu state.

2. Recreating menus: When the service worker wakes up (e.g., on menu click), you may need to recreate dynamic menus. Store your menu state in `chrome.storage` and rebuild on service worker startup:

```typescript
// background/serviceWorker.ts

// Initialize menus on service worker startup
chrome.runtime.onStartup.addListener(async () => {
  await rebuildContextMenus();
});

chrome.runtime.onInstalled.addListener(async () => {
  await rebuildContextMenus();
});

async function rebuildContextMenus(): Promise<void> {
  // Clear existing menus first
  await chrome.contextMenus.removeAll();

  // Load user preferences that affect menu visibility
  const { userState } = await chrome.storage.local.get('userState');
  
  // Rebuild based on stored configuration
  if (userState?.isLoggedIn) {
    // Create logged-in user menus
    menuManager.rebuildMenus(userState);
  } else {
    // Create logged-out menus
    menuManager.rebuildMenus({ isLoggedIn: false, isPremium: false });
  }

  // Always add settings (available to all users)
  settingsManager.createSettingsMenus();
}
```

Avoiding Menu Flicker

When updating menus, use `removeAll()` followed by batch creation to prevent visual flickering:

```typescript
async function updateMenusSmoothly(newConfigs: MenuConfig[]): Promise<void> {
  // Use batch operations to minimize UI updates
  await new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => {
      // Only after removal is complete, create new items
      newConfigs.forEach(config => {
        chrome.contextMenus.create(config);
      });
      resolve();
    });
  });
}
```

Complete Example: Text Utility Extension

Putting it all together, here's a complete text utility extension that demonstrates all the patterns covered in this guide.

manifest.json

```json
{
  "manifest_version": 3,
  "name": "Text Utility Pro",
  "version": "1.0.0",
  "description": "Powerful text manipulation tools accessible via context menu",
  "permissions": [
    "contextMenus",
    "storage",
    "notifications",
    "clipboardRead",
    "clipboardWrite"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "icons": {
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

background.ts - Complete Implementation

```typescript
// background/textUtils.ts

// Text transformation functions
const textOperations = {
  // Counting
  wordCount: (text: string): number => 
    text.trim().split(/\s+/).filter(Boolean).length,
  
  charCount: (text: string): number => text.length,
  
  charCountNoSpaces: (text: string): number => text.replace(/\s/g, '').length,
  
  lineCount: (text: string): number => text.split('\n').length,
  
  // Case transformations
  uppercase: (text: string): string => text.toUpperCase(),
  lowercase: (text: string): string => text.toLowerCase(),
  titleCase: (text: string): string => 
    text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    ),
  camelCase: (text: string): string => 
    text.replace(/\s+(.)/g, (_, c) => c.toUpperCase()),
  snakeCase: (text: string): string => 
    text.replace(/\s+/g, '_').toLowerCase(),
  kebabCase: (text: string): string => 
    text.replace(/\s+/g, '-').toLowerCase(),
  
  // Encoding
  urlEncode: (text: string): string => encodeURIComponent(text),
  urlDecode: (text: string): string => decodeURIComponent(text),
  base64Encode: (text: string): string => btoa(text),
  base64Decode: (text: string): string => atob(text),
  
  // Hashing (using SubtleCrypto for async hashing)
  md5: async (text: string): Promise<string> => {
    // MD5 is not supported in SubtleCrypto, using simple hash for demo
    // In production, use a library or WebAssembly
    return `MD5:${text.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)}`;
  },
  sha256: async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};

// Menu configuration
const menuConfig = {
  id: 'text-utils-root',
  title: ' Text Utils',
  contexts: ['selection'] as chrome.contextMenus.ContextType[]
};

const menuStructure = [
  // Counting submenu
  { id: 'count', title: ' Count', parent: 'text-utils-root', type: 'normal' },
  { id: 'count-words', title: 'Words', parent: 'count', type: 'normal' },
  { id: 'count-chars', title: 'Characters', parent: 'count', type: 'normal' },
  { id: 'count-chars-ns', title: 'Chars (no spaces)', parent: 'count', type: 'normal' },
  { id: 'count-lines', title: 'Lines', parent: 'count', type: 'normal' },
  
  // Separator
  { id: 'sep1', title: '', parent: 'text-utils-root', type: 'separator' },
  
  // Case submenu
  { id: 'case', title: 'Aa Case', parent: 'text-utils-root', type: 'normal' },
  { id: 'uppercase', title: 'UPPERCASE', parent: 'case', type: 'normal' },
  { id: 'lowercase', title: 'lowercase', parent: 'case', type: 'normal' },
  { id: 'titlecase', title: 'Title Case', parent: 'case', type: 'normal' },
  { id: 'camelcase', title: 'camelCase', parent: 'case', type: 'normal' },
  { id: 'snakecase', title: 'snake_case', parent: 'case', type: 'normal' },
  { id: 'kebabcase', title: 'kebab-case', parent: 'case', type: 'normal' },
  
  // Separator
  { id: 'sep2', title: '', parent: 'text-utils-root', type: 'separator' },
  
  // Encoding submenu
  { id: 'encode', title: ' Encode/Decode', parent: 'text-utils-root', type: 'normal' },
  { id: 'url-encode', title: 'URL Encode', parent: 'encode', type: 'normal' },
  { id: 'url-decode', title: 'URL Decode', parent: 'encode', type: 'normal' },
  { id: 'base64-encode', title: 'Base64 Encode', parent: 'encode', type: 'normal' },
  { id: 'base64-decode', title: 'Base64 Decode', parent: 'encode', type: 'normal' },
  
  // Hash submenu
  { id: 'hash', title: '#⃣ Hash', parent: 'text-utils-root', type: 'normal' },
  { id: 'hash-md5', title: 'MD5', parent: 'hash', type: 'normal' },
  { id: 'hash-sha256', title: 'SHA-256', parent: 'hash', type: 'normal' }
];

// Initialize context menus
function initializeMenus(): void {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create root menu
    chrome.contextMenus.create({
      id: menuConfig.id,
      title: menuConfig.title,
      contexts: menuConfig.contexts
    });

    // Create all menu items from configuration
    menuStructure.forEach(item => {
      chrome.contextMenus.create({
        id: item.id,
        title: item.title,
        parentId: item.parent,
        type: item.type as any,
        contexts: ['selection']
      });
    });
  });
}

// Handle menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) {
    showNotification('Error', 'No text selected');
    return;
  }

  const text = info.selectionText;
  let result: string;
  let operation: string;

  // Route to appropriate operation
  switch (info.menuItemId) {
    // Counting
    case 'count-words':
      result = `Words: ${textOperations.wordCount(text)}`;
      operation = 'word count';
      break;
    case 'count-chars':
      result = `Characters: ${textOperations.charCount(text)}`;
      operation = 'character count';
      break;
    case 'count-chars-ns':
      result = `Characters (no spaces): ${textOperations.charCountNoSpaces(text)}`;
      operation = 'character count (no spaces)';
      break;
    case 'count-lines':
      result = `Lines: ${textOperations.lineCount(text)}`;
      operation = 'line count';
      break;
      
    // Case transformations
    case 'uppercase':
      result = textOperations.uppercase(text);
      operation = 'UPPERCASE';
      break;
    case 'lowercase':
      result = textOperations.lowercase(text);
      operation = 'lowercase';
      break;
    case 'titlecase':
      result = textOperations.titleCase(text);
      operation = 'Title Case';
      break;
    case 'camelcase':
      result = textOperations.camelCase(text);
      operation = 'camelCase';
      break;
    case 'snakecase':
      result = textOperations.snakeCase(text);
      operation = 'snake_case';
      break;
    case 'kebabcase':
      result = textOperations.kebabCase(text);
      operation = 'kebab-case';
      break;
      
    // Encoding
    case 'url-encode':
      result = textOperations.urlEncode(text);
      operation = 'URL encoded';
      break;
    case 'url-decode':
      try {
        result = textOperations.urlDecode(text);
        operation = 'URL decoded';
      } catch {
        showNotification('Error', 'Invalid URL-encoded text');
        return;
      }
      break;
    case 'base64-encode':
      try {
        result = textOperations.base64Encode(text);
        operation = 'Base64 encoded';
      } catch {
        showNotification('Error', 'Cannot Base64 encode this text');
        return;
      }
      break;
    case 'base64-decode':
      try {
        result = textOperations.base64Decode(text);
        operation = 'Base64 decoded';
      } catch {
        showNotification('Error', 'Invalid Base64 text');
        return;
      }
      break;
      
    // Hashing (async)
    case 'hash-md5':
      result = await textOperations.md5(text);
      operation = 'MD5 hashed';
      break;
    case 'hash-sha256':
      result = await textOperations.sha256(text);
      operation = 'SHA-256 hashed';
      break;
      
    default:
      return;
  }

  // Copy result to clipboard
  await navigator.clipboard.writeText(result);
  
  // Show notification
  showNotification(`Copied!`, `${operation} result copied to clipboard`);
});

function showNotification(title: string, message: string): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message
  });
}

// Initialize on install and startup
chrome.runtime.onInstalled.addListener(() => {
  initializeMenus();
});

chrome.runtime.onStartup.addListener(() => {
  initializeMenus();
});
```

This complete example demonstrates:
- Nested menu structure with submenus and separators
- Multiple context-specific handlers
- Both synchronous and asynchronous operations
- Integration with notifications and clipboard API
- Proper initialization in service worker lifecycle events

Monetization Considerations

Context menus can serve as excellent monetization touchpoints. As detailed in the [extension monetization strategies](/guides/extension-monetization/) guide, premium extensions often gate advanced menu items behind paywalls. The `DynamicMenuManager` pattern shown earlier supports this by conditionally showing menu items based on user subscription status. Consider offering basic text utilities free while reserving advanced features like batch processing, cloud sync, or custom transformations for premium users.

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
