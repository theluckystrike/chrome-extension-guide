# Build a Price Tracker Extension

A step-by-step guide to building a Chrome extension that tracks product prices across e-commerce sites, sends notifications when prices drop, and visualizes price history.

## What You'll Build

By the end of this tutorial, you'll have a fully functional price tracker extension with the following features:

- **Product Price Tracking**: Monitor prices on popular e-commerce websites
- **Price Drop Notifications**: Receive browser notifications when prices fall below your target
- **Price History Charts**: Visualize price trends over time with interactive charts
- **Target Price Alerts**: Set custom price alerts for products you want to buy

This extension demonstrates advanced Chrome extension patterns including content scripts, service workers, offscreen documents, and the Chrome Storage API.

## Prerequisites

Before starting, ensure you have:
- Chrome 114+ (for Manifest V3)
- Basic JavaScript/TypeScript knowledge
- Understanding of DOM manipulation
- Familiarity with async/await patterns

## Manifest Configuration

Create your `manifest.json` with the required permissions and configuration:

```json
{
  "manifest_version": 3,
  "name": "Price Tracker",
  "version": "1.0.0",
  "description": "Track product prices and get notified of price drops",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "activeTab",
    "scripting"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [{
    "matches": ["*://*.amazon.com/*", "*://*.ebay.com/*", "*://*.walmart.com/*"],
    "js": ["content.js"]
  }],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Permission Explanation

| Permission | Purpose |
|------------|---------|
| `storage` | Store tracked products and price history |
| `alarms` | Schedule periodic price checks |
| `notifications` | Alert users when prices drop |
| `activeTab` | Inject scripts to extract prices |
| `scripting` | Execute content scripts dynamically |

## Step 1: Content Script for Price Extraction

The content script runs on e-commerce pages and extracts product information using DOM selectors.

### Detecting Product Pages

Create `content.js` to identify product pages and extract data:

```javascript
// content.js - runs on e-commerce pages

// CSS selectors for different e-commerce sites
const PRICE_SELECTORS = {
  'amazon.com': '#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen',
  'ebay.com': '.x-price-primary span, #prcIsum',
  'walmart.com': '[data-automation="buybox-price"], .price-characteristic'
};

const TITLE_SELECTORS = {
  'amazon.com': '#productTitle',
  'ebay.com': '.x-item-title__mainTitle span',
  'walmart.com': 'h1[itemprop="name"]'
};

const IMAGE_SELECTORS = {
  'amazon.com': '#landingImage, #imgBlkFront',
  'ebay.com': '.ux-image-carousel-item img',
  'walmart.com': '[data-testid="hero-image-container"] img'
};

// Detect current site and extract price
function detectSite() {
  const hostname = window.location.hostname;
  for (const site of Object.keys(PRICE_SELECTORS)) {
    if (hostname.includes(site.replace('www.', ''))) {
      return site;
    }
  }
  return null;
}

// Extract price from DOM element
function extractPrice(element) {
  if (!element) return null;
  const text = element.textContent.trim();
  // Handle various price formats: $19.99, $1,299.99, $19 99
  const match = text.match(/[\$£€]?\s*[\d,]+\.?\d*/);
  if (!match) return null;
  
  // Remove currency symbols and commas
  return parseFloat(match[0].replace(/[\$£€,\s]/g, ''));
}

// Main extraction function
async function extractProductInfo() {
  const site = detectSite();
  if (!site) return null;

  const priceEl = document.querySelector(PRICE_SELECTORS[site]);
  const titleEl = document.querySelector(TITLE_SELECTORS[site]);
  const imageEl = document.querySelector(IMAGE_SELECTORS[site]);

  const price = extractPrice(priceEl);
  const title = titleEl?.textContent.trim();
  const image = imageEl?.src;

  if (!price || !title) {
    console.log('[Price Tracker] Could not extract product info');
    return null;
  }

  return {
    url: window.location.href,
    title: title.substring(0, 200), // Limit title length
    image: image,
    price: price,
    currency: 'USD',
    site: site,
    timestamp: Date.now()
  };
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractPrice') {
    extractProductInfo().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Auto-extract on page load (for product pages)
if (document.readyState === 'complete') {
  extractProductInfo();
} else {
  window.addEventListener('load', () => {
    setTimeout(extractProductInfo, 1000); // Wait for dynamic content
  });
}
```

### Using WebExt Messaging

The content script uses Chrome's message passing API. For more advanced scenarios, consider using `@theluckystrike/webext-messaging` which provides a cleaner Promise-based interface:

```javascript
import { sendMessage } from '@theluckystrike/webext-messaging';

// In content script
const productInfo = await sendMessage('popup', { action: 'trackProduct' });
```

## Step 2: Price Storage

Create a storage module to manage tracked products and price history using `@theluckystrike/webext-storage`.

### Storage Schema

```javascript
// storage.js - Price data management

const STORAGE_KEYS = {
  PRODUCTS: 'tracked_products',
  SETTINGS: 'tracker_settings'
};

// Product storage structure
// {
//   "https://amazon.com/product/123": {
//     url: "https://amazon.com/product/123",
//     title: "Product Name",
//     image: "https://...",
//     site: "amazon.com",
//     targetPrice: 99.99,
//     prices: [
//       { date: 1704067200000, price: 129.99 },
//       { date: 1704153600000, price: 119.99 },
//       { date: 1704240000000, price: 109.99 }
//     ],
//     lastChecked: 1704240000000,
//     status: "in_stock" | "out_of_stock" | "unavailable"
//   }
// }

// Save a product to track
async function trackProduct(productInfo, targetPrice = null) {
  const { url } = productInfo;
  
  const products = await getTrackedProducts();
  
  if (products[url]) {
    // Update existing product
    products[url].prices.push({
      date: Date.now(),
      price: productInfo.price
    });
    products[url].lastChecked = Date.now();
  } else {
    // Add new product
    products[url] = {
      url: productInfo.url,
      title: productInfo.title,
      image: productInfo.image,
      site: productInfo.site,
      targetPrice: targetPrice,
      prices: [{
        date: Date.now(),
        price: productInfo.price
      }],
      lastChecked: Date.now(),
      status: 'in_stock'
    };
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.PRODUCTS]: products });
  return products[url];
}

// Get all tracked products
async function getTrackedProducts() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PRODUCTS);
  return result[STORAGE_KEYS.PRODUCTS] || {};
}

// Remove a product from tracking
async function untrackProduct(url) {
  const products = await getTrackedProducts();
  delete products[url];
  await chrome.storage.local.set({ [STORAGE_KEYS.PRODUCTS]: products });
}

// Calculate price trend
function calculateTrend(prices) {
  if (prices.length < 2) return 'stable';
  
  const recent = prices.slice(-3); // Last 3 prices
  const avg = recent.reduce((a, b) => a + b.price, 0) / recent.length;
  const latest = recent[recent.length - 1].price;
  
  if (latest < avg * 0.95) return 'down';
  if (latest > avg * 1.05) return 'up';
  return 'stable';
}

// Get price statistics
function getPriceStats(prices) {
  const values = prices.map(p => p.price);
  return {
    current: values[values.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    trend: calculateTrend(prices)
  };
}
```

### Price Format Handling

Different sites use various price formats. Handle them robustly:

```javascript
// utils.js - Price parsing utilities

function parsePrice(priceString) {
  // Remove whitespace and currency symbols
  let cleaned = priceString
    .replace(/[\s\$£€¥₹]/g, '')
    .replace(/[^\d.,]/g, '');
  
  // Handle European format (1.234,56) vs US (1,234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // European: 1.234,56 -> 1234.56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56 -> 1234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Could be decimal or thousand separator
    const parts = cleaned.split(',');
    if (parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  return parseFloat(cleaned) || null;
}

// Detect out-of-stock states
function detectStockStatus(pageContent, selectors) {
  const outOfStockPatterns = [
    /out of stock/i,
    /unavailable/i,
    /not available/i,
    /sold out/i,
    /currently unavailable/i
  ];
  
  const pageText = pageContent.toLowerCase();
  return outOfStockPatterns.some(pattern => pattern.test(pageText));
}
```

## Step 3: Background Price Checking

The service worker uses `chrome.alarms` to periodically check prices even when the popup is closed.

### Setting Up Alarms

```javascript
// background.js - Service worker

import { trackProduct, getTrackedProducts, untrackProduct } from './storage.js';

// Check prices every 4 hours
const CHECK_INTERVAL_HOURS = 4;

// Create alarm on extension install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('priceCheck', {
    periodInMinutes: CHECK_INTERVAL_HOURS * 60
  });
  console.log('[Price Tracker] Price check alarm created');
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'priceCheck') {
    checkAllPrices();
  }
});

// Main price checking function
async function checkAllPrices() {
  const products = await getTrackedProducts();
  const urls = Object.keys(products);
  
  console.log(`[Price Tracker] Checking ${urls.length} products...`);
  
  for (const url of urls) {
    try {
      await checkProductPrice(products[url]);
    } catch (error) {
      console.error(`[Price Tracker] Error checking ${url}:`, error);
    }
  }
  
  // Update badge
  updateBadge();
}

// Check price for a single product
async function checkProductPrice(product) {
  // Use offscreen document for DOM parsing
  await createOffscreenDocument();
  
  // Inject content script into the product page
  const results = await chrome.scripting.executeScript({
    target: { tabId: product.tabId },
    func: () => {
      // This runs in the context of the product page
      const priceEl = document.querySelector('#priceblock_ourprice');
      return priceEl ? priceEl.textContent : null;
    }
  });
  
  // Process result and check for price drop
  const price = parsePrice(results[0].result);
  if (price && price < product.prices[product.prices.length - 1].price) {
    await sendPriceDropNotification(product, price);
  }
}

// Create offscreen document for long-running tasks
async function createOffscreenDocument() {
  const existingContexts = await chrome.offscreen.getAllContexts();
  
  if (!existingContexts.some(ctx => ctx.documentUrl.includes('offscreen.html'))) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSING'],
      justification: 'Parse product pages for price extraction'
    });
  }
}
```

### Using Offscreen Documents

For more complex DOM parsing, use offscreen documents as described in [patterns/offscreen-documents.md](../patterns/offscreen-documents.md):

```javascript
// offscreen.js - Handle price extraction in offscreen context

async function parseProductInOffscreen(tabId, url) {
  // Create message channel
  const channel = new MessageChannel();
  
  // Send tab URL to offscreen document
  chrome.runtime.postMessage({
    target: 'offscreen',
    action: 'parseProduct',
    url: url
  }, [channel.port1]);
  
  // Wait for result
  return new Promise((resolve) => {
    channel.port2.onmessage = (event) => {
      resolve(event.data);
    };
  });
}
```

## Step 4: Notifications

Send notifications when prices drop below the target price.

### Notification Implementation

```javascript
// notifications.js - Price drop alerts

async function sendPriceDropNotification(product, newPrice) {
  const oldPrice = product.prices[product.prices.length - 1].price;
  const savings = oldPrice - newPrice;
  const percentOff = Math.round((savings / oldPrice) * 100);
  
  const notificationId = `price_drop_${Date.now()}`;
  
  await chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: product.image || 'icons/icon128.png',
    title: 'Price Drop Alert! 💰',
    message: `${product.title}\nwas $${oldPrice.toFixed(2)} → now $${newPrice.toFixed(2)} (${percentOff}% off)`,
    priority: 1,
    buttons: [
      { title: 'View Product' },
      { title: 'Dismiss' }
    ],
    requireInteraction: true
  });
  
  // Handle notification click
  chrome.notifications.onClicked.addListener((id) => {
    if (id === notificationId) {
      chrome.tabs.create({ url: product.url });
    }
  });
  
  // Handle button clicks
  chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
    if (id === notificationId) {
      if (buttonIndex === 0) {
        chrome.tabs.create({ url: product.url });
      }
      chrome.notifications.clear(id);
    }
  });
}

// Update extension badge to show price drop count
function updateBadge() {
  // Implementation to count products below target price
  // and display as badge text
  chrome.action.setBadgeText({ text: '3' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}
```

For more details on notifications, see [permissions/notifications.md](../permissions/notifications.md).

## Step 5: Popup UI

Create an interactive popup to view and manage tracked products.

### Popup HTML

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
      <h1>Price Tracker</h1>
      <button id="addProduct" class="btn-primary">+ Add Current Product</button>
    </header>
    
    <div id="productList" class="product-list">
      <!-- Products will be rendered here -->
    </div>
    
    <div id="emptyState" class="empty-state" style="display: none;">
      <p>No products tracked yet.</p>
      <p>Visit a product page and click "Add Current Product"</p>
    </div>
  </div>
  
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Popup JavaScript

```javascript
// popup.js - Popup interface logic

import { getTrackedProducts, trackProduct, untrackProduct } from './storage.js';
import { renderProductCard } from './components/ProductCard.js';
import { renderPriceChart } from './components/PriceChart.js';

// Load and display tracked products
async function loadProducts() {
  const products = await getTrackedProducts();
  const productList = document.getElementById('productList');
  const emptyState = document.getElementById('emptyState');
  
  const productArray = Object.values(products);
  
  if (productArray.length === 0) {
    productList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  productList.style.display = 'flex';
  emptyState.style.display = 'none';
  
  productList.innerHTML = productArray
    .map(product => renderProductCard(product))
    .join('');
}

// Add current tab as tracked product
document.getElementById('addProduct').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Request price from content script
  chrome.tabs.sendMessage(tab.id, { action: 'extractPrice' }, async (productInfo) => {
    if (productInfo) {
      await trackProduct(productInfo);
      loadProducts();
    }
  });
});

// Handle remove product buttons
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('remove-btn')) {
    const url = e.target.dataset.url;
    await untrackProduct(url);
    loadProducts();
  }
});

// Initialize
loadProducts();
```

## Step 6: Price History Chart

Create a canvas-based sparkline chart to visualize price history.

### Chart Implementation

```javascript
// components/PriceChart.js - Canvas-based price chart

export function renderPriceChart(prices, options = {}) {
  const {
    width = 200,
    height = 60,
    color = '#4CAF50',
    showMinMax = true
  } = options;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.className = 'price-chart';
  
  const ctx = canvas.getContext('2d');
  const padding = 10;
  
  // Get last 30 days of data
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentPrices = prices.filter(p => p.date > thirtyDaysAgo);
  
  if (recentPrices.length < 2) {
    return canvas;
  }
  
  const pricesOnly = recentPrices.map(p => p.price);
  const minPrice = Math.min(...pricesOnly);
  const maxPrice = Math.max(...pricesOnly);
  const priceRange = maxPrice - minPrice || 1;
  
  // Draw line chart
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  pricesOnly.forEach((price, index) => {
    const x = padding + (index / (pricesOnly.length - 1)) * (width - padding * 2);
    const y = height - padding - ((price - minPrice) / priceRange) * (height - padding * 2);
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Highlight min and max points
  if (showMinMax) {
    const minIndex = pricesOnly.indexOf(minPrice);
    const maxIndex = pricesOnly.indexOf(maxPrice);
    
    // Draw min point
    const minX = padding + (minIndex / (pricesOnly.length - 1)) * (width - padding * 2);
    const minY = height - padding - ((minPrice - minPrice) / priceRange) * (height - padding * 2);
    
    ctx.beginPath();
    ctx.fillStyle = '#4CAF50';
    ctx.arc(minX, minY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw max point
    const maxX = padding + (maxIndex / (pricesOnly.length - 1)) * (width - padding * 2);
    const maxY = height - padding - ((maxPrice - minPrice) / priceRange) * (height - padding * 2);
    
    ctx.beginPath();
    ctx.fillStyle = '#F44336';
    ctx.arc(maxX, maxY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas;
}

// Render trend indicator
export function renderTrendIndicator(trend) {
  const icons = {
    up: '↑',
    down: '↓',
    stable: '→'
  };
  
  const colors = {
    up: '#F44336',
    down: '#4CAF50',
    stable: '#9E9E9E'
  };
  
  const span = document.createElement('span');
  span.className = `trend-indicator trend-${trend}`;
  span.textContent = icons[trend] || icons.stable;
  span.style.color = colors[trend] || colors.stable;
  
  return span;
}
```

## Best Practices

### Rate Limiting and Caching

Always respect website rate limits to avoid being blocked:

```javascript
// rateLimiter.js - Respectful price checking

class RateLimiter {
  constructor(requestsPerMinute = 10) {
    this.requestsPerMinute = requestsPerMinute;
    this.queue = [];
    this.lastRequestTime = 0;
  }
  
  async throttle() {
    const now = Date.now();
    const minInterval = 60000 / this.requestsPerMinute;
    const waitTime = Math.max(0, minInterval - (now - this.lastRequestTime));
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.lastRequestTime = Date.now();
  }
  
  async checkPrice(product) {
    await this.throttle();
    // Proceed with price check...
  }
}

const limiter = new RateLimiter(10); // 10 requests per minute
```

### Error Handling

Implement robust error handling for network failures and parsing errors:

```javascript
async function safePriceCheck(product) {
  try {
    const response = await fetch(product.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Price Tracker/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    return parsePriceFromHTML(html);
  } catch (error) {
    console.error(`Price check failed for ${product.url}:`, error);
    return null;
  }
}
```

## Cross-References

For more information on specific topics covered in this tutorial:

- [Alarms and Timers](../permissions/alarms.md) - Detailed guide on using `chrome.alarms`
- [Notifications](../permissions/notifications.md) - Complete notification API reference
- [Offscreen Documents](../patterns/offscreen-documents.md) - Background DOM parsing patterns
- [Storage API](../permissions/storage.md) - Data persistence best practices

## Summary

You've now built a complete price tracker Chrome extension with:

1. **Content Scripts** that extract product prices from major e-commerce sites
2. **Storage** for persisting tracked products and price history
3. **Background Service Worker** with alarms for periodic price checks
4. **Notifications** to alert users of price drops
5. **Popup UI** for managing tracked products
6. **Canvas Charts** for visualizing price history

This extension demonstrates core Chrome extension development patterns that can be adapted for many other use cases. Happy coding!
