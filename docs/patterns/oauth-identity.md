---
layout: default
title: "Chrome Extension Oauth Identity — Best Practices"
description: "Implement OAuth 2.0 for user authentication."
canonical_url: "https://bestchromeextensions.com/patterns/oauth-identity/"
---

# OAuth and Identity Patterns

## Overview {#overview}

Chrome extensions that need user authentication face unique challenges: the extension popup disappears when it loses focus, service workers terminate between requests, and token storage must survive browser restarts. Chrome provides `chrome.identity` with two authentication flows — `getAuthToken` for Google accounts and `launchWebAuthFlow` for everything else. This guide covers eight practical patterns for building a complete, type-safe authentication layer in a Manifest V3 extension.

---

## Auth Flow Comparison {#auth-flow-comparison}

| Feature | `getAuthToken` | `launchWebAuthFlow` |
|---------|---------------|---------------------|
| Provider | Google only | Any OAuth 2.0 / OIDC provider |
| User experience | Silent or one-click consent | Opens a new browser window |
| Token management | Chrome handles refresh | You handle refresh manually |
| Scopes | Google API scopes | Provider-specific scopes |
| Manifest key | `oauth2.client_id` + `oauth2.scopes` | `permissions: ["identity"]` |
| Offline access | Built-in via `getAuthToken` cache | Requires refresh token storage |

---

## Pattern 1: Google OAuth with chrome.identity.getAuthToken {#pattern-1-google-oauth-with-chromeidentitygetauthtoken}

The simplest auth flow — Chrome manages the token lifecycle for Google accounts:

```json
// manifest.json (partial)
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

```ts
// lib/google-auth.ts

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function getGoogleToken(
  interactive: boolean = true
): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive });
  if (!result.token) {
    throw new Error("No token returned");
  }
  return result.token;
}

export async function getGoogleUserInfo(): Promise<GoogleUserInfo> {
  const token = await getGoogleToken();
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    // Token may be stale — remove and retry once
    if (response.status === 401) {
      await removeCachedToken(token);
      const freshToken = await getGoogleToken();
      const retry = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${freshToken}` } }
      );
      if (!retry.ok) throw new Error(`Google API error: ${retry.status}`);
      return retry.json();
    }
    throw new Error(`Google API error: ${response.status}`);
  }
  return response.json();
}

async function removeCachedToken(token: string): Promise<void> {
  await chrome.identity.removeCachedAuthToken({ token });
}
```

### Gotcha: Token Caching {#gotcha-token-caching}

`getAuthToken` returns a cached token on subsequent calls. If the token is revoked server-side, your API calls will fail with 401. Always call `removeCachedAuthToken` before retrying.

---

## Pattern 2: Non-Google Providers with launchWebAuthFlow {#pattern-2-non-google-providers-with-launchwebauthflow}

For GitHub, Twitter, or any other OAuth 2.0 provider, use `launchWebAuthFlow`:

```ts
// lib/oauth-providers.ts

interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string; // Some flows require this
  scopes: string[];
}

const GITHUB_CONFIG: OAuthConfig = {
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  clientId: "YOUR_GITHUB_CLIENT_ID",
  clientSecret: "YOUR_GITHUB_CLIENT_SECRET",
  scopes: ["read:user", "repo"],
};

export async function launchOAuthFlow(
  config: OAuthConfig
): Promise<string> {
  const redirectUrl = chrome.identity.getRedirectURL();
  const state = crypto.randomUUID();

  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUrl);
  authUrl.searchParams.set("scope", config.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error("No callback URL returned");
  }

  const params = new URL(responseUrl).searchParams;
  if (params.get("state") !== state) {
    throw new Error("OAuth state mismatch — possible CSRF attack");
  }

  const code = params.get("code");
  if (!code) throw new Error("No authorization code in callback");

  // Exchange the code for a token
  return exchangeCodeForToken(config, code, redirectUrl);
}

async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}
```

### Gotcha: Redirect URL Format {#gotcha-redirect-url-format}

`chrome.identity.getRedirectURL()` returns `https://<extension-id>.chromiumapp.org/`. Register this exact URL with your OAuth provider. During development, the extension ID changes if unpacked — pin it with the `key` field in manifest.json.

---

## Pattern 3: Token Storage and Refresh Cycle {#pattern-3-token-storage-and-refresh-cycle}

Store tokens securely and manage refresh cycles without leaking credentials:

```ts
// lib/token-store.ts

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  provider: string;
}

const TOKEN_KEY = "auth_tokens";

export async function storeTokens(tokens: StoredTokens): Promise<void> {
  // Use session storage for access tokens (cleared on browser restart)
  await chrome.storage.session.set({
    [TOKEN_KEY]: tokens,
  });

  // Persist refresh token in local storage (survives restarts)
  if (tokens.refreshToken) {
    await chrome.storage.local.set({
      [`${TOKEN_KEY}_refresh`]: {
        refreshToken: tokens.refreshToken,
        provider: tokens.provider,
      },
    });
  }
}

export async function getAccessToken(): Promise<string | null> {
  const result = await chrome.storage.session.get(TOKEN_KEY);
  const tokens: StoredTokens | undefined = result[TOKEN_KEY];

  if (!tokens) return null;

  // Refresh 60 seconds before expiry
  if (Date.now() > tokens.expiresAt - 60_000) {
    return refreshAccessToken(tokens.provider);
  }

  return tokens.accessToken;
}

async function refreshAccessToken(
  provider: string
): Promise<string | null> {
  const result = await chrome.storage.local.get(`${TOKEN_KEY}_refresh`);
  const stored = result[`${TOKEN_KEY}_refresh`];

  if (!stored?.refreshToken) return null;

  try {
    const response = await fetch(getTokenUrl(provider), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: stored.refreshToken,
        client_id: getClientId(provider),
      }),
    });

    if (!response.ok) {
      // Refresh token is revoked — clear everything
      await clearTokens();
      return null;
    }

    const data = await response.json();
    await storeTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? stored.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      provider,
    });

    return data.access_token;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    chrome.storage.session.remove(TOKEN_KEY),
    chrome.storage.local.remove(`${TOKEN_KEY}_refresh`),
  ]);
}
```

### Why Split Storage? {#why-split-storage}

Access tokens go in `chrome.storage.session` so they vanish when the browser closes — reducing the window of exposure. Refresh tokens go in `chrome.storage.local` so the user doesn't have to re-authenticate after every restart.

---

## Pattern 4: Typed Auth State Machine {#pattern-4-typed-auth-state-machine}

Model authentication as an explicit state machine to eliminate impossible states:

```ts
// lib/auth-state.ts

type AuthState =
  | { status: "signed-out" }
  | { status: "signing-in"; provider: string }
  | { status: "signed-in"; user: AuthUser; provider: string }
  | { status: "error"; error: string; provider?: string };

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

type AuthEvent =
  | { type: "START_SIGN_IN"; provider: string }
  | { type: "SIGN_IN_SUCCESS"; user: AuthUser; provider: string }
  | { type: "SIGN_IN_ERROR"; error: string; provider?: string }
  | { type: "SIGN_OUT" };

function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "START_SIGN_IN":
      if (state.status === "signing-in") return state; // Prevent double sign-in
      return { status: "signing-in", provider: event.provider };

    case "SIGN_IN_SUCCESS":
      return {
        status: "signed-in",
        user: event.user,
        provider: event.provider,
      };

    case "SIGN_IN_ERROR":
      return {
        status: "error",
        error: event.error,
        provider: event.provider,
      };

    case "SIGN_OUT":
      return { status: "signed-out" };
  }
}

// Persist and broadcast state changes
export class AuthStateMachine {
  private state: AuthState = { status: "signed-out" };
  private listeners = new Set<(state: AuthState) => void>();

  async initialize(): Promise<void> {
    const result = await chrome.storage.local.get("authState");
    if (result.authState) {
      this.state = result.authState;
      this.notify();
    }
  }

  dispatch(event: AuthEvent): void {
    this.state = authReducer(this.state, event);
    this.notify();
    chrome.storage.local.set({ authState: this.state });

    // Broadcast to other contexts (popup, options, content scripts)
    chrome.runtime.sendMessage({
      type: "AUTH_STATE_CHANGED",
      state: this.state,
    }).catch(() => {
      // No listeners — expected when popup is closed
    });
  }

  getState(): AuthState {
    return this.state;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
```

The state machine guarantees that the UI never shows a stale state. If sign-in fails, the UI shows the error state — not a loading spinner stuck forever.

---

## Pattern 5: Multi-Account Support {#pattern-5-multi-account-support}

Some extensions need to manage multiple authenticated accounts simultaneously:

```ts
// lib/multi-account.ts

interface Account {
  id: string;
  provider: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface AccountStore {
  accounts: Account[];
  activeAccountId: string | null;
}

const ACCOUNTS_KEY = "accountStore";

export class MultiAccountManager {
  private store: AccountStore = { accounts: [], activeAccountId: null };

  async initialize(): Promise<void> {
    const result = await chrome.storage.local.get(ACCOUNTS_KEY);
    if (result[ACCOUNTS_KEY]) {
      this.store = result[ACCOUNTS_KEY];
    }
  }

  async addAccount(account: Omit<Account, "isActive">): Promise<void> {
    const existing = this.store.accounts.findIndex(
      (a) => a.id === account.id && a.provider === account.provider
    );

    if (existing >= 0) {
      // Update existing account info
      this.store.accounts[existing] = {
        ...account,
        isActive: this.store.activeAccountId === account.id,
      };
    } else {
      this.store.accounts.push({ ...account, isActive: false });
    }

    // If this is the first account, activate it
    if (this.store.accounts.length === 1) {
      await this.switchAccount(account.id);
      return;
    }

    await this.persist();
  }

  async switchAccount(accountId: string): Promise<void> {
    this.store.accounts = this.store.accounts.map((a) => ({
      ...a,
      isActive: a.id === accountId,
    }));
    this.store.activeAccountId = accountId;
    await this.persist();

    // Notify all contexts of account switch
    chrome.runtime.sendMessage({
      type: "ACCOUNT_SWITCHED",
      accountId,
    }).catch(() => {});
  }

  async removeAccount(accountId: string): Promise<void> {
    this.store.accounts = this.store.accounts.filter(
      (a) => a.id !== accountId
    );

    // Clear tokens for this account
    await chrome.storage.session.remove(`tokens_${accountId}`);
    await chrome.storage.local.remove(`refresh_${accountId}`);

    // If the active account was removed, switch to the first remaining
    if (this.store.activeAccountId === accountId) {
      const next = this.store.accounts[0];
      this.store.activeAccountId = next?.id ?? null;
      if (next) next.isActive = true;
    }

    await this.persist();
  }

  getActiveAccount(): Account | null {
    return (
      this.store.accounts.find(
        (a) => a.id === this.store.activeAccountId
      ) ?? null
    );
  }

  getAllAccounts(): Account[] {
    return [...this.store.accounts];
  }

  private async persist(): Promise<void> {
    await chrome.storage.local.set({ [ACCOUNTS_KEY]: this.store });
  }
}
```

---

## Pattern 6: Silent Token Refresh in Service Workers {#pattern-6-silent-token-refresh-in-service-workers}

Service workers terminate after ~30 seconds of inactivity. Use alarms to keep tokens fresh:

```ts
// background.ts

import { getAccessToken, storeTokens } from "./lib/token-store";

const REFRESH_ALARM = "token-refresh";

// Schedule periodic refresh when the extension starts
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, {
    periodInMinutes: 45, // Refresh well before the typical 60-min expiry
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;

  try {
    const token = await getAccessToken();
    if (token) {
      console.log("[auth] Token refreshed silently");
    } else {
      console.warn("[auth] Silent refresh failed — user must re-authenticate");
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#e53935" });
    }
  } catch (error) {
    console.error("[auth] Token refresh error:", error);
  }
});

// Also refresh on service worker startup (wake from idle)
chrome.runtime.onStartup.addListener(async () => {
  await getAccessToken(); // Triggers refresh if expired
});
```

### Gotcha: Alarm Minimum Interval {#gotcha-alarm-minimum-interval}

`chrome.alarms` enforces a minimum period of 1 minute for unpacked extensions and 1 minute for packed. You cannot use alarms for sub-minute refresh checks. If your tokens expire faster than that, refresh them on-demand before each API call instead.

---

## Pattern 7: Logout and Token Revocation {#pattern-7-logout-and-token-revocation}

A proper logout must revoke tokens server-side, clear local state, and update the UI:

```ts
// lib/logout.ts

import { clearTokens, getAccessToken } from "./token-store";

interface LogoutOptions {
  revokeRemote?: boolean;
  clearUserData?: boolean;
}

export async function logout(
  options: LogoutOptions = { revokeRemote: true, clearUserData: true }
): Promise<void> {
  // 1. Revoke token server-side (prevents use even if leaked)
  if (options.revokeRemote) {
    await revokeRemoteToken().catch((err) => {
      console.warn("[auth] Remote revocation failed:", err);
      // Continue logout even if revocation fails
    });
  }

  // 2. Clear Chrome's cached Google token (if using getAuthToken)
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    if (result.token) {
      await chrome.identity.removeCachedAuthToken({ token: result.token });
    }
  } catch {
    // Not using Google auth — skip
  }

  // 3. Clear stored tokens
  await clearTokens();

  // 4. Optionally clear user data
  if (options.clearUserData) {
    await chrome.storage.local.remove([
      "authState",
      "accountStore",
      "userPreferences",
    ]);
  }

  // 5. Clear any auth-related badge
  chrome.action.setBadgeText({ text: "" });

  // 6. Broadcast logout to all contexts
  chrome.runtime.sendMessage({ type: "LOGGED_OUT" }).catch(() => {});
}

async function revokeRemoteToken(): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  // Google revocation endpoint
  await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
```

### Why Revoke Remotely? {#why-revoke-remotely}

Clearing local tokens is not enough. If the token was exfiltrated (XSS, compromised dependency), it remains valid until it expires. Remote revocation invalidates it immediately. Always revoke on logout.

---

## Pattern 8: Auth-Gated UI {#pattern-8-auth-gated-ui}

The popup should render different views based on authentication state — a login screen for unauthenticated users, a dashboard for authenticated ones:

```ts
// popup/popup.ts

import type { AuthState } from "../lib/auth-state";

async function initPopup(): Promise<void> {
  const result = await chrome.storage.local.get("authState");
  const authState: AuthState = result.authState ?? { status: "signed-out" };
  renderForState(authState);

  // Listen for state changes while popup is open
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "AUTH_STATE_CHANGED") {
      renderForState(message.state);
    }
  });
}

function renderForState(state: AuthState): void {
  const app = document.getElementById("app")!;

  switch (state.status) {
    case "signed-out":
      app.innerHTML = `
        <div class="login-view">
          <h2>Welcome</h2>
          <p>Sign in to get started.</p>
          <button id="btn-google">Sign in with Google</button>
          <button id="btn-github">Sign in with GitHub</button>
        </div>
      `;
      document.getElementById("btn-google")!.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "SIGN_IN", provider: "google" });
      });
      document.getElementById("btn-github")!.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "SIGN_IN", provider: "github" });
      });
      break;

    case "signing-in":
      app.innerHTML = `
        <div class="loading-view">
          <div class="spinner"></div>
          <p>Signing in...</p>
        </div>
      `;
      break;

    case "signed-in":
      app.innerHTML = `
        <div class="dashboard-view">
          <div class="user-header">
            ${state.user.avatarUrl
              ? `<img src="${state.user.avatarUrl}" alt="" width="32" />`
              : ""}
            <span>${state.user.displayName}</span>
          </div>
          <div class="dashboard-content">
            <!-- Extension features go here -->
          </div>
          <button id="btn-logout">Sign out</button>
        </div>
      `;
      document.getElementById("btn-logout")!.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "SIGN_OUT" });
      });
      break;

    case "error":
      app.innerHTML = `
        <div class="error-view">
          <p class="error-text">${state.error}</p>
          <button id="btn-retry">Try again</button>
        </div>
      `;
      document.getElementById("btn-retry")!.addEventListener("click", () => {
        chrome.runtime.sendMessage({
          type: "SIGN_IN",
          provider: state.provider ?? "google",
        });
      });
      break;
  }
}

initPopup();
```

The background script handles the `SIGN_IN` and `SIGN_OUT` messages and dispatches events to the auth state machine. The popup is purely a renderer — it reads state and sends commands, nothing else.

---

## Summary {#summary}

| Pattern | Problem It Solves |
|---------|------------------|
| `getAuthToken` for Google | One-click Google sign-in with Chrome-managed tokens |
| `launchWebAuthFlow` for others | OAuth with GitHub, Twitter, or any provider |
| Token storage and refresh | Secure split storage with automatic renewal |
| Typed auth state machine | Eliminates impossible UI states during auth flows |
| Multi-account support | Managing multiple identities with account switching |
| Silent service worker refresh | Keeping tokens fresh despite SW termination |
| Logout and revocation | Proper cleanup that invalidates tokens server-side |
| Auth-gated UI | Popup renders login vs. dashboard based on state |

Authentication in extensions is harder than in web apps because the runtime is split across contexts and the service worker is ephemeral. Model your auth flow as an explicit state machine, split token storage between session and local, and always revoke tokens on logout. The `chrome.identity` API handles the OAuth dance, but token lifecycle and state management are your responsibility.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
