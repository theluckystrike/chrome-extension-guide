---
title: Building a YouTube Enhancer Extension
description: Learn how to build a Chrome extension that enhances YouTube with playback speed shortcuts, video stats overlay, and volume memory per channel.
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-youtube-enhancer/"
---

# Chrome Extension Building a YouTube Enhancer Extension — Complete Developer's Guide

Learn how to build powerful Chrome extensions with this comprehensive guide covering practical implementation and best practices. This guide provides step-by-step instructions for creating professional-grade extensions.
This tutorial walks you through creating a Chrome extension that enhances YouTube's video player with productivity features.

## Prerequisites
- Chrome browser (version 88+)
- Basic knowledge of JavaScript and Chrome extensions

## Project Structure
```
youtube-enhancer/
├── manifest.json
├── content.js
├── options.html, options.js
├── styles.css
```

## Step 1: Manifest Configuration

Configure the manifest with content scripts matching YouTube URLs:

```json
{
  "manifest_version": 3,
  "name": "YouTube Enhancer",
  "permissions": ["storage"],
  "host_permissions": ["https://www.youtube.com/*"],
  "action": { "default_popup": "options.html" },
  "content_scripts": [{
    "matches": ["https://www.youtube.com/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }]
}
```

Reference: [Content Script Patterns](/docs/guides/content-script-patterns.md)

## Step 2: Detect Video Element

YouTube is a SPA, so we need to detect when a video is available:

```javascript
function findVideoElement() {
  return document.querySelector('video');
}

let currentVideo = null;
const observer = new MutationObserver(() => {
  const video = findVideoElement();
  if (video && video !== currentVideo) {
    currentVideo = video;
    initializeVideoFeatures(video);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

Reference: [DOM Observer Patterns](/docs/patterns/dom-observer-patterns.md)

## Step 3: Playback Speed Controls

Add keyboard shortcuts to adjust playback speed:

```javascript
function adjustPlaybackSpeed(delta) {
  const video = findVideoElement();
  if (!video) return;
  video.playbackRate = Math.max(0.25, Math.min(4, video.playbackRate + delta));
}

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '[') adjustPlaybackSpeed(-0.25);
  if (e.key === ']') adjustPlaybackSpeed(0.25);
});
```

## Step 4: Speed Display Overlay

Show current playback rate as an overlay:

```javascript
function createSpeedOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'yt-enhancer-speed';
  overlay.className = 'yt-enhancer-overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function updateSpeedDisplay(rate) {
  const overlay = document.getElementById('yt-enhancer-speed') || createSpeedOverlay();
  overlay.textContent = `${rate}x`;
  overlay.style.display = 'block';
}
```

## Step 5: Video Stats Overlay

Display resolution, codec, and bitrate information:

```javascript
function getVideoStats() {
  const video = findVideoElement();
  if (!video) return null;
  return {
    resolution: `${video.videoWidth}x${video.videoHeight}`,
    currentTime: video.currentTime,
    duration: video.duration,
    playbackRate: video.playbackRate
  };
}

function createStatsOverlay() {
  const stats = document.createElement('div');
  stats.id = 'yt-enhancer-stats';
  stats.className = 'yt-enhancer-stats';
  return stats;
}
```

Reference: [Dynamic Content Injection](/docs/patterns/dynamic-content-injection.md)

## Step 6: Always Show Progress Bar

Override YouTube's progress bar visibility:

```css
.ytp-chrome-bottom { opacity: 1 !important; }
.ytp-hover-progress-lightoff .ytp-chrome-bottom { opacity: 1 !important; }
```

## Step 7: Remember Volume Per Channel

Save and restore volume settings:

```javascript
async function getChannelVolume(channelId) {
  const data = await chrome.storage.local.get(channelId);
  return data[channelId]?.volume ?? 1;
}

async function saveChannelVolume(channelId, volume) {
  await chrome.storage.local.set({ [channelId]: { volume } });
}
```

Reference: [Storage Patterns](/docs/guides/storage-patterns.md)

## Step 8: Options Page

Create an options page for customizing shortcuts:

```javascript
// options.js
document.getElementById('save').addEventListener('click', () => {
  const shortcuts = {
    speedUp: document.getElementById('speedUp').value,
    speedDown: document.getElementById('speedDown').value
  };
  chrome.storage.local.set({ shortcuts });
});
```

## Step 9: SPA Navigation Handling

YouTube uses the History API. Listen for navigation:

```javascript
window.addEventListener('yt-navigate-finish', () => {
  // Re-initialize features on page change
  const video = findVideoElement();
  if (video) initializeVideoFeatures(video);
});
```

## Cleanup Between Videos

Always clean up when switching videos:

```javascript
function initializeVideoFeatures(video) {
  // Remove old overlays
  document.querySelectorAll('.yt-enhancer-overlay').forEach(el => el.remove());
  
  // Apply saved volume for current channel
  const channelId = getChannelId();
  getChannelVolume(channelId).then(vol => {
    video.volume = vol;
  });
  
  video.addEventListener('volumechange', () => {
    saveChannelVolume(channelId, video.volume);
  });
}
```

## Summary

This extension demonstrates key Chrome extension patterns for working with SPAs like YouTube. The DOM observer handles YouTube's dynamic content, keyboard shortcuts provide quick playback control, and storage persists user preferences per channel.

Next steps: Add ad-skip detection, implement keyboard shortcut customization, or add video quality presets.
