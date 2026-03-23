Grammar Checker Extension Patterns

Building a grammar checker extension for Chrome is a sophisticated undertaking that combines text analysis, API integration, and smooth user experience design. This guide covers the architectural patterns, implementation strategies, and TypeScript code examples needed to create a production-ready grammar checking extension.

Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Text Selection Detection Pattern](#text-selection-detection-pattern)
- [Content Script Integration](#content-script-integration)
- [Background Service Worker for API Communication](#background-service-worker-for-api-communication)
- [Popup Interface Patterns](#popup-interface-patterns)
- [Storage and Settings Management](#storage-and-settings-management)
- [Performance Optimization](#performance-optimization)

---

Architecture Overview

A grammar checker extension typically operates across multiple Chrome extension contexts:

- Content Script: Detects text selection, highlights errors in-place, provides contextual UI
- Service Worker: Handles API communication with grammar checking services, manages caching
- Popup: Quick access to toggle features, view error summary, access settings
- Options Page: Full configuration UI for language selection, API keys, preferences

```

                      Extension Context                        

   Content          Service Worker     Popup / Options     
   Script                                                  

 • Selection      • API calls        • UI controls         
 • Error          • Caching          • Settings            
   highlighting  • Rate limiting    • Statistics          
 • Context menu   • Message routing                        

```

---

Core Components

Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "GrammarGuard",
  "version": "1.0.0",
  "description": "Advanced grammar and style checker",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"]
  }]
}
```

---

Text Selection Detection Pattern

The foundation of a grammar checker is detecting when users select text. Here's a solid TypeScript implementation:

```typescript
// content/text-selection.ts

interface TextSelection {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  fullText: string;
}

class TextSelectionDetector {
  private lastSelection: TextSelection | null = null;
  private debounceTimer: number | null = null;

  constructor(private onSelectionChange: (selection: TextSelection) => void) {
    this.initListeners();
  }

  private initListeners(): void {
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Also listen for selection changes via MutationObserver
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
  }

  private handleMouseUp(): void {
    this.processSelection();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Only process for modifier keys + other keys (not regular typing)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      this.processSelection();
    }
  }

  private handleSelectionChange(): void {
    // Debounce to avoid excessive processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.processSelection();
    }, 150);
  }

  private processSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      return; // Skip very short selections
    }

    // Get the container element and its full text
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const fullText = container.textContent || '';

    // Calculate relative positions
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const selectionStart = preCaretRange.toString().length;
    const selectionEnd = selectionStart + text.length;

    const selectionData: TextSelection = {
      text,
      selectionStart,
      selectionEnd,
      fullText
    };

    // Avoid duplicate processing
    if (!this.lastSelection || this.lastSelection.text !== text) {
      this.lastSelection = selectionData;
      this.onSelectionChange(selectionData);
    }
  }

  destroy(): void {
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

export { TextSelectionDetector, TextSelection };
```

---

Content Script Integration

The content script orchestrates the UI overlay and communicates with the background service worker:

```typescript
// content/grammar-checker.ts

interface GrammarError {
  type: 'grammar' | 'spelling' | 'style';
  message: string;
  suggestions: string[];
  position: {
    start: number;
    end: number;
  };
  severity: 'error' | 'warning' | 'info';
}

class GrammarCheckerContent {
  private selectionDetector: TextSelectionDetector;
  private errorMarkers: Map<string, HTMLElement> = new Map();
  private popup: HTMLElement | null = null;
  private isProcessing = false;

  constructor() {
    this.selectionDetector = new TextSelectionDetector(this.handleTextSelection.bind(this));
    this.createPopup();
    this.setupContextMenu();
  }

  private async handleTextSelection(selection: TextSelection): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.clearMarkers();

    try {
      // Send to background script for API call
      const response = await this.sendToBackground({
        action: 'checkGrammar',
        text: selection.text,
        context: selection.fullText,
        position: selection.selectionStart
      });

      if (response.errors && response.errors.length > 0) {
        this.displayErrors(response.errors, selection);
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendToBackground(message: object): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  private displayErrors(errors: GrammarError[], selection: TextSelection): void {
    errors.forEach((error, index) => {
      this.createErrorMarker(error, selection, `error-${index}`);
    });
  }

  private createErrorMarker(error: GrammarError, selection: TextSelection, id: string): void {
    const marker = document.createElement('span');
    marker.className = `grammar-marker grammar-${error.severity}`;
    marker.dataset.errorId = id;
    marker.title = `${error.message}\n\nSuggestions: ${error.suggestions.join(', ')}`;
    
    // Style based on severity
    marker.style.cssText = `
      border-bottom: 2px ${this.getSeverityColor(error.severity)} dashed;
      cursor: pointer;
      position: relative;
    `;

    marker.addEventListener('click', () => this.showSuggestionsPopup(marker, error));

    // Insert marker at error position (simplified - real implementation needs proper text node manipulation)
    this.errorMarkers.set(id, marker);
  }

  private getSeverityColor(severity: 'error' | 'warning' | 'info'): string {
    switch (severity) {
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      case 'info': return '#3498db';
    }
  }

  private showSuggestionsPopup(marker: HTMLElement, error: GrammarError): void {
    const popup = this.createPopup();
    
    popup.innerHTML = `
      <div class="grammar-popup">
        <div class="grammar-message">${error.message}</div>
        <div class="grammar-suggestions">
          ${error.suggestions.map(s => `<button class="suggestion-btn">${s}</button>`).join('')}
        </div>
      </div>
    `;

    const rect = marker.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.classList.add('visible');
  }

  private createPopup(): HTMLElement {
    if (this.popup) {
      return this.popup;
    }

    this.popup = document.createElement('div');
    this.popup.id = 'grammar-checker-popup';
    this.popup.style.cssText = `
      position: absolute;
      z-index: 2147483647;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(this.popup);
    return this.popup;
  }

  private clearMarkers(): void {
    this.errorMarkers.forEach(marker => marker.remove());
    this.errorMarkers.clear();
    if (this.popup) {
      this.popup.classList.remove('visible');
    }
  }

  private setupContextMenu(): void {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'checkPageGrammar') {
        this.checkEntirePage();
      }
    });
  }

  private async checkEntirePage(): Promise<void> {
    const bodyText = document.body.innerText;
    // Similar logic but for entire page content
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new GrammarCheckerContent();
});
```

---

Background Service Worker for API Communication

The service worker handles API communication with grammar checking services and implements caching:

```typescript
// background/grammar-service.ts

interface GrammarCheckRequest {
  action: 'checkGrammar';
  text: string;
  context: string;
  position: number;
}

interface GrammarCheckResponse {
  errors: GrammarError[];
  cached: boolean;
}

class GrammarServiceWorker {
  private cache: Map<string, { data: GrammarError[]; timestamp: number }> = new Map();
  private cacheExpiry = 1000 * 60 * 30; // 30 minutes
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private rateLimitMs = 500; // Rate limit: 2 requests per second

  constructor() {
    this.setupMessageListeners();
    this.cleanCachePeriodically();
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'checkGrammar') {
        this.handleGrammarCheck(message)
          .then(sendResponse)
          .catch(error => sendResponse({ errors: [], error: error.message }));
        return true; // Keep channel open for async response
      }

      if (message.action === 'getStatistics') {
        this.getStatistics().then(sendResponse);
        return true;
      }

      if (message.action === 'updateSettings') {
        this.updateSettings(message.settings).then(sendResponse);
        return true;
      }
    });
  }

  private async handleGrammarCheck(request: GrammarCheckRequest): Promise<GrammarCheckResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request.text);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return { errors: cached.data, cached: true };
    }

    // Get API key from storage
    const { apiKey, language } = await this.getSettings();
    
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Process with rate limiting
    await this.processWithRateLimit(async () => {
      const errors = await this.callGrammarAPI(request.text, request.context, apiKey, language);
      
      // Cache the results
      this.cache.set(cacheKey, { data: errors, timestamp: Date.now() });
      
      // Track statistics
      await this.trackCheck(errors.length);
    });

    const freshData = this.cache.get(cacheKey);
    return { errors: freshData?.data || [], cached: false };
  }

  private generateCacheKey(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `grammar_${hash}`;
  }

  private async callGrammarAPI(
    text: string, 
    context: string, 
    apiKey: string, 
    language: string
  ): Promise<GrammarError[]> {
    // Example API call to a grammar checking service
    // Replace with actual API integration (e.g., LanguageTool, Grammarly API, etc.)
    
    const response = await fetch('https://api.grammarcheck.com/v2/check', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        context
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return this.transformAPIResponse(result);
  }

  private transformAPIResponse(apiResponse: any): GrammarError[] {
    // Transform API response to our internal format
    return apiResponse.matches?.map((match: any) => ({
      type: match.rule?.category?.toLowerCase() || 'grammar',
      message: match.message,
      suggestions: match.replacements?.map((r: any) => r.value) || [],
      position: {
        start: match.offset,
        end: match.offset + match.length
      },
      severity: this.determineSeverity(match)
    })) || [];
  }

  private determineSeverity(match: any): 'error' | 'warning' | 'info' {
    if (match.rule?.issueType === 'typo' || match.rule?.issueType === 'grammar') {
      return 'error';
    }
    if (match.rule?.issueType === 'style') {
      return 'warning';
    }
    return 'info';
  }

  private async processWithRateLimit(fn: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        await fn();
        resolve();
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const fn = this.requestQueue.shift()!;
      await fn();
      await new Promise(resolve => setTimeout(resolve, this.rateLimitMs));
    }

    this.isProcessing = false;
  }

  private async getSettings(): Promise<{ apiKey: string; language: string }> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiKey', 'language'], (result) => {
        resolve({
          apiKey: result.apiKey || '',
          language: result.language || 'en-US'
        });
      });
    });
  }

  private async updateSettings(settings: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, resolve);
    });
  }

  private async trackCheck(errorCount: number): Promise<void> {
    const stats = await this.getStatistics();
    stats.totalChecks++;
    stats.totalErrors += errorCount;
    stats.lastCheck = Date.now();
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ statistics: stats }, resolve);
    });
  }

  private async getStatistics(): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['statistics'], (result) => {
        resolve(result.statistics || {
          totalChecks: 0,
          totalErrors: 0,
          lastCheck: null
        });
      });
    });
  }

  private cleanCachePeriodically(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheExpiry) {
          this.cache.delete(key);
        }
      }
    }, this.cacheExpiry);
  }
}

// Initialize
new GrammarServiceWorker();
```

---

Storage and Settings Management

A solid settings system using Chrome's storage API:

```typescript
// shared/settings.ts

interface ExtensionSettings {
  apiKey: string;
  language: string;
  autoCheck: boolean;
  highlightErrors: boolean;
  showSuggestions: boolean;
  enableCache: boolean;
  darkMode: boolean;
  keyboardShortcut: string;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  language: 'en-US',
  autoCheck: true,
  highlightErrors: true,
  showSuggestions: true,
  enableCache: true,
  darkMode: false,
  keyboardShortcut: 'Ctrl+Shift+G'
};

class SettingsManager {
  private listeners: Set<(settings: ExtensionSettings) => void> = new Set();

  async getSettings(): Promise<ExtensionSettings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
        resolve(result as ExtensionSettings);
      });
    });
  }

  async updateSettings(updates: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(updates, async () => {
        const settings = await this.getSettings();
        this.notifyListeners(settings);
        resolve(settings);
      });
    });
  }

  async resetSettings(): Promise<ExtensionSettings> {
    return this.updateSettings(DEFAULT_SETTINGS);
  }

  addListener(callback: (settings: ExtensionSettings) => void): void {
    this.listeners.add(callback);
    
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        this.getSettings().then(settings => {
          this.listeners.forEach(listener => listener(settings));
        });
      }
    });
  }

  private notifyListeners(settings: ExtensionSettings): void {
    this.listeners.forEach(listener => listener(settings));
  }
}

export { SettingsManager, ExtensionSettings, DEFAULT_SETTINGS };
```

---

Performance Optimization

Debouncing and Throttling

```typescript
// shared/utils.ts

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

Web Worker for Heavy Processing

For complex grammar analysis, offload to a Web Worker:

```typescript
// workers/grammar-worker.ts

self.onmessage = (event) => {
  const { text, rules } = event.data;
  
  const errors = analyzeText(text, rules);
  
  self.postMessage({ errors });
};

function analyzeText(text: string, rules: any[]): any[] {
  const errors: any[] = [];
  
  rules.forEach(rule => {
    const regex = new RegExp(rule.pattern, rule.flags);
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      errors.push({
        type: rule.type,
        message: rule.message,
        position: {
          start: match.index,
          end: match.index + match[0].length
        },
        suggestions: rule.suggestions,
        severity: rule.severity
      });
    }
  });
  
  return errors;
}
```

---

Summary

Building a grammar checker extension requires careful consideration of multiple architectural patterns:

1. Selection Detection: Use debounced event listeners across mouseup, keyup, and selectionchange
2. Error Highlighting: Use DOM manipulation with proper cleanup
3. API Communication: Implement caching, rate limiting, and error handling in the service worker
4. Settings Management: Use Chrome's storage API with reactive updates
5. Performance: Offload heavy processing to Web Workers, use debouncing/throttling

These patterns scale well and provide a solid foundation for a professional-grade grammar checking extension. Remember to handle edge cases like contenteditable elements, text areas, and different document structures for maximum compatibility.

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
