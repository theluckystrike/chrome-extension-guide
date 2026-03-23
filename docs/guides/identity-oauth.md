---
layout: default
title: "Chrome Extension OAuth & Identity. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/identity-oauth/"
---
# Identity & OAuth Guide

Overview {#overview}
- `chrome.identity` API for authentication in extensions
- Requires `"identity"` permission (cross-ref `docs/permissions/identity.md`)
- Two main flows: Google OAuth (`getAuthToken`) and third-party OAuth (`launchWebAuthFlow`)

Google OAuth with getAuthToken {#google-oauth-with-getauthtoken}
Chrome Identity & OAuth Guide

This guide covers authentication for Chrome Extensions using the `chrome.identity` API, which provides Google OAuth and custom OAuth flows.

Overview

The `chrome.identity` API provides methods for obtaining OAuth2 access tokens:

| Method | Purpose |
|--------|---------|
| `getAuthToken()` | Get OAuth2 tokens for Google APIs |
| `launchWebAuthFlow()` | Launch custom OAuth flows for third-party providers |
| `getProfileUserInfo()` | Get user's email and ID |
| `removeCachedAuthToken()` | Clear cached tokens |
| `onSignInChanged` | Listen for sign-in state changes |

Add `"identity"` permission to manifest:

```json
{ "permissions": ["identity"] }
```

Setting Up OAuth in manifest.json

Configure the `oauth2` section for Google OAuth:

```json
{
  "oauth2": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

Request only the minimum scopes needed.

Google API Console Configuration

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable APIs in "APIs & Services" > "Library" (e.g., Google Drive API)
3. Configure OAuth consent screen ("External", add app name and email)
4. Create credentials: "OAuth client ID" > "Chrome App"
5. Enter your extension ID (from `chrome://extensions`)

Client ID format: `123456789-abc.apps.googleusercontent.com`

chrome.identity.getAuthToken

Gets an OAuth2 access token for the signed-in user:

```javascript
// Interactive: Shows sign-in prompt if needed
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError.message);
    return;
  }
  console.log('Token:', token);
});

// Silent: Fails if user not already signed in
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  console.log('User signed in:', !!token);
});
```

Token Management {#token-management}
chrome.identity.getProfileUserInfo

Gets email and ID without full OAuth scopes:

```javascript
chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
  console.log('Email:', userInfo.email);
  console.log('ID:', userInfo.id);
});
```

Third-Party OAuth with launchWebAuthFlow {#third-party-oauth-with-launchwebauthflow}
chrome.identity.removeCachedAuthToken

Removes a token from Chrome's cache:

```javascript
// Remove cached token
chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
  console.log('Token removed');
});

// Revoke token completely
function revokeToken(token) {
  chrome.identity.removeCachedAuthToken({ token }, () => {
    fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
  });
}
```

chrome.identity.onSignInChanged

Listen for sign-in state changes:

```javascript
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  console.log(`Account ${account.id}: ${signedIn ? 'signed in' : 'signed out'}`);
  if (!signedIn) clearStoredTokens();
});
```

chrome.identity.launchWebAuthFlow

Use for non-Google OAuth providers:

```javascript
function startAuthFlow() {
  const redirectUrl = chrome.identity.getRedirectURL('github');
  
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('scope', 'repo user:email');
  authUrl.searchParams.set('state', crypto.randomUUID());
  
  chrome.identity.launchWebAuthFlow(
    { url: authUrl.toString(), interactive: true },
    (responseUrl) => {
      if (chrome.runtime.lastError) return;
      const code = new URL(responseUrl).searchParams.get('code');
      exchangeCodeForToken(code);
    }
  );
}
```

PKCE Flow (Recommended for Public Clients) {#pkce-flow-recommended-for-public-clients}
Microsoft OAuth

```javascript
function authenticateWithMicrosoft() {
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
  authUrl.searchParams.set('redirect_uri', chrome.identity.getRedirectURL('microsoft'));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email User.Read');
  authUrl.searchParams.set('state', crypto.randomUUID());
  
  chrome.identity.launchWebAuthFlow(
    { url: authUrl.toString(), interactive: true },
    async (responseUrl) => {
      const code = new URL(responseUrl).searchParams.get('code');
      await exchangeMicrosoftToken(code);
    }
  );
}
```

Storing Auth State {#storing-auth-state}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
Using Tokens with Google APIs

Fetch User Profile

async function saveAuth(token, refresh, expiry, email) {
  await storage.setMany({
    authToken: token,
    refreshToken: refresh,
    tokenExpiry: expiry,
    userEmail: email
  });
}

async function getAuth() {
  return await storage.getMany(['authToken', 'refreshToken', 'tokenExpiry', 'userEmail']);
}

async function clearAuth() {
  await storage.removeMany(['authToken', 'refreshToken', 'tokenExpiry', 'userEmail']);
}
```

Token Refresh Pattern {#token-refresh-pattern}
```javascript
function getUserProfile(token) {
  fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(user => console.log('Name:', user.name, 'Email:', user.email));
}
```

Common Mistakes {#common-mistakes}
- Not handling `chrome.runtime.lastError` in callbacks
- Storing tokens in `chrome.storage.sync` (quota too small, security risk)
- Not implementing token refresh. tokens expire
- Missing PKCE for public clients (security vulnerability)
- Forgetting `interactive: false` for silent auth checks
- Not revoking tokens on uninstall (use `chrome.runtime.setUninstallURL()` to redirect to a server-side revocation endpoint)

Related Articles {#related-articles}

Related Articles

- [OAuth Identity Patterns](../patterns/oauth-identity.md)
- [Identity API Reference](../api-reference/identity-api.md)
---

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://bestchromeextensions.com/extension-monetization-playbook/monetization/stripe-integration), subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
List Google Drive Files

```javascript
function listDriveFiles(token, folderId = 'root') {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = 'files(id, name, mimeType, webViewLink)';
  
  fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => data.files.forEach(f => console.log(f.name)));
}
```

Token Expiry and Refresh

Google tokens expire after 1 hour:

```javascript
class TokenManager {
  constructor() { this.tokenCache = null; this.expiryTime = null; }
  
  async getValidToken() {
    if (this.tokenCache && this.expiryTime > Date.now()) return this.tokenCache;
    
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) { this.cacheToken(token); resolve(token); }
        else { this.getInteractiveToken().then(resolve).catch(reject); }
      });
    });
  }
  
  async getInteractiveToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        this.cacheToken(token); resolve(token);
      });
    });
  }
  
  cacheToken(token) { this.tokenCache = token; this.expiryTime = Date.now() + (55 * 60 * 1000); }
  
  async refreshToken() { await this.removeCachedToken(); return this.getValidToken(); }
  
  removeCachedToken() {
    return new Promise((resolve) => {
      if (this.tokenCache) {
        chrome.identity.removeCachedAuthToken({ token: this.tokenCache }, () => {
          this.tokenCache = null; this.expiryTime = null; resolve();
        });
      } else resolve();
    });
  }
}
```

Handle 401 errors:

```javascript
async function safeApiCall(url, options = {}) {
  const token = await tokenManager.getValidToken();
  let response = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${token}` } });
  
  if (response.status === 401) {
    await tokenManager.refreshToken();
    const newToken = await tokenManager.getValidToken();
    response = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${newToken}` } });
  }
  return response;
}
```

Non-Google OAuth: GitHub with PKCE

Always use PKCE for public clients:

```javascript
class GitHubAuth {
  constructor(clientId) { this.clientId = clientId; this.redirectUrl = chrome.identity.getRedirectURL('github'); }
  
  async authorize() {
    const state = crypto.randomUUID();
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);
    
    await chrome.storage.session.set({ oauth_state: state, code_verifier: verifier });
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUrl);
    authUrl.searchParams.set('scope', 'repo user:email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          const params = new URL(responseUrl).searchParams;
          const returnedState = params.get('state');
          if (returnedState !== state) { reject(new Error('State mismatch')); return; }
          const code = params.get('code');
          const { code_verifier } = await chrome.storage.session.get('code_verifier');
          resolve(await this.exchangeCodeForToken(code, code_verifier));
        });
    });
  }
  
  generateCodeVerifier() {
    const array = new Uint8Array(32); crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  async generateCodeChallenge(verifier) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  async exchangeCodeForToken(code, verifier) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.clientId, code, redirect_uri: this.redirectUrl, code_verifier: verifier })
    });
    return res.json();
  }
}
```

Building a Google Drive File Picker

```javascript
class DriveFilePicker {
  constructor(tokenManager) { this.tokenManager = tokenManager; }
  
  async openFilePicker() {
    const token = await this.tokenManager.getValidToken();
    const files = await this.listFiles(token, 'root');
    return this.renderFileList(files);
  }
  
  async listFiles(token, folderId) {
    const query = `'${folderId}' in parents and trashed = false`;
    const fields = 'files(id, name, mimeType, webViewLink)';
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return (await res.json()).files || [];
  }
  
  async getFileContent(token, fileId) {
    const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { mimeType } = await meta.json();
    
    const exports = {
      'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    if (exports[mimeType]) {
      return (await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exports[mimeType]}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })).blob();
    }
    return (await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })).blob();
  }
}
```

Security Best Practices

1. Store Tokens Securely

```javascript
// DO: Use chrome.storage.local
chrome.storage.local.set({ authToken: token });

// DON'T: localStorage (never)
localStorage.setItem('token', token);
```

2. Always Use PKCE

Generate code verifier/challenge before auth, include in URL, exchange with verifier.

3. Use Minimal Scopes

```json
// Bad
"scopes": ["https://www.googleapis.com/auth/drive"]

// Good
"scopes": ["https://www.googleapis.com/auth/drive.file"]
```

4. Clear Tokens on Uninstall

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'uninstall') {
    chrome.storage.local.clear();
    chrome.runtime.setUninstallURL('https://yoursite.com/uninstall');
  }
});
```

Reference

- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Google Identity Services](https://developers.google.com/identity)
- [Google Cloud Console](https://console.cloud.google.com/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
