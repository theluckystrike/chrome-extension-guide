---
layout: default
title: "Chrome Extension Permissions Cheatsheet. All Permissions at a Glance"
description: "Complete reference for Chrome Extension permissions. Quick lookup table for all available permissions, their use cases, and security considerations."
canonical_url: "https://bestchromeextensions.com/guides/permissions-cheatsheet/"
last_modified_at: 2026-01-15
---

Chrome Extension Permissions Cheatsheet

Complete reference for all Chrome Extension permissions. Use this cheatsheet to quickly look up permissions, understand their use cases, and determine which ones your extension needs.

---

Core Permissions {#core-permissions}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `storage` | `chrome.storage` | Store data locally or sync across devices | Low |
| `tabs` | `chrome.tabs` | Access tab URLs, titles, window info | Medium |
| `activeTab` | `chrome.activeTab` | Access active tab only after user click | Low |
| `scripting` | `chrome.scripting` | Inject JavaScript and CSS into pages | Medium |
| `runtime` | `chrome.runtime` | Messaging, lifecycle events, extension info | Low |
| `alarms` | `chrome.alarms` | Schedule recurring or delayed tasks | Low |
| `action` | `chrome.action` | Control toolbar button (badge, popup, icon) | Low |
| `contextMenus` | `chrome.contextMenus` | Add items to right-click context menu | Low |
| `notifications` | `chrome.notifications` | Display system notifications | Low |
| `sidePanel` | `chrome.sidePanel` | Open and manage side panel (Chrome 114+) | Low |

---

Network & Requests {#network-requests}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `declarativeNetRequest` | `chrome.declarativeNetRequest` | Block/redirect network requests declaratively | High |
| `declarativeNetRequestWithHostAccess` |. | Use DNR with host permissions | High |
| `webRequest` | `chrome.webRequest` | Observe network requests | High |
| `webRequestBlocking` |. | Block/modify requests (limited in MV3) | High |
| `webRequestAuthProvider` |. | Handle authentication challenges | High |
| `declarativeNetRequestFeedback` |. | Get feedback on DNR rules | High |

---

Data & Privacy APIs {#data-privacy}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `cookies` | `chrome.cookies` | Read/write cookies for any domain | High |
| `history` | `chrome.history` | Read/write browsing history | High |
| `bookmarks` | `chrome.bookmarks` | Create/modify bookmarks | Medium |
| `downloads` | `chrome.downloads` | Manage downloads | Medium |
| `readingList` | `chrome.readingList` | Access reading list (Chrome 120+) | Medium |
| `topSites` | `chrome.topSites` | Get most visited sites | Low |
| `browsingData` | `chrome.browsingData` | Clear browsing data | High |
| `privacy` | `chrome.privacy` | Control privacy settings | High |

---

Identity & Authentication {#identity-auth}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `identity` | `chrome.identity` | OAuth2 authentication flow | High |
| `identity.email` |. | Get user's email address | Medium |
| `management` | `chrome.management` | Manage other extensions/apps | Medium |

---

System & Hardware {#system-hardware}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `system.cpu` | `chrome.system.cpu` | CPU information | Low |
| `system.memory` | `chrome.system.memory` | Memory information | Low |
| `system.storage` | `chrome.system.storage` | Storage device info | Low |
| `system.display` | `chrome.system.display` | Display information | Low |
| `power` | `chrome.power` | Manage power settings | Low |
| `idle` | `chrome.idle` | Detect user idle state | Low |
| `clipboardRead` | `chrome.clipboard` | Read clipboard contents | High |
| `clipboardWrite` | `chrome.clipboard` | Write to clipboard | Medium |
| `fontSettings` | `chrome.fontSettings` | Manage font settings | Low |
| `gcm` | `chrome.gcm` | Google Cloud Messaging | Medium |

---

Content & Page Access {#content-page}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `activeTab` |. | Access current tab after click | Low |
| `scripting` | `chrome.scripting` | Inject scripts into pages | Medium |
| `contentSettings` | `chrome.contentSettings` | Control content settings (cookies, JS, etc.) | High |
| `pageCapture` | `chrome.pageCapture` | Save pages as MHTML | Medium |
| `tabCapture` | `chrome.tabCapture` | Capture tab media stream | Medium |
| `desktopCapture` | `chrome.desktopCapture` | Capture screen/window/tab | High |
| `debugger` | `chrome.debugger` | Attach debugger to tabs | High |

---

Search & Navigation {#search-navigation}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `search` | `chrome.search` | Perform searches | Low |
| `webNavigation` | `chrome.webNavigation` | Track navigation events | Medium |
| `sessions` | `chrome.sessions` | Query/restore sessions | Medium |
| `tabGroups` | `chrome.tabGroups` | Manage tab groups | Low |

---

Special APIs {#special-apis}

| Permission | API Namespace | Use Case | Sensitivity |
|------------|---------------|----------|-------------|
| `commands` | `chrome.commands` | Register keyboard shortcuts | Low |
| `i18n` | `chrome.i18n` | Internationalization support | Low |
| `offscreen` | `chrome.offscreen` | Create offscreen documents (MV3) | Low |
| `unlimitedStorage` |. | Bypass storage quota limits | Low |
| `nativeMessaging` | `chrome.runtime` | Communicate with native apps | High |
| `proxy` | `chrome.proxy` | Manage proxy settings | High |
| `vpnProvider` | `chrome.vpnProvider` | Create VPN configurations | High |
| `tts` | `chrome.tts` | Text-to-speech engine | Low |
| `ttsEngine` | `chrome.ttsEngine` | Implement TTS engine | Low |
| `webauthn` | `chrome.webauthn` | WebAuthn authentication | High |

---

Optional Permissions {#optional-permissions}

| Permission | Description | Trigger |
|------------|-------------|---------|
| `optional_host_permissions` | Request host access at runtime | User approval required |
| `optional_permissions` | Request API permissions at runtime | User approval required |

```json
{
  "optional_permissions": ["tabs", "storage"],
  "optional_host_permissions": ["https://*.example.com/*"]
}
```

---

Manifest V2 vs V3 Permissions {#mv2-mv3}

| Category | MV2 | MV3 | Notes |
|----------|-----|-----|-------|
| Background | `background` (pages) | `background` (service_worker) | No persistent background |
| Blocking WebReq | `webRequestBlocking` | Use `declarativeNetRequest` | Cannot block in MV3 |
| Remote Code | Allowed | Prohibited | All code must be bundled |
| Host Permissions | Optional separate field | Combined with permissions | Easier to request |

---

Permission Risks & Best Practices {#best-practices}

| Risk Level | Permissions | Recommendation |
|------------|-------------|-----------------|
| High | `cookies`, `history`, `debugger`, `webRequest` | Avoid if possible; use minimal access |
| Medium | `tabs`, `bookmarks`, `downloads`, `scripting` | Request only what's needed |
| Low | `storage`, `alarms`, `i18n`, `contextMenus` | Generally safe to use |

Security Tips

- Request permissions dynamically when needed, not at install
- Use `activeTab` instead of `tabs` when possible
- Prefer `declarativeNetRequest` over `webRequest` for content blocking
- Keep host permissions specific (`example.com`) rather than broad (`<all_urls>`)
- Review [Permission Warnings](https://developer.chrome.com/docs/extensions/mv3/permission_warnings/) in documentation

---

Quick Lookup Table {#quick-lookup}

| Need To... | Use Permission |
|------------|-----------------|
| Save user settings | `storage` |
| Read current page URL | `activeTab` or `tabs` |
| Inject content script | `scripting` |
| Show popup | `action` |
| Add keyboard shortcuts | `commands` |
| Schedule background tasks | `alarms` |
| Block ads/trackers | `declarativeNetRequest` |
| Handle OAuth login | `identity` |
| Manage bookmarks | `bookmarks` |
| Track navigation | `webNavigation` |
| Display notifications | `notifications` |
| Right-click menu | `contextMenus` |
| Side panel | `sidePanel` |

---

Related Resources {#related-resources}

- [Permissions detailed look](/permissions/permissions-deep detailed look/). Detailed permission explanations
- [Permission Strategy](/guides/extension-permissions-strategy/). Best practices for permission requests
- [Manifest V3 Migration](/guides/mv2-to-mv3-migration/). Migrating from MV2 to MV3
- [Security Best Practices](/guides/security-best-practices/). Extension security guidelines

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
