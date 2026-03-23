---
layout: post
title: "Build a Social Share Chrome Extension"
description: "Learn how to build a social share extension for Chrome that enables users to share web pages to social media platforms. This comprehensive guide covers Manifest V3, browser APIs, share dialogs, and best practices for creating a polished sharing experience."
date: 2025-01-20
categories: [tutorials, chrome-extensions]
tags: [social share extension, share page chrome, social media sharing extension, chrome extension tutorial, manifest v3]
keywords: "social share extension, share page chrome, social media sharing extension, build chrome extension share, chrome extension social sharing"
canonical_url: "https://bestchromeextensions.com/2025/01/20/build-social-share-chrome-extension/"
---

Build a Social Share Chrome Extension

Social sharing is one of the most common features users expect from browser extensions. Whether you want to share an interesting article to Twitter, post a product to Facebook, or save a link to LinkedIn, having a dedicated social share extension can significantly improve the user experience. we will walk you through building a complete social share Chrome extension using Manifest V3.

This tutorial assumes you have basic knowledge of HTML, CSS, and JavaScript. By the end of this guide, you will have a fully functional extension that can capture the current page's URL and title, and share it to multiple social media platforms.

---

Why Build a Social Share Extension {#why-build}

Before we dive into the code, let us explore why creating a social share extension is a valuable project:

High User Demand

Social media sharing is among the top-used features in browser extensions. Users constantly want to share interesting content they discover while browsing. Having a one-click solution to share the current page eliminates the need to manually copy URLs and navigate to each social platform.

Relatively Simple Implementation

Unlike some extension features that require complex backend systems or sophisticated APIs, a basic social share extension can be built with just HTML, CSS, and vanilla JavaScript. This makes it an excellent project for developers who are new to Chrome extension development.

Learning Opportunity

Building a social share extension teaches you several important concepts in extension development: working with the active tab, handling browser permissions, creating popup interfaces, and integrating with external URLs. These skills transfer directly to other extension projects.

Potential for Expansion

Once you have a basic sharing extension working, you can easily add features like share history, custom share messages, multiple platform support, and even integration with lesser-known social networks.

---

Understanding the Extension Architecture {#architecture}

Before writing any code, let us understand how Chrome extensions are structured. A typical social share extension consists of several components:

Manifest File

The `manifest.json` file is the configuration file that tells Chrome about your extension. It defines the extension's name, version, permissions, and which files to load.

Popup HTML

When users click your extension icon, a popup appears. This is where users will select which social media platform to share to.

Popup JavaScript

This script handles the logic when users interact with the popup. It captures the current page information and opens the appropriate sharing URL.

Service Worker (Background Script)

The background service worker can handle more complex tasks, though for a basic share extension, we may not need extensive background processing.

---

Step-by-Step Implementation {#implementation}

Let us build the social share extension step by step.

Step 1: Create the Project Structure

First, create a new folder for your extension and set up the following file structure:

```
social-share-extension/
 manifest.json
 popup.html
 popup.js
 styles.css
 icons/
     icon16.png
     icon48.png
     icon128.png
```

You can use any basic images as placeholder icons, or create simple colored squares using an online icon generator.

Step 2: Create the Manifest File

Create the `manifest.json` file with the following content:

```json
{
  "manifest_version": 3,
  "name": "Social Share Extension",
  "version": "1.0.0",
  "description": "Share the current page to your favorite social media platforms with one click.",
  "permissions": ["activeTab"],
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

The key permission here is `activeTab`, which allows us to access information about the currently active tab when the user clicks the extension icon.

Step 3: Create the Popup HTML

Create `popup.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Social Share</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Share This Page</h1>
    <div class="page-info">
      <p class="page-title" id="pageTitle">Loading...</p>
      <p class="page-url" id="pageUrl">Loading...</p>
    </div>
    
    <div class="share-buttons">
      <button class="share-btn twitter" data-platform="twitter" aria-label="Share on Twitter">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span>Twitter</span>
      </button>
      
      <button class="share-btn facebook" data-platform="facebook" aria-label="Share on Facebook">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        <span>Facebook</span>
      </button>
      
      <button class="share-btn linkedin" data-platform="linkedin" aria-label="Share on LinkedIn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        <span>LinkedIn</span>
      </button>
      
      <button class="share-btn reddit" data-platform="reddit" aria-label="Share on Reddit">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
        <span>Reddit</span>
      </button>
      
      <button class="share-btn whatsapp" data-platform="whatsapp" aria-label="Share on WhatsApp">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span>WhatsApp</span>
      </button>
      
      <button class="share-btn copy-link" data-platform="copy" aria-label="Copy Link">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        <span>Copy Link</span>
      </button>
    </div>
    
    <div class="status" id="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Step 4: Create the Styles

Create `styles.css` to make the popup look polished and professional:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #f5f5f5;
  min-width: 320px;
}

.container {
  padding: 20px;
  max-width: 360px;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  text-align: center;
}

.page-info {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 14px;
  font-weight: 500;
  color: #222;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-url {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.share-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.share-btn:active {
  transform: translateY(0);
}

.share-btn.twitter {
  background-color: #000000;
  color: white;
}

.share-btn.facebook {
  background-color: #1877f2;
  color: white;
}

.share-btn.linkedin {
  background-color: #0a66c2;
  color: white;
}

.share-btn.reddit {
  background-color: #ff4500;
  color: white;
}

.share-btn.whatsapp {
  background-color: #25d366;
  color: white;
}

.share-btn.copy-link {
  background-color: #6b7280;
  color: white;
  grid-column: span 2;
}

.status {
  margin-top: 16px;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
  display: none;
}

.status.show {
  display: block;
}

.status.success {
  background-color: #d1fae5;
  color: #065f46;
}

.status.error {
  background-color: #fee2e2;
  color: #991b1b;
}
```

Step 5: Create the Popup JavaScript

Now create `popup.js` which handles capturing the current tab information and implementing the sharing logic:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const pageTitleEl = document.getElementById('pageTitle');
  const pageUrlEl = document.getElementById('pageUrl');
  const statusEl = document.getElementById('status');
  const shareButtons = document.querySelectorAll('.share-btn');
  
  // Get the active tab information
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      const title = tab.title || 'No title';
      const url = tab.url || tab.favIconUrl || '';
      
      pageTitleEl.textContent = title;
      pageUrlEl.textContent = url;
      
      // Store for sharing
      window.currentPage = { title, url };
    }
  } catch (error) {
    console.error('Error getting tab info:', error);
    pageTitleEl.textContent = 'Unable to get page info';
    pageUrlEl.textContent = '';
  }
  
  // Add click handlers for share buttons
  shareButtons.forEach(button => {
    button.addEventListener('click', () => {
      const platform = button.dataset.platform;
      shareToPlatform(platform);
    });
  });
  
  function shareToPlatform(platform) {
    const { title, url } = window.currentPage || { title: '', url: '' };
    
    if (!url) {
      showStatus('Unable to share: No URL available', 'error');
      return;
    }
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
        
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
        break;
        
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        break;
        
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        break;
        
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
        break;
        
      case 'copy':
        copyToClipboard(url);
        return;
        
      default:
        showStatus('Unknown platform', 'error');
        return;
    }
    
    // Open share window
    chrome.tabs.create({ url: shareUrl });
  }
  
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showStatus('Link copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        showStatus('Link copied to clipboard!', 'success');
      } catch (err) {
        showStatus('Failed to copy link', 'error');
      }
      
      document.body.removeChild(textArea);
    }
  }
  
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status show ${type}`;
    
    // Hide after 3 seconds
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  }
});
```

---

Testing Your Extension {#testing}

Now that you have created all the files, let us test the extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your Chrome toolbar
5. Navigate to any webpage and click the extension icon
6. The popup should show the page title and URL
7. Click any share button to test sharing

---

Understanding Key Components {#key-components}

Let us break down the important concepts used in this extension:

The activeTab Permission

The `activeTab` permission is crucial for this extension. It allows the extension to access the title and URL of the currently active tab only when the user clicks the extension icon. This is a privacy-focused approach compared to having permanent access to all tabs.

Chrome Tabs API

We use `chrome.tabs.query({ active: true, currentWindow: true })` to get information about the current tab. This returns an array of tabs, and we destructure the first element to get our active tab.

Share URLs

Each social media platform has its own sharing URL format. Twitter uses `twitter.com/intent/tweet`, Facebook uses `facebook.com/sharer/sharer.php`, and so on. These URLs accept parameters like `url`, `text`, and `title` to pre-fill the share content.

---

Enhancements and Best Practices {#enhancements}

Here are some ways you can improve your social share extension:

Add More Platforms

You can easily add more social media platforms by adding more buttons to the HTML and handling them in the JavaScript switch statement. Consider adding platforms like Pinterest, Tumblr, Telegram, or Email.

Custom Share Messages

Allow users to customize their share message before sharing. You could add a text input field in the popup that pre-fills the share text.

Share Analytics

Track which platforms are most popular among your users by storing share statistics in Chrome storage.

Keyboard Shortcuts

Add keyboard shortcuts so users can share with a quick key combination without opening the popup.

Error Handling

Improve error handling for cases where the tab URL is not available or the sharing URL fails to open.

---

Publishing to the Chrome Web Store {#publishing}

Once your extension is working and tested, you can publish it to the Chrome Web Store:

1. Create a developer account at the Chrome Web Store
2. Package your extension as a ZIP file
3. Upload the ZIP file to the Chrome Web Store Developer Dashboard
4. Fill in the extension details, screenshots, and privacy practices
5. Submit for review

Make sure to follow Google's policies for extensions and provide accurate privacy disclosures.

---

Conclusion {#conclusion}

Congratulations! You have built a complete social share Chrome extension. This extension demonstrates several important concepts in Chrome extension development: working with browser APIs, creating interactive popups, handling user interactions, and integrating with external services.

The skills you have learned in this tutorial, manifest configuration, tab querying, popup development, and share URL construction, apply directly to many other extension projects. You can now expand this basic extension with additional features, customize the design, or use it as a foundation for more complex browser tools.

Building a social share extension is an excellent way to start your Chrome extension development journey, and with the knowledge from this guide, you are well-equipped to create professional-quality extensions that can be published to the Chrome Web Store and used by millions of users worldwide.

---

Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Manifest V3 Migration Guide](/docs/mv3/migration-guide/)
- [Sharing URLs for Social Platforms](https://developers.google.com/recaptcha/docs/share)

Start building your social share extension today and share your creations with the world!
