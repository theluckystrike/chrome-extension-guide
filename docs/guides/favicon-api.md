---
layout: default
title: "Chrome Extension Favicon API — Developer Guide"
description: "Learn how to use the Chrome Extension Favicon API with this developer guide covering methods, permissions, and implementation examples."
---
# Favicon Access in Chrome Extensions

## Overview

Chrome Extensions can access website favicons using the `_favicon` URL mechanism. There is no `chrome.favicon` API namespace -- instead, extensions construct a special URL that Chrome resolves to the site's favicon image.

### Key Points
- Requires `"favicon"` permission in manifest (MV3)
- Access favicons via a constructed URL, not a JavaScript API call
- The URL pattern is `chrome-extension://<extension-id>/_favicon/?pageUrl=<url>&size=<size>`
- Works in popup, side panel, options pages, and content scripts (with web accessible resources)

## Permission Setup

Add the `favicon` permission to your `manifest.json`:

```json
{
  "name": "My Favicon Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "favicon"
  ]
}
```

If you need to use favicons in content scripts, also declare `_favicon` as a web accessible resource:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["_favicon/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Constructing Favicon URLs

Use `chrome.runtime.getURL()` to build the favicon URL:

```javascript
function getFaviconUrl(pageUrl, size = 32) {
  const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
  faviconUrl.searchParams.set('pageUrl', pageUrl);
  faviconUrl.searchParams.set('size', size.toString());
  return faviconUrl.toString();
}

// Usage
const url = getFaviconUrl('https://example.com', 32);
// Returns: chrome-extension://<your-extension-id>/_favicon/?pageUrl=https%3A%2F%2Fexample.com&size=32
```

### Displaying in HTML

```html
<img id="site-icon" alt="Site Favicon">

<script>
function getFaviconUrl(pageUrl, size = 32) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', size.toString());
  return url.toString();
}

document.getElementById('site-icon').src = getFaviconUrl('https://example.com');
</script>
```

### Available Sizes

Common favicon sizes: `16`, `32`, `64`. The `size` parameter specifies the desired pixel dimensions. Chrome will return the closest available size.

## Fallback Patterns for Sites Without Favicons

Many sites don't have favicons. Implement graceful fallbacks:

### Default Icon Fallback

```javascript
const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10">?</text></svg>';

function createFaviconImg(pageUrl, size = 16) {
  const img = document.createElement('img');
  img.src = getFaviconUrl(pageUrl, size);
  img.width = size;
  img.height = size;
  img.onerror = () => { img.src = DEFAULT_FAVICON; };
  return img;
}
```

### Generate Favicon from Domain Initial

```javascript
function generateInitialFavicon(domain) {
  const initial = domain.charAt(0).toUpperCase();
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const colorIndex = domain.charCodeAt(0) % colors.length;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" fill="${colors[colorIndex]}"/>
    <text x="16" y="22" font-family="Arial" font-size="18" fill="white" text-anchor="middle">${initial}</text>
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(svg);
}
```

## Displaying Favicons in Extension Pages

### Popup Example

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 10px; font-family: system-ui; }
    .site-list { list-style: none; padding: 0; margin: 0; }
    .site-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .site-item:hover { background: #f0f0f0; }
    .site-item img { width: 16px; height: 16px; margin-right: 8px; }
  </style>
</head>
<body>
  <ul class="site-list" id="siteList"></ul>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
function getFaviconUrl(pageUrl, size = 16) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', size.toString());
  return url.toString();
}

const SITES = [
  'https://google.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://developer.mozilla.org'
];

function renderFaviconList() {
  const list = document.getElementById('siteList');

  for (const siteUrl of SITES) {
    const domain = new URL(siteUrl).hostname;
    const li = document.createElement('li');
    li.className = 'site-item';
    li.innerHTML = `
      <img src="${getFaviconUrl(siteUrl)}" onerror="this.style.display='none'">
      <span>${domain}</span>
    `;
    li.onclick = () => chrome.tabs.create({ url: siteUrl });
    list.appendChild(li);
  }
}

document.addEventListener('DOMContentLoaded', renderFaviconList);
```

### Content Script Usage

To use favicons in content scripts, ensure `_favicon/*` is declared as a web accessible resource in your manifest (see Permission Setup above).

```javascript
// content-script.js
function getFaviconUrl(pageUrl, size = 16) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', size.toString());
  return url.toString();
}

const img = document.createElement('img');
img.src = getFaviconUrl('https://example.com', 16);
document.body.appendChild(img);
```

## Caching Favicons Locally

Chrome caches favicons internally, but you can also cache them in extension storage for offline access:

```javascript
const FAVICON_CACHE_KEY = 'faviconCache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCachedFavicon(url) {
  const { [FAVICON_CACHE_KEY]: cache } = await chrome.storage.local.get(FAVICON_CACHE_KEY);

  if (cache && cache[url] && cache[url].timestamp > Date.now() - CACHE_EXPIRY_MS) {
    return cache[url].dataUrl;
  }

  return null;
}

async function setCachedFavicon(url, dataUrl) {
  const { [FAVICON_CACHE_KEY]: cache } = await chrome.storage.local.get(FAVICON_CACHE_KEY);

  const newCache = cache || {};
  newCache[url] = {
    dataUrl: dataUrl,
    timestamp: Date.now()
  };

  await chrome.storage.local.set({ [FAVICON_CACHE_KEY]: newCache });
}
```

## Performance Best Practices

### Use Appropriate Sizes

Request only the size you need to avoid unnecessary data:

```javascript
// 16px for list items, 32px for larger displays
const listFavicon = getFaviconUrl(url, 16);
const cardFavicon = getFaviconUrl(url, 32);
```

### Lazy Loading

Load favicons only when visible:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const url = entry.target.dataset.url;
      entry.target.src = getFaviconUrl(url);
      observer.unobserve(entry.target);
    }
  });
});

// Usage
const img = document.createElement('img');
img.dataset.url = 'https://example.com';
observer.observe(img);
```

## Common Issues and Solutions

### Issue: Favicon Returns Empty or Broken

Always provide a fallback using the `onerror` handler on `<img>` elements.

### Issue: Favicon Not Showing in Content Scripts

Ensure `_favicon/*` is listed in `web_accessible_resources` in your manifest.

### Issue: Permission Warnings

The `favicon` permission only triggers a warning if `tabs` or host permissions have not already been requested.

## Summary

- There is no `chrome.favicon` JavaScript API -- favicons are accessed via URL construction
- Use `chrome.runtime.getURL('/_favicon/')` with `pageUrl` and `size` query parameters
- Declare the `"favicon"` permission in your manifest
- For content scripts, also declare `"_favicon/*"` as a web accessible resource
- Always implement fallbacks for sites without favicons
- Lazy load and cache for better performance

## Related Articles

- [Favicon Patterns](../patterns/favicon-api.md)
- [Web Navigation](../guides/web-navigation.md)
