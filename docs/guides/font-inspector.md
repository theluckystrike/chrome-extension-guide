# Building a Font Inspector Chrome Extension

A Font Inspector is a developer tool that analyzes and displays typography information from web pages, including font families, sizes, weights, line heights, and more. This guide walks through building a production-ready Font Inspector extension using Chrome's modern extension architecture with Manifest V3, TypeScript, and best practices.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Manifest.json Setup](#manifestjson-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design Patterns](#ui-design-patterns)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture Overview

The Font Inspector follows a three-context architecture that separates concerns across the service worker, popup, and content scripts.

```
┌─────────────────┐     chrome.runtime     ┌─────────────────┐
│     Popup       │ ◄───────────────────► │   Service       │
│  (UI Context)   │    message passing    │   Worker        │
└────────┬────────┘                       └────────┬────────┘
         │                                          │
         │           chrome.runtime                 │
         └──────────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  Content Script │
                │  (Page Context) │
                └─────────────────┘
```

### Directory Structure

```
font-inspector/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── index.ts          # Service worker entry
│   │   ├── font-analyzer.ts  # Font analysis logic
│   │   └── storage.ts        # Storage utilities
│   ├── popup/
│   │   ├── index.html        # Popup HTML
│   │   ├── index.tsx         # React/Preact entry
│   │   ├── App.tsx           # Main component
│   │   └── styles.css        # Popup styles
│   ├── content/
│   │   ├── index.ts          # Content script entry
│   │   ├── font-scanner.ts   # DOM font scanning
│   │   └── overlay.ts        # Page overlay UI
│   ├── shared/
│   │   ├── types.ts          # Shared TypeScript types
│   │   └── constants.ts      # Shared constants
│   └── components/           # Reusable UI components
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

---

## Manifest.json Setup

The manifest defines the extension's capabilities and permissions. For a Font Inspector, we need access to active tabs, storage, and script injection.

```json
{
  "manifest_version": 3,
  "name": "Font Inspector Pro",
  "version": "1.0.0",
  "description": "Analyze and inspect fonts on any webpage with detailed typography metrics",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "Inspect Fonts"
  },
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": "content/index.js",
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## Core Implementation with TypeScript

### Shared Types

Define TypeScript interfaces that are shared across all contexts:

```typescript
// src/shared/types.ts

export interface FontInfo {
  family: string;
  fullName: string;
  style: string;
  weight: number;
  size: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  isCustomFont: boolean;
  source: 'system' | 'webfont' | 'inline';
}

export interface ElementFontData {
  element: string;
  selector: string;
  fonts: FontInfo[];
  computedStyles: CSSStyleDeclaration;
}

export interface PageFontAnalysis {
  url: string;
  timestamp: number;
  totalElements: number;
  uniqueFonts: FontInfo[];
  elementsByFont: Map<string, ElementFontData[]>;
}

export interface ExtensionSettings {
  highlightOnHover: boolean;
  showFontPanel: boolean;
  darkMode: boolean;
  excludeSystemFonts: boolean;
  minFontSize: number;
}

export type MessageType = 
  | 'SCAN_FONTS'
  | 'SCAN_RESULT'
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'TOGGLE_OVERLAY'
  | 'ANALYSIS_COMPLETE';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
  tabId?: number;
}
```

### Content Script - Font Scanner

The content script runs in the page context and extracts font information from DOM elements:

```typescript
// src/content/font-scanner.ts

import { FontInfo, ElementFontData, PageFontAnalysis } from '../shared/types';

export class FontScanner {
  private excludeSelectors = [
    'script', 'style', 'noscript', 'iframe', 
    'canvas', 'svg', 'video', 'audio'
  ];

  /**
   * Scans all text elements on the page and collects font information
   */
  async scanPage(): Promise<PageFontAnalysis> {
    const elements = this.getTextElements();
    const uniqueFonts = new Map<string, FontInfo>();
    const elementsByFont = new Map<string, ElementFontData[]>();

    for (const element of elements) {
      const fontData = this.extractFontData(element);
      
      // Track unique fonts
      const fontKey = `${fontData.family}-${fontData.weight}-${fontData.style}`;
      if (!uniqueFonts.has(fontKey)) {
        uniqueFonts.set(fontKey, fontData);
      }

      // Group elements by font
      if (!elementsByFont.has(fontKey)) {
        elementsByFont.set(fontKey, []);
      }
      elementsByFont.get(fontKey)!.push({
        element: element.tagName.toLowerCase(),
        selector: this.getSelector(element),
        fonts: [fontData],
        computedStyles: element.style
      });
    }

    return {
      url: window.location.href,
      timestamp: Date.now(),
      totalElements: elements.length,
      uniqueFonts: Array.from(uniqueFonts.values()),
      elementsByFont
    };
  }

  private getTextElements(): HTMLElement[] {
    const allElements = document.querySelectorAll('*');
    return Array.from(allElements).filter(el => {
      const tag = el.tagName.toLowerCase();
      if (this.excludeSelectors.includes(tag)) return false;
      if (!el.textContent?.trim()) return false;
      if (getComputedStyle(el).display === 'none') return false;
      return true;
    }) as HTMLElement[];
  }

  private extractFontData(element: Element): FontInfo {
    const styles = getComputedStyle(element);
    const fontFamily = styles.fontFamily;
    const fontWeight = parseInt(styles.fontWeight(), 10) || 400;
    
    // Determine font source
    const source = this.detectFontSource(styles, fontFamily);

    return {
      family: fontFamily.replace(/['"]/g, ''),
      fullName: styles.font,
      style: styles.fontStyle,
      weight: fontWeight,
      size: styles.fontSize,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing,
      color: styles.color,
      isCustomFont: source !== 'system',
      source
    };
  }

  private detectFontSource(styles: CSSStyleDeclaration, family: string): 'system' | 'webfont' | 'inline' {
    // Check if font is a web font (Google Fonts, custom, etc.)
    const isWebFont = family.includes(' ') && 
      !['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(family.toLowerCase());
    
    // Check if it's an inline style font (defined in page CSS)
    const hasInlineFont = styles.cssText.includes('font-family');
    
    return isWebFont ? 'webfont' : hasInlineFont ? 'inline' : 'system';
  }

  private getSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  }
}
```

### Service Worker - Font Analyzer

The background service worker coordinates font analysis and manages state:

```typescript
// src/background/index.ts

import { FontScanner } from '../content/font-scanner';
import { PageFontAnalysis, ExtensionMessage, ExtensionSettings } from '../shared/types';

const DEFAULT_SETTINGS: ExtensionSettings = {
  highlightOnHover: true,
  showFontPanel: true,
  darkMode: false,
  excludeSystemFonts: false,
  minFontSize: 12
};

// Storage wrapper for type safety
const storage = {
  async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get('settings');
    return result.settings || DEFAULT_SETTINGS;
  },

  async setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.local.set({
      settings: { ...current, ...settings }
    });
  },

  async getAnalysis(tabId: number): Promise<PageFontAnalysis | null> {
    const result = await chrome.storage.local.get(`analysis_${tabId}`);
    return result[`analysis_${tabId}`] || null;
  },

  async setAnalysis(tabId: number, analysis: PageFontAnalysis): Promise<void> {
    await chrome.storage.local.set({
      [`analysis_${tabId}`]: analysis
    });
  }
};

// Message handler for popup and content script communication
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Keep message channel open for async response
  }
);

async function handleMessage(
  message: ExtensionMessage, 
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'SCAN_FONTS':
      if (!tabId) throw new Error('No active tab');
      
      // Inject content script if needed and scan
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // This runs in page context
            const scanner = new FontScanner();
            return scanner.scanPage();
          }
        });
        
        // Store results
        const results = await storage.getAnalysis(tabId);
        return results;
      } catch (error) {
        console.error('Font scan failed:', error);
        throw error;
      }

    case 'GET_SETTINGS':
      return storage.getSettings();

    case 'SET_SETTINGS':
      if (message.payload) {
        await storage.setSettings(message.payload as Partial<ExtensionSettings>);
      }
      return { success: true };

    default:
      return { error: 'Unknown message type' };
  }
}

// Install event - initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  console.log('Font Inspector extension installed');
});
```

---

## UI Design Patterns

### Popup UI with React/Preact

The popup provides quick access to font inspection tools:

```tsx
// src/popup/App.tsx

import { useState, useEffect } from 'react';
import { FontInfo, ExtensionSettings, PageFontAnalysis } from '../shared/types';

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [analysis, setAnalysis] = useState<PageFontAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fonts' | 'settings'>('fonts');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // Get settings
      const settingsResult = await chrome.storage.local.get('settings');
      setSettings(settingsResult.settings);

      // Get cached analysis
      const analysisResult = await chrome.storage.local.get(`analysis_${tab.id}`);
      if (analysisResult[`analysis_${tab.id}`]) {
        setAnalysis(analysisResult[`analysis_${tab.id}`]);
      }

      // Request fresh scan
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FONTS' }, (response) => {
        if (response) {
          setAnalysis(response);
        }
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSettings(newSettings: Partial<ExtensionSettings>) {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await chrome.storage.local.set({ settings: updated });
  }

  if (loading) {
    return <div className="loading">Analyzing fonts...</div>;
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Font Inspector</h1>
        <div className="tabs">
          <button 
            className={activeTab === 'fonts' ? 'active' : ''}
            onClick={() => setActiveTab('fonts')}
          >
            Fonts
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </header>

      {activeTab === 'fonts' ? (
        <FontList analysis={analysis} />
      ) : (
        <SettingsPanel 
          settings={settings!} 
          onChange={updateSettings} 
        />
      )}
    </div>
  );
}

function FontList({ analysis }: { analysis: PageFontAnalysis | null }) {
  if (!analysis) {
    return <div className="empty-state">No fonts found on this page</div>;
  }

  return (
    <div className="font-list">
      <div className="stats">
        <span>{analysis.uniqueFonts.length} unique fonts</span>
        <span>{analysis.totalElements} elements</span>
      </div>
      {analysis.uniqueFonts.map((font, index) => (
        <FontCard key={index} font={font} />
      ))}
    </div>
  );
}

function FontCard({ font }: { font: FontInfo }) {
  return (
    <div className="font-card">
      <div className="font-preview" style={{ fontFamily: font.family }}>
        Aa Bb Cc 123
      </div>
      <div className="font-details">
        <div className="font-name">{font.family}</div>
        <div className="font-meta">
          <span>Weight: {font.weight}</span>
          <span>Size: {font.size}</span>
        </div>
        <span className={`source-badge ${font.source}`}>
          {font.source}
        </span>
      </div>
    </div>
  );
}
```

### Content Script Overlay

For interactive font inspection, inject an overlay directly into the page:

```typescript
// src/content/overlay.ts

export class FontOverlay {
  private container: HTMLElement;
  private tooltip: HTMLElement;
  private isVisible = false;

  constructor() {
    this.container = this.createContainer();
    this.tooltip = this.createTooltip();
    document.body.appendChild(this.container);
    document.body.appendChild(this.tooltip);
    this.attachListeners();
  }

  private createContainer(): HTMLElement {
    const div = document.createElement('div');
    div.id = 'font-inspector-overlay';
    div.innerHTML = `
      <style>
        #font-inspector-overlay {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          max-height: 80vh;
          overflow-y: auto;
          background: #1e1e1e;
          color: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        #font-inspector-overlay .header {
          padding: 16px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #font-inspector-overlay .close-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 18px;
        }
      </style>
      <div class="header">
        <span>Font Inspector</span>
        <button class="close-btn">×</button>
      </div>
      <div class="content"></div>
    `;
    return div;
  }

  private createTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.id = 'font-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 999999;
    `;
    return tooltip;
  }

  private attachListeners(): void {
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    this.container.querySelector('.close-btn')?.addEventListener('click', () => {
      this.hide();
    });
  }

  private handleMouseOver(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.textContent?.trim()) {
      const styles = getComputedStyle(target);
      this.showTooltip(target, styles);
    }
  }

  private handleMouseOut(): void {
    this.hideTooltip();
  }

  private showTooltip(element: HTMLElement, styles: CSSStyleDeclaration): void {
    const rect = element.getBoundingClientRect();
    this.tooltip.innerHTML = `
      <strong>${styles.fontFamily}</strong><br>
      Size: ${styles.fontSize}<br>
      Weight: ${styles.fontWeight}<br>
      Line-height: ${styles.lineHeight}
    `;
    this.tooltip.style.left = `${rect.left}px`;
    this.tooltip.style.top = `${rect.bottom + 5}px`;
    this.tooltip.style.opacity = '1';
  }

  private hideTooltip(): void {
    this.tooltip.style.opacity = '0';
  }

  show(data: unknown): void {
    this.isVisible = true;
    this.container.style.display = 'block';
    // Populate with font data
  }

  hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  toggle(): void {
    this.isVisible ? this.hide() : this.show(null);
  }
}
```

---

## Chrome APIs and Permissions

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab for font scanning |
| `storage` | Persist settings and cached analysis |
| `scripting` | Execute scripts to analyze page fonts |
| `tabs` | Get tab information for context |

### Host Permissions

```json
"host_permissions": ["<all_urls>"]
```

This is required to analyze fonts on any webpage. For stricter security, you can limit to specific domains.

### API Usage Patterns

```typescript
// Accessing tab information
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Injecting content scripts
await chrome.scripting.executeScript({
  target: { tabId: tab.id! },
  func: () => {
    // Code runs in page context
    document.title;
  }
});

// Persistent storage
await chrome.storage.local.set({ key: value });
const { key } = await chrome.storage.local.get('key');
```

---

## State Management

### Storage Patterns

Use chrome.storage with typed wrappers:

```typescript
// src/background/storage.ts

import { ExtensionSettings, PageFontAnalysis } from '../shared/types';

class StorageManager {
  private prefix = 'font_inspector_';

  async getSettings(): Promise<ExtensionSettings> {
    const key = `${this.prefix}settings`;
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  async setSettings(settings: ExtensionSettings): Promise<void> {
    const key = `${this.prefix}settings`;
    await chrome.storage.local.set({ [key]: settings });
  }

  async getAnalysis(tabId: number): Promise<PageFontAnalysis | null> {
    const key = `${this.prefix}analysis_${tabId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }

  async setAnalysis(tabId: number, analysis: PageFontAnalysis): Promise<void> {
    const key = `${this.prefix}analysis_${tabId}`;
    await chrome.storage.local.set({ [key]: analysis });
  }

  async clearAnalysis(tabId?: number): Promise<void> {
    if (tabId) {
      const key = `${this.prefix}analysis_${tabId}`;
      await chrome.storage.local.remove(key);
    } else {
      // Clear all analysis
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all).filter(k => k.includes(this.prefix));
      await chrome.storage.local.remove(keys);
    }
  }
}

export const storageManager = new StorageManager();
```

---

## Error Handling

### Content Script Error Handling

```typescript
// src/content/index.ts

window.addEventListener('error', (event) => {
  chrome.runtime.sendMessage({
    type: 'ERROR',
    payload: {
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href
    }
  });
});

// Wrap main logic in try-catch
try {
  const scanner = new FontScanner();
  const analysis = await scanner.scanPage();
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_COMPLETE',
    payload: analysis
  });
} catch (error) {
  console.error('Font scanning failed:', error);
  chrome.runtime.sendMessage({
    type: 'ERROR',
    payload: {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }
  });
}
```

### Service Worker Error Handling

```typescript
// src/background/index.ts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const result = await handleMessage(message, sender);
    sendResponse({ success: true, data: result });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});
```

---

## Testing Approach

### Unit Testing with Vitest

```typescript
// tests/font-scanner.test.ts

import { describe, it, expect, vi } from 'vitest';
import { FontScanner } from '../src/content/font-scanner';

describe('FontScanner', () => {
  beforeEach(() => {
    // Mock DOM environment
    document.body.innerHTML = `
      <div style="font-family: Arial">Text 1</div>
      <div style="font-family: Times New Roman">Text 2</div>
      <span style="font-family: Arial">Text 3</span>
    `;
  });

  it('should extract font information from elements', () => {
    const scanner = new FontScanner();
    const elements = scanner['getTextElements']();
    
    expect(elements.length).toBe(3);
  });

  it('should identify unique fonts', async () => {
    const scanner = new FontScanner();
    const analysis = await scanner.scanPage();
    
    expect(analysis.uniqueFonts.length).toBe(2);
  });
});
```

### Integration Testing with Playwright

```typescript
// tests/integration.spec.ts

import { test, expect } from '@playwright/test';

test('extension popup displays fonts', async ({ page }) => {
  // Load test page
  await page.goto('https://example.com');
  
  // Open extension popup
  const extensionId = 'your-extension-id';
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
  
  // Wait for fonts to load
  await page.waitForSelector('.font-list');
  
  // Verify fonts are displayed
  const fonts = await page.locator('.font-card').count();
  expect(fonts).toBeGreaterThan(0);
});
```

---

## Performance Considerations

### Optimize Font Scanning

1. **Limit scanned elements**: Only scan visible elements in viewport
2. **Debounce analysis**: Don't re-scan on every DOM change
3. **Cache results**: Store analysis in chrome.storage
4. **Use requestIdleCallback**: Defer non-critical work

```typescript
// Debounced font scanning
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

// Use Intersection Observer to only scan visible elements
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      scanElement(entry.target as HTMLElement);
    }
  });
}, { rootMargin: '100px' });
```

### Memory Management

- Clean up event listeners when popup closes
- Release references to DOM elements
- Use WeakMap for element-to-data mappings

---

## Publishing Checklist

Before publishing to Chrome Web Store:

1. **Manifest Review**
   - [ ] All permissions are necessary and minimal
   - [ ] Host permissions are scoped appropriately
   - [ ] Icons are provided in all required sizes (16, 48, 128)

2. **Testing**
   - [ ] Extension works in Incognito mode
   - [ ] No console errors on multiple test pages
   - [ ] All features work across different domains

3. **Store Assets**
   - [ ] Screenshots (1280x800 or 640x400)
   - [ ] Promotional icon (128x128)
   - [ ] Privacy policy URL (if collecting data)

4. **Manifest Fields**
   - [ ] Short description (< 132 characters)
   - [ ] Version follows semver
   - [ ] `default_locale` if using i18n

5. **Build**
   - [ ] Run production build
   - [ ] Verify no source maps in production
   - [ ] Test packed .crx file

### Build Configuration

```javascript
// webpack.config.js

module.exports = {
  mode: 'production',
  entry: {
    'background/index': './src/background/index.ts',
    'content/index': './src/content/index.ts',
    'popup/index': './src/popup/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  // ... additional config
};
```

---

## Summary

Building a Font Inspector extension requires careful consideration of Chrome's extension architecture. Key takeaways:

1. **Architecture**: Use the three-context model (popup, service worker, content script) for clean separation
2. **TypeScript**: Leverage shared types for type safety across contexts
3. **Permissions**: Request only necessary permissions; use activeTab when possible
4. **Performance**: Debounce scanning, cache results, and use modern APIs
5. **Testing**: Combine unit tests with integration tests using Playwright
6. **Publishing**: Follow Chrome Web Store guidelines and test thoroughly before submission
