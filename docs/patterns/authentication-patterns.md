---
layout: default
title: "Chrome Extension Authentication Patterns. Best Practices"
description: "Implement OAuth and authentication flows in Chrome extensions securely."
canonical_url: "https://bestchromeextensions.com/patterns/authentication-patterns/"
last_modified_at: 2026-01-15
---

Authentication Patterns for Chrome Extensions

This guide covers authentication patterns for Chrome extensions connecting to external services, including OAuth 2.0, token management, and security best practices.

Prerequisites {#prerequisites}

Declare the required permissions in your manifest:

```json
{
  "manifest_version": 3,
  "permissions": ["identity", "storage"],
  "host_permissions": ["https://*.example.com/*"]
}
```

---

OAuth 2.0 with chrome.identity.launchWebAuthFlow() {#oauth-20-with-chromeidentitylaunchwebauthflow}

PKCE Flow Implementation {#pkce-flow-implementation}

The PKCE (Proof Key for Code Exchange) flow is the recommended OAuth pattern for extensions:

```typescript
// utils/oauth.ts
async function startOAuthFlow(): Promise<OAuthToken> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  const authUrl = new URL('https://auth.example.com/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', chrome.identity.getRedirectURL());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'read write');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });
  
  const code = new URL(responseUrl).searchParams.get('code');
  return exchangeCodeForTokens(code, codeVerifier);
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

Token Storage and Refresh {#token-storage-and-refresh}

Never store tokens in localStorage or plain chrome.storage.local. Use encrypted storage:

```typescript
// utils/tokenManager.ts
class TokenManager {
  private static STORAGE_KEY = 'secure_tokens';
  
  async storeTokens(tokens: { access: string; refresh: string; expires: number }): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(tokens));
    await chrome.storage.session.set({ [TokenManager.STORAGE_KEY]: encrypted });
  }
  
  async getValidToken(): Promise<string | null> {
    const stored = await chrome.storage.session.get(TokenManager.STORAGE_KEY);
    const tokens = JSON.parse(await this.decrypt(stored[TokenManager.STORAGE_KEY]));
    
    if (Date.now() >= tokens.expires - 60000) {
      return this.refreshAccessToken(tokens.refresh);
    }
    return tokens.access;
  }
  
  async revokeTokens(): Promise<void> {
    await chrome.storage.session.remove(TokenManager.STORAGE_KEY);
  }
}
```

---

Google-Specific: chrome.identity.getAuthToken() {#google-specific-chromeidentitygetauthtoken}

For Google APIs, use the built-in token management:

```typescript
async function getGoogleAuthToken(): Promise<string> {
  const result = await chrome.identity.getAuthToken({
    interactive: true,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return result.token; // MV3 returns { token: string, grantedScopes: string[] }
}

async function removeGoogleToken(): Promise<void> {
  const result = await chrome.identity.getAuthToken({ interactive: false });
  await chrome.identity.removeCachedAuthToken({ token: result.token });
}
```

---

Login State UI {#login-state-ui}

Dynamically show different popup content based on authentication state:

```typescript
// popup/main.ts
document.addEventListener('DOMContentLoaded', async () => {
  const tokens = await chrome.storage.session.get('secure_tokens');
  const container = document.getElementById('app');
  
  if (tokens['secure_tokens']) {
    container.innerHTML = `
      <div class="logged-in">
        <img src="${user.avatar}" alt="Profile" />
        <span>${user.name}</span>
        <button id="logout">Sign Out</button>
      </div>
    `;
    document.getElementById('logout').addEventListener('click', handleLogout);
  } else {
    container.innerHTML = `
      <button id="login">Sign In with Google</button>
    `;
    document.getElementById('login').addEventListener('click', startOAuthFlow);
  }
});
```

---

Multi-Account Support {#multi-account-support}

Store multiple account tokens with account identifiers:

```typescript
async function switchAccount(accountId: string): Promise<void> {
  const accounts = await chrome.storage.session.get('oauth_accounts');
  const tokens = JSON.parse(accounts['oauth_accounts'])[accountId];
  await chrome.storage.session.set({ current_account: accountId });
  await tokenManager.storeTokens(tokens);
}
```

---

Security Best Practices {#security-best-practices}

- Never hardcode API keys. Use chrome.storage.local or an options page
- Never store passwords. Use token-based authentication only
- Validate tokens server-side. Never trust client-side token expiration alone
- Use secure storage. Prefer chrome.storage.session over chrome.storage.local
- Handle token revocation. Listen for forced logout events from your API

---

CORS and Credentials {#cors-and-credentials}

When making authenticated API calls, configure credentials properly:

```typescript
async function authenticatedFetch(url: string): Promise<Response> {
  const token = await tokenManager.getValidToken();
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'omit' // Tokens are in headers, not cookies
  });
}
```

---

Cross-References {#cross-references}

- [patterns/oauth-identity.md](../guides/identity-oauth.md)
- [guides/identity-oauth.md](../guides/identity-oauth.md)
- [guides/security-best-practices.md](../guides/security-best-practices.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
