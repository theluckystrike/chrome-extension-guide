---
layout: default
title: "Chrome Extension Web Scraping: Data Extraction with Content Scripts"
description: "Build data extraction Chrome extensions using content scripts. Learn DOM scraping, dynamic content handling, pagination, and ethical scraping practices with TypeScript."
permalink: /guides/chrome-extension-web-scraping/
---

# Chrome Extension Web Scraping: Data Extraction with Content Scripts

Web scraping has evolved significantly with the rise of modern web applications. Traditional server-side scrapers often struggle with JavaScript-heavy Single Page Applications (SPAs), complex authentication flows, and dynamic content loading. Chrome extensions provide a powerful alternative that runs directly in the browser, giving you access to fully rendered pages, authenticated sessions, and the ability to interact with dynamic content just like a real user.

This comprehensive guide covers building production-ready data extraction extensions using content scripts, handling dynamic content, managing data flow, and implementing ethical scraping practices.

## Introduction: Chrome Extensions as a Scraping Platform

Chrome extensions occupy a unique position in the web scraping ecosystem. Unlike traditional scrapers that run on servers and make HTTP requests, extension-based scrapers execute within the browser environment. This fundamental difference provides several compelling advantages:

**Browser Context and JavaScript Rendering**: Modern websites rely heavily on JavaScript to render content. Server-side scrapers would need to implement full browser engines (like Puppeteer or Selenium) to handle this, which is resource-intensive. Chrome extensions have direct access to the fully rendered DOM after all JavaScript has executed, making data extraction straightforward and reliable.

**Authenticated Session Access**: Extensions inherit the user's authenticated state from the browser. This means you can scrape content behind login walls without needing to handle authentication tokens, cookies, or session management separately. This is particularly valuable for extracting data from personal accounts, private dashboards, or membership-only content.

**User Interaction Capabilities**: Extensions can simulate user interactions—clicking buttons, scrolling pages, filling forms, and navigating through multi-step processes. This enables scraping of content that loads only after specific user actions, such as infinite-scroll feeds or tab-based interfaces.

**Reduced Detection Footprint**: Because extensions run in a real browser with genuine user behavior patterns, they are significantly harder for websites to detect compared to automated bot traffic. This makes extension-based scraping more reliable for sites implementing anti-bot measures.

### Legal and Ethical Considerations

Before building any scraping extension, it's essential to understand the legal landscape. Web scraping exists in a complex legal gray area that varies by jurisdiction and use case. The following principles should guide your approach:

**Respect Terms of Service**: Most websites explicitly prohibit scraping in their Terms of Service. While the legal enforceability of ToS clauses varies, violating them can result in account termination, IP blocking, or legal action. Always review and consider a website's ToS before scraping.

**Personal vs. Commercial Use**: Extracting data for personal, non-commercial purposes is generally viewed more favorably than commercial data harvesting. If you plan to use scraped data commercially, consult with a legal professional to understand your obligations.

**Privacy and Data Protection**: Scraping personal identifiable information (PII) triggers additional legal requirements under regulations like GDPR (Europe) or CCPA (California). Be especially careful when extracting user-generated content, email addresses, or any data that could identify individuals.

**Rate Limiting and Server Impact**: Even when scraping is technically allowed, overwhelming a server with requests is considered bad practice and can constitute a denial-of-service attack. Always implement appropriate rate limiting to minimize your impact on target servers.

For more information on monetization strategies for scraping extensions, see our [Extension Monetization Guide](./extension-monetization.md).

## Content Scripts for Data Extraction

Content scripts are the foundation of extension-based web scraping. They run in the context of web pages and have direct access to the DOM, making them ideal for extracting data from visible page elements.

### How Content Scripts Inject into Web Pages

Content scripts are declared in the manifest.json file and automatically injected into matching pages. The extension runtime handles injection, so you don't need to manually trigger script execution.

```json
{
  "content_scripts": [
    {
      "matches": ["https://example.com/*", "https://*.example.org/*"],
      "js": ["content-script.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

The `matches` field uses URL patterns to control which pages receive the content script. You can specify exact URLs, wildcards, or use `<all_urls>` for universal injection. The `run_at` property controls when the script executes: `document_start` runs before any content renders, `document_end` runs after the DOM is complete but before subresources load, and `document_idle` runs after the page fully loads (the most common choice for scraping).

### DOM Traversal and Data Extraction

Once injected, content scripts have access to the full DOM through standard JavaScript APIs. The most common approach uses `document.querySelector` and `document.querySelectorAll` to locate elements and extract their content.

```typescript
// content-script.ts

interface ExtractedData {
  title: string;
  price: string;
  description: string;
  imageUrl: string;
}

class DataExtractor {
  /**
   * Extracts text content from an element using a CSS selector
   */
  static getText(selector: string, parent: Element | Document = document): string | null {
    const element = parent.querySelector(selector);
    return element?.textContent?.trim() ?? null;
  }

  /**
   * Extracts an attribute value from an element
   */
  static getAttribute(selector: string, attribute: string, parent: Element | Document = document): string | null {
    const element = parent.querySelector(selector);
    return element?.getAttribute(attribute) ?? null;
  }

  /**
   * Extracts all text content from elements matching a selector
   */
  static getAllText(selector: string, parent: Element | Document = document): string[] {
    const elements = parent.querySelectorAll(selector);
    return Array.from(elements).map(el => el.textContent?.trim() ?? '').filter(Boolean);
  }

  /**
   * Extracts data from multiple elements into an array of objects
   */
  static extractMultiple<T>(selector: string, mapper: (element: Element) => T): T[] {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(mapper);
  }
}

// Example: Extracting product data from a page
function extractProductData(): ExtractedData {
  return {
    title: DataExtractor.getText('.product-title') ?? 'Unknown Product',
    price: DataExtractor.getText('.product-price') ?? '0.00',
    description: DataExtractor.getText('.product-description') ?? '',
    imageUrl: DataExtractor.getAttribute('.product-image', 'src') ?? ''
  };
}
```

### Handling Dynamic and SPA Content

Many modern websites load content dynamically after the initial page load. Content scripts running at `document_idle` might execute before this dynamic content appears. The `MutationObserver` API provides a solution by watching for DOM changes.

```typescript
// dynamic-content-watcher.ts

type MutationCallback = (mutations: MutationRecord[]) => void;

class DynamicContentWatcher {
  private observer: MutationObserver | null = null;
  private observedElements: Set<Element> = new Set();

  /**
   * Starts observing the document for DOM changes
   */
  start(callback: MutationCallback): void {
    if (this.observer) {
      return; // Already observing
    }

    this.observer = new MutationObserver(callback);
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }

  /**
   * Stops observing DOM changes
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.observedElements.clear();
  }

  /**
   * Watches for specific elements to appear in the DOM
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<Element | null> {
    // Check if element already exists
    const existing = document.querySelector(selector);
    if (existing) {
      return existing;
    }

    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout after specified duration
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
}

// Usage example
const watcher = new DynamicContentWatcher();

// Wait for dynamic content to load, then extract
async function scrapeDynamicPage(): Promise<void> {
  const productList = await watcher.waitForElement('.product-list .product-item', 15000);
  
  if (productList) {
    const products = DataExtractor.extractMultiple('.product-item', (el) => ({
      name: DataExtractor.getText('.product-name', el),
      price: DataExtractor.getText('.product-price', el),
      url: DataExtractor.getAttribute('.product-link', 'href', el)
    }));
    
    console.log('Extracted products:', products);
  }
  
  watcher.stop();
}
```

## Extracting Structured Data

Beyond simple text extraction, scraping often requires extracting structured data in consistent formats. This section covers common extraction patterns for tables, product listings, and articles.

### Extracting Tables into JSON

Table extraction is a common requirement, whether you're scraping data tables, comparison charts, or financial reports.

```typescript
// table-extractor.ts

interface TableData {
  headers: string[];
  rows: string[][];
}

class TableExtractor {
  /**
   * Extracts data from an HTML table into a structured format
   */
  static extract(tableSelector: string): TableData | null {
    const table = document.querySelector(tableSelector) as HTMLTableElement;
    if (!table) {
      return null;
    }

    const headers = this.extractHeaders(table);
    const rows = this.extractRows(table);

    return { headers, rows };
  }

  private static extractHeaders(table: HTMLTableElement): string[] {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) {
      return [];
    }

    return Array.from(headerRow.querySelectorAll('th, td')).map(
      cell => cell.textContent?.trim() ?? ''
    );
  }

  private static extractRows(table: HTMLTableElement): string[][] {
    const rows: string[][] = [];
    const tbody = table.querySelector('tbody') || table;
    const trElements = tbody.querySelectorAll('tr');

    trElements.forEach(tr => {
      const row = Array.from(tr.querySelectorAll('td')).map(
        cell => cell.textContent?.trim() ?? ''
      );
      if (row.length > 0) {
        rows.push(row);
      }
    });

    return rows;
  }

  /**
   * Converts table data to JSON format
   */
  static toJson(tableData: TableData): string {
    const { headers, rows } = tableData;
    const data = rows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ?? '';
      });
      return obj;
    });
    return JSON.stringify(data, null, 2);
  }
}

// Usage
const tableData = TableExtractor.extract('#financial-data');
if (tableData) {
  const json = TableExtractor.toJson(tableData);
  console.log(json);
}
```

### Parsing Product Listings

E-commerce scraping requires extracting consistent data from product cards or listings across multiple pages.

```typescript
// product-extractor.ts

interface Product {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  currency: string;
  imageUrl: string;
  productUrl: string;
  rating?: string;
  reviewCount?: number;
  availability: string;
  seller?: string;
}

class ProductExtractor {
  /**
   * Extracts product data from a single product element
   */
  static extractProduct(element: Element): Product {
    const titleEl = element.querySelector('.product-title, .item-title, [data-testid="product-title"]');
    const priceEl = element.querySelector('.price, .product-price, [data-testid="price"]');
    const imageEl = element.querySelector('img.product-image, .product-img img, [data-testid="product-image"]');
    const linkEl = element.querySelector('a.product-link, a.item-link, [data-testid="product-link"]');
    
    const title = titleEl?.textContent?.trim() ?? 'Unknown Product';
    const priceText = priceEl?.textContent?.trim() ?? '0.00';
    const { price, currency, originalPrice } = this.parsePrice(priceText);
    
    return {
      id: this.generateProductId(title, linkEl?.getAttribute('href') ?? ''),
      title,
      price,
      originalPrice,
      currency,
      imageUrl: imageEl?.getAttribute('src') ?? imageEl?.getAttribute('data-src') ?? '',
      productUrl: linkEl?.getAttribute('href') ?? window.location.href,
      rating: element.querySelector('.rating, .stars')?.textContent?.trim(),
      reviewCount: this.parseReviewCount(
        element.querySelector('.review-count, .reviews')?.textContent ?? ''
      ),
      availability: this.parseAvailability(element),
      seller: element.querySelector('.seller, .vendor')?.textContent?.trim()
    };
  }

  /**
   * Extracts all products from a listing page
   */
  static extractAll(containerSelector: string): Product[] {
    const container = document.querySelector(containerSelector);
    if (!container) {
      return [];
    }

    const productElements = container.querySelectorAll('.product-item, .item, [data-testid="product-card"]');
    return Array.from(productElements).map(el => this.extractProduct(el));
  }

  private static parsePrice(priceText: string): { price: string; currency: string; originalPrice?: string } {
    // Handle various price formats: "$99.99", "€99,99", "$99.99 $129.99", etc.
    const match = priceText.match(/[\$€£¥]?\s*(\d+[,.]?\d*)/);
    const price = match ? match[1].replace(',', '.') : '0.00';
    
    let currency = '$';
    if (priceText.includes('€')) currency = '€';
    else if (priceText.includes('£')) currency = '£';
    else if (priceText.includes('¥')) currency = '¥';
    
    // Check for original price (sale items often show both)
    const originalMatch = priceText.match(/\d+[,.]?\d*\s*[\$€£¥].*?(\d+[,.]?\d*)\s*[\$€£¥]/);
    const originalPrice = originalMatch ? originalMatch[1] : undefined;
    
    return { price, currency, originalPrice };
  }

  private static parseReviewCount(text: string): number {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private static parseAvailability(element: Element): string {
    const availEl = element.querySelector('.availability, .stock, [data-testid="availability"]');
    const text = availEl?.textContent?.trim()?.toLowerCase() ?? '';
    
    if (text.includes('out of stock') || text.includes('unavailable')) return 'out_of_stock';
    if (text.includes('low stock')) return 'low_stock';
    return 'in_stock';
  }

  private static generateProductId(title: string, url: string): string {
    const base = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const urlHash = url.split('/').pop()?.slice(0, 10) ?? '';
    return `${base}-${urlHash}`.slice(0, 50);
  }
}
```

### Extracting Article Content

News articles, blog posts, and other content-heavy pages require extracting structured data like title, author, date, and body content.

```typescript
// article-extractor.ts

interface Article {
  title: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  description?: string;
  body: string;
  images: string[];
  tags: string[];
  wordCount: number;
  readingTime: number;
}

class ArticleExtractor {
  /**
   * Extracts article content from news sites, blogs, etc.
   */
  static extract(): Article {
    const title = this.extractTitle();
    const author = this.extractAuthor();
    const publishedDate = this.extractDate('published');
    const modifiedDate = this.extractDate('modified');
    const description = this.extractDescription();
    const body = this.extractBody();
    const images = this.extractImages();
    const tags = this.extractTags();
    
    const wordCount = this.calculateWordCount(body);
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    return {
      title,
      author,
      publishedDate,
      modifiedDate,
      description,
      body,
      images,
      tags,
      wordCount,
      readingTime
    };
  }

  private static extractTitle(): string {
    // Try multiple common title selectors in order of specificity
    const selectors = [
      'article h1',
      '.article-title',
      '.post-title',
      'h1.title',
      '[itemprop="headline"]',
      'h1'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }
    
    return document.title;
  }

  private static extractAuthor(): string | undefined {
    const selectors = [
      '[rel="author"]',
      '.author-name',
      '.byline',
      '[itemprop="author"]',
      '.article-author',
      'meta[name="author"]'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        if (el.tagName === 'META') {
          return el.getAttribute('content') ?? undefined;
        }
        const text = el.textContent?.trim();
        if (text) {
          // Clean up common prefixes
          return text.replace(/^(by|written by|author:)\s*/i, '');
        }
      }
    }
    
    return undefined;
  }

  private static extractDate(type: 'published' | 'modified'): string | undefined {
    const selectors = [
      `[itemprop="${type}Date"]`,
      `.article-date`,
      `.post-date`,
      `time[datetime]`,
      `meta[property="article:${type}_time}"]`
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        if (el.tagName === 'META') {
          return el.getAttribute('content') ?? undefined;
        }
        if (el.hasAttribute('datetime')) {
          return el.getAttribute('datetime') ?? undefined;
        }
        if (el.hasAttribute('content')) {
          return el.getAttribute('content') ?? undefined;
        }
        return el.textContent?.trim();
      }
    }
    
    return undefined;
  }

  private static extractDescription(): string | undefined {
    const selectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      '.article-description',
      '.post-description',
      '. excerpt'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const content = el.getAttribute('content') ?? el.textContent?.trim();
        if (content) return content;
      }
    }
    
    return undefined;
  }

  private static extractBody(): string {
    const selectors = [
      'article',
      '.article-body',
      '.post-content',
      '.entry-content',
      '[itemprop="articleBody"]',
      '.content'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        // Clone and clean the element
        const clone = el.cloneNode(true) as Element;
        
        // Remove unwanted elements
        const unwanted = clone.querySelectorAll('script, style, nav, footer, aside, .ads, .comments, .share-buttons');
        unwanted.forEach(el => el.remove());
        
        return clone.textContent?.trim() ?? '';
      }
    }
    
    // Fallback: get all paragraph text
    const paragraphs = document.querySelectorAll('p');
    return Array.from(paragraphs)
      .map(p => p.textContent?.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  private static extractImages(): string[] {
    const images: string[] = [];
    const imgElements = document.querySelectorAll('article img, .content img, .post-content img');
    
    imgElements.forEach(img => {
      const src = img.getAttribute('src') ?? img.getAttribute('data-src');
      if (src && !src.includes('data:')) {
        images.push(src);
      }
    });
    
    return images;
  }

  private static extractTags(): string[] {
    const selectors = [
      '.tags',
      '.article-tags',
      '[rel="tag"]',
      '.keywords'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const tags = el.querySelectorAll('a, span, meta[content]');
        return Array.from(tags)
          .map(tag => tag.textContent?.trim() ?? tag.getAttribute('content') ?? '')
          .filter(Boolean);
      }
    }
    
    return [];
  }

  private static calculateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}
```

## Message Passing for Data Flow

Content scripts run in an isolated world and cannot directly communicate with background scripts or other extension components. Chrome provides message passing APIs to facilitate communication between these different contexts.

### One-off Messages with sendMessage

For simple, single-request data extraction, `chrome.runtime.sendMessage` provides a straightforward way to send data from content scripts to the background script.

```typescript
// content-script.ts - Sending extracted data

// Extract data from the page
const productData = ProductExtractor.extractAll('.product-list')[0];

// Send to background script
chrome.runtime.sendMessage({
  type: 'PRODUCT_EXTRACTED',
  payload: productData,
  sourceUrl: window.location.href,
  timestamp: Date.now()
}).then(() => {
  console.log('Data sent successfully');
}).catch(error => {
  console.error('Failed to send data:', error);
});
```

### Long-lived Connections with connect

For streaming data or maintaining persistent connections, `chrome.runtime.connect` provides a more efficient approach.

```typescript
// content-script.ts - Streaming data extraction

class ScraperClient {
  private port: chrome.runtime.Port | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  connect(): void {
    this.port = chrome.runtime.connect({ name: 'scraper-stream' });
    
    this.port.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
    
    this.port.onDisconnect.addListener(() => {
      this.handleDisconnect();
    });
  }

  sendData(data: unknown): void {
    if (this.port) {
      this.port.postMessage({
        type: 'SCRAPED_DATA',
        payload: data
      });
    }
  }

  private handleMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'START_SCRAPING':
        this.startScraping();
        break;
      case 'STOP_SCRAPING':
        this.stopScraping();
        break;
      case 'REQUEST_RETRY':
        this.retryLastExtraction();
        break;
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }

  private startScraping(): void {
    // Implement scraping logic
    const data = ProductExtractor.extractAll('.products .product');
    this.sendData(data);
  }

  private stopScraping(): void {
    // Cleanup logic
  }

  private retryLastExtraction(): void {
    // Retry logic
  }

  disconnect(): void {
    this.port?.disconnect();
    this.port = null;
  }
}
```

### Background Script as Data Hub

The background script acts as a central hub for receiving, processing, and storing scraped data.

```typescript
// background-script.ts

interface ScraperMessage {
  type: string;
  payload?: unknown;
  sourceUrl?: string;
  timestamp?: number;
}

class DataAggregationHub {
  private dataStore: Map<string, unknown[]> = new Map();
  private connectedClients: Set<chrome.runtime.Port> = new Set();

  constructor() {
    this.setupMessageListeners();
    this.setupConnectionListeners();
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message: ScraperMessage, sender, sendResponse) => {
      this.handleMessage(message, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private setupConnectionListeners(): void {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'scraper-stream') {
        this.connectedClients.add(port);
        
        port.onMessage.addListener((message: ScraperMessage) => {
          this.handleMessage(message, { tab: { id: port.sender?.tab?.id } } as chrome.runtime.MessageSender);
        });
        
        port.onDisconnect.addListener(() => {
          this.connectedClients.delete(port);
        });
      }
    });
  }

  private async handleMessage(message: ScraperMessage, sender: chrome.runtime.MessageSender): Promise<{ success: boolean }> {
    const { type, payload, sourceUrl, timestamp } = message;

    switch (type) {
      case 'PRODUCT_EXTRACTED':
        return this.handleProductData(payload, sourceUrl, timestamp);
      case 'ARTICLE_EXTRACTED':
        return this.handleArticleData(payload, sourceUrl, timestamp);
      case 'TABLE_EXTRACTED':
        return this.handleTableData(payload, sourceUrl, timestamp);
      case 'GET_STORED_DATA':
        return { success: true, data: this.getStoredData(sourceUrl) };
      case 'CLEAR_DATA':
        return this.clearStoredData(sourceUrl);
      default:
        console.warn('Unknown message type:', type);
        return { success: false, error: 'Unknown message type' };
    }
  }

  private async handleProductData(payload: unknown, sourceUrl?: string, timestamp?: number): Promise<{ success: boolean }> {
    const key = 'products';
    const existing = this.dataStore.get(key) ?? [];
    existing.push({ ...payload as object, sourceUrl, timestamp });
    this.dataStore.set(key, existing);
    
    // Persist to storage
    await chrome.storage.local.set({ [key]: existing });
    
    return { success: true };
  }

  private async handleArticleData(payload: unknown, sourceUrl?: string, timestamp?: number): Promise<{ success: boolean }> {
    const key = 'articles';
    const existing = this.dataStore.get(key) ?? [];
    existing.push({ ...payload as object, sourceUrl, timestamp });
    this.dataStore.set(key, existing);
    
    await chrome.storage.local.set({ [key]: existing });
    
    return { success: true };
  }

  private async handleTableData(payload: unknown, sourceUrl?: string, timestamp?: number): Promise<{ success: boolean }> {
    const key = 'tables';
    const existing = this.dataStore.get(key) ?? [];
    existing.push({ ...payload as object, sourceUrl, timestamp });
    this.dataStore.set(key, existing);
    
    await chrome.storage.local.set({ [key]: existing });
    
    return { success: true };
  }

  private getStoredData(key?: string): unknown[] {
    if (key) {
      return this.dataStore.get(key) ?? [];
    }
    return Object.fromEntries(this.dataStore);
  }

  private async clearStoredData(key?: string): Promise<{ success: boolean }> {
    if (key) {
      this.dataStore.delete(key);
      await chrome.storage.local.remove(key);
    } else {
      this.dataStore.clear();
      await chrome.storage.local.clear();
    }
    return { success: true };
  }

  broadcast(message: object): void {
    this.connectedClients.forEach(port => {
      port.postMessage(message);
    });
  }
}

// Initialize the hub
const hub = new DataAggregationHub();
```

## Data Storage and Export

Once you've extracted data, you need to store it effectively and provide export capabilities. Chrome extensions offer several storage options with different characteristics.

### Using chrome.storage.local

For most scraping extensions, `chrome.storage.local` provides sufficient capacity with automatic persistence across sessions.

```typescript
// data-store.ts

interface StoredItem {
  id: string;
  data: unknown;
  sourceUrl: string;
  timestamp: number;
  tags?: string[];
}

class DataStore {
  private readonly STORAGE_KEY = 'scraped_data';
  private readonly MAX_ITEMS = 1000;

  /**
   * Stores scraped data with metadata
   */
  async save(item: Omit<StoredItem, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId();
    const storedItem: StoredItem = {
      ...item,
      id,
      timestamp: Date.now()
    };

    const items = await this.getAll();
    items.push(storedItem);

    // Implement FIFO if over limit
    if (items.length > this.MAX_ITEMS) {
      items.shift();
    }

    await chrome.storage.local.set({ [this.STORAGE_KEY]: items });
    return id;
  }

  /**
   * Retrieves all stored items
   */
  async getAll(): Promise<StoredItem[]> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] ?? [];
  }

  /**
   * Retrieves items by source URL
   */
  async getBySource(sourceUrl: string): Promise<StoredItem[]> {
    const items = await this.getAll();
    return items.filter(item => item.sourceUrl === sourceUrl);
  }

  /**
   * Searches items by tags
   */
  async searchByTags(tags: string[]): Promise<StoredItem[]> {
    const items = await this.getAll();
    return items.filter(item => 
      item.tags?.some(tag => tags.includes(tag))
    );
  }

  /**
   * Deletes a specific item by ID
   */
  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter(item => item.id !== id);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: filtered });
  }

  /**
   * Clears all stored data
   */
  async clear(): Promise<void> {
    await chrome.storage.local.remove(this.STORAGE_KEY);
  }

  /**
   * Exports data in specified format
   */
  async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    const items = await this.getAll();
    
    if (format === 'json') {
      return JSON.stringify(items, null, 2);
    }

    // CSV export
    if (items.length === 0) return '';
    
    const headers = Object.keys(items[0]);
    const csvRows = [headers.join(',')];
    
    for (const item of items) {
      const values = headers.map(header => {
        const value = item[header as keyof StoredItem];
        const stringValue = JSON.stringify(value);
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Copies data to clipboard
   */
  async copyToClipboard(format: 'json' | 'csv' = 'json'): Promise<boolean> {
    const data = await this.export(format);
    
    try {
      await navigator.clipboard.writeText(data);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### IndexedDB for Large Datasets

For extensions that need to store large amounts of scraped data, IndexedDB provides significantly more storage capacity than chrome.storage. In Manifest V3, you can use IndexedDB through an offscreen document.

```typescript
// indexeddb-store.ts

class IndexedDBStore {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'ScraperDB', storeName: string = 'scraped_data') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('sourceUrl', 'sourceUrl', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async add(item: object): Promise<string> {
    if (!this.db) await this.init();
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullItem = { ...item, id, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(fullItem);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<object[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getBySource(sourceUrl: string): Promise<object[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('sourceUrl');
      const request = index.getAll(sourceUrl);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

## Pagination and Batch Scraping

Extracting data from multiple pages requires handling pagination effectively. This involves detecting pagination controls, following links, implementing rate limiting, and tracking progress.

```typescript
// pagination-handler.ts

interface PaginationConfig {
  delayMs: number;
  maxRetries: number;
  retryDelayMs: number;
  maxPages: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  scrapedUrls: Set<string>;
  failedUrls: string[];
  isComplete: boolean;
}

class PaginationHandler {
  private config: PaginationConfig;
  private state: PaginationState;
  private onPageScraped: (url: string, data: unknown) => Promise<void>;
  private shouldContinue: () => boolean;

  constructor(
    onPageScraped: (url: string, data: unknown) => Promise<void>,
    shouldContinue: () => boolean,
    config: Partial<PaginationConfig> = {}
  ) {
    this.config = {
      delayMs: config.delayMs ?? 2000,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 5000,
      maxPages: config.maxPages ?? 50
    };

    this.onPageScraped = onPageScraped;
    this.shouldContinue = shouldContinue;
    this.state = {
      currentPage: 0,
      totalPages: 0,
      scrapedUrls: new Set(),
      failedUrls: [],
      isComplete: false
    };
  }

  /**
   * Detects pagination controls on the page
   */
  detectPagination(): { nextButton: Element | null; pageNumbers: number[]; hasNext: boolean } {
    // Try common pagination patterns
    const nextButton = document.querySelector(
      '.pagination .next, .pager .next, [rel="next"], a:contains("Next")'
    );

    // Extract page numbers from pagination UI
    const pageLinks = document.querySelectorAll('.pagination a, .pager a, [data-page]');
    const pageNumbers: number[] = [];
    
    pageLinks.forEach(link => {
      const pageNum = parseInt(link.textContent?.trim() ?? '', 10);
      if (!isNaN(pageNum)) {
        pageNumbers.push(pageNum);
      }
    });

    // Check for "Load More" button
    const loadMoreBtn = document.querySelector(
      'button:contains("Load More"), .load-more, [data-action="load-more"]'
    );

    const hasNext = !!(nextButton || loadMoreBtn);

    return { nextButton: nextButton as Element, pageNumbers, hasNext };
  }

  /**
   * Gets the next page URL
   */
  getNextPageUrl(): string | null {
    const { nextButton } = this.detectPagination();
    
    if (nextButton) {
      // Click-based pagination
      return (nextButton as HTMLAnchorElement).href;
    }

    // Check URL-based pagination (page=1, page=2, etc.)
    const url = new URL(window.location.href);
    const currentPage = parseInt(url.searchParams.get('page') ?? '1', 10);
    
    if (currentPage < this.config.maxPages) {
      url.searchParams.set('page', String(currentPage + 1));
      return url.toString();
    }

    return null;
  }

  /**
   * Scrapes current page and advances to next
   */
  async scrapeCurrentPage(extractFn: () => unknown): Promise<void> {
    const url = window.location.href;
    
    if (this.state.scrapedUrls.has(url)) {
      console.log('Page already scraped:', url);
      return;
    }

    let retries = 0;
    let lastError: Error | null = null;

    while (retries < this.config.maxRetries) {
      try {
        const data = extractFn();
        
        if (data) {
          await this.onPageScraped(url, data);
          this.state.scrapedUrls.add(url);
          this.state.currentPage++;
          console.log(`Successfully scraped page ${this.state.currentPage}: ${url}`);
          return;
        }
        
        lastError = new Error('No data extracted');
      } catch (error) {
        lastError = error as Error;
        console.error(`Error scraping ${url} (attempt ${retries + 1}):`, error);
      }

      retries++;
      
      if (retries < this.config.maxRetries) {
        await this.delay(this.config.retryDelayMs);
      }
    }

    this.state.failedUrls.push(url);
    console.error(`Failed to scrape after ${this.config.maxRetries} attempts:`, lastError);
  }

  /**
   * Navigates to next page using click
   */
  async clickNext(): Promise<boolean> {
    const { nextButton } = this.detectPagination();
    
    if (!nextButton) {
      this.state.isComplete = true;
      return false;
    }

    // Click the next button
    (nextButton as HTMLElement).click();
    
    // Wait for page to load
    await this.delay(this.config.delayMs);
    
    return true;
  }

  /**
   * Main scraping loop
   */
  async start(extractFn: () => unknown): Promise<PaginationState> {
    while (this.shouldContinue() && !this.state.isComplete) {
      await this.scrapeCurrentPage(extractFn);
      
      // Check if we should continue
      if (!this.shouldContinue() || this.state.currentPage >= this.config.maxPages) {
        break;
      }

      // Navigate to next page
      const hasNext = await this.clickNext();
      
      if (!hasNext) {
        break;
      }

      // Rate limiting delay between pages
      await this.delay(this.config.delayMs);
    }

    return this.state;
  }

  /**
   * Gets current progress
   */
  getProgress(): { current: number; total: number; percentage: number } {
    const percentage = this.state.totalPages > 0
      ? Math.round((this.state.currentPage / this.state.totalPages) * 100)
      : 0;
    
    return {
      current: this.state.currentPage,
      total: this.state.totalPages,
      percentage
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const handler = new PaginationHandler(
  async (url, data) => {
    const store = new DataStore();
    await store.save({ data, sourceUrl: url });
  },
  () => !isScrapingComplete // External flag
);

const paginationState = await handler.start(() => {
  return ProductExtractor.extractAll('.product-grid .product');
});
```

## Ethical Scraping Guidelines

Building a responsible scraping extension requires understanding and implementing ethical practices. These guidelines help ensure your extension respects website owners, users, and legal requirements.

### Respect Robots.txt and Terms of Service

Before scraping any website, check its robots.txt file to understand what the site owner has designated as allowed or disallowed. While robots.txt is not legally binding in all jurisdictions, it represents the site owner's explicit preferences.

```typescript
// robots-check.ts

interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

class RobotsChecker {
  private rules: Map<string, RobotsRule> = new Map();
  private userAgent = 'MyExtensionBot/1.0';

  /**
   * Fetches and parses robots.txt
   */
  async fetchRules(baseUrl: string): Promise<void> {
    const url = new URL('/robots.txt', baseUrl);
    
    try {
      const response = await fetch(url.toString());
      const text = await response.text();
      this.parseRobotsTxt(text);
    } catch (error) {
      console.warn('Could not fetch robots.txt:', error);
      // Default to allowing all if robots.txt not available
      this.rules.set('*', { userAgent: '*', allow: ['/'], disallow: [] });
    }
  }

  /**
   * Checks if a URL is allowed for scraping
   */
  isAllowed(url: string): boolean {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    
    // Check rules for our user agent first, then fall back to '*'
    let rule = this.rules.get(this.userAgent) ?? this.rules.get('*');
    
    if (!rule) {
      return true; // No rules = allowed
    }

    // Check disallow rules first
    for (const disallow of rule.disallow) {
      if (this.matchPath(path, disallow)) {
        // Check if there's a corresponding allow rule
        const isAllowed = rule.allow.some(allow => 
          this.matchPath(path, allow) && allow.length > disallow.length
        );
        if (!isAllowed) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Gets recommended crawl delay from robots.txt
   */
  getCrawlDelay(): number | null {
    const rule = this.rules.get(this.userAgent) ?? this.rules.get('*');
    return rule?.crawlDelay ?? null;
  }

  private parseRobotsTxt(text: string): void {
    const lines = text.split('\n');
    let currentUserAgent = '*';
    
    this.rules.set('*', { userAgent: '*', allow: [], disallow: [] });

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [directive, value] = trimmed.split(':').map(s => s.trim());
      
      if (directive.toLowerCase() === 'user-agent') {
        currentUserAgent = value;
        if (!this.rules.has(currentUserAgent)) {
          this.rules.set(currentUserAgent, { 
            userAgent: currentUserAgent, 
            allow: [], 
            disallow: [] 
          });
        }
      } else if (directive.toLowerCase() === 'disallow') {
        this.rules.get(currentUserAgent)?.disallow.push(value);
      } else if (directive.toLowerCase() === 'allow') {
        this.rules.get(currentUserAgent)?.allow.push(value);
      } else if (directive.toLowerCase() === 'crawl-delay') {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          this.rules.get(currentUserAgent)!.crawlDelay = delay;
        }
      }
    }
  }

  private matchPath(path: string, pattern: string): boolean {
    // Simple pattern matching - supports * and $
    if (pattern === '*') return true;
    if (pattern === '/') return true;
    
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?') + '$'
    );
    return regex.test(path);
  }
}
```

### Rate Limiting Best Practices

Always implement rate limiting to avoid overwhelming target servers. A good rule of thumb is to delay at least 1-2 seconds between requests, and significantly more for smaller sites or APIs without rate limiting protections.

### Personal vs. Commercial Use Considerations

The legal distinction between personal and commercial scraping is significant. Personal, non-commercial data extraction for research, archiving, or private use generally carries lower legal risk. Commercial use, however, often requires explicit permission or licenses from data owners.

### GDPR and Privacy Compliance

When dealing with personal data, you must comply with data protection regulations:

- **Data Minimization**: Only collect data you actually need
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Don't retain data indefinitely
- **Security**: Protect stored data with encryption

### When NOT to Scrap

Avoid scraping in these situations:

- Behind others' authentication walls without permission
- Personal identifiable information (PII) without consent
- Content explicitly protected by paywalls (unless you have legitimate access)
- Medical or financial data requiring special protections
- Any content where the website explicitly prohibits automated access

## Anti-Detection Considerations

While Chrome extensions are naturally harder to detect than server-side bots, certain patterns can still trigger anti-bot systems.

### Natural Behavior Patterns

Automated scrapers often exhibit mechanical behavior that distinguishes them from human users:

- **Timing Patterns**: Human users have variable timing between actions; bots are too consistent
- **Mouse Movement**: Humans don't move in straight lines; implement realistic mouse curves
- **Scroll Behavior**: Humans scroll at varying speeds and stop to read content
- **Click Patterns**: Humans occasionally misclick andCorrect their actions

```typescript
// human-behavior.ts

class HumanBehaviorSimulator {
  /**
   * Adds random delay to simulate human thinking
   */
  static async randomDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulates human scroll behavior with pauses
   */
  static async humanScroll(scrollAmount: number = 300): Promise<void> {
    const currentScroll = window.scrollY;
    const targetScroll = currentScroll + scrollAmount;
    
    // Scroll in small increments with varying delays
    const steps = Math.floor(scrollAmount / 50);
    for (let i = 0; i < steps; i++) {
      const stepSize = 50 + Math.random() * 30;
      window.scrollBy(0, stepSize);
      await this.randomDelay(100, 300);
    }
  }

  /**
   * Simulates human-like mouse movement (simplified)
   */
  static async simulateMouseMove(targetElement: Element): Promise<void> {
    const rect = targetElement.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    // Generate path with some randomness
    const points = this.generateCurvedPath(
      window.innerWidth / 2,
      window.innerHeight / 2,
      targetX,
      targetY
    );
    
    // Move through points with variable timing
    for (const point of points) {
      // Use JavaScript to trigger mousemove (requires content script context)
      const event = new MouseEvent('mousemove', {
        clientX: point.x,
        clientY: point.y,
        bubbles: true
      });
      document.dispatchEvent(event);
      await this.randomDelay(20, 50);
    }
  }

  private static generateCurvedPath(
    x1: number, y1: number, x2: number, y2: number, points: number = 10
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const x = x1 + (x2 - x1) * t;
      // Add some curve with sine wave
      const curve = Math.sin(t * Math.PI) * 50 * (Math.random() > 0.5 ? 1 : -1);
      const y = y1 + (y2 - y1) * t + curve;
      
      path.push({ x, y });
    }
    
    return path;
  }
}
```

### Avoiding Detection Patterns

Certain technical patterns can trigger detection systems:

- **Excessive DOM Queries**: Don't query the same element repeatedly; cache selections
- **Unnatural Request Timing**: Always add random delays between actions
- **Missing Referrer Headers**: When navigating, maintain realistic referrer chains
- **Inconsistent User Agents**: Stick to consistent, realistic browser user agents

### Handling CAPTCHAs Gracefully

If you encounter CAPTCHAs, **never attempt to bypass them**. This is both unethical and often illegal. Instead:

- Notify the user that a CAPTCHA was encountered
- Offer to pause or stop the scraping operation
- Suggest manual intervention if appropriate
- Consider reducing request frequency to avoid triggering CAPTCHAs

## Complete Example: Price Comparison Extension

This complete example demonstrates a production-ready price comparison extension that scrapes product data from multiple e-commerce sites and provides price tracking through a popup interface.

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "PriceSpy - Price Comparison Tool",
  "version": "1.0.0",
  "description": "Compare prices across Amazon, eBay, and other major retailers",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://www.amazon.com/*",
    "https://www.ebay.com/*",
    "https://*.amazon.com/*",
    "https://*.ebay.com/*"
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
      "matches": [
        "https://www.amazon.com/*",
        "https://www.ebay.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### Content Script (content.ts)

```typescript
// content.ts - Extracts product info from e-commerce pages

interface ProductData {
  id: string;
  title: string;
  price: number;
  currency: string;
  originalPrice?: number;
  imageUrl: string;
  productUrl: string;
  source: string;
  timestamp: number;
  inStock: boolean;
}

class PriceScraperContent {
  private source: string;

  constructor() {
    this.source = this.detectSource();
  }

  private detectSource(): string {
    const hostname = window.location.hostname;
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('ebay')) return 'ebay';
    return 'unknown';
  }

  extract(): ProductData | null {
    switch (this.source) {
      case 'amazon':
        return this.extractAmazon();
      case 'ebay':
        return this.extractEbay();
      default:
        return null;
    }
  }

  private extractAmazon(): ProductData | null {
    const titleEl = document.querySelector('#productTitle');
    const priceEl = document.querySelector('.a-price .a-offscreen') || 
                     document.querySelector('#priceblock_ourprice') ||
                     document.querySelector('#priceblock_dealprice');
    const imageEl = document.querySelector('#landingImage') || 
                    document.querySelector('#imgBlkFront');
    const originalPriceEl = document.querySelector('.a-text-price .a-offscreen');
    const availabilityEl = document.querySelector('#availability');

    if (!titleEl || !priceEl) {
      return null;
    }

    const title = titleEl.textContent?.trim() ?? '';
    const priceText = priceEl.textContent?.trim() ?? '$0';
    const price = this.parsePrice(priceText);
    const originalPrice = originalPriceEl ? this.parsePrice(originalPriceEl.textContent ?? '') : undefined;

    return {
      id: this.generateId('amazon', title),
      title,
      price,
      currency: 'USD',
      originalPrice,
      imageUrl: (imageEl as HTMLImageElement)?.src ?? '',
      productUrl: window.location.href,
      source: 'amazon',
      timestamp: Date.now(),
      inStock: !availabilityEl?.textContent?.toLowerCase().includes('out of stock')
    };
  }

  private extractEbay(): ProductData | null {
    const titleEl = document.querySelector('.x-item-title__mainTitle') ||
                    document.querySelector('h1.it-ttl');
    const priceEl = document.querySelector('.x-price-primary span') ||
                    document.querySelector('#prcIsum');
    const imageEl = document.querySelector('.ux-image-carousel-item img') ||
                    document.querySelector('#icImg');
    const availabilityEl = document.querySelector('.x-quantity__availability');

    if (!titleEl || !priceEl) {
      return null;
    }

    const title = titleEl.textContent?.trim() ?? '';
    const priceText = priceEl.textContent?.trim() ?? '$0';
    const price = this.parsePrice(priceText);

    return {
      id: this.generateId('ebay', title),
      title,
      price,
      currency: 'USD',
      imageUrl: (imageEl as HTMLImageElement)?.src ?? '',
      productUrl: window.location.href,
      source: 'ebay',
      timestamp: Date.now(),
      inStock: !availabilityEl?.textContent?.toLowerCase().includes('out of stock')
    };
  }

  private parsePrice(text: string): number {
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }

  private generateId(source: string, title: string): string {
    const hash = title.toLowerCase().slice(0, 20).replace(/\s+/g, '-');
    return `${source}-${hash}`;
  }

  async init(): Promise<void> {
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const product = this.extract();
    
    if (product) {
      chrome.runtime.sendMessage({
        type: 'PRODUCT_FOUND',
        payload: product
      });
    }
  }
}

// Initialize on page load
const scraper = new PriceScraperContent();
scraper.init();
```

### Background Script (background.ts)

```typescript
// background.ts - Handles data storage and price comparison logic

interface PriceHistory {
  productId: string;
  prices: Array<{ price: number; date: number; source: string }>;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
}

class PriceComparisonBackend {
  private readonly STORAGE_KEY = 'price_history';

  async handleProductFound(product: ProductData): Promise<void> {
    const history = await this.getPriceHistory(product.id);
    
    history.prices.push({
      price: product.price,
      date: product.timestamp,
      source: product.source
    });

    // Calculate statistics
    const prices = history.prices.map(p => p.price);
    history.lowestPrice = Math.min(...prices);
    history.highestPrice = Math.max(...prices);
    history.averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    await this.savePriceHistory(product.id, history);
    
    // Notify popup if open
    this.notifyPopup(product.id);
  }

  async getPriceHistory(productId: string): Promise<PriceHistory> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    const allHistory = result[this.STORAGE_KEY] ?? {};
    
    return allHistory[productId] ?? {
      productId,
      prices: [],
      lowestPrice: 0,
      highestPrice: 0,
      averagePrice: 0
    };
  }

  async savePriceHistory(productId: string, history: PriceHistory): Promise<void> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    const allHistory = result[this.STORAGE_KEY] ?? {};
    allHistory[productId] = history;
    
    await chrome.storage.local.set({ [this.STORAGE_KEY]: allHistory });
  }

  async getAllTrackedProducts(): Promise<PriceHistory[]> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    const allHistory = result[this.STORAGE_KEY] ?? {};
    return Object.values(allHistory);
  }

  async comparePrice(productId: string, targetPrice: number): Promise<{
    isLower: boolean;
    savings: number;
    percentageOff: number;
  }> {
    const history = await this.getPriceHistory(productId);
    
    if (history.prices.length === 0) {
      return { isLower: false, savings: 0, percentageOff: 0 };
    }

    const isLower = targetPrice < history.averagePrice;
    const savings = history.averagePrice - targetPrice;
    const percentageOff = (savings / history.averagePrice) * 100;

    return { isLower, savings, percentageOff };
  }

  private async notifyPopup(productId: string): Promise<void> {
    // This would communicate with the popup if open
  }
}

// Message handler setup
const backend = new PriceComparisonBackend();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'PRODUCT_FOUND':
        await backend.handleProductFound(message.payload);
        sendResponse({ success: true });
        break;
      case 'GET_PRICE_HISTORY':
        const history = await backend.getPriceHistory(message.productId);
        sendResponse(history);
        break;
      case 'GET_ALL_PRODUCTS':
        const products = await backend.getAllTrackedProducts();
        sendResponse(products);
        break;
      case 'COMPARE_PRICE':
        const comparison = await backend.comparePrice(
          message.productId,
          message.targetPrice
        );
        sendResponse(comparison);
        break;
    }
  })();
  
  return true; // Keep message channel open for async response
});
```

### Popup Script (popup.ts)

```typescript
// popup.ts - User interface for viewing prices

interface TrackedProduct {
  productId: string;
  title: string;
  currentPrice: number;
  lowestPrice: number;
  averagePrice: number;
  priceChange: number;
}

class PricePopup {
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('products-container')!;
    this.init();
  }

  async init(): Promise<void> {
    const products = await this.getTrackedProducts();
    this.render(products);
  }

  private async getTrackedProducts(): Promise<TrackedProduct[]> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_ALL_PRODUCTS' },
        (histories: PriceHistory[]) => {
          const products: TrackedProduct[] = histories.map(history => {
            const latestPrice = history.prices[history.prices.length - 1];
            const priceChange = latestPrice.price - history.lowestPrice;
            
            return {
              productId: history.productId,
              title: history.productId,
              currentPrice: latestPrice.price,
              lowestPrice: history.lowestPrice,
              averagePrice: history.averagePrice,
              priceChange
            };
          });
          resolve(products);
        }
      );
    });
  }

  private render(products: TrackedProduct[]): void {
    if (products.length === 0) {
      this.container.innerHTML = '<p class="empty">No products tracked yet. Visit Amazon or eBay to start tracking prices.</p>';
      return;
    }

    this.container.innerHTML = products.map(product => `
      <div class="product-card">
        <h3 class="product-title">${product.title}</h3>
        <div class="price-info">
          <p class="current-price">$${product.currentPrice.toFixed(2)}</p>
          <p class="price-stats">
            Low: $${product.lowestPrice.toFixed(2)} | 
            Avg: $${product.averagePrice.toFixed(2)}
          </p>
          <p class="price-change ${product.priceChange < 0 ? 'positive' : 'negative'}">
            ${product.priceChange < 0 ? '↓' : '↑'} 
            $${Math.abs(product.priceChange).toFixed(2)}
          </p>
        </div>
      </div>
    `).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PricePopup();
});
```

This completes our comprehensive guide to building Chrome extension web scrapers. You've learned how to extract data using content scripts, handle dynamic content, manage data flow between components, store and export data, handle pagination ethically, and avoid detection. The price comparison example demonstrates how all these pieces work together in a real-world application.

For information on monetizing your scraping extensions, see our [Extension Monetization Guide](./extension-monetization.md).

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
