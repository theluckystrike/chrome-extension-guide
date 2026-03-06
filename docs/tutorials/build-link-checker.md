# Build a Link Checker Extension

## What You'll Build

A Chrome extension that scans pages for broken links, checks HTTP status, highlights results, and generates reports.

## Manifest Configuration

```json
{
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup.html" }
}
```

## Step 1: Extract Links

Content script to get all page links:

```javascript
// content.js
function extractLinks() {
  const anchors = document.querySelectorAll('a[href]');
  return Array.from(anchors).map(a => ({
    href: a.href,
    text: a.textContent.trim().substring(0, 50)
  }));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractLinks') {
    sendResponse({ links: extractLinks() });
  }
  return true;
});
```

## Step 2: Background Link Checking

Background script handles HTTP requests (avoids CORS):

```javascript
// background.js
const cache = new Map();
const CONCURRENT_LIMIT = 5;

async function checkLink(url) {
  if (cache.has(url)) return cache.get(url);
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const result = { status: response.status, ok: response.ok };
    cache.set(url, result);
    return result;
  } catch (error) {
    cache.set(url, { status: 0, ok: false, error: error.message });
    return cache.get(url);
  }
}

async function checkBatch(links, onProgress) {
  const results = [];
  for (let i = 0; i < links.length; i += CONCURRENT_LIMIT) {
    const batch = links.slice(i, i + CONCURRENT_LIMIT);
    const batchResults = await Promise.all(batch.map(l => checkLink(l.href)));
    results.push(...batch.map((r, idx) => ({ ...links[i + idx], ...batchResults[idx] })));
    onProgress({ checked: results.length, total: links.length });
  }
  return results;
}
```

## Step 3: Visual Highlighting

```javascript
// content.js
function highlightLinks(results) {
  results.forEach(link => {
    const element = document.querySelector(`a[href="${link.href}"]`);
    if (!element) return;
    element.style.outline = link.ok ? '2px solid #22c55e' : '2px solid #ef4444';
  });
}
```

## Step 4: Popup Report

```html
<style>.broken { color: #ef4444; }</style>
<div id="results"></div>
<button id="copyReport">Copy Report</button>
```

```javascript
// popup.js
document.getElementById('copyReport').addEventListener('click', () => {
  const broken = results.filter(r => !r.ok);
  navigator.clipboard.writeText(broken.map(l => `${l.status}: ${l.href}`).join('\n'));
});
```

## Summary

Extension demonstrates link extraction, HTTP checking with rate limiting, visual highlighting, and report generation.
