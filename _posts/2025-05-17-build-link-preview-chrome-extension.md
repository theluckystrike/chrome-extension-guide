---
layout: post
title: "Build a Link Preview Chrome Extension: Hover to See Page Previews"
description: "Learn to build a link preview Chrome extension that shows page previews on hover. Complete guide with code examples for Manifest V3."
date: 2025-05-17
categories: [Chrome-Extensions, Tutorials]
tags: [link-preview, hover, chrome-extension]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/05/17/build-link-preview-chrome-extension/"
---

# Build a Link Preview Chrome Extension: Hover to See Page Previews

Link preview functionality has become an indispensable feature for modern web browsing. Whether you're researching topics, shopping online, or browsing social media platforms, the ability to preview what's behind a link before clicking saves valuable time and helps avoid malicious websites. In this comprehensive guide, we'll walk you through building a fully functional link preview Chrome extension using Manifest V3 that displays hover previews for any URL you encounter on the web.

This tutorial is designed for developers who want to understand the intricacies of Chrome extension development while creating a practical tool that millions of users would find valuable. By the end of this guide, you'll have created an extension that detects when users hover over links, fetches metadata from those URLs, and displays a beautiful preview card with the page title, description, and thumbnail image.

---

## Why Build a Link Preview Extension? {#why-build-link-preview}

The demand for link preview functionality continues to grow as users become more conscious of their browsing security and efficiency. Link preview extensions, also known as hover preview chrome extensions, provide several key benefits that make them worth building:

**Time Savings**: Users can quickly scan multiple links without opening new tabs, deciding which ones are worth their attention. This is particularly useful when researching topics or shopping for products online.

**Security Enhancement**: By previewing a page before visiting it, users can identify potentially malicious or spammy websites. They can see the actual URL destination and get a preview of the content, helping them make informed decisions about which links to click.

**Improved User Experience**: Link tooltips chrome extensions provide a rich, informative browsing experience similar to what users see on platforms like Facebook, LinkedIn, Twitter, and Slack, where URLs automatically expand to show rich previews.

**Learning Opportunity**: Building this extension teaches you valuable skills including content script manipulation, the Fetch API in extension contexts, dynamic DOM creation and positioning, handling cross-origin requests, and working with Chrome's extension messaging system.

---

## Understanding the Core Architecture {#core-architecture}

Before diving into the code, let's understand how a link preview chrome extension works under the hood. The architecture consists of three main components that work together seamlessly:

**Link Detection**: The extension needs to identify when a user hovers over an anchor element with a valid href attribute. This involves listening for mouse events and filtering out non-HTTP links like JavaScript actions or internal page anchors.

**Metadata Fetching**: Once a valid link is detected, the extension must retrieve the webpage's metadata including the title, description, and og:image meta tags. This requires making fetch requests to the target URL and parsing the HTML response.

**Preview Display**: The final component involves creating a floating preview card, positioning it near the hovered link, and populating it with the fetched metadata. The preview must be positioned intelligently to stay within the viewport.

One of the biggest challenges in building this extension is handling cross-origin requests. Due to browser security policies, content scripts cannot directly fetch arbitrary URLs. We'll solve this by using a service worker that acts as a proxy for fetching metadata.

---

## Project Setup and Manifest Configuration {#project-setup}

Every Chrome extension begins with the manifest.json file. For our link preview extension, we'll use Manifest V3, which is the current standard and offers better security and performance compared to the deprecated Manifest V2.

Create a new directory for your extension and add the following manifest.json file:

```json
{
  "manifest_version": 3,
  "name": "LinkPeek - Link Preview Extension",
  "version": "1.0.0",
  "description": "Preview any link before clicking. Shows title, description, and thumbnail on hover.",
  "permissions": [
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The manifest configuration is critical to understand. The host_permissions field with `<all_urls>` is essential for our extension because it needs to fetch metadata from any website. Without this permission, our fetch requests would be blocked by CORS policies.

---

## Creating the Content Script {#content-script}

The content script is where the magic happens. This script runs on every webpage and is responsible for detecting link hover events, requesting metadata from the background script, and displaying the preview tooltip.

Create a content.js file with the following implementation:

```javascript
// content.js - Main content script for link preview functionality

class LinkPreview {
  constructor() {
    this.previewContainer = null;
    this.currentLink = null;
    this.previewTimeout = null;
    this.hideTimeout = null;
    this.init();
  }

  init() {
    // Create the preview container
    this.createPreviewContainer();
    
    // Add event listeners to the document
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  createPreviewContainer() {
    this.previewContainer = document.createElement('div');
    this.previewContainer.id = 'link-preview-container';
    this.previewContainer.className = 'link-preview-hidden';
    document.body.appendChild(this.previewContainer);
  }

  handleMouseOver(event) {
    const link = event.target.closest('a');
    if (!link) return;
    
    const href = link.href;
    // Skip non-HTTP links, anchor links, and mailto links
    if (!href || !href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
      return;
    }

    this.currentLink = link;
    
    // Add delay before showing preview
    this.previewTimeout = setTimeout(() => {
      this.showPreview(href, link);
    }, 300);
  }

  handleMouseOut(event) {
    const link = event.target.closest('a');
    if (!link) return;

    // Clear the show timeout if mouse leaves before delay
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }

    // Hide preview after a short delay
    this.hideTimeout = setTimeout(() => {
      this.hidePreview();
    }, 200);
  }

  handleMouseMove(event) {
    if (!this.previewContainer || this.previewContainer.classList.contains('link-preview-hidden')) {
      return;
    }
    
    this.positionPreview(event.clientX, event.clientY);
  }

  async showPreview(url, linkElement) {
    try {
      // Show loading state
      this.previewContainer.innerHTML = '<div class="link-preview-loading">Loading preview...</div>';
      this.previewContainer.classList.remove('link-preview-hidden');
      this.positionPreviewAtElement(linkElement);

      // Request metadata from background script
      const metadata = await this.fetchMetadata(url);
      
      // Render the preview
      this.renderPreview(metadata, url);
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
      this.previewContainer.innerHTML = '<div class="link-preview-error">Preview unavailable</div>';
    }
  }

  async fetchMetadata(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchMetadata', url: url },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  renderPreview(metadata, url) {
    const hostname = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    
    const imageHtml = metadata.image 
      ? `<div class="link-preview-image" style="background-image: url('${metadata.image}')"></div>` 
      : '';

    this.previewContainer.innerHTML = `
      <div class="link-preview-card">
        ${imageHtml}
        <div class="link-preview-content">
          <div class="link-preview-favicon">
            <img src="${favicon}" alt="" onerror="this.style.display='none'" />
            <span class="link-preview-site">${hostname}</span>
          </div>
          <h3 class="link-preview-title">${this.escapeHtml(metadata.title || 'Untitled')}</h3>
          <p class="link-preview-description">${this.escapeHtml(metadata.description || 'No description available')}</p>
        </div>
      </div>
    `;
  }

  positionPreview(clientX, clientY) {
    const container = this.previewContainer;
    const rect = container.getBoundingClientRect();
    const padding = 10;
    
    let left = clientX + padding;
    let top = clientY + padding;
    
    // Keep within viewport
    if (left + rect.width > window.innerWidth) {
      left = clientX - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight) {
      top = clientY - rect.height - padding;
    }
    
    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
  }

  positionPreviewAtElement(element) {
    const rect = element.getBoundingClientRect();
    const container = this.previewContainer;
    
    let left = rect.right + 10;
    let top = rect.top;
    
    // Adjust if would go off screen
    if (left + 320 > window.innerWidth) {
      left = rect.left - 330;
    }
    if (top + 300 > window.innerHeight) {
      top = window.innerHeight - 310;
    }
    
    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
  }

  hidePreview() {
    this.previewContainer.classList.add('link-preview-hidden');
    this.currentLink = null;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the link preview functionality
new LinkPreview();
```

This content script uses modern JavaScript class syntax and includes several key features. It implements debouncing with timeouts to prevent showing previews for quick mouse movements, includes proper error handling for failed fetch requests, escapes HTML to prevent XSS vulnerabilities, and calculates viewport boundaries to ensure previews stay visible on screen.

---

## Creating the Background Service Worker {#background-service-worker}

The background service worker acts as a bridge between the content script and external websites. Since content scripts cannot make cross-origin requests directly, we use the service worker to fetch metadata from remote URLs.

Create background.js with the following implementation:

```javascript
// background.js - Service worker for fetching link metadata

// Cache for storing recently fetched metadata
const metadataCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchMetadata') {
    handleFetchMetadata(request.url)
      .then(sendResponse)
      .catch(error => {
        console.error('Metadata fetch error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Indicates async response
  }
});

async function handleFetchMetadata(url) {
  // Check cache first
  const cached = metadataCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Fetch the URL with proper headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const metadata = parseMetadata(html, url);

    // Cache the result
    metadataCache.set(url, {
      data: metadata,
      timestamp: Date.now()
    });

    // Limit cache size
    if (metadataCache.size > 100) {
      const firstKey = metadataCache.keys().next().value;
      metadataCache.delete(firstKey);
    }

    return metadata;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    throw error;
  }
}

function parseMetadata(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract Open Graph tags
  const getMetaContent = (property, isProperty = true) => {
    const selector = isProperty 
      ? `meta[property="${property}"]` 
      : `meta[name="${property}"]`;
    return doc.querySelector(selector)?.content || '';
  };

  // Try Open Graph tags first, then fall back to standard meta tags
  const title = getMetaContent('og:title') || getMetaContent('title', false) || 
                doc.querySelector('title')?.textContent || '';
  
  const description = getMetaContent('og:description') || getMetaContent('description', false) || '';
  
  const image = getMetaContent('og:image') || getMetaContent('twitter:image', false) || '';

  return {
    title: title.trim(),
    description: description.trim().substring(0, 200),
    image: image.trim()
  };
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of metadataCache) {
    if (now - entry.timestamp > CACHE_DURATION) {
      metadataCache.delete(url);
    }
  }
}, CACHE_DURATION);
```

The background service worker implements caching to improve performance and reduce redundant network requests. It parses both Open Graph meta tags and standard meta tags to extract the most complete metadata available for each page.

---

## Styling the Preview Tooltip {#styling-preview-tooltip}

Create a styles.css file to make the preview tooltip look professional and match Chrome's design aesthetic:

```css
/* styles.css - Styling for link preview tooltip */

#link-preview-container {
  position: fixed;
  z-index: 2147483647;
  max-width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  pointer-events: none;
  transition: opacity 0.2s ease-in-out;
}

.link-preview-hidden {
  opacity: 0;
  visibility: hidden;
}

.link-preview-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  animation: linkPreviewFadeIn 0.2s ease-out;
}

@keyframes linkPreviewFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.link-preview-image {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;
  background-color: #f1f3f4;
}

.link-preview-content {
  padding: 12px;
}

.link-preview-favicon {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.link-preview-favicon img {
  width: 16px;
  height: 16px;
}

.link-preview-site {
  font-size: 11px;
  color: #5f6368;
  text-transform: lowercase;
}

.link-preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #202124;
  margin: 0 0 4px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-preview-description {
  font-size: 12px;
  color: #5f6368;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-preview-loading,
.link-preview-error {
  padding: 20px;
  text-align: center;
  color: #5f6368;
  font-size: 13px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .link-preview-card {
    background: #292a2d;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  
  .link-preview-title {
    color: #e8eaed;
  }
  
  .link-preview-description,
  .link-preview-site {
    color: #9aa0a6;
  }
  
  .link-preview-loading,
  .link-preview-error {
    background: #292a2d;
    color: #9aa0a6;
  }
}
```

---

## Testing Your Extension {#testing-extension}

Now that we've created all the necessary files, let's test the extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension directory
4. Navigate to any website with multiple links
5. Hover over a link and wait 300ms to see the preview appear

If you encounter any issues, use the Chrome DevTools to check for errors in the content script or background service worker console.

---

## Advanced Features and Enhancements {#advanced-features}

Once you have the basic link preview working, consider adding these advanced features:

**Preview Caching**: Implement chrome.storage.sync to cache previews across sessions, so users don't need to re-fetch metadata when revisiting pages.

**Preview History**: Store recently viewed previews in a popup that users can access for quick reference.

**Customizable Settings**: Add an options page where users can configure preview delay, preview position, or disable previews on specific websites.

**Multiple Preview Sources**: Implement fallback logic to try multiple metadata sources including Schema.org microdata, Twitter Card tags, and standard meta tags in order of priority.

**Preview Actions**: Add buttons to the preview card for quick actions like opening the link in a new tab, copying the URL, or saving the link to a reading list.

---

## Publishing to the Chrome Web Store {#publishing}

When you're ready to share your extension with the world:

1. Create a ZIP file of your extension (excluding source maps and development files)
2. Sign in to the Chrome Web Store Developer Dashboard
3. Upload your ZIP file and fill in the store listing details
4. Submit for review (usually takes a few hours to a few days)

Make sure your extension follows Chrome's policies, particularly regarding user data and privacy, as violations can result in removal from the store.

---

## Conclusion {#conclusion}

Building a link preview Chrome extension is an excellent project that teaches you valuable skills in extension development while creating a genuinely useful tool. The hover preview chrome extension we've built in this guide demonstrates core concepts including content scripts, background service workers, cross-origin fetch requests, dynamic DOM manipulation, and responsive positioning.

This extension can be further expanded with features like link verification for security, integration with bookmarking services, or even AI-powered content summaries. The foundation is solid, and the possibilities for enhancement are endless.

Start building today, and you'll have a professional-quality link preview extension ready to publish to the Chrome Web Store in no time. Your users will thank you for making their browsing experience more efficient and informed!
