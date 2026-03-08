---
layout: default
title: "Chrome Extension Price Tracker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-price-tracker/"
---
# Build a Price Tracker Extension

Build a Chrome extension that detects product prices on e-commerce pages, tracks them over time, shows price history sparklines, sends notifications on price drops, and provides a side panel for managing all tracked products. Uses **@theluckystrike/webext-storage** for persistent product data and **chrome.alarms** for background price checking.

## Prerequisites {#prerequisites}

- Chrome 116+ with Developer Mode enabled
- Node.js 18+ and npm
- Familiarity with Chrome extension basics (manifest, content scripts, service workers)

---

## Step 1: Project Setup and Manifest {#step-1-project-setup-and-manifest}

```bash
mkdir price-tracker && cd price-tracker
npm init -y
npm install @theluckystrike/webext-storage
npm install -D typescript @types/chrome
```

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Price Tracker",
  "version": "1.0.0",
  "description": "Track product prices, view history, and get notified on price drops.",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "sidePanel",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://www.amazon.com/*",
    "https://www.amazon.co.uk/*",
    "https://www.bestbuy.com/*",
    "https://www.walmart.com/*",
    "https://www.target.com/*",
    "https://www.ebay.com/*"
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
    "service_worker": "background.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.amazon.com/*",
        "https://www.amazon.co.uk/*",
        "https://www.bestbuy.com/*",
        "https://www.walmart.com/*",
        "https://www.target.com/*",
        "https://www.ebay.com/*"
      ],
      "js": ["content/price-detector.js"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

`sidePanel` enables the Chrome side panel for viewing all tracked products. `activeTab` and `scripting` let us inject price detection on arbitrary product pages. `alarms` powers periodic background price checks. `notifications` delivers price drop alerts.

---

## Step 2: Content Script to Detect Product Prices {#step-2-content-script-to-detect-product-prices}

Create `src/content/price-detector.ts`. This script runs on supported e-commerce sites and extracts product info:

```typescript
// src/content/price-detector.ts

interface DetectedProduct {
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl: string;
  site: string;
}

const SITE_CONFIGS: Record<string, { title: string; price: string; image: string }> = {
  "www.amazon.com": {
    title: "#productTitle",
    price: ".a-price .a-offscreen",
    image: "#landingImage",
  },
  "www.bestbuy.com": {
    title: ".sku-title h1",
    price: '.priceView-customer-price span[aria-hidden="true"]',
    image: ".primary-image",
  },
  "www.walmart.com": {
    title: '[itemprop="name"]',
    price: '[itemprop="price"]',
    image: '[data-testid="hero-image"] img',
  },
  "www.ebay.com": {
    title: ".x-item-title__mainTitle",
    price: ".x-price-primary span",
    image: ".ux-image-carousel-item img",
  },
};

function parsePrice(text: string): { price: number; currency: string } {
  const cleaned = text.replace(/[^\d.,\$\u20AC\u00A3]/g, "").trim();
  let currency = "USD";
  if (cleaned.includes("\u20AC")) currency = "EUR";
  if (cleaned.includes("\u00A3")) currency = "GBP";
  const numStr = cleaned.replace(/[\$\u20AC\u00A3]/g, "").replace(/,/g, "");
  const price = parseFloat(numStr);
  return { price: isNaN(price) ? 0 : price, currency };
}

function detectProduct(): DetectedProduct | null {
  const hostname = window.location.hostname;
  const config = SITE_CONFIGS[hostname];
  if (!config) return null;

  const titleEl = document.querySelector(config.title);
  const priceEl = document.querySelector(config.price);
  const imageEl = document.querySelector(config.image) as HTMLImageElement | null;
  if (!titleEl || !priceEl) return null;

  const { price, currency } = parsePrice(priceEl.textContent ?? "");
  if (price <= 0) return null;

  return {
    title: (titleEl.textContent ?? "").trim().slice(0, 120),
    price, currency,
    url: window.location.href.split("?")[0],
    imageUrl: imageEl?.src ?? "",
    site: hostname.replace("www.", ""),
  };
}

function injectTrackButton(product: DetectedProduct): void {
  const existing = document.getElementById("price-tracker-btn");
  if (existing) existing.remove();

  const btn = document.createElement("button");
  btn.id = "price-tracker-btn";
  const sym = product.currency === "USD" ? "$" : product.currency;
  btn.textContent = `Track: ${sym}${product.price.toFixed(2)}`;
  btn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 99999;
    padding: 12px 20px; background: #1a73e8; color: #fff;
    border: none; border-radius: 8px; font-size: 14px; font-weight: bold;
    cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "TRACK_PRODUCT", product }, (response) => {
      if (response?.success) {
        btn.textContent = "Tracking!";
        btn.style.background = "#0d7d4d";
        setTimeout(() => btn.remove(), 2000);
      }
    });
  });

  document.body.appendChild(btn);
}

setTimeout(() => {
  const product = detectProduct();
  if (product) injectTrackButton(product);
}, 1500);
```

The content script uses site-specific CSS selectors to extract product titles, prices, and images. A floating "Track Price" button appears on recognized product pages.

---

## Step 3: Save Tracked Products with @theluckystrike/webext-storage {#step-3-save-tracked-products-with-theluckystrikewebext-storage}

Create `src/storage.ts`:

```typescript
// src/storage.ts

import { createStorage } from "@theluckystrike/webext-storage";

export interface PriceEntry {
  price: number;
  timestamp: number;
}

export interface TrackedProduct {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  site: string;
  currency: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  targetPrice: number | null;
  priceHistory: PriceEntry[];
  addedAt: number;
  lastChecked: number;
}

export interface TrackerSettings {
  checkIntervalMinutes: number;
  notificationsEnabled: boolean;
  priceDropThresholdPercent: number;
}

export const productsStorage = createStorage<TrackedProduct[]>("trackedProducts", []);

export const settingsStorage = createStorage<TrackerSettings>("trackerSettings", {
  checkIntervalMinutes: 60,
  notificationsEnabled: true,
  priceDropThresholdPercent: 5,
});

function generateId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return `product_${Math.abs(hash).toString(36)}`;
}

export async function addProduct(
  product: Omit<TrackedProduct, "id" | "lowestPrice" | "highestPrice" | "targetPrice" | "priceHistory" | "addedAt" | "lastChecked">
): Promise<TrackedProduct> {
  const products = await productsStorage.get();
  const existing = products.find((p) => p.url === product.url);
  if (existing) return existing;

  const newProduct: TrackedProduct = {
    ...product,
    id: generateId(product.url),
    lowestPrice: product.currentPrice,
    highestPrice: product.currentPrice,
    targetPrice: null,
    priceHistory: [{ price: product.currentPrice, timestamp: Date.now() }],
    addedAt: Date.now(),
    lastChecked: Date.now(),
  };

  await productsStorage.set([...products, newProduct]);
  return newProduct;
}

export async function updateProductPrice(
  id: string, newPrice: number
): Promise<{ product: TrackedProduct; dropped: boolean; dropPercent: number }> {
  const products = await productsStorage.get();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);

  const product = products[idx];
  const prev = product.currentPrice;
  const dropped = newPrice < prev;
  const dropPercent = prev > 0 ? ((prev - newPrice) / prev) * 100 : 0;

  product.currentPrice = newPrice;
  product.lowestPrice = Math.min(product.lowestPrice, newPrice);
  product.highestPrice = Math.max(product.highestPrice, newPrice);
  product.priceHistory.push({ price: newPrice, timestamp: Date.now() });
  product.lastChecked = Date.now();

  // Keep last 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  product.priceHistory = product.priceHistory.filter((e) => e.timestamp > cutoff);

  products[idx] = product;
  await productsStorage.set(products);
  return { product, dropped, dropPercent };
}

export async function removeProduct(id: string): Promise<void> {
  const products = await productsStorage.get();
  await productsStorage.set(products.filter((p) => p.id !== id));
}

export async function setTargetPrice(id: string, target: number): Promise<void> {
  const products = await productsStorage.get();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return;
  products[idx].targetPrice = target;
  await productsStorage.set(products);
}
```

Each product stores its full price history (trimmed to 90 days), lowest/highest prices, and an optional target price. The `updateProductPrice` function returns whether a drop occurred and by how much.

---

## Step 4: Background Price Checking with chrome.alarms {#step-4-background-price-checking-with-chromealarms}

Create `src/background.ts`:

```typescript
// src/background.ts

import {
  productsStorage, settingsStorage, addProduct,
  updateProductPrice, TrackedProduct,
} from "./storage";

const ALARM_NAME = "check-prices";

async function scheduleAlarm(): Promise<void> {
  const settings = await settingsStorage.get();
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: settings.checkIntervalMinutes,
  });
}

async function fetchCurrentPrice(product: TrackedProduct): Promise<number | null> {
  try {
    const response = await fetch(product.url);
    const html = await response.text();
    const patterns = [
      /"price":\s*"?([\d.,]+)"?/,
      /itemprop="price"\s+content="([\d.,]+)"/,
      /data-price="([\d.,]+)"/,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (price > 0) return price;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function notifyPriceDrop(product: TrackedProduct, newPrice: number, dropPercent: number): void {
  const sym = product.currency === "USD" ? "$" : product.currency + " ";
  chrome.notifications.create(`price-drop-${product.id}`, {
    type: "basic",
    iconUrl: "../icons/icon128.png",
    title: `Price dropped ${dropPercent.toFixed(0)}%!`,
    message: `${product.title.slice(0, 60)}\nNow: ${sym}${newPrice.toFixed(2)}`,
    buttons: [{ title: "View product" }],
    priority: 2,
    requireInteraction: true,
  });
}

function notifyTargetReached(product: TrackedProduct, price: number): void {
  const sym = product.currency === "USD" ? "$" : product.currency + " ";
  chrome.notifications.create(`target-${product.id}`, {
    type: "basic",
    iconUrl: "../icons/icon128.png",
    title: "Target price reached!",
    message: `${product.title.slice(0, 60)} is now ${sym}${price.toFixed(2)}`,
    buttons: [{ title: "Buy now" }],
    priority: 2,
    requireInteraction: true,
  });
}

async function checkAllPrices(): Promise<void> {
  const products = await productsStorage.get();
  const settings = await settingsStorage.get();

  for (const product of products) {
    try {
      const price = await fetchCurrentPrice(product);
      if (price === null || price <= 0) continue;

      const { dropped, dropPercent } = await updateProductPrice(product.id, price);

      if (settings.notificationsEnabled && dropped && dropPercent >= settings.priceDropThresholdPercent) {
        notifyPriceDrop(product, price, dropPercent);
      }
      if (product.targetPrice && price <= product.targetPrice) {
        notifyTargetReached(product, price);
      }
    } catch (err) {
      console.error(`[Price Tracker] check failed for ${product.site}:`, err);
    }
    await new Promise((r) => setTimeout(r, 2000)); // stagger requests
  }
  updateBadge();
}

async function updateBadge(): Promise<void> {
  const products = await productsStorage.get();
  await chrome.action.setBadgeText({ text: products.length > 0 ? String(products.length) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#1a73e8" });
}

// Message handler for content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "TRACK_PRODUCT") {
    addProduct({
      title: message.product.title,
      url: message.product.url,
      imageUrl: message.product.imageUrl,
      site: message.product.site,
      currency: message.product.currency,
      currentPrice: message.product.price,
    }).then((product) => {
      updateBadge();
      sendResponse({ success: true, product });
    });
    return true;
  }
});

// Notification actions
chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (buttonIndex === 0) {
    const productId = id.replace(/^(price-drop-|target-)/, "");
    productsStorage.get().then((products) => {
      const p = products.find((x) => x.id === productId);
      if (p) chrome.tabs.create({ url: p.url });
    });
  }
  chrome.notifications.clear(id);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkAllPrices();
});

settingsStorage.onChange(() => scheduleAlarm());

chrome.runtime.onInstalled.addListener(() => { scheduleAlarm(); updateBadge(); });
chrome.runtime.onStartup.addListener(() => { scheduleAlarm(); updateBadge(); });
```

The background worker iterates over all tracked products on each alarm cycle. Requests are staggered by 2 seconds to avoid rate limiting. Price drops exceeding the threshold trigger desktop notifications.

---

## Step 5: Price History Sparkline in Popup {#step-5-price-history-sparkline-in-popup}

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { width: 380px; max-height: 520px; margin: 0; padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .header h2 { margin: 0; font-size: 16px; }
    .product-card { display: flex; gap: 10px; padding: 10px;
      border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 8px; }
    .product-card:hover { border-color: #1a73e8; }
    .product-img { width: 56px; height: 56px; object-fit: contain; border-radius: 4px; }
    .product-info { flex: 1; min-width: 0; }
    .product-title { font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .price-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .current-price { font-weight: bold; font-size: 14px; color: #1a73e8; }
    .price-down { color: #0d7d4d; background: #e6f4ea; font-size: 11px; padding: 1px 4px; border-radius: 3px; }
    .price-up { color: #c5221f; background: #fce8e6; font-size: 11px; padding: 1px 4px; border-radius: 3px; }
    .sparkline { width: 80px; height: 24px; }
    .sparkline polyline { fill: none; stroke: #1a73e8; stroke-width: 1.5; }
    .sparkline .area { fill: rgba(26,115,232,0.1); stroke: none; }
    .btn { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; font-size: 11px; }
    .btn-remove { color: #c5221f; border-color: #c5221f; }
    .empty { text-align: center; color: #999; padding: 32px 0; }
    .toolbar { display: flex; gap: 6px; margin-top: 12px; justify-content: center; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Price Tracker</h2>
    <span id="count" style="color:#999;font-size:12px"></span>
  </div>
  <div id="productList"></div>
  <div class="toolbar">
    <button id="sidePanelBtn" class="btn">Side Panel</button>
    <button id="exportBtn" class="btn">Export</button>
    <button id="importBtn" class="btn">Import</button>
    <input type="file" id="importFile" accept=".json" style="display:none" />
  </div>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

Create `src/popup.ts`:

```typescript
// src/popup.ts

import { productsStorage, removeProduct, TrackedProduct, PriceEntry } from "./storage";

const productList = document.getElementById("productList")!;
const countEl = document.getElementById("count")!;

function renderSparkline(history: PriceEntry[]): string {
  if (history.length < 2) return "";
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80, h = 24;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}">
    <polygon class="area" points="0,${h} ${points.join(" ")} ${w},${h}" />
    <polyline points="${points.join(" ")}" />
  </svg>`;
}

function fmt(amount: number, currency: string): string {
  const s: Record<string, string> = { USD: "$", EUR: "\u20AC", GBP: "\u00A3" };
  return `${s[currency] ?? currency + " "}${amount.toFixed(2)}`;
}

function escapeHtml(str: string): string {
  const d = document.createElement("div"); d.textContent = str; return d.innerHTML;
}

function renderProduct(p: TrackedProduct): string {
  const change = p.priceHistory.length >= 2
    ? p.currentPrice - p.priceHistory[p.priceHistory.length - 2].price : 0;
  const cls = change < 0 ? "price-down" : change > 0 ? "price-up" : "";
  const txt = change !== 0
    ? `<span class="${cls}">${change < 0 ? "\u2193" : "\u2191"} ${fmt(Math.abs(change), p.currency)}</span>` : "";

  return `<div class="product-card" data-id="${p.id}">
    ${p.imageUrl ? `<img class="product-img" src="${p.imageUrl}" alt="" />` : ""}
    <div class="product-info">
      <div class="product-title" title="${p.title}">${escapeHtml(p.title)}</div>
      <div style="color:#999;font-size:11px">${p.site}</div>
      <div class="price-row">
        <span class="current-price">${fmt(p.currentPrice, p.currency)}</span>${txt}
        ${renderSparkline(p.priceHistory)}
      </div>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button class="btn" data-action="open" data-url="${p.url}">Open</button>
        <button class="btn btn-remove" data-action="remove" data-pid="${p.id}">Remove</button>
      </div>
    </div>
  </div>`;
}

async function loadProducts(): Promise<void> {
  const products = await productsStorage.get();
  countEl.textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;

  if (products.length === 0) {
    productList.innerHTML = '<div class="empty">No products tracked yet.<br>Visit a product page to start.</div>';
    return;
  }

  const sorted = [...products].sort((a, b) => b.addedAt - a.addedAt);
  productList.innerHTML = sorted.map(renderProduct).join("");

  document.querySelectorAll("[data-action='open']").forEach((btn) =>
    btn.addEventListener("click", () => chrome.tabs.create({ url: (btn as HTMLElement).dataset.url! })));
  document.querySelectorAll("[data-action='remove']").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await removeProduct((btn as HTMLElement).dataset.pid!);
      loadProducts();
    }));
}

document.getElementById("sidePanelBtn")!.addEventListener("click", () => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT } as chrome.sidePanel.OpenOptions);
});

document.getElementById("exportBtn")!.addEventListener("click", async () => {
  const products = await productsStorage.get();
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
  chrome.downloads.download({
    url: URL.createObjectURL(blob),
    filename: `price-tracker-export-${new Date().toISOString().slice(0, 10)}.json`,
    saveAs: true,
  });
});

document.getElementById("importBtn")!.addEventListener("click", () => {
  document.getElementById("importFile")!.click();
});

document.getElementById("importFile")!.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const imported: TrackedProduct[] = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Invalid");
    const existing = await productsStorage.get();
    const urls = new Set(existing.map((p) => p.url));
    await productsStorage.set([...existing, ...imported.filter((p) => !urls.has(p.url))]);
    loadProducts();
  } catch { alert("Invalid import file."); }
});

loadProducts();
```

The sparkline is a pure SVG element with no external charting library. Each price history array maps to coordinates within an 80x24 viewport with a semi-transparent area fill.

---

## Step 6: Price Drop Notifications {#step-6-price-drop-notifications}

Price drop notifications fire from the background worker (Step 4) when:

1. A new price is lower than the previous price by at least `priceDropThresholdPercent` (default 5%)
2. A price hits or goes below a user-set `targetPrice`

Notifications use `requireInteraction: true` so they persist until acted on. The "View product" button opens the product page directly.

---

## Step 7: Side Panel with All Tracked Products {#step-7-side-panel-with-all-tracked-products}

Create `sidepanel/sidepanel.html`. See [patterns/side-panel.md](../patterns/side-panel.md) for side panel best practices.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; }
    .filter-btn { padding: 4px 10px; border: 1px solid #ddd; border-radius: 16px;
      background: #fff; cursor: pointer; font-size: 12px; }
    .filter-btn.active { background: #1a73e8; color: #fff; border-color: #1a73e8; }
    .card { padding: 12px; border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 10px; }
    .sparkline-lg { width: 100%; height: 48px; margin: 8px 0; }
    .sparkline-lg polyline { fill: none; stroke: #1a73e8; stroke-width: 1.5; }
    .sparkline-lg .area { fill: rgba(26,115,232,0.08); stroke: none; }
    .target-input { width: 80px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
    .btn { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; font-size: 11px; }
  </style>
</head>
<body>
  <h2>Tracked Products</h2>
  <div class="filters">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="drops">Price Drops</button>
  </div>
  <div id="products"></div>
  <script src="sidepanel.js" type="module"></script>
</body>
</html>
```

Create `src/sidepanel.ts`:

```typescript
// src/sidepanel.ts

import { productsStorage, removeProduct, setTargetPrice, TrackedProduct, PriceEntry } from "./storage";

const productsEl = document.getElementById("products")!;
let currentFilter = "all";

function largeSparkline(history: PriceEntry[]): string {
  if (history.length < 2) return "<p style='color:#999;font-size:11px'>Not enough data</p>";
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const w = 300, h = 48;

  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg class="sparkline-lg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polygon class="area" points="0,${h} ${pts.join(" ")} ${w},${h}" />
    <polyline points="${pts.join(" ")}" />
  </svg>`;
}

function fmt(n: number, c: string): string {
  const s: Record<string, string> = { USD: "$", EUR: "\u20AC", GBP: "\u00A3" };
  return `${s[c] ?? c + " "}${n.toFixed(2)}`;
}

function renderCard(p: TrackedProduct): string {
  return `<div class="card">
    <div style="font-weight:600;font-size:13px">${p.title}</div>
    <div style="color:#1a73e8;font-weight:bold;font-size:16px">${fmt(p.currentPrice, p.currency)}</div>
    <div style="color:#666;font-size:12px">Low: ${fmt(p.lowestPrice, p.currency)} | High: ${fmt(p.highestPrice, p.currency)} | ${p.site}</div>
    ${largeSparkline(p.priceHistory)}
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
      <label style="font-size:11px">Target:</label>
      <input class="target-input" type="number" step="0.01" placeholder="Set target"
        value="${p.targetPrice ?? ""}" data-tid="${p.id}" />
      <button class="btn" data-url="${p.url}">Open</button>
      <button class="btn" style="color:#c5221f" data-rid="${p.id}">Remove</button>
    </div>
  </div>`;
}

async function render(): Promise<void> {
  let products = await productsStorage.get();
  if (currentFilter === "drops") {
    products = products.filter((p) =>
      p.priceHistory.length >= 2 && p.currentPrice < p.priceHistory[p.priceHistory.length - 2].price);
  }
  if (products.length === 0) { productsEl.innerHTML = "<p style='color:#999'>No tracked products.</p>"; return; }

  products.sort((a, b) => b.addedAt - a.addedAt);
  productsEl.innerHTML = products.map(renderCard).join("");

  document.querySelectorAll("[data-url]").forEach((b) =>
    b.addEventListener("click", () => chrome.tabs.create({ url: (b as HTMLElement).dataset.url! })));
  document.querySelectorAll("[data-rid]").forEach((b) =>
    b.addEventListener("click", async () => { await removeProduct((b as HTMLElement).dataset.rid!); render(); }));
  document.querySelectorAll("[data-tid]").forEach((input) =>
    input.addEventListener("change", async (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      await setTargetPrice((input as HTMLElement).dataset.tid!, isNaN(val) ? 0 : val);
    }));
}

document.querySelectorAll(".filter-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = (btn as HTMLElement).dataset.filter!;
    render();
  }));

productsStorage.onChange(() => render());
render();
```

The side panel renders a larger sparkline for each product. Users can set target prices inline, filter by recent drops, and remove products. The `onChange` listener keeps the view in sync.

---

## Step 8: Export and Import Tracked Products {#step-8-export-and-import-tracked-products}

Export and import are wired up in the popup (Step 5). Export serializes the products array to a timestamped JSON file via `chrome.downloads`. Import reads a JSON file, validates the array, deduplicates by URL, and merges with existing data. This lets users back up tracked products, transfer between browsers, or share lists. See [patterns/data-sync.md](../patterns/data-sync.md) for more data portability patterns.

---

## Project Structure {#project-structure}

```
price-tracker/
  manifest.json
  tsconfig.json
  package.json
  icons/
    icon16.png
    icon48.png
    icon128.png
  src/
    content/price-detector.ts
    storage.ts
    background.ts
    popup.ts
    sidepanel.ts
  popup/popup.html
  sidepanel/sidepanel.html
```

## Key Takeaways {#key-takeaways}

- **Content scripts** with site-specific selectors reliably extract product data from major e-commerce sites
- **chrome.alarms** is essential for periodic background work in MV3 -- `setInterval` does not survive service worker termination
- **SVG sparklines** provide lightweight price history visualization without external charting dependencies
- **Side panels** offer more screen real estate than popups, ideal for data-heavy views
- **@theluckystrike/webext-storage** simplifies typed storage with reactive `onChange` for cross-context sync
- **Export/import** via JSON gives users full control over their data

## Cross-references {#cross-references}

- [patterns/side-panel.md](../patterns/side-panel.md) -- Side panel API patterns and best practices
- [patterns/data-sync.md](../patterns/data-sync.md) -- Data portability and sync strategies
-e 

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
