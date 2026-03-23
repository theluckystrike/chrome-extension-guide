---
layout: default
title: "OAuth2 Authentication in Chrome Extensions. Developer Guide"
description: "Learn how to implement OAuth2 authentication in Chrome Extensions using chrome.identity API, including Google APIs and third-party providers."
canonical_url: "https://bestchromeextensions.com/tutorials/oauth2-in-extensions/"
---

# OAuth2 Authentication in Chrome Extensions

Overview {#overview}

Implementing authentication in Chrome extensions requires understanding the `chrome.identity` API, which provides two primary methods: `getAuthToken` for Google APIs and `launchWebAuthFlow` for third-party OAuth providers. This guide covers both approaches, token management, secure storage, error handling, and logout flows.

Prerequisites {#prerequisites}

You'll need:

- A Chrome extension project with a background service worker
- An OAuth client ID from your provider (Google Developer Console, Auth0, Okta, etc.)
- The `identity` permission in your `manifest.json`

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.readonly"]
  }
}
```

The chrome.identity API {#the-chrome-identity-api}

Chrome provides the `chrome.identity` API specifically for authentication in extensions. It handles the complexity of user authentication while keeping tokens secure.

Two Authentication Methods {#two-authentication-methods}

| Method | Use Case | Token Handling |
|--------|----------|----------------|
| `getAuthToken` | Google APIs only | Chrome manages tokens automatically |
| `launchWebAuthFlow` | Any OAuth2/OAuth provider | You receive the auth code, handle tokens yourself |

Google APIs: Using getAuthToken {#google-apis-using-getauthtoken}

For Google APIs (Drive, Gmail, Calendar, etc.), `getAuthToken` is the simplest approach. Chrome handles token caching and refresh automatically.

Basic Usage {#basic-usage}

```ts
// background.ts
async function getGoogleAccessToken(): Promise<string | undefined> {
  try {
    const token = await chrome.identity.getAuthToken({
      interactive: false, // Show UI if needed to get consent
    });
    return token;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return undefined;
  }
}
```

Interactive vs Non-Interactive {#interactive-vs-non-interactive}

```ts
// Non-interactive (silent) - returns token if cached, undefined otherwise
const silentToken = await chrome.identity.getAuthToken({ interactive: false });

// Interactive - shows account picker or consent if needed
const interactiveToken = await chrome.identity.getAuthToken({ interactive: true });
```

Using the Token {#using-the-token}

```ts
async function listGoogleDriveFiles(): Promise<void> {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?pageSize=10",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  console.log("Files:", data.files);
}
```

Handling Token Expiration {#handling-token-expiration}

Chrome automatically caches tokens, but they expire. Use `getAuthToken` with `interactive: false` to get a fresh token:

```ts
async function getValidToken(): Promise<string | undefined> {
  // Clear cached token first to force refresh
  const token = await chrome.identity.getAuthToken({ interactive: false });
  return token;
}
```

Or use the `tokenDetails` parameter to specify exact scopes:

```ts
const token = await chrome.identity.getAuthToken({
  interactive: false,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
```

Third-Party OAuth: Using launchWebAuthFlow {#third-party-oauth-using-launchwebauthflow}

For non-Google OAuth providers (Auth0, Okta, your own OAuth server), use `launchWebAuthFlow`. This opens a popup where users authenticate, then returns an auth code or access token.

Basic Flow {#basic-flow}

```ts
// background.ts
const CLIENT_ID = "your-client-id";
const REDIRECT_URI = chrome.identity.getRedirectURL();
const AUTH_URL = `https://your-oauth-provider.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=read:profile`;

async function authenticateWithOAuth(): Promise<string | undefined> {
  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: AUTH_URL,
      interactive: true,
    });

    if (!responseUrl) {
      throw new Error("Authentication was cancelled");
    }

    // Parse the code from the redirect URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get("code");

    return code;
  } catch (error) {
    console.error("Auth flow failed:", error);
    return undefined;
  }
}
```

Complete Example with Token Exchange {#complete-example-with-token-exchange}

```ts
// background.ts

interface OAuthConfig {
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  redirectUri: string;
  scopes: string[];
}

class OAuthManager {
  constructor(private config: OAuthConfig) {}

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
      state: this.generateState(),
    });

    return `${this.config.authEndpoint}?${params.toString()}`;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async startAuthFlow(): Promise<{ accessToken: string; refreshToken?: string } | null> {
    try {
      const authUrl = this.buildAuthUrl();

      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      if (!responseUrl) {
        return null;
      }

      // Extract authorization code from redirect URL
      const url = new URL(responseUrl);
      const code = url.searchParams.get("code");

      if (!code) {
        // Some providers return token directly in hash
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");

        if (accessToken) {
          return { accessToken };
        }
        return null;
      }

      // Exchange code for tokens (do this server-side in production!)
      return await this.exchangeCodeForTokens(code);
    } catch (error) {
      console.error("OAuth flow failed:", error);
      return null;
    }
  }

  private async exchangeCodeForTokens(
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }
}

// Usage
const oauth = new OAuthManager({
  clientId: "your-client-id",
  authEndpoint: "https://auth.example.com/authorize",
  tokenEndpoint: "https://auth.example.com/token",
  redirectUri: chrome.identity.getRedirectURL(),
  scopes: ["read:profile", "write:data"],
});

const tokens = await oauth.startAuthFlow();
if (tokens) {
  console.log("Authenticated! Access token:", tokens.accessToken);
}
```

Token Management and Refresh {#token-management-and-refresh}

Storing Tokens Securely {#storing-tokens-securely}

Never store tokens in `localStorage` or plain text. Use `chrome.storage.session` for access tokens and `chrome.storage.local` with encryption for refresh tokens:

```ts
// auth-storage.ts
import { encrypt, decrypt } from "./crypto-utils"; // Your encryption utility

const TOKEN_KEY = "auth_tokens";

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp
  provider: string;
}

async function storeTokens(data: TokenData): Promise<void> {
  // Store access token in session storage (cleared when browser closes)
  await chrome.storage.session.set({
    accessToken: data.accessToken,
    expiresAt: data.expiresAt,
  });

  // Store refresh token in local storage with encryption
  if (data.refreshToken) {
    const encrypted = await encrypt(data.refreshToken);
    await chrome.storage.local.set({
      refreshToken: encrypted,
      provider: data.provider,
    });
  }
}

async function getAccessToken(): Promise<string | undefined> {
  const { accessToken, expiresAt } = await chrome.storage.session.get([
    "accessToken",
    "expiresAt",
  ]);

  // Check if token is expired
  if (expiresAt && Date.now() > expiresAt) {
    // Token expired, try to refresh
    const refreshed = await refreshAccessToken();
    return refreshed;
  }

  return accessToken;
}

async function getRefreshToken(): Promise<string | undefined> {
  const { refreshToken, provider } = await chrome.storage.local.get([
    "refreshToken",
    "provider",
  ]);

  if (!refreshToken) return undefined;

  return await decrypt(refreshToken);
}

async function refreshAccessToken(): Promise<string | undefined> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    // No refresh token, need to re-authenticate
    return undefined;
  }

  // Call your token refresh endpoint
  const response = await fetch("https://auth.example.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: "your-client-id",
    }),
  });

  if (!response.ok) {
    // Refresh failed, clear tokens
    await clearTokens();
    return undefined;
  }

  const tokens = await response.json();

  // Store new tokens
  await storeTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    provider: "example",
  });

  return tokens.access_token;
}

async function clearTokens(): Promise<void> {
  await chrome.storage.session.clear();
  await chrome.storage.local.remove(["refreshToken", "provider"]);
}
```

Token Refresh Logic {#token-refresh-logic}

Implement automatic token refresh before making API calls:

```ts
// api-client.ts
async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = await getAccessToken();

  // If no token or needs refresh, try to refresh
  if (!token) {
    token = await refreshAccessToken();
  }

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // Handle 401 - token might have been revoked
  if (response.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    }
    throw new Error("Authentication failed");
  }

  return response;
}
```

Handling Auth Errors {#handling-auth-errors}

Common Error Types {#common-error-types}

```ts
// error-handler.ts
type AuthError =
  | { type: "not_authenticated" }
  | { type: "token_expired" }
  | { type: "token_revoked" }
  | { type: "permission_denied" }
  | { type: "network_error" }
  | { type: "unknown"; message: string };

async function handleAuthError(error: unknown): Promise<AuthError> {
  if (error instanceof Error) {
    // Chrome identity errors
    if (error.message.includes("OAuth2")) {
      return { type: "permission_denied" };
    }

    // Network errors
    if (error.message.includes("network")) {
      return { type: "network_error" };
    }

    return { type: "unknown"; message: error.message };
  }

  return { type: "unknown"; message: "Unknown error" };
}

// In your code
async function handleApiError(error: unknown): Promise<void> {
  const authError = await handleAuthError(error);

  switch (authError.type) {
    case "not_authenticated":
    case "token_expired":
    case "token_revoked":
      // Clear tokens and prompt re-authentication
      await clearTokens();
      // Notify UI to show login button
      chrome.runtime.sendMessage({ type: "AUTH_REQUIRED" });
      break;

    case "permission_denied":
      console.error("User denied permission");
      break;

    case "network_error":
      console.error("Network error, will retry");
      break;

    default:
      console.error("Unknown error:", authError.message);
  }
}
```

Graceful Degradation {#graceful-degradation}

```ts
// graceful-auth.ts
class AuthManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string | undefined> | null = null;

  async getValidToken(): Promise<string | undefined> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string | undefined> {
    // First try to get cached token
    let token = await getAccessToken();

    if (!token) {
      // Try refresh token
      token = await refreshAccessToken();
    }

    return token;
  }

  // Queue API calls while refreshing
  private requestQueue: Array<() => void> = [];

  async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    const token = await this.getValidToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    return request();
  }
}
```

Logout Flow {#logout-flow}

Implement a complete logout that clears all stored credentials:

```ts
// logout.ts
async function logout(): Promise<void> {
  // 1. Clear all stored tokens
  await clearTokens();

  // 2. Revoke Google token (if using Google APIs)
  try {
    const { accessToken } = await chrome.storage.session.get("accessToken");
    if (accessToken) {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`
      );
    }
  } catch (error) {
    console.error("Failed to revoke Google token:", error);
  }

  // 3. Notify all extension contexts
  chrome.runtime.sendMessage({ type: "LOGGED_OUT" });

  // 4. Update badge or icon to show logged out state
  chrome.action.setBadgeText({ text: "" });
}

// Listen for logout in popup/options
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "LOGGED_OUT") {
    // Update UI to show logged out state
    updateUI({ isLoggedIn: false });
  }
});
```

Logout from Popup {#logout-from-popup}

```ts
// popup.ts
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await logout();

  // Show login button, hide user info
  document.getElementById("login-section")?.classList.remove("hidden");
  document.getElementById("user-section")?.classList.add("hidden");
});
```

Security Best Practices {#security-best-ractices}

Token Security {#token-security}

1. Never log tokens. Tokens in console logs can be exploited
2. Use HTTPS always. Never send tokens over HTTP
3. Implement token expiration. Don't trust tokens indefinitely
4. Encrypt refresh tokens. Use `chrome.storage.local` with encryption for long-lived tokens
5. Clear tokens on logout. Ensure complete token cleanup

CSRF Protection {#csrf-protection}

```ts
// Use state parameter to prevent CSRF
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Store state in session storage to verify on callback
async function startAuth(): Promise<void> {
  const state = generateState();
  await chrome.storage.session.set({ oauthState: state });

  const authUrl = buildAuthUrl(state);
  await chrome.identity.launchWebAuthFlow({ url: authUrl });
}

// Verify state on callback
async function handleCallback(url: string): Promise<boolean> {
  const { oauthState } = await chrome.storage.session.get("oauthState");
  const urlState = new URL(url).searchParams.get("state");

  return oauthState === urlState;
}
```

Manifest V3 Considerations {#manifest-v3-considerations}

Service Worker vs Background Page {#service-worker-vs-background-page}

In Manifest V3, background scripts run as service workers with these implications:

1. No persistent state. Use `chrome.storage` instead of variables
2.  Ephemeral execution. Service worker can be terminated
3. No synchronous XHR. Use `fetch` with async/await

```ts
// background.ts (Manifest V3)
// Token stored in chrome.storage, not closure variable
chrome.runtime.onStartup.addListener(async () => {
  // Initialize on browser startup
  const token = await getAccessToken();
  if (token) {
    chrome.action.setBadgeText({ text: "" });
  }
});
```

content Script Auth Communication {#content-script-auth-communication}

Content scripts cannot access `chrome.identity` directly. Use message passing:

```ts
// content.ts
async function authenticate(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "GET_AUTH_TOKEN",
  });

  if (response?.token) {
    // Use token for API calls
  }
}

// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_AUTH_TOKEN") {
    getValidToken().then((token) => {
      sendResponse({ token });
    });
    return true; // Keep message channel open for async response
  }
});
```

Complete Example: Google Drive Extension {#complete-example-google-drive-extension}

```ts
// background.ts
class GoogleDriveAuth {
  private static readonly SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
  ];

  async getToken(): Promise<string | null> {
    try {
      const token = await chrome.identity.getAuthToken({
        interactive: false,
        scopes: GoogleDriveAuth.SCOPES,
      });
      return token || null;
    } catch (error) {
      console.error("Failed to get token:", error);
      return null;
    }
  }

  async getTokenInteractive(): Promise<string | null> {
    try {
      const token = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: GoogleDriveAuth.SCOPES,
      });
      return token || null;
    } catch (error) {
      console.error("Failed to get token (interactive):", error);
      return null;
    }
  }

  async removeToken(): Promise<void> {
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (token) {
      await chrome.identity.removeCachedAuthToken({ token });
    }
  }

  async listFiles(limit = 10): Promise<DriveFile[]> {
    const token = await this.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=${limit}&fields=files(id,name,mimeType,modifiedTime)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await this.removeToken();
        throw new Error("Token expired");
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files;
  }
}

// Usage
const drive = new GoogleDriveAuth();

// In popup or background
document.getElementById("list-files")?.addEventListener("click", async () => {
  const token = await drive.getToken();

  if (!token) {
    // Need to authenticate
    const newToken = await drive.getTokenInteractive();
    if (!newToken) {
      console.error("Authentication cancelled");
      return;
    }
  }

  try {
    const files = await drive.listFiles();
    console.log("Files:", files);
  } catch (error) {
    console.error("Failed to list files:", error);
  }
});
```

Summary {#summary}

- Use `getAuthToken` for Google APIs. Chrome manages token caching and refresh
- Use `launchWebAuthFlow` for third-party OAuth providers
- Store tokens securely using `chrome.storage.session` for access tokens and encrypted `chrome.storage.local` for refresh tokens
- Implement automatic token refresh before API calls
- Handle errors gracefully with proper error types
- Clear all tokens and cached credentials on logout
- Follow security best practices: HTTPS, CSRF protection, token expiration

Related Articles {#related-articles}

- [Permissions Quickstart](permissions-quickstart.md). Understanding Chrome extension permissions
- [Chrome Storage Patterns](chrome-storage-patterns.md). Advanced storage techniques for extensions
- [Runtime API Guide](runtime-api-guide.md). Chrome runtime API for extension communication

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
