# Building a Text Expander Chrome Extension

A text expander lets users define abbreviations that automatically expand into longer text snippets. This guide covers building a production-ready text expander extension using Chrome's Manifest V3, TypeScript, and modern extension architecture patterns.

## Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design](#ui-design)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage](#state-management-and-storage)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture and Manifest Setup

### Directory Structure

```
text-expander/
 manifest.json
 background/
    background.ts
    index.ts
 popup/
    popup.html
    popup.ts
    popup.css
 content/
    content.ts
    content.css
 shared/
    types.ts
    storage.ts
    constants.ts
 services/
    expansion-engine.ts
    snippet-repository.ts
 icons/
    icon-16.png
    icon-48.png
    icon-128.png
 tests/
    ...
 tsconfig.json
 webpack.config.js
 package.json
```

### Manifest Configuration (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "Text Expander Pro",
  "version": "1.0.0",
  "description": "Expand abbreviations into full text snippets with powerful pattern matching",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs",
    "contextMenus",
    "alarms"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/background.js",
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "toggle-expansion": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Toggle text expansion on/off"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-128.png",
    "128": "icons/icon-128.png"
  }
}
```

---

Core Implementation with TypeScript

Shared Types (shared/types.ts)

```typescript
// Core type definitions for the text expander extension

export interface Snippet {
  id: string;
  abbreviation: string;
  content: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  isActive: boolean;
  caseSensitive: boolean;
  matchWholeWord: boolean;
}

export interface ExpansionContext {
  textBefore: string;
  textAfter: string;
  currentWord: string;
  cursorPosition: number;
}

export interface ExpansionResult {
  success: boolean;
  expandedText: string;
  replacementRange?: { start: number; end: number };
  error?: string;
}

export interface ExpansionOptions {
  caseSensitive: boolean;
  matchWholeWord: boolean;
  triggerOnSpace: boolean;
  triggerOnEnter: boolean;
  triggerOnTab: boolean;
}

export interface ExtensionSettings {
  enabled: boolean;
  defaultOptions: ExpansionOptions;
  syncEnabled: boolean;
  showNotifications: boolean;
  enableAnalytics: boolean;
}

export interface SnippetGroup {
  id: string;
  name: string;
  color: string;
  snippetIds: string[];
}

// Message types for cross-context communication
export type MessageType = 
  | { type: 'GET_SNIPPETS' }
  | { type: 'GET_SNIPPETS_RESPONSE'; snippets: Snippet[] }
  | { type: 'EXPAND_TEXT'; context: ExpansionContext }
  | { type: 'EXPAND_RESULT'; result: ExpansionResult }
  | { type: 'TOGGLE_ENABLED'; enabled: boolean }
  | { type: 'SETTINGS_UPDATED'; settings: ExtensionSettings };
```

Constants (shared/constants.ts)

```typescript
export const STORAGE_KEYS = {
  SNIPPETS: 'text_expander_snippets',
  SETTINGS: 'text_expander_settings',
  EXPANSION_STATS: 'expansion_stats',
  GROUPS: 'snippet_groups'
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  defaultOptions: {
    caseSensitive: false,
    matchWholeWord: true,
    triggerOnSpace: true,
    triggerOnEnter: true,
    triggerOnTab: true
  },
  syncEnabled: true,
  showNotifications: false,
  enableAnalytics: false
};

export const MAX_SNIPPET_CONTENT_LENGTH = 10000;
export const MIN_ABBREVIATION_LENGTH = 2;
export const MAX_ABBREVIATION_LENGTH = 20;
export const SNIPPET_LIMIT = 500;
```

Snippet Repository (services/snippet-repository.ts)

```typescript
import { Snippet, ExtensionSettings } from '../shared/types';
import { STORAGE_KEYS, DEFAULT_SETTINGS, SNIPPET_LIMIT } from '../shared/constants';

export class SnippetRepository {
  private cache: Map<string, Snippet> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const snippets = await this.getAllSnippets();
    snippets.forEach(snippet => this.cache.set(snippet.id, snippet));
    this.initialized = true;
  }

  async getAllSnippets(): Promise<Snippet[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SNIPPETS);
    return result[STORAGE_KEYS.SNIPPETS] || [];
  }

  async getSnippetById(id: string): Promise<Snippet | undefined> {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    const snippets = await this.getAllSnippets();
    return snippets.find(s => s.id === id);
  }

  async getSnippetByAbbreviation(abbreviation: string, options: {
    caseSensitive?: boolean;
    matchWholeWord?: boolean;
  } = {}): Promise<Snippet | undefined> {
    const snippets = await this.getAllSnippets();
    const { caseSensitive = false, matchWholeWord = true } = options;

    return snippets.find(snippet => {
      if (!snippet.isActive) return false;
      
      const abbrev = caseSensitive ? abbreviation : abbreviation.toLowerCase();
      const snippetAbbrev = caseSensitive ? snippet.abbreviation : snippet.abbreviation.toLowerCase();
      
      if (matchWholeWord) {
        const regex = new RegExp(`\\b${this.escapeRegex(snippetAbbrev)}\\b`);
        return regex.test(abbrev);
      }
      
      return abbrev.includes(snippetAbbrev);
    });
  }

  async createSnippet(data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Snippet> {
    const snippets = await this.getAllSnippets();
    
    if (snippets.length >= SNIPPET_LIMIT) {
      throw new Error(`Maximum snippet limit (${SNIPPET_LIMIT}) reached`);
    }

    const existing = await this.getSnippetByAbbreviation(data.abbreviation);
    if (existing) {
      throw new Error(`Abbreviation "${data.abbreviation}" already exists`);
    }

    const now = Date.now();
    const snippet: Snippet = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };

    snippets.push(snippet);
    await chrome.storage.local.set({ [STORAGE_KEYS.SNIPPETS]: snippets });
    this.cache.set(snippet.id, snippet);
    
    return snippet;
  }

  async updateSnippet(id: string, updates: Partial<Snippet>): Promise<Snippet> {
    const snippets = await this.getAllSnippets();
    const index = snippets.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error(`Snippet with id "${id}" not found`);
    }

    const updated: Snippet = {
      ...snippets[index],
      ...updates,
      id,
      updatedAt: Date.now()
    };

    snippets[index] = updated;
    await chrome.storage.local.set({ [STORAGE_KEYS.SNIPPETS]: snippets });
    this.cache.set(id, updated);
    
    return updated;
  }

  async deleteSnippet(id: string): Promise<void> {
    const snippets = await this.getAllSnippets();
    const filtered = snippets.filter(s => s.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.SNIPPETS]: filtered });
    this.cache.delete(id);
  }

  async incrementUsage(id: string): Promise<void> {
    const snippet = await this.getSnippetById(id);
    if (snippet) {
      await this.updateSnippet(id, { usageCount: snippet.usageCount + 1 });
    }
  }

  private generateId(): string {
    return `snip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const snippetRepository = new SnippetRepository();
```

Expansion Engine (services/expansion-engine.ts)

{% raw %}
```typescript
import { Snippet, ExpansionContext, ExpansionResult, ExpansionOptions } from '../shared/types';
import { snippetRepository } from './snippet-repository';

export class ExpansionEngine {
  private enabled = true;
  private options: ExpansionOptions;

  constructor(options: ExpansionOptions) {
    this.options = options;
  }

  updateOptions(options: Partial<ExpansionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async expand(context: ExpansionContext): Promise<ExpansionResult> {
    if (!this.enabled) {
      return { success: false, expandedText: '' };
    }

    const currentWord = context.currentWord;
    if (!currentWord || currentWord.length < 2) {
      return { success: false, expandedText: '' };
    }

    const snippet = await snippetRepository.getSnippetByAbbreviation(currentWord, {
      caseSensitive: this.options.caseSensitive,
      matchWholeWord: this.options.matchWholeWord
    });

    if (!snippet) {
      return { success: false, expandedText: '' };
    }

    // Process content with placeholders
    const expandedText = this.processContent(snippet.content, context);
    
    // Track usage
    await snippetRepository.incrementUsage(snippet.id);

    return {
      success: true,
      expandedText,
      replacementRange: {
        start: context.cursorPosition - currentWord.length,
        end: context.cursorPosition
      }
    };
  }

  private processContent(content: string, context: ExpansionContext): string {
    let result = content;
    
    // Date/time placeholders
    const now = new Date();
    const datePlaceholders: Record<string, string> = {
      '{{date}}': now.toLocaleDateString(),
      '{{time}}': now.toLocaleTimeString(),
      '{{datetime}}': now.toLocaleString(),
      '{{year}}': now.getFullYear().toString(),
      '{{month}}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{{day}}': now.getDate().toString().padStart(2, '0'),
      '{{dayname}}': now.toLocaleDateString('en-US', { weekday: 'long' })
    };

    for (const [placeholder, value] of Object.entries(datePlaceholders)) {
      result = result.replace(new RegExp(this.escapeRegex(placeholder), 'g'), value);
    }

    // Cursor position placeholder
    if (result.includes('{{cursor}}')) {
      result = result.replace('{{cursor}}', '');
    }

    // Clipboard placeholder
    if (result.includes('{{clipboard}}')) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        result = result.replace('{{clipboard}}', clipboardText);
      } catch {
        result = result.replace('{{clipboard}}', '');
      }
    }

    return result;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```
{% endraw %}

---

UI Design

Popup Interface (popup/popup.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Expander</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Text Expander</h1>
      <label class="toggle-switch">
        <input type="checkbox" id="enable-toggle" checked>
        <span class="slider"></span>
      </label>
    </header>

    <div class="search-container">
      <input type="text" id="search-input" placeholder="Search snippets...">
    </div>

    <nav class="tabs">
      <button class="tab active" data-tab="snippets">Snippets</button>
      <button class="tab" data-tab="groups">Groups</button>
      <button class="tab" data-tab="settings">Settings</button>
    </nav>

    <main class="content">
      <div id="snippets-tab" class="tab-content active">
        <ul id="snippet-list" class="snippet-list"></ul>
        <button id="add-snippet-btn" class="btn btn-primary">Add Snippet</button>
      </div>

      <div id="groups-tab" class="tab-content">
        <ul id="group-list" class="group-list"></ul>
        <button id="add-group-btn" class="btn btn-secondary">Add Group</button>
      </div>

      <div id="settings-tab" class="tab-content">
        <form id="settings-form">
          <div class="setting-group">
            <label>Case Sensitive</label>
            <input type="checkbox" name="caseSensitive">
          </div>
          <div class="setting-group">
            <label>Match Whole Word</label>
            <input type="checkbox" name="matchWholeWord" checked>
          </div>
          <div class="setting-group">
            <label>Trigger on Space</label>
            <input type="checkbox" name="triggerOnSpace" checked>
          </div>
          <div class="setting-group">
            <label>Trigger on Enter</label>
            <input type="checkbox" name="triggerOnEnter">
          </div>
          <div class="setting-group">
            <label>Trigger on Tab</label>
            <input type="checkbox" name="triggerOnTab" checked>
          </div>
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </form>
      </div>
    </main>

    <footer class="popup-footer">
      <span id="snippet-count">0 snippets</span>
    </footer>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

Content Script for Text Expansion (content/content.ts)

```typescript
// Content script that handles text expansion in input fields

import { ExpansionContext, ExpansionResult } from '../shared/types';

class TextExpanderContent {
  private engine: ExpansionEngine | null = null;
  private lastExpanded = '';

  async initialize(): Promise<void> {
    // Request expansion engine from background
    const response = await chrome.runtime.sendMessage({ type: 'GET_ENGINE' });
    this.engine = response.engine;
    
    // Attach event listeners
    this.attachListeners();
  }

  private attachListeners(): void {
    // Listen for input events on editable elements
    document.addEventListener('input', this.handleInput.bind(this), true);
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    
    // Handle paste events
    document.addEventListener('paste', this.handlePaste.bind(this), true);
  }

  private async handleInput(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    if (!this.isEditableElement(target)) return;

    const context = this.extractContext(target);
    if (!context) return;

    // Check if we should trigger expansion
    const result = await this.engine?.expand(context);
    if (result?.success) {
      await this.performExpansion(target, result);
    }
  }

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLElement;
    if (!this.isEditableElement(target)) return;

    // Handle Tab, Enter, Space triggers
    const triggerKeys = ['Tab', 'Enter', ' '];
    if (!triggerKeys.includes(event.key)) return;
    
    event.preventDefault();
    
    const context = this.extractContext(target);
    if (!context) return;

    const result = await this.engine?.expand(context);
    if (result?.success) {
      await this.performExpansion(target, result);
    } else {
      // Insert the character normally
      document.execCommand('insertText', false, event.key);
    }
  }

  private async performExpansion(
    element: HTMLElement,
    result: ExpansionResult
  ): Promise<void> {
    const editable = element as HTMLElement & {
      innerText?: string;
      value?: string;
    };

    // Get current text
    const currentText = editable.innerText || editable.value || '';
    
    // Calculate replacement
    const { replacementRange } = result;
    if (!replacementRange) return;

    const before = currentText.substring(0, replacementRange.start);
    const after = currentText.substring(replacementRange.end);
    const newText = before + result.expandedText + after;

    // Update the element
    if (editable.innerText !== undefined) {
      editable.innerText = newText;
    } else if (editable.value !== undefined) {
      editable.value = newText;
    }

    // Move cursor to after expanded text
    this.setCursorPosition(element, replacementRange.start + result.expandedText.length);
    
    this.lastExpanded = result.expandedText;
  }

  private extractContext(element: HTMLElement): ExpansionContext | null {
    const editable = element as HTMLElement & { selectionStart?: number };
    const selectionStart = editable.selectionStart || 0;
    
    let text: string;
    if ('value' in element) {
      text = (element as HTMLInputElement).value;
    } else if ('innerText' in element) {
      text = element.innerText || '';
    } else {
      return null;
    }

    // Get text before cursor
    const textBefore = text.substring(0, selectionStart);
    
    // Extract current word (word being typed)
    const wordMatch = textBefore.match(/(\S+)$/);
    const currentWord = wordMatch ? wordMatch[1] : '';
    
    // Get text after cursor
    const textAfter = text.substring(selectionStart);

    return {
      textBefore,
      textAfter,
      currentWord,
      cursorPosition: selectionStart
    };
  }

  private setCursorPosition(element: HTMLElement, position: number): void {
    const range = document.createRange();
    const sel = window.getSelection();
    
    // For text inputs
    if ('setSelectionRange' in element) {
      (element as HTMLInputElement).setSelectionRange(position, position);
      return;
    }

    // For contentEditable
    range.selectNodeContents(element);
    range.collapse(false);
    
    // This is simplified - real implementation needs proper offset calculation
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private isEditableElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      element.isContentEditable
    );
  }

  private async handlePaste(event: ClipboardEvent): Promise<void> {
    // Handle paste if needed
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TextExpanderContent().initialize();
  });
} else {
  new TextExpanderContent().initialize();
}
```

---

Chrome APIs and Permissions

Required Permissions Explained

| Permission | Purpose | Security Consideration |
|------------|---------|----------------------|
| `storage` | Store snippets and settings locally | Required for user data |
| `activeTab` | Access current tab for expansion | Limited to active tab only |
| `scripting` | Execute content scripts | Used for DOM manipulation |
| `contextMenus` | Right-click menu integration | Optional feature |
| `alarms` | Schedule periodic sync | Optional |

Host Permissions

```json
"host_permissions": [
  "<all_urls>"
]
```

This is required because text expansion needs to work across all websites. For maximum security, you could limit to specific domains, but that reduces utility.

---

State Management and Storage

Storage Pattern Using Repository Pattern

```typescript
// Use repository pattern for data access
// See services/snippet-repository.ts above

// Settings storage with defaults
export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await loadSettings();
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, ...settings }
  });
}

// Sync support using chrome.storage.sync
export async function syncToCloud(snippets: Snippet[]): Promise<void> {
  if (!await hasSyncPermission()) return;
  
  await chrome.storage.sync.set({
    [STORAGE_KEYS.SNIPPETS]: snippets
  });
}
```

---

Error Handling and Edge Cases

Error Handling Strategies

```typescript
export class ExpansionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ExpansionError';
  }
}

export function handleExpansionError(error: unknown): ExpansionResult {
  console.error('Expansion error:', error);
  
  if (error instanceof ExpansionError) {
    return {
      success: false,
      expandedText: '',
      error: error.recoverable ? error.message : 'Unknown error'
    };
  }
  
  return {
    success: false,
    expandedText: '',
    error: 'An unexpected error occurred'
  };
}

// Edge case: Handle specific problematic sites
export function shouldDisableOnSite(url: string): boolean {
  const disabledDomains = [
    'google.com',  // Search suggestions interfere
    'localhost',   // Dev environments
  ];
  
  try {
    const hostname = new URL(url).hostname;
    return disabledDomains.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}
```

Common Edge Cases

1. Rich text editors: Many editors use custom implementations - test extensively
2. Password fields: Never expand in password-type inputs
3. Code editors: May have their own expansion systems
4. IME composition: Handle Input Method Editor events properly
5. Very long abbreviations: Limit to prevent memory issues

---

Testing Approach

Unit Tests (Jest)

```typescript
// tests/expansion-engine.test.ts
import { ExpansionEngine } from '../services/expansion-engine';
import { SnippetRepository } from '../services/snippet-repository';

describe('ExpansionEngine', () => {
  let engine: ExpansionEngine;
  let repository: SnippetRepository;

  beforeEach(() => {
    engine = new ExpansionEngine({
      caseSensitive: false,
      matchWholeWord: true,
      triggerOnSpace: true,
      triggerOnEnter: true,
      triggerOnTab: true
    });
  });

  test('should expand abbreviation to snippet content', async () => {
    const context = {
      textBefore: 'Hello w',
      textAfter: '',
      currentWord: 'w',
      cursorPosition: 7
    };

    const result = await engine.expand(context);
    expect(result.success).toBe(true);
    expect(result.expandedText).toContain('world');
  });

  test('should not expand unknown abbreviations', async () => {
    const context = {
      textBefore: 'Hello xyz',
      textAfter: '',
      currentWord: 'xyz',
      cursorPosition: 9
    };

    const result = await engine.expand(context);
    expect(result.success).toBe(false);
  });

  test('should respect case sensitivity setting', async () => {
    engine.updateOptions({ caseSensitive: true });
    
    const context = {
      textBefore: 'Hello W',
      textAfter: '',
      currentWord: 'W',
      cursorPosition: 6
    };

    const result = await engine.expand(context);
    expect(result.success).toBe(false);
  });
});
```

Integration Testing

```typescript
// tests/integration/content.test.ts
import { testInChromium } from '@test/helpers/browser';

testInChromium('should expand text in input field', async (page) => {
  await page.goto('https://example.com');
  await page.fill('input[name="test"]', 'w');
  
  // Trigger expansion
  await page.press('input[name="test"]', 'Space');
  
  // Verify expansion
  const value = await page.inputValue('input[name="test"]');
  expect(value).toContain('world');
});
```

---

Performance Considerations

Optimization Strategies

1. Lazy Loading: Load snippet repository only when needed
2. Caching: Cache frequently used snippets in memory
3. Debouncing: Debounce input handlers to reduce processing

```typescript
// Debounced expansion handler
import { debounce } from 'lodash-es';

class OptimizedExpander {
  private expandDebounced = debounce(async (context) => {
    const result = await this.engine.expand(context);
    if (result.success) {
      await this.performExpansion(result);
    }
  }, 50);

  handleInput(event: Event): void {
    this.expandDebounced(this.extractContext(event.target));
  }
}
```

4. Content Script Optimization: Use `run_at: document_idle` to not block page load
5. Service Worker Optimization: Keep service worker alive with periodic heartbeats if needed

---

Publishing Checklist

Pre-Publication Requirements

- [ ] All features implemented and tested
- [ ] No console errors in production
- [ ] Privacy policy written and hosted
- [ ] Screenshots and promotional assets prepared
- [ ] Extension icon at required sizes (16, 48, 128px)

Chrome Web Store Submission

1. Developer Dashboard: Create developer account ($5 one-time fee)
2. Upload: Package as ZIP (no .crx files)
3. Assets Required:
   - 1280x800 screenshot (PNG/JPG)
   - 440x280 small tile
   - Privacy policy URL
4. Review Process: Typically 1-7 days

Post-Publication

- [ ] Monitor crash reports in developer dashboard
- [ ] Respond to user reviews
- [ ] Plan version updates
- [ ] Set up analytics for usage tracking (with consent)

---

Summary

Building a text expander extension requires:

1. Manifest V3 with proper permissions for storage and scripting
2. TypeScript for type safety across all contexts
3. Repository pattern for clean data access
4. Content scripts that handle expansion in all input types
5. Popup UI for snippet management
6. Comprehensive error handling for edge cases
7. Thorough testing across different sites

This guide provides a production-ready foundation. Extend with features like cloud sync, snippet sharing, or AI-powered suggestions as needed.
