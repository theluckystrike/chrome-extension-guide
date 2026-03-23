---
layout: post
title: "Chrome Extension OAuth2 Authentication: Connect to Google, GitHub & More"
description: "Learn how to implement OAuth2 authentication in Chrome extensions. Complete guide covering Chrome Identity API, Google login, GitHub OAuth, and secure token management for Manifest V3 extensions."
date: 2025-01-17
categories: [tutorials, chrome-extensions, authentication]
tags: [chrome extension oauth2, extension authentication, chrome identity api, google login chrome extension, manifest v3, oauth tutorial]
keywords: "chrome extension oauth2, extension authentication, chrome identity api, google login chrome extension, github oauth chrome extension, manifest v3 authentication"
canonical_url: "https://bestchromeextensions.com/2025/01/17/chrome-extension-oauth2-authentication-guide/"
---

Chrome Extension OAuth2 Authentication: Connect to Google, GitHub & More

Adding user authentication to your Chrome extension is essential when building features that require access to user data from external services. Whether you are building an extension that integrates with Google Drive, fetches repositories from GitHub, or syncs data with third-party APIs, implementing OAuth2 authentication correctly is crucial for both security and user experience.

This comprehensive guide will walk you through implementing OAuth2 authentication in Chrome extensions using Manifest V3. We will cover the Chrome Identity API, setting up OAuth clients, handling token storage securely, and connecting to popular providers like Google and GitHub.

---

Why OAuth2 Matters for Chrome Extensions {#why-oauth2-matters}

OAuth2 is the industry-standard protocol for authorization, enabling your extension to access user data without requiring them to share their passwords. When implemented correctly, OAuth2 provides several key benefits for Chrome extension developers.

Security Benefits

With OAuth2, your extension never sees or stores user passwords. Instead, it receives access tokens that can be revoked at any time by the user through their account settings. This approach significantly reduces the security risk surface compared to traditional username/password authentication. Additionally, OAuth2 supports scoped access, meaning you can request only the permissions your extension actually needs.

User Experience Advantages

Users are increasingly wary of entering passwords into browser extensions. By implementing OAuth2, you use trusted authentication flows from major providers like Google, GitHub, and Microsoft. Users can authenticate with a single click using their existing accounts, eliminating the need to create and remember yet another password.

Platform Integration

OAuth2 tokens enable your extension to integrate smoothly with the services users already use. Imagine building an extension that automatically backs up browser bookmarks to Google Drive, or one that creates GitHub issues from browser interactions. These integrations become possible when you properly implement OAuth2 authentication.

---

Understanding Chrome Identity API {#chrome-identity-api}

Chrome provides the `chrome.identity` API specifically for handling authentication in extensions. This API simplifies OAuth2 implementation by managing the authentication flow and token storage.

LaunchWebAuthFlow

The `chrome.identity.launchWebAuthFlow` method is the primary way to initiate OAuth2 authentication in Chrome extensions. It opens a popup window where users can authenticate with the service provider. Once authenticated, the provider redirects back to your extension with an authorization code that can be exchanged for access tokens.

Here is how the basic flow works:

```javascript
async function authenticateWithOAuth() {
  const clientId = 'your-client-id.apps.googleusercontent.com';
  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}`;

  try {
    const response = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });

    // Parse the access token from the redirect URL
    const url = new URL(response);
    const params = new URLSearchParams(url.hash.substring(1));
    const accessToken = params.get('access_token');

    return accessToken;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}
```

GetRedirectURL

The `chrome.identity.getRedirectURL()` method generates a proper redirect URI for your extension. This URL follows the pattern `https://[extension-id].chromiumapp.org/[path]`. Using this method ensures Chrome can properly route the authentication response back to your extension.

Token Management

The Chrome Identity API also provides methods for token management:

- `chrome.identity.getAuthToken()`: Retrieves a cached token or automatically launches the authentication flow
- `chrome.identity.removeCachedAuthToken()`: Removes a token from the cache when users log out
- `chrome.identity.getProfileUserInfo()`: Gets basic user information without making additional API calls

---

Setting Up OAuth for Google {#google-oauth-setup}

Google provides solid OAuth2 support and is one of the most common authentication providers for Chrome extensions. Let us walk through the complete setup process.

Creating a Google Cloud Project

First, you need to create a project in the Google Cloud Console:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > OAuth consent screen
4. Configure the consent screen with your extension's name and logo
5. Add the scopes your extension needs (for example, `https://www.googleapis.com/auth/drive.file`)
6. Add your extension's ID to authorized JavaScript origins

Getting Your Client ID

After configuring the consent screen:

1. Go to Credentials > Create Credentials > OAuth client ID
2. Select "Chrome extension" as the application type
3. Enter your extension's name
4. Add your extension's ID to the authorized list
5. Copy the client ID for use in your extension

Manifest Configuration

Add the required permissions and identities to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My OAuth Extension",
  "version": "1.0.0",
  "permissions": ["identity"],
  "host_permissions": [
    "https://accounts.google.com/*",
    "https://www.googleapis.com/*"
  ],
  "oauth2": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

Implementing Google Authentication

Here is a complete implementation for authenticating with Google:

```javascript
// auth.js - Google OAuth2 Implementation

class GoogleAuth {
  constructor() {
    this.clientId = 'your-client-id.apps.googleusercontent.com';
    this.scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
  }

  async getAccessToken() {
    try {
      // First try to get a cached token
      const token = await chrome.identity.getAuthToken({ interactive: true });
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw error;
    }
  }

  async getUserInfo() {
    const token = await this.getAccessToken();
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.json();
  }

  async makeApiCall(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    return response.json();
  }

  async logout() {
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (token) {
      await chrome.identity.removeCachedAuthToken({ token });
      // Also revoke at Google for security
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`);
    }
  }
}

// Usage example
const googleAuth = new GoogleAuth();
```

---

Setting Up OAuth for GitHub {#github-oauth-setup}

GitHub OAuth is equally important for extensions that interact with repositories, issues, or GitHub Actions. The setup process differs slightly from Google but follows the same principles.

Creating a GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: Your extension name
   - Homepage URL: Your extension's website or Chrome Web Store listing
   - Authorization callback URL: Use `https://[extension-id].chromiumapp.org/`
4. Copy the Client ID and generate a Client Secret

Manifest Configuration for GitHub

GitHub OAuth requires different manifest configuration since it does not use the built-in `oauth2` property:

```json
{
  "manifest_version": 3,
  "name": "GitHub Integration Extension",
  "version": "1.0.0",
  "permissions": ["identity"],
  "host_permissions": [
    "https://github.com/*",
    "https://api.github.com/*"
  ]
}
```

Implementing GitHub Authentication

```javascript
// github-auth.js - GitHub OAuth2 Implementation

class GitHubAuth {
  constructor() {
    this.clientId = 'your-github-client-id';
    this.redirectUri = chrome.identity.getRedirectURL();
    this.scope = 'repo user';
  }

  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: this.generateState()
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  generateState() {
    const state = Math.random().toString(36).substring(2, 15);
    chrome.storage.local.set({ oauth_state: state });
    return state;
  }

  async authenticate() {
    const authUrl = this.getAuthUrl();

    try {
      const response = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      // Parse the authorization code from the redirect URL
      const url = new URL(response);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      // Verify state to prevent CSRF attacks
      const storedState = await chrome.storage.local.get('oauth_state');
      if (state !== storedState.oauth_state) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Exchange code for access token (requires server-side component)
      const accessToken = await this.exchangeCodeForToken(code);
      return accessToken;
    } catch (error) {
      console.error('GitHub authentication failed:', error);
      throw error;
    }
  }

  async exchangeCodeForToken(code) {
    // Note: Token exchange should be done server-side to protect client secret
    // This is a simplified example - in production, use a backend service
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: 'your-client-secret', // Keep secret server-side in production
        code: code
      })
    });

    const data = await response.json();
    return data.access_token;
  }

  async makeApiCall(endpoint, options = {}) {
    const token = await this.getToken();
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        ...options.headers
      }
    });
    return response.json();
  }

  async getToken() {
    const { github_token } = await chrome.storage.local.get('github_token');
    if (github_token) {
      return github_token;
    }
    const token = await this.authenticate();
    await chrome.storage.local.set({ github_token: token });
    return token;
  }

  async logout() {
    await chrome.storage.local.remove('github_token');
  }
}
```

---

Secure Token Storage {#secure-token-storage}

Properly storing OAuth tokens is critical for security. Chrome provides several storage options, each with different security characteristics.

Using chrome.storage

The recommended approach for storing tokens is using `chrome.storage`:

```javascript
// token-storage.js - Secure Token Storage

class TokenStorage {
  static async setToken(provider, token, expiration = null) {
    const tokenData = {
      token,
      timestamp: Date.now()
    };

    if (expiration) {
      tokenData.expiration = expiration;
    }

    await chrome.storage.local.set({
      [`${provider}_auth_token`]: tokenData
    });
  }

  static async getToken(provider) {
    const result = await chrome.storage.local.get(`${provider}_auth_token`);
    const tokenData = result[`${provider}_auth_token`];

    if (!tokenData) {
      return null;
    }

    // Check if token has expired
    if (tokenData.expiration && Date.now() > tokenData.expiration) {
      await this.removeToken(provider);
      return null;
    }

    return tokenData.token;
  }

  static async removeToken(provider) {
    await chrome.storage.local.remove(`${provider}_auth_token`);
  }

  static async clearAllTokens() {
    const keys = await chrome.storage.local.get(null);
    const tokenKeys = Object.keys(keys).filter(
      key => key.endsWith('_auth_token')
    );
    await chrome.storage.local.remove(tokenKeys);
  }
}
```

Best Practices for Token Security

Always follow these security guidelines when handling OAuth tokens:

Never store tokens in `localStorage` or `sessionStorage`. These storage mechanisms are accessible to content scripts and can be compromised by XSS attacks. Instead, always use `chrome.storage.local` which is not accessible from web pages.

Implement token expiration handling. OAuth tokens typically expire after a certain period (commonly 1 hour for access tokens). Check expiration times before using tokens and automatically refresh them when needed.

Use the principle of least privilege when requesting scopes. Only request the minimum scopes your extension needs to function. This reduces the potential impact if a token is compromised.

Implement proper token revocation. When users log out or revoke access, remove tokens from both the cache and storage, and ideally call the provider's revocation endpoint.

---

Handling Token Refresh {#handling-token-refresh}

Access tokens expire, and your extension needs to handle refresh gracefully to maintain smooth user experience.

Implementing Automatic Token Refresh

```javascript
// token-refresh.js - Automatic Token Refresh

class TokenManager {
  constructor(provider) {
    this.provider = provider;
    this.refreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  }

  async getValidToken() {
    let token = await TokenStorage.getToken(this.provider);

    if (!token) {
      // No token exists, need to authenticate
      token = await this.authenticate();
    }

    // Check if token needs refresh
    if (await this.needsRefresh()) {
      token = await this.refreshToken();
    }

    return token;
  }

  async needsRefresh() {
    const result = await chrome.storage.local.get(`${this.provider}_auth_token`);
    const tokenData = result[`${this.provider}_auth_token`];

    if (!tokenData || !tokenData.expiration) {
      return false;
    }

    const timeUntilExpiry = tokenData.expiration - Date.now();
    return timeUntilExpiry < this.refreshBuffer;
  }

  async refreshToken() {
    // Implementation depends on the OAuth provider
    // Most providers use a refresh token to get new access tokens
    const refreshToken = await this.getRefreshToken();

    if (!refreshToken) {
      // No refresh token available, need full re-authentication
      return this.authenticate();
    }

    try {
      const newTokens = await this.exchangeRefreshToken(refreshToken);
      await TokenStorage.setToken(
        this.provider,
        newTokens.access_token,
        newTokens.expires_in * 1000 + Date.now()
      );
      return newTokens.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Refresh failed, need to re-authenticate
      return this.authenticate();
    }
  }

  async authenticate() {
    // Provider-specific authentication implementation
    throw new Error('Must be implemented by subclass');
  }

  async getRefreshToken() {
    const result = await chrome.storage.local.get(`${this.provider}_refresh_token`);
    return result[`${this.provider}_refresh_token`];
  }
}
```

---

Error Handling and Edge Cases {#error-handling}

Robust error handling ensures your extension remains functional even when authentication issues arise.

Common OAuth Errors

```javascript
// error-handling.js - OAuth Error Handling

class OAuthErrorHandler {
  static handleError(error, provider) {
    console.error(`OAuth error for ${provider}:`, error);

    switch (error.message || error.error) {
      case 'access_denied':
        // User denied the authorization request
        return {
          type: 'USER_DENIED',
          message: 'Authorization was denied. Please try again.',
          recoverable: true
        };

      case 'invalid_client':
        // Client authentication failed
        return {
          type: 'INVALID_CLIENT',
          message: 'Application configuration error. Please contact support.',
          recoverable: false
        };

      case 'invalid_grant':
        // Refresh token is invalid or expired
        return {
          type: 'INVALID_GRANT',
          message: 'Session expired. Please log in again.',
          recoverable: true
        };

      case 'invalid_request':
        // Malformed request
        return {
          type: 'INVALID_REQUEST',
          message: 'Invalid request. Please try again.',
          recoverable: true
        };

      case 'unauthorized_client':
        // Client is not authorized
        return {
          type: 'UNAUTHORIZED_CLIENT',
          message: 'Application not authorized. Please check permissions.',
          recoverable: false
        };

      case 'unsupported_grant_type':
        // Grant type not supported
        return {
          type: 'UNSUPPORTED_GRANT',
          message: 'Authentication method not supported.',
          recoverable: false
        };

      default:
        return {
          type: 'UNKNOWN',
          message: 'An unexpected error occurred. Please try again.',
          recoverable: true
        };
    }
  }

  static async handleAuthFailure(extension, error) {
    const errorInfo = this.handleError(error, extension.provider);

    // Clear invalid tokens
    await TokenStorage.removeToken(extension.provider);

    // Notify user
    await this.notifyUser(errorInfo);

    // If recoverable, trigger re-authentication
    if (errorInfo.recoverable) {
      return extension.authenticate();
    }

    throw new Error(errorInfo.message);
  }

  static async notifyUser(errorInfo) {
    // Show notification to user
    // Could use chrome.notifications or update popup UI
    console.log('Auth error:', errorInfo.message);
  }
}
```

Network Error Handling

```javascript
// network-errors.js - Network Error Handling

class NetworkErrorHandler {
  static async handleApiCall(fn, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (this.isRetryableError(error)) {
          const delay = this.calculateBackoff(attempt);
          console.log(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await this.sleep(delay);
        } else {
          // Non-retryable error, fail immediately
          throw error;
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  static isRetryableError(error) {
    // Network errors, timeouts, and 5xx errors are retryable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network failure
    }

    if (error.status >= 500 && error.status < 600) {
      return true; // Server error
    }

    if (error.status === 429) {
      return true; // Rate limited
    }

    return false;
  }

  static calculateBackoff(attempt) {
    // Exponential backoff with jitter
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

Complete Example: Multi-Provider Authentication {#complete-example}

Here is a complete, production-ready example combining all the concepts:

```javascript
// main-auth.js - Complete Authentication Module

class ExtensionAuth {
  constructor() {
    this.providers = {
      google: new GoogleAuth(),
      github: new GitHubAuth()
    };
    this.currentProvider = null;
  }

  async login(provider) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    this.currentProvider = provider;
    const token = await this.providers[provider].getAccessToken();

    await TokenStorage.setToken(provider, token);

    return {
      provider,
      token
    };
  }

  async logout() {
    if (this.currentProvider && this.providers[this.currentProvider]) {
      await this.providers[this.currentProvider].logout();
    }

    if (this.currentProvider) {
      await TokenStorage.removeToken(this.currentProvider);
    }

    this.currentProvider = null;
  }

  async isAuthenticated(provider = null) {
    const targetProvider = provider || this.currentProvider;

    if (!targetProvider) {
      return false;
    }

    const token = await TokenStorage.getToken(targetProvider);
    return !!token;
  }

  async getAuthenticatedUser(provider) {
    const token = await this.getValidToken(provider);
    const auth = this.providers[provider];

    if (auth.getUserInfo) {
      return auth.getUserInfo();
    }

    return null;
  }

  async getValidToken(provider = null) {
    const targetProvider = provider || this.currentProvider;

    if (!targetProvider) {
      throw new Error('No provider specified');
    }

    const token = await TokenStorage.getToken(targetProvider);

    if (!token) {
      return this.login(targetProvider);
    }

    return token;
  }
}

// Initialize the auth module
const auth = new ExtensionAuth();
```

---

Conclusion {#conclusion}

Implementing OAuth2 authentication in Chrome extensions enables powerful integrations with external services while maintaining strong security. By leveraging the Chrome Identity API, properly managing tokens, and following best practices for error handling, you can create secure and reliable authentication flows for your extensions.

Remember these key takeaways:

Always use the Chrome Identity API for OAuth flows rather than implementing custom solutions. Store tokens securely using `chrome.storage` and implement proper token refresh mechanisms. Handle errors gracefully and provide clear feedback to users when authentication issues occur. Finally, request only the minimum scopes necessary and respect user privacy.

With these skills, you can build Chrome extensions that securely connect to Google Drive, GitHub, and any other OAuth-enabled service, unlocking endless possibilities for your extension's functionality.

---

Related Articles

- [Chrome Extension OAuth2 Authentication Guide]({% post_url 2025-02-20-chrome-extension-oauth2-authentication-guide %})
- [Chrome Identity API OAuth Guide]({% post_url 2025-01-24-chrome-identity-api-oauth %})
- [Chrome Extension Authentication Patterns]({% post_url 2025-01-18-authentication-patterns-for-chrome-extensions %})

---

Turn Your Extension Into a Business
Ready to monetize? The Extension Monetization Playbook covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*This guide is part of the Chrome Extension Guide series. For more tutorials on Chrome extension development, explore our comprehensive guides on [Chrome extension development](/2025/01/16/chrome-extension-development-2025-complete-beginners-guide/) and [publishing to the Chrome Web Store](/2025/01/17/publish-chrome-extension-web-store-2025-guide/).*
---


*Part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
