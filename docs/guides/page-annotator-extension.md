# Building a Page Annotator Chrome Extension

A Page Annotator extension allows users to highlight, comment, and annotate web pages directly in the browser. This guide covers the complete implementation using Chrome's Manifest V3, TypeScript, and modern extension patterns.

## Architecture Overview

The Page Annotator follows a multi-context architecture:

```
page-annotator/
├── manifest.json           # Extension manifest (MV3)
├── src/
│   ├── background/         # Service worker
│   │   └── index.ts
│   ├── content/            # Content script (injected into pages)
│   │   ├── index.ts
│   │   ├── overlay.ts      # Annotation overlay UI
│   │   └── storage.ts      # Local annotation storage
│   ├── popup/              # Popup UI
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── shared/             # Shared types and utilities
│   │   ├── types.ts
│   │   └── messages.ts
│   └── sidebar/            # Side panel for annotation list
│       ├── sidebar.html
│       ├── sidebar.ts
│       └── sidebar.css
└── icons/                  # Extension icons
```

## Manifest Setup

```json
{
  "manifest_version": 3,
  "name": "Page Annotator",
  "version": "1.0.0",
  "description": "Highlight and annotate web pages",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "sidePanel"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"],
      "css": ["content/overlay.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Core Types

```typescript
// src/shared/types.ts

export interface Annotation {
  id: string;
  pageUrl: string;
  pageTitle: string;
  selector: string;        // CSS selector for the annotated element
  textContent: string;     // Snapshot of selected text
  comment: string;
  color: AnnotationColor;
  createdAt: number;
  updatedAt: number;
}

export type AnnotationColor = 
  | 'yellow' 
  | 'green' 
  | 'blue' 
  | 'pink' 
  | 'orange';

export interface AnnotationStorage {
  annotations: Record<string, Annotation[]>;
  settings: ExtensionSettings;
}

export interface ExtensionSettings {
  defaultColor: AnnotationColor;
  showOnHover: boolean;
  syncEnabled: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultColor: 'yellow',
  showOnHover: true,
  syncEnabled: false,
};
```

## Content Script Implementation

```typescript
// src/content/index.ts

import { Annotation, AnnotationColor } from '../shared/types';
import { AnnotationOverlay } from './overlay';
import { AnnotationStorage } from './storage';

class PageAnnotator {
  private overlay: AnnotationOverlay;
  private storage: AnnotationStorage;
  private isAnnotating = false;

  constructor() {
    this.storage = new AnnotationStorage();
    this.overlay = new AnnotationOverlay();
    this.init();
  }

  private async init(): Promise<void> {
    // Load existing annotations for this page
    const annotations = await this.storage.getForCurrentPage();
    this.overlay.renderAnnotations(annotations);
    
    // Listen for messages from popup/sidebar
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });

    // Set up click handler for text selection
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
  }

  private async handleMessage(
    message: { type: string; payload?: unknown },
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    switch (message.type) {
      case 'GET_ANNOTATIONS':
        return this.storage.getForCurrentPage();
      
      case 'ADD_ANNOTATION':
        return this.addAnnotation(message.payload as Partial<Annotation>);
      
      case 'DELETE_ANNOTATION':
        return this.deleteAnnotation(message.payload as { id: string });
      
      case 'START_ANNOTATION':
        this.isAnnotating = true;
        this.overlay.showTooltip('Select text to annotate');
        return { success: true };
      
      case 'CANCEL_ANNOTATION':
        this.isAnnotating = false;
        this.overlay.hideTooltip();
        return { success: true };
      
      default:
        return { error: 'Unknown message type' };
    }
  }

  private handleTextSelection(event: MouseEvent): void {
    if (!this.isAnnotating) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    // Get the selected element and its CSS selector
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container instanceof Element ? container : container.parentElement;
    
    if (!element) return;

    const selector = this.getCssSelector(element);
    const comment = prompt('Add your annotation:');
    
    if (comment !== null) {
      this.addAnnotation({
        textContent: text,
        selector,
        comment,
        color: 'yellow',
      });
    }

    this.isAnnotating = false;
    this.overlay.hideTooltip();
    selection.removeAllRanges();
  }

  private async addAnnotation(data: Partial<Annotation>): Promise<Annotation> {
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      pageUrl: window.location.href,
      pageTitle: document.title,
      selector: data.selector || '',
      textContent: data.textContent || '',
      comment: data.comment || '',
      color: data.color || 'yellow',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.storage.save(annotation);
    this.overlay.renderAnnotation(annotation);
    
    return annotation;
  }

  private async deleteAnnotation({ id }: { id: string }): Promise<void> {
    await this.storage.delete(id);
    this.overlay.removeAnnotation(id);
  }

  private getCssSelector(element: Element): string {
    // Simplified selector generation
    if (element.id) return `#${element.id}`;
    const path: string[] = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += `#${element.id}`;
        path.unshift(selector);
        break;
      } else {
        const sibling = element.previousElementSibling;
        let sibIndex = 1;
        while (sibling) {
          if (sibling.tagName === element.tagName) sibIndex++;
          sibling = sibling.previousElementSibling;
        }
        if (sibIndex > 1) selector += `:nth-of-type(${sibIndex})`;
      }
      path.unshift(selector);
      element = element.parentElement as Element;
    }
    return path.join(' > ');
  }
}

// Initialize when DOM is ready
new PageAnnotator();
```

## Annotation Overlay

```typescript
// src/content/overlay.ts

import { Annotation } from '../shared/types';

const COLOR_MAP: Record<string, string> = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  green: 'rgba(129, 199, 132, 0.4)',
  blue: 'rgba(100, 181, 246, 0.4)',
  pink: 'rgba(244, 143, 177, 0.4)',
  orange: 'rgba(255, 167, 38, 0.4)',
};

export class AnnotationOverlay {
  private container: HTMLElement;
  private tooltip: HTMLElement;

  constructor() {
    this.container = this.createContainer();
    this.tooltip = this.createTooltip();
    document.body.appendChild(this.container);
    document.body.appendChild(this.tooltip);
  }

  private createContainer(): HTMLElement {
    const div = document.createElement('div');
    div.id = 'annotation-overlay-container';
    div.style.cssText = 'position: absolute; pointer-events: none; z-index: 2147483647;';
    return div;
  }

  private createTooltip(): HTMLElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 2147483647;
      display: none;
      pointer-events: none;
    `;
    return div;
  }

  renderAnnotations(annotations: Annotation[]): void {
    annotations.forEach(a => this.renderAnnotation(a));
  }

  renderAnnotation(annotation: Annotation): void {
    try {
      const elements = document.querySelectorAll(annotation.selector);
      elements.forEach(el => {
        if (el.textContent?.includes(annotation.textContent || '')) {
          el.classList.add(`annotation-${annotation.id}`);
          const highlight = document.createElement('span');
          highlight.style.backgroundColor = COLOR_MAP[annotation.color];
          highlight.style.borderRadius = '2px';
          highlight.style.cursor = 'pointer';
          highlight.dataset.annotationId = annotation.id;
          
          // Click to show annotation details
          highlight.addEventListener('click', () => {
            alert(annotation.comment);
          });
          
          // Wrap content in highlight (simplified)
          this.wrapElement(el, highlight);
        }
      });
    } catch (error) {
      console.error('Failed to render annotation:', error);
    }
  }

  removeAnnotation(id: string): void {
    const elements = document.querySelectorAll(`.annotation-${id}`);
    elements.forEach(el => {
      el.classList.remove(`annotation-${id}`);
      // Remove highlight wrapper if no more annotations
    });
  }

  showTooltip(message: string, x?: number, y?: number): void {
    this.tooltip.textContent = message;
    this.tooltip.style.display = 'block';
    if (x !== undefined && y !== undefined) {
      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top = `${y}px`;
    }
  }

  hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private wrapElement(element: Element, wrapper: HTMLElement): void {
    // Simplified wrapping - in production use proper range manipulation
    if (element.parentElement) {
      element.parentElement.insertBefore(wrapper, element);
      wrapper.appendChild(element);
    }
  }
}
```

## Storage Management

```typescript
// src/content/storage.ts

import { Annotation, DEFAULT_SETTINGS, ExtensionSettings } from '../shared/types';

const STORAGE_KEY = 'annotations';
const SETTINGS_KEY = 'settings';

export class AnnotationStorage {
  private cache: Map<string, Annotation[]> = new Map();

  async getForCurrentPage(): Promise<Annotation[]> {
    const url = window.location.href;
    if (this.cache.has(url)) {
      return this.cache.get(url) || [];
    }

    const result = await chrome.storage.local.get(STORAGE_KEY);
    const allAnnotations: Record<string, Annotation[]> = result[STORAGE_KEY] || {};
    const pageAnnotations = allAnnotations[url] || [];
    
    this.cache.set(url, pageAnnotations);
    return pageAnnotations;
  }

  async save(annotation: Annotation): Promise<void> {
    const url = window.location.href;
    const pageAnnotations = await this.getForCurrentPage();
    pageAnnotations.push(annotation);
    
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const allAnnotations: Record<string, Annotation[]> = result[STORAGE_KEY] || {};
    allAnnotations[url] = pageAnnotations;
    
    await chrome.storage.local.set({ [STORAGE_KEY]: allAnnotations });
    this.cache.set(url, pageAnnotations);
  }

  async delete(id: string): Promise<void> {
    const url = window.location.href;
    const pageAnnotations = await this.getForCurrentPage();
    const filtered = pageAnnotations.filter(a => a.id !== id);
    
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const allAnnotations: Record<string, Annotation[]> = result[STORAGE_KEY] || {};
    allAnnotations[url] = filtered;
    
    await chrome.storage.local.set({ [STORAGE_KEY]: allAnnotations });
    this.cache.set(url, filtered);
  }

  async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return result[SETTINGS_KEY] || DEFAULT_SETTINGS;
  }

  async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  }
}
```

## Sidebar Implementation

```typescript
// src/sidebar/sidebar.ts

import { Annotation } from '../shared/types';

async function loadAnnotations(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ANNOTATIONS' });
  const annotations = response as Annotation[];
  
  renderAnnotations(annotations);
}

function renderAnnotations(annotations: Annotation[]): void {
  const container = document.getElementById('annotations-list');
  if (!container) return;

  container.innerHTML = annotations.length === 0 
    ? '<p class="empty">No annotations yet</p>'
    : annotations.map(a => `
        <div class="annotation-item" data-id="${a.id}">
          <span class="color-dot" style="background: ${getColorHex(a.color)}"></span>
          <div class="content">
            <p class="text">"${escapeHtml(a.textContent || '')}"</p>
            <p class="comment">${escapeHtml(a.comment)}</p>
            <span class="date">${new Date(a.createdAt).toLocaleDateString()}</span>
          </div>
          <button class="delete" data-id="${a.id}">×</button>
        </div>
      `).join('');

  // Add delete handlers
  container.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).dataset.id;
      if (id) await deleteAnnotation(id);
    });
  });
}

async function deleteAnnotation(id: string): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;
  
  await chrome.tabs.sendMessage(tab.id, { 
    type: 'DELETE_ANNOTATION', 
    payload: { id } 
  });
  
  loadAnnotations(); // Refresh list
}

function getColorHex(color: string): string {
  const colors: Record<string, string> = {
    yellow: '#ffeb3b',
    green: '#81c784',
    blue: '#64b5f6',
    pink: '#f48fb1',
    orange: '#ffa726',
  };
  return colors[color] || colors.yellow;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', loadAnnotations);
```

## Error Handling Patterns

```typescript
// Comprehensive error handling example

class ErrorHandlingExample {
  async safeExecute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error('Operation failed:', error);
      this.reportError(error);
      return fallback;
    }
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    chrome.storage.local.get('errorLog').then(result => {
      const log = result.errorLog || [];
      log.push({ message, timestamp: Date.now() });
      // Keep only last 100 errors
      chrome.storage.local.set({ errorLog: log.slice(-100) });
    });
  }

  // Handle DOM mutations for dynamic content
  observeDomChanges(callback: () => void): void {
    const observer = new MutationObserver(callback);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  }
}
```

## Testing Approach

```typescript
// Testing strategy for Page Annotator

// 1. Unit tests for storage logic
describe('AnnotationStorage', () => {
  it('should save and retrieve annotations', async () => {
    const storage = new AnnotationStorage();
    const annotation = {
      id: '1',
      pageUrl: 'https://example.com',
      textContent: 'test',
      comment: 'note',
      color: 'yellow' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await storage.save(annotation);
    const result = await storage.getForCurrentPage();
    
    expect(result).toContainEqual(annotation);
  });
});

// 2. Integration tests with Chrome APIs
// Use chrome-extension-testing library or Playwright

// 3. E2E tests for UI interactions
// Test with Playwright:
/*
import { test, expect } from '@playwright/test';

test('annotate page', async ({ page }) => {
  await page.goto('https://example.com');
  await page.evaluate(() => {
    window.getSelection()?.selectAllChildren(document.body.firstChild);
  });
  // Trigger annotation flow
});
*/
```

## Performance Considerations

1. **Lazy Load Annotations**: Only load annotations when sidebar opens
2. **Debounce Storage Writes**: Batch annotation saves with debounce
3. **Use CSS Containment**: Isolate annotation overlays
4. **Limit DOM Queries**: Cache selector lookups
5. **Service Worker Persistence**: Use `chrome.storage` for persistence, not memory

```typescript
// Debounced storage save
import { debounce } from 'lodash-es';

const debouncedSave = debounce(async (annotations: Annotation[]) => {
  await chrome.storage.local.set({ annotations });
}, 1000);
```

## Publishing Checklist

- [ ] Update `manifest.json` version number
- [ ] Test on Chrome, Edge, and Brave
- [ ] Verify all icons are present (16, 48, 128px)
- [ ] Review permissions - request minimum required
- [ ] Add screenshots and store listing assets
- [ ] Create privacy policy if storing user data
- [ ] Test with Chrome Web Store validator
- [ ] Submit for review with completed metadata

```bash
# Build for production
npm run build

# Package extension
zip -r page-annotator.zip dist/
```

## Summary

This guide covered building a complete Page Annotator extension with:
- MV3 manifest with proper permissions
- TypeScript throughout all contexts
- Content script with overlay rendering
- Sidebar for annotation management
- Storage persistence with error handling
- Testing and performance patterns
- Publishing workflow

Extend this foundation with features like sync, export/import, sharing, and collaborative annotations.
