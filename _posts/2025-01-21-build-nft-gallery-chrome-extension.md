---
layout: post
title: "Build an NFT Gallery Chrome Extension with OpenSea API"
description: "Learn how to build a powerful NFT gallery Chrome extension using the OpenSea API. This comprehensive guide covers Web3 integration, API authentication, portfolio tracking, and creating a smooth NFT viewing experience in your browser."
date: 2025-01-21
categories: [tutorials, chrome-extensions, web3]
tags: [nft gallery extension, nft chrome extension, opensea api extension, web3 nft viewer, chrome extension tutorial, blockchain, ethereum]
keywords: "nft gallery extension, nft chrome extension, opensea api extension, web3 nft viewer, nft portfolio tracker chrome extension, build nft extension, open sea api tutorial, chrome extension web3"
canonical_url: "https://bestchromeextensions.com/2025/01/21/build-nft-gallery-chrome-extension/"
---

Build an NFT Gallery Chrome Extension with OpenSea API

The NFT ecosystem has exploded in recent years, with millions of digital collectibles traded across Ethereum, Polygon, and other blockchain networks. For crypto enthusiasts and collectors, keeping track of their NFT portfolio often means juggling multiple marketplaces, wallets, and tracking tools. What if you could have your entire NFT gallery accessible directly from your browser toolbar?

we will build a fully functional NFT Gallery Chrome Extension using the OpenSea API. By the end of this tutorial, you will have an extension that allows users to connect their wallet, view their NFT collection, check floor prices, and explore NFT details. all without leaving the browser.

This project is perfect for developers who want to combine their Chrome extension skills with Web3 development. Whether you are building for personal use or planning to publish to the Chrome Web Store, this guide covers everything from API setup to advanced features.

---

Why Build an NFT Gallery Extension? {#why-build-nft-extension}

Before diving into code, let us explore why NFT gallery extensions are valuable and what makes them different from traditional web applications.

The Current NFT Landscape

NFTs (Non-Fungible Tokens) have evolved beyond simple JPEG images. Today, they represent digital ownership of art, music, game items, domain names, and even real-world assets. Major marketplaces like OpenSea, Blur, and LooksRare process billions of dollars in trading volume monthly.

For NFT collectors, this means managing assets across multiple collections and blockchains. A dedicated Chrome extension can simplify this by providing instant access to portfolio data without navigating through multiple websites.

Advantages of a Browser Extension

Browser extensions offer unique advantages for NFT portfolio management:

- Instant Access: Users can check their collection with a single click from any webpage
- Background Updates: The extension can periodically refresh data without user intervention
- Persistent Presence: Unlike web apps that require logging in each time, extensions maintain state
- Cross-Site Functionality: Extensions can interact with NFT data regardless of which marketplace the user is viewing

Use Cases for Your Extension

Your NFT Gallery extension can serve multiple purposes:

1. Portfolio Viewer: Display all NFTs owned by a wallet address
2. Price Tracker: Show floor prices and recent sales for collections
3. Watchlist: Monitor specific collections without owning them
4. Quick Viewer: Preview NFT details when browsing marketplace pages

For this tutorial, we will focus on building a comprehensive portfolio viewer that combines all these features.

---

Understanding the OpenSea API {#understanding-opensea-api}

The OpenSea API is the most comprehensive NFT data API available, providing access to asset information, collection data, ownership details, and trading history. Understanding how to use this API effectively is crucial for building your extension.

API Overview

OpenSea offers several API endpoints that are essential for our extension:

- Assets API: Retrieve NFT details including image, name, description, and attributes
- Collections API: Get collection statistics, floor prices, and metadata
- Owners API: Find out which addresses own specific NFTs
- Events API: Track transfers, sales, and other on-chain events

Authentication Requirements

The OpenSea API requires an API key for most endpoints. Here is how to obtain one:

1. Visit the [OpenSea API page](https://docs.opensea.io/reference/api-overview)
2. Sign in to your OpenSea account
3. Navigate to the API Keys section
4. Create a new API key with appropriate permissions
5. Copy and securely store your key

For development, the API key is free. However, be aware of rate limits. the API allows a certain number of requests per second depending on your plan.

API Response Format

OpenSea returns data in a standardized JSON format. Here is an example response for a single NFT asset:

```json
{
  "id": 12345678,
  "name": "Bored Ape #8429",
  "description": "The Bored Ape Yacht Club is a collection of 10,000 unique Bored Apes.",
  "image_url": "https://ipfs.io/ipfs/QmX.../image.png",
  "external_link": "https://opensea.io/assets/eth/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/8429",
  "collection": {
    "name": "Bored Ape Yacht Club",
    "floor_price": 15.5
  },
  "owner": {
    "address": "0x..."
  },
  "traits": [
    {
      "trait_type": "Background",
      "value": "Blue"
    }
  ]
}
```

Understanding this structure helps us design our extension's data handling layer effectively.

---

Project Setup and Structure {#project-setup}

Now let us set up our Chrome extension project with the proper structure for an NFT gallery application.

Directory Structure

Create the following project structure:

```
nft-gallery-extension/
 manifest.json
 background.js
 popup/
    popup.html
    popup.css
    popup.js
 content/
    content.js
 utils/
    api.js
    storage.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 _locales/
     en/
         messages.json
```

This structure follows Chrome extension best practices, separating concerns between different components.

Manifest Configuration

The manifest.json file defines our extension capabilities:

```json
{
  "manifest_version": 3,
  "name": "NFT Gallery",
  "version": "1.0.0",
  "description": "View and track your NFT portfolio directly from your browser",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.opensea.io/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key points to notice:

- We request `https://api.opensea.io/*` in host_permissions to allow API calls
- The popup directory contains our main UI
- Storage permission lets us cache wallet addresses and preferences

---

Building the API Layer {#building-api-layer}

The API layer handles all communication with OpenSea. Creating a robust, error-resistant API client is essential for a good user experience.

API Utility Module

Create `utils/api.js`:

```javascript
// utils/api.js

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';
const API_KEY = 'YOUR_OPENSEA_API_KEY'; // Replace with your key

class OpenSeaAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async request(endpoint, options = {}) {
    const url = `${OPENSEA_API_BASE}${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      'X-API-KEY': this.apiKey,
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('OpenSea API request failed:', error);
      throw error;
    }
  }

  async getAssets(ownerAddress, options = {}) {
    const { limit = 50, cursor = null } = options;
    
    const params = new URLSearchParams({
      owner: ownerAddress,
      limit: limit.toString()
    });
    
    if (cursor) {
      params.append('cursor', cursor);
    }

    const cacheKey = `assets_${ownerAddress}_${cursor || 'first'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const data = await this.request(`/assets?${params.toString()}`);
    this.setCache(cacheKey, data);
    
    return data;
  }

  async getCollection(collectionSlug) {
    const cacheKey = `collection_${collectionSlug}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const data = await this.request(`/collections/${collectionSlug}`);
    this.setCache(cacheKey, data);
    
    return data;
  }

  async getAccountBalance(address) {
    return this.getAssets(address, { limit: 100 });
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
const openSeaAPI = new OpenSeaAPI(API_KEY);

export default openSeaAPI;
```

This API layer includes several important features:

- Caching: Reduces API calls and improves performance
- Error Handling: Graceful error reporting for failed requests
- Pagination Support: Handles cursor-based pagination for large collections
- Configurable Limits: Users can fetch different numbers of assets

---

Storage Management {#storage-management}

Persistent storage is crucial for remembering user preferences and wallet addresses.

Storage Utility Module

Create `utils/storage.js`:

```javascript
// utils/storage.js

const STORAGE_KEYS = {
  WALLET_ADDRESS: 'wallet_address',
  WATCHED_COLLECTIONS: 'watched_collections',
  THEME: 'theme',
  REFRESH_INTERVAL: 'refresh_interval',
  LAST_SYNC: 'last_sync'
};

class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
  }

  async setWalletAddress(address) {
    await this.storage.set({ [STORAGE_KEYS.WALLET_ADDRESS]: address });
  }

  async getWalletAddress() {
    const result = await this.storage.get(STORAGE_KEYS.WALLET_ADDRESS);
    return result[STORAGE_KEYS.WALLET_ADDRESS] || null;
  }

  async setWatchedCollections(collections) {
    await this.storage.set({ [STORAGE_KEYS.WATCHED_COLLECTIONS]: collections });
  }

  async getWatchedCollections() {
    const result = await this.storage.get(STORAGE_KEYS.WATCHED_COLLECTIONS);
    return result[STORAGE_KEYS.WATCHED_COLLECTIONS] || [];
  }

  async setTheme(theme) {
    await this.storage.set({ [STORAGE_KEYS.THEME]: theme });
  }

  async getTheme() {
    const result = await this.storage.get(STORAGE_KEYS.THEME);
    return result[STORAGE_KEYS.THEME] || 'dark';
  }

  async setLastSync(timestamp) {
    await this.storage.set({ [STORAGE_KEYS.LAST_SYNC]: timestamp });
  }

  async getLastSync() {
    const result = await this.storage.get(STORAGE_KEYS.LAST_SYNC);
    return result[STORAGE_KEYS.LAST_SYNC] || null;
  }

  async clearAll() {
    await this.storage.clear();
  }
}

export default new StorageManager();
export { STORAGE_KEYS };
```

---

Building the Popup UI {#building-popup-ui}

The popup is the main interface users interact with. It needs to be clean, responsive, and provide quick access to portfolio information.

Popup HTML

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NFT Gallery</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>NFT Gallery</h1>
      <button id="settingsBtn" class="icon-btn" aria-label="Settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </header>

    <div id="connectView" class="view">
      <div class="welcome">
        <h2>Welcome to NFT Gallery</h2>
        <p>Connect your wallet to view your NFT collection</p>
      </div>
      <form id="connectForm" class="connect-form">
        <input 
          type="text" 
          id="walletAddress" 
          placeholder="Enter wallet address (0x...)"
          class="wallet-input"
        >
        <button type="submit" class="btn btn-primary">Connect Wallet</button>
      </form>
      <p class="help-text">
        Don't have a wallet? <a href="https://metamask.io/" target="_blank">Get MetaMask</a>
      </p>
    </div>

    <div id="portfolioView" class="view hidden">
      <div class="portfolio-summary">
        <div class="stat-card">
          <span class="stat-label">Total NFTs</span>
          <span id="totalCount" class="stat-value">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Collections</span>
          <span id="collectionCount" class="stat-value">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Est. Floor Value</span>
          <span id="floorValue" class="stat-value">0 ETH</span>
        </div>
      </div>

      <div class="refresh-bar">
        <span id="lastSync" class="last-sync">Last updated: Never</span>
        <button id="refreshBtn" class="btn btn-small">Refresh</button>
      </div>

      <div id="nftGrid" class="nft-grid">
        <!-- NFT items will be inserted here -->
      </div>

      <button id="disconnectBtn" class="btn btn-secondary btn-full">
        Disconnect Wallet
      </button>
    </div>

    <div id="settingsView" class="view hidden">
      <h2>Settings</h2>
      <div class="setting-item">
        <label for="refreshInterval">Auto-refresh interval</label>
        <select id="refreshInterval" class="select-input">
          <option value="5">5 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="themeSelect">Theme</label>
        <select id="themeSelect" class="select-input">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <button id="saveSettings" class="btn btn-primary btn-full">Save Settings</button>
      <button id="backBtn" class="btn btn-secondary btn-full">Back</button>
    </div>
  </div>

  <div id="loadingOverlay" class="loading-overlay hidden">
    <div class="spinner"></div>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

Popup CSS

Create `popup/popup.css`:

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f3460;
  --text-primary: #eaeaea;
  --text-secondary: #a0a0a0;
  --accent: #e94560;
  --accent-hover: #ff6b6b;
  --border: #2a2a4a;
  --success: #4ade80;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 380px;
  min-height: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.container {
  padding: 16px;
}

.hidden {
  display: none !important;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent), #ff9a8b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

/* Views */
.view {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Welcome & Connect */
.welcome {
  text-align: center;
  margin-bottom: 24px;
}

.welcome h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.welcome p {
  color: var(--text-secondary);
  font-size: 14px;
}

.connect-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wallet-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.wallet-input:focus {
  border-color: var(--accent);
}

.wallet-input::placeholder {
  color: var(--text-secondary);
}

/* Buttons */
.btn {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-full {
  width: 100%;
}

.help-text {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.help-text a {
  color: var(--accent);
  text-decoration: none;
}

/* Portfolio Summary */
.portfolio-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--bg-card);
  padding: 12px 8px;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Refresh Bar */
.refresh-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.last-sync {
  font-size: 11px;
  color: var(--text-secondary);
}

/* NFT Grid */
.nft-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 4px;
}

.nft-grid::-webkit-scrollbar {
  width: 4px;
}

.nft-grid::-webkit-scrollbar-thumb {
  background: var(--bg-card);
  border-radius: 2px;
}

.nft-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: var(--bg-card);
  cursor: pointer;
}

.nft-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.nft-item:hover img {
  transform: scale(1.05);
}

.nft-item-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  font-size: 10px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Settings */
.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.select-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: var(--accent);
}

/* Loading */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 46, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-card);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

Popup JavaScript

Create `popup/popup.js`:

```javascript
import openSeaAPI from '../utils/api.js';
import storageManager, { STORAGE_KEYS } from '../utils/storage.js';

class NFTGallery {
  constructor() {
    this.currentView = 'connect';
    this.nfts = [];
    this.collections = new Map();
    
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.checkExistingWallet();
  }

  bindEvents() {
    // Connect form
    document.getElementById('connectForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.connectWallet();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshPortfolio();
    });

    // Disconnect button
    document.getElementById('disconnectBtn').addEventListener('click', () => {
      this.disconnectWallet();
    });

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showView('settings');
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      this.showView('portfolio');
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });
  }

  showView(viewName) {
    const views = ['connectView', 'portfolioView', 'settingsView'];
    views.forEach(view => {
      document.getElementById(view).classList.add('hidden');
    });
    
    document.getElementById(`${viewName}View`).classList.remove('hidden');
    this.currentView = viewName;
  }

  async checkExistingWallet() {
    const walletAddress = await storageManager.getWalletAddress();
    
    if (walletAddress) {
      this.showView('portfolio');
      await this.loadPortfolio(walletAddress);
    } else {
      this.showView('connect');
    }
  }

  async connectWallet() {
    const addressInput = document.getElementById('walletAddress');
    const address = addressInput.value.trim();
    
    if (!this.isValidAddress(address)) {
      alert('Please enter a valid Ethereum wallet address');
      return;
    }

    this.showLoading(true);
    
    try {
      await storageManager.setWalletAddress(address);
      await this.loadPortfolio(address);
      this.showView('portfolio');
    } catch (error) {
      alert('Failed to load portfolio. Please check the wallet address.');
      console.error(error);
    } finally {
      this.showLoading(false);
    }
  }

  async loadPortfolio(address) {
    try {
      const response = await openSeaAPI.getAssets(address, { limit: 50 });
      
      this.nfts = response.assets || [];
      this.processCollections();
      this.renderNFTs();
      this.updateStats();
      await storageManager.setLastSync(Date.now());
      this.updateLastSyncTime();
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      throw error;
    }
  }

  processCollections() {
    this.collections.clear();
    
    this.nfts.forEach(nft => {
      const collectionName = nft.collection?.name || 'Unknown';
      
      if (!this.collections.has(collectionName)) {
        this.collections.set(collectionName, {
          name: collectionName,
          slug: nft.collection?.slug,
          floorPrice: nft.collection?.floor_price || 0,
          count: 0
        });
      }
      
      const collection = this.collections.get(collectionName);
      collection.count++;
    });
  }

  renderNFTs() {
    const grid = document.getElementById('nftGrid');
    grid.innerHTML = '';

    this.nfts.forEach(nft => {
      const item = document.createElement('div');
      item.className = 'nft-item';
      item.innerHTML = `
        <img src="${nft.image_url || nft.image_preview_url || ''}" alt="${nft.name || 'NFT'}" loading="lazy">
        <div class="nft-item-overlay">${nft.name || 'Unnamed NFT'}</div>
      `;
      
      item.addEventListener('click', () => {
        if (nft.external_link) {
          chrome.tabs.create({ url: nft.external_link });
        }
      });
      
      grid.appendChild(item);
    });
  }

  updateStats() {
    document.getElementById('totalCount').textContent = this.nfts.length;
    document.getElementById('collectionCount').textContent = this.collections.size;
    
    let totalFloor = 0;
    this.collections.forEach(collection => {
      totalFloor += collection.floorPrice || 0;
    });
    
    document.getElementById('floorValue').textContent = `${totalFloor.toFixed(2)} ETH`;
  }

  async refreshPortfolio() {
    const walletAddress = await storageManager.getWalletAddress();
    if (walletAddress) {
      await this.loadPortfolio(walletAddress);
    }
  }

  async disconnectWallet() {
    await storageManager.clearAll();
    this.nfts = [];
    this.collections.clear();
    document.getElementById('walletAddress').value = '';
    this.showView('connect');
  }

  updateLastSyncTime() {
    const lastSync = storageManager.getLastSync();
    const lastSyncEl = document.getElementById('lastSync');
    
    if (lastSync) {
      const date = new Date(lastSync);
      lastSyncEl.textContent = `Last updated: ${date.toLocaleTimeString()}`;
    }
  }

  async saveSettings() {
    const refreshInterval = document.getElementById('refreshInterval').value;
    const theme = document.getElementById('themeSelect').value;
    
    await storageManager.storage.set({
      [STORAGE_KEYS.REFRESH_INTERVAL]: refreshInterval,
      [STORAGE_KEYS.THEME]: theme
    });
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    
    this.showView('portfolio');
  }

  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new NFTGallery();
});
```

---

Background Service Worker {#background-service-worker}

The background service worker handles periodic tasks and manages extension lifecycle events.

Create `background.js`:

```javascript
// background.js

chrome.runtime.onInstalled.addListener((details) => {
  console.log('NFT Gallery extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      refreshInterval: 15,
      theme: 'dark'
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'refreshPortfolio') {
    // Trigger a background refresh
    console.log('Background refresh requested');
    sendResponse({ status: 'success' });
  }
  
  return true;
});

// Schedule periodic refreshes (if user has set up auto-refresh)
chrome.alarms.create('portfolioRefresh', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'portfolioRefresh') {
    console.log('Portfolio auto-refresh triggered');
    // In a production app, you might update cached data here
  }
});
```

---

Advanced Features {#advanced-features}

Now that we have a working NFT gallery extension, let us explore several advanced features that can make your extension truly stand out.

Adding Wallet Connection with MetaMask

For a more smooth experience, you can integrate MetaMask wallet connection:

```javascript
// Add to popup.js

async function connectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        return accounts[0];
      }
    } catch (error) {
      console.error('MetaMask connection failed:', error);
    }
  } else {
    alert('MetaMask is not installed. Please install MetaMask to use this feature.');
  }
  return null;
}

// Update connect handler
document.getElementById('connectMetaMask').addEventListener('click', async () => {
  const address = await connectMetaMask();
  if (address) {
    document.getElementById('walletAddress').value = address;
    await connectWallet();
  }
});
```

Collection Watchlist

Add the ability to watch specific collections:

```javascript
// Add to storage.js and popup.js

async function addToWatchlist(collectionSlug) {
  const watched = await storageManager.getWatchedCollections();
  
  if (!watched.includes(collectionSlug)) {
    watched.push(collectionSlug);
    await storageManager.setWatchedCollections(watched);
  }
}

async function removeFromWatchlist(collectionSlug) {
  const watched = await storageManager.getWatchedCollections();
  const filtered = watched.filter(s => s !== collectionSlug);
  await storageManager.setWatchedCollections(filtered);
}
```

Floor Price Alerts

Implement price tracking with notifications:

```javascript
// background.js - Add price monitoring

async function checkFloorPrices() {
  const watchedCollections = await storageManager.getWatchedCollections();
  const prices = await chrome.storage.local.get('collectionPrices') || {};
  
  for (const slug of watchedCollections) {
    try {
      const data = await openSeaAPI.getCollection(slug);
      const newFloor = data.collection?.floor_price;
      const oldFloor = prices[slug];
      
      if (oldFloor && newFloor) {
        const change = ((newFloor - oldFloor) / oldFloor) * 100;
        
        // Notify if price changed significantly
        if (Math.abs(change) > 10) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'NFT Price Alert',
            message: `${data.collection.name} floor price changed by ${change.toFixed(1)}%`
          });
        }
      }
      
      prices[slug] = newFloor;
    } catch (error) {
      console.error(`Failed to check collection: ${slug}`);
    }
  }
  
  await chrome.storage.local.set({ collectionPrices: prices });
}
```

---

Testing Your Extension {#testing-extension}

Testing is crucial for a production-ready extension. Here is how to test your NFT Gallery:

Manual Testing

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select your extension directory
4. Click the extension icon to open the popup
5. Enter a known wallet address (you can find sample addresses on Etherscan)
6. Verify that NFTs load correctly

Test Wallet Addresses

Here are some popular wallet addresses you can use for testing:

- Bored Ape Yacht Club Creator: `0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D`
- CryptoPunks Creator: `0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB`
- Pudgy Penguins: `0xBd3531dA5CF5857e7CfAA92426880bBd73534B98`

Debugging Tips

- Use `chrome://extensions/` and click "service worker" to see console logs
- Inspect popup with right-click → Inspect popup
- Check Network tab in DevTools for API calls

---

Publishing to the Chrome Web Store {#publishing}

Once your extension is tested and polished, follow these steps to publish:

Prepare for Submission

1. Create icons: Generate 16x16, 48x48, and 128x128 PNG icons
2. Write description: Clearly explain features and permissions
3. Create screenshots: Capture 1280x800 screenshots of your extension
4. Privacy policy: Required since the extension makes network requests

Submission Process

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Create a new item and upload your extension as a ZIP file
3. Fill in the store listing details
4. Submit for review

Store Listing Best Practices

- Use a clear, descriptive title
- Highlight key features in bullet points
- Include high-quality screenshots showing the popup UI
- Set appropriate categories and tags

---

Conclusion {#conclusion}

Congratulations! You have built a fully functional NFT Gallery Chrome Extension using the OpenSea API. This extension demonstrates several key concepts:

- API Integration: Connecting to external APIs (OpenSea) from a Chrome extension
- Storage Management: Persisting user preferences and wallet addresses
- Popup UI: Creating a responsive, attractive user interface
- Background Processing: Handling periodic updates and notifications
- Web3 Concepts: Working with blockchain addresses and NFT data

Future Enhancements

To take this extension further, consider adding:

1. Multi-chain support: Add support for Polygon, Solana, and other chains
2. Portfolio analytics: Charts showing portfolio value over time
3. Trait filtering: Filter NFTs by attributes and rarity
4. Collection comparison: Compare multiple collections side by side
5. Sell/Transfer features: Integrate with marketplace listing APIs

Continue Learning

For more Chrome extension development resources, explore our guides on:

- [Chrome Extension Development 2025](/2025/01/16/chrome-extension-development-2025-complete-beginners-guide/)
- [Extension Performance Optimization](/2025/01/16/chrome-extension-performance-optimization-guide/)
- [Publishing Your Extension](/docs/publishing/)

The Web3 ecosystem is evolving rapidly, and Chrome extensions provide a unique way to bring blockchain functionality directly to users' browsers. Start building today and help shape the future of Web3 UX!


---

*This guide is part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by theluckystrike. your comprehensive resource for Chrome extension development.*
