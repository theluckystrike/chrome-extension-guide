# Building a JSON Formatter Chrome Extension

A comprehensive guide to building a production-ready JSON formatter extension using Manifest V3 and TypeScript.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Manifest V3 Setup](#manifest-v3-setup)
- [Core TypeScript Implementation](#core-typescript-implementation)
- [UI Design Patterns](#ui-design-patterns)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture Overview

A JSON Formatter extension typically consists of three main components:

1. Popup UI - Quick access for manual JSON formatting
2. Content Script Overlay - Format JSON directly on web pages
3. Background Service Worker - Handles persistent state and cross-context communication

```

                    Extension Architecture               

  Popup (popup.ts)       Content Script (content.ts)   
  - Input textarea      - Overlay injection           
  - Format button       - Selection listener           
  - Copy/Download       - Page mutation observer       

                                      
           
                       
           
             Background (service    
             worker)                
             - Storage sync         
             - Settings management  
           
```

---

Manifest V3 Setup

Create your `manifest.json` with the necessary permissions and configuration:

```json
{
  "manifest_version": 3,
  "name": "JSON Formatter Pro",
  "version": "1.0.0",
  "description": "Format, validate, and minify JSON with syntax highlighting",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Permission Strategy

| Permission | Purpose | Required |
|------------|---------|----------|
| `storage` | Persist user preferences | Yes |
| `activeTab` | Access current tab's content | Yes |
| `scripting` | Inject content scripts | Yes |
| `contextMenus` | Right-click context menu | Optional |
| `host_permissions` | Access all URLs for formatting | Yes |

---

Core TypeScript Implementation

Project Structure

```
src/
 background/
    index.ts
    service-worker.ts
 popup/
    popup.ts
    popup.html
    popup.css
 content/
    content.ts
    content.css
 shared/
    types.ts
    json-formatter.ts
    storage.ts
 utils/
     logger.ts
```

Shared Types (src/shared/types.ts)

```typescript
// Type definitions for the JSON Formatter extension

export interface FormatterOptions {
  indent: number | 'tab';
  sortKeys: boolean;
  validate: boolean;
  syntaxHighlighting: boolean;
  copyToClipboard: boolean;
}

export interface FormatResult {
  success: boolean;
  output: string;
  error?: string;
  stats?: {
    inputSize: number;
    outputSize: number;
    parseTime: number;
  };
}

export interface UserSettings extends FormatterOptions {
  theme: 'light' | 'dark' | 'system';
  autoFormat: boolean;
  maxFileSize: number;
}

export interface Message {
  type: 'FORMAT_JSON' | 'GET_SETTINGS' | 'SET_SETTINGS';
  payload?: unknown;
}

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  indent: 2,
  sortKeys: false,
  validate: true,
  syntaxHighlighting: true,
  copyToClipboard: true,
  theme: 'system',
  autoFormat: false,
  maxFileSize: 1024 * 1024, // 1MB
};
```

Core Formatter (src/shared/json-formatter.ts)

```typescript
import type { FormatterOptions, FormatResult } from './types';

/
 * Core JSON formatting logic with validation and transformation
 */
export class JsonFormatter {
  private options: FormatterOptions;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      indent: 2,
      sortKeys: false,
      validate: true,
      syntaxHighlighting: true,
      copyToClipboard: true,
      ...options,
    };
  }

  /
   * Format JSON string with options
   */
  format(input: string): FormatResult {
    const startTime = performance.now();
    
    try {
      // Step 1: Parse the input
      let parsed: unknown;
      if (this.options.validate) {
        parsed = JSON.parse(input);
      } else {
        // Attempt parse, but handle gracefully
        try {
          parsed = JSON.parse(input);
        } catch {
          // Return raw if validation disabled
          return {
            success: true,
            output: input,
            stats: {
              inputSize: new Blob([input]).size,
              outputSize: new Blob([input]).size,
              parseTime: performance.now() - startTime,
            },
          };
        }
      }

      // Step 2: Optional transformations
      if (this.options.sortKeys) {
        parsed = this.sortObjectKeys(parsed);
      }

      // Step 3: Stringify with formatting
      const indent = this.options.indent === 'tab' ? '\t' : this.options.indent;
      const output = JSON.stringify(parsed, null, indent);

      // Step 4: Apply syntax highlighting if enabled
      const finalOutput = this.options.syntaxHighlighting
        ? this.applyHighlighting(output)
        : output;

      return {
        success: true,
        output: finalOutput,
        stats: {
          inputSize: new Blob([input]).size,
          outputSize: new Blob([finalOutput]).size,
          parseTime: performance.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /
   * Minify JSON by removing all whitespace
   */
  minify(input: string): FormatResult {
    const startTime = performance.now();
    
    try {
      const parsed = JSON.parse(input);
      const output = JSON.stringify(parsed);
      
      return {
        success: true,
        output,
        stats: {
          inputSize: new Blob([input]).size,
          outputSize: new Blob([output]).size,
          parseTime: performance.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }

  /
   * Validate JSON without formatting
   */
  validate(input: string): { valid: boolean; error?: string } {
    try {
      JSON.parse(input);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }

  /
   * Recursively sort object keys alphabetically
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as object).sort();
      
      for (const key of keys) {
        sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key]);
      }
      
      return sorted;
    }
    
    return obj;
  }

  /
   * Apply basic syntax highlighting to JSON string
   * Returns HTML with span elements for different token types
   */
  private applyHighlighting(json: string): string {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
        const isKey = /\s:$/.test(match);
        const color = isKey ? '#9cdcfe' : '#ce9178';
        return `<span style="color: ${color}">${match}</span>`;
      })
      .replace(/\b(true|false)\b/g, '<span style="color: #569cd6">$1</span>')
      .replace(/\b(null)\b/g, '<span style="color: #569cd6">$1</span>')
      .replace(/\b(-?\d+\.?\d*)\b/g, '<span style="color: #b5cea8">$1</span>');
  }

  updateOptions(options: Partial<FormatterOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

export const createFormatter = (options?: FormatterOptions): JsonFormatter => 
  new JsonFormatter(options);
```

---

UI Design Patterns

Popup Implementation (src/popup/popup.ts)

```typescript
import { createFormatter, DEFAULT_SETTINGS, type UserSettings } from '../shared/types';
import { JsonFormatter } from '../shared/json-formatter';
import { storage } from '../shared/storage';

document.addEventListener('DOMContentLoaded', async () => {
  const formatter = new JsonFormatter();
  const settings = await storage.getSettings();
  
  // UI Elements
  const inputArea = document.getElementById('json-input') as HTMLTextAreaElement;
  const outputArea = document.getElementById('json-output') as HTMLDivElement;
  const formatBtn = document.getElementById('format-btn');
  const minifyBtn = document.getElementById('minify-btn');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  
  // Format button handler
  formatBtn?.addEventListener('click', () => {
    const input = inputArea.value;
    if (!input.trim()) {
      showError('Please enter JSON to format');
      return;
    }
    
    formatter.updateOptions(settings);
    const result = formatter.format(input);
    
    if (result.success) {
      outputArea.innerHTML = result.output;
      showStats(result.stats);
    } else {
      showError(result.error || 'Formatting failed');
    }
  });
  
  // Copy to clipboard
  copyBtn?.addEventListener('click', async () => {
    const text = outputArea.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch (err) {
      showError('Failed to copy');
    }
  });
  
  // Minify button
  minifyBtn?.addEventListener('click', () => {
    const input = inputArea.value;
    const result = formatter.minify(input);
    
    if (result.success) {
      outputArea.textContent = result.output;
    } else {
      showError(result.error || 'Minification failed');
    }
  });
  
  // Clear button
  clearBtn?.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.innerHTML = '';
  });
  
  function showError(message: string): void {
    outputArea.innerHTML = `<span style="color: #f14c4c">${message}</span>`;
  }
  
  function showStats(stats?: { inputSize: number; outputSize: number; parseTime: number }): void {
    if (stats) {
      console.log(`Formatted in ${stats.parseTime.toFixed(2)}ms`);
    }
  }
  
  function showToast(message: string): void {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
});
```

Content Script Overlay (src/content/content.ts)

```typescript
// Content script for in-page JSON formatting

interface JsonOverlay {
  container: HTMLElement;
  close: () => void;
}

let activeOverlay: JsonOverlay | null = null;

/
 * Create a floating overlay for JSON display
 */
function createOverlay(content: string): JsonOverlay {
  const container = document.createElement('div');
  container.id = 'json-formatter-overlay';
  container.innerHTML = `
    <div class="json-formatter-header">
      <span>JSON Formatter</span>
      <button class="close-btn">&times;</button>
    </div>
    <pre class="json-content">${content}</pre>
    <div class="json-formatter-actions">
      <button class="copy-btn">Copy</button>
      <button class="download-btn">Download</button>
    </div>
  `;
  
  document.body.appendChild(container);
  
  // Event handlers
  container.querySelector('.close-btn')?.addEventListener('click', () => {
    container.remove();
    activeOverlay = null;
  });
  
  return {
    container,
    close: () => {
      container.remove();
      activeOverlay = null;
    },
  };
}

/
 * Listen for messages from popup or background
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SHOW_JSON') {
    // Close existing overlay
    activeOverlay?.close();
    
    // Create new overlay with formatted JSON
    activeOverlay = createOverlay(message.payload);
    sendResponse({ success: true });
  }
  
  if (message.type === 'HIDE_JSON') {
    activeOverlay?.close();
    sendResponse({ success: true });
  }
  
  return true;
});

/
 * Handle text selection for quick formatting
 */
document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  
  if (selectedText && selectedText.startsWith('{') || selectedText?.startsWith('[')) {
    // Could trigger automatic formatting preview
    // on selected JSON-like text
  }
});
```

---

State Management

Storage Service (src/shared/storage.ts)

```typescript
import type { UserSettings } from './types';

const STORAGE_KEY = 'json-formatter-settings';

/
 * Chrome storage abstraction with type safety
 */
export const storage = {
  /
   * Get settings from chrome.storage.local
   */
  async getSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] as UserSettings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return getDefaultSettings();
    }
  },

  /
   * Save settings to chrome.storage.local
   */
  async setSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  /
   * Reset to default settings
   */
  async resetSettings(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  },
};

function getDefaultSettings(): UserSettings {
  return {
    indent: 2,
    sortKeys: false,
    validate: true,
    syntaxHighlighting: true,
    copyToClipboard: true,
    theme: 'system',
    autoFormat: false,
    maxFileSize: 1024 * 1024,
  };
}
```

---

Error Handling

Best Practices for Error Handling

1. Always wrap async Chrome API calls in try-catch
2. Provide meaningful error messages to users
3. Log errors for debugging while protecting user privacy
4. Handle edge cases gracefully

```typescript
// Example error handling pattern
async function safeFormat(input: string): Promise<FormatResult> {
  try {
    if (!input || input.trim() === '') {
      return {
        success: false,
        output: '',
        error: 'Input is empty',
      };
    }

    if (input.length > MAX_INPUT_SIZE) {
      return {
        success: false,
        output: '',
        error: `Input exceeds maximum size of ${MAX_INPUT_SIZE} characters`,
      };
    }

    const formatter = createFormatter();
    return formatter.format(input);
  } catch (error) {
    // Log internally but don't expose raw errors
    console.error('Format error:', error);
    return {
      success: false,
      output: '',
      error: 'An unexpected error occurred while formatting',
    };
  }
}
```

Edge Cases to Handle

| Edge Case | Handling |
|-----------|----------|
| Empty input | Show friendly message |
| Extremely large JSON | Warn user, offer streaming |
| Circular references | Detect and report |
| Non-JSON text | Attempt parse, show clear error |
| Unicode characters | Preserve with proper encoding |
| Very deep nesting | Handle stack overflow gracefully |

---

Testing Approach

Unit Testing with Vitest

```typescript
// __tests__/json-formatter.test.ts
import { describe, it, expect } from 'vitest';
import { JsonFormatter } from '../src/shared/json-formatter';

describe('JsonFormatter', () => {
  const formatter = new JsonFormatter();

  it('should format valid JSON', () => {
    const input = '{"name":"test","value":123}';
    const result = formatter.format(input);
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('"name": "test"');
  });

  it('should return error for invalid JSON', () => {
    const input = '{invalid}';
    const result = formatter.format(input);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should sort keys when option enabled', () => {
    const formatter = new JsonFormatter({ sortKeys: true });
    const input = '{"zebra":"a","apple":"b"}';
    const result = formatter.format(input);
    
    expect(result.success).toBe(true);
    // Apple should come before zebra
    const appleIndex = result.output.indexOf('apple');
    const zebraIndex = result.output.indexOf('zebra');
    expect(appleIndex).toBeLessThan(zebraIndex);
  });

  it('should minify JSON correctly', () => {
    const input = `{
      "name": "test",
      "value": 123
    }`;
    const result = formatter.minify(input);
    
    expect(result.success).toBe(true);
    expect(result.output).toBe('{"name":"test","value":123}');
  });
});
```

Integration Testing

Use Playwright for testing the popup and content script interactions:

```typescript
// __tests__/popup.integration.test.ts
import { test, expect } from '@playwright/test';

test('popup formats JSON correctly', async ({ page }) => {
  // Load extension popup
  await page.goto('popup.html');
  
  // Enter JSON
  await page.fill('#json-input', '{"test":true}');
  
  // Click format
  await page.click('#format-btn');
  
  // Check output
  const output = await page.textContent('#json-output');
  expect(output).toContain('"test": true');
});
```

---

Performance Considerations

Optimization Strategies

1. Lazy Load Heavy Libraries - Only load syntax highlighters when needed
2. Debounce Input Handling - Prevent excessive re-formatting while typing
3. Use Web Workers - Offload heavy JSON processing for large files
4. Cache Formatted Results - Avoid re-formatting unchanged input
5. Limit Content Script - Use `run_at: document_idle` to not block page load

```typescript
// Debounced formatter for real-time preview
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

// Usage in popup
const debouncedFormat = debounce((input: string) => {
  const result = formatter.format(input);
  outputArea.innerHTML = result.output;
}, 300);

inputArea.addEventListener('input', () => {
  debouncedFormat(inputArea.value);
});
```

---

Publishing Checklist

Before publishing to Chrome Web Store:

Pre-Submission

- [ ] Update version in manifest.json
- [ ] Run production build with minification
- [ ] Test in Chrome, Edge, and Brave
- [ ] Verify all permissions are necessary
- [ ] Check for console errors
- [ ] Test with large JSON files
- [ ] Verify keyboard accessibility
- [ ] Test dark/light theme support

Store Listing

- [ ] Write compelling title and description
- [ ] Create promotional screenshots (1280x800)
- [ ] Design store icon (128x128)
- [ ] Set up privacy policy if needed
- [ ] Choose appropriate categories

Post-Submission

- [ ] Monitor review feedback
- [ ] Set up crash reporting
- [ ] Configure auto-update
- [ ] Prepare for handling reviews

---

Conclusion

This guide covered the essential components for building a production-ready JSON Formatter Chrome extension. Key takeaways:

1. Use Manifest V3 with the latest Chrome APIs
2. TypeScript provides type safety and better developer experience
3. Modular architecture separates concerns between popup, content script, and background
4. Proper error handling ensures a smooth user experience
5. Comprehensive testing prevents regressions
6. Performance optimization handles large JSON files gracefully

For the complete source code and more examples, refer to the extension examples directory.
