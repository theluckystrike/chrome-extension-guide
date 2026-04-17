---
layout: post
title: "Build a Video Downloader Chrome Extension: Detect and Save Web Videos"
description: "Learn to build a chrome extension video downloader that detects and saves web videos. Complete tutorial covering video detection, extraction, and saving functionality."
date: 2025-04-24
last_modified_at: 2025-04-24
categories: [Chrome-Extensions, Tutorials]
tags: [video-downloader, media, chrome-extension]
keywords: "chrome extension video downloader, download video chrome extension, build video saver extension, chrome extension detect video, web video downloader extension"
canonical_url: "https://bestchromeextensions.com/2025/04/24/build-video-downloader-chrome-extension/"
---

Build a Video Downloader Chrome Extension: Detect and Save Web Videos

The internet is filled with valuable video content, from educational tutorials and webinars to entertaining clips and product demonstrations. Being able to save these videos for offline viewing is incredibly useful, whether you want to watch without an internet connection, build a personal media library, or archive important content. Building a chrome extension video downloader gives you the power to detect and save web videos directly from any website you visit.

This comprehensive guide walks you through creating a fully functional video downloader chrome extension from scratch. You'll learn how to detect videos on web pages, extract their source URLs, and implement the download functionality that saves videos to your local storage. By the end of this tutorial, you'll have a complete understanding of how to build video saver extensions that work across different video hosting platforms.

---

Understanding Video Detection in Web Pages {#understanding-video-detection}

Before diving into code, it's essential to understand how videos exist in web pages. Modern websites use multiple methods to embed video content, and your extension needs to handle each of these approaches effectively.

Video Elements and Sources

The most common way videos appear on websites is through HTML5 video tags. These tags can embed videos directly using a source attribute or include multiple source elements for different formats. Your chrome extension detect video functionality must scan the page for these elements and extract their source URLs.

HTML5 video elements often include attributes like autoplay, controls, loop, and poster (for thumbnail images). The actual video file URL sits in the src attribute or within source child elements. Some websites load videos dynamically using JavaScript, which requires more sophisticated detection methods.

Beyond native HTML5 videos, many sites embed videos through iframe elements from platforms like YouTube, Vimeo, Dailymotion, or custom video players. While these embedded players don't directly expose video source URLs (due to streaming protocols and copyright protection), your extension can still detect the presence of these video elements and provide value by alerting users or offering alternative detection methods.

Common Video Hosting Patterns

Understanding how different platforms serve videos helps you build a solid video detection system. Progressive download videos use HTTP to deliver video files that play while downloading, they're the easiest to detect and download. Streaming videos use protocols like HLS (HTTP Live Streaming) or DASH (Dynamic Adaptive Streaming over HTTP), which split video into small chunks. Your extension needs special handling for these streaming formats.

Many websites host videos on their own servers using direct file URLs ending in common video extensions like .mp4, .webm, .mkv, .avi, or .mov. Others use content delivery networks (CDNs) to serve videos, which still provide downloadable URLs. Social media platforms typically use more complex systems with adaptive bitrate streaming, making direct downloads more challenging but not impossible with the right techniques.

---

Setting Up the Extension Project {#setting-up-project}

Every Chrome extension starts with a manifest file that defines its configuration, permissions, and components. Let's set up our video downloader extension project structure.

Creating the Manifest

Create a new folder for your extension and add the manifest.json file. This configuration tells Chrome about your extension's capabilities and what permissions it requires.

```json
{
  "manifest_version": 3,
  "name": "Video Saver - Web Video Downloader",
  "version": "1.0.0",
  "description": "Detect and download web videos with this powerful chrome extension",
  "permissions": [
    "activeTab",
    "scripting",
    "downloads"
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

The manifest version 3 is the current standard for Chrome extensions. We've included permissions for activeTab (to access the current page), scripting (to inject detection scripts), and downloads (to save video files). The host_permissions with `<all_urls>` allows your extension to work on any website. If you want to add advanced download features like pause/resume, batch queuing, and progress bars, our [downloads management patterns guide](/docs/patterns/downloads-management/) covers these in detail.

Extension Folder Structure

Create the following folder structure for your project:

```
video-saver-extension/
 manifest.json
 popup.html
 popup.js
 popup.css
 background.js
 content.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 detection-worker.js
```

Each file serves a specific purpose in your extension. The popup files handle the user interface, content.js runs on web pages to detect videos, background.js manages extension-wide logic, and detection-worker.js handles the video detection algorithms.

---

Implementing Video Detection Logic {#video-detection-implementation}

The core of any video downloader chrome extension is its ability to find videos on the current page. This requires a content script that analyzes the page's HTML and identifies video elements.

Content Script for Video Detection

Create content.js to scan pages for video elements:

```javascript
// content.js - Runs on web pages to detect videos

function detectVideos() {
  const videos = [];
  
  // Find all HTML5 video elements
  document.querySelectorAll('video').forEach(video => {
    const sources = [];
    
    // Get source from src attribute
    if (video.src) {
      sources.push({
        url: video.src,
        type: getVideoType(video.src)
      });
    }
    
    // Get sources from source elements
    video.querySelectorAll('source').forEach(source => {
      if (source.src) {
        sources.push({
          url: source.src,
          type: source.type || getVideoType(source.src)
        });
      }
    });
    
    if (sources.length > 0) {
      videos.push({
        element: 'video',
        sources: sources,
        poster: video.poster,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      });
    }
  });
  
  // Find embedded iframes that might contain videos
  document.querySelectorAll('iframe[src*="video"], iframe[src*="player"]').forEach(iframe => {
    videos.push({
      element: 'iframe',
      src: iframe.src,
      platform: detectPlatform(iframe.src)
    });
  });
  
  // Look for video links on the page
  document.querySelectorAll('a[href*=".mp4"], a[href*=".webm"], a[href*=".mkv"]').forEach(link => {
    const href = link.href;
    if (!videos.some(v => v.sources && v.sources.some(s => s.url === href))) {
      videos.push({
        element: 'link',
        sources: [{
          url: href,
          type: getVideoType(href)
        }]
      });
    }
  });
  
  return videos;
}

function getVideoType(url) {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const types = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'm3u8': 'application/x-mpegURL',
    'ts': 'video/MP2T'
  };
  return types[ext] || 'video/unknown';
}

function detectPlatform(url) {
  const platforms = [
    { name: 'YouTube', pattern: /youtube\.com|youtu\.be/ },
    { name: 'Vimeo', pattern: /vimeo\.com/ },
    { name: 'Dailymotion', pattern: /dailymotion\.com/ },
    { name: 'Twitch', pattern: /twitch\.tv/ },
    { name: 'Facebook', pattern: /facebook\.com\/watch/ },
    { name: 'Instagram', pattern: /instagram\.com/ }
  ];
  
  for (const platform of platforms) {
    if (platform.pattern.test(url)) {
      return platform.name;
    }
  }
  return 'Unknown';
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideos') {
    const videos = detectVideos();
    sendResponse({ videos: videos });
  }
  return true;
});
```

This content script performs comprehensive video detection by checking for HTML5 video elements, video source elements, embedded iframes containing video players, and direct video file links. It extracts all available source URLs and metadata like video dimensions and duration.

Registering the Content Script

Add the content script to your manifest so it runs on all web pages:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Setting run_at to document_idle ensures the page has fully loaded before our detection script runs, which is important because many sites load videos dynamically after the initial page load.

---

Creating the Extension Popup Interface {#popup-interface}

The popup provides the user interface for your extension. When users click the extension icon, they see a list of detected videos and can choose which ones to download.

HTML Structure

Create popup.html with a clean, intuitive interface:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Saver</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1> Video Saver</h1>
      <p class="subtitle">Download web videos easily</p>
    </header>
    
    <div id="loading" class="loading">
      <div class="spinner"></div>
      <p>Scanning for videos...</p>
    </div>
    
    <div id="results" class="results hidden">
      <div class="video-count">
        <span id="videoCount">0</span> videos found
      </div>
      
      <div id="videoList" class="video-list">
        <!-- Video items will be inserted here -->
      </div>
    </div>
    
    <div id="noVideos" class="no-videos hidden">
      <p>No videos detected on this page.</p>
      <p class="hint">Try visiting a page with embedded or direct video content.</p>
    </div>
    
    <div id="error" class="error hidden">
      <p>Error detecting videos. Please refresh the page and try again.</p>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Styling the Popup

Create popup.css for a modern, user-friendly appearance:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 360px;
  min-height: 200px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

.loading, .no-videos, .error {
  text-align: center;
  padding: 24px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #4285f4;
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.hint {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.video-count {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
}

.video-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: box-shadow 0.2s;
}

.video-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.video-info {
  margin-bottom: 8px;
}

.video-platform {
  font-size: 11px;
  color: #4285f4;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.video-url {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-meta {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.download-btn {
  width: 100%;
  padding: 10px 16px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.download-btn:hover {
  background: #3367d6;
}

.download-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.hidden {
  display: none !important;
}
```

Popup Logic

Create popup.js to handle user interactions:

```javascript
// popup.js - Handles popup UI and download actions

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const resultsEl = document.getElementById('results');
  const noVideosEl = document.getElementById('noVideos');
  const errorEl = document.getElementById('error');
  const videoListEl = document.getElementById('videoList');
  const videoCountEl = document.getElementById('videoCount');
  
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      showError();
      return;
    }
    
    // Send message to content script to detect videos
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideos' });
    
    if (!response || !response.videos || response.videos.length === 0) {
      showNoVideos();
      return;
    }
    
    // Display detected videos
    displayVideos(response.videos);
    
  } catch (error) {
    console.error('Error detecting videos:', error);
    showError();
  }
  
  function displayVideos(videos) {
    loadingEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');
    videoCountEl.textContent = videos.length;
    
    videos.forEach((video, index) => {
      const videoItem = createVideoItem(video, index);
      videoListEl.appendChild(videoItem);
    });
  }
  
  function createVideoItem(video, index) {
    const item = document.createElement('div');
    item.className = 'video-item';
    
    const platform = video.platform || (video.element === 'iframe' ? 'Embedded Video' : 'Direct Video');
    const primaryUrl = video.sources && video.sources[0] ? video.sources[0].url : (video.src || 'Unknown');
    const videoType = video.sources && video.sources[0] ? video.sources[0].type : 'video/mp4';
    
    const dimensions = video.width && video.height ? `${video.width}x${video.height}` : '';
    const duration = video.duration ? formatDuration(video.duration) : '';
    
    item.innerHTML = `
      <div class="video-info">
        <div class="video-platform">${platform}</div>
        <div class="video-url">${primaryUrl}</div>
        ${dimensions || duration ? `<div class="video-meta">${[dimensions, duration].filter(Boolean).join(' • ')}</div>` : ''}
      </div>
      <button class="download-btn" data-url="${encodeURIComponent(primaryUrl)}" data-type="${videoType}">
        Download Video
      </button>
    `;
    
    const downloadBtn = item.querySelector('.download-btn');
    downloadBtn.addEventListener('click', handleDownload);
    
    return item;
  }
  
  async function handleDownload(event) {
    const btn = event.target;
    const url = decodeURIComponent(btn.dataset.url);
    const type = btn.dataset.type;
    
    btn.disabled = true;
    btn.textContent = 'Downloading...';
    
    try {
      // Extract filename from URL
      const urlObj = new URL(url);
      let filename = urlObj.pathname.split('/').pop() || 'video';
      
      // Add extension if missing
      if (!filename.match(/\.(mp4|webm|mkv|avi|mov)$/i)) {
        const ext = type.split('/')[1] || 'mp4';
        filename += `.${ext}`;
      }
      
      // Sanitize filename
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Initiate download
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
      
      btn.textContent = 'Download Started!';
      
    } catch (error) {
      console.error('Download error:', error);
      btn.textContent = 'Download Failed';
      btn.disabled = false;
    }
  }
  
  function showNoVideos() {
    loadingEl.classList.add('hidden');
    noVideosEl.classList.remove('hidden');
  }
  
  function showError() {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
  
  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
});
```

This popup script communicates with the content script to get the list of detected videos, displays them in a user-friendly list, and handles the download process using Chrome's downloads API.

---

Background Service Worker {#background-worker}

The background service worker handles extension-wide events and can perform tasks that don't require a visible popup. Create background.js:

```javascript
// background.js - Service worker for extension-wide logic

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Video Saver extension installed');
  } else if (details.reason === 'update') {
    console.log('Video Saver extension updated');
  }
});

// Listen for tab updates to potentially detect videos automatically
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Could implement auto-detection here if desired
  }
});
```

---

Testing Your Video Downloader Extension {#testing-extension}

Now that you've built all the components, it's time to test your video downloader chrome extension.

Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your browser toolbar

Testing Video Detection

Visit websites with videos to test your extension. Good test sites include:

- Pages with direct video files (MP4, WebM links)
- Websites embedding HTML5 video players
- Video sharing platforms

Click the extension icon to open the popup. You should see detected videos listed with their source URLs and download buttons.

Testing Downloads

Click the "Download Video" button on any detected video. Chrome will prompt you to choose a save location, and the download should complete successfully.

---

Advanced Features and Improvements {#advanced-features}

Once you have the basic video downloader chrome extension working, consider adding these advanced features to make it more powerful.

HLS Stream Detection

HTTP Live Streaming videos use .m3u8 playlist files. Implement a parser to extract individual video segments and combine them for download. This requires fetching the manifest, parsing the segment URLs, and downloading each segment.

Platform-Specific Handlers

Different video platforms require unique approaches. YouTube videos are challenging due to encryption, but you can implement workarounds using third-party APIs or providing users with external tools. Vimeo and other platforms may have accessible download URLs through their APIs.

Batch Downloads

Allow users to download multiple videos at once. Implement a checkbox system in the popup and a batch download function that queues multiple downloads.

Download History

Track previously downloaded videos using Chrome's storage API. Display a history view in the popup so users can revisit their downloaded content.

Quality Selection

When videos offer multiple quality options, let users choose their preferred quality before downloading. Parse the available quality variants and present them as options.

---

Handling Edge Cases and Limitations {#limitations}

Every chrome extension video downloader has limitations. Understanding these helps you set realistic expectations and communicate them to users.

Cross-Origin Restrictions

Browsers enforce same-origin policies that can prevent accessing video URLs from different domains. Your content script runs in the context of the page, so it can access page resources, but downloads initiated from the popup may face CORS issues.

Encrypted Streaming

Services like Netflix, Hulu, and premium YouTube content use encrypted streaming (DRM) that makes downloading impossible without specialized tools. Your extension should handle these cases gracefully by detecting the platform and informing users.

Dynamic Content

Single-page applications and JavaScript-heavy sites may load videos after your content script runs. Consider implementing detection retries or providing a manual refresh button in the popup.

Large Files

Downloading very large video files can consume significant memory and storage. Implement progress tracking and consider chunked downloading for large files.

---

Best Practices for Production Extensions {#best-practices}

When releasing your video downloader chrome extension to the public, follow these best practices.

User Privacy

Be transparent about what data your extension collects and how it uses it. Video downloader extensions are sometimes flagged for privacy concerns, so minimize data collection and clearly explain your extension's functionality in the description.

Error Handling

Implement solid error handling throughout your extension. Users encounter various network errors, permission issues, and unsupported formats. Provide helpful error messages that guide users toward solutions.

Performance

Keep your extension lightweight and efficient. Video detection should not slow down page loading. Use Chrome's efficient APIs and avoid unnecessary computations.

Regular Updates

Video platforms frequently change their embedding methods and player technologies. Maintain your extension by updating detection logic to handle new video hosting patterns.

---

Conclusion {#conclusion}

Building a chrome extension video downloader is an excellent project that teaches you about Chrome extension development, web page analysis, and file handling. You've learned how to detect videos across different hosting methods, extract source URLs, and implement downloads using Chrome's APIs.

The foundation you've created can be extended in countless ways, adding support for more video platforms, implementing HLS stream handling, or creating a more sophisticated user interface. As web technologies evolve, so will the techniques for detecting and saving web videos.

Remember to test thoroughly across different websites and browsers, and always respect copyright laws and website terms of service when downloading videos. With this knowledge, you're well-equipped to build a powerful video saver extension that serves users who want to download video chrome extension functionality for their personal use.

Start experimenting with your extension today, and don't hesitate to iterate on the design based on user feedback and real-world testing. The skills you develop through this project apply to many other types of browser extensions and web development challenges.
