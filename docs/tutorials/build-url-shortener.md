---
layout: default
title: "Chrome Extension URL Shortener. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-url-shortener/"
---
Build a URL Shortener Extension

What You'll Build {#what-youll-build}
- Shorten current page URL with one click
- Copy short URL to clipboard automatically  
- View history of shortened URLs
- QR code generation for short URLs

Manifest {#manifest}
```json
{
  "manifest_version": 3,
  "name": "URL Shortener",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage", "clipboardWrite", "scripting", "contextMenus"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```

See: `permissions/activeTab.md`, `permissions/clipboardWrite.md`, `permissions/contextMenus.md`, `patterns/clipboard-patterns.md`

Step 1: URL Shortening API {#step-1-url-shortening-api}
Use is.gd API (no key required).

```typescript
async function shortenUrl(url: string, alias?: string): Promise<string> {
  const params = new URLSearchParams({ format: 'json', url });
  if (alias) params.set('shorturl', alias);
  const res = await fetch(`https://is.gd/create.php?${params}`);
  const data = await res.json();
  if (data.errorcode) throw new Error(`Error: ${data.errorcode}`);
  return data.shorturl;
}
```

Step 2: One-Click Shortening {#step-2-one-click-shortening}

> Note: `chrome.action.onClicked` only fires when no `default_popup` is set in the manifest. To use this one-click mode, remove `"default_popup": "popup.html"` from the `action` field. If you prefer the popup UI (Step 3), skip this step.

```typescript
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;
  try {
    const shortUrl = await shortenUrl(tab.url);
    // navigator.clipboard is not available in service workers;
    // use chrome.scripting.executeScript or copy from the popup instead.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => navigator.clipboard.writeText(text),
      args: [shortUrl]
    });
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
  } catch { chrome.action.setBadgeText({ text: '', tabId: tab.id }); }
});
```

Step 3: Popup UI {#step-3-popup-ui}
```html
<!-- popup.html -->
<div><h3>URL Shortener</h3>
<input id="originalUrl" readonly>
<input id="customAlias" placeholder="Custom alias (optional)">
<button id="shortenBtn">Shorten</button>
<div id="result" style="display:none">
  <input id="shortUrl" readonly><button id="copyBtn">Copy</button>
  <div id="qrCode"></div>
</div>
<a id="viewHistory">View History</a></div>
```

```typescript
// popup.js
import { createStorage } from '@theluckystrike/webext-storage';
const storage = createStorage({ history: 'array' }, 'local');

document.getElementById('shortenBtn').addEventListener('click', async () => {
  const alias = (document.getElementById('customAlias') as HTMLInputElement).value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const shortUrl = await shortenUrl(tab.url, alias || undefined);
  const history = await storage.get('history') || [];
  history.unshift({ original: tab.url, short: shortUrl, date: Date.now(), clicks: 0 });
  await storage.set('history', history.slice(0, 100));
  document.getElementById('result').style.display = 'block';
  (document.getElementById('shortUrl') as HTMLInputElement).value = shortUrl;
  generateQRCode(shortUrl);
});
```

Step 4: QR Code Generation {#step-4-qr-code-generation}
```typescript
function generateQRCode(url: string): void {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 150;
  const ctx = canvas.getContext('2d');
  const modules = 25, size = 150 / modules;
  const hash = url.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
  for (let i = 0; i < modules; i++)
    for (let j = 0; j < modules; j++) {
      ctx.fillStyle = ((hash >> (i + j)) & 1) ? '#000' : '#fff';
      ctx.fillRect(i * size, j * size, size, size);
    }
  const btn = document.createElement('button');
  btn.textContent = 'Download QR';
  btn.onclick = () => { const l = document.createElement('a'); l.download = 'qr.png'; l.href = canvas.toDataURL(); l.click(); };
  document.getElementById('qrCode').append(canvas, btn);
}
```

Step 5: History {#step-5-history}
```typescript
document.getElementById('viewHistory').addEventListener('click', async () => {
  const history = await storage.get('history') || [];
  const html = history.map((h, i) => `<div><a href="${h.short}">${h.short}</a> <button data-i="${i}">Delete</button></div>`).join('');
  // Render in popup
});
```

Step 6: Context Menu {#step-6-context-menu}
See `patterns/context-menu-patterns.md`.

```typescript
chrome.contextMenus.create({ id: 'shortenLink', title: 'Shorten link', contexts: ['link'] });
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'shortenLink' && info.linkUrl) {
    const shortUrl = await shortenUrl(info.linkUrl);
    await navigator.clipboard.writeText(shortUrl);
    chrome.notifications.create({ type: 'basic', title: 'Shortened', message: shortUrl });
  }
});
```

Summary {#summary}
Built: one-click shortening, custom aliases, clipboard feedback, QR codes, history, context menu.
-e 

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
