---
layout: default
title: "Chrome Extension Development Glossary — Key Terms Explained"
description: "A comprehensive glossary of Chrome extension development terms. Learn about manifest, content scripts, service workers, and more."
canonical_url: "https://bestchromeextensions.com/docs/glossary/"
date: 2026-03-23
---

# Chrome Extension Development Glossary — Key Terms Explained

This glossary provides definitions for the most important Chrome extension development terms. Each term includes a brief explanation and links to related articles for deeper learning.

---

## A

### Action API
The Action API (formerly Browser Action) controls the extension's icon in the Chrome toolbar. It allows you to set the icon, badge text, title, and popup. Learn more in our [Action API guide](/docs/guides/action-api/).

### Alarms API
The Alarms API enables scheduling code to run at specific times or intervals. It's essential for implementing recurring tasks in extensions. See the [Alarms API documentation](/docs/guides/alarms-scheduling/).

### Architecture Patterns
Proven approaches for structuring Chrome extension code, including the MVVM pattern, message passing architecture, and state management. Explore [architecture patterns](/docs/guides/architecture-patterns/).

---

## B

### Background Script
A script that runs in the background of the browser, handling events and managing extension state. In Manifest V3, background scripts are replaced by service workers. See [Background Service Worker Patterns](/docs/guides/background-patterns/).

### Badge
A small text overlay on the extension icon that displays status information like notification counts. Managed via the [Badge API](/docs/api-reference/).

### Bookmarks API
An API for creating, organizing, and managing browser bookmarks. Useful for building bookmark manager extensions. See the [Bookmarks API guide](/docs/guides/bookmark-api/).

---

## C

### Chrome DevTools
Developer tools built into Chrome for debugging extensions, inspecting elements, monitoring network requests, and profiling performance. Learn about [advanced debugging](/docs/guides/advanced-debugging/).

### Chrome Storage API
A storage solution specifically designed for extensions, offering sync storage for user preferences and local storage for cached data. See [Storage Patterns](/docs/reference/storage-patterns/).

### Commands API
Allows extensions to define keyboard shortcuts that trigger actions. Essential for productivity extensions. Learn more in the [Commands API guide](/docs/guides/commands-api/).

### Content Script
JavaScript files that run in the context of web pages, allowing extensions to interact with page DOM. See [Content Script Patterns](/docs/guides/content-script-patterns/).

### Context Menu
Right-click menu items that extensions can add to Chrome's context menu. Learn how to implement in our [Context Menus guide](/docs/guides/context-menus/).

### Cookies API
API for reading and modifying browser cookies, useful for session management and authentication features. See the [Cookies API documentation](/docs/guides/cookies-api/).

### Cross-Origin Requests
HTTP requests made to domains different from the extension's origin. Extensions have relaxed CORS policies but should follow security best practices.

### CSP (Content Security Policy)
A browser security mechanism that restricts how resources can be loaded. Extensions must configure CSP in their manifest. See the [CSP Reference](/docs/reference/csp-reference/).

---

## D

### Declarative Content
An API that allows extensions to take actions based on page content without requiring host permissions for every URL. See the [Declarative Content guide](/docs/guides/declarative-content/).

### Declarative Net Request
An API for blocking or modifying network requests using declarative rules. Required for ad blockers and content filters in Manifest V3. Learn more in our [DNR guide](/docs/guides/declarative-net-request/).

### DevTools API
Allows extensions to extend Chrome DevTools with custom panels, tabs, and profiling tools. See the [DevTools API documentation](/docs/guides/devtools-api/).

---

## E

### Enterprise Deployment
Methods for distributing extensions to organizations through group policies and enterprise management. See the [Enterprise Deployment guide](/docs/guides/enterprise-deployment/).

### Extension Lifecycle
The sequence of events from installation through updates to uninstallation, including activation, deactivation, and version management.

---

## H

### History API
An API for interacting with browser history, allowing extensions to read and manage browsing history. See the [History API documentation](/docs/guides/history-api/).

### Host Permission
Permissions that grant access to specific website domains or all URLs. Required for content scripts and declarative rules. Learn about [Permissions](/docs/guides/permissions/).

---

## I

### Identity API
Provides OAuth authentication for accessing user Google accounts and services. Essential for extensions that integrate with Google APIs. See the [Identity OAuth guide](/docs/guides/identity-oauth/).

### Idle Detection API
Detects when a user is idle or away from their device, useful for automation and notification timing. See the [Idle Detection guide](/docs/guides/idle-detection/).

### i18n (Internationalization)
The process of making extensions support multiple languages. Chrome provides built-in i18n support. Learn in our [i18n guide](/docs/guides/i18n/).

---

## M

### Manifest File (manifest.json)
The central configuration file for Chrome extensions that declares permissions, components, and capabilities. See the [Manifest Fields reference](/docs/reference/manifest-fields/).

### Manifest V2
The older extension manifest format being phased out in favor of Manifest V3. See the [MV3 Migration guide](/docs/guides/mv3-migration/).

### Manifest V3
The latest Chrome extension manifest format with improved security, privacy, and performance. Key changes include service workers replacing background pages. See our [MV3 guide](/docs/mv3/).

### Message Passing
The mechanism for communication between different extension components (background, popup, content scripts). See [Message Passing Patterns](/docs/reference/message-passing-patterns/).

### MV2
See Manifest V2.

### MV3
See Manifest V3.

---

## N

### Native Messaging
Allows extensions to communicate with native applications installed on the user's computer. Useful for system integration. See the [Native Messaging guide](/docs/guides/native-messaging/).

### Notifications API
Enables extensions to display system notifications to users. See the [Notifications guide](/docs/guides/notifications/).

---

## O

### Offscreen Document
A hidden HTML document that content scripts can use for tasks requiring a DOM, like audio processing or WebRTC. See the [Offscreen API guide](/docs/guides/offscreen-api/).

### Omnibox API
Allows extensions to add custom suggestions to Chrome's address bar (omnibox). See the [Omnibox API documentation](/docs/guides/omnibox-api/).

### Options Page
A dedicated page for configuring extension settings, accessible from the extension's context menu. Learn about [Options Page Design](/docs/guides/options-page-design/).

---

## P

### Permissions
Access rights that extensions request to use specific APIs or website data. Must be declared in the manifest. See the [Permissions guide](/docs/guides/permissions/).

### Popup
A small HTML window that appears when clicking the extension icon in the toolbar. See [Extension Popup Design](/docs/guides/extension-popup-design/).

### Proxy API
Allows extensions to handle proxy settings, routing browser traffic through specified servers. See the [Proxy API documentation](/docs/guides/proxy-api/).

### Push Notifications
Server-driven notifications sent to extensions in real-time. Requires the Chrome Push Messaging system. See [Push Notifications guide](/docs/guides/push-notifications/).

---

## S

### Scripting API
An API for programmatically injecting content scripts and managing CSS in web pages. See the [Scripting API documentation](/docs/guides/scripting-api/).

### Service Worker
In Manifest V3, a background script that handles extension events. It's ephemeral and stateless, requiring different patterns than background pages. See [Service Workers guide](/docs/guides/service-workers/).

### Side Panel
A panel that appears on the right side of Chrome, providing a persistent UI alongside web content. See the [Side Panel API guide](/docs/guides/side-panel-api/).

### Storage API
See Chrome Storage API.

### Sync Storage
A type of storage that automatically syncs across all devices where the user is signed in. Part of the Storage API. See [Storage Patterns](/docs/reference/storage-patterns/).

---

## T

### Tab Groups API
Allows organizing browser tabs into groups with custom colors and titles. See the [Tab Groups guide](/docs/guides/tab-groups/).

### Tabs API
An API for creating, modifying, and interacting with browser tabs. See the [Tabs API documentation](/docs/guides/tabs-api/).

### Testing Extensions
Methods for testing Chrome extensions, including unit tests, integration tests, and automated testing. See the [Testing guide](/docs/guides/testing-extensions/).

### TTS API (Text-to-Speech)
Enables extensions to use Chrome's text-to-speech capabilities. See the [TTS API documentation](/docs/guides/tts-api/).

---

## W

### Web Accessible Resources
Files within an extension that can be accessed by web pages or content scripts. Must be explicitly declared in the manifest. See the [Web Accessible Resources guide](/docs/guides/web-accessible-resources/).

### Web Navigation API
API for monitoring and intercepting navigation events in the browser. See the [Web Navigation documentation](/docs/guides/web-navigation/).

### Web Request API
API for observing and analyzing network traffic. In MV3, largely replaced by Declarative Net Request. See the [Web Request guide](/docs/guides/web-request/).

### WebSocket
A persistent connection protocol for real-time communication between extensions and servers.

### Windows API
API for creating and managing browser windows. See the [Window Management guide](/docs/guides/window-management/).

### Worker
See Service Worker.

---

## Additional Resources

- [API Reference](/docs/api-reference/)
- [Getting Started Guide](/docs/getting-started/)
- [Extension Patterns](/docs/patterns/)
- [Package Catalog](/docs/package-catalog/)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at [zovo.one](https://zovo.one).*
