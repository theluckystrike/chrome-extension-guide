---
layout: post
title: "Build a Social Media Dashboard Chrome Extension: Twitter, LinkedIn, and More"
description: "Learn how to build a powerful social media dashboard Chrome extension that integrates Twitter, LinkedIn, and other platforms. Complete guide covering API integration, Manifest V3, and best practices."
date: 2025-04-12
categories: [Chrome-Extensions, Tutorials]
tags: [social-media, dashboard, chrome-extension]
keywords: "chrome extension social media, social media dashboard extension, twitter chrome extension, linkedin chrome extension, social media tools chrome"
canonical_url: "https://bestchromeextensions.com/2025/04/12/build-social-media-chrome-extension/"
---

# Build a Social Media Dashboard Chrome Extension: Twitter, LinkedIn, and More

Social media management has become increasingly complex in 2025. With professionals maintaining presence on multiple platforms, Twitter/X, LinkedIn, Instagram, Facebook, and newer networks like Threads, managing notifications, scheduling posts, and tracking engagement across these platforms can consume hours of valuable time each week. This is where a well-designed Chrome extension social media dashboard can transform your workflow.

I'll walk you through building a complete social media dashboard Chrome extension from scratch. You'll learn how to integrate multiple social platforms, create an intuitive dashboard interface, handle authentication securely, and deliver a smooth user experience that rivals standalone web applications.

---

Why Build a Social Media Dashboard Chrome Extension? {#why-build}

The demand for social media tools chrome extensions continues to grow exponentially. Marketing professionals, content creators, and business owners need quick access to their social metrics without switching between dozens of browser tabs. A Chrome extension offers several compelling advantages over traditional web-based dashboards.

First, there's the accessibility factor. Unlike web apps that require logging in each time, a Chrome extension is always available with a single click from the browser toolbar. This proximity to the user's browsing experience means your extension becomes an integral part of their daily workflow. Users can check their Twitter engagement or LinkedIn notifications without leaving their current webpage.

Second, Chrome extensions can use browser-specific features like desktop notifications, keyboard shortcuts, and badge updates to keep users informed in real-time. Push notifications from web apps often get lost in email inboxes or notification centers, but Chrome's notification system is designed for immediate attention.

Third, the distribution model is remarkably straightforward. The Chrome Web Store provides instant access to over 3 billion Chrome users worldwide. With proper SEO optimization and a compelling description, your extension can quickly gain traction without the massive marketing budgets required for standalone web applications.

The competitive landscape for social media dashboard extensions is still relatively open. While established players exist, there's significant room for innovation, particularly in areas like cross-platform analytics, AI-powered content suggestions, and workflow automation. Building a Twitter Chrome extension or LinkedIn chrome extension that truly solves user problems can establish a loyal user base and potentially evolve into a monetized product.

---

Understanding the Architecture {#architecture}

Before diving into code, let's establish the architectural foundation for your social media dashboard extension. A well-structured Chrome extension consists of several key components, each serving a specific purpose in the overall ecosystem.

The Manifest File

Every Chrome extension begins with the manifest.json file. For our social media dashboard, we'll use Manifest V3, which is the current standard and offers improved security and performance. The manifest defines the extension's permissions, background workers, popup interface, and content script capabilities.

```json
{
  "manifest_version": 3,
  "name": "Social Media Dashboard Pro",
  "version": "1.0.0",
  "description": "Unified social media dashboard for Twitter, LinkedIn, and more",
  "permissions": [
    "storage",
    "notifications",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://api.twitter.com/*",
    "https://api.linkedin.com/*",
    "https://*.linkedin.com/*",
    "https://twitter.com/*"
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

The permissions array is critical for our extension. We need storage to save user preferences and authentication tokens, notifications to alert users of important updates, and various host permissions to allow our extension to communicate with social media APIs.

Service Workers and Background Processing

In Manifest V3, background pages have been replaced by service workers. These are event-driven scripts that run independently of any web page. For a social media dashboard, the service worker handles several crucial functions:

First, it manages periodic data fetching. Even when the user isn't actively using the extension, the service worker can periodically check for new notifications and updates across connected platforms. This ensures users always see fresh data when they open the extension.

Second, the service worker handles authentication tokens. Rather than storing sensitive OAuth tokens in local storage accessible to content scripts, the service worker manages these securely and provides them to other extension components as needed.

Third, the service worker coordinates communication between different parts of the extension. When a content script detects user activity on Twitter, it can message the service worker, which then updates the popup interface accordingly.

```javascript
// background.js - Service worker for social media dashboard
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.local.set({
    platforms: {
      twitter: { connected: false, token: null },
      linkedin: { connected: false, token: null }
    },
    refreshInterval: 5, // minutes
    notifications: {
      mentions: true,
      likes: true,
      followers: true,
      messages: true
    }
  });
  
  // Schedule periodic data refresh
  chrome.alarms.create('refreshData', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshData') {
    refreshAllPlatforms();
  }
});

async function refreshAllPlatforms() {
  const { platforms } = await chrome.storage.local.get('platforms');
  
  if (platforms.twitter.connected) {
    await fetchTwitterData();
  }
  if (platforms.linkedin.connected) {
    await fetchLinkedInData();
  }
  
  // Update badge with notification count
  updateBadgeCount();
}
```

The Popup Interface

The popup is what users see when they click your extension icon. This needs to be a comprehensive yet clean interface that displays the most important information at a glance while providing navigation to more detailed views.

For our social media dashboard, the popup should display notification previews from each connected platform, quick action buttons (like composing a new tweet or post), and summary metrics like follower counts and engagement rates. The popup should load quickly and handle loading states gracefully.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="dashboard">
    <header class="header">
      <h1>Social Dashboard</h1>
      <div class="platform-toggles">
        <button id="twitter-toggle" class="platform-btn twitter">
          <span class="icon"></span>
          <span class="status">Connect</span>
        </button>
        <button id="linkedin-toggle" class="platform-btn linkedin">
          <span class="icon"></span>
          <span class="status">Connect</span>
        </button>
      </div>
    </header>
    
    <div class="content">
      <section class="notifications">
        <h2>Recent Notifications</h2>
        <div id="notifications-list" class="notifications-list">
          <div class="loading">Loading...</div>
        </div>
      </section>
      
      <section class="quick-stats">
        <h2>Quick Stats</h2>
        <div class="stats-grid">
          <div class="stat-card twitter">
            <span class="stat-value" id="twitter-followers">--</span>
            <span class="stat-label">Twitter Followers</span>
          </div>
          <div class="stat-card linkedin">
            <span class="stat-value" id="linkedin-connections">--</span>
            <span class="stat-label">LinkedIn Connections</span>
          </div>
        </div>
      </section>
    </div>
    
    <footer class="footer">
      <button id="settings-btn"> Settings</button>
      <button id="refresh-btn"> Refresh</button>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

---

Integrating Twitter API {#twitter-integration}

Twitter integration is often the first platform developers tackle when building social media tools Chrome extensions. The Twitter API (now X API) provides comprehensive endpoints for reading tweets, posting updates, accessing user information, and retrieving notifications and engagement metrics.

To get started, you'll need to create a developer account on the Twitter Developer Portal and create a project with an app. You'll receive API keys and bearer tokens that your extension will use to authenticate requests.

There are two primary approaches to Twitter integration in Chrome extensions. The first involves making direct API calls from the background service worker using the user's OAuth tokens. The second uses Twitter's embedded widgets and extracts data from them. For a true dashboard experience, the API approach provides more flexibility and data access.

```javascript
// twitter-api.js - Twitter API integration module
const TWITTER_API_BASE = 'https://api.twitter.com/2';

class TwitterClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }
  
  async getUser() {
    const response = await fetch(`${TWITTER_API_BASE}/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getMentions(maxResults = 10) {
    const params = new URLSearchParams({
      'max_results': maxResults,
      'tweet.fields': 'created_at,public_metrics,author_id'
    });
    
    const response = await fetch(
      `${TWITTER_API_BASE}/users/me/mentions?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.json();
  }
  
  async getNotifications() {
    // Get recent engagement notifications
    const [mentions, likes, retweets] = await Promise.all([
      this.getMentions(20),
      this.getRecentLikes(20),
      this.getRecentRetweets(20)
    ]);
    
    return this.mergeNotifications(mentions, likes, retweets);
  }
  
  async postTweet(text) {
    const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    return response.json();
  }
  
  async getTimeline(maxResults = 25) {
    const params = new URLSearchParams({
      'max_results': maxResults,
      'tweet.fields': 'created_at,public_metrics,author_id',
      'expansions': 'author_id',
      'user.fields': 'name,username,profile_image_url'
    });
    
    const response = await fetch(
      `${TWITTER_API_BASE}/users/me/timelines/reverse_chronological?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.json();
  }
}
```

When building a Twitter chrome extension, it's crucial to implement proper rate limiting. The Twitter API has strict limits on how many requests you can make within specific time windows. Your extension should cache responses and only refresh data when necessary or on user-initiated refreshes.

Also important is handling the OAuth flow correctly. Chrome extensions have specific security considerations for OAuth. You should use the OAuth 2.0 PKCE (Proof Key for Code Exchange) flow and never expose your client secret in the extension code. Consider implementing a server-side component that handles the OAuth handshake while keeping the extension client-focused.

---

Integrating LinkedIn API {#linkedin-integration}

LinkedIn integration presents unique challenges compared to Twitter. The LinkedIn API has more restrictive access policies, and many features require approval from LinkedIn's partner team. However, basic functionality like reading profile information, connections, and notifications is available through their Marketing API and Organization APIs.

Building a LinkedIn chrome extension requires careful consideration of the platform's terms of service. LinkedIn has been particularly aggressive about enforcing policies against unauthorized data collection, so ensure your extension complies with their API terms and user privacy expectations.

```javascript
// linkedin-api.js - LinkedIn API integration module
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

class LinkedInClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }
  
  async getProfile() {
    const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.json();
  }
  
  async getConnections(start = 0, count = 50) {
    const response = await fetch(
      `${LINKEDIN_API_BASE}/connections?start=${start}&count=${count}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.json();
  }
  
  async getNetworkUpdates() {
    // Get recent activity from connections
    const response = await fetch(
      `${LINKEDIN_API_BASE}/networkUpdates`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.json();
  }
  
  async getNotifications() {
    const response = await fetch(
      `${LINKEDIN_API_BASE}/notifications`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.json();
  }
  
  async sharePost(comment, title, text, url, imageUrl) {
    const payload = {
      author: `urn:li:person:${this.userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: 'ARTICLE',
          media: [{
            status: 'READY',
            originalUrl: url,
            title: {
              text: title
            },
            description: {
              text: comment
            }
          }]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
    
    if (imageUrl) {
      payload.specificContent['com.linkedin.ugc.ShareContent'].media[0].media = imageUrl;
    }
    
    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    return response.json();
  }
}
```

For LinkedIn chrome extension development, you may also want to consider content script-based integration. This involves injecting scripts into LinkedIn's web pages to extract information directly from the DOM. This approach can provide functionality beyond what's available through the official API, but it must be done carefully to avoid violating LinkedIn's terms of service.

---

Building the Dashboard UI {#dashboard-ui}

The user interface is where your social media dashboard extension truly differentiates itself. A well-designed dashboard consolidates information from multiple platforms into a cohesive, easy-to-navigate interface. Users should be able to see their most important metrics at a glance and drill down into specific platforms or notification types as needed.

The CSS for your dashboard should prioritize readability and quick scanning. Use platform-specific colors (Twitter blue, LinkedIn blue) to help users quickly identify which platform each notification or metric belongs to. Implement card-based layouts that separate different types of content while maintaining visual harmony.

```css
/* popup.css - Dashboard styling */
:root {
  --twitter-blue: #1DA1F2;
  --linkedin-blue: #0A66C2;
  --bg-primary: #ffffff;
  --bg-secondary: #f7f9fa;
  --text-primary: #0f1419;
  --text-secondary: #536471;
  --border-color: #eff3f4;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --radius: 12px;
}

body {
  width: 380px;
  min-height: 500px;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.header h1 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
}

.platform-toggles {
  display: flex;
  gap: 8px;
}

.platform-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.platform-btn.twitter {
  background: rgba(29, 161, 242, 0.1);
  color: var(--twitter-blue);
}

.platform-btn.twitter.connected {
  background: var(--twitter-blue);
  color: white;
}

.platform-btn.linkedin {
  background: rgba(10, 102, 194, 0.1);
  color: var(--linkedin-blue);
}

.platform-btn.linkedin.connected {
  background: var(--linkedin-blue);
  color: white;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

section {
  margin-bottom: 20px;
}

section h2 {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #edf3f5;
}

.notification-item.twitter {
  border-left: 3px solid var(--twitter-blue);
}

.notification-item.linkedin {
  border-left: 3px solid var(--linkedin-blue);
}

.notification-icon {
  font-size: 20px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-text {
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  text-align: center;
}

.stat-card.twitter {
  background: rgba(29, 161, 242, 0.08);
}

.stat-card.linkedin {
  background: rgba(10, 102, 194, 0.08);
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-card.twitter .stat-value {
  color: var(--twitter-blue);
}

.stat-card.linkedin .stat-value {
  color: var(--linkedin-blue);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
}

.footer button {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.footer button:hover {
  background: var(--bg-secondary);
}
```

---

Implementing Authentication Flow {#authentication}

Authentication is one of the most critical and complex aspects of building a social media dashboard extension. Each platform uses OAuth 2.0 for authentication, and managing multiple OAuth flows within a Chrome extension requires careful architecture.

The recommended approach uses a combination of the extension's popup for user interaction and the service worker for secure token storage. When a user clicks "Connect" for a platform, the popup initiates the OAuth flow by opening a new tab with the platform's authorization URL. After the user authorizes the application, they're redirected to a callback URL that your extension intercepts.

```javascript
// popup.js - Authentication handling
document.addEventListener('DOMContentLoaded', async () => {
  const { platforms } = await chrome.storage.local.get('platforms');
  
  // Update UI based on connection status
  updatePlatformButton('twitter', platforms.twitter.connected);
  updatePlatformButton('linkedin', platforms.linkedin.connected);
  
  // Set up event listeners
  document.getElementById('twitter-toggle').addEventListener('click', () => {
    if (platforms.twitter.connected) {
      disconnectPlatform('twitter');
    } else {
      initiateOAuth('twitter');
    }
  });
  
  document.getElementById('linkedin-toggle').addEventListener('click', () => {
    if (platforms.linkedin.connected) {
      disconnectPlatform('linkedin');
    } else {
      initiateOAuth('linkedin');
    }
  });
  
  document.getElementById('refresh-btn').addEventListener('click', refreshData);
});

function updatePlatformButton(platform, connected) {
  const button = document.getElementById(`${platform}-toggle`);
  const status = button.querySelector('.status');
  
  if (connected) {
    button.classList.add('connected');
    status.textContent = 'Connected';
  } else {
    button.classList.remove('connected');
    status.textContent = 'Connect';
  }
}

async function initiateOAuth(platform) {
  const redirectUri = chrome.identity.getRedirectURL();
  
  let authUrl;
  switch (platform) {
    case 'twitter':
      authUrl = `https://twitter.com/i/oauth2/authorize?${new URLSearchParams({
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'tweet.read tweet.write users.read follows.read offline.access',
        state: 'twitter_auth',
        code_challenge: generateCodeChallenge(),
        code_challenge_method: 'S256'
      })}`;
      break;
    case 'linkedin':
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams({
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'r_liteprofile r_emailaddress w_member_social',
        state: 'linkedin_auth'
      })}`;
      break;
  }
  
  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });
    
    // Extract authorization code from redirect URL
    const urlParams = new URLSearchParams(new URL(responseUrl).search);
    const code = urlParams.get('code');
    
    if (code) {
      await exchangeCodeForToken(platform, code);
    }
  } catch (error) {
    console.error('OAuth error:', error);
    showError(`Failed to connect ${platform}: ${error.message}`);
  }
}

async function exchangeCodeForToken(platform, code) {
  // Note: Token exchange should ideally happen server-side to protect secrets
  // This is a simplified client-side example
  const redirectUri = chrome.identity.getRedirectURL();
  
  let tokenUrl, body;
  switch (platform) {
    case 'twitter':
      tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: TWITTER_CLIENT_ID,
        code_verifier: localStorage.getItem('code_verifier')
      });
      break;
    case 'linkedin':
      tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
      body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET
      });
      break;
  }
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  });
  
  const data = await response.json();
  
  if (data.access_token) {
    await chrome.storage.local.set({
      [`${platform}Token`]: data.access_token]
    });
    
    const { platforms } = await chrome.storage.local.get('platforms');
    platforms[platform].connected = true;
    platforms[platform].token = data.access_token;
    await chrome.storage.local.set({ platforms });
    
    updatePlatformButton(platform, true);
    refreshData();
  }
}

function generateCodeChallenge() {
  // Generate PKCE code challenge
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = Array.from(array, byte => 
    byte.toString(16).padStart(2, '0')
  ).join('');
  
  // Store for token exchange
  localStorage.setItem('code_verifier', codeVerifier);
  
  // SHA256 hash for code challenge
  return btoa(String.fromCharCode(...new Uint8Array(
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  ))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function disconnectPlatform(platform) {
  const { platforms } = await chrome.storage.local.get('platforms');
  platforms[platform] = { connected: false, token: null };
  await chrome.storage.local.set({ platforms });
  
  updatePlatformButton(platform, false);
}
```

---

Adding Notifications and Real-Time Updates {#notifications}

A key feature that makes Chrome extensions powerful for social media management is the ability to send desktop notifications. When users receive mentions, likes, or messages, your extension can alert them immediately rather than waiting for them to check manually.

```javascript
// notifications.js - Desktop notification handling
async function checkAndNotify() {
  const { platforms, notifications } = await chrome.storage.local.get(['platforms', 'notifications']);
  
  // Check Twitter
  if (platforms.twitter.connected && notifications.mentions) {
    const twitter = new TwitterClient(platforms.twitter.token);
    const mentions = await twitter.getMentions(5);
    const lastMentionId = await getLastNotificationId('twitter_mentions');
    
    const newMentions = mentions.data.filter(m => m.id !== lastMentionId);
    if (newMentions.length > 0) {
      showNotification({
        platform: 'twitter',
        title: `${newMentions.length} new Twitter mention${newMentions.length > 1 ? 's' : ''}`,
        message: newMentions[0].text,
        icon: 'icons/twitter-icon.png'
      });
      
      await setLastNotificationId('twitter_mentions', newMentions[0].id);
    }
  }
  
  // Check LinkedIn
  if (platforms.linkedin.connected && notifications.messages) {
    const linkedin = new LinkedInClient(platforms.linkedin.token);
    const notifications = await linkedin.getNotifications();
    
    // Process and notify similarly
  }
}

function showNotification({ platform, title, message, icon }) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: icon || 'icons/icon128.png',
    title: title,
    message: message,
    priority: 1,
    buttons: [
      { title: 'View' },
      { title: 'Dismiss' }
    ]
  }, (notificationId) => {
    // Store notification ID for button handling
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Open platform in new tab
    const platform = notificationId.includes('twitter') ? 'twitter' : 'linkedin';
    chrome.tabs.create({ 
      url: platform === 'twitter' ? 'https://twitter.com/notifications' : 'https://www.linkedin.com/feed/' 
    });
  }
});
```

---

Testing and Deployment {#deployment}

Before publishing your social media dashboard extension to the Chrome Web Store, thorough testing is essential. Start by testing locally in development mode. Load your unpacked extension by navigating to chrome://extensions/, enabling Developer mode, and clicking "Load unpacked."

Test all authentication flows, ensure data fetching works correctly, and verify that the UI displays properly across different screen sizes. Pay special attention to error handling, if an API request fails or token expires, your extension should handle it gracefully without breaking.

Create screenshots and a promotional description that highlights your extension's unique features. The Chrome Web Store has specific requirements for extension icons and marketing assets. Ensure you have 128x128, 48x48, and 16x16 pixel icons ready.

When you're ready to publish, bundle your extension using the "Pack extension" button in the developer dashboard or run:

```bash
cd /path/to/extension
zip -r extension.zip manifest.json popup.html popup.css popup.js background.js icons/ _locales/
```

Upload this zip file to the Chrome Web Store Developer Dashboard. After review (which typically takes a few days), your social media dashboard extension will be live and available to Chrome users worldwide.

---

Conclusion

Building a social media dashboard Chrome extension is a rewarding project that combines web development skills with real utility. By integrating Twitter, LinkedIn, and other platforms into a unified interface, you create a tool that can significantly improve productivity for social media managers, marketers, and professionals who maintain active social presences.

The architecture we've explored, using Manifest V3, service workers for background processing, secure OAuth authentication, and a clean popup interface, provides a solid foundation that can be extended with additional platforms, analytics features, and automation capabilities. As you iterate on your extension and gather user feedback, you'll discover additional features that make your dashboard truly indispensable.

Remember to respect user privacy, handle data securely, and comply with each platform's terms of service. With thoughtful implementation and continuous improvement, your social media tools Chrome extension can become a valuable resource for thousands of users seeking to streamline their social media management workflow.

---

*Ready to start building? Check out our other Chrome extension tutorials and guides to expand your development skills and create even more powerful browser tools.*
