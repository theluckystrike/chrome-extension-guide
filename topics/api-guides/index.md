---
layout: topic
title: "Chrome Extension API Guides: Tabs, Storage, Messaging, Alarms & More"
description: "In-depth Chrome extension API documentation with working examples. Covers tabs, storage, messaging, alarms, downloads, notifications, and other key APIs."
permalink: /topics/api-guides/
topic_categories:
  - API-Guide
  - APIs
---
# API Guides

Chrome provides over fifty extension APIs, and the documentation on developer.chrome.com, while thorough, often leaves out the practical context that developers actually need. These guides bridge that gap by pairing official API behavior with real-world usage patterns, working code samples, and notes on the edge cases you are likely to hit in production.

The tabs API is one of the most frequently used and most misunderstood. Querying tabs, moving them between windows, detecting navigation events, and managing tab groups all have subtle behaviors that differ across Chrome versions. Guides in this section cover these specifics, including the permission differences between `tabs` and `activeTab` and when each is appropriate.

Storage is another critical API surface. The choice between `chrome.storage.local`, `chrome.storage.sync`, and `chrome.storage.session` affects both functionality and user experience. Sync storage has tight quota limits that can silently truncate data if you are not careful. Local storage is more generous but does not follow the user across devices. Session storage disappears when the browser closes. Articles here explain the tradeoffs and show patterns for using them together effectively.

Messaging, both between extension components and with content scripts, is where many developers encounter frustrating bugs. The differences between `chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`, and port-based long-lived connections are subtle but important, especially when you need reliable communication with content scripts that may not be loaded yet.

Other APIs covered include alarms for scheduled tasks, notifications for user alerts, downloads for file management, and the declarativeNetRequest API that replaced the older webRequest blocking capabilities in Manifest V3.
