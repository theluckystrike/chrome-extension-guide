# Integration Examples

Real-world examples showing how to use multiple `@theluckystrike/webext-*` packages together.

## Examples

### [Tab Manager with Storage](./tab-manager-with-storage/)
Save and restore tab groups using typed storage, messaging, and runtime permissions.
- **Packages:** webext-storage, webext-messaging, webext-permissions

### [Page Analyzer](./page-analyzer/)
Context menu-driven page analysis with content script data extraction and persistent history.
- **Packages:** webext-storage, webext-messaging

### [Clipboard Manager](./clipboard-manager/)
Clipboard history using offscreen documents for DOM API access in MV3 service workers.
- **Packages:** webext-storage, webext-messaging, chrome.offscreen API

## Running an example

These are TypeScript source files meant as reference implementations. To use in a real extension:

1. Set up a build tool (webpack, vite, or tsup)
2. Install the referenced packages: `npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging`
3. Build and load as an unpacked extension in `chrome://extensions`
