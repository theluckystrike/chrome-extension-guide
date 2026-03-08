---
layout: default
title: "Chrome Extension Extension Uninstall — Best Practices"
description: "Handle extension uninstallation and gather feedback."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-uninstall/"
---

# Extension Uninstall Patterns

## Overview {#overview}

When users uninstall your Chrome extension, you have an opportunity to collect valuable feedback and clean up resources. This guide covers patterns for handling extension uninstallation gracefully.

## Uninstall URL {#uninstall-url}

Set an uninstall URL that opens automatically when users uninstall your extension:

```js
chrome.runtime.setUninstallURL('https://example.com/uninstall-survey');
```

- Set this once during installation (typically in the `onInstalled` listener)
- The URL opens automatically in the user's browser when they uninstall
- Use this for feedback surveys to understand why users are leaving
- Include an anonymous user ID as a URL parameter for analytics tracking

```js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Generate anonymous ID for tracking
    const anonymousId = crypto.randomUUID();
    chrome.storage.local.set({ anonymousId });
    
    // Set uninstall URL with tracking
    chrome.runtime.setUninstallURL(
      `https://example.com/uninstall-survey?uid=${anonymousId}`
    );
  }
});
```

## Uninstall Survey Best Practices {#uninstall-survey-best-practices}

- **Keep it short**: 1-3 questions maximum
- **Use multiple choice**: "Why are you uninstalling?" with predefined options
- **Optional feedback**: Allow free text for additional details
- **Be courteous**: Thank the user for trying your extension

Example questions:
- "What was the main reason for uninstalling?"
- "How satisfied were you with the extension?"
- "Would you recommend this extension to others?"

## Cleanup on Uninstall {#cleanup-on-uninstall}

Chrome automatically clears the following on uninstall:
- `chrome.storage` (local, sync, and managed)
- `chrome.cookies` (for extension's domain)
- Extension's origin data

Manual cleanup required for:
- External server resources (user data, API keys)
- Third-party services (analytics, databases)
- IndexedDB and Cache API (if using SharedWorker or external origins)

```js
// Server-side cleanup example (triggered via uninstall URL)
app.get('/uninstall-survey', (req, res) => {
  const anonymousId = req.query.uid;
  // Call your API to delete user data
  await userService.deleteUserData(anonymousId);
  res.send('Thank you for your feedback!');
});
```

## Detecting Uninstall (Self) {#detecting-uninstall-self}

Extensions cannot directly detect their own uninstall from within the extension code. However:

- `chrome.runtime.onSuspend` fires before the extension is unloaded
- This event also fires when the extension is disabled, not just uninstalled

```js
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension is being unloaded');
  // Perform final cleanup tasks
  // Note: This runs on disable AND uninstall
});
```

## Detecting Other Extension Uninstall {#detecting-other-extension-uninstall}

Use the `chrome.management.onUninstalled` listener to detect when other extensions are uninstalled:

```js
// Requires "management" permission in manifest

chrome.management.onUninstalled.addListener((id) => {
  if (id === 'companion-extension-id') {
    console.log('Companion extension was uninstalled');
    // Notify user or disable related features
  }
});
```

Common use cases:
- Detect if a required companion extension was removed
- Check for conflicting extensions
- Monitor competitor extensions

## Self-Uninstall {#self-uninstall}

Extensions can uninstall themselves programmatically:

```js
chrome.management.uninstallSelf({ showConfirmDialog: true });
```

- Set `showConfirmDialog: false` to skip confirmation
- Use cases: license expired, critical error, user request

```js
// Self-uninstall after license expiration
function handleLicenseExpired() {
  alert('Your license has expired. The extension will now uninstall.');
  chrome.management.uninstallSelf({ showConfirmDialog: false });
}
```

## Code Examples {#code-examples}

### Complete Uninstall URL with Tracking {#complete-uninstall-url-with-tracking}

```js
// In background script
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const anonymousId = generateAnonymousId();
    await chrome.storage.local.set({ anonymousId });
    
    chrome.runtime.setUninstallURL(
      `https://yoursite.com/uninstall?ref=chrome&id=${anonymousId}`
    );
  }
});

function generateAnonymousId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
```

### Server-Side Cleanup {#server-side-cleanup}

```js
// Express.js example
app.get('/uninstall', async (req, res) => {
  const { id } = req.query;
  
  try {
    // Clean up user data
    await db.users.delete({ anonymousId: id });
    await analytics.trackEvent('extension_uninstall', { id });
    
    res.status(200).send('Cleanup complete');
  } catch (error) {
    res.status(500).send('Error processing uninstall');
  }
});
```

### Self-Uninstall with Confirmation {#self-uninstall-with-confirmation}

```js
document.getElementById('uninstall-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to uninstall this extension?')) {
    chrome.management.uninstallSelf({ showConfirmDialog: true });
  }
});
```

### Companion Extension Detection {#companion-extension-detection}

```js
// Check if companion extension exists on startup
async function checkCompanionExtension() {
  try {
    const ext = await chrome.management.get('companion-extension-id');
    if (!ext.enabled) {
      showCompanionWarning();
    }
  } catch (e) {
    showCompanionWarning();
  }
}

// Listen for companion uninstall
chrome.management.onUninstalled.addListener((id) => {
  if (id === 'companion-extension-id') {
    showCompanionWarning();
  }
});
```

## Cross-References {#cross-references}

- [Lifecycle Events](../reference/lifecycle-events.md) - Understanding extension lifecycle
- [Management Permission](../permissions/management.md) - Using management API
- [Extension Updates](../guides/extension-updates.md) - Handling updates and migrations
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
