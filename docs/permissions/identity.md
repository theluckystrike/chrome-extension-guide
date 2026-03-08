---
title: "identity Permission — Chrome Extension Reference"
description: "- **Permission string**: `"identity"` - **What it grants**: Access to `chrome.identity` API for OAuth2 authentication - **Risk level**: Medium — authenticates as the user with third-party services"
permalink: /permissions/identity/
category: permissions
order: 22
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/identity/"
---

# identity Permission — Chrome Extension Reference

## Overview {#overview}
- **Permission string**: `"identity"`
- **What it grants**: Access to `chrome.identity` API for OAuth2 authentication
- **Risk level**: Medium — authenticates as the user with third-party services
- `@theluckystrike/webext-permissions` description: `describePermission('identity')`

## manifest.json Setup {#manifestjson-setup}
```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
  }
}
```

## Key APIs {#key-apis}

### chrome.identity.getAuthToken() {#chromeidentitygetauthtoken}
- `interactive: true` shows sign-in popup
- `interactive: false` fails silently if not signed in
- Token is auto-managed by Chrome (caching, refresh)
- Example with fetch to Google API

### chrome.identity.launchWebAuthFlow() {#chromeidentitylaunchwebauthflow}
- For non-Google OAuth providers (GitHub, Twitter, Discord, etc.)
- `getRedirectURL()` returns `https://<extension-id>.chromiumapp.org/`
- Parse redirect URL for access token
- Full example with provider URL construction

### chrome.identity.removeCachedAuthToken() {#chromeidentityremovecachedauthtoken}
- Call when token is expired or revoked
- Then call `getAuthToken()` again for fresh token

### chrome.identity.getProfileUserInfo() {#chromeidentitygetprofileuserinfo}
- Returns signed-in Chrome user's email and ID
- Requires `identity.email` scope

## Common Patterns {#common-patterns}

### Google API Authentication {#google-api-authentication}
- Use `getAuthToken()` — simplest path for Google APIs

### Third-Party OAuth {#third-party-oauth}
- Use `launchWebAuthFlow()` with provider's OAuth URL
- Store tokens with `@theluckystrike/webext-storage`:
  ```typescript
  const storage = createStorage(defineSchema({ oauthToken: 'string' }), 'local');
  await storage.set('oauthToken', token);
  ```

### Token Refresh Pattern {#token-refresh-pattern}
- Check validity before API calls, if 401 → removeCachedAuthToken → getAuthToken

## Runtime Permission Check {#runtime-permission-check}
```typescript
import { checkPermission, requestPermission } from '@theluckystrike/webext-permissions';
const result = await checkPermission('identity');
if (!result.granted) {
  const req = await requestPermission('identity');
  if (!req.granted) return;
}
```

## Security Considerations {#security-considerations}
- Store tokens in `chrome.storage.local` (not sync)
- Never expose tokens in content scripts
- Use minimal OAuth scopes
- Implement token revocation

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: popup requests auth token from background, background manages token lifecycle:

```ts
type Messages = {
  getAuthToken: {
    request: { interactive: boolean };
    response: { token: string | null; error?: string };
  };
  signOut: {
    request: void;
    response: { success: boolean };
  };
  getUserProfile: {
    request: void;
    response: { email: string; id: string } | null;
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  getAuthToken: async ({ interactive }) => {
    try {
      const token = await chrome.identity.getAuthToken({ interactive });
      return { token: token.token };
    } catch (err) {
      return { token: null, error: (err as Error).message };
    }
  },
  signOut: async () => {
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (token.token) {
      await chrome.identity.removeCachedAuthToken({ token: token.token });
      // Also revoke on the server
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token.token}`);
    }
    return { success: true };
  },
  getUserProfile: async () => {
    const userInfo = await chrome.identity.getProfileUserInfo({ accountStatus: "ANY" as any });
    if (!userInfo.email) return null;
    return { email: userInfo.email, id: userInfo.id };
  },
});
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store authentication state and user preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  isSignedIn: false,
  userEmail: "",
  lastAuthTime: 0,
  oauthProvider: "google" as "google" | "github" | "custom",
  refreshTokens: {} as Record<string, string>,
});
const storage = createStorage({ schema });

// Update auth state after sign-in
async function onSignIn(email: string) {
  await storage.setMany({
    isSignedIn: true,
    userEmail: email,
    lastAuthTime: Date.now(),
  });
}

// Watch for sign-out
storage.watch("isSignedIn", (signedIn) => {
  if (!signedIn) {
    console.log("User signed out — clearing cached data");
  }
});
```

## Practical Example: GitHub OAuth via launchWebAuthFlow {#practical-example-github-oauth-via-launchwebauthflow}

```ts
const GITHUB_CLIENT_ID = "your_github_client_id";

async function signInWithGitHub(): Promise<string | null> {
  const redirectUrl = chrome.identity.getRedirectURL("github");
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUrl);
  authUrl.searchParams.set("scope", "read:user user:email");

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    const url = new URL(responseUrl);
    const code = url.searchParams.get("code");
    if (!code) return null;

    // Exchange code for token via your backend
    const resp = await fetch("https://your-backend.com/auth/github/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const { access_token } = await resp.json();
    return access_token;
  } catch (err) {
    console.error("GitHub auth failed:", err);
    return null;
  }
}
```

## Practical Example: Token Refresh with Retry {#practical-example-token-refresh-with-retry}

```ts
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = (await chrome.identity.getAuthToken({ interactive: false })).token;

  let response = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 && token) {
    // Token expired — remove and get fresh one
    await chrome.identity.removeCachedAuthToken({ token });
    token = (await chrome.identity.getAuthToken({ interactive: false })).token;

    response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}
```

## Gotchas {#gotchas}
- **`getAuthToken` only works for Google accounts** — for any non-Google OAuth provider (GitHub, Discord, Twitter), you must use `launchWebAuthFlow()` instead.
- **`interactive: true` requires a user gesture** — calling `getAuthToken({ interactive: true })` from a background script without a preceding user action (button click, context menu) will fail with `"Interactive signin request must be triggered by explicit user action"`.
- **Token caching is automatic but opaque** — Chrome caches tokens internally. If a token is revoked server-side, Chrome still returns the cached (now invalid) token. Always call `removeCachedAuthToken()` before retrying.
- **`getRedirectURL()` is extension-specific** — the redirect URL includes your extension ID, so it changes between development and production if your extension ID changes. Pin your extension ID in the manifest for consistency.
- **OAuth2 scopes cannot be changed after install** — if you add new scopes to `manifest.json`, existing users must re-authorize. Plan your scopes carefully upfront.

## Common Errors {#common-errors}
- `"OAuth2 not granted or revoked"` — user denied or revoked
- `"Interactive signin request must be triggered by explicit user action"`
- `"Invalid client_id"` — check Google Cloud Console

## Related {#related}
- [Chrome identity API docs](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [storage](storage.md) — persist auth state and tokens
- [cookies](cookies.md) — alternative session management approach

## Frequently Asked Questions

### How do I implement OAuth in Chrome extensions?
Use the chrome.identity API to launch OAuth flows. You'll need to configure redirect URIs and handle the token exchange.

### Is chrome.identity free?
Yes, the chrome.identity API is free to use, but you'll need to set up OAuth with your identity provider (Google, Auth0, etc.).
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
