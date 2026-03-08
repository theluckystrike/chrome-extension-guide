---
layout: default
title: "Chrome Extension Code Review Checklist — Developer Guide"
description: "Learn Chrome extension code review checklist with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-code-review-checklist/"
---
# Chrome Extension Code Review Checklist

Use this checklist when reviewing pull requests for Chrome extension projects to ensure code quality, security, and best practices.

## Manifest Review {#manifest-review}

- [ ] **Minimum Permissions**: Only requested permissions are declared; no overly broad permissions (e.g., `<all_urls>` unless necessary)
- [ ] **API Permissions**: All chrome API permissions properly declared in manifest (storage, tabs, runtime, etc.)
- [ ] **Host Permissions**: Host permissions scoped to minimum required domains; wildcards used only when essential
- [ ] **Manifest Version**: Uses Manifest V3 (MV3) for new extensions; MV2 only for legacy support with documented reason
- [ ] **Background Service Worker**: Properly configured for MV3 with appropriate permissions

## Security {#security}

- [ ] **No innerHTML with Untrusted Data**: Uses textContent, innerText, or safe DOM APIs instead of innerHTML with user data
- [ ] **No eval()**: No use of eval(), new Function(), or similar dynamic code execution
- [ ] **Message Origin Validation**: All messages validated with proper origin/source checks in message listeners
- [ ] **CSP Compliant**: Content Security Policy properly configured in manifest; no inline scripts (or nonce-based)
- [ ] **Context Isolation**: content_scripts run with contextIsolation: true and sandbox enabled
- [ ] **No Remote Code**: No loading of remote scripts or external resources unless necessary and validated

## Service Worker (Background) {#service-worker-background}

- [ ] **Top-Level Event Listeners**: Event listeners registered at top level, not inside callbacks or functions
- [ ] **State Persistence**: Extension state properly persisted to chrome.storage instead of in-memory
- [ ] **Restart Handling**: Service worker restart gracefully handled with state restoration
- [ ] **No Long-Running Operations**: No blocking operations; uses async/await for all chrome API calls
- [ ] **Remove Listeners**: Properly removes listeners when no longer needed

## Content Scripts {#content-scripts}

- [ ] **Cleanup on Unload**: Properly removes listeners, observers, and DOM modifications on script unload
- [ ] **Style Isolation**: Uses shadow DOM or unique class prefixes to avoid style conflicts with host page
- [ ] **Minimal DOM Footprint**: Limited DOM manipulation; uses efficient selectors and avoids excessive queries
- [ ] **Frame Consideration**: Properly handles main frame vs. subframes based on requirements

## Storage {#storage}

- [ ] **lastError Check**: chrome.runtime.lastError checked after async storage operations
- [ ] **Quota Handling**: Properly handles storage quota limits with appropriate error handling
- [ ] **Data Validation**: Data validated on read; handles missing/corrupted data gracefully
- [ ] **Encryption**: Sensitive data encrypted using chrome.storage.session or proper encryption

## Messaging {#messaging}

- [ ] **Async Response Handling**: Returns true from onMessage listener when using sendResponse asynchronously
- [ ] **Error Handling**: Proper error handling with try/catch and meaningful error messages
- [ ] **Message Validation**: All message payloads validated before processing
- [ ] **Connection Cleanup**: Ports and connections properly closed when no longer needed

## Performance {#performance}

- [ ] **No Unnecessary Content Scripts**: Content scripts only injected where needed; uses matches patterns wisely
- [ ] **Debounced Storage Writes**: Storage writes debounced to avoid excessive I/O
- [ ] **Efficient Selectors**: Uses efficient DOM queries and caches references when appropriate
- [ ] **Lazy Loading**: Heavy operations deferred until needed

## Privacy {#privacy}

- [ ] **No PII Collection**: Extension does not collect personally identifiable information without consent
- [ ] **Incognito Awareness**: Properly handles incognito mode; respects platform_privacy settings
- [ ] **Minimal Data Retention**: Data retention policy defined; old data properly cleaned up
- [ ] **User Disclosure**: Privacy practices clearly disclosed in extension description

## Testing {#testing}

- [ ] **Unit Tests**: Business logic covered by unit tests with reasonable coverage
- [ ] **Integration Tests**: Chrome API interactions tested with proper mocking or integration tests
- [ ] **Error Handling Tests**: Edge cases and error paths tested

## Bundle & Build {#bundle-build}

- [ ] **No Unused Dependencies**: No unused npm packages in bundle
- [ ] **Tree-Shaking**: Build properly configured for tree-shaking (ES modules, proper bundler config)
- [ ] **Source Maps**: Source maps excluded from production builds
- [ ] **Minification**: Production builds properly minified

## Accessibility {#accessibility}

- [ ] **Keyboard Navigation**: Popup and options page fully keyboard navigable
- [ ] **ARIA Labels**: Proper ARIA labels on interactive elements
- [ ] **Focus Management**: Logical focus order and visible focus indicators
- [ ] **Color Contrast**: Sufficient color contrast for accessibility

## Documentation Cross-References {#documentation-cross-references}

- See [Security Best Practices](../guides/security-best-practices.md) for security guidelines
- See [Chrome Extension Security Checklist](../guides/chrome-extension-security-checklist.md) for security verification
- See [Linting & Code Quality](../guides/linting-code-quality.md) for code quality standards

## Related Articles {#related-articles}

## Related Articles

- [Review Preparation](../guides/extension-review-preparation.md)
- [Linting & Code Quality](../guides/linting-code-quality.md)
