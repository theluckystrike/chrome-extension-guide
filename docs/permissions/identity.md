# identity Permission — Chrome Extension Reference

## Overview
- **Permission string**: `"identity"`
- **What it grants**: Access to `chrome.identity` API for OAuth2 authentication
- **Risk level**: Medium — authenticates as the user with third-party services
- `@theluckystrike/webext-permissions` description: `describePermission('identity')`

## manifest.json Setup
```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
  }
}
```

## Key APIs

### chrome.identity.getAuthToken()
- `interactive: true` shows sign-in popup
- `interactive: false` fails silently if not signed in
- Token is auto-managed by Chrome (caching, refresh)
- Example with fetch to Google API

### chrome.identity.launchWebAuthFlow()
- For non-Google OAuth providers (GitHub, Twitter, Discord, etc.)
- `getRedirectURL()` returns `https://<extension-id>.chromiumapp.org/`
- Parse redirect URL for access token
- Full example with provider URL construction

### chrome.identity.removeCachedAuthToken()
- Call when token is expired or revoked
- Then call `getAuthToken()` again for fresh token

### chrome.identity.getProfileUserInfo()
- Returns signed-in Chrome user's email and ID
- Requires `identity.email` scope

## Common Patterns

### Google API Authentication
- Use `getAuthToken()` — simplest path for Google APIs

### Third-Party OAuth
- Use `launchWebAuthFlow()` with provider's OAuth URL
- Store tokens with `@theluckystrike/webext-storage`:
  ```typescript
  const storage = createStorage(defineSchema({ oauthToken: 'string' }), 'local');
  await storage.set('oauthToken', token);
  ```

### Token Refresh Pattern
- Check validity before API calls, if 401 → removeCachedAuthToken → getAuthToken

## Runtime Permission Check
```typescript
import { checkPermission, requestPermission } from '@theluckystrike/webext-permissions';
const result = await checkPermission('identity');
if (!result.granted) {
  const req = await requestPermission('identity');
  if (!req.granted) return;
}
```

## Security Considerations
- Store tokens in `chrome.storage.local` (not sync)
- Never expose tokens in content scripts
- Use minimal OAuth scopes
- Implement token revocation

## Common Errors
- `"OAuth2 not granted or revoked"` — user denied or revoked
- `"Interactive signin request must be triggered by explicit user action"`
- `"Invalid client_id"` — check Google Cloud Console
