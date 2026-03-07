# Building a Regex Tester Extension

A comprehensive guide to building a production-ready Regex Tester Chrome extension using Manifest V3, TypeScript, and modern Chrome extension patterns.

## Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design Patterns](#ui-design-patterns)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage](#state-management-and-storage)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture and Manifest Setup

A Regex Tester extension requires several components working together: a popup for quick testing, an optional side panel for persistent testing, a content script overlay for in-page testing, and a service worker for background logic. This section covers the manifest configuration and overall architecture.

### Directory Structure

```
regex-tester/
├── manifest.json
├── background/
│   ├── background.ts
│   └── service-worker.ts
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── content/
│   ├── content.ts
│   └── content.css
├── shared/
│   ├── types.ts
│   ├── regex-engine.ts
│   └── storage.ts
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.ts
│   └── sidepanel.css
└── tests/
    ├── regex-engine.test.ts
    └── integration.test.ts
```

### Manifest Configuration (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "Regex Tester Pro",
  "version": "1.0.0",
  "description": "Test and debug regular expressions with real-time matching",
  "permissions": [
    "storage",
    "sidePanel",
    "activeTab",
    "scripting"
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
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
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

### Key Architecture Decisions

The extension uses a modular architecture with clear separation between UI components, shared business logic, and background services. The `shared` folder contains all TypeScript types and the core regex engine, which can be imported by any component. This ensures consistency and eliminates code duplication.

---

## Core Implementation with TypeScript

This section provides complete TypeScript implementations for the core components of the Regex Tester extension.

### Shared Types (shared/types.ts)

```typescript
export interface RegexMatch {
  fullMatch: string;
  groups: Record<string, string | undefined>;
  index: number;
  input: string;
}

export interface RegexResult {
  isValid: boolean;
  matches: RegexMatch[];
  error?: string;
  executionTime: number;
}

export interface RegexOptions {
  flags: {
    global: boolean;
    caseInsensitive: boolean;
    multiline: boolean;
    dotAll: boolean;
    unicode: boolean;
    sticky: boolean;
  };
}

export interface SavedPattern {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  testStrings: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ExtensionState {
  currentPattern: string;
  currentFlags: string;
  testString: string;
  savedPatterns: SavedPattern[];
  recentMatches: RegexMatch[];
}
```

### Regex Engine (shared/regex-engine.ts)

```typescript
import { RegexMatch, RegexResult, RegexOptions } from './types';

export class RegexEngine {
  /**
   * Executes a regex pattern against an input string
   */
  static execute(pattern: string, input: string, flags: string): RegexResult {
    const startTime = performance.now();
    
    try {
      const regex = new RegExp(pattern, flags);
      const matches: RegexMatch[] = [];
      
      if (flags.includes('g')) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(input)) !== null) {
          matches.push(this.createMatch(match, input));
          // Prevent infinite loops on zero-width matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      } else {
        const match = regex.exec(input);
        if (match) {
          matches.push(this.createMatch(match, input));
        }
      }
      
      return {
        isValid: true,
        matches,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        isValid: false,
        matches: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Validates a regex pattern without executing it
   */
  static validate(pattern: string, flags: string): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern, flags);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid pattern'
      };
    }
  }

  /**
   * Converts options object to flags string
   */
  static optionsToFlags(options: RegexOptions['flags']): string {
    let flags = '';
    if (options.global) flags += 'g';
    if (options.caseInsensitive) flags += 'i';
    if (options.multiline) flags += 'm';
    if (options.dotAll) flags += 's';
    if (options.unicode) flags += 'u';
    if (options.sticky) flags += 'y';
    return flags;
  }

  private static createMatch(match: RegExpExecArray, input: string): RegexMatch {
    return {
      fullMatch: match[0],
      groups: match.groups || {},
      index: match.index,
      input
    };
  }
}
```

### Service Worker (background/service-worker.ts)

```typescript
import { SavedPattern, ExtensionState } from '../shared/types';
import { RegexEngine } from '../shared/regex-engine';

// Handle messages from popup, side panel, and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'EXECUTE_REGEX':
      handleExecuteRegex(message.payload, sendResponse);
      return true;
      
    case 'SAVE_PATTERN':
      handleSavePattern(message.payload, sendResponse);
      return true;
      
    case 'GET_SAVED_PATTERNS':
      handleGetSavedPatterns(sendResponse);
      return true;
      
    case 'DELETE_PATTERN':
      handleDeletePattern(message.payload.id, sendResponse);
      return true;
      
    case 'OPEN_SIDE_PANEL':
      handleOpenSidePanel(sendResponse);
      return true;
  }
});

function handleExecuteRegex(
  payload: { pattern: string; flags: string; input: string },
  sendResponse: (response: any) => void
) {
  const result = RegexEngine.execute(payload.pattern, payload.input, payload.flags);
  sendResponse({ success: true, data: result });
}

async function handleSavePattern(
  payload: SavedPattern,
  sendResponse: (response: any) => void
) {
  try {
    const { patterns } = await chrome.storage.local.get('patterns');
    const savedPatterns: SavedPattern[] = patterns || [];
    
    const newPattern: SavedPattern = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    savedPatterns.push(newPattern);
    await chrome.storage.local.set({ patterns: savedPatterns });
    
    sendResponse({ success: true, data: newPattern });
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to save pattern' });
  }
}

async function handleGetSavedPatterns(sendResponse: (response: any) => void) {
  try {
    const { patterns } = await chrome.storage.local.get('patterns');
    sendResponse({ success: true, data: patterns || [] });
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to get patterns' });
  }
}

async function handleDeletePattern(id: string, sendResponse: (response: any) => void) {
  try {
    const { patterns } = await chrome.storage.local.get('patterns');
    const filtered = (patterns || []).filter((p: SavedPattern) => p.id !== id);
    await chrome.storage.local.set({ patterns: filtered });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to delete pattern' });
  }
}

async function handleOpenSidePanel(sendResponse: (response: any) => void) {
  try {
    await chrome.sidePanel.open({ path: 'sidepanel/sidepanel.html' });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to open side panel' });
  }
}
```

---

## UI Design Patterns

### Popup UI (popup/popup.ts)

```typescript
interface PopupState {
  pattern: string;
  flags: string;
  testString: string;
  result: any;
}

class PopupController {
  private state: PopupState = {
    pattern: '',
    flags: 'g',
    testString: '',
    result: null
  };

  constructor() {
    this.init();
  }

  private async init() {
    // Load saved state from storage
    const { pattern, flags, testString } = await chrome.storage.local.get(
      ['pattern', 'flags', 'testString']
    );
    
    if (pattern) this.state.pattern = pattern;
    if (flags) this.state.flags = flags;
    if (testString) this.state.testString = testString;

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents() {
    const patternInput = document.getElementById('pattern') as HTMLInputElement;
    const testInput = document.getElementById('test-string') as HTMLTextAreaElement;
    const flagCheckboxes = document.querySelectorAll<HTMLInputElement>('.flag-checkbox');

    patternInput?.addEventListener('input', (e) => {
      this.state.pattern = (e.target as HTMLInputElement).value;
      this.executeRegex();
    });

    testInput?.addEventListener('input', (e) => {
      this.state.testString = (e.target as HTMLTextAreaElement).value;
      this.executeRegex();
    });

    flagCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateFlags();
        this.executeRegex();
      });
    });
  }

  private updateFlags() {
    const global = (document.getElementById('flag-g') as HTMLInputElement).checked;
    const ignoreCase = (document.getElementById('flag-i') as HTMLInputElement).checked;
    const multiline = (document.getElementById('flag-m') as HTMLInputElement).checked;
    
    this.state.flags = (global ? 'g' : '') + 
                       (ignoreCase ? 'i' : '') + 
                       (multiline ? 'm' : '');
  }

  private async executeRegex() {
    // Debounce execution
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_REGEX',
        payload: {
          pattern: this.state.pattern,
          flags: this.state.flags,
          input: this.state.testString
        }
      });

      if (response.success) {
        this.state.result = response.data;
        this.renderResults();
      }

      // Save state
      await chrome.storage.local.set({
        pattern: this.state.pattern,
        flags: this.state.flags,
        testString: this.state.testString
      });
    }, 150);
  }

  private debounceTimer: number = 0;

  private renderResults() {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    if (!this.state.result) {
      resultsContainer.innerHTML = '<p class="empty">Enter a pattern to test</p>';
      return;
    }

    if (!this.state.result.isValid) {
      resultsContainer.innerHTML = `<p class="error">${this.state.result.error}</p>`;
      return;
    }

    const { matches, executionTime } = this.state.result;
    
    if (matches.length === 0) {
      resultsContainer.innerHTML = '<p class="no-match">No matches found</p>';
      return;
    }

    const html = `
      <div class="match-count">${matches.length} match${matches.length !== 1 ? 'es' : ''} found</div>
      <div class="execution-time">Executed in ${executionTime.toFixed(2)}ms</div>
      <div class="matches">
        ${matches.map((match: any, i: number) => `
          <div class="match-item">
            <span class="match-index">#${i + 1}</span>
            <span class="match-text">${this.escapeHtml(match.fullMatch)}</span>
            <span class="match-index">at ${match.index}</span>
          </div>
        `).join('')}
      </div>
    `;

    resultsContainer.innerHTML = html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private updateUI() {
    const patternInput = document.getElementById('pattern') as HTMLInputElement;
    const testInput = document.getElementById('test-string') as HTMLTextAreaElement;
    
    if (patternInput) patternInput.value = this.state.pattern;
    if (testInput) testInput.value = this.state.testString;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

### Side Panel Implementation

The side panel provides a persistent testing environment that stays open while browsing. Configure it in manifest.json and implement the same logic as the popup but with additional features like saved patterns management.

```typescript
// sidepanel/sidepanel.ts
class SidePanelController extends PopupController {
  constructor() {
    super();
    this.loadSavedPatterns();
  }

  private async loadSavedPatterns() {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SAVED_PATTERNS'
    });

    if (response.success) {
      this.renderSavedPatterns(response.data);
    }
  }

  private renderSavedPatterns(patterns: SavedPattern[]) {
    const container = document.getElementById('saved-patterns');
    if (!container) return;

    if (patterns.length === 0) {
      container.innerHTML = '<p class="empty">No saved patterns</p>';
      return;
    }

    container.innerHTML = patterns.map(p => `
      <div class="saved-pattern" data-id="${p.id}">
        <div class="pattern-name">${this.escapeHtml(p.name)}</div>
        <div class="pattern-code">${this.escapeHtml(p.pattern)}</div>
        <div class="pattern-flags">${p.flags}</div>
        <button class="load-btn">Load</button>
        <button class="delete-btn">Delete</button>
      </div>
    `).join('');
  }
}
```

---

## Chrome APIs and Permissions

### Required Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Persist user's saved patterns and preferences |
| `sidePanel` | Enable side panel functionality for persistent UI |
| `activeTab` | Access current tab for content script injection |
| `scripting` | Execute scripts in pages for overlay feature |

### Host Permissions

Use `<all_urls>` sparingly. For a regex tester that needs to work on any page, this is necessary. For more restricted use cases, specify exact patterns.

### Chrome API Usage Patterns

Always use asynchronous APIs and handle errors appropriately:

```typescript
// Proper async/await pattern with error handling
async function saveToStorage<T>(key: string, value: T): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    console.error('Storage error:', error);
    return false;
  }
}

// Message passing with proper typing
interface ChromeMessage {
  type: string;
  payload?: any;
}

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, sender, sendResponse) => {
    // Handle message
    return true; // Keep message channel open for async response
  }
);
```

---

## State Management and Storage

### Storage Keys and Data Schema

```typescript
const STORAGE_KEYS = {
  PATTERNS: 'savedPatterns',
  PREFERENCES: 'preferences',
  HISTORY: 'regexHistory',
  CURRENT: 'currentSession'
} as const;

interface Preferences {
  theme: 'light' | 'dark' | 'system';
  defaultFlags: string;
  autoSave: boolean;
  maxHistory: number;
}
```

### State Synchronization Pattern

Use chrome.storage to share state between popup, side panel, and background:

```typescript
class StateManager {
  private listeners: Set<(state: ExtensionState) => void> = new Set();

  constructor() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        this.notifyListeners();
      }
    });
  }

  subscribe(callback: (state: ExtensionState) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private async notifyListeners() {
    const state = await this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  async getState(): Promise<ExtensionState> {
    const data = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    return data as ExtensionState;
  }
}
```

---

## Error Handling and Edge Cases

### Comprehensive Error Handling

```typescript
class SafeRegexEngine {
  static executeSafe(
    pattern: string, 
    input: string, 
    flags: string
  ): RegexResult {
    // Validate inputs
    if (!pattern) {
      return { isValid: false, matches: [], error: 'Pattern is empty', executionTime: 0 };
    }
    
    if (!input) {
      return { isValid: true, matches: [], executionTime: 0 };
    }

    // Check for catastrophic backtracking patterns
    if (this.isPotentiallyDangerous(pattern)) {
      return {
        isValid: false,
        matches: [],
        error: 'Pattern may cause catastrophic backtracking',
        executionTime: 0
      };
    }

    // Execute with timeout simulation
    return this.executeWithTimeout(pattern, input, flags, 5000);
  }

  private static isPotentiallyDangerous(pattern: string): boolean {
    // Check for nested quantifiers that could cause catastrophic backtracking
    const dangerous = /\(\?:[^)]*\+[^)]*\)\+|\([^)]*\+[^)]*\)\*/;
    return dangerous.test(pattern);
  }

  private static executeWithTimeout(
    pattern: string,
    input: string,
    flags: string,
    timeout: number
  ): RegexResult {
    const startTime = performance.now();
    
    try {
      // Use Promise.race for timeout simulation
      const result = RegexEngine.execute(pattern, input, flags);
      
      if (result.executionTime > timeout) {
        return {
          isValid: false,
          matches: [],
          error: `Execution timeout (${timeout}ms exceeded)`,
          executionTime: result.executionTime
        };
      }
      
      return result;
    } catch (error) {
      return {
        isValid: false,
        matches: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: performance.now() - startTime
      };
    }
  }
}
```

### Edge Cases to Handle

- **Empty pattern**: Return early with appropriate message
- **Invalid regex syntax**: Catch and display syntax errors
- **Catastrophic backtracking**: Detect dangerous patterns like nested quantifiers
- **Very long input strings**: Implement input length limits (e.g., 100KB)
- **Unicode edge cases**: Handle surrogate pairs correctly with 'u' flag
- **Zero-width matches**: Prevent infinite loops in global matching

---

## Testing Approach

### Unit Testing the Regex Engine

```typescript
import { describe, it, expect } from 'vitest';
import { RegexEngine } from '../shared/regex-engine';

describe('RegexEngine', () => {
  it('should match simple patterns', () => {
    const result = RegexEngine.execute('hello', 'hello world', 'g');
    expect(result.isValid).toBe(true);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].fullMatch).toBe('hello');
  });

  it('should handle capture groups', () => {
    const result = RegexEngine.execute(
      '(?<first>\\w+) (?<last>\\w+)',
      'John Doe',
      'g'
    );
    expect(result.matches[0].groups.first).toBe('John');
    expect(result.matches[0].groups.last).toBe('Doe');
  });

  it('should return error for invalid patterns', () => {
    const result = RegexEngine.execute('[', 'test', 'g');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle empty input', () => {
    const result = RegexEngine.execute('\\w+', '', 'g');
    expect(result.isValid).toBe(true);
    expect(result.matches.length).toBe(0);
  });
});
```

### Integration Testing

Test the full flow from popup through service worker to storage:

```typescript
describe('Extension Integration', () => {
  it('should save and retrieve patterns', async () => {
    const testPattern: SavedPattern = {
      id: 'test-1',
      name: 'Test',
      pattern: '\\d+',
      flags: 'g',
      testStrings: ['123'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Send save message
    const saveResponse = await chrome.runtime.sendMessage({
      type: 'SAVE_PATTERN',
      payload: testPattern
    });
    expect(saveResponse.success).toBe(true);

    // Retrieve patterns
    const getResponse = await chrome.runtime.sendMessage({
      type: 'GET_SAVED_PATTERNS'
    });
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.length).toBeGreaterThan(0);
  });
});
```

---

## Performance Considerations

### Optimization Strategies

1. **Debounce Input**: Wait 150-300ms before executing regex on user input
2. **Web Workers**: Move heavy regex operations to a web worker for non-blocking UI
3. **Lazy Loading**: Load saved patterns only when needed
4. **Limit History**: Cap stored matches and history items
5. **Use chrome.storage.local**: Faster than sync storage for local-only data

### Memory Management

```typescript
class MemoryManager {
  private static MAX_MATCHES = 1000;
  private static MAX_HISTORY = 50;

  static trimMatches(matches: RegexMatch[]): RegexMatch[] {
    return matches.slice(0, this.MAX_MATCHES);
  }

  static async cleanOldData() {
    const { patterns, history } = await chrome.storage.local.get(
      ['patterns', 'history']
    );

    if (history && history.length > this.MAX_HISTORY) {
      await chrome.storage.local.set({
        history: history.slice(-this.MAX_HISTORY)
      });
    }
  }
}
```

---

## Publishing Checklist

### Pre-Publication Requirements

- [ ] Test on Chrome, Edge, and Brave browsers
- [ ] Verify all icons are present (16, 48, 128px)
- [ ] Check for console errors in all contexts
- [ ] Test with real URLs in host_permissions
- [ ] Review privacy policy if collecting any data
- [ ] Create promotional screenshots (1280x800)
- [ ] Write compelling short and long descriptions
- [ ] Set up OAuth2 for sensitive permissions (if needed)

### Store Listing Best Practices

1. **Name**: Clear and descriptive (e.g., "Regex Tester Pro")
2. **Short Description**: 45 characters max, explain the value
3. **Long Description**: 5000 characters, include features and use cases
4. **Screenshots**: Show the actual UI, highlight key features
5. **Category**: Choose the most relevant category

### Post-Publication

- Monitor user reviews and feedback
- Set up crash reporting with chrome.runtime.reportErrors
- Plan for regular updates with version bumps
- Maintain a changelog for users

---

## Conclusion

Building a production-ready Regex Tester extension requires careful attention to architecture, type safety, error handling, and user experience. This guide covered the essential patterns and implementations needed to create a robust Chrome extension. Follow these patterns, test thoroughly, and you'll have a reliable tool that users can depend on for their regex testing needs.

For more information on Chrome extension development, see the [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/).
