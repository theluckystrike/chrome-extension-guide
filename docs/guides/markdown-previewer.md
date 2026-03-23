Building a Markdown Previewer Chrome Extension

A Markdown previewer extension enhances your browsing experience by rendering Markdown content in real-time as you type or view raw Markdown files on the web. This guide walks you through building a production-ready Markdown previewer using Chrome Extension Manifest V3, TypeScript, and modern web technologies.

Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design Patterns](#ui-design-patterns)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage](#state-management-and-storage)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Code Examples](#code-examples)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

Architecture and Manifest Setup

Extension Architecture

The Markdown Previewer follows a modular architecture with clear separation of concerns:

```
markdown-previewer/
 manifest.json
 background/
    service-worker.ts
 popup/
    popup.html
    popup.ts
    popup.css
 content-script/
    content.ts
    overlay.ts
    content.css
 options/
    options.html
    options.ts
 shared/
    types.ts
    constants.ts
    markdown.ts
 icons/
    icon-16.png
    icon-48.png
    icon-128.png
 utils/
     storage.ts
     logger.ts
```

Manifest Configuration (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "Markdown Previewer",
  "version": "1.0.0",
  "description": "Preview Markdown files and content with live rendering",
  "permissions": [
    "activeTab",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script/content.js"],
      "css": ["content-script/content.css"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options/options.html",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

---

Core Implementation with TypeScript

Shared Types (shared/types.ts)

```typescript
// Core type definitions for the Markdown Previewer extension

export interface MarkdownConfig {
  theme: 'light' | 'dark' | 'system';
  syncScroll: boolean;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  mathEnabled: boolean;
  mermaidEnabled: boolean;
  syntaxHighlight: boolean;
}

export interface PreviewState {
  isActive: boolean;
  sourceContent: string;
  renderedHtml: string;
  scrollPosition: number;
}

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  isMarkdown: boolean;
}

export interface MessagePayload {
  type: 'TOGGLE_PREVIEW' | 'RENDER_MARKDOWN' | 'GET_CONFIG' | 'SET_CONFIG';
  payload?: unknown;
}

export interface StorageSchema {
  config: MarkdownConfig;
  recentFiles: string[];
  theme: 'light' | 'dark';
}

export const DEFAULT_CONFIG: MarkdownConfig = {
  theme: 'system',
  syncScroll: true,
  fontSize: 14,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: 1.6,
  mathEnabled: true,
  mermaidEnabled: false,
  syntaxHighlight: true,
};
```

Markdown Parser (shared/markdown.ts)

```typescript
import { MarkdownConfig } from './types';

// Core markdown parsing with extensions support
export class MarkdownParser {
  private config: MarkdownConfig;
  private marked: typeof import('marked');
  private DOMPurify: typeof import('dompurify');

  constructor(config: MarkdownConfig) {
    this.config = config;
  }

  async parse(markdown: string): Promise<string> {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    try {
      // Configure marked options
      const marked = await import('marked');
      marked.setOptions({
        gfm: true,
        breaks: true,
        async: true,
      });

      // Parse markdown to HTML
      let html = await marked.parse(markdown);

      // Sanitize HTML to prevent XSS
      const DOMPurify = await import('dompurify');
      html = DOMPurify.default(html, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br',
          'hr', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
          'a', 'strong', 'em', 'img', 'table', 'thead', 'tbody',
          'tr', 'th', 'td', 'div', 'span', 'del', 'input'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target'],
      });

      return html;
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return `<pre>${this.escapeHtml(markdown)}</pre>`;
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

// Factory function to create parser instance
export function createMarkdownParser(config: MarkdownConfig): MarkdownParser {
  return new MarkdownParser(config);
}
```

---

UI Design Patterns

Popup UI (popup/popup.ts)

The popup provides quick access to preview controls and settings:

```typescript
import { MarkdownConfig, DEFAULT_CONFIG } from '../shared/types';
import { StorageManager } from '../utils/storage';

class PopupController {
  private storage: StorageManager;
  private config: MarkdownConfig = DEFAULT_CONFIG;

  constructor() {
    this.storage = new StorageManager();
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadConfig();
    this.bindEvents();
    this.updateUI();
  }

  private async loadConfig(): Promise<void> {
    this.config = await this.storage.get<MarkdownConfig>('config') || DEFAULT_CONFIG;
  }

  private bindEvents(): void {
    document.getElementById('toggle-preview')?.addEventListener('click', () => {
      this.togglePreview();
    });

    document.getElementById('theme-select')?.addEventListener('change', (e) => {
      this.updateTheme((e.target as HTMLSelectElement).value as MarkdownConfig['theme']);
    });

    document.getElementById('sync-scroll')?.addEventListener('change', (e) => {
      this.config.syncScroll = (e.target as HTMLInputElement).checked;
      this.saveConfig();
    });
  }

  private async togglePreview(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PREVIEW' });
    }
  }

  private async updateTheme(theme: MarkdownConfig['theme']): Promise<void> {
    this.config.theme = theme;
    await this.saveConfig();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'SET_CONFIG', 
        payload: this.config 
      });
    }
  }

  private async saveConfig(): Promise<void> {
    await this.storage.set('config', this.config);
  }

  private updateUI(): void {
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    const syncScroll = document.getElementById('sync-scroll') as HTMLInputElement;
    
    if (themeSelect) themeSelect.value = this.config.theme;
    if (syncScroll) syncScroll.checked = this.config.syncScroll;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

Content Script Overlay (content-script/overlay.ts)

The content script creates an overlay for in-page Markdown rendering:

```typescript
import { MarkdownConfig, PreviewState } from '../shared/types';
import { MarkdownParser, createMarkdownParser } from '../shared/markdown';

class MarkdownOverlay {
  private overlay: HTMLElement | null = null;
  private parser: MarkdownParser;
  private state: PreviewState;
  private config: MarkdownConfig;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };

  constructor(config: MarkdownConfig) {
    this.config = config;
    this.parser = createMarkdownParser(config);
    this.state = {
      isActive: false,
      sourceContent: '',
      renderedHtml: '',
      scrollPosition: 0,
    };
  }

  async toggle(): Promise<void> {
    if (this.state.isActive) {
      this.hide();
    } else {
      await this.show();
    }
  }

  private async show(): Promise<void> {
    const content = this.extractMarkdownContent();
    if (!content) {
      this.showNotification('No Markdown content detected on this page');
      return;
    }

    this.state.sourceContent = content;
    this.state.renderedHtml = await this.parser.parse(content);
    this.createOverlay();
    this.state.isActive = true;
  }

  private hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.state.isActive = false;
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'markdown-previewer-overlay';
    this.overlay.className = 'markdown-previewer-overlay';
    this.overlay.innerHTML = `
      <div class="markdown-previewer-header">
        <span class="title">Markdown Preview</span>
        <div class="controls">
          <button class="close-btn" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="markdown-previewer-content">
        ${this.state.renderedHtml}
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.bindOverlayEvents();
    this.applyTheme();
  }

  private bindOverlayEvents(): void {
    const closeBtn = this.overlay?.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Drag functionality
    const header = this.overlay?.querySelector('.markdown-previewer-header');
    header?.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
  }

  private startDrag(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
  }

  private drag(e: MouseEvent): void {
    if (!this.isDragging || !this.overlay) return;
    
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    
    this.overlay.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private stopDrag(): void {
    this.isDragging = false;
  }

  private extractMarkdownContent(): string | null {
    // Check for raw markdown in pre/code elements
    const codeBlocks = document.querySelectorAll('pre code, .markdown-body, .md-content');
    
    for (const block of codeBlocks) {
      const text = block.textContent?.trim() || '';
      if (text.length > 20 && /[#*`\[\]()]/.test(text)) {
        return text;
      }
    }

    // Check URL for .md files
    if (window.location.href.includes('.md')) {
      const body = document.body;
      return body?.textContent?.trim() || null;
    }

    return null;
  }

  private applyTheme(): void {
    if (!this.overlay) return;
    
    const isDark = this.config.theme === 'dark' || 
      (this.config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    this.overlay.classList.toggle('dark', isDark);
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'md-preview-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

export { MarkdownOverlay };
```

---

Chrome APIs and Permissions

Required Permissions Analysis

| Permission | Purpose | Justification |
|------------|---------|---------------|
| `activeTab` | Access current tab content | Required for content script injection |
| `storage` | Persist user preferences | Store theme, settings, recent files |
| `tabs` | Query and analyze tabs | Detect Markdown content and URLs |

Host Permissions

The `<all_urls>` host permission is necessary because Markdown files can exist on any domain. However, for production, consider limiting to specific patterns:

```json
"host_permissions": [
  "https://*.github.com/*",
  "https://*.gitlab.com/*",
  "https://*.readme.io/*",
  "https://*/*"
]
```

Chrome API Usage Examples

```typescript
// Service Worker (background/service-worker.ts)

// Message handling from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  
  switch (type) {
    case 'GET_CONFIG':
      handleGetConfig().then(sendResponse);
      return true; // Keep channel open for async response
      
    case 'SET_CONFIG':
      handleSetConfig(payload).then(sendResponse);
      return true;
      
    case 'ANALYZE_TAB':
      handleAnalyzeTab(sender.tab?.id).then(sendResponse);
      return true;
  }
});

async function handleGetConfig(): Promise<MarkdownConfig> {
  const result = await chrome.storage.local.get('config');
  return result.config || DEFAULT_CONFIG;
}

async function handleSetConfig(config: MarkdownConfig): Promise<void> {
  await chrome.storage.local.set({ config });
}

// Tab analysis for Markdown detection
async function handleAnalyzeTab(tabId?: number): Promise<TabInfo | null> {
  if (!tabId) return null;
  
  try {
    const tab = await chrome.tabs.get(tabId);
    const url = tab.url || '';
    const isMarkdown = /\.(md|markdown|mdown|mkdn|mkd)$/i.test(url) ||
      url.includes('readme') ||
      url.includes('markdown');
    
    return {
      id: tabId,
      url,
      title: tab.title || '',
      isMarkdown,
    };
  } catch (error) {
    console.error('Failed to analyze tab:', error);
    return null;
  }
}
```

---

State Management and Storage

Storage Manager Utility (utils/storage.ts)

```typescript
import { StorageSchema } from '../shared/types';

type StorageKey = keyof StorageSchema;

class StorageManager {
  private cache: Map<string, unknown> = new Map();

  async get<T>(key: StorageKey): Promise<T | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    
    const result = await chrome.storage.local.get(key);
    const value = result[key] as T | undefined;
    
    if (value !== undefined) {
      this.cache.set(key, value);
    }
    
    return value ?? null;
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
    this.cache.set(key, value);
  }

  async remove(key: StorageKey): Promise<void> {
    await chrome.storage.local.remove(key);
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear();
    this.cache.clear();
  }

  // Subscribe to storage changes from other contexts
  onChanged(callback: (changes: chrome.storage.StorageChange) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
}

export { StorageManager };
```

State Management Pattern

For complex extensions, implement a proper state management approach:

```typescript
// Event-driven state management
type StateListener<T> = (state: T) => void;

class StateManager<T extends Record<string, unknown>> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return { ...this.state };
  }

  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

---

Error Handling and Edge Cases

Comprehensive Error Handling

```typescript
// Error types for the extension
export class MarkdownPreviewerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: unknown
  ) {
    super(message);
    this.name = 'MarkdownPreviewerError';
  }
}

// Error boundary for content script
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  // Report to error tracking service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

// Graceful degradation for missing features
class FeatureDetector {
  static async detectMarkdownSupport(): Promise<boolean> {
    // Check if page has markdown content
    const hasCodeBlocks = document.querySelectorAll('pre code').length > 0;
    const hasMarkdownFiles = /\.md$/i.test(window.location.href);
    
    return hasCodeBlocks || hasMarkdownFiles;
  }
}
```

Edge Case Handling

1. Empty content: Show placeholder message
2. Very large files: Implement virtual scrolling or pagination
3. Malformed Markdown: Graceful fallback to raw text
4. XSS attempts: Aggressive sanitization with DOMPurify
5. Network failures: Cache rendered content for offline use

---

Testing Approach

Unit Testing with Vitest

```typescript
// tests/markdown.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownParser } from '../shared/markdown';
import { DEFAULT_CONFIG } from '../shared/types';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser(DEFAULT_CONFIG);
  });

  it('should parse simple markdown', async () => {
    const result = await parser.parse('# Hello World');
    expect(result).toContain('<h1>');
    expect(result).toContain('Hello World');
  });

  it('should handle empty input', async () => {
    const result = await parser.parse('');
    expect(result).toBe('');
  });

  it('should sanitize malicious HTML', async () => {
    const result = await parser.parse('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
  });
});
```

Integration Testing

Use Chrome's testing APIs with Puppeteer for end-to-end testing:

```typescript
// tests/e2e/popup.test.ts
import { test, expect } from '@playwright/test';

test('popup toggles preview', async ({ page }) => {
  await page.goto('popup/popup.html');
  
  const toggleButton = page.locator('#toggle-preview');
  await toggleButton.click();
  
  // Verify state change
  await expect(toggleButton).toHaveClass(/active/);
});
```

---

Code Examples

Complete Service Worker Implementation

```typescript
// background/service-worker.ts
import { MarkdownConfig, DEFAULT_CONFIG, MessagePayload } from '../shared/types';
import { StorageManager } from '../utils/storage';

const storage = new StorageManager();

// Initialize extension
async function initialize(): Promise<void> {
  const config = await storage.get<MarkdownConfig>('config');
  if (!config) {
    await storage.set('config', DEFAULT_CONFIG);
  }
  console.log('Markdown Previewer initialized');
}

// Message handling
chrome.runtime.onMessage.addListener(
  (message: MessagePayload, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true;
  }
);

async function handleMessage(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'GET_CONFIG':
      return await storage.get<MarkdownConfig>('config') || DEFAULT_CONFIG;
      
    case 'SET_CONFIG':
      if (message.payload) {
        await storage.set('config', message.payload as MarkdownConfig);
      }
      return { success: true };
      
    case 'TOGGLE_PREVIEW':
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'TOGGLE_PREVIEW' });
      }
      return { success: true };
      
    default:
      return { error: 'Unknown message type' };
  }
}

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'preview-markdown',
    title: 'Preview Markdown',
    contexts: ['selection', 'page'],
  });
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'preview-markdown' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PREVIEW' });
  }
});

// Initialize
initialize();
```

---

Performance Considerations

Performance Optimizations

1. Lazy Loading: Load markdown parser only when needed
2. Debouncing: Debounce input processing for live preview
3. Memoization: Cache rendered HTML for unchanged content
4. Web Workers: Offload parsing to background thread
5. Code Splitting: Split extension into lazy-loaded chunks

```typescript
// Debounced markdown rendering
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

---

Publishing Checklist

Pre-Publication Requirements

- [ ] Testing: Complete unit and integration tests passing
- [ ] Code Review: Internal review completed
- [ ] Permissions: Minimum required permissions only
- [ ] Privacy Policy: Written if extension collects data
- [ ] Screenshots: At least 1 screenshot (recommended 4-8)
- [ ] Description: Clear, accurate description (< 132 chars for title)

Manifest Requirements

```json
{
  "manifest_version": 3,
  "name": "Markdown Previewer",
  "version": "1.0.0",
  "description": "Preview Markdown files with live rendering",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["<all_urls>"]
}
```

Store Listing Best Practices

1. Short Description (< 132 characters): Clearly state the value proposition
2. Long Description: Include feature list, use cases, and FAQ
3. Screenshots: Show actual UI, not mockups
4. Category: Choose appropriate category (Productivity or Developer Tools)
5. Language: Support multiple languages if applicable

Post-Publication

- Monitor user reviews and feedback
- Track performance metrics in Chrome Web Store Developer Dashboard
- Push updates through automated publishing pipeline
- Maintain backward compatibility

---

Summary

Building a Markdown previewer Chrome extension requires careful consideration of architecture, security, and user experience. Key takeaways:

1. Use Manifest V3 with minimal permissions
2. Implement proper TypeScript types for type safety
3. Separate concerns between popup, content script, and background
4. Sanitize all user content to prevent XSS attacks
5. Test thoroughly with unit, integration, and E2E tests
6. Optimize performance with lazy loading and debouncing
7. Follow Chrome Web Store guidelines for successful publishing

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
