---
layout: post
title: "Picture-in-Picture Chrome Extension: Build a Floating Video Player"
description: "Learn how to build a Picture-in-Picture Chrome extension that creates a floating video player. This comprehensive guide covers the Document Picture-in-Picture API, Chrome extension development, and step-by-step implementation for creating a powerful pip video player extension."
date: 2025-01-22
last_modified_at: 2025-01-22
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, tutorial, picture-in-picture, video]
keywords: "picture in picture extension, pip chrome extension, floating video chrome, pip video player, Document Picture-in-Picture API, chrome extension pip, floating video player extension"
canonical_url: "https://bestchromeextensions.com/2025/01/22/picture-in-picture-chrome-extension/"
---

Picture-in-Picture Chrome Extension: Build a Floating Video Player

Picture-in-Picture (PiP) functionality has revolutionized the way users consume video content on the web. Whether you're watching a tutorial while working on a project, following a cooking video while browsing recipes, or keeping up with your favorite streamer while checking emails, the ability to have a floating video player has become an essential feature for modern web browsing. we'll walk you through building a Chrome extension that implements a powerful Picture-in-Picture video player, giving users the flexibility to watch videos in a floating window that stays on top of all other content.

The Chrome browser has native Picture-in-Picture support for video elements, but it comes with limitations. The native PiP window is typically small, has limited controls, and doesn't persist across page navigations or allow for customization. By building a Chrome extension that leverages the Document Picture-in-Picture API, we can create a much more powerful solution that gives users complete control over their viewing experience.

This tutorial will take you through every aspect of building a production-ready Picture-in-Picture Chrome extension. We'll start by understanding the underlying technologies, then move on to setting up the extension structure, implementing the core functionality, and finally polishing the user experience with additional features that make your extension stand out from the crowd.

---

Understanding the Document Picture-in-Picture API {#understanding-pip-api}

Before diving into the implementation, it's crucial to understand the technologies we'll be working with. The Document Picture-in-Picture API is a relatively new addition to the web platform that allows web developers to open an arbitrary HTML page in a Picture-in-Picture window. Unlike the traditional HTMLVideoElement.prototype.requestPictureInPicture() method, which only works with video elements and provides a limited, browser-controlled window, the Document Picture-in-Picture API opens up exciting possibilities for creating custom PiP experiences.

The key difference between the traditional video PiP and the Document Picture-in-Picture API lies in flexibility and control. With the traditional approach, the browser handles everything, the window size, controls, and behavior are largely out of the developer's hands. The Document Picture-in-Picture API, on the other hand, gives developers a blank canvas within the PiP window. This means you can embed not just video content, but also custom controls, chat interfaces, interactive elements, and any other HTML content you can imagine.

One of the most powerful aspects of the Document Picture-in-Picture API is that it allows the PiP window to maintain state and persist much longer than traditional PiP. While the browser's native PiP typically closes when the source video ends or when the user navigates away from the page, a Document PiP window can continue functioning independently, making it perfect for creating persistent media players that users can reference throughout their browsing session.

The API works by creating a hidden iframe or opening a new window with special sizing, then requesting that it be displayed in Picture-in-Picture mode. When the request is granted, the browser displays this content in a floating window that the user can position anywhere on their screen. The key methods involved are documentPictureInPicture.requestWindow() to initiate the PiP window, and the various events that allow us to respond to the window opening, closing, and resizing.

---

Setting Up the Chrome Extension Project {#project-setup}

Every Chrome extension starts with a manifest file, and our Picture-in-Picture extension is no exception. We'll be using Manifest V3, which is the current standard for Chrome extensions and offers improved security and performance compared to the older Manifest V2.

Creating the Manifest File

Create a new directory for your extension and add the manifest.json file with the following configuration:

```json
{
  "manifest_version": 3,
  "name": "Floating Video Player",
  "version": "1.0",
  "description": "A powerful Picture-in-Picture extension for floating video playback",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_title": "Open Floating Player"
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

The manifest declares several important permissions that our extension needs. The "activeTab" permission allows us to access the content of the currently active tab when the user clicks our extension icon. The "scripting" permission enables us to inject scripts into web pages, which we'll need to detect video elements and control their playback. The "storage" permission lets us save user preferences so they persist across browsing sessions.

The host permissions are set to "<all_urls>" to allow our extension to work on any website. This is necessary because videos can appear on any platform, and we want our extension to be universally applicable. Restricting this to specific domains would limit the usefulness of our extension significantly.

Directory Structure

Create the following directory structure for your extension:

```
chrome-extension-guide/
 _posts/
 icons/
    icon16.png
    icon48.png
    icon128.png
 background.js
 popup.html
 popup.js
 content.js
 manifest.json
```

The background.js file will handle the extension's background logic and coordinate between different components. The content.js script will be injected into web pages to interact with video elements. The popup.html and popup.js files provide a simple user interface for configuring the extension's behavior.

---

Implementing the Background Service Worker {#background-worker}

The background service worker acts as the central hub for our extension, coordinating communication between the popup, content scripts, and handling various extension events. Let's implement a solid background worker that manages the extension's state and handles user interactions.

```javascript
// background.js

// Store for active video information
let activeVideoInfo = null;

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Get the active tab and inject our content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: findAndPrepareVideo,
    });

    if (results && results[0] && results[0].result) {
      const videoInfo = results[0].result;
      activeVideoInfo = { tabId: tab.id, ...videoInfo };
      
      // Send message to content script to initiate PiP
      await chrome.tabs.sendMessage(tab.id, {
        action: 'openPictureInPicture',
        videoInfo: videoInfo,
      });
    } else {
      // No video found - open popup with instructions
      chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
      chrome.action.openPopup();
    }
  } catch (error) {
    console.error('Error handling extension click:', error);
  }
});

// Function to find video elements on the page
function findAndPrepareVideo() {
  // Find all video elements on the page
  const videos = Array.from(document.querySelectorAll('video'));
  
  if (videos.length === 0) {
    return null;
  }

  // Prefer the currently playing video
  const playingVideo = videos.find(v => !v.paused && !v.ended) || videos[0];
  
  // Get video metadata
  const videoInfo = {
    src: playingVideo.src || playingVideo.currentSrc,
    currentTime: playingVideo.currentTime,
    paused: playingVideo.paused,
    duration: playingVideo.duration,
    volume: playingVideo.volume,
    muted: playingVideo.muted,
    playbackRate: playingVideo.playbackRate,
    videoWidth: playingVideo.videoWidth,
    videoHeight: playingVideo.videoHeight,
  };

  return videoInfo;
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'videoStatusUpdate') {
    activeVideoInfo = { ...activeVideoInfo, ...message.videoInfo };
  }
  
  if (message.action === 'getVideoInfo') {
    sendResponse(activeVideoInfo);
  }
  
  return true;
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Floating Video Player extension installed');
  }
});
```

The background script serves several important functions. First, it handles the user clicking on the extension icon in the Chrome toolbar. When clicked, it attempts to find a video element on the current page using the findAndPrepareVideo function, which we've defined to return information about the first playable video found.

The script intelligently selects the best video to use by first checking for a video that's currently playing, falling back to the first video element on the page if none is playing. It captures comprehensive information about the video, including its source URL, current playback position, volume settings, and dimensions, which we'll use to restore the viewing experience in our custom PiP window.

---

Creating the Content Script {#content-script}

The content script is where the magic happens. This script runs in the context of web pages and is responsible for detecting videos, managing playback, and implementing the Document Picture-in-Picture functionality. This is the most complex part of our extension, so let's break it down carefully.

```javascript
// content.js

// Configuration for the PiP window
const PIP_WINDOW_CONFIG = {
  width: 640,
  height: 360,
  disallowScroll: true,
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPictureInPicture') {
    openDocumentPictureInPicture(message.videoInfo);
  }
  
  if (message.action === 'closePictureInPicture') {
    closeDocumentPictureInPicture();
  }
  
  return true;
});

// Check if Document Picture-in-Picture is supported
function isDocumentPiPSupported() {
  return 'documentPictureInPicture' in window;
}

// Main function to open Document Picture-in-Picture
async function openDocumentPictureInPicture(videoInfo) {
  if (!isDocumentPiPSupported()) {
    alert('Document Picture-in-Picture is not supported in this browser. Please use Chrome 111 or later.');
    return;
  }

  try {
    // Create the PiP window
    const pipWindow = await window.documentPictureInPicture.requestWindow(PIP_WINDOW_CONFIG);
    
    // Set up the PiP window with video player
    setupPipWindow(pipWindow, videoInfo);
    
    // Listen for PiP window events
    pipWindow.addEventListener('enter', () => {
      console.log('Entered Picture-in-Picture mode');
      // Pause the original video when entering PiP
      const originalVideo = document.querySelector('video');
      if (originalVideo) {
        originalVideo.pause();
      }
    });
    
    pipWindow.addEventListener('leave', () => {
      console.log('Left Picture-in-Picture mode');
    });
    
  } catch (error) {
    console.error('Failed to open Document Picture-in-Picture:', error);
  }
}

// Set up the content of the PiP window
function setupPipWindow(pipWindow, videoInfo) {
  // Create the HTML content for the PiP window
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          background: #1a1a1a;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .video-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          position: relative;
        }
        
        video {
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .controls {
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
          cursor: pointer;
          position: relative;
        }
        
        .progress-fill {
          height: 100%;
          background: #ff4d4d;
          border-radius: 3px;
          width: 0%;
          transition: width 0.1s linear;
        }
        
        .time-display {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #ccc;
        }
        
        .buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        
        button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
          font-size: 20px;
        }
        
        button:hover {
          background: rgba(255,255,255,0.1);
        }
        
        .title {
          text-align: center;
          font-size: 14px;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
    </head>
    <body>
      <div class="video-container">
        <video id="pip-video" controls playsinline></video>
      </div>
      <div class="controls">
        <div class="title" id="video-title">Video</div>
        <div class="progress-bar" id="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="time-display">
          <span id="current-time">0:00</span>
          <span id="duration">0:00</span>
        </div>
        <div class="buttons">
          <button id="rewind-btn">⏪</button>
          <button id="play-pause-btn">⏸</button>
          <button id="forward-btn"></button>
          <button id="mute-btn"></button>
          <button id="fullscreen-btn"></button>
        </div>
      </div>
      
      <script>
        const video = document.getElementById('pip-video');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const muteBtn = document.getElementById('mute-btn');
        const progressBar = document.getElementById('progress-bar');
        const progressFill = document.getElementById('progress-fill');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');
        const rewindBtn = document.getElementById('rewind-btn');
        const forwardBtn = document.getElementById('forward-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        
        // Video source from the original page
        const videoSrc = '${videoInfo.src}';
        
        if (videoSrc) {
          video.src = videoSrc;
          video.currentTime = ${videoInfo.currentTime || 0};
          video.volume = ${videoInfo.volume || 1};
          video.playbackRate = ${videoInfo.playbackRate || 1};
          
          if (!${videoInfo.paused}) {
            video.play().catch(e => console.log('Autoplay prevented'));
          }
        }
        
        // Update progress bar
        video.addEventListener('timeupdate', () => {
          const progress = (video.currentTime / video.duration) * 100;
          progressFill.style.width = progress + '%';
          currentTimeEl.textContent = formatTime(video.currentTime);
        });
        
        video.addEventListener('loadedmetadata', () => {
          durationEl.textContent = formatTime(video.duration);
        });
        
        // Play/Pause toggle
        playPauseBtn.addEventListener('click', () => {
          if (video.paused) {
            video.play();
            playPauseBtn.textContent = '⏸';
          } else {
            video.pause();
            playPauseBtn.textContent = '';
          }
        });
        
        // Mute toggle
        muteBtn.addEventListener('click', () => {
          video.muted = !video.muted;
          muteBtn.textContent = video.muted ? '' : '';
        });
        
        // Seek functionality
        progressBar.addEventListener('click', (e) => {
          const rect = progressBar.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          video.currentTime = pos * video.duration;
        });
        
        // Skip buttons
        rewindBtn.addEventListener('click', () => {
          video.currentTime = Math.max(0, video.currentTime - 10);
        });
        
        forwardBtn.addEventListener('click', () => {
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
        });
        
        // Fullscreen
        fullscreenBtn.addEventListener('click', () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        });
        
        function formatTime(seconds) {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
      <\/script>
    </body>
    </html>
  `;
  
  // Write the HTML to the PiP window
  pipWindow.document.write(html);
  pipWindow.document.close();
}

// Close the PiP window
async function closeDocumentPictureInPicture() {
  if (documentPictureInPicture.window) {
    documentPictureInPicture.window.close();
  }
}
```

This content script implements the core Document Picture-in-Picture functionality. The setupPipWindow function is particularly important, it creates a complete HTML document with a custom video player interface that gets rendered inside the PiP window.

The custom player includes several features that go beyond what the browser's native PiP offers. We have a progress bar that shows playback position and allows seeking, play/pause and mute controls, skip forward and backward buttons for quick navigation, and even a fullscreen button for immersive viewing. The styling ensures the player looks modern and professional, with a dark theme that's easy on the eyes.

---

Creating the Extension Popup {#extension-popup}

While our extension works primarily through the toolbar icon click, adding a popup provides additional configuration options and a fallback when no video is detected on a page.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 300px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #ffffff;
    }
    
    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .feature {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .feature-icon {
      font-size: 24px;
    }
    
    .feature-text {
      font-size: 14px;
      line-height: 1.5;
      color: #ccc;
    }
    
    .instructions {
      background: #2a2a2a;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }
    
    .instructions h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #ff4d4d;
    }
    
    .instructions p {
      margin: 0;
      font-size: 13px;
      color: #999;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <h2> Floating Video Player</h2>
  
  <div class="feature">
    <span class="feature-icon"></span>
    <div class="feature-text">
      <strong>Picture-in-Picture Mode</strong><br>
      Watch videos in a floating window that stays on top of everything.
    </div>
  </div>
  
  <div class="feature">
    <span class="feature-icon"></span>
    <div class="feature-text">
      <strong>Custom Controls</strong><br>
      Enhanced playback controls including seek, volume, and fullscreen.
    </div>
  </div>
  
  <div class="feature">
    <span class="feature-icon"></span>
    <div class="feature-text">
      <strong>Persistent Playback</strong><br>
      Continue watching even as you browse different tabs and pages.
    </div>
  </div>
  
  <div class="instructions">
    <h3>No video found?</h3>
    <p>Navigate to a page with a video and click the extension icon to open it in Picture-in-Picture mode.</p>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup provides a clean, informative interface that explains the extension's features to new users and guides them on how to use it effectively. It serves as both documentation and a user-friendly fallback when the extension can't find a video to play.

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Check for videos on the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      function: checkForVideos,
    }, (results) => {
      if (results && results[0] && results[0].result) {
        // Video found - show ready state
        document.querySelector('.instructions h3').textContent = 'Ready!';
        document.querySelector('.instructions p').textContent = 
          'Click the extension icon in your toolbar to open the video in Picture-in-Picture mode.';
        document.querySelector('.instructions h3').style.color = '#4caf50';
      }
    });
  });
});

function checkForVideos() {
  const videos = document.querySelectorAll('video');
  return videos.length > 0;
}
```

---

Adding User Preferences with Storage API {#user-preferences}

To make our extension truly useful, we should add the ability for users to customize their experience. The Chrome Storage API provides an easy way to persist user preferences.

First, let's update our background script to handle preferences:

```javascript
// Add to background.js

// Default preferences
const DEFAULT_PREFERENCES = {
  defaultSize: 'medium',
  autoplay: true,
  showControls: true,
  rememberPosition: true,
};

// Load user preferences
async function getPreferences() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_PREFERENCES, (result) => {
      resolve(result);
    });
  });
}

// Save user preferences
async function savePreferences(preferences) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(preferences, () => {
      resolve();
    });
  });
}
```

You can expand this functionality to allow users to choose their preferred default PiP window size, control whether videos should automatically start playing when opened in PiP mode, and customize various other aspects of the viewing experience.

---

Advanced Features and Enhancements {#advanced-features}

Now that we have a working Picture-in-Picture extension, let's explore some advanced features that can make your extension even more powerful and user-friendly.

Multiple Video Queue Support

For users who want to watch multiple videos sequentially or create a playlist, implementing a queue system can significantly enhance the experience. The content script can be extended to track multiple video elements on a page and allow users to select which video to play in PiP mode.

Video Source Detection and Quality Selection

Advanced users often want control over video quality. By analyzing the video element's available sources and the network conditions, you can implement quality selection that automatically adjusts based on the user's bandwidth.

Keyboard Shortcuts

Power users love keyboard shortcuts. Chrome extensions can register global keyboard shortcuts that work even when the extension popup isn't open. Implement shortcuts like Ctrl+Shift+P to quickly toggle PiP mode on the current video.

Integration with Video Platforms

While our extension works with any video element, adding specific support for popular platforms like YouTube, Vimeo, or Twitch can provide enhanced functionality. This might include support for playlist navigation, quality presets specific to each platform, and improved detection of video content.

---

Testing Your Extension {#testing}

Before publishing your extension to the Chrome Web Store, thorough testing is essential. Here's a comprehensive testing strategy:

Manual Testing

Test your extension on various websites with different video implementations. Pay special attention to websites that use custom video players, iframe-embedded videos, and streaming services that might have additional protection mechanisms. Test across different screen sizes and monitor configurations to ensure the PiP window renders correctly in various scenarios.

Automated Testing

Consider using Chrome's testing framework to create automated tests that verify the extension's functionality across different scenarios. This is particularly useful for catching regressions as you add new features.

Browser Compatibility

While the Document Picture-in-Picture API is Chrome-specific, ensure your extension degrades gracefully on other browsers. Provide clear messaging when the API isn't available rather than failing silently.

---

Publishing Your Extension {#publishing}

Once your extension is tested and ready, you can publish it to the Chrome Web Store. Here's what you need to do:

First, prepare your extension for production by ensuring all code is minified (except where it affects readability), all external resources are properly referenced, and your manifest has accurate version numbers. Then, create a ZIP file of your extension directory (excluding any development files) and submit it through the Chrome Web Store Developer Dashboard.

When writing your extension's description, focus on the benefits users will experience rather than technical details. Use screenshots and a promotional video if possible to showcase the extension in action. Respond promptly to user feedback and reviews to maintain a positive rating.

---

Conclusion {#conclusion}

Building a Picture-in-Picture Chrome extension is an excellent project that teaches you about the Chrome extension platform, the Document Picture-in-Picture API, and modern web development practices. The extension we've built in this guide provides a solid foundation that you can extend and customize to meet specific use cases.

The Document Picture-in-Picture API opens up exciting possibilities beyond what we've covered here. As the API continues to evolve and gain wider browser support, the types of experiences you can create will only expand. We encourage you to experiment with additional features, integrate with your favorite video platforms, and share your creations with the community.

Remember to test thoroughly before publishing, gather user feedback, and continuously improve your extension based on real-world usage. With dedication and attention to user experience, your Picture-in-Picture extension can become a valuable tool for thousands of users who want more flexibility in how they consume video content on the web.

Happy coding, and enjoy creating your floating video player!
