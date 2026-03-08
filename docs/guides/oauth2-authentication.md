---
layout: default
title: "Chrome Extension OAuth2 Authentication — How to Sign In Users with Google, GitHub, and More"
description: "A comprehensive guide to implementing OAuth2 authentication in Chrome extensions using chrome.identity API, launchWebAuthFlow, token storage, refresh flows, and multi-provider setups."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/oauth2-authentication/"
---

# Chrome Extension OAuth2 Authentication — How to Sign In Users with Google, GitHub, and More

## Overview {#overview}

OAuth2 authentication is essential for Chrome extensions that need to access user data from third-party services. Whether you're building an extension that integrates with Google Drive, GitHub repositories, or any other OAuth-enabled API, understanding the `chrome.identity` API is crucial for implementing secure and seamless authentication.

Chrome extensions support two primary OAuth flows: the **Google OAuth2** flow using `getAuthToken` for Google services, and the **interactive OAuth** flow using `launchWebAuthFlow` for third-party providers like GitHub, Facebook, Twitter, and custom OAuth servers.

This guide covers everything you need to implement robust OAuth2 authentication in your Chrome extension, from basic token acquisition to advanced token refresh patterns and multi-provider setups.

## The chrome.identity API {#the-chrome-identity-api}

The `chrome.identity` API provides the foundation for authentication in Chrome extensions. Before using it, you must declare the `"identity"` permission in your `manifest.json`:

```json
{
  "permissions": ["identity"]
}
```

The API offers four key methods:

- **`chrome.identity.getAuthToken()`** — Retrieves OAuth2 tokens for Google APIs
- **`chrome.identity.launchWebAuthFlow()`** — Initiates OAuth/OAuth2 flow for third-party providers
- **`chrome.identity.getRedirectURL()`** — Generates the OAuth redirect URL for your extension
- **`chrome.identity.removeCachedAuthToken()`** — Removes cached tokens for logout or refresh

Understanding when to use each method is key to building a proper authentication system.

## Google OAuth with getAuthToken {#google-oauth-with-getauthtoken}

For extensions that need to access Google APIs (Gmail, Drive, Calendar, YouTube, etc.), Chrome provides a simplified OAuth flow through `getAuthToken`. This method automatically handles token caching and works seamlessly with Google's OAuth2 infrastructure.

### Manifest Configuration

First, configure your `manifest.json` with OAuth2 client details:

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar.readonly"
    ]
  }
}
```

### Getting the Token

```javascript
function getGoogleAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(token);
    });
  });
}

// Usage
async function fetchUserProfile() {
  try {
    const token = await getGoogleAuthToken();
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const user = await response.json();
    console.log('Logged in as:', user.email);
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

### Interactive vs Silent Mode

The `interactive` parameter controls whether Chrome shows a popup to the user:

- **`interactive: true`** — Shows authorization prompt if needed
- **`interactive: false`** — Fails silently if no token exists (useful for background refresh)

```javascript
// Silent mode - no popup, returns null if not authorized
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  if (token) {
    console.log('Using cached token');
    useToken(token);
  } else {
    console.log('User needs to authorize first');
  }
});
```

## Third-Party OAuth with launchWebAuthFlow {#third-party-oauth-with-launchwebauthflow}

For non-Google OAuth providers, use `launchWebAuthFlow`. This method opens an interactive web auth flow in a popup window, then redirects back to your extension with the authorization code or access token.

### How It Works

1. Build the authorization URL with your client ID and desired scopes
2. Call `launchWebAuthFlow` with the URL
3. User authenticates in the popup
4. Provider redirects to your extension's redirect URL
5. Extract the code or token from the redirect URL
6. Exchange the code for tokens (if needed)

### GitHub OAuth Example

```javascript
async function signInWithGitHub() {
  const clientId = 'YOUR_GITHUB_CLIENT_ID';
  const redirectUrl = chrome.identity.getRedirectURL('github');
  
  // Build authorization URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('scope', 'repo user read:user');
  authUrl.searchParams.set('state', generateSecureState());
  
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        // Parse the response
        const url = new URL(responseUrl);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        // Verify state to prevent CSRF
        if (!verifyState(state)) {
          reject(new Error('CSRF attack detected'));
          return;
        }
        
        resolve(code);
      }
    );
  });
}

function generateSecureState() {
  return crypto.randomUUID();
}

function verifyState(state) {
  // Store state in sessionStorage before auth, verify on return
  return true; // Simplified - implement actual verification
}
```

### Custom OAuth Provider

The same pattern works for any OAuth provider:

```javascript
async function signInWithProvider(providerConfig) {
  const { authUrl, tokenUrl, clientId, scopes, redirectUrl } = providerConfig;
  
  const url = new URL(authUrl);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUrl);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', crypto.randomUUID());
  
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: url.toString(), interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        const params = new URL(responseUrl).searchParams;
        const code = params.get('code');
        
        // Exchange code for token
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUrl,
            client_id: clientId
          })
        });
        
        const tokens = await tokenResponse.json();
        resolve(tokens);
      }
    );
  });
}
```

## Token Storage Strategies {#token-storage-strategies}

Properly storing OAuth tokens is critical for security and user experience. Chrome provides several storage options:

### chrome.storage

The recommended approach uses `chrome.storage`:

```javascript
// Using chrome.storage.local (persistent)
async function saveTokens(accessToken, refreshToken, expiresIn) {
  const expiry = Date.now() + (expiresIn * 1000);
  
  await chrome.storage.local.set({
    accessToken,
    refreshToken,
    tokenExpiry: expiry
  });
}

async function getStoredTokens() {
  const data = await chrome.storage.local.get([
    'accessToken',
    'refreshToken',
    'tokenExpiry'
  ]);
  
  // Check if token is expired
  if (data.tokenExpiry && Date.now() > data.tokenExpiry) {
    return { expired: true, ...data };
  }
  
  return { expired: false, ...data };
}

async function clearTokens() {
  await chrome.storage.local.remove([
    'accessToken',
    'refreshToken',
    'tokenExpiry'
  ]);
}
```

### Security Considerations

- **Never store tokens in localStorage** — Content scripts can access localStorage, making tokens vulnerable to XSS attacks
- **Use chrome.storage.local or chrome.storage.sync** — These are isolated from web pages
- **Encrypt sensitive tokens** — For extra security, consider encrypting tokens before storage
- **Implement token expiration tracking** — Always check if tokens are expired before using them

## Token Refresh Flow {#token-refresh-flow}

Access tokens expire (typically within 1 hour). Your extension must implement a refresh mechanism to maintain continuous access without requiring the user to re-authenticate.

### Implementing Token Refresh

```javascript
class TokenManager {
  constructor(refreshTokenUrl, clientId) {
    this.refreshTokenUrl = refreshTokenUrl;
    this.clientId = clientId;
  }
  
  async getValidToken() {
    const { accessToken, refreshToken, expired } = await getStoredTokens();
    
    if (!expired && accessToken) {
      return accessToken;
    }
    
    if (!refreshToken) {
      throw new Error('No refresh token available - user must re-authenticate');
    }
    
    // Refresh the token
    return await this.refreshAccessToken(refreshToken);
  }
  
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(this.refreshTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId
        })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const tokens = await response.json();
      
      // Save new tokens
      await saveTokens(
        tokens.access_token,
        tokens.refresh_token || refreshToken, // Some providers don't return new refresh token
        tokens.expires_in
      );
      
      return tokens.access_token;
    } catch (error) {
      // Refresh token expired - user must re-authenticate
      await clearTokens();
      throw error;
    }
  }
}

// Usage
const tokenManager = new TokenManager(
  'https://auth.example.com/token',
  'YOUR_CLIENT_ID'
);

async function makeAuthenticatedRequest(url) {
  const token = await tokenManager.getValidToken();
  
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

### Automatic Token Refresh

For seamless experience, check and refresh tokens before making API calls:

```javascript
async function ensureValidToken() {
  const { accessToken, expired } = await getStoredTokens();
  
  if (expired && accessToken) {
    // Silently refresh in background
    return await tokenManager.getValidToken();
  }
  
  return accessToken;
}

// Wrap your API calls
async function apiRequest(endpoint, options = {}) {
  const token = await ensureValidToken();
  
  return fetch(`https://api.example.com${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`
    }
  });
}
```

## PKCE Flow for Enhanced Security {#pkce-flow-for-enhanced-security}

For public clients (including browser extensions), implementing PKCE (Proof Key for Code Exchange) adds an extra layer of security by preventing authorization code interception attacks.

```javascript
async function generatePKCEPair() {
  // Generate a random code verifier
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  
  // Create code challenge from verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return { verifier, challenge };
}

async function authWithPKCE() {
  const { verifier, challenge } = await generatePKCEPair();
  const redirectUrl = chrome.identity.getRedirectURL();
  
  // Build auth URL with PKCE parameters
  const authUrl = new URL('https://auth.example.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', crypto.randomUUID());
  
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      async (responseUrl) => {
        const params = new URL(responseUrl).searchParams;
        const code = params.get('code');
        
        // Exchange code with code verifier
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
        
        const tokens = await tokenResponse.json();
        resolve(tokens);
      }
    );
  });
}
```

## Multi-Provider Authentication Setup {#multi-provider-authentication-setup}

If your extension supports multiple OAuth providers, implement a unified authentication system:

```javascript
class MultiAuthProvider {
  constructor() {
    this.providers = {
      google: {
        useGetAuthToken: true,
        clientId: 'GOOGLE_CLIENT_ID',
        scopes: ['https://www.googleapis.com/auth/userinfo.email']
      },
      github: {
        useGetAuthToken: false,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        clientId: 'GITHUB_CLIENT_ID',
        scopes: ['repo', 'user']
      },
      discord: {
        useGetAuthToken: false,
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        clientId: 'DISCORD_CLIENT_ID',
        scopes: ['identify', 'email']
      }
    };
  }
  
  async signIn(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    if (provider.useGetAuthToken) {
      return this.signInWithGoogle(provider);
    } else {
      return this.signInWithOAuth(provider);
    }
  }
  
  async signInWithGoogle(provider) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ provider: 'google', token });
      });
    });
  }
  
  async signInWithOAuth(provider) {
    const redirectUrl = chrome.identity.getRedirectURL(providerName);
    
    const authUrl = new URL(provider.authUrl);
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', provider.scopes.join(' '));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', crypto.randomUUID());
    
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          const params = new URL(responseUrl).searchParams;
          const code = params.get('code');
          
          // Exchange code for tokens
          const response = await fetch(provider.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUrl,
              client_id: provider.clientId
            })
          });
          
          const tokens = await response.json();
          resolve({ provider: providerName, ...tokens });
        }
      );
    });
  }
  
  async signOut(providerName) {
    const { accessToken } = await this.getStoredAuth(providerName);
    
    if (accessToken) {
      chrome.identity.removeCachedAuthToken({ token: accessToken }, () => {
        console.log(`Signed out from ${providerName}`);
      });
    }
    
    await this.clearStoredAuth(providerName);
  }
}

// Usage
const auth = new MultiAuthProvider();

// Sign in with GitHub
const githubAuth = await auth.signIn('github');

// Sign in with Google
const googleAuth = await auth.signIn('google');

// Sign out
await auth.signOut('github');
```

## Best Practices {#best-practices}

1. **Use HTTPS always** — Never transmit tokens over unencrypted connections
2. **Implement proper error handling** — Handle network errors, token expiration, and revocation
3. **Provide clear user feedback** — Show loading states during authentication
4. **Support incremental authorization** — Request scopes as needed rather than all at once
5. **Clear tokens on logout** — Use `removeCachedAuthToken` and storage cleanup
6. **Monitor for token revocation** — Handle cases where users revoke access from provider settings
7. **Store provider information** — Track which provider was used for each stored token

## Conclusion {#conclusion}

Implementing OAuth2 authentication in Chrome extensions requires understanding the `chrome.identity` API's capabilities and limitations. For Google services, `getAuthToken` provides a streamlined experience, while `launchWebAuthFlow` offers flexibility for any OAuth2-compatible provider.

Key takeaways:
- Use `getAuthToken` for Google APIs, `launchWebAuthFlow` for third-party providers
- Store tokens securely using `chrome.storage` (never localStorage)
- Implement token refresh to maintain seamless user experience
- Consider PKCE for enhanced security
- Build a unified auth system if supporting multiple providers

With these patterns, you can implement robust authentication that provides secure, seamless sign-in for your Chrome extension users across any OAuth2-enabled service.

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://theluckystrike.github.io/extension-monetization-playbook/monetization/stripe-integration), subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
