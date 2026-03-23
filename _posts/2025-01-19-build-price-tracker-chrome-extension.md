---
layout: post
title: "Build a Price Tracker Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a price tracker Chrome extension from scratch. This comprehensive guide covers Manifest V3, price monitoring, alert notifications, and publishing to the Chrome Web Store."
date: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
keywords: "price tracker extension, price alert chrome, amazon price tracker"
canonical_url: "https://bestchromeextensions.com/2025/01/19/build-price-tracker-chrome-extension/"
---

# Build a Price Tracker Chrome Extension: Complete 2025 Guide

Online shopping has revolutionized the way we purchase products, but it has also introduced a new challenge: price fluctuations. Prices can change multiple times per day, and waiting for the right moment to buy can save you significant money. This is where a price tracker extension becomes invaluable.

we will walk you through building a fully functional price tracker Chrome extension from scratch. By the end of this tutorial, you will have a working extension that monitors product prices, stores price history, and sends alerts when prices drop to your desired threshold.

---

Why Build a Price Tracker Extension? {#why-build-price-tracker}

The e-commerce market is massive, with billions of transactions occurring daily across platforms like Amazon, eBay, Walmart, and countless online retailers. Consumers have never had more choices, but they also face unprecedented price variability. A well-built price tracker extension addresses several key user needs.

First, there is the financial benefit. Studies show that consumers can save anywhere from 10% to 40% on purchases by timing them correctly. A price alert chrome extension empowers users to make informed purchasing decisions without constantly checking prices manually.

Second, there is the time savings. Manually visiting multiple websites to check prices is tedious and inefficient. An automated price tracking solution checks prices in the background and notifies users only when it matters.

Third, from a development perspective, building a price tracker extension teaches you valuable skills that apply to many other types of extensions. You will work with content scripts to extract data from web pages, background scripts for scheduling and storage, the Chrome Notifications API for alerts, and the Chrome Storage API for persisting user preferences.

---

Prerequisites and Setup {#prerequisites}

Before we begin coding, ensure you have the following tools and knowledge.

You need a code editor. Visual Studio Code is the industry standard and offers excellent extensions for Chrome development. You also need Google Chrome installed for testing your extension. Basic knowledge of HTML, CSS, and JavaScript is required, though we will explain each concept thoroughly.

Let us start by creating the project structure. Create a new folder for your extension and add the following files: manifest.json, popup.html, popup.js, background.js, content.js, and styles.css.

---

Understanding Manifest V3 for Price Tracking {#manifest-v3}

The manifest file is the backbone of every Chrome extension. In 2025, all extensions must use Manifest V3, which introduced significant changes from V2, particularly around background scripts and network requests.

Create your manifest.json file with the following configuration:

```json
{
  "manifest_version": 3,
  "name": "Price Watch - Smart Price Tracker",
  "version": "1.0.0",
  "description": "Track product prices and get alerts when prices drop",
  "permissions": [
    "storage",
    "notifications",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "*://*.amazon.com/*",
    "*://*.ebay.com/*",
    "*://*.walmart.com/*",
    "*://*.target.com/*"
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
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.amazon.com/*",
        "*://*.ebay.com/*",
        "*://*.walmart.com/*",
        "*://*.target.com/*"
      ],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest defines the essential permissions. The storage permission allows us to save tracked products and price history. The notifications permission enables sending price drop alerts. The scripting permission lets us inject content scripts. The host permissions specify which e-commerce sites our extension can access.

---

Building the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon. It should display tracked products, allow adding new products, and show current prices.

Create popup.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Watch</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Price Watch</h1>
      <p class="subtitle">Smart Price Tracker</p>
    </header>
    
    <div id="tracked-products" class="product-list">
      <!-- Tracked products will be inserted here -->
    </div>
    
    <div class="add-product-section">
      <input type="number" id="target-price" placeholder="Target price ($)" step="0.01">
      <button id="track-current" class="btn-primary">Track This Product</button>
    </div>
    
    <div class="stats">
      <p>Tracked: <span id="tracked-count">0</span></p>
      <p>Price Drops: <span id="drops-count">0</span></p>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now create styles.css to make it visually appealing:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 20px;
  color: #1a73e8;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.product-list {
  max-height: 300px;
  overflow-y: auto;
}

.product-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.product-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.current-price {
  font-weight: 700;
  color: #1a73e8;
}

.target-price {
  color: #34a853;
}

.price-drop {
  color: #ea4335;
  font-weight: 600;
}

.add-product-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.btn-primary {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1557b0;
}

.stats {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #999;
}
```

---

Implementing the Content Script {#content-script}

The content script runs on e-commerce pages and extracts product information. This is where the magic of price tracking begins.

Create content.js:

```javascript
// Content script for extracting product information

// Wait for page to fully load
window.addEventListener('load', () => {
  extractProductInfo();
});

// Also try after a short delay for dynamic content
setTimeout(extractProductInfo, 1500);

function extractProductInfo() {
  const productData = {
    url: window.location.href,
    title: '',
    price: '',
    originalPrice: '',
    currency: 'USD',
    site: getSiteName(),
    timestamp: Date.now()
  };
  
  // Site-specific selectors
  if (productData.site === 'amazon') {
    productData.title = document.getElementById('productTitle')?.textContent?.trim() || '';
    productData.price = document.getElementById('priceblock_ourprice')?.textContent?.trim() || 
                        document.getElementById('priceblock_dealprice')?.textContent?.trim() ||
                        document.querySelector('.a-price .a-offscreen')?.textContent?.trim() || '';
    productData.originalPrice = document.getElementById('listPrice')?.textContent?.trim() || '';
  } else if (productData.site === 'ebay') {
    productData.title = document.querySelector('.x-item-title__mainTitle')?.textContent?.trim() || '';
    productData.price = document.querySelector('.x-price-primary span')?.textContent?.trim() || '';
  } else if (productData.site === 'walmart') {
    productData.title = document.querySelector('[data-automation-id="product-title"]')?.textContent?.trim() || '';
    productData.price = document.querySelector('[itemprop="price"]')?.textContent?.trim() || '';
  } else if (productData.site === 'target') {
    productData.title = document.querySelector('[data-test="product-title"]')?.textContent?.trim() || '';
    productData.price = document.querySelector('[data-test="product-price"]')?.textContent?.trim() || '';
  }
  
  // Parse price to numeric value
  if (productData.price) {
    const priceMatch = productData.price.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      productData.priceValue = parseFloat(priceMatch[0].replace(/,/g, ''));
    }
  }
  
  // Only send if we found product data
  if (productData.title && productData.price) {
    chrome.runtime.sendMessage({
      action: 'productDetected',
      data: productData
    });
  }
}

function getSiteName() {
  const hostname = window.location.hostname;
  if (hostname.includes('amazon')) return 'amazon';
  if (hostname.includes('ebay')) return 'ebay';
  if (hostname.includes('walmart')) return 'walmart';
  if (hostname.includes('target')) return 'target';
  return 'unknown';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getProductInfo') {
    extractProductInfo();
    sendResponse({ success: true });
  }
  return true;
});
```

This content script detects which e-commerce site the user is visiting and extracts the product title and price using site-specific selectors. It then sends this information to the background script for storage.

---

Building the Background Service Worker {#background-worker}

The background service worker handles storage, scheduling, and notifications. It is the brain of your extension.

Create background.js:

```javascript
// Background service worker for Price Watch extension

// Store tracked products
let trackedProducts = {};
let priceHistory = {};

// Initialize from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  loadFromStorage();
});

// Load data from Chrome storage
async function loadFromStorage() {
  try {
    const result = await chrome.storage.local.get(['trackedProducts', 'priceHistory']);
    trackedProducts = result.trackedProducts || {};
    priceHistory = result.priceHistory || {};
  } catch (error) {
    console.error('Error loading from storage:', error);
  }
}

// Save data to Chrome storage
async function saveToStorage() {
  try {
    await chrome.storage.local.set({
      trackedProducts: trackedProducts,
      priceHistory: priceHistory
    });
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'productDetected') {
    handleProductDetected(message.data);
  } else if (message.action === 'getTrackedProducts') {
    sendResponse(trackedProducts);
  } else if (message.action === 'trackProduct') {
    handleTrackProduct(message.data);
  } else if (message.action === 'removeProduct') {
    handleRemoveProduct(message.data);
  } else if (message.action === 'updateTargetPrice') {
    handleUpdateTargetPrice(message.data);
  }
  
  return true;
});

function handleProductDetected(productData) {
  const productId = generateProductId(productData.url);
  
  // Check if this product is being tracked
  if (trackedProducts[productId]) {
    const oldPrice = trackedProducts[productId].currentPrice;
    const newPrice = productData.priceValue;
    
    // Update price
    trackedProducts[productId].currentPrice = newPrice;
    trackedProducts[productId].lastChecked = Date.now();
    
    // Add to price history
    if (!priceHistory[productId]) {
      priceHistory[productId] = [];
    }
    priceHistory[productId].push({
      price: newPrice,
      timestamp: Date.now()
    });
    
    // Check for price drop
    if (oldPrice && newPrice < oldPrice) {
      const drop = oldPrice - newPrice;
      const percentage = ((drop / oldPrice) * 100).toFixed(1);
      
      // Check if price is below target
      if (newPrice <= trackedProducts[productId].targetPrice) {
        sendPriceAlert(trackedProducts[productId], newPrice, percentage);
      }
    }
    
    saveToStorage();
  }
}

function handleTrackProduct(data) {
  const productId = generateProductId(data.url);
  
  trackedProducts[productId] = {
    id: productId,
    url: data.url,
    title: data.title,
    currentPrice: data.priceValue,
    targetPrice: data.targetPrice || data.priceValue,
    originalPrice: data.priceValue,
    site: data.site,
    trackedAt: Date.now(),
    lastChecked: Date.now()
  };
  
  // Initialize price history
  priceHistory[productId] = [{
    price: data.priceValue,
    timestamp: Date.now()
  }];
  
  saveToStorage();
  
  // Show confirmation
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Price Watch',
    message: `Now tracking: ${data.title.substring(0, 50)}...`
  });
}

function handleRemoveProduct(data) {
  const productId = data.productId;
  delete trackedProducts[productId];
  delete priceHistory[productId];
  saveToStorage();
}

function handleUpdateTargetPrice(data) {
  const productId = data.productId;
  if (trackedProducts[productId]) {
    trackedProducts[productId].targetPrice = data.targetPrice;
    saveToStorage();
  }
}

function sendPriceAlert(product, newPrice, percentage) {
  const message = `Price dropped by ${percentage}%!\nWas: $${product.originalPrice}\nNow: $${newPrice}`;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: ' Price Drop Alert!',
    message: `${product.title.substring(0, 40)}...\n${message}`,
    priority: 2
  });
}

function generateProductId(url) {
  // Create a simple hash from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Set up periodic price checking (every hour)
chrome.alarms.create('priceCheck', {
  periodInMinutes: 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'priceCheck') {
    // Re-check all tracked products
    // This would require opening each URL, which has limitations in MV3
    // In production, you might use an external server for polling
    console.log('Price check alarm triggered');
  }
});
```

The background script manages all tracked products and their price history. It detects when prices drop below the target threshold and sends browser notifications. It also sets up periodic alarms for price checking.

---

Implementing Popup Logic {#popup-logic}

Now create popup.js to handle user interactions:

```javascript
// Popup script for Price Watch extension

document.addEventListener('DOMContentLoaded', () => {
  loadTrackedProducts();
  setupEventListeners();
});

async function loadTrackedProducts() {
  try {
    const result = await chrome.storage.local.get(['trackedProducts']);
    const products = result.trackedProducts || {};
    
    const container = document.getElementById('tracked-products');
    const trackedCount = document.getElementById('tracked-count');
    
    trackedCount.textContent = Object.keys(products).length;
    
    if (Object.keys(products).length === 0) {
      container.innerHTML = '<div class="empty-state">No products tracked yet.<br>Visit an Amazon, eBay, Walmart, or Target product page to start tracking.</div>';
      return;
    }
    
    container.innerHTML = '';
    
    Object.values(products).forEach(product => {
      const productEl = createProductElement(product);
      container.appendChild(productEl);
    });
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function createProductElement(product) {
  const div = document.createElement('div');
  div.className = 'product-item';
  
  const priceChange = product.currentPrice < product.originalPrice 
    ? `<span class="price-drop">↓ $${(product.originalPrice - product.currentPrice).toFixed(2)}</span>`
    : '';
  
  div.innerHTML = `
    <div class="product-name" title="${product.title}">${product.title}</div>
    <div class="price-info">
      <span class="current-price">$${product.currentPrice.toFixed(2)}</span>
      <span class="target-price">Target: $${product.targetPrice.toFixed(2)}</span>
    </div>
    ${priceChange}
  `;
  
  return div;
}

function setupEventListeners() {
  const trackBtn = document.getElementById('track-current');
  
  trackBtn.addEventListener('click', async () => {
    const targetPrice = parseFloat(document.getElementById('target-price').value);
    
    if (!targetPrice || isNaN(targetPrice)) {
      alert('Please enter a valid target price');
      return;
    }
    
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to get product info
    chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' }, async (response) => {
      // Get product data from storage
      const result = await chrome.storage.local.get(['trackedProducts']);
      const products = result.trackedProducts || {};
      
      // Find the most recently added product (from content script)
      const productIds = Object.keys(products);
      if (productIds.length > 0) {
        const lastProduct = products[productIds[productIds.length - 1]];
        
        // Update target price
        lastProduct.targetPrice = targetPrice;
        
        await chrome.storage.local.set({ trackedProducts: products });
        
        // Reload display
        loadTrackedProducts();
        
        alert('Product tracked successfully!');
      }
    });
  });
}
```

---

Testing Your Extension {#testing}

Now it is time to test your extension. Open Chrome and navigate to chrome://extensions/. Enable Developer mode in the top right corner. Click Load unpacked and select your extension folder.

Visit an Amazon product page and you should see the extension icon in your toolbar. Click the icon to see the popup interface. Try tracking a product and observe how the extension captures the price information.

Test the notification system by manually modifying the target price to be lower than the current price in the Chrome storage.

---

Publishing to the Chrome Web Store {#publishing}

When your extension is ready, you need to package it for the Chrome Web Store. Create a ZIP file containing all your extension files, excluding any test files or unnecessary directories.

Navigate to the Chrome Developer Dashboard at https://chrome.google.com/webstore/devconsole. Sign in with your Google account. Click the Add new product button and upload your ZIP file.

Fill in the required information: extension name, detailed description, and screenshots. Make sure your description includes your target keywords: price tracker extension, price alert chrome, and amazon price tracker. This helps with SEO in the Chrome Web Store.

After submission, Google reviews your extension. This typically takes a few hours to a few days. Once approved, your extension will be available to millions of Chrome users.

---

Advanced Features to Consider {#advanced-features}

There are many ways to enhance your price tracker extension. Consider adding support for more e-commerce platforms like Best Buy, Newegg, or AliExpress. Implement price history charts so users can visualize price trends over time. Add a wishlist feature that allows users to organize products into categories.

You could also integrate with a backend server to enable real-time price checking even when the browser is closed. This solves one of the limitations of Chrome extensions: they cannot run in the background indefinitely.

Another valuable feature is price prediction using machine learning. By analyzing historical price data, you could predict when prices are likely to drop next, helping users time their purchases optimally.

---

Conclusion {#conclusion}

Building a price tracker Chrome extension is an excellent project that teaches you fundamental extension development concepts while creating a genuinely useful tool. we covered Manifest V3 configuration, content scripts for data extraction, background service workers for storage and notifications, and the popup interface for user interaction.

The e-commerce landscape continues to evolve, and consumers are increasingly savvy about finding the best deals. A well-built price tracker extension meets a real market need and can even be monetized through premium-model) features or affiliate partnerships.

Start building your extension today, test it thoroughly, and prepare for your first Chrome Web Store launch. The skills you learn through this project will serve as a strong foundation for any future Chrome extension development endeavors.

---

Turn Your Extension Into a Business
Ready to monetize? The Extension Monetization Playbook covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
