---
layout: guide
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers background page to service worker migration, webRequest to declarativeNetRequest, remote code elimination, and more."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in the extension platform's history. With Chrome having fully deprecated MV2 and the Chrome Web Store no longer accepting extensions using the older manifest version, developers must migrate their existing extensions to stay on the platform. This comprehensive guide walks you through every aspect of the migration process, from understanding the fundamental architectural differences to implementing advanced patterns that work seamlessly with the new service worker-based model.

The migration involves far more than simply updating a version number in your manifest.json file. Many APIs have fundamentally changed how they operate, some have been replaced entirely, and others have been removed altogether. Understanding these changes and their implications will help you migrate your extension efficiently while avoiding common pitfalls that catch many developers during the transition.

## Understanding MV2 vs MV3 Architecture Differences

The architectural shift from Manifest V2 to Manifest V3 centers on a fundamental change in how the background component of your extension operates. In MV2, extensions could use either a persistent background page that remained loaded at all times or an event page that loaded when needed. Both versions had access to the full DOM and could run continuously. MV3 eliminates this model entirely in favor of service workers, which are ephemeral, event-driven processes that Chrome activates when needed and terminates after periods of inactivity.

This change has profound implications for extension development. Service workers cannot access the DOM directly, cannot use localStorage, and cannot maintain in-memory state between invocations. Any data that needs to persist across service worker lifecycle events must be stored in chrome.storage or accessed through other persistent mechanisms. Timers that relied on the background page staying loaded will need to be redesigned using the alarms API or other event-driven patterns.

The benefits of this architectural shift include significantly reduced memory consumption when extensions are idle, improved security through a smaller attack surface, and better resource management across the entire browser. Chrome can now terminate idle extension processes entirely, freeing system resources for other tasks. However, this requires developers to adopt new patterns for managing state, handling asynchronous operations, and designing extensions that can handle being woken up and put to sleep repeatedly.

### Memory and State Management Changes

In MV2, you could store frequently accessed data in memory within your background script, knowing it would remain available as long as the browser was open. The service worker model in MV3 eliminates this guarantee. Any state your extension needs must be explicitly persisted to chrome.storage or another persistent storage mechanism. This includes user preferences, cached data, and any information your extension needs to function correctly.

The chrome.storage API provides the recommended solution for persistent state management. The storage.sync variant synchronizes data across the user's devices when they're signed into Chrome, while storage.local stores data only on the current device. Both support storing objects, arrays, and complex data structures through JSON serialization. For large amounts of data, IndexedDB remains available, though it requires more complex asynchronous handling.

When designing your extension's state management for MV3, consider what data you genuinely need to persist versus what can be recomputed or refetched when the service worker wakes up. Minimizing the amount of data you store and retrieve will improve your extension's performance and responsiveness. Use chrome.storage.SessionStorage for data that only needs to persist for a single browser session, and consider caching strategies that balance freshness with performance.

## Migrating from Background Page to Service Worker

The background service worker migration is the most complex and error-prone part of moving to Manifest V3. Your background script must be completely rewritten to work within the service worker model, which means eliminating all assumptions about persistent execution and DOM availability.

### Manifest Configuration Changes

Your manifest.json requires specific changes to declare a service worker instead of a background page. The background.scripts array is replaced with background.service_worker, and you can specify the entry point file. Adding "type": "module" enables ES module support, allowing you to organize your code using imports and exports.

The service worker file serves as the entry point for all background operations. When Chrome needs to respond to an event your extension has registered interest in, it wakes up your service worker, executes the relevant event handler, and then allows the service worker to terminate after a brief idle period. This lifecycle is fundamentally different from the persistent background page model and requires rethinking how your extension handles operations.

### Handling the Lack of DOM and Persistent State

Service workers cannot access the DOM, which means any code that previously manipulated the document object or used window-based APIs must be redesigned. This includes XMLHttpRequest for network requests, which should be replaced with the fetch API. Any HTML parsing or manipulation that previously happened in the background must now occur in content scripts, offscreen documents, or through other mechanisms.

The offscreen document API provides a solution for operations that genuinely require DOM access. You can create a hidden document specifically for tasks like parsing HTML, generating PDFs, or performing other operations that require a full browser environment. The service worker communicates with the offscreen document through message passing, sending data to be processed and receiving results back.

For state that previously lived in memory, implement proper initialization logic that runs every time your service worker wakes up. Read essential data from chrome.storage in your top-level event handlers before proceeding with any operations that require that data. This pattern ensures your extension works correctly regardless of how long it has been since the last execution.

### Service Worker Lifecycle Management

Understanding the service worker lifecycle is essential for building reliable MV3 extensions. Chrome manages service worker lifecycle through install, activate, and fetch events, similar to web service workers, but extended with additional events for extension-specific functionality. The service worker wakes up to handle events like onInstalled, onMessage, onAlarm, and various API events your extension has registered listeners for.

After handling an event, the service worker enters an idle state during which Chrome may terminate it to conserve resources. This termination happens automatically and without warning, so your extension must be designed to handle being stopped and restarted at any time. Event handlers should be registered at the top level of your service worker file, outside of any functions, to ensure they're always active when Chrome wakes your service worker.

The chrome.runtime.onInstalled event fires when your extension is first installed, updated, or when Chrome starts up with your extension already enabled. Use this event to initialize storage, set up default configurations, and perform one-time setup tasks. Similarly, chrome.runtime.onStartup fires when a profile launches, providing another opportunity for initialization. These events are crucial for ensuring your extension works correctly after being terminated and restarted.

## Converting webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to intercept, block, or modify network requests in flight. This powerful capability required the broad "webRequest" permission and the "blocking" flag, which gave extensions significant control over browser network activity. MV3 replaces this with the declarativeNetRequest API, which works fundamentally differently.

Instead of actively intercepting and modifying each request, declarativeNetRequest uses a rules-based system where you define rulesets that Chrome applies to network requests. The extension specifies what rules should match and what action should be taken, but Chrome handles the actual request interception. This design improves privacy by preventing extensions from reading request content and improves performance by moving rule evaluation into the browser core.

### Rule Structure and Declaration

DeclarativeNetRequest rules are defined in JSON format and stored in rule files that your extension bundles. Each rule has an ID, priority, action, and condition. The action specifies what to do when the condition matches, with options including block, allow, redirect, modifyHeaders, and more. The condition uses URL filters and resource type specifications to determine which requests the rule applies to.

Static rules are defined in your manifest and bundled with your extension. They're installed when the user adds your extension and can only be modified through extension updates. Dynamic rules are added and removed at runtime by your extension, allowing for user-configurable filtering, dynamically updated blocklists, and other flexible functionality. Both types work together, with static rules typically handling core blocking functionality and dynamic rules providing user customization.

The ruleset must be declared in your manifest using the declarativeNetRequest key, specifying which rule files to load and their IDs. Chrome validates rules at installation time, catching syntax errors and conflicts before your extension goes live. This validation prevents runtime errors from malformed rules and ensures consistent behavior across installations.

### Migrating Blocking webRequest Logic

If your MV2 extension used webRequest with the blocking option to actively modify or block requests based on their content, you'll need to redesign your approach for MV3. The declarativeNetRequest API cannot read request bodies or make blocking decisions based on dynamic criteria. Instead, you must predefine all possible rules and conditions.

For simple blocking based on URL patterns, the transition is straightforward. Convert your URL filter patterns to declarativeNetRequest rule conditions and specify block or allow actions. For more complex logic that previously happened in your blocking listener, consider whether the logic can be expressed as static rules, whether it requires dynamic rules updated at runtime, or whether you need to combine declarativeNetRequest with other APIs to achieve the desired functionality.

Redirect rules in declarativeNetRequest work similarly to blocking rules. You specify a redirect action with a destination URL, and Chrome applies the redirect when conditions match. This works well for redirecting known ad domains to alternative destinations or enforcing domain restrictions. For more complex redirect logic, you might need to combine declarativeNetRequest with content script analysis or other approaches.

## Eliminating Remote Code Execution

Manifest V3 explicitly prohibits loading and executing remote code. Extensions can only execute JavaScript and WebAssembly that's bundled with the extension package itself. This change improves security by ensuring users can review exactly what code their extensions run and prevents malicious extensions from fetching and executing external payloads.

### Bundling Dependencies

Any libraries, frameworks, or code modules your extension uses must be included in your extension package. This includes popular libraries like React, Vue, lodash, or any other third-party code. For build tools like webpack, Vite, or Rollup, configure your bundler to produce a single output file or set of files that contain all necessary code.

Modern bundlers handle this well in most cases, but you may need to adjust your configuration to ensure all dependencies are inlined rather than referenced externally. Some build tools default to using CDN links for certain dependencies, which won't work in MV3 extensions. Review your bundled output to ensure it contains no external script references.

For extensions that previously loaded user scripts or allowed extensibility through remote code, consider alternative architectures. Server-side rule management through declarativeNetRequest, configuration-driven behavior, or sandboxed execution environments can provide similar flexibility within the constraints of MV3's security model.

## Content Script Changes

Content scripts in MV3 work similarly to MV2 but with some important differences in how they're declared and how they interact with the background service worker. The fundamental capability of running JavaScript in the context of web pages remains, but communication patterns and injection methods have evolved.

### Script Injection Changes

The chrome.tabs.executeScript and chrome.tabs.insertCSS APIs have been replaced by chrome.scripting.executeScript and chrome.scripting.insertCSS in MV3. These new APIs provide similar functionality with a slightly different interface. The new APIs support injecting into more contexts including frames and document IDs, and they return results from the injected script.

When migrating, update your manifest declarations for content scripts and modify your background script calls to use the new scripting API. The function injection feature allows you to pass a function that will be serialized and executed in the target context, which can simplify certain patterns compared to the file injection approach.

Content scripts still have access to the page's DOM but exist in an isolated world, meaning they can't see JavaScript variables defined by the page or vice versa. This isolation remains important for security. However, content scripts can now exchange messages with the service worker using the standard message passing APIs, maintaining the communication channel that existed in MV2.

### Communication with Service Workers

Message passing between content scripts and the service worker works similarly to the MV2 pattern but with the service worker as the receiving endpoint rather than a persistent background page. Use chrome.runtime.sendMessage to send messages from content scripts and chrome.runtime.onMessage in the service worker to receive them.

The key difference is that your service worker may not be running when a content script tries to communicate. Chrome will wake your service worker to deliver the message, but this adds latency compared to MV2's always-available background page. For time-sensitive communications, consider using connection-based messaging with chrome.runtime.connect, which establishes a port that can queue messages even when the service worker is temporarily unavailable.

## Permission Model Updates

MV3 introduces several changes to how permissions work, splitting host permissions from API permissions and implementing a more granular permission system. These changes improve user privacy and security by requiring explicit user consent for powerful capabilities.

### Host Permissions Separation

In MV2, host permissions were included in the "permissions" array alongside API permissions. MV3 introduces a separate "host_permissions" array in the manifest. Extensions must declare which hosts they need access to, and users will be prompted to grant these permissions at install time. For extensions that need to run on all websites, use the "<all_urls>" pattern.

This separation affects how you design your extension's permission requests. Consider requesting only the minimum host permissions your extension needs to function. If your extension only needs to run on specific sites, declare those rather than requesting broad access. This improves user trust and may reduce friction during the installation process.

### New Permission Patterns

Some permissions that were automatically granted in MV2 now require explicit user action or have restricted capabilities. The "cookies" permission now requires the host for which you're accessing cookies to be specified. The "tabs" permission no longer provides access to sensitive tab properties like URLs for all tabs, requiring the "activeTab" permission for many common use cases.

The "activeTab" permission provides a user-granted permission that's only active when the user explicitly invokes your extension. This is ideal for extensions that only need to act on the current page when the user requests it, as it avoids prompting for broad permissions at install time. The user must click your extension icon or use a keyboard shortcut to activate the extension, at which point your extension has temporary access to the active tab.

For extensions that need to run automatically on page load, you'll need to request the appropriate host permissions. Consider whether your use case truly requires automatic execution or whether activeTab-based activation would provide a better user experience while maintaining privacy.

## Action API Migration

The browserAction and pageAction APIs from MV2 have been unified into a single "action" API in MV3. This simplification means extensions no longer need to choose between these two button types, instead using a single consistent API for toolbar actions.

### Manifest Configuration

In your manifest.json, replace "browser_action" or "page_action" with "action". The configuration options are similar, with name, default_icon, default_title, and default_popup all supported. The action can still show a badge with text or count using chrome.action.setBadgeText and chrome.action.setBadgeBackgroundColor.

If your extension used both browserAction and pageAction in MV2, you'll need to decide how to handle the toolbar presence in MV3. The unified action can appear on all tabs or you can programmatically hide or show it using chrome.action.show and chrome.action.hide based on the current tab's properties.

### Popup and Default Title Changes

The action popup works similarly to MV2, but the popup's lifecycle has changed. In MV2, the popup's JavaScript could maintain state while the popup remained open. In MV3, the popup runs in its own context and may be recreated each time it opens. Any persistent state should be stored in chrome.storage rather than relying on popup JavaScript variables.

The default title, which appears when users hover over your extension's toolbar icon, is now set through the action API rather than in the manifest. Use chrome.action.setDefaultTitle in your service worker to configure this. Similarly, default icons are still declared in the manifest but can be programmatically changed using chrome.action.setIcon.

## Storage Pattern Updates

The storage API remains available in MV3 but requires some pattern adjustments due to the service worker model. Because your background code runs ephemerally, you can't rely on in-memory caching within the service worker and must always read from storage when needed.

### Synchronous to Asynchronous Migration

All storage operations in MV3 are asynchronous and return promises. Code that previously used synchronous localStorage must be rewritten to use chrome.storage with async/await or promise then-chaining. This applies to reading, writing, and managing storage operations.

For frequently accessed data, implement a caching layer that reads from storage once when the service worker wakes up and stores the data in memory for that invocation. When the data changes, update both the in-memory cache and chrome.storage to ensure consistency. This pattern provides good performance while maintaining correctness in the service worker model.

### Storage Area Selection

Choose between storage.sync and storage.local based on your synchronization needs. storage.sync automatically synchronizes data across devices when the user is signed into Chrome, making it ideal for user preferences and settings that should follow the user. storage.local provides more storage quota and is suitable for large amounts of data that shouldn't leave the device.

The storage API provides generous quotas compared to localStorage, but you should still be mindful of what you're storing. Implement cleanup routines to remove old or unnecessary data, and consider compressing data if you're storing large objects. Monitor your storage usage through the chrome.storage.QuotaKey API if your extension works with significant amounts of data.

## Step-by-Step Migration Checklist

Migrating a complex extension systematically reduces the risk of introducing bugs and makes it easier to identify issues when they occur. The following checklist provides a structured approach to moving your extension from MV2 to MV3.

Begin by updating your manifest.json to declare manifest_version: 3. Add the "action" key to replace browserAction or pageAction, move host permissions to the new "host_permissions" key, update your background configuration to use "service_worker" instead of "scripts", and add the declarativeNetRequest key if your extension modifies network requests. This initial manifest update establishes the foundation for MV3 compatibility.

Next, migrate your background script to work as a service worker. Remove all DOM manipulation code, replace XMLHttpRequest with fetch, convert timer-based logic to use chrome.alarms, implement chrome.storage for all persistent state, and register all event handlers at the top level of your service worker file. Test that your background logic works correctly through the service worker lifecycle.

Then update your content scripts and injection logic. Replace chrome.tabs.executeScript with chrome.scripting.executeScript, update your message passing to communicate with the service worker, and ensure all content script functionality works within the isolated world constraints. Finally, review and update your permissions strategy, requesting only what's necessary and considering whether activeTab-based activation would better serve your use case.

## Common Migration Pitfalls

Several issues frequently trip up developers during the MV3 migration. Understanding these pitfalls helps you avoid them in your own migration effort.

The most common issue is attempting to use localStorage in the service worker, which simply doesn't exist. Always use chrome.storage instead, and remember that storage operations are asynchronous. Another frequent problem is not properly handling the service worker lifecycle, where code assumes the service worker stays running and fails when Chrome terminates it between events.

For extensions using webRequest blocking, the transition to declarativeNetRequest can be challenging because you can no longer make decisions based on request bodies or dynamically generated rules. You must express all your blocking logic as static or dynamic rules in advance. Similarly, extensions that load remote code must bundle all their dependencies, which can significantly increase extension size if not managed carefully.

Content script injection failures often occur because the new scripting API requires the "scripting" permission. Ensure you've added this permission to your manifest. Finally, permission errors can arise from not properly separating host permissions into their own array or from requesting permissions your extension doesn't actually need.

## Testing Strategy for MV3 Extensions

Testing MV3 extensions requires adapting your testing strategy to account for the service worker lifecycle. Unit tests that assume a persistent background context will fail, so structure your tests to handle asynchronous initialization and the possibility of service worker termination.

Functional testing should verify that your extension works correctly across the full service worker lifecycle. This means testing functionality when the service worker first loads, after Chrome has terminated it due to inactivity, and when it's woken up again. Pay particular attention to state persistence, ensuring that data stored in chrome.storage is correctly recovered when the service worker restarts.

Use Chrome's extension management page to reload your extension during development and test the unpacked extension in development mode. The service worker inspection tools in Chrome DevTools provide visibility into service worker events and state, helping you debug issues related to the service worker lifecycle. Test across multiple scenarios including fresh installs, updates, and browser restarts.

## Chrome's MV2 Deprecation Timeline

Chrome has progressively phased out Manifest V2 support, with the final deprecation occurring in 2024. Extensions using manifest_version: 2 can no longer be published to the Chrome Web Store, and existing MV2 extensions have been automatically updated to MV3 where possible or removed from the store.

The transition timeline saw several milestones. Early phases allowed both versions while developers migrated, then blocked new MV2 submissions, then disabled MV2 for newly installed extensions, and finally completed the transition by forcing all remaining extensions to MV3. This phased approach gave developers time to migrate but ultimately required all extensions to be updated.

For extensions that couldn't be automatically migrated, developers had the opportunity to manually update their extensions before removal. If you're maintaining an extension that hasn't been updated yet, prioritize the migration to ensure your users can continue using your extension. The Chrome Extension Developer Documentation provides detailed migration guides and the Chrome Web Store help forum offers support for migration issues.

---

## Related Guides

For more detailed information on specific migration topics, explore these related guides in the Chrome Extension Guide:

- [Background Service Worker Guide](/docs/guides/background-service-worker/) — Complete guide to implementing and managing service workers in MV3 extensions
- [Declarative Net Request API](/docs/guides/declarative-net-request/) — Detailed documentation on the declarativeNetRequest API for network request modification
- [MV3 Migration Cheatsheet](/docs/guides/mv3-migration-cheatsheet/) — Quick reference for common MV2 to MV3 conversions
- [Chrome Extension Storage Best Practices](/docs/guides/chrome-extension-storage-best-practices/) — Patterns for effective storage management in MV3

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
