---
layout: default
title: "Chrome Extension Link Checker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-link-checker/"
---
# Build a Link Checker Extension

## What You'll Build {#what-youll-build}

A Chrome extension that scans pages for broken links, checks HTTP status, highlights results, and generates reports.

## Manifest Configuration {#manifest-configuration}

```json
{
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup.html" }
}
```

## Step 1: Extract Links {#step-1-extract-links}

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

## Step 2: Background Link Checking {#step-2-background-link-checking}

Background script handles HTTP requests (avoids CORS):

```javascript
// background.js
const cache = new Map();
const CONCURRENT_LIMIT = 5;

async function checkLink(url) {
  if (cache.has(url)) return cache.get(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeoutId);
    const result = { 
      status: response.status, 
      ok: response.ok,
      redirect: response.redirected
    };
    cache.set(url, result);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    const isCors = error.message.includes('Failed to fetch');
    cache.set(url, { 
      status: 0, 
      ok: false, 
      error: error.name === 'AbortError' ? 'timeout' : (isCors ? 'cors-blocked' : error.message) 
    });
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

## Step 3: Visual Highlighting {#step-3-visual-highlighting}

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

## Step 4: Popup Report {#step-4-popup-report}

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

// Badge showing broken link count
chrome.runtime.sendMessage({
  action: 'updateBadge',
  count: results.filter(r => !r.ok).length
});
```

## Step 5: Badge Action {#step-5-badge-action}

Display broken link count in extension badge:

```javascript
// background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateBadge') {
    chrome.action.setBadgeText({ text: message.count > 0 ? String(message.count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: message.count > 0 ? '#ef4444' : '#22c55e' });
  }
});
```

## Summary {#summary}

Extension demonstrates link extraction, HTTP checking with rate limiting, visual highlighting, and report generation.

## See Also {#see-also}

- [Content Script Patterns](../guides/content-script-patterns.md)
- [Rate Limiting Pattern](../patterns/rate-limiting.md)
- [Badge Action UI](../patterns/badge-action-ui.md)
