# Package Catalog

Complete catalog of all `@theluckystrike` packages for Chrome extension development.

Install any package with: `npm install @theluckystrike/<package-name>`

---

## Storage {#storage}

| Package | Description |
|
date: 2026-03-23
---------|-------------|
| [webext-storage](#webext-storage) | Typed Chrome storage wrapper with schema validation |
| [chrome-storage-typed](#chrome-storage-typed) | Type-safe wrapper with automatic serialization |
| [chrome-storage-plus](#chrome-storage-plus) | Storage with migrations, reactive subscriptions, and quota management |
| [webext-reactive-store](#webext-reactive-store) | Reactive state store for extensions |
| [webext-data-sync](#webext-data-sync) | IndexedDB data sync |
| [chrome-sync-engine](#chrome-sync-engine) | Two-way storage sync |

### webext-storage {#webext-storage}

Typed Chrome storage wrapper with schema validation.

```bash
npm install @theluckystrike/webext-storage
```

[GitHub](https://github.com/theluckystrike/webext-storage) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-storage)

- Define schemas with `defineSchema()` for full type inference
- `createStorage()` factory returns typed get/set/watch interface
- Supports `local` and `sync` storage areas

### chrome-storage-typed {#chrome-storage-typed}

Type-safe wrapper for Chrome storage API with automatic serialization.

```bash
npm install @theluckystrike/chrome-storage-typed
```

[GitHub](https://github.com/theluckystrike/chrome-storage-typed) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-storage-typed)

- Automatic JSON serialization/deserialization
- Watch for storage changes with typed callbacks
- Sync quota constants and `getBytesInUse()` helper

### chrome-storage-plus {#chrome-storage-plus}

Type-safe Chrome extension storage with schema validation, data migrations, and reactive subscriptions.

```bash
npm install @theluckystrike/chrome-storage-plus
```

[GitHub](https://github.com/theluckystrike/chrome-storage-plus) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-storage-plus)

- Schema validation with versioned data migrations
- Reactive subscriptions for real-time UI updates
- Built-in quota management and zero dependencies

### webext-reactive-store {#webext-reactive-store}

Reactive state store for Chrome extensions.

```bash
npm install @theluckystrike/webext-reactive-store
```

[GitHub](https://github.com/theluckystrike/webext-reactive-store) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-reactive-store)

- Subscribe to state changes with typed listeners
- Middleware support for logging and persistence
- Works across background, popup, and content scripts

### webext-data-sync {#webext-data-sync}

IndexedDB data sync for Chrome extensions.

```bash
npm install @theluckystrike/webext-data-sync
```

[GitHub](https://github.com/theluckystrike/webext-data-sync) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-data-sync)

- Sync IndexedDB data across extension contexts
- Conflict resolution strategies
- Offline-first with automatic reconnection

### chrome-sync-engine {#chrome-sync-engine}

Two-way storage sync engine.

```bash
npm install @theluckystrike/chrome-sync-engine
```

[GitHub](https://github.com/theluckystrike/chrome-sync-engine) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-sync-engine)

- Bidirectional sync between local and sync storage
- Automatic conflict detection and resolution
- Configurable sync intervals

---

Tabs & Windows {#tabs-windows}

| Package | Description |
|---------|-------------|
| [webext-tabs](#webext-tabs) | Common tab query patterns as typed helpers |
| [chrome-tabs-manager](#chrome-tabs-manager) | Type-safe wrapper for the Chrome tabs API |
| [webext-tabGroups](#webext-tabgroups) | Typed Chrome tabGroups helper |
| [chrome-tab-groups-api](#chrome-tab-groups-api) | Tab Groups API wrapper |
| [webext-windows](#webext-windows) | Typed Chrome windows helper |
| [chrome-workspace-manager](#chrome-workspace-manager) | Tab workspace management |
| [webext-sidePanel](#webext-sidepanel) | Promise-based wrapper for Chrome SidePanel API |

webext-tabs {#webext-tabs}

Common tab query patterns as typed helpers for Chrome extensions.

```bash
npm install @theluckystrike/webext-tabs
```

[GitHub](https://github.com/theluckystrike/webext-tabs) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-tabs)

- Pre-built queries: active tab, tabs by URL pattern, duplicates
- Typed tab event subscriptions
- Batch operations (close, move, highlight)

chrome-tabs-manager {#chrome-tabs-manager}

Type-safe wrapper for the Chrome tabs API with query helpers and event subscriptions.

```bash
npm install @theluckystrike/chrome-tabs-manager
```

[GitHub](https://github.com/theluckystrike/chrome-tabs-manager) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-tabs-manager)

- Fluent API for tab queries and updates
- Typed event subscriptions for tab lifecycle
- Multi-filter query support

webext-tabGroups {#webext-tabgroups}

Typed Chrome tabGroups helper for extension developers.

```bash
npm install @theluckystrike/webext-tabGroups
```

[GitHub](https://github.com/theluckystrike/webext-tabGroups) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-tabGroups)

- Create, update, and query tab groups
- Color and title management
- Group collapse/expand control

chrome-tab-groups-api {#chrome-tab-groups-api}

Tab Groups API wrapper.

```bash
npm install @theluckystrike/chrome-tab-groups-api
```

[GitHub](https://github.com/theluckystrike/chrome-tab-groups-api) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-tab-groups-api)

- High-level tab grouping operations
- Move tabs between groups
- Persist and restore group layouts

webext-windows {#webext-windows}

Typed Chrome windows helper for extension developers.

```bash
npm install @theluckystrike/webext-windows
```

[GitHub](https://github.com/theluckystrike/webext-windows) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-windows)

- Create, update, and query browser windows
- Window type filtering (normal, popup, panel)
- Focus and bounds management

chrome-workspace-manager {#chrome-workspace-manager}

Tab workspace management for Chrome extensions.

```bash
npm install @theluckystrike/chrome-workspace-manager
```

[GitHub](https://github.com/theluckystrike/chrome-workspace-manager) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-workspace-manager)

- Save and restore tab workspaces
- Named workspace profiles
- Cross-window workspace management

webext-sidePanel {#webext-sidepanel}

Promise-based wrapper for Chrome SidePanel API.

```bash
npm install @theluckystrike/webext-sidePanel
```

[GitHub](https://github.com/theluckystrike/webext-sidePanel) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-sidePanel)

- Open and close side panels programmatically
- Per-tab side panel configuration
- Promise-based API with TypeScript types

---

UI Components {#ui-components}

| Package | Description |
|---------|-------------|
| [webext-popup-router](#webext-popup-router) | Hash-based popup page router with transitions |
| [webext-command-palette](#webext-command-palette) | Command palette (Ctrl+K) |
| [webext-modal-dialog](#webext-modal-dialog) | Modal dialogs |
| [webext-error-boundary](#webext-error-boundary) | Error boundary UI |
| [webext-empty-state](#webext-empty-state) | Empty state components |
| [webext-skeleton-loader](#webext-skeleton-loader) | Skeleton loading placeholders |
| [webext-split-view](#webext-split-view) | Resizable panel layout |
| [webext-theme-engine](#webext-theme-engine) | Dynamic themes |
| [webext-form-autofill](#webext-form-autofill) | Form autofill |
| [webext-form-state](#webext-form-state) | Form state persistence |
| [webext-form-validator](#webext-form-validator) | Form validation |
| [chrome-onboarding-flow](#chrome-onboarding-flow) | Onboarding flow builder |

webext-popup-router {#webext-popup-router}

Hash-based popup page router with transitions.

```bash
npm install @theluckystrike/webext-popup-router
```

[GitHub](https://github.com/theluckystrike/webext-popup-router) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-popup-router)

- Declarative route definitions with hash-based navigation
- Page transition animations
- Route guards and middleware

webext-command-palette {#webext-command-palette}

Command palette (Ctrl+K) for Chrome extensions.

```bash
npm install @theluckystrike/webext-command-palette
```

[GitHub](https://github.com/theluckystrike/webext-command-palette) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-command-palette)

- Fuzzy search across registered commands
- Keyboard-first navigation
- Customizable appearance and key bindings

webext-modal-dialog {#webext-modal-dialog}

Modal dialogs for Chrome extensions.

```bash
npm install @theluckystrike/webext-modal-dialog
```

[GitHub](https://github.com/theluckystrike/webext-modal-dialog) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-modal-dialog)

- Confirm, alert, and prompt dialog types
- Promise-based API for user responses
- Focus trapping and keyboard accessibility

webext-error-boundary {#webext-error-boundary}

Error boundary UI for Chrome extensions.

```bash
npm install @theluckystrike/webext-error-boundary
```

[GitHub](https://github.com/theluckystrike/webext-error-boundary) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-error-boundary)

- Catch and display runtime errors gracefully
- Customizable fallback UI
- Error reporting callbacks

webext-empty-state {#webext-empty-state}

Empty state components for Chrome extensions.

```bash
npm install @theluckystrike/webext-empty-state
```

[GitHub](https://github.com/theluckystrike/webext-empty-state) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-empty-state)

- Pre-built empty state illustrations
- Action button integration
- Customizable message and description

webext-skeleton-loader {#webext-skeleton-loader}

Skeleton loading placeholders for Chrome extensions.

```bash
npm install @theluckystrike/webext-skeleton-loader
```

[GitHub](https://github.com/theluckystrike/webext-skeleton-loader) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-skeleton-loader)

- Animated skeleton loading states
- Multiple layout presets (list, card, table)
- Configurable shimmer animation

webext-split-view {#webext-split-view}

Resizable panel layout for Chrome extensions.

```bash
npm install @theluckystrike/webext-split-view
```

[GitHub](https://github.com/theluckystrike/webext-split-view) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-split-view)

- Horizontal and vertical split layouts
- Drag-to-resize with min/max constraints
- Persist panel sizes across sessions

webext-theme-engine {#webext-theme-engine}

Dynamic themes for Chrome extensions.

```bash
npm install @theluckystrike/webext-theme-engine
```

[GitHub](https://github.com/theluckystrike/webext-theme-engine) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-theme-engine)

- Light/dark mode with system preference detection
- CSS custom property theming
- Runtime theme switching

webext-form-autofill {#webext-form-autofill}

Form autofill for Chrome extensions.

```bash
npm install @theluckystrike/webext-form-autofill
```

[GitHub](https://github.com/theluckystrike/webext-form-autofill) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-form-autofill)

- Auto-populate forms from stored data
- Field matching heuristics
- Privacy-aware data handling

webext-form-state {#webext-form-state}

Form state persistence for Chrome extensions.

```bash
npm install @theluckystrike/webext-form-state
```

[GitHub](https://github.com/theluckystrike/webext-form-state) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-form-state)

- Persist form inputs across popup close/reopen
- Automatic save and restore
- Dirty state tracking

webext-form-validator {#webext-form-validator}

Form validation for Chrome extensions.

```bash
npm install @theluckystrike/webext-form-validator
```

[GitHub](https://github.com/theluckystrike/webext-form-validator) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-form-validator)

- Declarative validation rules
- Real-time field validation
- Custom error messages

chrome-onboarding-flow {#chrome-onboarding-flow}

Onboarding flow builder for Chrome extensions.

```bash
npm install @theluckystrike/chrome-onboarding-flow
```

[GitHub](https://github.com/theluckystrike/chrome-onboarding-flow) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-onboarding-flow)

- Step-by-step onboarding wizard
- Permission request integration
- Progress tracking and skip logic

---

Messaging & Communication {#messaging-communication}

| Package | Description |
|---------|-------------|
| [webext-messaging](#webext-messaging) | Promise-based typed message passing |
| [webext-event-bus](#webext-event-bus) | Pub/sub event bus |
| [webext-content-bridge](#webext-content-bridge) | Type-safe RPC bridge |
| [webext-runtime](#webext-runtime) | Typed Chrome runtime helper |
| [webext-gcm](#webext-gcm) | Google Cloud Messaging helper |

webext-messaging {#webext-messaging}

Promise-based typed message passing for Chrome extensions.

```bash
npm install @theluckystrike/webext-messaging
```

[GitHub](https://github.com/theluckystrike/webext-messaging) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-messaging)

- `createMessenger<M>()` factory with typed send/receive
- Background-to-content and content-to-background messaging
- Error wrapping with `MessagingError` class

webext-event-bus {#webext-event-bus}

Pub/sub event bus for Chrome extensions.

```bash
npm install @theluckystrike/webext-event-bus
```

[GitHub](https://github.com/theluckystrike/webext-event-bus) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-event-bus)

- Typed publish/subscribe pattern
- Wildcard event matching
- Cross-context event propagation

webext-content-bridge {#webext-content-bridge}

Type-safe RPC bridge for Chrome extensions.

```bash
npm install @theluckystrike/webext-content-bridge
```

[GitHub](https://github.com/theluckystrike/webext-content-bridge) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-content-bridge)

- RPC-style communication between contexts
- Automatic request/response matching
- Timeout and retry configuration

webext-runtime {#webext-runtime}

Typed Chrome runtime helper for extension developers.

```bash
npm install @theluckystrike/webext-runtime
```

[GitHub](https://github.com/theluckystrike/webext-runtime) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-runtime)

- Install and update event helpers
- Platform and extension info queries
- Message passing utilities

webext-gcm {#webext-gcm}

Typed Chrome GCM helper for extension developers.

```bash
npm install @theluckystrike/webext-gcm
```

[GitHub](https://github.com/theluckystrike/webext-gcm) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-gcm)

- Register for Google Cloud Messaging
- Typed message handlers
- Automatic re-registration on update

---

Security & Permissions {#security-permissions}

| Package | Description |
|---------|-------------|
| [webext-permissions](#webext-permissions) | Runtime permission checking and requesting |
| [chrome-permissions-guard](#chrome-permissions-guard) | Type-safe permission guards with event helpers |
| [webext-contentSettings](#webext-contentsettings) | Content settings API wrapper |
| [webext-privacy](#webext-privacy) | Privacy API wrapper |
| [webext-declarativeNetRequest](#webext-declarativenetrequest) | Declarative net request rules |
| [chrome-declarative-net](#chrome-declarative-net) | DeclarativeNetRequest rule builder |
| [chrome-request-filter](#chrome-request-filter) | Request filtering via DNR |

webext-permissions {#webext-permissions}

Runtime permission checking and requesting for Chrome extensions.

```bash
npm install @theluckystrike/webext-permissions
```

[GitHub](https://github.com/theluckystrike/webext-permissions) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-permissions)

- Check, request, and remove permissions at runtime
- Human-readable permission descriptions (50+ permissions)
- Batch permission operations

chrome-permissions-guard {#chrome-permissions-guard}

Type-safe wrapper for the Chrome permissions API with request, check, and event helpers.

```bash
npm install @theluckystrike/chrome-permissions-guard
```

[GitHub](https://github.com/theluckystrike/chrome-permissions-guard) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-permissions-guard)

- Permission guards that throw `PermissionDeniedError`
- Destroyed-state detection for safety
- Generic preservation across permission checks

webext-contentSettings {#webext-contentsettings}

Chrome extension contentSettings API wrapper for TypeScript.

```bash
npm install @theluckystrike/webext-contentSettings
```

[GitHub](https://github.com/theluckystrike/webext-contentSettings) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-contentSettings)

- Manage per-site content settings (JavaScript, cookies, images)
- Typed get/set/clear operations
- Pattern-based site matching

webext-privacy {#webext-privacy}

Chrome extension privacy API wrapper for TypeScript.

```bash
npm install @theluckystrike/webext-privacy
```

[GitHub](https://github.com/theluckystrike/webext-privacy) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-privacy)

- Control browser privacy settings
- Network, website, and services privacy configuration
- Typed setting values with get/set/clear

webext-declarativeNetRequest {#webext-declarativenetrequest}

Chrome extension declarativeNetRequest API wrapper for TypeScript.

```bash
npm install @theluckystrike/webext-declarativeNetRequest
```

[GitHub](https://github.com/theluckystrike/webext-declarativeNetRequest) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-declarativeNetRequest)

- Typed rule creation and management
- Dynamic and session rule support
- Rule matching and debugging helpers

chrome-declarative-net {#chrome-declarative-net}

DeclarativeNetRequest rule builder for MV3.

```bash
npm install @theluckystrike/chrome-declarative-net
```

[GitHub](https://github.com/theluckystrike/chrome-declarative-net) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-declarative-net)

- Fluent rule builder API
- Block, redirect, and modify header rules
- Rule priority and condition helpers

chrome-request-filter {#chrome-request-filter}

Request filtering via declarativeNetRequest.

```bash
npm install @theluckystrike/chrome-request-filter
```

[GitHub](https://github.com/theluckystrike/chrome-request-filter) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-request-filter)

- High-level request filtering API
- URL pattern and resource type matching
- Dynamic rule updates

---

Browser APIs {#browser-apis}

| Package | Description |
|---------|-------------|
| [webext-action](#webext-action) | Typed Chrome action helper |
| [webext-alarms](#webext-alarms) | Typed Chrome alarms helper |
| [chrome-alarms-cron](#chrome-alarms-cron) | Cron-like scheduler for MV3 |
| [webext-badge](#webext-badge) | Badge text and color management |
| [webext-bookmarks](#webext-bookmarks) | Typed bookmark helpers |
| [webext-clipboard](#webext-clipboard) | Typed clipboard helpers |
| [webext-context-menu](#webext-context-menu) | Context menu builder with nested menus |
| [webext-cookies](#webext-cookies) | Promise-based Cookie API wrapper |
| [webext-debugger](#webext-debugger) | Typed Chrome debugger helper |
| [webext-devtools](#webext-devtools) | Promise-based DevTools API wrapper |
| [webext-downloads](#webext-downloads) | Typed download helpers |
| [webext-history](#webext-history) | Typed history helpers |
| [webext-i18n](#webext-i18n) | Internationalization toolkit |
| [webext-identity](#webext-identity) | Typed Chrome identity helper |
| [webext-idle](#webext-idle) | Idle API wrapper |
| [webext-keyboard-shortcuts](#webext-keyboard-shortcuts) | Keyboard shortcuts |
| [webext-notifications](#webext-notifications) | Notification wrapper with click handlers |
| [webext-offscreen](#webext-offscreen) | Offscreen document creation and messaging |
| [webext-omnibox](#webext-omnibox) | Typed Chrome omnibox helper |
| [webext-pageCapture](#webext-pagecapture) | Typed Chrome pageCapture helper |
| [webext-power](#webext-power) | Power API wrapper |
| [webext-proxy](#webext-proxy) | Typed Chrome proxy helper |
| [webext-scripting](#webext-scripting) | Promise-based Scripting API wrapper |
| [webext-tts](#webext-tts) | Typed Chrome TTS helper |
| [webext-webRequest](#webext-webrequest) | Ergonomic webRequest API wrapper |

webext-action {#webext-action}

Typed Chrome action helper for extension developers.

```bash
npm install @theluckystrike/webext-action
```

[GitHub](https://github.com/theluckystrike/webext-action) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-action)

- Set icon, title, badge, and popup programmatically
- Per-tab action configuration
- Click event handling

webext-alarms {#webext-alarms}

Typed Chrome alarms helper for extension developers.

```bash
npm install @theluckystrike/webext-alarms
```

[GitHub](https://github.com/theluckystrike/webext-alarms) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-alarms)

- Create, query, and clear alarms
- Typed alarm event listeners
- Minimum interval enforcement

chrome-alarms-cron {#chrome-alarms-cron}

Cron-like scheduler for MV3 Chrome extensions using the chrome.alarms API.

```bash
npm install @theluckystrike/chrome-alarms-cron
```

[GitHub](https://github.com/theluckystrike/chrome-alarms-cron) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-alarms-cron)

- Schedule recurring tasks with cron-like syntax
- Minimum delay/period clamped to 1 minute
- Named schedules with get/cancel support

webext-badge {#webext-badge}

Typed badge text and color management for Chrome extensions.

```bash
npm install @theluckystrike/webext-badge
```

[GitHub](https://github.com/theluckystrike/webext-badge) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-badge)

- Set badge text and background color
- Per-tab badge configuration
- Clear and reset helpers

webext-bookmarks {#webext-bookmarks}

Typed bookmark helpers for Chrome extensions.

```bash
npm install @theluckystrike/webext-bookmarks
```

[GitHub](https://github.com/theluckystrike/webext-bookmarks) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-bookmarks)

- Create, update, move, and remove bookmarks
- Search and tree traversal
- Bookmark event subscriptions

webext-clipboard {#webext-clipboard}

Typed clipboard helpers for Chrome extensions.

```bash
npm install @theluckystrike/webext-clipboard
```

[GitHub](https://github.com/theluckystrike/webext-clipboard) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-clipboard)

- Read and write clipboard text
- Image clipboard support
- Clipboard change detection

webext-context-menu {#webext-context-menu}

Typed context menu builder with nested menus for Chrome extensions.

```bash
npm install @theluckystrike/webext-context-menu
```

[GitHub](https://github.com/theluckystrike/webext-context-menu) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-context-menu)

- Declarative menu definitions with nesting
- Typed click handlers with context info
- `registerMenus()` for batch creation

webext-cookies {#webext-cookies}

Promise-based wrapper for Chrome Cookies API.

```bash
npm install @theluckystrike/webext-cookies
```

[GitHub](https://github.com/theluckystrike/webext-cookies) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-cookies)

- Get, set, and remove cookies
- Cookie store enumeration
- Cookie change event listeners

webext-debugger {#webext-debugger}

Typed Chrome debugger helper for extension developers.

```bash
npm install @theluckystrike/webext-debugger
```

[GitHub](https://github.com/theluckystrike/webext-debugger) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-debugger)

- Attach/detach to Chrome Debugger protocol
- Send typed debugger commands
- Event stream handling

webext-devtools {#webext-devtools}

Promise-based wrapper for Chrome DevTools API.

```bash
npm install @theluckystrike/webext-devtools
```

[GitHub](https://github.com/theluckystrike/webext-devtools) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-devtools)

- Create DevTools panels and sidebars
- Inspect element integration
- Network and resource access

webext-downloads {#webext-downloads}

Typed download helpers for Chrome extensions.

```bash
npm install @theluckystrike/webext-downloads
```

[GitHub](https://github.com/theluckystrike/webext-downloads) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-downloads)

- Start, pause, resume, and cancel downloads
- Download progress tracking
- File open and show in folder

webext-history {#webext-history}

Typed history helpers for Chrome extensions.

```bash
npm install @theluckystrike/webext-history
```

[GitHub](https://github.com/theluckystrike/webext-history) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-history)

- Search and query browser history
- Add and delete history entries
- Visit detail retrieval

webext-i18n {#webext-i18n}

Internationalization toolkit for Chrome extensions.

```bash
npm install @theluckystrike/webext-i18n
```

[GitHub](https://github.com/theluckystrike/webext-i18n) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-i18n)

- Generate, validate, and manage locale files
- Message placeholders and substitutions
- Locale detection and fallback

webext-identity {#webext-identity}

Typed Chrome identity helper for extension developers.

```bash
npm install @theluckystrike/webext-identity
```

[GitHub](https://github.com/theluckystrike/webext-identity) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-identity)

- OAuth2 authentication flow
- Token management and caching
- Profile information retrieval

webext-idle {#webext-idle}

Chrome extension idle API wrapper for TypeScript.

```bash
npm install @theluckystrike/webext-idle
```

[GitHub](https://github.com/theluckystrike/webext-idle) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-idle)

- Query user idle state
- Set idle detection interval
- Idle state change listeners

webext-keyboard-shortcuts {#webext-keyboard-shortcuts}

Keyboard shortcuts for Chrome extensions.

```bash
npm install @theluckystrike/webext-keyboard-shortcuts
```

[GitHub](https://github.com/theluckystrike/webext-keyboard-shortcuts) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-keyboard-shortcuts)

- Register and manage keyboard shortcuts
- Shortcut conflict detection
- Cross-platform key normalization

webext-notifications {#webext-notifications}

Typed notification wrapper with click handlers for Chrome extensions.

```bash
npm install @theluckystrike/webext-notifications
```

[GitHub](https://github.com/theluckystrike/webext-notifications) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-notifications)

- Create basic, image, list, and progress notifications
- Typed click and button handlers
- Notification update and clear

webext-offscreen {#webext-offscreen}

Typed offscreen document creation and messaging for Chrome extensions.

```bash
npm install @theluckystrike/webext-offscreen
```

[GitHub](https://github.com/theluckystrike/webext-offscreen) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-offscreen)

- Create offscreen documents with typed reasons
- Message passing to/from offscreen context
- Automatic document lifecycle management

webext-omnibox {#webext-omnibox}

Typed Chrome omnibox helper for extension developers.

```bash
npm install @theluckystrike/webext-omnibox
```

[GitHub](https://github.com/theluckystrike/webext-omnibox) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-omnibox)

- Register omnibox keyword suggestions
- Typed input change and accept handlers
- Rich suggestion formatting

webext-pageCapture {#webext-pagecapture}

Typed Chrome pageCapture helper for extension developers.

```bash
npm install @theluckystrike/webext-pageCapture
```

[GitHub](https://github.com/theluckystrike/webext-pageCapture) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-pageCapture)

- Save tabs as MHTML files
- Promise-based capture API
- Tab targeting by ID

webext-power {#webext-power}

Chrome extension power API wrapper for TypeScript.

```bash
npm install @theluckystrike/webext-power
```

[GitHub](https://github.com/theluckystrike/webext-power) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-power)

- Request and release power keep-awake
- System and display level control
- Typed power management levels

webext-proxy {#webext-proxy}

Typed Chrome proxy helper for extension developers.

```bash
npm install @theluckystrike/webext-proxy
```

[GitHub](https://github.com/theluckystrike/webext-proxy) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-proxy)

- Configure proxy settings programmatically
- PAC script support
- Proxy error event handling

webext-scripting {#webext-scripting}

Promise-based wrapper for Chrome Scripting API.

```bash
npm install @theluckystrike/webext-scripting
```

[GitHub](https://github.com/theluckystrike/webext-scripting) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-scripting)

- Execute scripts and insert CSS in tabs
- Register content scripts dynamically
- World isolation (MAIN vs ISOLATED)

webext-tts {#webext-tts}

Typed Chrome TTS helper for extension developers.

```bash
npm install @theluckystrike/webext-tts
```

[GitHub](https://github.com/theluckystrike/webext-tts) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-tts)

- Text-to-speech with voice selection
- Speech event callbacks (start, end, error)
- Queue and interrupt management

webext-webRequest {#webext-webrequest}

Ergonomic wrapper for Chrome webRequest API.

```bash
npm install @theluckystrike/webext-webRequest
```

[GitHub](https://github.com/theluckystrike/webext-webRequest) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-webRequest)

- Monitor and intercept network requests
- Header modification helpers
- URL filter pattern matching

---

Utilities & Tools {#utilities-tools}

| Package | Description |
|---------|-------------|
| [chrome-extension-toolkit](#chrome-extension-toolkit) | Meta-package re-exporting core packages |
| [chrome-extension-testing](#chrome-extension-testing) | Testing utilities with Chrome API mocks |
| [webext-hot-reload](#webext-hot-reload) | Dev hot reload |
| [webext-url-parser](#webext-url-parser) | URL pattern matching |
| [chrome-extension-publisher](#chrome-extension-publisher) | CLI tool to publish to Chrome Web Store |
| [chrome-release-notes](#chrome-release-notes) | Release notes generator |
| [chrome-update-notifier](#chrome-update-notifier) | Extension update notifications |
| [chrome-scroll-tracker](#chrome-scroll-tracker) | Scroll depth tracking |
| [chrome-state-machine](#chrome-state-machine) | Finite state machine |
| [chrome-tab-profiler](#chrome-tab-profiler) | Page performance profiler |
| [chrome-download-manager](#chrome-download-manager) | Downloads API wrapper |
| [chrome-reading-list-api](#chrome-reading-list-api) | Reading List API |
| [chrome-tts-api](#chrome-tts-api) | Text-to-Speech API |

chrome-extension-toolkit {#chrome-extension-toolkit}

Modern, comprehensive ecosystem for building Chrome Extensions.

```bash
npm install @theluckystrike/chrome-extension-toolkit
```

[GitHub](https://github.com/theluckystrike/chrome-extension-toolkit) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-extension-toolkit)

- Re-exports core webext-* packages in one install
- 40+ exported functions and types
- ESM + CJS + TypeScript declarations

chrome-extension-testing {#chrome-extension-testing}

Testing utilities for Chrome extensions with realistic Chrome API mocks.

```bash
npm install @theluckystrike/chrome-extension-testing
```

[GitHub](https://github.com/theluckystrike/chrome-extension-testing) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-extension-testing)

- Realistic `chrome.*` API mocks for Jest/Vitest
- Pre-configured mock tabs, windows, and storage
- Reset helpers for test isolation

webext-hot-reload {#webext-hot-reload}

Dev hot reload for Chrome extensions.

```bash
npm install @theluckystrike/webext-hot-reload
```

[GitHub](https://github.com/theluckystrike/webext-hot-reload) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-hot-reload)

- Watch file changes and auto-reload extension
- Background script and content script reload
- Development-only with zero production impact

webext-url-parser {#webext-url-parser}

URL pattern matching for Chrome extensions.

```bash
npm install @theluckystrike/webext-url-parser
```

[GitHub](https://github.com/theluckystrike/webext-url-parser) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-url-parser)

- Parse and match Chrome extension URL patterns
- Wildcard and regex support
- URL component extraction

chrome-extension-publisher {#chrome-extension-publisher}

CLI tool to publish Chrome extensions to Web Store automatically.

```bash
npm install @theluckystrike/chrome-extension-publisher
```

[GitHub](https://github.com/theluckystrike/chrome-extension-publisher) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-extension-publisher)

- Automate Chrome Web Store uploads
- CI/CD integration support
- Version bump and zip packaging

chrome-release-notes {#chrome-release-notes}

Release notes generator for Chrome extensions.

```bash
npm install @theluckystrike/chrome-release-notes
```

[GitHub](https://github.com/theluckystrike/chrome-release-notes) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-release-notes)

- Generate release notes from git commits
- Conventional commit support
- Markdown and HTML output

chrome-update-notifier {#chrome-update-notifier}

Notify users about Chrome extension updates.

```bash
npm install @theluckystrike/chrome-update-notifier
```

[GitHub](https://github.com/theluckystrike/chrome-update-notifier) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-update-notifier)

- Detect extension version changes
- Show update notification with changelog
- First-install vs update differentiation

chrome-scroll-tracker {#chrome-scroll-tracker}

Scroll depth tracking for Chrome extensions.

```bash
npm install @theluckystrike/chrome-scroll-tracker
```

[GitHub](https://github.com/theluckystrike/chrome-scroll-tracker) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-scroll-tracker)

- Track scroll depth percentage
- Milestone callbacks (25%, 50%, 75%, 100%)
- Throttled event handling

chrome-state-machine {#chrome-state-machine}

Finite state machine for Chrome extensions.

```bash
npm install @theluckystrike/chrome-state-machine
```

[GitHub](https://github.com/theluckystrike/chrome-state-machine) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-state-machine)

- Define states and transitions declaratively
- Guard conditions and side effects
- State persistence across service worker restarts

chrome-tab-profiler {#chrome-tab-profiler}

Page performance profiler for Chrome extensions.

```bash
npm install @theluckystrike/chrome-tab-profiler
```

[GitHub](https://github.com/theluckystrike/chrome-tab-profiler) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-tab-profiler)

- Measure page load and rendering metrics
- Memory usage tracking
- Performance report generation

chrome-download-manager {#chrome-download-manager}

Downloads API wrapper for Chrome extensions.

```bash
npm install @theluckystrike/chrome-download-manager
```

[GitHub](https://github.com/theluckystrike/chrome-download-manager) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-download-manager)

- High-level download management
- Progress tracking with callbacks
- Batch download operations

chrome-reading-list-api {#chrome-reading-list-api}

Reading List API for Chrome extensions.

```bash
npm install @theluckystrike/chrome-reading-list-api
```

[GitHub](https://github.com/theluckystrike/chrome-reading-list-api) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-reading-list-api)

- Add and remove reading list entries
- Query reading list items
- Mark entries as read/unread

chrome-tts-api {#chrome-tts-api}

Text-to-Speech API for Chrome extensions.

```bash
npm install @theluckystrike/chrome-tts-api
```

[GitHub](https://github.com/theluckystrike/chrome-tts-api) | [npm](https://www.npmjs.com/package/@theluckystrike/chrome-tts-api)

- Speak text with configurable voice and rate
- Voice enumeration and selection
- Speech queue management

---

System APIs {#system-apis}

| Package | Description |
|---------|-------------|
| [webext-system-cpu](#webext-system-cpu) | System CPU info |
| [webext-system-memory](#webext-system-memory) | System memory info |
| [webext-system-storage](#webext-system-storage) | System storage info |
| [webext-system-display](#webext-system-display) | System display info |
| [webext-management](#webext-management) | Extension management |
| [webext-enterprise](#webext-enterprise) | Enterprise API |
| [webext-fileSystemProvider](#webext-filesystemprovider) | File System Provider API |
| [webext-printingMetrics](#webext-printingmetrics) | Printing Metrics API |
| [webext-vpnProvider](#webext-vpnprovider) | VPN Provider API |

webext-system-cpu {#webext-system-cpu}

Typed Chrome system.cpu API wrapper for extension developers.

```bash
npm install @theluckystrike/webext-system-cpu
```

[GitHub](https://github.com/theluckystrike/webext-system-cpu) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-system-cpu)

- Query CPU architecture and features
- Per-processor usage statistics
- Typed processor info interface

webext-system-memory {#webext-system-memory}

Typed Chrome system.memory API wrapper for extension developers.

```bash
npm install @theluckystrike/webext-system-memory
```

[GitHub](https://github.com/theluckystrike/webext-system-memory) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-system-memory)

- Query available and total memory
- Memory capacity reporting
- Typed memory info interface

webext-system-storage {#webext-system-storage}

Typed Chrome system.storage API wrapper for extension developers.

```bash
npm install @theluckystrike/webext-system-storage
```

[GitHub](https://github.com/theluckystrike/webext-system-storage) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-system-storage)

- Enumerate storage devices
- Available capacity queries
- Storage attach/detach events

webext-system-display {#webext-system-display}

Typed Chrome system.display API wrapper for extension developers.

```bash
npm install @theluckystrike/webext-system-display
```

[GitHub](https://github.com/theluckystrike/webext-system-display) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-system-display)

- Query display properties and layout
- Display change event listeners
- Multi-monitor support

webext-management {#webext-management}

Type-safe wrapper for Chrome's Management API.

```bash
npm install @theluckystrike/webext-management
```

[GitHub](https://github.com/theluckystrike/webext-management) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-management)

- List, enable, and disable extensions
- Extension info and permission queries
- Install/uninstall event listeners

webext-enterprise {#webext-enterprise}

Type-safe wrapper for Chrome's Enterprise API.

```bash
npm install @theluckystrike/webext-enterprise
```

[GitHub](https://github.com/theluckystrike/webext-enterprise) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-enterprise)

- Enterprise device and platform info
- Managed storage access
- Enterprise policy helpers

webext-fileSystemProvider {#webext-filesystemprovider}

Type-safe wrapper for Chrome's File System Provider API.

```bash
npm install @theluckystrike/webext-fileSystemProvider
```

[GitHub](https://github.com/theluckystrike/webext-fileSystemProvider) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-fileSystemProvider)

- Mount virtual file systems
- File operation handlers (read, write, stat)
- Directory listing and metadata

webext-printingMetrics {#webext-printingmetrics}

Type-safe wrapper for Chrome's Printing Metrics API.

```bash
npm install @theluckystrike/webext-printingMetrics
```

[GitHub](https://github.com/theluckystrike/webext-printingMetrics) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-printingMetrics)

- Track print job metrics
- Printer and job status queries
- Print completion event listeners

webext-vpnProvider {#webext-vpnprovider}

Type-safe wrapper for Chrome's VPN Provider API.

```bash
npm install @theluckystrike/webext-vpnProvider
```

[GitHub](https://github.com/theluckystrike/webext-vpnProvider) | [npm](https://www.npmjs.com/package/@theluckystrike/webext-vpnProvider)

- Create and manage VPN configurations
- Tunnel connection management
- Platform message handling

---

Built by [theluckystrike](https://github.com/theluckystrike). [zovo.one](https://zovo.one)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
