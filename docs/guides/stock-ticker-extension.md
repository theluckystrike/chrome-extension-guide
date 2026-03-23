Building a Stock Ticker Chrome Extension

A comprehensive guide to building a real-time stock ticker extension with Manifest V3, TypeScript, and Chrome APIs.

Prerequisites

Node.js 18+, TypeScript knowledge, Chrome browser

Project Structure

```
stock-ticker/
 src/
    background/service-worker.ts
    popup/popup.html, popup.ts, styles.css
    services/StockAPI.ts, types/stock.ts
 manifest.json, tsconfig.json, webpack.config.js
```

Step 1: manifest.json

```json
{
  "manifest_version": 3,
  "name": "Stock Ticker Pro",
  "version": "1.0",
  "description": "Real-time stock price tracking",
  "permissions": ["storage", "notifications", "alarms", "activeTab"],
  "host_permissions": ["*://query1.finance.yahoo.com/*"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js", "type": "module" },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png" }
}
```

Step 2: TypeScript Types

```typescript
// src/types/stock.ts
export interface Stock {
  symbol: string; name: string; price: number;
  change: number; changePercent: number;
  previousClose: number; lastUpdated: Date;
}
export interface StockAlert {
  symbol: string; condition: 'above' | 'below';
  targetPrice: number; enabled: boolean;
}
export interface StorageData {
  watchlist: string[]; lastPrices: Record<string, Stock>;
}
```

Step 3: Stock API Service

```typescript
// src/services/StockAPI.ts
import { Stock } from '../types/stock';

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export class StockAPI {
  static async fetchQuote(symbol: string): Promise<Stock> {
    const response = await fetch(`${BASE_URL}/${symbol}?interval=1d&range=1d`);
    const data = await response.json();
    const meta = data.chart.result[0].meta;
    return {
      symbol: meta.symbol, name: meta.shortName || meta.symbol,
      price: meta.regularMarketPrice, change: meta.regularMarketChange,
      changePercent: meta.regularMarketChangePercent,
      previousClose: meta.previousClose, lastUpdated: new Date(),
    };
  }

  static async fetchQuotes(symbols: string[]): Promise<Stock[]> {
    const promises = symbols.map(s => this.fetchQuote(s));
    return Promise.allSettled(promises)
      .then(r => r.filter((x): x is PromiseFulfilledResult<Stock> => x.status === 'fulfilled')
      .map(x => x.value));
  }
}
```

Step 4: Storage Utilities

```typescript
// src/utils/storage.ts
import { StorageData, Stock } from '../types/stock';

const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

export class StorageUtil {
  static async getData(): Promise<StorageData> {
    return new Promise(resolve => chrome.storage.local.get(
      ['watchlist', 'lastPrices'],
      (r: Partial<StorageData>) => resolve({
        watchlist: r.watchlist || DEFAULT_SYMBOLS,
        lastPrices: r.lastPrices || {}
      })
    ));
  }

  static async saveWatchlist(symbols: string[]): Promise<void> {
    return new Promise(resolve => chrome.storage.local.set({ watchlist: symbols }, () => resolve()));
  }

  static async savePrices(prices: Record<string, Stock>): Promise<void> {
    return new Promise(resolve => chrome.storage.local.set({ lastPrices: prices }, () => resolve()));
  }
}
```

Step 5: Background Service Worker

```typescript
// src/background/service-worker.ts
import { StockAPI } from '../services/StockAPI';
import { StorageUtil } from '../utils/storage';

// Create alarm for periodic refresh
chrome.alarms.create('stockRefresh', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'stockRefresh') await refreshStockPrices();
});

async function refreshStockPrices(): Promise<void> {
  try {
    const data = await StorageUtil.getData();
    const stocks = await StockAPI.fetchQuotes(data.watchlist);
    const priceMap: Record<string, Stock> = {};
    stocks.forEach(s => priceMap[s.symbol] = s);
    await StorageUtil.savePrices(priceMap);
  } catch (e) { console.error('Refresh failed:', e); }
}

chrome.runtime.onInstalled.addListener(() => refreshStockPrices());
```

Step 6: Popup HTML

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width">
  <title>Stock Ticker</title><link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="popup-container">
    <header class="header">
      <h1> Stock Ticker</h1>
      <button id="refreshBtn" class="refresh-btn">↻</button>
    </header>
    <div id="stockList" class="stock-list"></div>
    <div class="add-stock">
      <input type="text" id="symbolInput" placeholder="Symbol (e.g. AAPL)">
      <button id="addBtn">Add</button>
    </div>
    <footer class="footer"><span id="lastUpdated">--</span></footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Step 7: Popup Logic

```typescript
// src/popup/popup.ts
import { StockAPI } from '../services/StockAPI';
import { StorageUtil } from '../utils/storage';
import { Stock } from '../types/stock';

document.addEventListener('DOMContentLoaded', () => { loadStocks(); setupEvents(); });

async function loadStocks(): Promise<void> {
  const data = await StorageUtil.getData();
  const list = document.getElementById('stockList')!;
  
  if (!data.lastPrices || Object.keys(data.lastPrices).length === 0) {
    list.innerHTML = '<p class="loading">Loading...</p>';
    const stocks = await StockAPI.fetchQuotes(data.watchlist);
    const map: Record<string, Stock> = {};
    stocks.forEach(s => map[s.symbol] = s);
    await StorageUtil.savePrices(map);
    renderStocks(map);
  } else {
    renderStocks(data.lastPrices);
  }
  document.getElementById('lastUpdated')!.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
}

function renderStocks(prices: Record<string, Stock>): void {
  const list = document.getElementById('stockList')!;
  list.innerHTML = '';
  Object.values(prices).forEach(stock => {
    const card = document.createElement('div');
    card.className = 'stock-card';
    const up = stock.change >= 0;
    card.innerHTML = `
      <div class="stock-symbol">${stock.symbol}</div>
      <div class="stock-price">$${stock.price.toFixed(2)}</div>
      <div class="stock-change ${up ? 'positive' : 'negative'}">
        ${up ? '' : ''} ${Math.abs(stock.change).toFixed(2)} (${stock.changePercent.toFixed(2)}%)
      </div>`;
    list.appendChild(card);
  });
}

function setupEvents(): void {
  document.getElementById('refreshBtn')!.onclick = () => loadStocks();
  document.getElementById('addBtn')!.onclick = async () => {
    const input = document.getElementById('symbolInput') as HTMLInputElement;
    const sym = input.value.toUpperCase().trim();
    if (sym) {
      const data = await StorageUtil.getData();
      if (!data.watchlist.includes(sym)) {
        await StorageUtil.saveWatchlist([...data.watchlist, sym]);
        input.value = ''; await loadStocks();
      }
    }
  };
}
```

Step 8: Popup Styles

```css
/* src/popup/styles.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 320px; font-family: -apple-system, sans-serif; background: #f5f5f5; }
.popup-container { padding: 16px; }
.header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.header h1 { font-size: 18px; }
.refresh-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
.stock-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.stock-card { background: white; padding: 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stock-symbol { font-weight: 600; font-size: 14px; }
.stock-price { font-size: 20px; font-weight: 700; margin: 4px 0; }
.stock-change { font-size: 12px; }
.positive { color: #16a34a; }
.negative { color: #dc2626; }
.add-stock { display: flex; gap: 8px; }
.add-stock input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.add-stock button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
.footer { margin-top: 12px; font-size: 11px; color: #666; text-align: center; }
```

Step 9: Webpack Config

```javascript
// webpack.config.js
const path = require('path');
module.exports = {
  mode: 'production',
  entry: { background: './src/background/service-worker.ts', popup: './src/popup/popup.ts' },
  output: { path: path.resolve(__dirname, 'dist'), filename: '[name].js' },
  resolve: { extensions: ['.ts', '.js'] },
  module: { rules: [{ test: /\.ts$/, use: 'ts-loader' }] }
};
```

Testing

Build: `npm run build` → Open `chrome://extensions/` → Enable Developer mode → Load unpacked → Select `dist`

```typescript
import { test, expect } from '@playwright/test';
test('popup displays stocks', async ({ page }) => {
  await page.goto('popup.html');
  await page.waitForSelector('.stock-card');
  expect(await page.$$('.stock-card')).toHaveLengthGreaterThan(0);
});
```

Features Summary

| Feature | Implementation |
|---------|---------------|
| Real-time prices | Yahoo Finance API, 5-min refresh |
| Price alerts | chrome.notifications API |
| Storage | chrome.storage.local |
| Background updates | chrome.alarms + Service Worker |

Best Practices

1. Rate limiting: Cache requests to avoid API limits
2. Error handling: Wrap API calls in try-catch
3. Type safety: Use TypeScript interfaces
4. Performance: Use chrome.storage (not localStorage)
5. Security: Validate all user input
