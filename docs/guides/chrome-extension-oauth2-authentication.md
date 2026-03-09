---
layout: default
title: "Chrome Extension OAuth2 Authentication: Complete Identity API Guide"
description: "Master OAuth2 authentication in Chrome extensions with our comprehensive guide covering chrome.identity API, launchWebAuthFlow, getAuthToken, token management, PKCE flow, and multi-provider authentication with Google, GitHub, and Twitter."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-oauth2-authentication/"
date: 2026-03-09
last_modified_at: 2026-03-09
category: guides
tags: [oauth2, authentication, chrome-identity, pkce, token-management, security, google, github, twitter]
---

# Chrome Extension OAuth2 Authentication: Complete Identity API Guide

OAuth2 has become the standard authentication framework for Chrome extensions that need to access third-party services. Whether you're building an extension that integrates with Google Drive, GitHub repositories, Twitter feeds, or your own custom backend, implementing secure OAuth2 authentication requires understanding Chrome's identity APIs, token management strategies, and security best practices. This comprehensive guide covers everything from basic authentication flows to advanced token rotation patterns, helping you build robust and secure authentication into your extension.

## Understanding the chrome.identity API

The `chrome.identity` API is Chrome's built-in solution for handling OAuth2 authentication in extensions. Before you can implement any authentication flow, you must declare the `"identity"` permission in your manifest.json file. This permission enables your extension to use Chrome's identity services, which handle the complexities of OAuth2 flows specific to the extension environment.

The chrome.identity API provides four primary methods that serve different authentication scenarios. Understanding these methods is crucial for choosing the right approach for your extension's needs.

The `getAuthToken()` method is designed specifically for Google APIs and provides the simplest integration with Google's OAuth2 infrastructure. When you call this method, Chrome automatically handles token caching, refresh logic, and user prompting. This makes it the preferred choice when your extension only needs to access Google services like Gmail, Drive, Calendar, or YouTube.

The `launchWebAuthFlow()` method is more versatile and works with any OAuth2-compliant provider, including GitHub, Twitter, Facebook, and custom OAuth servers. This method opens a popup window where users authenticate with the third-party service, then redirects back to your extension with an authorization code or access token. While this approach requires more manual handling of tokens, it supports any OAuth2 provider.

The `getRedirectURL()` method generates the appropriate redirect URI for your extension's OAuth flow. This is essential for third-party providers because they need to know where to redirect users after authentication. Chrome handles this automatically for Google APIs, but you'll need this method when implementing custom OAuth flows with launchWebAuthFlow.

The `removeCachedAuthToken()` method allows you to invalidate cached tokens, which is useful for implementing logout functionality or forcing users to re-authenticate. This method is particularly important for security-sensitive applications where you need to ensure tokens are properly cleared.

## launchWebAuthFlow vs getAuthToken: Choosing the Right Approach

One of the most important decisions you'll make when implementing OAuth2 in your extension is choosing between launchWebAuthFlow and getAuthToken. Each approach has distinct advantages and trade-offs that make it suitable for different scenarios.

### When to Use getAuthToken

The getAuthToken method is specifically designed for Google APIs and offers several significant advantages. First, it provides seamless integration with Chrome's built-in account management, meaning users don't need to explicitly sign in if they're already logged into Chrome. Second, Chrome automatically handles token caching, so subsequent calls to getAuthToken return cached tokens without requiring network requests. Third, Chrome manages token refresh automatically when tokens expire, reducing the implementation burden on developers.

However, getAuthToken has limitations. It only works with Google APIs and requires you to configure OAuth2 client details directly in your manifest.json. The tokens obtained through this method are short-lived and tied to the user's Chrome session, which means they may become invalid when the user signs out of Chrome or when the session expires.

Here's a typical implementation using getAuthToken:

```javascript
// In your background service worker or popup
async function getGoogleAccessToken() {
  try {
    const token = await chrome.identity.getAuthToken({
      interactive: true,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/gmail.readonly'
      ]
    });
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
}
```

### When to Use launchWebAuthFlow

The launchWebAuthFlow method provides flexibility to work with any OAuth2 provider, making it the universal choice for non-Google services. This method opens a browser popup where users authenticate with the third-party provider, and the provider redirects back to your extension with the authorization result.

The main trade-off is that you must manually handle token storage, refresh, and expiration. Unlike getAuthToken, there's no built-in caching, so you need to implement your own token management system. Additionally, launchWebAuthFlow requires user interaction—the popup must be triggered by a user action like clicking a button.

Here's a typical implementation using launchWebAuthFlow:

```javascript
async function authenticateWithProvider(providerConfig) {
  const redirectURL = chrome.identity.getRedirectURL();
  
  // Build the authorization URL with PKCE parameters
  const authURL = new URL(providerConfig.authorizationEndpoint);
  authURL.searchParams.set('client_id', providerConfig.clientId);
  authURL.searchParams.set('redirect_uri', redirectURL);
  authURL.searchParams.set('response_type', 'code');
  authURL.searchParams.set('scope', providerConfig.scopes.join(' '));
  
  // Add PKCE challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  authURL.searchParams.set('code_challenge', codeChallenge);
  authURL.searchParams.set('code_challenge_method', 'S256');
  
  // Store code verifier for token exchange
  await chrome.storage.session.set({
    codeVerifier: codeVerifier,
    provider: providerConfig.name
  });
  
  try {
    const response = await chrome.identity.launchWebAuthFlow({
      url: authURL.toString(),
      interactive: true
    });
    
    // Parse the authorization code from redirect URL
    const url = new URL(response);
    const code = url.searchParams.get('code');
    
    // Exchange code for tokens
    return await exchangeCodeForTokens(code, providerConfig);
  } catch (error) {
    console.error('Auth flow failed:', error);
    throw error;
  }
}
```

## Setting Up Google OAuth2 for Extensions

Google OAuth2 setup for Chrome extensions requires configuration in both the Google Cloud Console and your extension's manifest.json. This section walks you through the complete setup process.

### Step 1: Configure Google Cloud Console

Before implementing authentication in your extension, you need to create a Google Cloud project and configure OAuth credentials. Start by visiting the Google Cloud Console and creating a new project or selecting an existing one.

Navigate to the Credentials page and create OAuth 2.0 Client ID credentials. Select "Chrome App" as the application type, as Chrome extensions use this credential type. You'll need to provide your extension's ID, which you can find by loading your unpacked extension in chrome://extensions.

The most critical configuration is the Authorized JavaScript origins and redirect URIs. For Chrome extensions, you must add the extension's ID to the authorized origins. The format is `chrome-extension://YOUR_EXTENSION_ID`. You can also specify redirect URIs if needed, though Chrome handles most redirect logic automatically.

### Step 2: Configure manifest.json

Add the OAuth2 configuration to your manifest.json file:

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  }
}
```

The client ID comes from your Google Cloud Console credentials. The scopes define what resources your extension can access. Be sure to request only the minimum scopes necessary for your extension's functionality—this follows security best practices and makes users more comfortable granting permission.

### Step 3: Implement Token Acquisition

With the configuration complete, you can now implement token acquisition in your extension. The recommended pattern is to check for cached tokens before requesting new ones:

```javascript
class GoogleAuthService {
  constructor() {
    this.tokenCache = null;
  }
  
  async getValidToken() {
    // Check cache first
    if (this.tokenCache && !this.isTokenExpired(this.tokenCache)) {
      return this.tokenCache.token;
    }
    
    // Get new token
    const token = await chrome.identity.getAuthToken({
      interactive: false  // Don't prompt if not logged in
    });
    
    if (token) {
      this.tokenCache = {
        token: token,
        timestamp: Date.now()
      };
    }
    
    return token;
  }
  
  isTokenExpired(cacheEntry) {
    // Consider tokens expired after 1 hour (3600000 ms)
    return Date.now() - cacheEntry.timestamp > 3600000;
  }
  
  async logout() {
    if (this.tokenCache) {
      await chrome.identity.removeCachedAuthToken({
        token: this.tokenCache.token
      });
      this.tokenCache = null;
    }
  }
}
```

## Token Storage Best Practices

Secure token storage is critical for protecting user credentials and maintaining trust. Chrome extensions have several storage options, each with different security characteristics.

### Using chrome.storage for Token Storage

The chrome.storage API provides encrypted storage for extension data, making it the recommended choice for storing OAuth tokens. The storage is encrypted using the same encryption that protects the user's Chrome profile, providing reasonable security against local attacks.

```javascript
class TokenStorage {
  static async saveTokens(provider, tokens) {
    const storageData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at,
      tokenType: tokens.token_type,
      scope: tokens.scope
    };
    
    await chrome.storage.session.set({
      [`auth_${provider}`]: storageData
    });
  }
  
  static async getTokens(provider) {
    const result = await chrome.storage.session.get(`auth_${provider}`);
    return result[`auth_${provider}`] || null;
  }
  
  static async isTokenExpired(provider) {
    const tokens = await this.getTokens(provider);
    if (!tokens || !tokens.expiresAt) return true;
    
    // Add buffer time (5 minutes) before actual expiration
    return Date.now() > (tokens.expiresAt - 300000);
  }
  
  static async clearTokens(provider) {
    await chrome.storage.session.remove(`auth_${provider}`);
  }
}
```

### Security Considerations for Token Storage

While chrome.storage provides good security, you should follow additional best practices to maximize token security. Never store tokens in localStorage or sessionStorage, as these are accessible to content scripts and can be exfiltrated through XSS attacks. Avoid storing tokens in chrome.storage.local unless necessary, as this is not encrypted by default in some contexts.

Always use chrome.storage.session when possible, as this storage is cleared when the browser session ends. This provides automatic cleanup and reduces the window of exposure if the user's device is compromised. For sensitive applications, consider implementing additional encryption on top of chrome.storage using the Web Crypto API.

For additional security guidance, refer to our [Chrome Extension Security Hardening](/guides/chrome-extension-security-hardening.md) guide, which covers encryption strategies and other advanced security measures.

## Refresh Token Rotation

Access tokens are typically short-lived for security reasons, lasting from minutes to hours. Refresh tokens allow your extension to obtain new access tokens without requiring user re-authentication. Implementing proper refresh token rotation is essential for maintaining secure and seamless authentication.

### Understanding Refresh Token Rotation

Refresh token rotation is a security practice where you obtain a new refresh token each time you use an old one to obtain a new access token. This provides several security benefits: if a refresh token is compromised, it's only valid until the next rotation. Additionally, you can detect unauthorized use if a refresh token has been used more than expected.

Not all OAuth2 providers support refresh token rotation—some providers issue static refresh tokens that don't rotate. Check your provider's documentation to understand their specific behavior.

### Implementing Refresh Token Rotation

Here's a comprehensive implementation that handles token refresh and rotation:

```javascript
class OAuthTokenManager {
  constructor(providerConfig) {
    this.provider = providerConfig;
  }
  
  async getValidAccessToken() {
    const tokens = await TokenStorage.getTokens(this.provider.name);
    
    if (!tokens) {
      throw new Error('No tokens found. User needs to authenticate.');
    }
    
    // Check if token is still valid
    if (!await TokenStorage.isTokenExpired(this.provider.name)) {
      return tokens.accessToken;
    }
    
    // Token expired, try to refresh
    if (tokens.refreshToken) {
      try {
        const newTokens = await this.refreshAccessToken(tokens.refreshToken);
        await TokenStorage.saveTokens(this.provider.name, newTokens);
        return newTokens.accessToken;
      } catch (error) {
        // Refresh failed, clear tokens and require re-auth
        await TokenStorage.clearTokens(this.provider.name);
        throw new Error('Token refresh failed. Please authenticate again.');
      }
    }
    
    // No refresh token available, require re-auth
    await TokenStorage.clearTokens(this.provider.name);
    throw new Error('No refresh token available. Please authenticate again.');
  }
  
  async refreshAccessToken(refreshToken) {
    const response = await fetch(this.provider.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.provider.clientId,
        client_secret: this.provider.clientSecret
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }
    
    const tokens = await response.json();
    
    // Preserve the refresh token if provider doesn't return a new one
    if (!tokens.refresh_token) {
      tokens.refresh_token = refreshToken;
    }
    
    // Calculate expiration time
    tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
    
    return tokens;
  }
}
```

## Multi-Provider Authentication (GitHub, Twitter)

Many extensions need to support multiple OAuth providers, whether to offer users choice or to access different services. Implementing multi-provider authentication requires careful architecture to avoid code duplication and maintain security.

### GitHub OAuth2 Setup

GitHub provides OAuth2 authentication that's straightforward to integrate with Chrome extensions. First, register your extension as a GitHub OAuth App in your GitHub developer settings. You'll need to provide a homepage URL and callback URL—use your extension's redirect URL from chrome.identity.getRedirectURL().

```javascript
const GITHUB_CONFIG = {
  name: 'github',
  clientId: 'your-github-client-id',
  clientSecret: 'your-github-client-secret',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  scopes: ['repo', 'user:email']
};
```

### Twitter OAuth2 Setup

Twitter's OAuth2 implementation requires slightly different configuration due to their PKCE requirement. Twitter OAuth2 uses the Authorization Code flow with PKCE, which provides enhanced security.

```javascript
const TWITTER_CONFIG = {
  name: 'twitter',
  clientId: 'your-twitter-client-id',
  clientSecret: 'your-twitter-client-secret',  // May not be needed with PKCE
  authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
  scopes: ['tweet.read', 'users.read', 'offline.access']
};
```

### Unified Authentication Manager

A unified authentication manager can handle multiple providers cleanly:

```javascript
class MultiProviderAuthManager {
  constructor() {
    this.providers = {
      github: new OAuthTokenManager(GITHUB_CONFIG),
      google: new GoogleAuthService(),
      twitter: new OAuthTokenManager(TWITTER_CONFIG)
    };
  }
  
  async authenticate(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    return await provider.authenticate();
  }
  
  async getToken(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    return await provider.getValidAccessToken();
  }
  
  async logout(providerName) {
    const provider = this.providers[providerName];
    if (provider && provider.logout) {
      await provider.logout();
    }
    await TokenStorage.clearTokens(providerName);
  }
}
```

For secure communication between your extension's components when handling authentication, see our guide on [Chrome Extension Secure Message Passing](/guides/chrome-extension-secure-message-passing.md).

## PKCE Flow for Extensions

Proof Key for Code Exchange (PKCE) is a security extension to OAuth2 that helps prevent authorization code interception attacks. While originally designed for mobile applications, PKCE has become recommended for all public clients, including browser extensions.

### Why PKCE Matters for Extensions

In a standard OAuth2 flow, the authorization code could potentially be intercepted during the redirect from the authorization server to your extension. With PKCE, your extension generates a cryptographically random code verifier before starting the auth flow, creates a challenge from this verifier, and then proves possession of the verifier when exchanging the authorization code for tokens. Even if an attacker intercepts the authorization code, they cannot exchange it without the code verifier.

### Implementing PKCE in Your Extension

Here's how to implement PKCE for your extension's OAuth flow:

```javascript
// Generate cryptographically secure random string
function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => 
    ('0' + (byte & 0xFF).toString(16)).slice(-2)
  ).join('');
}

// Base64URL encode without padding
function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate code verifier (43-128 characters)
async function generateCodeVerifier() {
  return generateRandomString(64);
}

// Generate code challenge from verifier using SHA-256
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hash);
}

// Complete PKCE auth flow
async function authenticateWithPKCE(providerConfig) {
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectURL = chrome.identity.getRedirectURL();
  
  // Build authorization URL with PKCE parameters
  const authURL = new URL(providerConfig.authorizationEndpoint);
  authURL.searchParams.set('client_id', providerConfig.clientId);
  authURL.searchParams.set('redirect_uri', redirectURL);
  authURL.searchParams.set('response_type', 'code');
  authURL.searchParams.set('scope', providerConfig.scopes.join(' '));
  authURL.searchParams.set('code_challenge', codeChallenge);
  authURL.searchParams.set('code_challenge_method', 'S256');
  authURL.searchParams.set('state', generateRandomString(32));
  
  // Store code verifier securely for token exchange
  await chrome.storage.session.set({ 
    pkce_code_verifier: codeVerifier 
  });
  
  // Launch auth flow
  const responseURL = await chrome.identity.launchWebAuthFlow({
    url: authURL.toString(),
    interactive: true
  });
  
  // Extract authorization code
  const url = new URL(responseURL);
  const code = url.searchParams.get('code');
  
  // Retrieve code verifier and exchange for tokens
  const { pkce_code_verifier } = await chrome.storage.session.get('pkce_code_verifier');
  
  const tokenResponse = await fetch(providerConfig.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectURL,
      client_id: providerConfig.clientId,
      code_verifier: pkce_code_verifier
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Clean up PKCE verifier
  await chrome.storage.session.remove('pkce_code_verifier');
  
  return tokens;
}
```

## Error Handling and Token Revocation

Robust error handling is essential for maintaining a good user experience and security. Your extension should handle various error scenarios gracefully, from network failures to invalid credentials.

### Common Error Scenarios

OAuth2 authentication can fail in several ways, and handling each appropriately improves user experience. Network errors might be transient and worth retrying. Invalid credentials or expired tokens might require re-authentication. Server errors on the provider's side might be temporary and worth retrying after a delay.

Here's a comprehensive error handling approach:

```javascript
class AuthErrorHandler {
  static async handleAuthError(error, authManager, provider) {
    const errorInfo = this.parseError(error);
    
    switch (errorInfo.type) {
      case 'network_error':
        // Retry with exponential backoff
        return await this.retryWithBackoff(
          () => authManager.authenticate(provider),
          3
        );
        
      case 'token_expired':
        // Try to refresh the token
        try {
          const newToken = await authManager.refreshToken(provider);
          return newToken;
        } catch (refreshError) {
          // Refresh failed, need to re-authenticate
          return await authManager.authenticate(provider);
        }
        
      case 'invalid_grant':
      case 'unauthorized':
        // Credentials invalid, need to re-authenticate
        await authManager.logout(provider);
        return await authManager.authenticate(provider);
        
      case 'rate_limited':
        // Wait and retry
        await this.delay(errorInfo.retryAfter * 1000);
        return await authManager.authenticate(provider);
        
      default:
        // Unknown error, log and re-throw
        console.error('Unhandled auth error:', errorInfo);
        throw error;
    }
  }
  
  static parseError(error) {
    // Parse error from various formats
    if (error.message?.includes('net::')) {
      return { type: 'network_error', retryable: true };
    }
    if (error.message?.includes('invalid_grant')) {
      return { type: 'token_expired', retryable: false };
    }
    if (error.status === 401) {
      return { type: 'unauthorized', retryable: false };
    }
    if (error.status === 429) {
      return { type: 'rate_limited', retryAfter: 60 };
    }
    return { type: 'unknown', retryable: false };
  }
  
  static async retryWithBackoff(fn, maxRetries) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        await this.delay(Math.pow(2, i) * 1000);
      }
    }
    throw lastError;
  }
  
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Token Revocation

Properly revoking tokens is important for security and when users want to disconnect your extension from their accounts. Different providers have different revocation endpoints:

```javascript
async function revokeToken(provider, accessToken, refreshToken) {
  const revokeURL = provider.revokeEndpoint || 
    `https://oauth2.googleapis.com/revoke`;
  
  // Revoke access token
  await fetch(revokeURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      token: accessToken
    })
  });
  
  // Revoke refresh token if available
  if (refreshToken) {
    await fetch(revokeURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token: refreshToken
      })
    });
  }
  
  // Clear local storage
  await TokenStorage.clearTokens(provider.name);
}
```

## Real-World Implementation Example

Let's put together a complete, production-ready authentication system that you can adapt for your extension. This example demonstrates a GitHub integration, but the patterns apply to any OAuth2 provider.

### Complete Authentication Service

```javascript
// config/providers.js
export const GITHUB_OAUTH_CONFIG = {
  name: 'github',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  revokeEndpoint: 'https://github.com/settings/connections/applications',
  scopes: ['repo', 'user:email', 'read:user']
};

// services/AuthService.js
import { GITHUB_OAUTH_CONFIG } from '../config/providers';
import { TokenStorage } from '../utils/TokenStorage';

class AuthService {
  constructor() {
    this.config = GITHUB_OAUTH_CONFIG;
    this.listeners = [];
  }
  
  addAuthStateListener(callback) {
    this.listeners.push(callback);
  }
  
  notifyListeners(state) {
    this.listeners.forEach(callback => callback(state));
  }
  
  async login() {
    this.notifyListeners({ status: 'authenticating' });
    
    try {
      // Generate PKCE parameters
      const codeVerifier = await this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const redirectURL = chrome.identity.getRedirectURL();
      
      // Build auth URL
      const authURL = new URL(this.config.authorizationEndpoint);
      authURL.searchParams.set('client_id', this.config.clientId);
      authURL.searchParams.set('redirect_uri', redirectURL);
      authURL.searchParams.set('response_type', 'code');
      authURL.searchParams.set('scope', this.config.scopes.join(' '));
      authURL.searchParams.set('code_challenge', codeChallenge);
      authURL.searchParams.set('code_challenge_method', 'S256');
      authURL.searchParams.set('state', this.generateState());
      
      // Store verifier for token exchange
      await chrome.storage.session.set({ 
        github_code_verifier: codeVerifier 
      });
      
      // Launch auth flow
      const responseURL = await chrome.identity.launchWebAuthFlow({
        url: authURL.toString(),
        interactive: true
      });
      
      if (!responseURL) {
        throw new Error('Authentication was cancelled');
      }
      
      // Parse authorization code
      const url = new URL(responseURL);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code) {
        throw new Error('No authorization code received');
      }
      
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);
      
      // Save tokens
      await TokenStorage.saveTokens('github', tokens);
      
      // Get user info
      const user = await this.getUserInfo(tokens.access_token);
      
      this.notifyListeners({ 
        status: 'authenticated', 
        user: user,
        provider: 'github'
      });
      
      return { user, tokens };
    } catch (error) {
      this.notifyListeners({ 
        status: 'error', 
        error: error.message 
      });
      throw error;
    }
  }
  
  async logout() {
    try {
      const tokens = await TokenStorage.getTokens('github');
      if (tokens?.accessToken) {
        // Attempt to revoke tokens (may fail if provider unreachable)
        await this.revokeToken(tokens.accessToken).catch(() => {});
      }
    } finally {
      await TokenStorage.clearTokens('github');
      this.notifyListeners({ status: 'logged_out' });
    }
  }
  
  async getValidToken() {
    // Check for existing valid token
    if (!await TokenStorage.isTokenExpired('github')) {
      const tokens = await TokenStorage.getTokens('github');
      return tokens.accessToken;
    }
    
    // Try to refresh
    const tokens = await TokenStorage.getTokens('github');
    if (tokens?.refreshToken) {
      try {
        const newTokens = await this.refreshToken(tokens.refreshToken);
        await TokenStorage.saveTokens('github', newTokens);
        return newTokens.accessToken;
      } catch (error) {
        // Refresh failed, need to re-authenticate
        await this.logout();
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    throw new Error('Not authenticated');
  }
  
  async exchangeCodeForTokens(code) {
    const { github_code_verifier } = await chrome.storage.session.get(
      'github_code_verifier'
    );
    
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: chrome.identity.getRedirectURL(),
        code_verifier: github_code_verifier
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }
    
    const tokens = await response.json();
    
    // Calculate expiration
    tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
    
    // Clean up
    await chrome.storage.session.remove('github_code_verifier');
    
    return tokens;
  }
  
  async refreshToken(refreshToken) {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }
    
    const tokens = await response.json();
    
    // GitHub doesn't return a new refresh token, preserve the old one
    if (!tokens.refresh_token) {
      tokens.refresh_token = refreshToken;
    }
    
    tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
    
    return tokens;
  }
  
  async getUserInfo(accessToken) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async revokeToken(accessToken) {
    // GitHub doesn't have a standard revocation endpoint
    // This is a placeholder for providers that do
    console.log('Token revocation not fully implemented for GitHub');
  }
  
  // PKCE helper methods
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

export const authService = new AuthService();
```

### Using the Auth Service in Your Extension

```javascript
// In your popup or background script
import { authService } from '../services/AuthService';

// Check auth state on load
async function initialize() {
  try {
    const token = await authService.getValidToken();
    updateUI({ authenticated: true });
  } catch (error) {
    updateUI({ authenticated: false });
  }
}

// Handle login button click
document.getElementById('login-btn').addEventListener('click', async () => {
  try {
    const { user } = await authService.login();
    showNotification(`Welcome, ${user.login}!`);
  } catch (error) {
    showNotification(`Login failed: ${error.message}`, 'error');
  }
});

// Handle logout button click
document.getElementById('logout-btn').addEventListener('click', async () => {
  await authService.logout();
  showNotification('Logged out successfully');
});

// Listen for auth state changes
authService.addAuthStateListener((state) => {
  if (state.status === 'authenticated') {
    updateUI({ authenticated: true, user: state.user });
  } else if (state.status === 'logged_out') {
    updateUI({ authenticated: false });
  }
});
```

## Conclusion

Implementing OAuth2 authentication in Chrome extensions requires understanding the chrome.identity API, choosing between getAuthToken and launchWebAuthFlow based on your provider, and implementing proper token management including secure storage and refresh token rotation. The patterns and examples in this guide provide a foundation for building secure, user-friendly authentication into your extension.

Remember to always follow security best practices: use PKCE for all new implementations, store tokens securely using chrome.storage, implement proper error handling, and provide clear user feedback throughout the authentication process. With these techniques, you can create authentication experiences that are both secure and seamless for your users.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
