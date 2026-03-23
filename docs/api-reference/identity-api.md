---
layout: default
title: "Chrome Identity API Complete Reference"
description: "The Chrome Identity API provides OAuth2 and OpenID Connect authentication for extensions, enabling access to Google APIs and third-party services with built-in token management."
canonical_url: "https://bestchromeextensions.com/api-reference/identity-api/"
---

# chrome.identity API Reference

The `chrome.identity` API provides OAuth2 and OpenID Connect authentication capabilities for Chrome extensions and apps. It enables extensions to access Google APIs and third-party services that support OAuth authentication.

Overview {#overview}

The identity API simplifies OAuth2 implementation by handling token management, user consent flows, and token caching. It supports both Google OAuth (with built-in convenience methods) and generic OAuth via web authentication flows.

Permission Requirements {#permission-requirements}

Add the `identity` permission to your `manifest.json`:

```json
{
  "permissions": ["identity"]
}
```

For OAuth2 functionality, you also need to declare OAuth2 client configuration:

```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

> Note: The OAuth2 configuration must match exactly what's registered in the Google Cloud Console or your identity provider's dashboard.

Manifest Declaration {#manifest-declaration}

For Google APIs, the manifest should include both permissions and OAuth2 configuration:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "scopes": [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

For non-Google OAuth providers, you still need the identity permission but OAuth2 configuration may vary.

API Methods {#api-methods}

Google OAuth Methods {#google-oauth-methods}

#### getAuthToken

Retrieves an OAuth2 access token for Google APIs. This is the recommended method for authenticating with Google services.

```javascript
chrome.identity.getAuthToken(details, callback)
```

Parameters:

- `details` (object, optional):
  - `interactive` (boolean): If true, shows the consent UI to the user. If false (default), uses silent authentication when possible.
  - `account` (object): Account to get token for. Contains `id` property. If not specified, uses the currently signed-in account.
  - `scopes` (array of strings): List of scopes to request. If not specified, uses scopes from manifest.

Returns:

- `token` (string): The OAuth2 access token.
- `grantedScopes` (string): Space-separated list of granted scopes (Chrome 37+).

```javascript
// Silent token retrieval
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  // Use token to call Google APIs
  fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
});
```

#### removeCachedAuthToken

Removes an OAuth2 token from Chrome's token cache. Call this when a token is rejected (401 Unauthorized) to force retrieval of a fresh token.

```javascript
chrome.identity.removeCachedAuthToken(details, callback)
```

Parameters:

- `details` (object):
  - `token` (string): The token to remove from cache.

```javascript
// Handle token expiration
function handleUnauthorized() {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (token) {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        // Retry the request with a fresh token
        makeApiCall();
      });
    }
  });
}
```

#### clearAllCachedAuthTokens

Clears all OAuth2 tokens from Chrome's token cache. Use this for complete logout functionality.

```javascript
chrome.identity.clearAllCachedAuthTokens(callback)
```

```javascript
function logout() {
  chrome.identity.clearAllCachedAuthTokens(() => {
    console.log('All tokens cleared');
    // Update UI to logged-out state
  });
}
```

Non-Google OAuth (Generic) {#non-google-oauth-generic}

#### launchWebAuthFlow

Launches an authentication flow for any OAuth2/OIDC provider. This method opens a popup window where users authenticate with the provider.

```javascript
chrome.identity.launchWebAuthFlow(details, callback)
```

Parameters:

- `details` (object):
  - `url` (string): The authentication URL to open in the popup.
  - `interactive` (boolean, optional): If true, shows the full auth flow. If false, fails if immediate authentication isn't possible.

Returns:

- `responseUrl` (string): The redirect URL containing the token or authorization code. Parse this URL to extract the authentication result.

Example - GitHub OAuth:

```javascript
const clientId = 'your-github-client-id';
const redirectUri = chrome.identity.getRedirectURL();
const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;

chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
  if (chrome.runtime.lastError || !responseUrl) {
    console.error('Auth failed:', chrome.runtime.lastError);
    return;
  }
  
  // Extract code from URL
  const url = new URL(responseUrl);
  const code = url.searchParams.get('code');
  console.log('Authorization code:', code);
});
```

#### getRedirectURL

Returns the redirect URL for your extension. This URL follows the pattern `https://<extension-id>.chromiumapp.org/` and must be registered with your OAuth provider.

```javascript
chrome.identity.getRedirectURL(path)
```

Parameters:

- `path` (string, optional): Path to append to the redirect URL.

Returns:

- `redirectUrl` (string): The redirect URL for your extension.

```javascript
const redirectUrl = chrome.identity.getRedirectURL('oauth2callback');
// Returns: https://<extension-id>.chromiumapp.org/oauth2callback
```

Profile Information {#profile-information}

#### getProfileUserInfo

Retrieves information about the currently signed-in user. Returns signed-in Google account details.

```javascript
chrome.identity.getProfileUserInfo(callback)
```

Returns:

- `email` (string): The user's email address.
- `id` (string): The user's unique Google account ID.

```javascript
chrome.identity.getProfileUserInfo((userInfo) => {
  console.log('User email:', userInfo.email);
  console.log('User ID:', userInfo.id);
});
```

Events {#events}

onSignInChanged {#onsigninchanged}

Fired when a user's sign-in status changes.

```javascript
chrome.identity.onSignInChanged.addListener(callback)
```

Callback Parameters:

- `account` (object): Account object containing `id` and other properties.
- `signedIn` (boolean): True if the user is now signed in, false if signed out.

```javascript
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  if (signedIn) {
    console.log('User signed in:', account.id);
    updateUIForSignedInUser(account.id);
  } else {
    console.log('User signed out');
    updateUIForSignedOutUser();
  }
});
```

Common OAuth Providers Setup {#common-oauth-providers-setup}

Google {#google}

Use `getAuthToken` for the easiest integration with Google APIs:

```javascript
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  // Token ready for Google API calls
});
```

GitHub {#github}

Use `launchWebAuthFlow` with GitHub's OAuth endpoints:

```javascript
const GITHUB_CLIENT_ID = 'your-client-id';
const redirectUrl = chrome.identity.getRedirectURL('github-callback');

const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUrl}&scope=read:user`;

chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, handleResponse);
```

Microsoft Azure AD {#microsoft-azure-ad}

Use `launchWebAuthFlow` with Microsoft identity platform:

```javascript
const TENANT_ID = 'your-tenant-id';
const CLIENT_ID = 'your-client-id';
const redirectUrl = chrome.identity.getRedirectURL();

const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUrl}&response_type=code&scope=openid%20profile%20email`;

chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, handleResponse);
```

Error Handling {#error-handling}

Common Errors {#common-errors}

| Error | Cause | Solution |
|-------|-------|----------|
| `The user did not approve access` | User denied permission request | Handle gracefully, show helpful message |
| Token expiration (401) | Token has expired | Remove cached token and retry |
| `OAuth2 not configured` | Missing manifest OAuth2 config | Add oauth2 section to manifest |
| Invalid client_id | Client ID mismatch | Verify client ID in manifest matches GCP console |

Token Refresh Pattern {#token-refresh-pattern}

```javascript
function makeAuthenticatedRequest(url, options = {}) {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (chrome.runtime.lastError) {
      // Token retrieval failed
      console.error(chrome.runtime.lastError);
      return;
    }

    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    }).then(response => {
      if (response.status === 401) {
        // Token expired, remove and retry
        chrome.identity.removeCachedAuthToken({ token }, () => {
          makeAuthenticatedRequest(url, options); // Retry
        });
      } else {
        return response.json();
      }
    }).catch(console.error);
  });
}
```

Code Examples {#code-examples}

Get Google Auth Token and Call Google API {#get-google-auth-token-and-call-google-api}

```javascript
async function getUserProfile() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => response.json())
        .then(resolve)
        .catch(reject);
    });
  });
}

getUserProfile().then(user => {
  console.log('User profile:', user);
}).catch(err => {
  console.error('Failed to get profile:', err);
});
```

GitHub OAuth via launchWebAuthFlow {#github-oauth-via-launchwebauthflow}

```javascript
function authenticateWithGitHub() {
  const clientId = 'YOUR_GITHUB_CLIENT_ID';
  const redirectUrl = chrome.identity.getRedirectURL('github-callback');
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=read:user`;
  
  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Authentication failed:', chrome.runtime.lastError.message);
      return;
    }
    
    // Parse the authorization code from the response URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    
    if (code) {
      // Exchange code for access token (requires backend)
      console.log('Authorization code received:', code);
    }
  });
}
```

Cross-references {#cross-references}

- [Identity Permissions](../permissions/identity.md) - Permission configuration details
- [Identity OAuth Guide](../guides/identity-oauth.md) - Complete OAuth implementation walkthrough
- [OAuth Identity Patterns](../patterns/oauth-identity.md) - Reusable code patterns and best practices
Frequently Asked Questions

How do I authenticate users with OAuth?
Use chrome.identity.launchWebAuthFlow() to initiate an OAuth flow. Configure redirect URIs in your manifest.

Can I get user's email address?
Yes, after authentication, you can use chrome.identity.getProfileUserInfo() to get basic profile information.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
