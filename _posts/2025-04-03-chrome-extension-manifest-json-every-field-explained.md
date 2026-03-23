---
layout: post
title: "Chrome Extension manifest.json: Every Field Explained with Examples"
description: "Complete guide to Chrome Extension manifest.json v3. Learn every field, from manifest_version to permissions, with practical code examples for building powerful extensions."
date: 2025-04-03
categories: [Chrome-Extensions, Reference]
tags: [manifest, configuration, chrome-extension]
keywords: "chrome extension manifest.json, manifest json fields, chrome extension manifest guide, manifest v3 all fields, chrome extension configuration file"
canonical_url: "https://bestchromeextensions.com/2025/04/03/chrome-extension-manifest-json-every-field-explained/"
---

# Chrome Extension manifest.json: Every Field Explained with Examples

If you are building a Chrome extension, the manifest.json file is the backbone of your entire project. This configuration file tells Chrome everything it needs to know about your extension, from its name and version to the permissions it requires and the files it contains. Understanding every field in manifest.json is essential for creating extensions that work correctly, pass the Chrome Web Store review process, and provide a seamless user experience.

This comprehensive guide covers every field available in Chrome Extension Manifest V3, the current standard for extension development. Whether you are a beginner creating your first extension or an experienced developer looking for a complete reference, this article provides detailed explanations and practical examples for each configuration option.

---

## What is manifest.json? {#what-is-manifest-json}

The manifest.json file is a JSON-formatted configuration file that every Chrome extension must include. It serves as the blueprint for your extension, defining metadata, capabilities, and resource files. Chrome reads this file during installation to understand how the extension should behave and what permissions it needs to function.

Without a properly configured manifest.json, your extension cannot be loaded into Chrome or published to the Chrome Web Store. The manifest file has evolved through several versions, with Manifest V3 being the current standard introduced in 2022. This version brings significant changes from Manifest V2, including enhanced security, improved performance, and new capabilities for service workers.

---

## Required Fields in manifest.json {#required-fields}

Every valid Chrome extension manifest must include several essential fields. These fields identify your extension and provide the minimum information Chrome needs to install and run it.

### manifest_version

The manifest_version field tells Chrome which version of the manifest specification your extension uses. For all new extensions, you must use version 3. This field is required and must be the first entry in your manifest file.

```json
{
  "manifest_version": 3
}
```

Manifest V3 introduced several important changes from V2, including the replacement of background pages with service workers, modifications to host permissions, and new restrictions on remote code execution. If you are updating an older extension, you will need to migrate from manifest_version 2 to 3.

### name

The name field specifies your extension's display name. This is the name users will see in the Chrome extensions manager, on the Chrome Web Store listing, and in other places throughout Chrome. The name should be descriptive and professionally written, as it represents your extension to millions of potential users.

```json
{
  "name": "My Productivity Assistant"
}
```

Chrome imposes a 45-character limit on the extension name. Keep it concise yet descriptive. Avoid including version numbers or promotional phrases in the name, as these may violate Chrome Web Store policies.

### version

The version field indicates your extension's current version number. This string is used for update notifications and is displayed in the extensions manager. Chrome follows semantic versioning principles, though the format is more flexible.

```json
{
  "version": "1.0.0"
}
```

Version numbers consist of up to four dot-separated integers, each between 0 and 65535. Common formats include "1.0", "1.0.0", "1.0.0.1", or "2.5.3.1". Each time you publish an update to the Chrome Web Store, the version number must be higher than the previous version.

---

## Description and Metadata Fields {#description-metadata}

These fields provide additional information about your extension beyond the required name and version.

### description

The description field provides a brief explanation of what your extension does. This text appears in the Chrome Web Store listing and in the extensions manager when users view details about your extension.

```json
{
  "description": "Enhance your productivity with smart task management and time tracking features."
}
```

The description has a maximum of 132 characters for display purposes, though you can include more text that will be truncated. Write a clear, compelling description that accurately explains your extension's purpose and key features.

### version_name

The version_name field allows you to display a different version string to users than the one used for updates. This is useful for beta releases, development versions, or when you want a more user-friendly version display.

```json
{
  "version": "1.0.0",
  "version_name": "1.0.0 Beta"
}
```

If version_name is not specified, Chrome displays the value of the version field instead.

### short_name

The short_name field provides a shortened version of your extension's name for situations where the full name won't fit, such as in the Chrome toolbar or bookmarks bar.

```json
{
  "name": "My Productivity Assistant",
  "short_name": "Productivity"
}
```

The short_name is limited to 12 characters. If you don't specify a short_name, Chrome will truncate the name as needed.

---

## Extension Icons {#extension-icons}

Icons are essential for your extension's visual identity. Chrome uses icons in multiple sizes across different contexts, from the extensions manager to the Chrome Web Store.

### icons

The icons field defines the icon files your extension uses. You should provide icons in multiple sizes to ensure proper display across all contexts.

```json
{
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png",
    "256": "images/icon256.png"
  }
}
```

Required sizes include 128x128 (used in the Chrome Web Store), 48x48 (extensions manager), and 16x16 (toolbar). Providing a 256x256 icon is recommended for high-resolution displays. All icons must be PNG files with full transparency.

### default_icon

The default_icon field specifies the icon for your extension's action button in the Chrome toolbar. This icon appears when users install your extension and click on it.

```json
{
  "action": {
    "default_icon": {
      "16": "images/toolbar16.png",
      "24": "images/toolbar24.png",
      "32": "images/toolbar32.png"
    },
    "default_popup": "popup.html"
  }
}
```

You can specify different icon sizes for different toolbar densities. The icon should be simple and recognizable at small sizes, as it will appear as small as 16x16 pixels.

---

## Extension Actions {#extension-actions}

Actions define what happens when users interact with your extension in the Chrome toolbar.

### action

The action field defines the extension's toolbar button (also called the action). You can configure a popup that appears when clicked, or have the action trigger a background script.

```json
{
  "action": {
    "default_title": "Open My Extension",
    "default_icon": {
      "16": "images/action16.png"
    },
    "default_popup": "popup.html"
  }
}
```

The default_title appears as a tooltip when users hover over the extension icon. The default_popup specifies an HTML file to display in a small popup when the icon is clicked. For extensions without a popup, you would omit the default_popup property and instead use the action in your background or service worker script.

### omnibox

The omnibox field enables your extension to integrate with Chrome's address bar, allowing users to type a keyword to trigger extension functionality.

```json
{
  "omnibox": {
    "keyword": "myext"
  }
}
```

When users type "myext" in the address bar followed by a space, your extension can provide suggestions and handle the resulting user input. This provides a keyboard-centric way to access your extension's features.

---

## Permissions {#permissions}

Permissions are critical for controlling what your extension can access and do. Understanding permissions is essential for both security and passing Chrome Web Store review.

### permissions

The permissions array specifies the capabilities your extension needs to function. These include access to Chrome APIs, website data, and special features.

```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting"
  ]
}
```

Common permissions include "storage" for saving data locally, "tabs" for accessing tab information, "activeTab" for accessing the current tab when clicked, and "scripting" for injecting content scripts. Only request the permissions your extension actually needs, as excessive permissions will trigger review issues.

### host_permissions

Host permissions in Manifest V3 are separated from API permissions and specify which websites your extension can access.

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://another-site.com/"
  ]
}
```

Use specific patterns rather than broad wildcards when possible. The pattern "https://*.google.com/*" allows access to all Google domains, while "https://docs.google.com/" limits access to a specific site. Host permissions are required for content scripts that need to run on specific websites.

### optional_permissions

Optional permissions allow users to grant additional capabilities after installation, rather than requiring all permissions upfront.

```json
{
  "permissions": ["storage"],
  "optional_permissions": ["tabs", "bookmarks"]
}
```

Users can choose to grant optional permissions through your extension's settings or as needed when specific features are accessed. This improves user trust and reduces the initial permission warning during installation.

---

## Background Scripts and Service Workers {#background-scripts}

Background scripts run in the background and handle events, manage state, and coordinate between different parts of your extension.

### background

In Manifest V3, background scripts are implemented as service workers, which are event-driven and do not persist in memory between events.

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The service_worker property specifies the file that contains your background script. The "type": "module" option allows you to use ES modules in your service worker. Service workers in Manifest V3 cannot access the DOM directly and must communicate with content scripts through message passing.

---

## Content Scripts {#content-scripts}

Content scripts are JavaScript files that run in the context of web pages, allowing your extension to interact with page content.

### content_scripts

The content_scripts field specifies JavaScript and CSS files to inject into matching web pages automatically.

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

The matches array defines which pages the script applies to using URL patterns. The run_at property controls when the script injects: "document_start", "document_end", or "document_idle" (default). Content scripts can communicate with the extension's background script and access a limited subset of Chrome APIs.

---

## Browser Actions vs. Extension Actions {#browser-actions}

Note that in Manifest V3, the "browser_action" field has been unified with "action". The "action" field is now used for all extensions, regardless of whether they function as browser actions or page actions.

---

## Options Page and Settings {#options-page}

The options_page field defines a settings page where users can configure your extension's behavior.

```json
{
  "options_page": "options.html"
}
```

For more advanced options pages with dynamic content, you can also use the options_ui field:

```json
{
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

The open_in_tab option determines whether the options page opens in a new tab or within the extensions manager. A well-designed options page improves user experience by allowing customization of your extension's features.

---

## Web Accessible Resources {#web-accessible-resources}

The web_accessible_resources field specifies files within your extension that can be accessed by web pages or other extensions.

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*", "fonts/*"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

This is commonly used for content scripts that need to inject images or other resources into web pages. The matches array restricts which pages can access these resources, enhancing security.

---

## Declarative Net Request Rules {#declarative-net-request}

For extensions that need to modify network requests, Manifest V3 uses the declarativeNetRequest API instead of the webRequest API.

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

This powerful API allows extensions to block or modify network requests declaratively without requiring broad permissions. It is particularly useful for ad blockers and content filters.

---

## Chrome URL Access {#chrome-url-access}

### chrome_url_overrides

The chrome_url_overrides field allows your extension to replace Chrome's built-in pages with custom ones.

```json
{
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  }
}
```

You can override "newtab" (the new tab page), "bookmarks" (the bookmarks manager), and "history" (the history page). This is popular for creating custom new tab experiences with productivity dashboards, weather widgets, or personal dashboards.

---

## File Handlers and Protocols {#file-handlers}

### file_handlers

The file_handlers field enables your extension to handle specific file types.

```json
{
  "file_handlers": {
    "open-markdown": {
      "title": "Open Markdown File",
      "types": ["text/markdown"],
      "extensions": ["md", "markdown", "mdown"]
    }
  }
}
```

This allows users to open files with your extension from Chrome's file manager or by double-clicking files in their operating system. The extension must be installed to handle these file types.

---

## Commands and Keyboard Shortcuts {#commands}

The commands API allows users to configure keyboard shortcuts for your extension.

```json
{
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+1",
        "mac": "Command+Shift+1"
      },
      "description": "Toggle the main feature"
    }
  }
}
```

Users can view and customize these shortcuts in the extensions manager. The suggested_key provides sensible defaults for common platforms, with separate configurations for Windows/Linux and macOS.

---

## Tabs and Windows Management {#tabs-windows}

### tab_groups

For Chrome extensions that need to organize tabs, the tab_groups permission allows management of tab groups.

```json
{
  "permissions": ["tabGroups"]
}
```

This API enables creating, moving, and organizing tabs into color-coded groups, improving tab management for power users.

---

## Side Panels (Manifest V3) {#side-panels}

Manifest V3 introduced side panels, a new UI surface for extensions.

```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel"]
}
```

Side panels appear in the right side of the browser window and provide a persistent UI area for your extension. They are ideal for note-taking apps, dictionaries, translation tools, and other extensions that benefit from a persistent sidebar.

---

## Cross-Origin Isolation {#cross-origin-isolation}

### cross_origin_embedder_policy and cross_origin_opener_policy

These fields enable cross-origin isolation, which is required for certain advanced features like SharedArrayBuffer.

```json
{
  "cross_origin_embedder_policy": {
    "value": "require-corp"
  },
  "cross_origin_opener_policy": {
    "value": "same-origin"
  }
}
```

Most extensions do not need these settings. They are primarily used by extensions that need to support advanced web platform features or work with webAssembly threads.

---

## Export and Import {#export-import}

### export and import

These fields declare that your extension supports settings synchronization through Chrome's sync storage.

```json
{
  "export": {
    "allow": {
      "id": ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
    }
  },
  "import": {
    "id": ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
  }
}
```

This enables enterprise and educational environments to distribute pre-configured extension settings across multiple users or devices.

---

## Testing and Development {#testing-development}

### devtools_page

The devtools_page field adds a custom tab to Chrome's Developer Tools.

```json
{
  "devtools_page": "devtools.html"
}
```

This powerful feature allows you to extend Chrome's developer tools with custom panels, sidebars, and debugging utilities. Popular uses include API inspectors, DOM explorers, and performance profilers tailored to specific frameworks or services.

---

## Conclusion {#conclusion}

The manifest.json file is the foundation of every Chrome extension. Understanding each field and its purpose helps you build more powerful, secure, and user-friendly extensions. Manifest V3 represents a significant evolution in extension development, emphasizing security, performance, and user privacy.

When building your extension, always request only the permissions you need, provide appropriate icons in multiple sizes, and test thoroughly before publishing. The Chrome Web Store has strict review policies, and a well-configured manifest.json is your first step toward approval.

Keep this reference handy as you develop extensions, and refer to the official Chrome Extension documentation for the most up-to-date information on API changes and new features. With a solid understanding of manifest.json, you have the knowledge needed to create professional Chrome extensions that serve millions of users.
