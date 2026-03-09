---
layout: post
title: "Build an Auto-Pagination Chrome Extension: Infinite Scrolling on Any Site"
description: "Learn how to build a Chrome extension that automatically loads the next page when you reach the bottom of any website. Complete guide with code examples for auto next page functionality."
date: 2025-04-27
categories: [Chrome Extensions, Tutorials]
tags: [pagination, scroll, chrome-extension]
keywords: "chrome extension auto pagination, infinite scroll extension, auto next page chrome, chrome extension auto scroll, pagination extension chrome"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/27/build-auto-pagination-chrome-extension/"
---

# Build an Auto-Pagination Chrome Extension: Infinite Scrolling on Any Site

Pagination is one of the most common patterns on the web. Whether you are browsing e-commerce product listings, reading through blog archives, or searching for specific content on a forum, you have likely encountered the frustration of manually clicking "Next Page" dozens of times. An auto-pagination Chrome extension solves this problem by automatically detecting when you reach the bottom of a page and loading the next set of content seamlessly.

In this comprehensive guide, we will walk you through building a fully functional auto-pagination Chrome extension that works on any website. You will learn how to detect scroll position, identify pagination elements, fetch subsequent pages, and inject the new content without disrupting the user experience. By the end of this tutorial, you will have a complete extension ready for testing and further customization.

---

## Understanding Auto-Pagination and Infinite Scroll {#understanding-auto-pagination}

Auto-pagination, often implemented as infinite scroll, is a UX pattern that automatically loads more content when users approach the end of the current page. Instead of clicking through numbered pages or a "Load More" button, users simply scroll down and new content appears magically. This creates a seamless browsing experience that keeps users engaged longer and reduces the friction of pagination.

There are two primary approaches to implementing infinite scroll in web applications. The first uses the Intersection Observer API to detect when a specific element (like a loading indicator or the footer) becomes visible in the viewport. The second monitors scroll position directly and triggers content loading when users scroll past a certain threshold. For a Chrome extension, you will need to handle both approaches since different websites implement pagination differently.

The challenge with building a universal auto-pagination extension is that every website implements pagination differently. Some use traditional numbered links, others use "Next" buttons, and some rely on infinite scroll with JavaScript. Your extension needs to be flexible enough to detect various pagination patterns while being smart enough not to interfere with pages that do not need pagination.

---

## Project Setup and Extension Structure {#project-setup}

Let us start by setting up the extension project structure. Create a new folder for your extension and add the following files:

```
auto-pagination-extension/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

The manifest.json file defines your extension configuration and permissions. For an auto-pagination extension, you will need access to active tabs, scripting capabilities, and storage to save user preferences. Here is the complete manifest:

```json
{
  "manifest_version": 3,
  "name": "Auto Pagination",
  "version": "1.0",
  "description": "Automatically load the next page when scrolling to the bottom of any website",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
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
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest uses Manifest V3, the latest version of the Chrome extension platform. The host permissions with `<all_urls>` allow your extension to work on any website, which is essential for a universal pagination tool.

---

## The Content Script: Detecting Pagination Elements {#content-script}

The content script is the heart of your auto-pagination extension. It runs in the context of the web page and is responsible for detecting pagination elements, monitoring scroll position, and injecting new content. Let us build a comprehensive content script that handles various pagination patterns.

Create a file named `content.js` and add the following code:

```javascript
// Auto-Pagination Content Script
(function() {
  'use strict';

  // Configuration
  let config = {
    enabled: true,
    scrollThreshold: 300,
    loadDelay: 1000,
    maxPages: 10,
    autoScroll: false
  };

  // State management
  let state = {
    currentPage: 1,
    isLoading: false,
    hasMoreContent: true,
    loadedUrls: new Set(),
    observer: null
  };

  // Pagination patterns to detect
  const paginationSelectors = [
    // Standard pagination
    '.pagination a',
    '.pagination button',
    '.paginate a',
    '.pager a',
    'nav.pagination a',
    '[role="navigation"] a',
    
    // Numbered pagination
    '.page-numbers',
    '.page-link',
    '.pagination-link',
    
    // Next/Previous buttons
    'a[rel="next"]',
    'a.next',
    'button.next',
    '.next-button',
    '[aria-label="Next"]',
    
    // Load more buttons
    '.load-more',
    '.load-more-button',
    '[data-load-more]',
    'button[data-action="load-more"]',
    
    // Infinite scroll triggers
    '.infinite-scroll-trigger',
    '.scroll-trigger',
    '#infinite-scroll-trigger'
  ];

  // Initialize the extension
  function init() {
    loadConfig();
    detectPagination();
    setupScrollDetection();
    setupMessageListener();
    console.log('Auto Pagination: Extension initialized');
  }

  // Load configuration from storage
  function loadConfig() {
    chrome.storage.sync.get(['autoPaginationConfig'], (result) => {
      if (result.autoPaginationConfig) {
        config = { ...config, ...result.autoPaginationConfig };
      }
      if (!config.enabled) {
        disablePagination();
      }
    });
  }

  // Detect pagination elements on the page
  function detectPagination() {
    let paginationElement = null;
    
    for (const selector of paginationSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        paginationElement = elements;
        console.log('Auto Pagination: Found pagination elements:', selector);
        break;
      }
    }
    
    // Also check for "Load More" buttons
    const loadMoreButtons = document.querySelectorAll(
      'button:contains("Load More"), a:contains("Load More")'
    );
    
    if (loadMoreButtons.length > 0 && !paginationElement) {
      paginationElement = loadMoreButtons;
      console.log('Auto Pagination: Found Load More button');
    }
    
    return paginationElement;
  }

  // Find the next page URL
  function findNextPageUrl() {
    // Check for "next" link with rel attribute
    const nextLink = document.querySelector('a[rel="next"]');
    if (nextLink && nextLink.href) {
      return nextLink.href;
    }
    
    // Check for link with "next" in text or aria-label
    const nextButton = document.querySelector(
      'a.next, button.next, a[aria-label="Next"], button[aria-label="Next"]'
    );
    if (nextButton) {
      return nextButton.href || nextButton.getAttribute('data-url');
    }
    
    // Check for active page number and get next sibling
    const activePage = document.querySelector('.active, .current, [aria-current="page"]');
    if (activePage) {
      const nextPage = activePage.nextElementSibling;
      if (nextPage && nextPage.tagName === 'A') {
        return nextPage.href;
      }
    }
    
    // Find pagination container and get last link
    const paginationContainer = document.querySelector('.pagination, .pager, nav[aria-label="pagination"]');
    if (paginationContainer) {
      const links = paginationContainer.querySelectorAll('a');
      const lastLink = links[links.length - 1];
      if (lastLink && lastLink.href && !lastLink.classList.contains('disabled')) {
        return lastLink.href;
      }
    }
    
    return null;
  }

  // Setup scroll detection using Intersection Observer
  function setupScrollDetection() {
    if (!config.enabled) return;
    
    // Create a sentinel element at the bottom of the page
    const sentinel = document.createElement('div');
    sentinel.id = 'auto-pagination-sentinel';
    sentinel.style.cssText = 'height: 1px; width: 100%;';
    document.body.appendChild(sentinel);
    
    // Setup Intersection Observer
    const options = {
      root: null,
      rootMargin: `${config.scrollThreshold}px`,
      threshold: 0
    };
    
    state.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !state.isLoading && state.hasMoreContent) {
          loadNextPage();
        }
      });
    }, options);
    
    state.observer.observe(sentinel);
    console.log('Auto Pagination: Scroll detection enabled');
  }

  // Load the next page
  async function loadNextPage() {
    if (state.isLoading || !state.hasMoreContent) return;
    
    const nextUrl = findNextPageUrl();
    if (!nextUrl) {
      state.hasMoreContent = false;
      console.log('Auto Pagination: No more pages found');
      return;
    }
    
    // Avoid loading the same URL twice
    if (state.loadedUrls.has(nextUrl)) {
      console.log('Auto Pagination: URL already loaded');
      return;
    }
    
    state.isLoading = true;
    showLoadingIndicator();
    
    try {
      // Fetch the next page
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract the main content (this should be customized for specific sites)
      const mainContent = extractMainContent(doc);
      
      if (mainContent) {
        // Append content to the page
        appendContent(mainContent);
        state.loadedUrls.add(nextUrl);
        state.currentPage++;
        
        console.log(`Auto Pagination: Loaded page ${state.currentPage}: ${nextUrl}`);
        
        // Check if we have reached the maximum number of pages
        if (state.currentPage >= config.maxPages) {
          state.hasMoreContent = false;
          console.log('Auto Pagination: Reached maximum page limit');
        }
      } else {
        state.hasMoreContent = false;
        console.log('Auto Pagination: Could not extract content');
      }
    } catch (error) {
      console.error('Auto Pagination: Error loading next page:', error);
      state.hasMoreContent = false;
    } finally {
      state.isLoading = false;
      hideLoadingIndicator();
    }
  }

  // Extract main content from the loaded page
  function extractMainContent(doc) {
    // Try to find common content containers
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.posts',
      '.articles',
      '.product-list',
      '.results',
      '#content',
      '#main'
    ];
    
    for (const selector of contentSelectors) {
      const content = doc.querySelector(selector);
      if (content) {
        return content;
      }
    }
    
    // Fallback: return body
    return doc.body;
  }

  // Append new content to the page
  function appendContent(content) {
    const container = document.querySelector('main, [role="main"], .content, #content');
    if (container) {
      container.appendChild(content);
    } else {
      document.body.appendChild(content);
    }
    
    // Trigger custom event for other scripts
    window.dispatchEvent(new CustomEvent('autoPaginationLoaded', {
      detail: { page: state.currentPage }
    }));
  }

  // Show loading indicator
  function showLoadingIndicator() {
    let indicator = document.getElementById('auto-pagination-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'auto-pagination-indicator';
      indicator.innerHTML = '<span>Loading more content...</span>';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'block';
  }

  // Hide loading indicator
  function hideLoadingIndicator() {
    const indicator = document.getElementById('auto-pagination-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Disable pagination
  function disablePagination() {
    if (state.observer) {
      state.observer.disconnect();
    }
    const sentinel = document.getElementById('auto-pagination-sentinel');
    if (sentinel) {
      sentinel.remove();
    }
    console.log('Auto Pagination: Disabled');
  }

  // Enable pagination
  function enablePagination() {
    if (!state.observer) {
      detectPagination();
      setupScrollDetection();
    }
    console.log('Auto Pagination: Enabled');
  }

  // Setup message listener for popup communication
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getStatus':
          sendResponse({
            enabled: config.enabled,
            currentPage: state.currentPage,
            hasMoreContent: state.hasMoreContent
          });
          break;
        case 'toggle':
          config.enabled = !config.enabled;
          if (config.enabled) {
            enablePagination();
          } else {
            disablePagination();
          }
          chrome.storage.sync.set({ autoPaginationConfig: config });
          sendResponse({ enabled: config.enabled });
          break;
        case 'loadNext':
          loadNextPage();
          sendResponse({ loading: true });
          break;
      }
    });
  }

  // Start the extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

This content script handles multiple pagination patterns and uses the Intersection Observer API for efficient scroll detection. It includes loading indicators, error handling, and communication with the popup interface.

---

## The Popup Interface {#popup-interface}

The popup provides users with control over the extension. Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto Pagination</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header>
      <h1>Auto Pagination</h1>
    </header>
    
    <main>
      <div class="status-card">
        <div class="status-indicator" id="status-indicator"></div>
        <span id="status-text">Loading...</span>
      </div>
      
      <div class="controls">
        <button id="toggle-btn" class="primary-btn">
          Enable Auto Pagination
        </button>
        
        <button id="load-next-btn" class="secondary-btn">
          Load Next Page
        </button>
      </div>
      
      <div class="info">
        <p>Pages loaded: <span id="page-count">0</span></p>
        <p id="more-content"></p>
      </div>
    </main>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Create `popup.css` for styling:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

.popup-container {
  padding: 20px;
}

header h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
}

.status-indicator.active {
  background: #4CAF50;
}

.status-indicator.inactive {
  background: #f44336;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn {
  background: #4285f4;
  color: white;
}

.primary-btn:hover {
  background: #3367d6;
}

.secondary-btn {
  background: white;
  color: #4285f4;
  border: 1px solid #4285f4;
}

.secondary-btn:hover {
  background: #e8f0fe;
}

.info {
  text-align: center;
  color: #666;
  font-size: 13px;
}

.info p {
  margin-bottom: 5px;
}
```

Create `popup.js` to handle user interactions:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-btn');
  const loadNextBtn = document.getElementById('load-next-btn');
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const pageCount = document.getElementById('page-count');
  const moreContent = document.getElementById('more-content');
  
  // Get current status
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
      if (response) {
        updateStatus(response);
      }
    });
  });
  
  // Toggle auto pagination
  toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, (response) => {
        if (response) {
          updateStatus({
            enabled: response.enabled,
            currentPage: parseInt(pageCount.textContent),
            hasMoreContent: response.enabled
          });
        }
      });
    });
  });
  
  // Load next page manually
  loadNextBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'loadNext' }, (response) => {
        if (response && response.loading) {
          loadNextBtn.textContent = 'Loading...';
          loadNextBtn.disabled = true;
          
          setTimeout(() => {
            loadNextBtn.textContent = 'Load Next Page';
            loadNextBtn.disabled = false;
            
            // Refresh status
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (resp) => {
              if (resp) {
                updateStatus(resp);
              }
            });
          }, 2000);
        }
      });
    });
  });
  
  function updateStatus(status) {
    if (status.enabled) {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Active';
      toggleBtn.textContent = 'Disable Auto Pagination';
    } else {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Inactive';
      toggleBtn.textContent = 'Enable Auto Pagination';
    }
    
    pageCount.textContent = status.currentPage || 0;
    moreContent.textContent = status.hasMoreContent 
      ? 'More content available' 
      : 'No more content';
  }
});
```

---

## The Background Service Worker {#background-worker}

The background service worker handles extension lifecycle events and can manage cross-tab state. Create `background.js`:

```javascript
// Background Service Worker for Auto Pagination Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Auto Pagination Extension installed');
  
  // Set default configuration
  chrome.storage.sync.set({
    autoPaginationConfig: {
      enabled: true,
      scrollThreshold: 300,
      loadDelay: 1000,
      maxPages: 10,
      autoScroll: false
    }
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getVersion') {
    chrome.runtime.getVersion((version) => {
      sendResponse({ version });
    });
    return true;
  }
});

// Log when extension is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Auto Pagination: Tab activated', activeInfo.tabId);
});
```

---

## Testing Your Extension {#testing}

To test your auto-pagination extension, follow these steps:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. Navigate to a website with pagination (like a blog or e-commerce site)
5. Click the extension icon to open the popup
6. Enable auto pagination and scroll to the bottom of the page

The extension should automatically detect the pagination elements and load the next page when you approach the bottom. If it does not work on a specific site, you may need to customize the content extraction logic for that site.

---

## Common Challenges and Solutions {#common-challenges}

Building a universal auto-pagination extension comes with several challenges. Here are the most common issues and how to address them:

### Dynamic Content Loading

Many modern websites use JavaScript frameworks that load content dynamically. Your extension needs to wait for the content to be fully rendered before attempting to load the next page. The current implementation handles this by using Intersection Observer, but you may need to add additional delays or retry logic for complex sites.

### Content Extraction

Different websites structure their content differently. The `extractMainContent` function in our content script uses common selectors, but you will likely need to customize this for specific sites. Consider adding site-specific rules or using machine learning to identify content containers.

### Rate Limiting

Some websites implement rate limiting to prevent automated scraping. Your extension should implement appropriate delays between page loads and potentially detect rate limit errors to pause pagination temporarily.

### Memory Management

Loading many pages can consume significant memory. Consider implementing cleanup logic to remove old content or limit the total number of loaded pages.

---

## Advanced Features {#advanced-features}

Once you have the basic extension working, consider adding these advanced features:

1. **Site-specific configurations**: Allow users to customize behavior per domain
2. **Keyboard shortcuts**: Add keyboard shortcuts to trigger pagination
3. **Sync across devices**: Use chrome.storage.sync to save user preferences
4. **Analytics**: Track pagination usage patterns to improve the extension
5. **Content filtering**: Allow users to filter what content gets loaded

---

## Conclusion {#conclusion}

Building an auto-pagination Chrome extension is a rewarding project that solves a real problem faced by millions of web users. In this guide, you have learned how to create a complete extension with a content script for detecting and managing pagination, a popup interface for user control, and a background service worker for lifecycle management.

The key to making your extension successful is handling the variety of pagination patterns found across the web. The comprehensive code examples in this guide provide a solid foundation, but you will likely need to refine the content extraction logic based on the specific sites your users visit.

Remember to respect website terms of service and implement reasonable rate limiting to avoid overwhelming servers. With proper implementation, your auto-pagination extension can provide a seamless browsing experience that keeps users engaged and coming back for more.

Start building today, test thoroughly on various websites, and iterate based on user feedback. The Chrome extension ecosystem is vibrant and users are always looking for tools that improve their browsing experience.
