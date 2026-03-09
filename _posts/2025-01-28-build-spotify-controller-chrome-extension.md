---
layout: post
title: "Build a Spotify Controller Chrome Extension: Complete Guide to Music Control Extensions"
description: "Learn how to build a Spotify controller Chrome extension from scratch. This comprehensive guide covers Spotify Web API integration, music control extension development, creating a spotify mini player chrome, and building a fully functional music controller with playback controls."
date: 2025-01-28
categories: [Chrome Extensions, Integration]
tags: [chrome-extension, integration]
keywords: "spotify controller extension, spotify mini player chrome, music control extension, build spotify extension, chrome extension spotify player, spotify web api chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/28/build-spotify-controller-chrome-extension/"
---

# Build a Spotify Controller Chrome Extension: Complete Guide to Music Control Extensions

Spotify has revolutionized how we consume music, with over 500 million active users worldwide. Having quick access to music controls without switching tabs or leaving your current workflow significantly enhances productivity and user experience. Building a **Spotify controller extension** allows users to play, pause, skip, and manage their music directly from Chrome's toolbar, creating a seamless **spotify mini player chrome** experience.

In this comprehensive guide, we will walk through building a fully functional **music control extension** that integrates with Spotify's Web API. You will learn how to authenticate with Spotify, control playback, display track information, and create an intuitive popup interface that serves as a compact **spotify mini player chrome** solution.

---

## Why Build a Spotify Controller Extension? {#why-build}

The demand for integrated music controls in browsers continues to grow for several compelling reasons:

### Enhanced Productivity

Workers and students often listen to music while browsing the web. Having to switch to the Spotify tab to change tracks disrupts workflow and breaks concentration. A **spotify controller extension** eliminates this interruption by providing instant access to playback controls from any tab.

### Multi-Tasking Convenience

Whether you are working in Google Docs, browsing research materials, or managing email, a **music control extension** keeps your focus intact. You can skip to the next track during a meeting preparation or pause the music when you need to make a call, all without leaving your current tab.

### Mini Player Experience

The **spotify mini player chrome** concept has become increasingly popular. Users love having a compact, always-accessible player that shows current track information, album art, and basic controls without consuming significant screen space.

### Learning Opportunity

Building a Spotify controller extension teaches valuable skills including OAuth 2.0 authentication, REST API integration, Chrome extension architecture, and real-time state management. These skills transfer to countless other projects involving third-party API integrations.

---

## Project Architecture and Components {#architecture}

Before diving into code, let's understand the architecture of our Spotify controller extension. A well-structured music control extension consists of several key components:

### The Manifest File

The `manifest.json` file defines the extension's configuration, required permissions, and entry points. Our extension needs permissions for Spotify API access, storage, and popup display.

### Background Service Worker

The service worker handles authentication with Spotify's OAuth 2.0 flow, manages API token refreshal, and coordinates communication between components.

### Popup Interface

The popup serves as our **spotify mini player chrome**, displaying current track information, album art, and playback controls in a compact, user-friendly interface.

### Content Script (Optional)

For advanced features like injecting controls into web pages or detecting Spotify tabs, a content script can provide enhanced integration.

---

## Setting Up the Project {#project-setup}

Let's start by creating the project structure and manifest file:

### Project Directory Structure

```
spotify-controller/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Manifest Configuration

Create the `manifest.json` file with Manifest V3 format:

```json
{
  "manifest_version": 3,
  "name": "Spotify Controller",
  "version": "1.0.0",
  "description": "Control your Spotify playback with a mini player in Chrome",
  "permissions": [
    "storage",
    "tabs"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID",
    "scopes": [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "streaming",
      "playlist-read-private"
    ]
  },
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
  }
}
```

**Important**: You will need to register your extension in the Spotify Developer Dashboard to obtain a client ID. Visit the [Spotify for Developers](https://developer.spotify.com/) portal to create your application.

---

## Implementing OAuth Authentication {#authentication}

Spotify requires OAuth 2.0 authentication to access user data and control playback. Let's implement the authentication flow in our background script:

### Background Script (background.js)

```javascript
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ');

let accessToken = null;

// Handle OAuth redirect
chrome.identity.onAuthSessionChanged.addListener((session) => {
  if (session.accessToken) {
    accessToken = session.accessToken;
    chrome.storage.local.set({ accessToken });
  }
});

// Initiate authentication
function authenticate() {
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&show_dialog=true`;

  return chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  });
}

// Get current access token
async function getAccessToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(result.accessToken);
    });
  });
}
```

This authentication flow uses the implicit grant type, which is suitable for client-side extensions. For production applications, consider implementing the authorization code flow with refresh tokens for longer session durations.

---

## Building the Popup Interface {#popup-interface}

The popup serves as our **spotify mini player chrome**, providing a compact interface for music control. Let's create the HTML structure:

### popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spotify Controller</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="player-container">
    <!-- Login State -->
    <div id="login-view" class="view">
      <button id="login-btn" class="btn-primary">Connect to Spotify</button>
    </div>

    <!-- Player State -->
    <div id="player-view" class="view hidden">
      <div class="track-info">
        <img id="album-art" class="album-art" src="" alt="Album Art">
        <div class="track-details">
          <h3 id="track-name" class="track-name">Not Playing</h3>
          <p id="artist-name" class="artist-name">-</p>
        </div>
      </div>

      <div class="progress-container">
        <span id="current-time" class="time">0:00</span>
        <div class="progress-bar">
          <div id="progress" class="progress"></div>
        </div>
        <span id="duration" class="time">0:00</span>
      </div>

      <div class="controls">
        <button id="shuffle-btn" class="control-btn" title="Shuffle">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
        </button>
        <button id="prev-btn" class="control-btn" title="Previous">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button id="play-btn" class="control-btn play-btn" title="Play/Pause">
          <svg id="play-icon" viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          <svg id="pause-icon" class="hidden" viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button id="next-btn" class="control-btn" title="Next">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button id="repeat-btn" class="control-btn" title="Repeat">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
        </button>
      </div>

      <div class="volume-container">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <input type="range" id="volume" min="0" max="100" value="100" class="volume-slider">
      </div>

      <button id="logout-btn" class="btn-secondary">Disconnect</button>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

---

## Styling the Mini Player {#styling}

Now let's create the CSS to make our **spotify mini player chrome** look polished and professional:

### popup.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #121212;
  color: #fff;
  width: 320px;
  min-height: 200px;
}

.player-container {
  padding: 16px;
}

.view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hidden {
  display: none !important;
}

/* Login View */
#login-view {
  align-items: center;
  justify-content: center;
  min-height: 150px;
}

.btn-primary {
  background-color: #1DB954;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #1ed760;
}

.btn-secondary {
  background-color: transparent;
  color: #b3b3b3;
  border: 1px solid #404040;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  color: #fff;
  border-color: #fff;
}

/* Track Info */
.track-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.album-art {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  background-color: #282828;
}

.track-details {
  flex: 1;
  overflow: hidden;
}

.track-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name {
  font-size: 12px;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Progress Bar */
.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #b3b3b3;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background-color: #404040;
  border-radius: 2px;
  cursor: pointer;
}

.progress {
  height: 100%;
  background-color: #1DB954;
  border-radius: 2px;
  width: 0%;
  transition: width 0.1s;
}

.progress-bar:hover .progress {
  background-color: #1ed760;
}

/* Controls */
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.control-btn {
  background: none;
  border: none;
  color: #b3b3b3;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  color: #fff;
}

.play-btn {
  background-color: #fff;
  color: #000;
  width: 48px;
  height: 48px;
}

.play-btn:hover {
  transform: scale(1.05);
  background-color: #fff;
}

.control-btn.active {
  color: #1DB954;
}

/* Volume */
.volume-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: #404040;
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}
```

---

## Implementing Popup Logic {#popup-logic}

Now let's implement the JavaScript that powers our **music control extension**:

### popup.js

```javascript
class SpotifyController {
  constructor() {
    this.accessToken = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.init();
  }

  async init() {
    // Load access token from storage
    const result = await chrome.storage.local.get(['accessToken']);
    this.accessToken = result.accessToken;

    if (this.accessToken) {
      this.showPlayerView();
      await this.updatePlaybackState();
    } else {
      this.showLoginView();
    }

    this.attachEventListeners();
    this.startPolling();
  }

  showLoginView() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('player-view').classList.add('hidden');
  }

  showPlayerView() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');
  }

  attachEventListeners() {
    // Login button
    document.getElementById('login-btn').addEventListener('click', () => this.authenticate());

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());

    // Playback controls
    document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
    document.getElementById('prev-btn').addEventListener('click', () => this.previousTrack());
    document.getElementById('next-btn').addEventListener('click', () => this.nextTrack());
    document.getElementById('shuffle-btn').addEventListener('click', () => this.toggleShuffle());
    document.getElementById('repeat-btn').addEventListener('click', () => this.toggleRepeat());

    // Volume control
    document.getElementById('volume').addEventListener('input', (e) => this.setVolume(e.target.value));

    // Progress bar click
    document.querySelector('.progress-bar').addEventListener('click', (e) => this.seekTo(e));
  }

  async authenticate() {
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}` +
      `&scope=${encodeURIComponent(SCOPES)}`;

    try {
      const response = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      // Extract token from redirect URL
      const params = new URL(response).hash.substring(1).split('&');
      const tokenParam = params.find(p => p.startsWith('access_token='));
      
      if (tokenParam) {
        this.accessToken = tokenParam.split('=')[1];
        await chrome.storage.local.set({ accessToken: this.accessToken });
        this.showPlayerView();
        await this.updatePlaybackState();
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }

  async logout() {
    await chrome.storage.local.remove(['accessToken']);
    this.accessToken = null;
    this.showLoginView();
  }

  async fetchCurrentTrack() {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.status === 204) {
        // No content - nothing playing
        this.currentTrack = null;
        this.updateUI(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        this.currentTrack = data;
        this.isPlaying = data.is_playing;
        this.updateUI(data);
      }
    } catch (error) {
      console.error('Error fetching track:', error);
    }
  }

  updateUI(data) {
    if (!data || !data.item) {
      document.getElementById('track-name').textContent = 'Not Playing';
      document.getElementById('artist-name').textContent = '-';
      document.getElementById('album-art').src = '';
      return;
    }

    const track = data.item;
    document.getElementById('track-name').textContent = track.name;
    document.getElementById('artist-name').textContent = track.artists.map(a => a.name).join(', ');
    document.getElementById('album-art').src = track.album.images[0]?.url || '';

    // Update play/pause button
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (data.is_playing) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
    }

    // Update progress
    const progress = (data.progress_ms / track.duration_ms) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
    document.getElementById('current-time').textContent = this.formatTime(data.progress_ms);
    document.getElementById('duration').textContent = this.formatTime(track.duration_ms);
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async togglePlay() {
    if (!this.accessToken) return;
    
    const endpoint = this.isPlaying ? 'pause' : 'play';
    try {
      await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      this.isPlaying = !this.isPlaying;
      this.updateUI({ ...this.currentTrack, is_playing: this.isPlaying });
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }

  async previousTrack() {
    await this.controlPlayback('previous');
  }

  async nextTrack() {
    await this.controlPlayback('next');
  }

  async controlPlayback(action) {
    if (!this.accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      // Refresh state after action
      setTimeout(() => this.fetchCurrentTrack(), 300);
    } catch (error) {
      console.error(`Error with ${action}:`, error);
    }
  }

  async toggleShuffle() {
    if (!this.accessToken || !this.currentTrack) return;
    
    const shuffleState = !this.currentTrack.shuffle_state;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      document.getElementById('shuffle-btn').classList.toggle('active', shuffleState);
    } catch (error) {
      console.error('Error toggling shuffle:', error);
    }
  }

  async toggleRepeat() {
    if (!this.accessToken || !this.currentTrack) return;
    
    const repeatModes = ['off', 'context', 'track'];
    const currentIndex = repeatModes.indexOf(this.currentTrack.repeat_state);
    const nextMode = repeatModes[(currentIndex + 1) % repeatModes.length];
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextMode}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      document.getElementById('repeat-btn').classList.toggle('active', nextMode !== 'off');
    } catch (error) {
      console.error('Error toggling repeat:', error);
    }
  }

  async setVolume(volume) {
    if (!this.accessToken) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }

  async seekTo(event) {
    if (!this.accessToken || !this.currentTrack) return;
    
    const progressBar = event.currentTarget;
    const percent = (event.offsetX / progressBar.offsetWidth);
    const positionMs = Math.floor(percent * this.currentTrack.item.duration_ms);
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }

  async updatePlaybackState() {
    await this.fetchCurrentTrack();
  }

  startPolling() {
    // Poll every 2 seconds for playback updates
    setInterval(() => {
      if (this.accessToken) {
        this.fetchCurrentTrack();
      }
    }, 2000);
  }
}

// Initialize the controller
document.addEventListener('DOMContentLoaded', () => {
  new SpotifyController();
});
```

---

## Testing Your Extension {#testing}

Now that we've built our **Spotify controller extension**, let's test it:

1. **Load the extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select your project directory

2. **Configure your Spotify Developer credentials**:
   - Add your client ID to the extension code
   - Set the redirect URI in the Spotify Developer Dashboard

3. **Test the authentication flow**:
   - Click the extension icon
   - Click "Connect to Spotify"
   - Complete the OAuth authorization

4. **Test music controls**:
   - Start playing music in the Spotify app or web player
   - Click the extension icon to see current track
   - Test play/pause, skip, previous buttons

---

## Advanced Features {#advanced-features}

Once you have the basic **music control extension** working, consider adding these advanced features:

### Side Panel Integration

With Chrome's Side Panel API, you can create a persistent **spotify mini player chrome** that stays visible while browsing:

```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel"]
}
```

### Keyboard Shortcuts

Add global keyboard shortcuts for quick control:

```json
"commands": {
  "toggle-play": {
    "suggested_key": "Ctrl+Shift+Space",
    "description": "Toggle play/pause"
  }
}
```

### Media Session API

Integrate with Chrome's media session for system-level controls and lock screen integration:

```javascript
navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
```

---

## Conclusion {#conclusion}

Building a **Spotify controller extension** is an excellent project that combines real-world API integration with practical UI development. You've learned how to:

- Set up OAuth 2.0 authentication with Spotify
- Create a compact **spotify mini player chrome** interface
- Implement full **music control extension** functionality
- Handle real-time playback state updates

This knowledge extends to integrating with other music services, building productivity tools, and creating more complex Chrome extensions. The skills you've developed here form a solid foundation for any Chrome extension project involving third-party APIs.

The **spotify controller extension** you built provides immediate value to users who want seamless music control while browsing. With further enhancements like playlist browsing, search functionality, and personalized shortcuts, you can create an even more powerful music control experience.

Remember to follow Spotify's API guidelines and terms of service when distributing your extension. With this comprehensive guide, you now have everything needed to build, test, and publish your own **music control extension** to the Chrome Web Store.
