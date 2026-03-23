Building a Web Scraper Chrome Extension

Overview

A web scraper extension allows users to extract data from web pages efficiently. Unlike standalone scrapers, browser extensions benefit from direct page access, authentication state, and user interaction capabilities. This guide covers building a production-ready web scraper extension using Manifest V3.

Architecture and Manifest Setup

The extension architecture consists of several components working together:

- Content Script: Injected into web pages to extract DOM data
- Background Service Worker: Handles data processing, storage, and cross-tab coordination
- Popup UI: Quick-access interface for starting/scraping operations
- Side Panel: Full-featured interface for complex scraping tasks

Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Web Scraper Pro",
  "version": "1.0.0",
  "description": "Extract data from any web page with ease",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs"
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
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

Core Implementation with TypeScript

Type Definitions

```ts
// types.ts
export interface ScrapedElement {
  selector: string;
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  innerHTML: string;
  boundingRect?: DOMRect;
}

export interface ScrapedPage {
  url: string;
  title: string;
  timestamp: number;
  elements: ScrapedElement[];
  metadata: {
    wordCount: number;
    linkCount: number;
    imageCount: number;
  };
}

export interface ScrapingConfig {
  selectors: string[];
  extractMetadata: boolean;
  includeHidden: boolean;
  maxDepth: number;
}

export interface ScrapingResult {
  success: boolean;
  data?: ScrapedPage;
  error?: string;
  duration: number;
}
```

Content Script Implementation

```ts
// content.ts
import type { ScrapedElement, ScrapingConfig, ScrapingResult } from './types';

class PageScraper {
  private config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
  }

  private extractElement(el: Element): ScrapedElement {
    const attrs: Record<string, string> = {};
    for (const attr of el.attributes) {
      attrs[attr.name] = attr.value;
    }

    return {
      selector: this.generateSelector(el),
      tagName: el.tagName.toLowerCase(),
      textContent: this.config.includeHidden 
        ? el.textContent ?? '' 
        : el.textContent?.trim() ?? '',
      attributes: attrs,
      innerHTML: el.innerHTML.substring(0, 10000), // Limit size
      boundingRect: el.getBoundingClientRect().toJSON()
    };
  }

  private generateSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    
    const classes = Array.from(el.classList)
      .filter(c => !c.startsWith('js-'))
      .join('.');
    
    if (classes) {
      return `${el.tagName.toLowerCase()}.${classes}`;
    }
    
    return el.tagName.toLowerCase();
  }

  private extractMetadata(): ScrapedPage['metadata'] {
    return {
      wordCount: document.body.innerText.split(/\s+/).length,
      linkCount: document.querySelectorAll('a[href]').length,
      imageCount: document.querySelectorAll('img').length
    };
  }

  async scrape(): Promise<ScrapingResult> {
    const startTime = performance.now();
    
    try {
      const elements: ScrapedElement[] = [];
      
      for (const selector of this.config.selectors) {
        const matches = document.querySelectorAll(selector);
        matches.forEach(el => {
          elements.push(this.extractElement(el));
        });
      }

      const result: ScrapedPage = {
        url: location.href,
        title: document.title,
        timestamp: Date.now(),
        elements,
        metadata: this.config.extractMetadata 
          ? this.extractMetadata() 
          : { wordCount: 0, linkCount: 0, imageCount: 0 }
      };

      return {
        success: true,
        data: result,
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      };
    }
  }
}

// Listen for scraping requests from background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCRAPE_PAGE') {
    const scraper = new PageScraper(message.config);
    scraper.scrape().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});
```

Background Service Worker

```ts
// background.ts
import type { ScrapedPage, ScrapingConfig } from './types';

interface StoredScrape {
  id: string;
  page: ScrapedPage;
  createdAt: number;
  tags: string[];
  notes: string;
}

const STORAGE_KEY = 'scraped_data';

// Handle scraping requests from popup/side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SCRAPE_CURRENT_TAB':
      handleScrapeCurrentTab(sender.tab?.id, sendResponse);
      return true;
      
    case 'GET_STORED_SCRAPES':
      getStoredScrapes().then(sendResponse);
      return true;
      
    case 'DELETE_SCRAPE':
      deleteScrape(message.id).then(sendResponse);
      return true;
      
    case 'EXPORT_SCRAPES':
      exportScrapes(message.format, sendResponse);
      return true;
  }
});

async function handleScrapeCurrentTab(
  tabId: number | undefined, 
  sendResponse: (response: unknown) => void
): Promise<void> {
  if (!tabId) {
    sendResponse({ success: false, error: 'No active tab' });
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (config: ScrapingConfig) => {
        // This runs in page context
        class PageScraper {
          // ... same implementation as content.ts
          async scrape() { /* ... */ }
        }
        const scraper = new PageScraper(config);
        return scraper.scrape();
      },
      args: [message.config]
    });

    const result = results[0]?.result;
    
    if (result?.success) {
      await storeScrape(result.data);
    }
    
    sendResponse(result);
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Script execution failed' 
    });
  }
}

async function storeScrape(page: ScrapedPage): Promise<void> {
  const storage = await chrome.storage.local.get(STORAGE_KEY);
  const scrapes: StoredScrape[] = storage[STORAGE_KEY] || [];
  
  scrapes.unshift({
    id: crypto.randomUUID(),
    page,
    createdAt: Date.now(),
    tags: [],
    notes: ''
  });
  
  // Keep only last 100 scrapes
  await chrome.storage.local.set({
    [STORAGE_KEY]: scrapes.slice(0, 100)
  });
}

async function getStoredScrapes(): Promise<StoredScrape[]> {
  const storage = await chrome.storage.local.get(STORAGE_KEY);
  return storage[STORAGE_KEY] || [];
}

async function deleteScrape(id: string): Promise<void> {
  const scrapes = await getStoredScrapes();
  const filtered = scrapes.filter(s => s.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

async function exportScrapes(format: 'json' | 'csv', sendResponse: (response: unknown) => void): Promise<void> {
  const scrapes = await getStoredScrapes();
  
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(scrapes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'scrapes.json' });
  } else {
    const csv = convertToCSV(scrapes);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'scrapes.csv' });
  }
  
  sendResponse({ success: true });
}

function convertToCSV(scrapes: StoredScrape[]): string {
  const headers = ['URL', 'Title', 'Timestamp', 'Element Count', 'Word Count'];
  const rows = scrapes.map(s => [
    s.page.url,
    s.page.title,
    new Date(s.page.timestamp).toISOString(),
    s.page.elements.length.toString(),
    s.page.metadata.wordCount.toString()
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
```

UI Design Patterns

Popup Interface

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header>
      <h1>Web Scraper</h1>
    </header>
    
    <section class="config-section">
      <label>
        <input type="checkbox" id="extractMetadata" checked>
        Extract page metadata
      </label>
      
      <label>
        <input type="checkbox" id="includeHidden">
        Include hidden elements
      </label>
      
      <div class="selectors-input">
        <label for="selectors">CSS Selectors (comma separated):</label>
        <textarea id="selectors" rows="3">h1, h2, p, a, img</textarea>
      </div>
    </section>
    
    <section class="actions">
      <button id="scrapeBtn" class="primary-btn">
        Scrape Current Page
      </button>
      <button id="openSidePanel" class="secondary-btn">
        Open Side Panel
      </button>
    </section>
    
    <section id="results" class="results-section hidden">
      <div class="result-summary">
        <span id="elementCount">0</span> elements extracted
      </div>
      <div class="result-time">
        Completed in <span id="duration">0</span>ms
      </div>
    </section>
  </div>
  
  <script type="module" src="popup.js"></script>
</body>
</html>
```

```ts
// popup.ts
document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn') as HTMLButtonElement;
  const openSidePanel = document.getElementById('openSidePanel') as HTMLButtonElement;
  const resultsSection = document.getElementById('results') as HTMLElement;
  
  scrapeBtn.addEventListener('click', async () => {
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = 'Scraping...';
    
    const config: ScrapingConfig = {
      selectors: (document.getElementById('selectors') as HTMLTextAreaElement)
        .value.split(',')
        .map(s => s.trim())
        .filter(Boolean),
      extractMetadata: (document.getElementById('extractMetadata') as HTMLInputElement).checked,
      includeHidden: (document.getElementById('includeHidden') as HTMLInputElement).checked,
      maxDepth: 1
    };
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.runtime.sendMessage({
      type: 'SCRAPE_CURRENT_TAB',
      config,
      tabId: tab.id
    }, (response) => {
      scrapeBtn.disabled = false;
      scrapeBtn.textContent = 'Scrape Current Page';
      
      if (response.success) {
        showResults(response);
      } else {
        showError(response.error);
      }
    });
  });
  
  openSidePanel.addEventListener('click', async () => {
    await chrome.sidePanel.open({ windowId: tab?.windowId });
  });
  
  function showResults(response: { data: ScrapedPage; duration: number }) {
    resultsSection.classList.remove('hidden');
    document.getElementById('elementCount')!.textContent = 
      response.data.elements.length.toString();
    document.getElementById('duration')!.textContent = 
      Math.round(response.duration).toString();
  }
  
  function showError(error: string) {
    alert(`Scraping failed: ${error}`);
  }
});
```

Side Panel Interface

The side panel provides a more comprehensive interface for managing scraped data:

```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="sidepanel">
    <header>
      <h1>Scraped Data</h1>
      <div class="header-actions">
        <button id="exportJson">Export JSON</button>
        <button id="exportCsv">Export CSV</button>
      </div>
    </header>
    
    <div class="scrape-list" id="scrapeList">
      <!-- Dynamically populated -->
    </div>
    
    <div class="scrape-detail" id="scrapeDetail" hidden>
      <button id="backBtn">← Back</button>
      <div class="detail-content"></div>
    </div>
  </div>
  
  <script type="module" src="sidepanel.js"></script>
</body>
</html>
```

Chrome APIs and Permissions

Required Permissions Explained

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab for scraping (granted on user action) |
| `scripting` | Execute content scripts to extract page data |
| `tabs` | Query tab information and manage tab state |
| `storage` | Persist scraped data locally |
| `<all_urls>` | Access content on any website |

Optional Advanced APIs

```ts
// For scheduled scraping
import { alarms } from 'chrome-api';

// For proxy support
import { proxy } from 'chrome-api';

// For downloading exports
import { downloads } from 'chrome-api';
```

State Management and Storage

Using chrome.storage.local

```ts
// storage.ts
export class ScraperStorage {
  private static readonly PREFIX = 'scraper_';
  
  static async saveConfig(key: string, config: ScrapingConfig): Promise<void> {
    await chrome.storage.local.set({
      [`${this.PREFIX}config_${key}`]: config
    });
  }
  
  static async getConfig(key: string): Promise<ScrapingConfig | null> {
    const result = await chrome.storage.local.get(`${this.PREFIX}config_${key}`);
    return result[`${this.PREFIX}config_${key}`] || null;
  }
  
  static async savePreset(name: string, config: ScrapingConfig): Promise<void> {
    const presets = await this.getPresets();
    presets[name] = config;
    await chrome.storage.local.set({
      [`${this.PREFIX}presets`]: presets
    });
  }
  
  static async getPresets(): Promise<Record<string, ScrapingConfig>> {
    const result = await chrome.storage.local.get(`${this.PREFIX}presets`);
    return result[`${this.PREFIX}presets`] || {};
  }
}
```

Error Handling and Edge Cases

Robust Error Handling

```ts
// error-handling.ts
export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}

export function handleScrapingError(error: unknown): ScrapingResult {
  if (error instanceof DOMException) {
    if (error.name === 'SecurityError') {
      return {
        success: false,
        error: 'Cannot access this page due to security restrictions',
        duration: 0
      };
    }
  }
  
  if (error instanceof Error) {
    // Check for common errors
    if (error.message.includes('Extension context invalidated')) {
      return {
        success: false,
        error: 'Extension reloaded. Please try again.',
        duration: 0
      };
    }
  }
  
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error occurred',
    duration: 0
  };
}

// Handle page navigation during scraping
export function createAbortController(): { abort: () => void; signal: AbortSignal } {
  let aborted = false;
  
  return {
    abort: () => { aborted = true; },
    get signal() {
      return {
        get aborted() { return aborted; }
      } as AbortSignal;
    }
  };
}
```

Edge Cases to Handle

1. SPA Navigation: Listen for URL changes in SPAs
2. Iframes: Handle cross-origin iframe restrictions
3. Dynamic Content: Wait for lazy-loaded content
4. Rate Limiting: Implement delays between requests
5. Session Expiry: Handle authentication timeouts

Testing Approach

Unit Testing

```ts
// __tests__/scraper.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PageScraper } from '../content';

describe('PageScraper', () => {
  const mockConfig: ScrapingConfig = {
    selectors: ['h1', 'p'],
    extractMetadata: true,
    includeHidden: false,
    maxDepth: 1
  };
  
  it('should extract heading text', () => {
    document.body.innerHTML = '<h1>Test Title</h1>';
    const scraper = new PageScraper(mockConfig);
    
    return scraper.scrape().then(result => {
      expect(result.success).toBe(true);
      expect(result.data?.elements).toHaveLength(1);
      expect(result.data?.elements[0].textContent).toBe('Test Title');
    });
  });
  
  it('should handle missing selectors gracefully', () => {
    const scraper = new PageScraper({ ...mockConfig, selectors: ['.nonexistent'] });
    
    return scraper.scrape().then(result => {
      expect(result.success).toBe(true);
      expect(result.data?.elements).toHaveLength(0);
    });
  });
});
```

Integration Testing with Playwright

```ts
// __tests__/integration.test.ts
import { test, expect } from '@playwright/test';

test('scraper popup functionality', async ({ page }) => {
  // Load extension
  await page.goto('popup.html');
  
  // Fill in selectors
  await page.fill('#selectors', 'h1, p');
  
  // Click scrape button
  await page.click('#scrapeBtn');
  
  // Verify results appear
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#elementCount')).not.toBeEmpty();
});
```

Performance Considerations

Optimization Tips

1. Limit DOM Access: Cache selector results
2. Use WeakRef: Avoid memory leaks with large page data
3. Chunk Processing: Process large element lists in batches
4. Lazy Loading: Load side panel only when needed
5. Service Worker Optimization: Minimize cold starts

```ts
// performance.ts
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function createWeakCache<K extends object, V>(): 
  (key: K) => V | undefined {
  const cache = new WeakMap<K, V>();
  return (key: K) => cache.get(key);
}
```

Publishing Checklist

Pre-publication Requirements

- [ ] Remove all `console.log` statements
- [ ] Set appropriate `host_permissions` (avoid `<all_urls>` if possible)
- [ ] Add meaningful icons (16, 48, 128px)
- [ ] Write clear privacy policy
- [ ] Test on Chrome, Edge, and Brave
- [ ] VerifyManifest passes all checks

Store Listing

```json
{
  "name": "Web Scraper Pro",
  "description": "Extract data from any web page with customizable selectors",
  "screenshots": [
    { "image": "screenshots/main.png", "label": "Main interface" },
    { "image": "screenshots/sidepanel.png", "label": "Side panel view" }
  ],
  "categories": ["Developer Tools", "Productivity"]
}
```

Version Management

```json
{
  "version": "1.0.0",
  "version_name": "1.0.0 - Initial Release"
}
```

Follow semantic versioning for updates and document breaking changes in CHANGELOG.md.
