---
layout: post
title: "Chrome Identity API: OAuth2 and Token Management for Extensions"
description: "Complete guide to the Chrome Identity API for implementing OAuth2 authentication in extensions. Covers getAuthToken, launchWebAuthFlow, token management, and integration with Google and third-party providers."
date: 2025-01-24
categories: [Chrome Extensions, API Guide]
tags: [chrome-extension, api, tutorial, manifest-v3, authentication]
keywords: "chrome.identity api, getAuthToken, launchWebAuthFlow, extension oauth, chrome extension authentication, token management"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/24/chrome-identity-api-oauth/"
---

# Chrome Identity API: OAuth2 and Token Management for Extensions

Authentication is one of the most complex challenges in Chrome extension development. Extensions run in a unique environment — they are not traditional web apps, they do not have a permanent server, and they cannot rely on standard browser-based OAuth redirects. The `chrome.identity` API solves these problems by providing purpose-built methods for OAuth2 authentication that work seamlessly within the extension model.

This guide covers everything you need to implement authentication in your Chrome extension, from simple Google sign-in with `getAuthToken()` to complex multi-provider flows with `launchWebAuthFlow()`. You will learn token lifecycle management, secure storage practices, error handling, and production patterns used by real-world extensions.

---

## Understanding Extension Authentication {#understanding}

Before diving into the API, it is important to understand why extension authentication is different from web app authentication.

In a traditional web application, the OAuth flow works like this:

1. User clicks "Sign in with Google"
2. Browser redirects to Google's authorization page
3. User grants permissions
4. Google redirects back to your app's callback URL with an authorization code
5. Your server exchanges the code for tokens

Extensions cannot use this flow directly because:

- **No server**: Most extensions do not have a backend server to exchange authorization codes.
- **No redirect URL**: Extensions do not have a traditional URL that OAuth providers can redirect to.
- **Extension context**: The authentication flow must work within Chrome's extension architecture.

The Chrome Identity API provides two solutions:

- **`getAuthToken()`**: Streamlined authentication with Google accounts, using Chrome's built-in OAuth flow.
- **`launchWebAuthFlow()`**: A generic OAuth flow that works with any OAuth2 provider (GitHub, Microsoft, Auth0, etc.).

---

## Permissions and Manifest Setup {#permissions}

### For Google Authentication (getAuthToken)

```json
{
  "manifest_version": 3,
  "name": "My Authenticated Extension",
  "version": "1.0",
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}
```

### For Third-Party Providers (launchWebAuthFlow)

```json
{
  "manifest_version": 3,
  "permissions": ["identity"],
  "host_permissions": [
    "https://accounts.google.com/*",
    "https://github.com/login/oauth/*",
    "https://api.github.com/*"
  ]
}
```

### Getting a Google OAuth Client ID

To use `getAuthToken()`, you need a Google Cloud OAuth client ID:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > Credentials
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Chrome Extension" as the application type
6. Enter your extension's ID (find it in `chrome://extensions`)
7. Copy the generated client ID to your `manifest.json`

The extension ID must match exactly. During development, load your extension as an unpacked extension and use the ID Chrome assigns. For published extensions, the ID is permanent and deterministic.

---

## getAuthToken(): Google Account Authentication {#get-auth-token}

The `getAuthToken()` method provides the simplest path to Google authentication. It leverages the Google account that the user is already signed into in Chrome, presenting a clean consent screen and managing tokens automatically.

### Basic Usage

```javascript
async function signInWithGoogle() {
  try {
    const token = await chrome.identity.getAuthToken({
      interactive: true
    });

    console.log('Access token:', token.token);
    console.log('Granted scopes:', token.grantedScopes);

    // Use the token to call Google APIs
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token.token}`
        }
      }
    );

    const userInfo = await response.json();
    console.log('User:', userInfo.name, userInfo.email);

    return userInfo;
  } catch (error) {
    console.error('Sign-in failed:', error);
    throw error;
  }
}
```

### Interactive vs Non-Interactive

The `interactive` parameter controls whether Chrome shows a sign-in UI:

```javascript
// Interactive: shows consent screen if needed
// Use this when the user explicitly clicks "Sign In"
const token = await chrome.identity.getAuthToken({ interactive: true });

// Non-interactive: fails silently if consent is needed
// Use this to check if the user is already authenticated
try {
  const token = await chrome.identity.getAuthToken({ interactive: false });
  // User is already authenticated
  updateUIForSignedInUser(token);
} catch (error) {
  // User is not authenticated — show sign-in button
  showSignInButton();
}
```

### Specifying Scopes Dynamically

You can request additional scopes beyond what is declared in the manifest:

```javascript
const token = await chrome.identity.getAuthToken({
  interactive: true,
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ]
});
```

If the requested scopes exceed what the user previously granted, Chrome will show a new consent screen.

### Selecting a Specific Account

If the user is signed into multiple Google accounts, you can specify which one to use:

```javascript
const token = await chrome.identity.getAuthToken({
  interactive: true,
  account: { id: 'user@gmail.com' }
});
```

### Token Caching

Chrome caches tokens returned by `getAuthToken()` automatically. Subsequent calls return the cached token without showing the consent screen (as long as it has not expired). This means:

- Calling `getAuthToken({ interactive: false })` is a cheap way to check authentication status
- You do not need to implement your own token cache for Google tokens
- Token refresh is handled automatically by Chrome

---

## Token Lifecycle Management {#token-management}

### Removing Cached Tokens

If a token becomes invalid (e.g., the user revoked access), you need to remove it from Chrome's cache:

```javascript
async function removeCachedToken(token) {
  await chrome.identity.removeCachedAuthToken({ token });
}
```

### Handling Token Expiration

Google OAuth tokens typically expire after 1 hour. Handle 401 responses by removing the cached token and requesting a new one:

```javascript
async function authenticatedFetch(url, options = {}) {
  let token = await chrome.identity.getAuthToken({ interactive: false });

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.token}`
    }
  });

  if (response.status === 401) {
    // Token expired — remove it and get a new one
    await chrome.identity.removeCachedAuthToken({ token: token.token });
    token = await chrome.identity.getAuthToken({ interactive: false });

    // Retry the request with the new token
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token.token}`
      }
    });
  }

  return response;
}

// Usage
const response = await authenticatedFetch(
  'https://www.googleapis.com/drive/v3/files'
);
const files = await response.json();
```

### Clearing All Tokens (Sign Out)

To sign the user out of your extension:

```javascript
async function signOut() {
  try {
    // Get the current token
    const token = await chrome.identity.getAuthToken({ interactive: false });

    // Revoke the token on Google's servers
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token.token}`);

    // Remove from Chrome's cache
    await chrome.identity.removeCachedAuthToken({ token: token.token });

    // Clear any stored user data
    await chrome.storage.local.remove(['userProfile', 'userPreferences']);
    await chrome.storage.session.remove('authState');

    console.log('Signed out successfully');
  } catch (error) {
    // User was not signed in — that is fine
    console.log('No active session to sign out of');
  }
}
```

### clearAllCachedAuthTokens

To remove all cached tokens at once (useful during development or full sign-out):

```javascript
await chrome.identity.clearAllCachedAuthTokens();
```

---

## launchWebAuthFlow(): Third-Party OAuth Providers {#launch-web-auth-flow}

For authentication with non-Google providers (GitHub, Microsoft, Twitter, Auth0, Firebase, etc.), use `launchWebAuthFlow()`. This method opens a browser window for the OAuth flow and returns the redirect URL containing the authorization code or token.

### How It Works

1. Your extension calls `launchWebAuthFlow()` with the provider's authorization URL
2. Chrome opens a special browser window showing the provider's login page
3. The user authenticates and grants permission
4. The provider redirects to your extension's redirect URL
5. Chrome intercepts the redirect and returns the URL to your extension
6. Your extension extracts the token or code from the URL

### Getting Your Redirect URL

Every extension has a unique redirect URL for `launchWebAuthFlow()`:

```javascript
const redirectUrl = chrome.identity.getRedirectURL();
console.log(redirectUrl);
// https://<extension-id>.chromiumapp.org/
```

Register this URL with your OAuth provider as an authorized redirect URI.

### GitHub OAuth Example

Here is a complete example of authenticating with GitHub:

```javascript
const GITHUB_CLIENT_ID = 'your_github_client_id';
const GITHUB_CLIENT_SECRET = 'your_github_client_secret'; // See security note below

async function signInWithGitHub() {
  const redirectUrl = chrome.identity.getRedirectURL('github');
  const scopes = ['read:user', 'user:email', 'repo'];

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', generateRandomState());

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    // Extract the authorization code from the redirect URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUrl
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Store the token securely
    await chrome.storage.session.set({
      githubToken: tokenData.access_token
    });

    // Fetch user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const user = await userResponse.json();
    return user;
  } catch (error) {
    if (error.message?.includes('User interaction required')) {
      console.log('User cancelled the sign-in flow');
    } else {
      console.error('GitHub sign-in failed:', error);
    }
    throw error;
  }
}

function generateRandomState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
```

**Security note:** Storing client secrets in extension code is not ideal — extensions are client-side code that can be inspected. For production extensions, consider using a backend proxy server to exchange authorization codes for tokens, or use the PKCE (Proof Key for Code Exchange) flow.

### PKCE Flow (Recommended for Extensions)

PKCE eliminates the need for a client secret, making it the recommended approach for extensions:

```javascript
async function signInWithPKCE(providerConfig) {
  // Generate PKCE challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomState();

  const redirectUrl = chrome.identity.getRedirectURL();

  const authUrl = new URL(providerConfig.authorizationEndpoint);
  authUrl.searchParams.set('client_id', providerConfig.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', providerConfig.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });

  const url = new URL(responseUrl);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  // Verify state to prevent CSRF
  if (returnedState !== state) {
    throw new Error('State mismatch — possible CSRF attack');
  }

  // Exchange code for token (no client secret needed with PKCE)
  const tokenResponse = await fetch(providerConfig.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: providerConfig.clientId,
      code,
      redirect_uri: redirectUrl,
      code_verifier: codeVerifier
    })
  });

  return tokenResponse.json();
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Usage with different providers
const googleConfig = {
  clientId: 'YOUR_GOOGLE_CLIENT_ID',
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  scopes: ['openid', 'email', 'profile']
};

const microsoftConfig = {
  clientId: 'YOUR_AZURE_CLIENT_ID',
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  scopes: ['openid', 'email', 'profile', 'User.Read']
};
```

---

## Secure Token Storage {#secure-storage}

Storing tokens securely is critical. Here are the recommended approaches:

### Session Storage for Short-Lived Tokens

Use `chrome.storage.session` for access tokens that should be cleared when the browser closes:

```javascript
// Store token
await chrome.storage.session.set({
  auth: {
    accessToken: token,
    expiresAt: Date.now() + expiresIn * 1000,
    provider: 'github'
  }
});

// Retrieve token
async function getValidToken() {
  const { auth } = await chrome.storage.session.get('auth');

  if (!auth) return null;

  if (Date.now() >= auth.expiresAt) {
    // Token expired — refresh it
    return refreshToken(auth);
  }

  return auth.accessToken;
}
```

### Local Storage for Refresh Tokens

Refresh tokens need to persist across browser restarts, so store them in `chrome.storage.local`:

```javascript
// Store refresh token
await chrome.storage.local.set({
  refreshToken: {
    token: tokenData.refresh_token,
    provider: 'github',
    createdAt: Date.now()
  }
});

// Token refresh flow
async function refreshToken(auth) {
  const { refreshToken } = await chrome.storage.local.get('refreshToken');

  if (!refreshToken) {
    // No refresh token — user needs to sign in again
    return null;
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken.token
    })
  });

  const newTokens = await response.json();

  if (newTokens.error) {
    // Refresh token expired or revoked — clear everything
    await chrome.storage.local.remove('refreshToken');
    await chrome.storage.session.remove('auth');
    return null;
  }

  // Update stored tokens
  await chrome.storage.session.set({
    auth: {
      accessToken: newTokens.access_token,
      expiresAt: Date.now() + newTokens.expires_in * 1000,
      provider: auth.provider
    }
  });

  if (newTokens.refresh_token) {
    await chrome.storage.local.set({
      refreshToken: {
        token: newTokens.refresh_token,
        provider: auth.provider,
        createdAt: Date.now()
      }
    });
  }

  return newTokens.access_token;
}
```

---

## Building a Complete Auth Module {#complete-module}

Here is a production-ready authentication module that ties together all the concepts:

```javascript
// auth.js — reusable authentication module
class ExtensionAuth {
  constructor(config) {
    this.config = config;
    this.tokenRefreshPromise = null;
  }

  async getToken() {
    const { auth } = await chrome.storage.session.get('auth');

    if (auth && Date.now() < auth.expiresAt - 60000) {
      // Token is valid (with 1-minute buffer)
      return auth.accessToken;
    }

    // Try to refresh
    return this.refresh();
  }

  async refresh() {
    // Deduplicate concurrent refresh attempts
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this._doRefresh();

    try {
      return await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  async _doRefresh() {
    const { refreshToken } = await chrome.storage.local.get('refreshToken');

    if (!refreshToken) return null;

    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          refresh_token: refreshToken.token
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      await this._storeTokens(data);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.signOut();
      return null;
    }
  }

  async signIn() {
    const codeVerifier = this._generateCodeVerifier();
    const codeChallenge = await this._generateCodeChallenge(codeVerifier);
    const state = this._generateState();

    const redirectUrl = chrome.identity.getRedirectURL();
    const authUrl = new URL(this.config.authorizationEndpoint);

    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.config.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    const url = new URL(responseUrl);
    if (url.searchParams.get('state') !== state) {
      throw new Error('State mismatch');
    }

    const code = url.searchParams.get('code');
    if (!code) throw new Error('No authorization code');

    // Exchange code for tokens
    const tokenResponse = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code,
        redirect_uri: redirectUrl,
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    await this._storeTokens(tokenData);
    return tokenData.access_token;
  }

  async signOut() {
    await chrome.storage.session.remove('auth');
    await chrome.storage.local.remove(['refreshToken', 'userProfile']);
  }

  async isSignedIn() {
    const token = await this.getToken();
    return token !== null;
  }

  async fetchWithAuth(url, options = {}) {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      // Force refresh and retry once
      const newToken = await this.refresh();
      if (!newToken) throw new Error('Authentication expired');

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        }
      });
    }

    return response;
  }

  async _storeTokens(data) {
    await chrome.storage.session.set({
      auth: {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        tokenType: data.token_type
      }
    });

    if (data.refresh_token) {
      await chrome.storage.local.set({
        refreshToken: {
          token: data.refresh_token,
          createdAt: Date.now()
        }
      });
    }
  }

  _generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this._base64UrlEncode(array);
  }

  async _generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this._base64UrlEncode(new Uint8Array(digest));
  }

  _generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  _base64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

// Usage
const auth = new ExtensionAuth({
  clientId: 'YOUR_CLIENT_ID',
  authorizationEndpoint: 'https://provider.com/oauth2/authorize',
  tokenEndpoint: 'https://provider.com/oauth2/token',
  scopes: ['openid', 'email', 'profile']
});

// In popup.js
document.getElementById('signIn').addEventListener('click', async () => {
  try {
    await auth.signIn();
    updateUIForSignedIn();
  } catch (e) {
    showError(e.message);
  }
});

// In background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'API_REQUEST') {
    auth.fetchWithAuth(msg.url, msg.options)
      .then(r => r.json())
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});
```

---

## getProfileUserInfo() {#profile-info}

For extensions that only need the user's email and basic profile (without full OAuth), use `getProfileUserInfo()`:

```javascript
const userInfo = await chrome.identity.getProfileUserInfo({
  accountStatus: 'ANY'  // or 'SIGNED_IN' to only return signed-in accounts
});

console.log('Email:', userInfo.email);
console.log('ID:', userInfo.id);
```

This requires the `"identity.email"` permission:

```json
{
  "permissions": ["identity", "identity.email"]
}
```

Note: This returns the Chrome profile's email, not an OAuth token. The user does not see a consent screen.

---

## Error Handling Best Practices {#error-handling}

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "The user did not approve access." | User denied consent or closed the window | Show a helpful message explaining why access is needed |
| "OAuth2 not granted or revoked." | Token was revoked | Clear cached tokens and re-authenticate |
| "Authorization page could not be loaded." | Network issue or wrong auth URL | Check URL and network connectivity |
| "User interaction required." | `interactive: false` but consent is needed | Switch to `interactive: true` or prompt the user to sign in |

### Comprehensive Error Handler

```javascript
async function handleAuthError(error) {
  const message = error.message || '';

  if (message.includes('did not approve') || message.includes('cancelled')) {
    return {
      type: 'USER_CANCELLED',
      userMessage: 'Sign-in was cancelled. You can try again anytime.'
    };
  }

  if (message.includes('not granted or revoked')) {
    await chrome.identity.clearAllCachedAuthTokens();
    return {
      type: 'TOKEN_REVOKED',
      userMessage: 'Your session expired. Please sign in again.'
    };
  }

  if (message.includes('could not be loaded')) {
    return {
      type: 'NETWORK_ERROR',
      userMessage: 'Could not connect to the sign-in service. Please check your internet connection.'
    };
  }

  if (message.includes('interaction required')) {
    return {
      type: 'INTERACTION_NEEDED',
      userMessage: 'Please click Sign In to continue.'
    };
  }

  return {
    type: 'UNKNOWN',
    userMessage: 'An unexpected error occurred. Please try again.'
  };
}
```

---

## Security Considerations {#security}

### Never Store Tokens in Content Scripts

Content scripts run in the context of web pages and can be accessed by page scripts. Never expose tokens to content scripts directly:

```javascript
// BAD: Content script directly accessing tokens
// content-script.js
const { auth } = await chrome.storage.session.get('auth');
// A malicious page could potentially intercept this

// GOOD: Request data through the service worker
// content-script.js
const data = await chrome.runtime.sendMessage({
  type: 'FETCH_USER_DATA'
});

// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH_USER_DATA') {
    auth.fetchWithAuth('https://api.example.com/user')
      .then(r => r.json())
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});
```

### Validate State Parameters

Always use and validate the `state` parameter to prevent CSRF attacks:

```javascript
// Generate state before the flow
const state = crypto.randomUUID();
await chrome.storage.session.set({ oauthState: state });

// ... launch flow with state ...

// Validate state after the flow
const { oauthState } = await chrome.storage.session.get('oauthState');
if (returnedState !== oauthState) {
  throw new Error('Invalid state — possible CSRF attack');
}
await chrome.storage.session.remove('oauthState');
```

### Use PKCE for All Public Clients

Extensions are public clients (their code can be inspected). Always use PKCE instead of relying on a client secret. PKCE prevents authorization code interception attacks without requiring a secret.

### Minimize Scopes

Request only the scopes your extension actually needs. Users are more likely to grant limited permissions, and your extension is more secure with a smaller attack surface.

---

## Related Resources {#related}

- [Chrome Storage API Patterns](/2025/01/24/chrome-storage-api-patterns/) — Securely store tokens and user data
- [Chrome Runtime API: Messaging and Lifecycle](/2025/01/24/chrome-runtime-api-messaging/) — Route authenticated API calls through the service worker
- [Chrome Action API Guide](/2025/01/24/chrome-action-api-guide/) — Build sign-in UI in your popup
- [Chrome Scripting API Complete Reference](/2025/01/24/chrome-scripting-api-complete-reference/) — Inject authenticated content into pages

---

## Summary {#summary}

Authentication in Chrome extensions requires a different approach than traditional web applications, but the Chrome Identity API makes it manageable. Whether you are integrating with Google services via `getAuthToken()` or building custom OAuth flows with `launchWebAuthFlow()`, the API provides the primitives you need.

Key takeaways:

1. Use `getAuthToken()` for Google account authentication — it handles token caching and refresh automatically.
2. Use `launchWebAuthFlow()` with PKCE for any third-party OAuth provider. Avoid storing client secrets in extension code.
3. Store access tokens in `chrome.storage.session` (cleared on browser close) and refresh tokens in `chrome.storage.local` (persists across restarts).
4. Implement automatic token refresh with deduplication to prevent concurrent refresh attempts.
5. Never expose tokens to content scripts — route API calls through the service worker.
6. Always validate the `state` parameter to prevent CSRF attacks.
7. Handle errors gracefully with user-friendly messages and automatic recovery where possible.

With these patterns, you can build extensions that authenticate users securely and provide seamless access to protected resources across any OAuth2 provider.
