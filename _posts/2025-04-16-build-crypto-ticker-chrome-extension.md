---
layout: post
title: "Build a Crypto Price Ticker Chrome Extension: Live Bitcoin and Ethereum Prices"
description: "Learn how to build a crypto price ticker Chrome extension with live Bitcoin and Ethereum prices. Complete step-by-step guide for developers."
date: 2025-04-16
categories: [Chrome Extensions, Finance]
tags: [crypto, ticker, chrome-extension]
keywords: "chrome extension crypto, bitcoin price chrome extension, crypto ticker extension, cryptocurrency chrome extension, build crypto tracker"
---

# Build a Crypto Price Ticker Chrome Extension: Live Bitcoin and Ethereum Prices

Cryptocurrency has revolutionized the financial landscape, and millions of users now track price movements throughout the day. A crypto ticker extension provides a convenient way to monitor Bitcoin, Ethereum, and other popular cryptocurrencies directly from your browser without constantly refreshing exchange websites. In this comprehensive guide, we'll walk you through building a fully functional crypto price ticker Chrome extension that displays real-time prices with automatic updates.

Whether you're a beginner developer looking to understand Chrome extension architecture or an experienced programmer wanting to create a useful tool for crypto enthusiasts, this tutorial covers everything from project setup to deployment. By the end, you'll have a production-ready extension that users can install and enjoy.

---

## Prerequisites and Development Environment Setup {#prerequisites}

Before we begin building our crypto ticker extension, let's ensure you have the necessary tools and knowledge. You'll need a code editor like Visual Studio Code, Google Chrome browser, and basic familiarity with HTML, CSS, and JavaScript. No prior Chrome extension experience is required—we'll explain each concept thoroughly.

First, create a new folder for your project called `crypto-ticker-extension`. Inside this folder, we'll create the essential files that every Chrome extension requires: the manifest file, popup HTML, popup JavaScript, and styles. Let's start by understanding the Chrome extension architecture and then build each component step by step.

Chrome extensions are essentially web applications that run within the Chrome browser. They can interact with web pages, access browser APIs, and provide additional functionality to users. Our crypto ticker will use the Chrome extension popup system—a small window that appears when users click the extension icon in the toolbar.

---

## Creating the Manifest File {#manifest-file}

Every Chrome extension begins with a `manifest.json` file that defines the extension's configuration, permissions, and capabilities. This JSON file tells Chrome how your extension should behave and what resources it requires. Create a new file called `manifest.json` in your project folder with the following content:

```json
{
  "manifest_version": 3,
  "name": "Crypto Price Ticker",
  "version": "1.0",
  "description": "Track live Bitcoin and Ethereum prices directly in your browser",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The manifest version 3 is the latest standard for Chrome extensions, offering improved security and performance. We've specified that our extension requires minimal permissions—`activeTab` for accessing the current tab and `storage` for saving user preferences. The `action` section defines what happens when users click our extension icon, which in this case opens our popup window.

---

## Building the Popup Interface {#popup-interface}

The popup is what users see when they click your extension icon in the Chrome toolbar. We'll create a clean, modern interface that displays cryptocurrency prices in an easy-to-read format. Create `popup.html` with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crypto Price Ticker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Crypto Ticker</h1>
      <button id="refresh-btn" class="refresh-button">↻</button>
    </header>
    
    <div id="loading" class="loading">Loading prices...</div>
    
    <div id="prices" class="prices-container" style="display: none;">
      <div class="crypto-card bitcoin">
        <div class="crypto-header">
          <span class="crypto-name">Bitcoin</span>
          <span class="crypto-symbol">BTC</span>
        </div>
        <div class="crypto-price" id="btc-price">--</div>
        <div class="crypto-change" id="btc-change">--</div>
      </div>
      
      <div class="crypto-card ethereum">
        <div class="crypto-header">
          <span class="crypto-name">Ethereum</span>
          <span class="crypto-symbol">ETH</span>
        </div>
        <div class="crypto-price" id="eth-price">--</div>
        <div class="crypto-change" id="eth-change">--</div>
      </div>
      
      <div class="crypto-card solana">
        <div class="crypto-header">
          <span class="crypto-name">Solana</span>
          <span class="crypto-symbol">SOL</span>
        </div>
        <div class="crypto-price" id="sol-price">--</div>
        <div class="crypto-change" id="sol-change">--</div>
      </div>
    </div>
    
    <div class="footer">
      <span class="last-updated" id="last-updated">Last updated: --</span>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a clean interface with cards for Bitcoin, Ethereum, and Solana. Each card displays the cryptocurrency name, symbol, current price, and price change percentage. We've also included a refresh button and a timestamp showing when the data was last updated.

---

## Styling Your Extension {#styling}

A well-designed extension looks professional and is more enjoyable to use. Let's create attractive styles in `popup.css` that make our crypto ticker visually appealing:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

h1 {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(90deg, #f7931a, #627eea);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.refresh-button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.3s ease;
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.loading {
  text-align: center;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.6);
}

.crypto-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.crypto-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.crypto-name {
  font-weight: 600;
  font-size: 14px;
}

.crypto-symbol {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
}

.crypto-price {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.crypto-change {
  font-size: 13px;
}

.crypto-change.positive {
  color: #00c853;
}

.crypto-change.negative {
  color: #ff5252;
}

.bitcoin .crypto-price {
  color: #f7931a;
}

.ethereum .crypto-price {
  color: #627eea;
}

.solana .crypto-price {
  color: #00ffa3;
}

.footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.last-updated {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
```

The styling uses a dark theme with gradients that match the cryptocurrency brand colors. Each crypto card has a distinct color accent—orange for Bitcoin, blue-purple for Ethereum, and green for Solana. The layout is responsive and maintains consistency across different screen sizes.

---

## Implementing the JavaScript Logic {#javascript-logic}

Now comes the core functionality—fetching real-time cryptocurrency prices and displaying them to users. We'll use a free API to get price data and implement automatic refresh functionality. Create `popup.js`:

```javascript
// Crypto Price Ticker - Main Logic

const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true';

async function fetchCryptoPrices() {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return null;
  }
}

function formatPrice(price) {
  if (price >= 1000) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return '$' + price.toFixed(2);
  } else {
    return '$' + price.toFixed(4);
  }
}

function formatChange(change) {
  const sign = change >= 0 ? '+' : '';
  return sign + change.toFixed(2) + '%';
}

function updateUI(data) {
  if (!data) {
    document.getElementById('loading').textContent = 'Failed to load prices. Click refresh to try again.';
    return;
  }
  
  // Update Bitcoin
  document.getElementById('btc-price').textContent = formatPrice(data.bitcoin.usd);
  const btcChange = document.getElementById('btc-change');
  btcChange.textContent = formatChange(data.bitcoin.usd_24h_change);
  btcChange.className = 'crypto-change ' + (data.bitcoin.usd_24h_change >= 0 ? 'positive' : 'negative');
  
  // Update Ethereum
  document.getElementById('eth-price').textContent = formatPrice(data.ethereum.usd);
  const ethChange = document.getElementById('eth-change');
  ethChange.textContent = formatChange(data.ethereum.usd_24h_change);
  ethChange.className = 'crypto-change ' + (data.ethereum.usd_24h_change >= 0 ? 'positive' : 'negative');
  
  // Update Solana
  document.getElementById('sol-price').textContent = formatPrice(data.solana.usd);
  const solChange = document.getElementById('sol-change');
  solChange.textContent = formatChange(data.solana.usd_24h_change);
  solChange.className = 'crypto-change ' + (data.solana.usd_24h_change >= 0 ? 'positive' : 'negative');
  
  // Update timestamp
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('last-updated').textContent = 'Last updated: ' + timeString;
  
  // Show prices, hide loading
  document.getElementById('loading').style.display = 'none';
  document.getElementById('prices').style.display = 'block';
}

async function init() {
  // Show loading state
  document.getElementById('loading').style.display = 'block';
  document.getElementById('prices').style.display = 'none';
  
  // Fetch and display prices
  const data = await fetchCryptoPrices();
  updateUI(data);
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn');
  btn.style.transform = 'rotate(360deg)';
  
  document.getElementById('loading').style.display = 'block';
  document.getElementById('prices').style.display = 'none';
  
  const data = await fetchCryptoPrices();
  updateUI(data);
  
  setTimeout(() => {
    btn.style.transform = 'rotate(0deg)';
  }, 500);
});
```

This JavaScript code handles fetching data from CoinGecko's free API, formatting the prices appropriately, and updating the DOM. It includes error handling, price formatting that adapts to different price ranges, and visual feedback for positive or negative price changes. The refresh button also includes a rotation animation for better user experience.

---

## Creating Extension Icons {#icons}

Every Chrome extension needs icons to display in the toolbar and extension management page. Create an `icons` folder in your project directory. You can create simple PNG icons using any image editing tool or generate them programmatically. For a production extension, you'll need icons at 16x16, 48x48, and 128x128 pixels.

For testing purposes, you can use placeholder icons or create simple colored squares. Place these icons in the `icons` folder with the filenames `icon16.png`, `icon48.png`, and `icon128.png`.

---

## Loading and Testing Your Extension {#testing}

Now that we've created all the necessary files, let's load the extension into Chrome and test it:

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select your `crypto-ticker-extension` folder
4. The extension should now appear in your toolbar

Click the extension icon to see your crypto ticker in action. You should see live Bitcoin, Ethereum, and Solana prices with 24-hour change indicators. The refresh button allows manual updates, and the interface displays the last update timestamp.

If you encounter any issues, check the extension's console logs by right-clicking the extension icon and selecting "Inspect popup". This will open developer tools where you can see any JavaScript errors.

---

## Enhancing Your Extension {#enhancements}

Now that you have a working crypto ticker, consider adding these enhancements to make it even better:

**Add More Cryptocurrencies**: Modify the API URL to include additional cryptocurrencies like Cardano (ADA), Polkadot (DOT), or Ripple (XRP). Simply add more coin IDs to the API request.

**Implement Price Alerts**: Add functionality to notify users when prices reach certain thresholds using Chrome's notification API.

**Add Favorites System**: Allow users to select which cryptocurrencies they want to track using Chrome's storage API.

**Auto-Refresh**: Implement automatic price updates at regular intervals using `setInterval` in JavaScript.

**Multiple Currency Support**: Add support for displaying prices in different fiat currencies like EUR, GBP, or JPY.

---

## Advanced: Implementing Price Alerts

Here's how to implement price alerts in your crypto ticker:

```javascript
// popup.js - Add price alert functionality
class PriceAlertManager {
  constructor() {
    this.alerts = [];
    this.loadAlerts();
  }

  async loadAlerts() {
    const result = await chrome.storage.local.get('priceAlerts');
    this.alerts = result.priceAlerts || [];
  }

  async addAlert(coinId, targetPrice, direction) {
    const alert = {
      id: Date.now(),
      coinId,
      targetPrice,
      direction, // 'above' or 'below'
      createdAt: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    await chrome.storage.local.set({ priceAlerts: this.alerts });
    this.checkAlerts();
  }

  async checkAlerts() {
    const prices = await this.fetchPrices();
    
    for (const alert of this.alerts) {
      const coin = prices.find(p => p.id === alert.coinId);
      if (!coin) continue;

      const shouldTrigger = 
        (alert.direction === 'above' && coin.current_price >= alert.targetPrice) ||
        (alert.direction === 'below' && coin.current_price <= alert.targetPrice);

      if (shouldTrigger) {
        this.triggerAlert(alert, coin);
      }
    }
  }

  triggerAlert(alert, coin) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Price Alert!',
      message: `${coin.name} is now $${coin.current_price.toLocaleString()}`
    });
    
    // Remove triggered alert
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
    chrome.storage.local.set({ priceAlerts: this.alerts });
  }
}
```

---

## Advanced: Adding Charts and Historical Data

Displaying historical price data makes your extension more useful:

```javascript
// Fetch historical data and render simple chart
async function fetchHistoricalData(coinId, days = 7) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
  );
  const data = await response.json();
  return data.prices; // Array of [timestamp, price]
}

// Simple ASCII-style chart in popup
function renderPriceChart(prices) {
  const min = Math.min(...prices.map(p => p[1]));
  const max = Math.max(...prices.map(p => p[1]));
  const range = max - min;
  
  const chart = prices.map(([timestamp, price]) => {
    const percent = (price - min) / range;
    const chars = ' ▁▂▃▅▆▇█';
    const charIndex = Math.floor(percent * (chars.length - 1));
    return chars[charIndex];
  }).join('');
  
  return chart;
}
```

---

## Security Best Practices

When building financial extensions, security is paramount:

1. **Use HTTPS for all API calls** - Never send data over insecure connections
2. **Validate all data** - Sanitize API responses before displaying
3. **Store sensitive data securely** - Use chrome.storage.encrypt if available
4. **Minimize permissions** - Only request necessary permissions in manifest
5. **Handle errors gracefully** - Don't expose internal errors to users

```javascript
// Validate price data
function validatePriceData(data) {
  if (!Array.isArray(data)) return false;
  
  return data.every(coin => {
    return (
      typeof coin.current_price === 'number' &&
      coin.current_price > 0 &&
      typeof coin.id === 'string' &&
      typeof coin.name === 'string'
    );
  });
}
```

---

## Publishing Your Extension {#publishing}

Once you're satisfied with your extension, you can publish it to the Chrome Web Store for others to discover and install. Here's how:

1. Create a developer account at the Chrome Web Store
2. Bundle your extension into a ZIP file
3. Upload your extension through the developer dashboard
4. Provide required information including description and screenshots
5. Submit for review

Your extension will be reviewed by Google before publication. Make sure to follow Chrome's policies and provide clear, accurate information about your extension's functionality.

---

## Conclusion {#conclusion}

Congratulations! You've successfully built a fully functional crypto price ticker Chrome extension. This project demonstrates fundamental concepts of Chrome extension development including manifest configuration, popup interfaces, styling, and JavaScript integration with external APIs.

The extension you created displays live Bitcoin, Ethereum, and Solana prices with 24-hour change indicators, providing real value to cryptocurrency enthusiasts who want quick access to price information. The skills you've learned in this tutorial apply to countless other Chrome extension projects, from productivity tools to social media utilities.

As you continue developing Chrome extensions, remember to prioritize user experience, keep permissions to a minimum, and always handle errors gracefully. The cryptocurrency space evolves rapidly, so consider updating your extension to support new coins and features as the market grows.

Now that you have the foundation, feel free to experiment with additional features, improve the design, and share your creation with the community. Happy coding!
