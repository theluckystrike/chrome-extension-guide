---
layout: default
title: "Chrome Extension OAuth & Identity — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/identity-oauth/"
---
# Identity & OAuth Guide

## Overview {#overview}
- `chrome.identity` API for authentication in extensions
- Requires `"identity"` permission (cross-ref `docs/permissions/identity.md`)
- Two main flows: Google OAuth (`getAuthToken`) and third-party OAuth (`launchWebAuthFlow`)

## Google OAuth with getAuthToken {#google-oauth-with-getauthtoken}
```json
// manifest.json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.readonly"
    ]
  }
}
```

```javascript
// Get OAuth token for Google APIs
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error('Auth failed:', chrome.runtime.lastError.message);
    return;
  }
  // Use token with Google APIs
  fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(user => console.log('User:', user.email));
});

// Silent auth (no popup, fails if not already authorized)
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  if (token) {
    // User already authorized
  }
});
```

## Token Management {#token-management}
```javascript
// Remove cached token (for logout or refresh)
chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
  console.log('Token removed from cache');
});

// Revoke token entirely (user must re-authorize)
function revokeToken(token) {
  chrome.identity.removeCachedAuthToken({ token }, () => {
    fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
  });
}

// Get user profile info
chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
  console.log('Email:', userInfo.email);
  console.log('ID:', userInfo.id);
});
```

## Third-Party OAuth with launchWebAuthFlow {#third-party-oauth-with-launchwebauthflow}
```javascript
// For GitHub, Twitter, Facebook, custom OAuth providers
function getGitHubToken() {
  const clientId = 'YOUR_GITHUB_CLIENT_ID';
  const redirectUrl = chrome.identity.getRedirectURL('github');
  // Returns: https://<extension-id>.chromiumapp.org/github

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('scope', 'repo user');
  authUrl.searchParams.set('state', crypto.randomUUID()); // CSRF protection

  chrome.identity.launchWebAuthFlow(
    { url: authUrl.toString(), interactive: true },
    (responseUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Auth failed:', chrome.runtime.lastError.message);
        return;
      }
      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');
      // Exchange code for token via your backend
      exchangeCodeForToken(code);
    }
  );
}
```

## PKCE Flow (Recommended for Public Clients) {#pkce-flow-recommended-for-public-clients}
```javascript
// Generate PKCE challenge
async function generatePKCE() {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

async function authWithPKCE() {
  const { verifier, challenge } = await generatePKCE();
  const redirectUrl = chrome.identity.getRedirectURL();

  const authUrl = new URL('https://auth.example.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  chrome.identity.launchWebAuthFlow(
    { url: authUrl.toString(), interactive: true },
    async (responseUrl) => {
      const code = new URL(responseUrl).searchParams.get('code');
      // Exchange with verifier
      const tokenResponse = await fetch('https://auth.example.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUrl,
          client_id: CLIENT_ID,
          code_verifier: verifier
        })
      });
      const { access_token, refresh_token } = await tokenResponse.json();
    }
  );
}
```

## Storing Auth State {#storing-auth-state}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  authToken: 'string',
  refreshToken: 'string',
  tokenExpiry: 'number',
  userEmail: 'string'
}), 'local');

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

## Token Refresh Pattern {#token-refresh-pattern}
```javascript
async function getValidToken() {
  const { authToken, tokenExpiry, refreshToken } = await getAuth();
  if (authToken && tokenExpiry > Date.now()) {
    return authToken;
  }
  if (refreshToken) {
    return await refreshAccessToken(refreshToken);
  }
  throw new Error('Not authenticated');
}
```

## Common Mistakes {#common-mistakes}
- Not handling `chrome.runtime.lastError` in callbacks
- Storing tokens in `chrome.storage.sync` (quota too small, security risk)
- Not implementing token refresh — tokens expire
- Missing PKCE for public clients (security vulnerability)
- Forgetting `interactive: false` for silent auth checks
- Not revoking tokens on uninstall (use `chrome.runtime.setUninstallURL()` to redirect to a server-side revocation endpoint)

## Related Articles {#related-articles}

## Related Articles

- [OAuth Identity Patterns](../patterns/oauth-identity.md)
- [Identity API Reference](../api-reference/identity-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
