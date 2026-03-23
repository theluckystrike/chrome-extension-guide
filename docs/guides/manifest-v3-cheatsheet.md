---
layout: default
title: "Manifest V3 Cheatsheet. Quick Reference for Chrome Extension Developers"
description: "Quick reference guide for Chrome Extension Manifest V3. Covers all essential fields, configurations, and best practices in table format."
canonical_url: "https://bestchromeextensions.com/guides/manifest-v3-cheatsheet/"
---

# Manifest V3 Cheatsheet

Quick reference for Chrome Extension developers working with Manifest V3. This cheatsheet covers all essential manifest fields, permissions, and configurations.

---

Required Fields {#required-fields}

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `manifest_version` | integer | Must be `3` for MV3 | `"manifest_version": 3` |
| `name` | string | Extension display name (max 45 chars) | `"My Extension"` |
| `version` | string | Version string (max 4 dot-separated numbers) | `"1.0.0"` |
| `description` | string | Extension description (max 132 chars) | `"A brief description"` |

---

Extension Components {#extension-components}

| Component | Key | Required | Description |
|-----------|-----|----------|-------------|
| Service Worker | `background.service_worker` | Yes (for most) | Background script that handles events |
| Popup | `action.default_popup` | No | HTML popup when clicking extension icon |
| Options Page | `options_page` or `options_ui` | No | Settings page configuration |
| Content Scripts | `content_scripts[]` | No | Scripts injected into web pages |
| Side Panel | `side_panel` | No | Chrome 114+ side panel (requires `sidePanel` permission) |

---

Common Permissions {#common-permissions}

| Permission | Use Case | Required Field |
|------------|----------|----------------|
| `storage` | Store data locally or sync across devices | `"storage"` |
| `tabs` | Access tab URL, title, favicon | `"tabs"` |
| `activeTab` | Access active tab only when user clicks | `"activeTab"` |
| `scripting` | Inject scripts into pages | `"scripting"` |
| `alarms` | Schedule tasks | `"alarms"` |
| `notifications` | Show system notifications | `"notifications"` |
| `contextMenus` | Add right-click menu items | `"contextMenus"` |
| `sidePanel` | Use side panel API | `"sidePanel"` |
| `declarativeNetRequest` | Block/redirect network requests | `"declarativeNetRequest"` |
| `cookies` | Read/write cookies | `"cookies"` |
| `history` | Access browsing history | `"history"` |
| `bookmarks` | Manage bookmarks | `"bookmarks"` |
| `identity` | OAuth authentication | `"identity"` |
| `webRequest` | Observe network requests | `"webRequest"` |
| `debugger` | Attach debugger to tabs | `"debugger"` |

---

Host Permissions {#host-permissions}

| Pattern Type | Example | Matches |
|--------------|---------|---------|
| All URLs | `<all_urls>` | Every website |
| Specific domain | `https://example.com/*` | All paths on example.com |
| Subdomains | `https://*.google.com/*` | All Google subdomains |
| Single page | `https://example.com/page.html` | Exact URL only |
| Protocol | `file:///*` | Local files |

---

Action API (Toolbar Button) {#action-api}

| Property | Type | Description |
|----------|------|-------------|
| `default_popup` | string | Path to popup HTML |
| `default_icon` | object | Icon sizes `{ "16": "icon16.png" }` |
| `default_title` | string | Tooltip text |
| `default_badge` | string | Badge text (shows on icon) |

---

Content Scripts Configuration {#content-scripts}

| Property | Type | Description |
|----------|------|-------------|
| `matches` | array | URL patterns to inject into |
| `js` | array | JavaScript files to inject |
| `css` | array | CSS files to inject |
| `run_at` | string | `"document_start"`, `"document_end"`, `"document_idle"` |
| `match_about_blank` | boolean | Inject into about:blank frames |
| `frame_id` | number | Specific frame ID to target |

---

Web Accessible Resources {#web-accessible-resources}

| Property | Type | Description |
|----------|------|-------------|
| `resources` | array | Paths accessible from web pages |
| `matches` | array | Which pages can access resources |

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*.png", "styles/*.css"],
      "matches": ["https://example.com/*"]
    }
  ]
}
```

---

File Restrictions (Security) {#file-restrictions}

| Rule | Description |
|------|-------------|
| No remote code | Cannot load external JS from URLs |
| No inline scripts | `<script>` tags in HTML must be removed |
| Local files OK | Can load local resources in extension |
| CSP header | Content Security Policy is enforced |

---

Manifest V2 to V3 Key Differences {#mv2-vs-mv3}

| MV2 | MV3 | Notes |
|-----|-----|-------|
| `"background": { "scripts": [] }` | `"background": { "service_worker": "sw.js" }` | No more background pages |
| `chrome.extension.sendRequest()` | `chrome.runtime.sendMessage()` | Message passing API changed |
| `chrome.browserAction` | `chrome.action` | Toolbar button renamed |
| Remote code allowed | Remote code prohibited | All code must be bundled |
| `webRequest` blocking | `declarativeNetRequest` | Blocking requests now declarative |
| Background pages | Service Workers | Event-driven, no persistent state |

---

Chrome Version Support {#chrome-version-support}

| Feature | Minimum Chrome Version |
|---------|------------------------|
| Manifest V3 | Chrome 88+ (Jan 2021) |
| Service Workers | Chrome 88+ |
| Side Panel API | Chrome 114+ (June 2023) |
| Offscreen Documents | Chrome 109+ |
| Tab Groups API | Chrome 88+ |

---

Testing Tips {#testing-tips}

| Action | How To |
|--------|--------|
| Load unpacked | Developer mode > Load unpacked |
| Reload | Click refresh icon or `chrome.runtime.reload()` |
| View logs | Inspect service worker in chrome://extensions |
| Clear storage | Application tab > Clear storage |
| Debug popup | Right-click icon > Inspect Popup |
| Test permissions | Check extension details in chrome://extensions |

---

Quick Reference Snippets {#quick-reference}

Minimum Manifest V3

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "permissions": ["storage"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

With Content Scripts

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

---

Related Resources {#related-resources}

- [Manifest V3 Migration Guide](/guides/mv2-to-mv3-migration/). Full migration checklist
- [Permissions Reference](/permissions/). Detailed permission documentation
- [Service Worker Lifecycle](/guides/service-worker-lifecycle/). Background script events
