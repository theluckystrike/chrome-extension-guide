---
layout: default
title: "Chrome Extension OAuth2 Authentication: Complete Identity API Guide"
description: "Master OAuth2 authentication in Chrome extensions with our comprehensive guide covering chrome.identity API, token management, and secure implementation patterns."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-oauth2-authentication/"
last_modified_at: 2026-01-15
---
Chrome Extension OAuth2 Authentication: Complete Identity API Guide

Authentication is one of the most critical yet complex aspects of building Chrome extensions. Whether you're integrating with Google APIs, connecting to third-party services like GitHub or Twitter, or building your own OAuth2 provider, understanding the chrome.identity API and proper token management is essential for building secure and user-friendly extensions. This guide provides a comprehensive walkthrough of OAuth2 authentication flow in Chrome extensions, from basic concepts to advanced token rotation strategies.

Table of Contents

- [Chrome Identity API Overview](#chrome-identity-api-overview)
- [launchWebAuthFlow vs getAuthToken](#launchwebauthflow-vs-getauthtoken)
- [Google OAuth2 Setup for Extensions](#google-oauth2-setup-for-extensions)
- [Token Storage Best Practices](#token-storage-best-practices)
- [Refresh Token Rotation](#refresh-token-rotation)
- [Multi-Provider Auth (GitHub, Twitter)](#multi-provider-auth-github-twitter)
- [PKCE Flow for Extensions](#pkce-flow-for-extensions)
- [Error Handling and Token Revocation](#error-handling-and-token-revocation)
- [Real-World Implementation Example](#real-world-implementation-example)

---

Chrome Identity API Overview

The chrome.identity API provides the foundation for OAuth2 authentication in Chrome extensions. It offers two primary methods for obtaining authentication tokens: `getAuthToken` and `launchWebAuthFlow`. Before using either method, you must configure your extension's manifest with appropriate permissions and declare your OAuth2 client information.

Manifest Configuration

First, add the identity permission to your manifest.json:

```json
{
  "manifest_version": 3,
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.file"]
  }
}
```

The chrome.identity API simplifies what would otherwise be a complex manual OAuth2 implementation. It handles the browser-based authentication flow, token caching, and interactive prompts automatically. Understanding when to use each method is crucial for building a solid authentication system.

---

launchWebAuthFlow vs getAuthToken

Choosing between `launchWebAuthFlow` and `getAuthToken` depends on your authentication requirements. Each method has distinct characteristics that make it suitable for different scenarios.

getAuthToken - Simplified Google OAuth

The `getAuthToken` method is specifically designed for Google OAuth2 and provides the simplest integration path. It automatically handles token caching, meaning subsequent calls return cached tokens without triggering new authentication flows:

```typescript
// background.ts
async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const token = await chrome.identity.getAuthToken({
      interactive: true,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    return token;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}
```

The `interactive` parameter controls whether the user sees an authentication prompt. Set it to `false` for background token refresh and `true` when the user explicitly initiates an action requiring authentication. The API automatically caches tokens, so calling `getAuthToken` multiple times doesn't prompt the user each time.

However, `getAuthToken` has limitations: it only works with Google APIs, doesn't support refresh token rotation, and provides no control over the OAuth2 flow parameters.

launchWebAuthFlow - Full OAuth2 Control

For non-Google OAuth2 providers or when you need full control over the authentication flow, `launchWebAuthFlow` opens a browser popup where the OAuth2 provider handles the entire authentication process:

```typescript
// background.ts
async function authenticateWithProvider(
  authUrl: string,
  redirectUri: string
): Promise<string | null> {
  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });
    
    // Extract token from redirect URL
    const url = new URL(responseUrl);
    const accessToken = url.searchParams.get('access_token');
    return accessToken;
  } catch (error) {
    console.error('Auth flow failed:', error);
    return null;
  }
}
```

The `launchWebAuthFlow` method returns when the OAuth2 provider redirects back to your specified redirect URI. You must parse the response URL to extract tokens or authorization codes. This method supports any OAuth2-compliant provider, including GitHub, Twitter, Slack, and custom authorization servers.

Key differences summary:

| Feature | getAuthToken | launchWebAuthFlow |
|---------|-------------|-------------------|
| Provider Support | Google only | Any OAuth2 provider |
| Token Caching | Automatic | Manual implementation |
| Refresh Tokens | Not supported | Full control |
| Flow Customization | Limited | Complete control |
| Use Case | Google APIs | Third-party services |

---

Google OAuth2 Setup for Extensions

Setting up Google OAuth2 for your Chrome extension requires configuration in both the Google Cloud Console and your extension's manifest. This section walks through the complete setup process.

Google Cloud Console Configuration

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "OAuth consent screen"
4. Configure the consent screen:
   - User Type: External
   - App name and email address
   - Add your extension's permissions scope
5. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
6. Select "Chrome App" as the application type
7. Enter your extension ID (found at chrome://extensions)
8. Save your client ID and client secret

Extension Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "oauth2": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/gmail.readonly"
    ]
  }
}
```

Complete Google Authentication Example

```typescript
// auth/google-auth.ts
interface GoogleAuthConfig {
  clientId: string;
  scopes: string[];
}

export class GoogleAuth {
  private config: GoogleAuthConfig;
  private tokenCache: Map<string, { token: string; expiry: number }>;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
    this.tokenCache = new Map();
  }

  async getToken(interactive = false): Promise<string | null> {
    const cacheKey = this.config.scopes.join(',');
    const cached = this.tokenCache.get(cacheKey);
    
    // Return cached token if still valid
    if (cached && cached.expiry > Date.now()) {
      return cached.token;
    }

    try {
      const token = await chrome.identity.getAuthToken({
        interactive,
        scopes: this.config.scopes
      });

      // Cache the token (expires in ~1 hour)
      this.tokenCache.set(cacheKey, {
        token,
        expiry: Date.now() + 3500 * 1000
      });

      return token;
    } catch (error) {
      console.error('Google auth failed:', error);
      return null;
    }
  }

  async makeApiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getToken();
    if (!token) throw new Error('Authentication required');

    return fetch(`https://www.googleapis.com${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });
  }

  async revokeToken(): Promise<void> {
    const token = await this.getToken(false);
    if (token) {
      await chrome.identity.removeCachedAuthToken({ token });
      this.tokenCache.clear();
    }
  }
}
```

---

Token Storage Best Practices

Proper token storage is critical for security. Chrome provides several storage mechanisms, each with different security characteristics. Understanding these options helps you make informed decisions about where and how to store authentication credentials.

Storage Options Comparison

Chrome offers multiple storage APIs with varying security properties:

| Storage Type | Encryption | Scope | Capacity |
|-------------|------------|-------|----------|
| chrome.storage.local | Not encrypted | Extension only | 5MB |
| chrome.storage.session | Not encrypted, cleared on restart | Extension only | 1MB |
| chrome.storage.sync | Not encrypted, synced across devices | Extension only | 100KB |
| chrome.storage.managed | Encrypted | Managed by IT | 1MB |

For authentication tokens, the best practice is to use `chrome.storage.session` for access tokens (which are short-lived) and avoid storing refresh tokens in browser storage entirely when possible.

Secure Token Storage Implementation

```typescript
// auth/token-storage.ts
interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

class SecureTokenStorage {
  private readonly STORAGE_KEY = 'auth_tokens';

  async storeTokens(provider: string, tokens: TokenData): Promise<void> {
    // Store access token in session storage (cleared on browser restart)
    await chrome.storage.session.set({
      [`${this.STORAGE_KEY}_${provider}`]: {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        tokenType: tokens.tokenType,
        scope: tokens.scope
      }
    });

    // For refresh tokens, use native messaging to store in secure backend
    // Never store refresh tokens in chrome.storage directly
    if (tokens.refreshToken) {
      await this.storeRefreshTokenSecurely(provider, tokens.refreshToken);
    }
  }

  async getTokens(provider: string): Promise<TokenData | null> {
    const stored = await chrome.storage.session.get(
      `${this.STORAGE_KEY}_${provider}`
    );
    const tokens = stored[`${this.STORAGE_KEY}_${provider}`];
    
    if (!tokens) return null;
    
    // Check if token is expired
    if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
      return null;
    }
    
    return tokens;
  }

  async clearTokens(provider: string): Promise<void> {
    await chrome.storage.session.remove(`${this.STORAGE_KEY}_${provider}`);
    await this.clearRefreshToken(provider);
  }

  private async storeRefreshTokenSecurely(
    _provider: string,
    _refreshToken: string
  ): Promise<void> {
    // In production, send to your secure backend
    // or use chrome.storage.managed for enterprise scenarios
    console.warn('Refresh token storage requires backend integration');
  }

  private async clearRefreshToken(_provider: string): Promise<void> {
    // Clear from backend as well
  }
}
```

The critical principle is to minimize token exposure. Access tokens are short-lived and can be revoked without major security impact. Refresh tokens, however, grant prolonged access and should be treated with higher security. For production extensions, consider storing refresh tokens server-side or using the Identity API's built-in token management.

---

Refresh Token Rotation

Refresh token rotation is essential for maintaining secure, long-lived authentication sessions. When access tokens expire (typically after one hour), your extension needs a way to obtain new access tokens without requiring the user to re-authenticate.

Understanding Refresh Token Flow

The standard OAuth2 token refresh flow works as follows:

1. Your extension obtains both an access token and a refresh token during initial authentication
2. When the access token expires, use the refresh token to request new tokens
3. The authorization server returns a new access token (and potentially a new refresh token)
4. Store and use the new tokens for subsequent requests

Implementing Token Rotation with launchWebAuthFlow

Since `getAuthToken` doesn't support refresh token rotation, you must implement it manually using `launchWebAuthFlow`:

```typescript
// auth/token-refresh.ts
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export class TokenManager {
  private readonly TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;

  constructor(clientId: string, clientSecret: string) {
    this.CLIENT_ID = clientId;
    this.CLIENT_SECRET = clientSecret;
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
    try {
      const response = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text());
        return null;
      }

      const tokens: TokenResponse = await response.json();
      
      // Some providers rotate refresh tokens on each refresh
      // Store the new refresh token if provided
      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  async handleExpiredToken(
    refreshToken: string,
    onTokenRefreshed: (tokens: TokenResponse) => void
  ): Promise<boolean> {
    const newTokens = await this.refreshAccessToken(refreshToken);
    
    if (newTokens) {
      onTokenRefreshed(newTokens);
      return true;
    }
    
    return false;
  }
}
```

Automatic Token Refresh Interceptor

Implement an automatic token refresh mechanism that intercepts failed API requests and retries them after refreshing:

```typescript
// auth/api-client.ts
export class AuthenticatedApiClient {
  private tokenManager: TokenManager;
  private tokenStorage: SecureTokenStorage;
  private refreshToken: string | null = null;

  constructor(tokenManager: TokenManager, tokenStorage: SecureTokenStorage) {
    this.tokenManager = tokenManager;
    this.tokenStorage = tokenStorage;
  }

  async request(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const tokens = await this.tokenStorage.getTokens('google');
    
    if (!tokens) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${tokens.accessToken}`
      }
    });

    // If unauthorized, try refreshing the token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tokenManager.refreshAccessToken(
        this.refreshToken
      );
      
      if (refreshed) {
        // Retry the original request with new token
        return this.request(url, options);
      }
    }

    return response;
  }
}
```

---

Multi-Provider Auth (GitHub, Twitter)

Modern extensions often need to authenticate with multiple OAuth2 providers. This section covers implementing authentication for GitHub and Twitter, demonstrating the flexibility of `launchWebAuthFlow`.

GitHub OAuth2 Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Homepage URL: Your extension or website URL
   - Authorization callback URL: `https://<extension-id>.chromiumapp.org/github`
3. Note your Client ID and Client Secret

GitHub Authentication Implementation

```typescript
// auth/github-auth.ts
interface GitHubAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class GitHubAuth {
  private readonly AUTHORIZATION_ENDPOINT = 'https://github.com/login/oauth/authorize';
  private readonly TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';
  private config: GitHubAuthConfig;

  constructor(config: GitHubAuthConfig) {
    this.config = config;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      // Generate and store PKCE code verifier
      code_challenge: 'challenge',
      code_challenge_method: 'S256'
    });

    return `${this.AUTHORIZATION_ENDPOINT}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken?: string;
  } | null> {
    try {
      const response = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          code_verifier: codeVerifier
        })
      });

      if (!response.ok) {
        console.error('Token exchange failed');
        return null;
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      console.error('GitHub auth error:', error);
      return null;
    }
  }

  async authenticate(): Promise<string | null> {
    const authUrl = this.getAuthorizationUrl();
    
    try {
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');
      
      if (!code) {
        console.error('No authorization code received');
        return null;
      }

      const tokens = await this.exchangeCodeForTokens(code, 'code-verifier');
      return tokens?.accessToken ?? null;
    } catch (error) {
      console.error('GitHub authentication failed:', error);
      return null;
    }
  }
}
```

Twitter/X OAuth2 Setup

Twitter uses OAuth 2.0 with PKCE. The setup process is similar to GitHub but requires additional configuration in the Twitter Developer Portal:

1. Create a project and app in the Twitter Developer Portal
2. Enable OAuth 2.0
3. Set the callback URL to `https://<extension-id>.chromiumapp.org/twitter`
4. Request appropriate scopes (tweet.read, users.read, etc.)

```typescript
// auth/twitter-auth.ts
export class TwitterAuth {
  private readonly AUTHORIZATION_ENDPOINT = 'https://twitter.com/i/oauth2/authorize';
  private readonly TOKEN_ENDPOINT = 'https://api.twitter.com/2/oauth2/token';
  
  // Generate random string for PKCE
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // SHA256 hash for code challenge
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async authenticate(
    clientId: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<string | null> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: crypto.randomUUID()
    });

    const authUrl = `${this.AUTHORIZATION_ENDPOINT}?${params.toString()}`;

    try {
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');
      
      if (!code) return null;

      // Exchange code for token (implement token exchange similar to GitHub)
      return await this.exchangeCodeForToken(code, codeVerifier, clientId, redirectUri);
    } catch (error) {
      console.error('Twitter auth failed:', error);
      return null;
    }
  }

  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    clientId: string,
    redirectUri: string
  ): Promise<string | null> {
    // Implement token exchange with PKCE support
    // Similar to GitHub implementation
    return null;
  }
}
```

---

PKCE Flow for Extensions

Proof Key for Code Exchange (PKCE) is a security extension to OAuth2 that prevents authorization code interception attacks. While PKCE is mandatory for public clients (including extensions), understanding its implementation ensures your authentication is secure.

Understanding PKCE

PKCE adds three parameters to the OAuth2 flow:

1. code_verifier: A cryptographically random string (43-128 characters)
2. code_challenge: A hashed version of the code_verifier
3. code_challenge_method: The hashing method (typically S256)

Implementing PKCE in Extensions

```typescript
// auth/pkce.ts
export class PKCE {
  private codeVerifier: string | null = null;

  // Generate a secure code verifier
  generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    // Base64url encode
    const base64 = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    this.codeVerifier = base64;
    return base64;
  }

  // Generate code challenge from verifier using S256
  async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    
    // Base64url encode the hash
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  getCodeVerifier(): string | null {
    return this.codeVerifier;
  }

  // Use with authorization URL
  async createAuthorizationParams(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: string;
  }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }
}
```

Using PKCE with OAuth2 Flow

```typescript
// auth/oauth2-with-pkce.ts
export class OAuth2WithPKCE {
  private pkce = new PKCE();
  private codeVerifier: string | null = null;

  async initiateAuth(
    authorizationEndpoint: string,
    clientId: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<string> {
    const { codeChallenge, codeChallengeMethod } = 
      await this.pkce.createAuthorizationParams();
    
    this.codeVerifier = this.pkce.getCodeVerifier()!;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      state: crypto.randomUUID()
    });

    return `${authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCode(
    tokenEndpoint: string,
    code: string,
    clientId: string,
    redirectUri: string
  ): Promise<Record<string, unknown> | null> {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not found. Initiate auth first.');
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          code,
          code_verifier: this.codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });

      if (!response.ok) {
        return null;
      }

      // Clear the code verifier after successful exchange
      this.codeVerifier = null;
      return await response.json();
    } catch (error) {
      console.error('Token exchange failed:', error);
      return null;
    }
  }
}
```

---

Error Handling and Token Revocation

Robust error handling is essential for a reliable authentication system. Users encounter various authentication errors, from network issues to revoked permissions. Your extension must handle these gracefully.

Common Error Types and Handling

```typescript
// auth/errors.ts
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const AuthErrorCodes = {
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_REVOKED: 'token_revoked',
  USER_REVOKED: 'user_revoked',
  NETWORK_ERROR: 'network_error',
  INVALID_GRANT: 'invalid_grant',
  INVALID_CLIENT: 'invalid_client',
  UNKNOWN: 'unknown'
} as const;

export function handleAuthError(error: unknown): AuthError {
  if (error instanceof chrome.runtime.LastError) {
    const message = error.message || 'Unknown Chrome identity error';
    
    if (message.includes('OAuth2')) {
      return new AuthError(
        message,
        AuthErrorCodes.INVALID_GRANT,
        true
      );
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return new AuthError(
        message,
        AuthErrorCodes.NETWORK_ERROR,
        true
      );
    }
  }

  return new AuthError(
    'An unexpected error occurred',
    AuthErrorCodes.UNKNOWN,
    true
  );
}
```

Token Revocation

Proper token revocation is critical when users log out or when security concerns arise:

```typescript
// auth/revocation.ts
export class TokenRevocation {
  private readonly GOOGLE_REVOKE_ENDPOINT = 
    'https://oauth2.googleapis.com/revoke';

  async revokeGoogleToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.GOOGLE_REVOKE_ENDPOINT}?token=${encodeURIComponent(accessToken)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }

  async revokeAllTokens(
    provider: string,
    tokenStorage: SecureTokenStorage
  ): Promise<void> {
    const tokens = await tokenStorage.getTokens(provider);
    
    if (tokens?.accessToken) {
      // Attempt to revoke with provider (best effort)
      if (provider === 'google') {
        await this.revokeGoogleToken(tokens.accessToken);
      }
    }

    // Clear local tokens
    await tokenStorage.clearTokens(provider);
  }
}
```

Implementing Retry Logic with Exponential Backoff

```typescript
// auth/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on non-retryable errors
      if (error instanceof AuthError && !error.recoverable) {
        throw error;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

---

Real-World Implementation Example

This section provides a complete, production-ready authentication system that combines all the concepts covered in this guide.

Complete Auth Module

```typescript
// auth/index.ts
import { GoogleAuth } from './google-auth';
import { GitHubAuth } from './github-auth';
import { SecureTokenStorage } from './token-storage';
import { TokenManager } from './token-refresh';
import { withRetry } from './retry';
import { TokenRevocation } from './revocation';

export interface AuthProvider {
  name: string;
  authenticate(): Promise<string | null>;
  getUserInfo(accessToken: string): Promise<Record<string, unknown> | null>;
}

export interface AuthConfig {
  google?: {
    clientId: string;
    scopes: string[];
  };
  github?: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };
}

export class AuthManager {
  private providers: Map<string, AuthProvider>;
  private tokenStorage: SecureTokenStorage;
  private tokenRevocation: TokenRevocation;

  constructor(config: AuthConfig) {
    this.providers = new Map();
    this.tokenStorage = new SecureTokenStorage();
    this.tokenRevocation = new TokenRevocation();

    // Initialize providers based on config
    if (config.google) {
      const googleAuth = new GoogleAuth(config.google);
      this.providers.set('google', {
        name: 'Google',
        authenticate: () => googleAuth.getToken(true),
        getUserInfo: async (token) => {
          const response = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return response.ok ? response.json() : null;
        }
      });
    }

    if (config.github) {
      const githubAuth = new GitHubAuth({
        ...config.github,
        redirectUri: `https://${chrome.runtime.id}.chromiumapp.org/github`
      });
      this.providers.set('github', {
        name: 'GitHub',
        authenticate: () => githubAuth.authenticate(),
        getUserInfo: async (token) => {
          const response = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token}` }
          });
          return response.ok ? response.json() : null;
        }
      });
    }
  }

  async login(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      console.error(`Provider ${providerName} not configured`);
      return false;
    }

    try {
      const token = await withRetry(() => provider.authenticate());
      if (!token) return false;

      // Store tokens securely
      await this.tokenStorage.storeTokens(providerName, {
        accessToken: token,
        expiresAt: Date.now() + 3600 * 1000, // 1 hour
        tokenType: 'Bearer',
        scope: ''
      });

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async logout(providerName: string): Promise<void> {
    await this.tokenRevocation.revokeAllTokens(providerName, this.tokenStorage);
  }

  async getAuthenticatedUser(
    providerName: string
  ): Promise<Record<string, unknown> | null> {
    const provider = this.providers.get(providerName);
    if (!provider) return null;

    const tokens = await this.tokenStorage.getTokens(providerName);
    if (!tokens) return null;

    return provider.getUserInfo(tokens.accessToken);
  }

  isAuthenticated(providerName: string): Promise<boolean> {
    return this.tokenStorage.getTokens(providerName).then(
      tokens => tokens !== null
    );
  }
}
```

Usage in Background Script

```typescript
// background.ts
import { AuthManager, AuthConfig } from './auth';

const authConfig: AuthConfig = {
  google: {
    clientId: 'your-google-client-id.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  },
  github: {
    clientId: 'your-github-client-id',
    clientSecret: 'your-github-client-secret',
    scopes: ['user:email', 'repo']
  }
};

const authManager = new AuthManager(authConfig);

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case 'login':
        const success = await authManager.login(message.provider);
        sendResponse({ success });
        break;
        
      case 'logout':
        await authManager.logout(message.provider);
        sendResponse({ success: true });
        break;
        
      case 'getUser':
        const user = await authManager.getAuthenticatedUser(message.provider);
        sendResponse({ user });
        break;
        
      case 'isAuthenticated':
        const authenticated = await authManager.isAuthenticated(message.provider);
        sendResponse({ authenticated });
        break;
    }
  })();
  
  return true; // Keep message channel open for async response
});
```

---

Security Considerations

When implementing OAuth2 in Chrome extensions, security should be your top priority. Review our comprehensive security guides to ensure your implementation follows best practices:

- [Security Best Practices](../guides/security-best-practices.md). Foundational security principles for extensions
- [Secure Message Passing](../guides/chrome-extension-secure-message-passing.md). Safely transmit authentication data between extension contexts

Key Security Takeaways

1. Never store refresh tokens in chrome.storage. Use secure backend storage or managed storage
2. Always use PKCE. It prevents authorization code interception attacks
3. Implement token expiration handling. Check token expiry before making API calls
4. Validate all messages. Authenticate and validate messages between extension contexts
5. Use HTTPS exclusively. Never transmit tokens over unencrypted connections
6. Implement proper error handling. Handle authentication failures gracefully without exposing sensitive information

---

Conclusion

OAuth2 authentication in Chrome extensions requires careful implementation to balance user experience with security. The chrome.identity API provides solid mechanisms through `getAuthToken` for Google services and `launchWebAuthFlow` for third-party providers. By following the patterns and best practices outlined in this guide, you can build secure, reliable authentication systems that protect user credentials while providing smooth integration with popular OAuth2 providers.

Remember to always implement proper token storage, refresh token rotation, and comprehensive error handling. As authentication standards evolve, keep your implementation updated to address new security requirements and best practices.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
