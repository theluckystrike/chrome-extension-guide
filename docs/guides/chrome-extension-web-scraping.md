---
layout: default
title: "Chrome Extension Web Scraping: Data Extraction with Content Scripts"
description: "Build data extraction Chrome extensions using content scripts. Learn DOM scraping, dynamic content handling, pagination, and ethical scraping practices with TypeScript."
permalink: /guides/chrome-extension-web-scraping/
---

Chrome Extension Web Scraping: Data Extraction with Content Scripts

Web scraping has evolved significantly beyond simple HTTP requests and server-side parsers. Chrome extensions provide a uniquely powerful platform for data extraction, combining the ability to execute JavaScript, render dynamic content, and access authenticated sessions, all within a real browser environment. This comprehensive guide walks you through building solid web scraping extensions using content scripts, handling dynamic content, managing data flow, and following ethical scraping practices.

Introduction: Chrome Extensions as a Scraping Platform

Traditional web scraping faces fundamental limitations when dealing with modern web applications. Server-side scrapers cannot execute JavaScript, making them useless for Single Page Applications (SPAs) that load content dynamically. They cannot maintain sessions, bypass CAPTCHAs, or interact with authentication flows. They struggle with anti-bot measures that analyze browser fingerprints or behavior patterns.

Chrome extensions solve these problems by running directly in the user's browser. Content scripts inject into web pages with full access to the DOM, JavaScript execution context, and browser storage. This approach offers several compelling advantages over traditional scraping methods.

First, extensions run in a real browser with genuine browser fingerprints, making detection significantly harder than headless browsers or server-side scrapers. Second, they natively handle JavaScript-rendered content, no need for Selenium, Puppeteer, or complex rendering solutions. Third, they have access to authenticated sessions, cookies, and local storage, enabling extraction from authenticated pages without re-implementing login flows. Fourth, they can intercept network requests at the browser level, capturing API responses that might not be visible in the rendered DOM.

Before diving into implementation, it's essential to understand the legal and ethical landscape. Web scraping exists in a complex legal environment governed by computer fraud laws, terms of service agreements, and privacy regulations. The Computer Fraud and Abuse Act (CFAA) in the United States, GDPR in Europe, and similar regulations worldwide can impose liability for unauthorized access to computer systems. Always review a website's Terms of Service and robots.txt before scraping, and consult legal counsel for commercial projects. This guide covers technical implementation while emphasizing ethical practices that keep you in good standing with websites and regulators.

Content Scripts for Data Extraction

Content scripts are the foundation of extension-based web scraping. They operate within the context of web pages, giving you direct access to the DOM and page JavaScript. Understanding how to properly configure and write content scripts is essential for building effective scraping extensions.

Manifest Configuration

Content scripts are declared in `manifest.json` with match patterns that determine which pages they inject into. Here's a comprehensive configuration example:

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*", "https://example.org/*"],
      "js": ["dist/content-script.js"],
      "css": ["styles/injected.css"],
      "run_at": "document_idle",
      "match_about_blank": false,
      "include_globs": [],
      "exclude_globs": []
    }
  ]
}
```

The `matches` field uses URL patterns similar to Chrome's match patterns. Use `*` wildcards for subdomains and paths. The `run_at` property controls when your script executes: `document_start` runs before any content renders, `document_end` runs after the DOM is complete but before subresources, and `document_idle` runs after the page fully loads. For scraping, `document_idle` is typically most appropriate, though you'll often need additional logic to wait for dynamic content.

Data Extraction Base Class

A well-designed extraction system starts with a reusable base class that handles common DOM traversal and data extraction patterns:

```typescript
// src/content-script/extractors/DataExtractor.ts

export interface ExtractionOptions {
  root?: Element | Document;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export abstract class DataExtractor<T> {
  protected root: Element | Document;
  protected options: Required<ExtractionOptions>;

  constructor(options: ExtractionOptions = {}) {
    this.root = options.root || document;
    this.options = {
      root: this.root,
      timeout: options.timeout || 5000,
      retryCount: options.retryCount || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
  }

  protected querySelector(selector: string): Element | null {
    return this.root.querySelector(selector);
  }

  protected querySelectorAll(selector: string): Element[] {
    return Array.from(this.root.querySelectorAll(selector));
  }

  protected getText(selector: string, defaultValue: string = ''): string {
    const element = this.querySelector(selector);
    return element?.textContent?.trim() || defaultValue;
  }

  protected getAttribute(selector: string, attribute: string, defaultValue: string = ''): string {
    const element = this.querySelector(selector);
    return element?.getAttribute(attribute) || defaultValue;
  }

  protected getNumber(selector: string, defaultValue: number = 0): number {
    const text = this.getText(selector);
    const cleaned = text.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  protected getHref(selector: string): string {
    return this.getAttribute(selector, 'href');
  }

  protected getSrc(selector: string): string {
    return this.getAttribute(selector, 'src');
  }

  abstract extract(): T | Promise<T>;
}
```

This base class provides utility methods for common extraction tasks while requiring subclasses to implement the specific `extract()` method. The `querySelector` and `querySelectorAll` methods use the DOM API for element selection, while helper methods like `getText`, `getNumber`, and `getAttribute` handle common data extraction patterns with sensible defaults.

Handling Dynamic Content with MutationObserver

Modern SPAs load content dynamically, meaning the page DOM changes after initial load. Simply waiting for `document_idle` isn't sufficient. The `MutationObserver` API allows you to watch for DOM changes and trigger extraction when relevant content appears:

```typescript
// src/content-script/utils/DOMWatcher.ts

export type MutationCallback = (mutations: MutationRecord[]) => void;

export class DOMWatcher {
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;

  constructor(
    private target: Node = document.body,
    private callback: MutationCallback,
    private options: MutationObserverInit = {
      childList: true,
      subtree: true,
      attributes: false
    },
    private debounceMs: number = 300
  ) {}

  start(): void {
    if (this.observer) return;
    
    this.observer = new MutationObserver((mutations) => {
      if (this.debounceMs > 0) {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
          this.callback(mutations);
        }, this.debounceMs);
      } else {
        this.callback(mutations);
      }
    });

    this.observer.observe(this.target, this.options);
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  disconnect(): void {
    this.stop();
  }
}
```

This utility class wraps the MutationObserver API with convenient features like debouncing to prevent excessive callback invocations during rapid DOM changes.

Extracting Structured Data

Different types of content require different extraction strategies. This section covers practical patterns for extracting tables, product listings, and article content, three common scraping use cases.

Table Extraction

Tables are one of the most structured data formats on the web. Converting HTML tables to JSON is straightforward with proper selectors:

```typescript
// src/content-script/extractors/TableExtractor.ts

import { DataExtractor, ExtractionOptions } from './DataExtractor';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export class TableExtractor extends DataExtractor<TableData> {
  private tableSelector: string;
  private headerSelector: string;
  private rowSelector: string;
  private cellSelector: string;

  constructor(
    tableSelector: string = 'table',
    options: ExtractionOptions = {}
  ) {
    super(options);
    this.tableSelector = tableSelector;
    this.headerSelector = 'thead th, thead td';
    this.rowSelector = 'tbody tr, tr';
    this.cellSelector = 'td, th';
  }

  extract(): TableData {
    const table = this.querySelector(this.tableSelector);
    if (!table) {
      return { headers: [], rows: [] };
    }

    const headers = this.extractHeaders(table);
    const rows = this.extractRows(table);

    return { headers, rows };
  }

  private extractHeaders(table: Element): string[] {
    const headerElements = table.querySelectorAll(this.headerSelector);
    return Array.from(headerElements).map(
      th => th.textContent?.trim() || ''
    );
  }

  private extractRows(table: Element): string[][] {
    const rowElements = table.querySelectorAll(this.rowSelector);
    return Array.from(rowElements).map(row => {
      const cells = row.querySelectorAll(this.cellSelector);
      return Array.from(cells).map(
        cell => cell.textContent?.trim() || ''
      );
    });
  }

  toJSON(): string {
    const { headers, rows } = this.extract();
    const objects = rows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    return JSON.stringify(objects, null, 2);
  }
}
```

Product Listing Extraction

E-commerce product listings typically contain price, title, image, URL, and sometimes ratings or availability. Here's a solid extractor for product data:

```typescript
// src/content-script/extractors/ProductExtractor.ts

import { DataExtractor, ExtractionOptions } from './DataExtractor';

export interface Product {
  title: string;
  price: string;
  originalPrice?: string;
  currency: string;
  imageUrl: string;
  productUrl: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  seller?: string;
}

export class ProductExtractor extends DataExtractor<Product[]> {
  private containerSelector: string;
  private productSelector: string;
  
  // Configurable selectors (customize per site)
  private selectors = {
    title: '[data-product-title], .product-title, h3 a, [itemprop="name"]',
    price: '[data-product-price], .price, [itemprop="price"]',
    originalPrice: '.original-price, .was-price',
    image: '[data-product-image], .product-image img, [itemprop="image"]',
    link: 'a[href]',
    rating: '[itemprop="ratingValue"], .rating .value',
    reviewCount: '[itemprop="reviewCount"], .rating count',
    availability: '[itemprop="availability"], .stock, .availability',
    seller: '[itemprop="seller"], .seller'
  };

  constructor(
    containerSelector: string = '.product-list, .products',
    productSelector: string = '.product, [data-product]',
    options: ExtractionOptions = {}
  ) {
    super({ ...options, root: document.body });
    this.containerSelector = containerSelector;
    this.productSelector = productSelector;
  }

  extract(): Product[] {
    const container = this.querySelector(this.containerSelector);
    if (!container) {
      console.warn('Product container not found');
      return [];
    }

    const productElements = container.querySelectorAll(this.productSelector);
    return Array.from(productElements).map(element => this.extractProduct(element));
  }

  private extractProduct(element: Element): Product {
    const title = this.getText(element, this.selectors.title);
    const price = this.getText(element, this.selectors.price);
    const currency = this.extractCurrency(price);
    const imageUrl = this.getSrc(element, this.selectors.image);
    const productUrl = this.getAttribute(element, this.selectors.link, 'href');
    const rating = this.getRating(element);
    const reviewCount = this.getReviewCount(element);
    const inStock = this.getAvailability(element);
    const originalPrice = this.getText(element, this.selectors.originalPrice);

    return {
      title,
      price: this.normalizePrice(price),
      currency,
      originalPrice: originalPrice ? this.normalizePrice(originalPrice) : undefined,
      imageUrl: this.resolveUrl(imageUrl),
      productUrl: this.resolveUrl(productUrl),
      rating,
      reviewCount,
      inStock,
      seller: this.getText(element, this.selectors.seller)
    };
  }

  private extractCurrency(priceText: string): string {
    const match = priceText.match(/[$£€¥₹]/);
    return match ? match[0] : '$';
  }

  private normalizePrice(priceText: string): string {
    return priceText.replace(/[^0-9.,]/g, '').trim();
  }

  private getRating(element: Element): number | undefined {
    const ratingText = this.getText(element, this.selectors.rating);
    const rating = parseFloat(ratingText);
    return isNaN(rating) ? undefined : Math.min(5, Math.max(0, rating));
  }

  private getReviewCount(element: Element): number | undefined {
    const countText = this.getText(element, this.selectors.reviewCount);
    const match = countText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private getAvailability(element: Element): boolean | undefined {
    const availText = this.getText(element, this.selectors.availability).toLowerCase();
    if (availText.includes('out of stock') || availText.includes('unavailable')) {
      return false;
    }
    if (availText.includes('in stock') || availText.includes('available')) {
      return true;
    }
    return undefined;
  }

  private resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return new URL(url, window.location.origin).href;
  }

  private getText(element: Element, selector: string): string {
    const target = element.querySelector(selector);
    return target?.textContent?.trim() || '';
  }

  private getSrc(element: Element, selector: string): string {
    const target = element.querySelector(selector);
    return target?.getAttribute('src') || target?.getAttribute('data-src') || '';
  }
}
```

Article Content Extraction

Extracting article content requires identifying the main content area and extracting structured fields like title, author, date, and body:

```typescript
// src/content-script/extractors/ArticleExtractor.ts

import { DataExtractor, ExtractionOptions } from './DataExtractor';

export interface Article {
  title: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  tags?: string[];
  wordCount?: number;
  url: string;
}

export class ArticleExtractor extends DataExtractor<Article> {
  private selectors = {
    title: 'h1, [itemprop="headline"], .article-title, .post-title',
    author: '[itemprop="author"], .author, .byline, [rel="author"]',
    publishedDate: '[itemprop="datePublished"], time[datetime], .published, .post-date',
    modifiedDate: '[itemprop="dateModified"], .modified, .updated',
    content: '[itemprop="articleBody"], article, .article-content, .post-content, main',
    excerpt: '[itemprop="description"], .excerpt, .summary, meta[name="description"]',
    featuredImage: '[itemprop="image"], .featured-image img, .post-thumbnail img',
    tags: '[itemprop="keywords"], .tags, .post-tags, [rel="tag"]'
  };

  constructor(options: ExtractionOptions = {}) {
    super({ ...options, root: document.body });
  }

  extract(): Article {
    const title = this.extractTitle();
    const author = this.extractAuthor();
    const publishedDate = this.extractDate(this.selectors.publishedDate);
    const modifiedDate = this.extractDate(this.selectors.modifiedDate);
    const content = this.extractContent();
    const excerpt = this.extractExcerpt();
    const featuredImage = this.extractFeaturedImage();
    const tags = this.extractTags();
    const wordCount = content ? content.split(/\s+/).length : undefined;

    return {
      title,
      author,
      publishedDate,
      modifiedDate,
      content,
      excerpt,
      featuredImage,
      tags,
      wordCount,
      url: window.location.href
    };
  }

  private extractTitle(): string {
    for (const selector of this.selectors.title.split(', ')) {
      const element = this.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    return document.title || '';
  }

  private extractAuthor(): string | undefined {
    for (const selector of this.selectors.author.split(', ')) {
      const element = this.querySelector(selector);
      const author = element?.textContent?.trim();
      if (author) {
        return author.replace(/^by\s+/i, '');
      }
    }
    return undefined;
  }

  private extractDate(selector: string): string | undefined {
    const element = this.querySelector(selector);
    if (!element) return undefined;
    
    const datetime = element.getAttribute('datetime');
    if (datetime) return datetime;
    
    const text = element.textContent?.trim();
    if (text) {
      try {
        const parsed = new Date(text);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch {}
    }
    return text;
  }

  private extractContent(): string {
    const contentElement = this.querySelector(this.selectors.content);
    if (!contentElement) return '';

    // Clone to avoid modifying the actual page
    const clone = contentElement.cloneNode(true) as Element;
    
    // Remove unwanted elements
    const unwanted = clone.querySelectorAll('script, style, nav, footer, aside, .advertisement, .ad, .comments, .share, .social');
    unwanted.forEach(el => el.remove());

    // Get text content
    return clone.textContent?.trim() || '';
  }

  private extractExcerpt(): string | undefined {
    let excerpt = this.getText(this.selectors.excerpt);
    if (excerpt) return excerpt;
    
    const content = this.extractContent();
    return content ? content.substring(0, 200).trim() + '...' : undefined;
  }

  private extractFeaturedImage(): string | undefined {
    const element = this.querySelector(this.selectors.featuredImage);
    if (!element) return undefined;
    
    return element.getAttribute('src') || 
           element.getAttribute('data-src') || 
           element.getAttribute('content');
  }

  private extractTags(): string[] | undefined {
    const tagElements = this.root.querySelectorAll(this.selectors.tags);
    if (tagElements.length === 0) return undefined;
    
    return Array.from(tagElements)
      .map(el => el.textContent?.trim())
      .filter(Boolean) as string[];
  }
}
```

Handling Dynamic Content

Modern web applications load content asynchronously, making traditional DOM-based extraction insufficient. This section covers three powerful techniques for handling dynamic content.

Waiting for Elements

For pages that load content after initial render but don't use complex frameworks, a simple waiting utility often suffices:

```typescript
// src/content-script/utils/WaitUtils.ts

export async function waitForElement(
  selector: string,
  options: {
    root?: Element;
    timeout?: number;
    state?: 'attached' | 'visible';
  } = {}
): Promise<Element | null> {
  const {
    root = document,
    timeout = 10000,
    state = 'attached'
  } = options;

  // Check if element already exists
  const existing = root.querySelector(selector);
  if (existing) {
    if (state === 'visible' && !isVisible(existing)) {
      return waitForElement(selector, { ...options, root });
    }
    return existing;
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver((mutations, obs) => {
      const element = root.querySelector(selector);
      if (element) {
        if (state === 'visible' && !isVisible(element)) {
          // Element exists but not visible yet, keep waiting
          return;
        }
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetParent !== null;
}
```

Intercepting Network Requests

For SPAs that load data via APIs, intercepting network requests can be more reliable than DOM extraction:

```typescript
// src/content-script/utils/NetworkInterceptor.ts

type RequestHandler = (data: unknown) => void;

export class NetworkInterceptor {
  private originalFetch: typeof fetch;
  private originalXHR: typeof XMLHttpRequest;
  private handlers: Map<string, RequestHandler[]> = new Map();

  constructor() {
    this.originalFetch = window.fetch;
    this.originalXHR = window.XMLHttpRequest;
  }

  intercept(): void {
    // Intercept fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await this.originalFetch(...args);
      this.processFetchResponse(args, response.clone());
      return response;
    };

    // Intercept XHR
    const self = this;
    window.XMLHttpRequest = class extends this.originalXHR {
      private url: string;
      
      open(method: string, url: string | URL, ...args: Parameters<XMLHttpRequest['open']>): void {
        this.url = url.toString();
        return super.open(method, url, ...args);
      }

      send(...args: Parameters<XMLHttpRequest['send']>): void {
        const handlers = self.handlers.get(this.url);
        
        this.addEventListener('load', () => {
          if (this.responseType === '' || this.responseType === 'text') {
            try {
              const data = JSON.parse(this.responseText);
              handlers?.forEach(handler => handler(data));
            } catch {}
          } else if (this.responseType === 'json') {
            try {
              const data = this.response;
              handlers?.forEach(handler => handler(data));
            } catch {}
          }
        });

        return super.send(...args);
      }
    };
  }

  private async processFetchResponse(args: Parameters<typeof fetch>, response: Response): Promise<void> {
    const url = args[0]?.toString() || '';
    const handlers = this.handlers.get(url);
    
    if (!handlers?.length) return;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        handlers.forEach(handler => handler(data));
      }
    } catch {}
  }

  on(urlPattern: string, handler: RequestHandler): void {
    const normalized = this.normalizePattern(urlPattern);
    const existing = this.handlers.get(normalized) || [];
    existing.push(handler);
    this.handlers.set(normalized, existing);
  }

  private normalizePattern(pattern: string): string {
    return pattern.replace(/\*/g, '.*');
  }
}
```

Complete Dynamic Content Watcher

Combining these techniques into a comprehensive solution:

```typescript
// src/content-script/DynamicContentWatcher.ts

import { DOMWatcher } from './utils/DOMWatcher';
import { waitForElement } from './utils/WaitUtils';
import { NetworkInterceptor } from './utils/NetworkInterceptor';

export interface WatcherConfig {
  watchDOM?: boolean;
  watchNetwork?: boolean;
  debounceMs?: number;
  timeout?: number;
}

export class DynamicContentWatcher {
  private domWatcher: DOMWatcher | null = null;
  private networkInterceptor: NetworkInterceptor;
  private onContentReady: () => void;
  private hasTriggered = false;

  constructor(
    private triggerSelector: string,
    private config: WatcherConfig = {},
    onContentReady: () => void
  ) {
    this.onContentReady = () => {
      if (!this.hasTriggered) {
        this.hasTriggered = true;
        onContentReady();
      }
    };
    this.networkInterceptor = new NetworkInterceptor();
  }

  async start(): Promise<void> {
    // First, try waiting for the element directly
    const element = await waitForElement(this.triggerSelector, {
      timeout: this.config.timeout || 5000
    });

    if (element) {
      this.onContentReady();
      return;
    }

    // Set up DOM watcher if enabled
    if (this.config.watchDOM !== false) {
      this.domWatcher = new DOMWatcher(
        document.body,
        () => {
          const el = document.querySelector(this.triggerSelector);
          if (el) {
            this.domWatcher?.stop();
            this.onContentReady();
          }
        },
        { childList: true, subtree: true },
        this.config.debounceMs || 300
      );
      this.domWatcher.start();
    }

    // Set up network interception if enabled
    if (this.config.watchNetwork !== false) {
      this.networkInterceptor.intercept();
    }
  }

  stop(): void {
    this.domWatcher?.stop();
  }

  onApiResponse(urlPattern: string, handler: (data: unknown) => void): void {
    this.networkInterceptor.on(urlPattern, handler);
  }
}
```

Message Passing for Data Flow

Content scripts cannot directly access Chrome APIs like `chrome.storage` or communicate with other extension components. Message passing bridges this gap.

One-Off Messages with sendMessage

For simple, single-shot data transfers:

```typescript
// src/content-script/messaging/Sender.ts

export interface ScrapedDataMessage {
  type: 'SCRAPED_DATA';
  payload: {
    pageUrl: string;
    timestamp: number;
    data: unknown;
  };
}

export class MessageSender {
  private extensionId: string;

  constructor(extensionId?: string) {
    this.extensionId = extensionId || chrome.runtime.id;
  }

  async sendData(data: unknown, pageUrl: string = window.location.href): Promise<boolean> {
    const message: ScrapedDataMessage = {
      type: 'SCRAPED_DATA',
      payload: {
        pageUrl,
        timestamp: Date.now(),
        data
      }
    };

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        this.extensionId,
        message,
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Message send failed:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async requestData<T>(request: { action: string; payload?: unknown }): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        this.extensionId,
        request,
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Message request failed:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response as T);
          }
        }
      );
    });
  }
}
```

Background Script Message Handler

The background script acts as a central hub for receiving, processing, and storing scraped data:

```typescript
// src/background/messages/DataHandler.ts

import { ScrapedDataMessage } from '../content-script/messaging/Sender';
import { DataStore } from '../storage/DataStore';

export class BackgroundMessageHandler {
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
    this.registerListeners();
  }

  private registerListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then(sendResponse)
        .catch(error => {
          console.error('Message handling error:', error);
          sendResponse({ error: error.message });
        });
      
      // Return true to indicate async response
      return true;
    });
  }

  private async handleMessage(
    message: ScrapedDataMessage | { action: string; payload?: unknown },
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    switch (message.type) {
      case 'SCRAPED_DATA':
        return this.handleScrapedData(message as ScrapedDataMessage);
      
      case 'GET_STORED_DATA':
        return this.dataStore.getAll();
      
      case 'CLEAR_DATA':
        return this.dataStore.clear();
        
      default:
        if ('action' in message) {
          return this.handleCustomAction(message.action, message.payload, sender);
        }
        throw new Error(`Unknown message type: ${message}`);
    }
  }

  private async handleScrapedData(message: ScrapedDataMessage): Promise<{ success: boolean }> {
    const { pageUrl, timestamp, data } = message.payload;
    
    // Store the scraped data
    await this.dataStore.add({
      id: `${pageUrl}-${timestamp}`,
      pageUrl,
      timestamp,
      data,
      source: 'content_script'
    });

    return { success: true };
  }

  private async handleCustomAction(
    action: string,
    payload: unknown,
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    // Handle custom actions from content scripts or popup
    console.log(`Custom action: ${action}`, payload);
    return { handled: true };
  }
}
```

Data Storage and Export

Once data is scraped, you need somewhere to store it. Chrome extensions offer several storage options with different trade-offs.

Data Storage Class

```typescript
// src/background/storage/DataStore.ts

export interface StoredItem<T = unknown> {
  id: string;
  pageUrl: string;
  timestamp: number;
  data: T;
  source: string;
}

export interface StorageOptions {
  maxItems?: number;
  maxSizeBytes?: number;
}

export class DataStore {
  private storageArea: chrome.storage.StorageArea;
  private readonly STORAGE_KEY = 'scraped_data';
  private readonly MAX_ITEMS = 1000;
  private readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  constructor(
    private options: StorageOptions = {}
  ) {
    this.storageArea = chrome.storage.local;
  }

  async add<T>(item: StoredItem<T>): Promise<void> {
    const items = await this.getAll();
    
    // Add new item
    items.push(item as StoredItem);
    
    // Trim if exceeds limits
    while (items.length > (this.options.maxItems || this.MAX_ITEMS)) {
      items.shift(); // Remove oldest
    }
    
    await this.storageArea.set({ [this.STORAGE_KEY]: items });
  }

  async getAll<T = unknown>(): Promise<StoredItem<T>[]> {
    const result = await this.storageArea.get(this.STORAGE_KEY);
    return (result[this.STORAGE_KEY] as StoredItem<T>[]) || [];
  }

  async getByUrl<T = unknown>(url: string): Promise<StoredItem<T>[]> {
    const items = await this.getAll<T>();
    return items.filter(item => item.pageUrl === url);
  }

  async clear(): Promise<void> {
    await this.storageArea.remove(this.STORAGE_KEY);
  }

  async exportToJSON(): Promise<string> {
    const items = await this.getAll();
    return JSON.stringify(items, null, 2);
  }

  async exportToCSV(): Promise<string> {
    const items = await this.getAll();
    
    if (items.length === 0) return '';
    
    // Flatten the data for CSV
    const flattened = items.map(item => ({
      id: item.id,
      pageUrl: item.pageUrl,
      timestamp: new Date(item.timestamp).toISOString(),
      source: item.source,
      ...(typeof item.data === 'object' ? item.data as Record<string, unknown> : { data: item.data })
    }));
    
    const headers = Object.keys(flattened[0]);
    const rows = flattened.map(row => 
      headers.map(header => {
        const value = row[header];
        const stringValue = String(value ?? '');
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  }
}
```

Pagination and Batch Scraping

Real-world scraping often involves multiple pages. A solid pagination handler manages this complexity:

```typescript
// src/content-script/pagination/PaginationHandler.ts

export interface PaginationConfig {
  nextButtonSelector: string;
  pageIndicatorSelector?: string;
  delay?: number;
  maxPages?: number;
  retryCount?: number;
  retryDelay?: number;
  onPageChange?: (pageNumber: number) => void;
  shouldStop?: (pageNumber: number, url: string) => boolean;
}

export class PaginationHandler {
  private currentPage: number = 1;
  private isProcessing: boolean = false;
  private shouldStop: boolean = false;

  constructor(private config: PaginationConfig) {
    this.config = {
      delay: 2000,
      maxPages: Infinity,
      retryCount: 3,
      retryDelay: 1000,
      nextButtonSelector: '[rel="next"], .next, .pagination-next a, a[href*="page"]',
      ...config
    };
  }

  async scrapeAllPages(
    scrapeCallback: () => Promise<void>
  ): Promise<{ pagesScraped: number; success: boolean }> {
    this.shouldStop = false;
    this.currentPage = 1;

    while (!this.shouldStop) {
      if (this.currentPage > (this.config.maxPages || Infinity)) {
        console.log('Reached max pages limit');
        break;
      }

      this.isProcessing = true;
      
      try {
        await scrapeCallback();
        this.config.onPageChange?.(this.currentPage);
        
        // Try to go to next page
        const hasNext = await this.goToNextPage();
        
        if (!hasNext) {
          console.log('No more pages found');
          break;
        }
        
        this.currentPage++;
        
        // Rate limiting
        await this.delay(this.config.delay || 2000);
        
      } catch (error) {
        console.error(`Error on page ${this.currentPage}:`, error);
        
        const shouldRetry = await this.handleError(error);
        if (!shouldRetry) {
          break;
        }
      } finally {
        this.isProcessing = false;
      }
    }

    return { pagesScraped: this.currentPage, success: !this.shouldStop };
  }

  private async goToNextPage(): Promise<boolean> {
    const nextButton = document.querySelector<HTMLAnchorElement>(this.config.nextButtonSelector);
    
    if (!nextButton) {
      // Try to find pagination links by looking for active page + following link
      const activePage = document.querySelector('.active, .current, [aria-current="page"]');
      if (activePage) {
        const nextLink = activePage.nextElementSibling?.querySelector('a');
        if (nextLink && nextLink instanceof HTMLAnchorElement) {
          nextLink.click();
          await this.waitForPageLoad();
          return true;
        }
      }
      return false;
    }

    // Check if button is disabled
    if (nextButton.hasAttribute('disabled') || nextButton.classList.contains('disabled')) {
      return false;
    }

    // Navigate to next page
    nextButton.click();
    await this.waitForPageLoad();
    
    return true;
  }

  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      // Wait for network to settle
      const timeout = setTimeout(resolve, 3000);
      
      const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        observer.disconnect();
        
        // Give a bit more time for content to render
        setTimeout(resolve, 1000);
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  private async handleError(error: unknown): Promise<boolean> {
    let retries = 0;
    
    while (retries < (this.config.retryCount || 3)) {
      await this.delay(this.config.retryDelay || 1000);
      
      // Check if page is now accessible
      if (document.readyState === 'complete') {
        return true;
      }
      
      retries++;
    }
    
    return false;
  }

  stop(): void {
    this.shouldStop = true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  isRunning(): boolean {
    return this.isProcessing;
  }
}
```

Ethical Scraping Guidelines

Building a scraper is technically straightforward, making it ethical requires discipline. The following guidelines help ensure your scraping activities remain responsible and legal.

Respect Robots.txt and Terms of Service

Always check a website's robots.txt file before scraping. This file indicates which paths the site owner intends for automated access. However, robots.txt is not legally binding, it's a courtesy signal. More importantly, review the website's Terms of Service. Many sites explicitly prohibit scraping, and violating these terms can create legal liability even if no technical barriers exist.

Implement Rate Limiting

Never overwhelm a server with requests. Implement delays between requests (typically 2-10 seconds for aggressive scraping, more for respectful practices). Your extension runs in a user's browser, so you're naturally limited by human browsing speeds, but still add explicit delays. If you receive 429 (Too Many Requests) responses, back off significantly and consider implementing exponential backoff.

Personal vs. Commercial Use

The legal landscape differs significantly between personal and commercial scraping. Personal, non-commercial data collection for research or personal organization generally faces lower legal risk. Commercial use, particularly at scale, for competing with the source business, or for resale, carries substantially higher liability. If you're building a commercial product, consult with an attorney familiar with CFAA, GDPR, and applicable local laws.

Handle Personal Data Responsibly

If your scraper collects personal data, you may be subject to privacy regulations like GDPR (European users), CCPA (California users), or similar laws. Principles include: collect only necessary data, store it securely, allow users to access and delete their data, and don't retain data longer than needed. If your extension scrapes personal information from social media or other platforms, you bear responsibility for how that data is handled.

When NOT to Scrap

Some situations should always be avoided: scraping behind authentication walls you don't own (violates access terms), collecting personally identifiable information without consent, attempting to bypass CAPTCHAs or other security measures, scraping at volumes that degrade service for other users, and scraping content clearly marked as copyrighted without permission.

Anti-Detection Considerations

Websites employ various techniques to detect and block scraping. Chrome extensions have natural advantages but still require careful implementation.

Why Extensions Are Harder to Detect

Extensions run in a real browser context with genuine browser fingerprints. They have access to real cookies and session storage. They render JavaScript naturally rather than emulating a browser. They can space out requests naturally over time. These factors make extension-based scraping significantly harder to detect than headless browsers or server-side scrapers.

Avoiding Detection Patterns

Several practices reduce detection risk: avoid making requests at perfectly regular intervals (add random jitter to delays), don't query the DOM excessively rapidly, use natural user behavior patterns (scroll, pause, click), respect rate limits and back off gracefully, and avoid obvious patterns like scraping every link on a page in rapid succession.

Handling CAPTCHAs Gracefully

If you encounter a CAPTCHA, do not attempt to bypass it. This is both ethically wrong and often illegal. Instead, notify the user that manual intervention is required, consider reducing your request rate to avoid triggering CAPTCHAs, and accept that some sites cannot be scraped legitimately.

Complete Example: Price Comparison Extension

Putting together all the concepts, here's a complete price comparison extension structure:

```typescript
// manifest.json (MV3)
{
  "manifest_version": 3,
  "name": "PriceSpy - Price Comparison",
  "version": "1.0.0",
  "permissions": ["storage"],
  "host_permissions": [
    "https://www.amazon.com/*",
    "https://www.ebay.com/*",
    "https://*.amazon.com/*",
    "https://*.ebay.com/*"
  ],
  "content_scripts": [{
    "matches": [
      "https://www.amazon.com/*",
      "https://www.ebay.com/*"
    ],
    "js": ["dist/content-script.js"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "dist/background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

```typescript
// src/content-script/PriceScraper.ts

import { ProductExtractor, Product } from './extractors/ProductExtractor';
import { MessageSender } from './messaging/Sender';

class PriceScraper {
  private extractor: ProductExtractor;
  private sender: MessageSender;

  constructor() {
    this.extractor = new ProductExtractor();
    this.sender = new MessageSender();
  }

  async run(): Promise<void> {
    // Wait for products to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const products = this.extractor.extract();
    
    if (products.length > 0) {
      await this.sender.sendData({
        products,
        page: window.location.hostname,
        scrapedAt: new Date().toISOString()
      }, window.location.href);
      
      console.log(`PriceScraper: Extracted ${products.length} products`);
    }
  }
}

// Initialize
const scraper = new PriceScraper();
scraper.run();
```

```typescript
// src/background/PriceTracker.ts

import { DataStore, StoredItem } from '../storage/DataStore';
import { BackgroundMessageHandler } from './messages/DataHandler';

interface PriceHistory {
  [productUrl: string]: {
    prices: Array<{ price: number; date: string; store: string }>;
    currentLowest: number;
    currentHighest: number;
  };
}

export class PriceTracker {
  private dataStore: DataStore;
  private messageHandler: BackgroundMessageHandler;

  constructor() {
    this.dataStore = new DataStore();
    this.messageHandler = new BackgroundMessageHandler(this.dataStore);
  }

  async getPriceHistory(): Promise<PriceHistory> {
    const items = await this.dataStore.getAll<{
      products: Array<{
        title: string;
        price: string;
        productUrl: string;
      }>;
      page: string;
      scrapedAt: string;
    }>();

    const history: PriceHistory = {};

    for (const item of items) {
      const data = item.data as { products: Array<{
        title: string;
        price: string;
        productUrl: string;
      }>; page: string; scrapedAt: string };
      
      for (const product of data.products) {
        const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, ''));
        
        if (!history[product.title]) {
          history[product.title] = {
            prices: [],
            currentLowest: priceNum,
            currentHighest: priceNum
          };
        }

        history[product.title].prices.push({
          price: priceNum,
          date: data.scrapedAt,
          store: data.page
        });

        history[product.title].currentLowest = Math.min(
          history[product.title].currentLowest,
          priceNum
        );
        history[product.title].currentHighest = Math.max(
          history[product.title].currentHighest,
          priceNum
        );
      }
    }

    return history;
  }
}
```

This extension architecture demonstrates how content scripts extract product data, background scripts aggregate and analyze prices, and the popup displays comparison results. The modular design allows easy extension to additional retailers or features.

Conclusion

Chrome extensions provide a uniquely powerful platform for web scraping, combining the ability to render JavaScript, maintain sessions, and run in a real browser context. This guide covered the essential techniques: configuring content scripts, extracting structured data from DOM, handling dynamic content with MutationObservers and network interception, managing data flow through message passing, implementing storage and export, and handling pagination responsibly.

Remember that technical capability comes with ethical responsibility. Always respect website terms of service, implement rate limiting, handle personal data carefully, and never attempt to bypass security measures. When building scraping extensions for commercial purposes, consult legal counsel to ensure compliance with applicable laws.

For monetization strategies for your scraping extension, see our [Extension Monetization Guide](/guides/extension-monetization/) which covers freemium models, subscription pricing, and API access tiers that can help sustain your development while respecting users.

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
