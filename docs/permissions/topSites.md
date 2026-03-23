---
layout: default
title: "topSites Permission"
description: "Permission string: Grants access to API Returns the user's most visited sites returns Promise with array of MostVisitedURL"
permalink: /permissions/topSites/
category: permissions
order: 44
canonical_url: "https://bestchromeextensions.com/permissions/topSites/"
---

# topSites Permission

Overview {#overview}
- Permission string: `"topSites"`
- Grants access to `chrome.topSites` API
- Returns the user's most visited sites

API Methods {#api-methods}
- `chrome.topSites.get()` returns Promise with array of MostVisitedURL
  - MostVisitedURL: `{ title, url }`
  - Returns approximately 15-20 most visited sites
  - Excludes incognito visits
  - Results are pre-sorted by visit frequency

No Events {#no-events}
- No events available, poll on demand
- Cache results and refresh periodically if needed

Manifest Declaration {#manifest-declaration}
```json
{ "permissions": ["topSites"] }
```

Privacy Considerations {#privacy-considerations}
- Exposes user's browsing habits to the extension
- Be transparent in privacy policy about data usage
- Never transmit this data to external servers without consent
- Chrome Web Store review may scrutinize this permission

Use Cases {#use-cases}
- Custom new tab page: show speed dial of top sites
- Productivity dashboard: display most visited sites
- Analytics: show user their browsing patterns
- Quick-launch panel: easy access to frequent sites

Code Examples

Fetch and Display Top Sites

Code Examples {#code-examples}
- Fetch and display top sites
- Custom new tab page with top sites grid
- Cache top sites with @theluckystrike/webext-storage and refresh interval
- Combine with favicon API for site icons

Fetch and Display Top Sites {#fetch-and-display-top-sites}
```typescript
const topSites = await chrome.topSites.get();
for (const site of topSites) {
  console.log(`${site.title}: ${site.url}`);
}
```

Custom New Tab Page

Custom New Tab Page {#custom-new-tab-page}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  cachedTopSites: 'string'
});
const storage = createStorage(schema, 'sync');

async function getTopSitesGrid() {
  const cached = await storage.get('cachedTopSites');
  if (cached) {
    const { sites, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 300000) return sites;
  }
  const sites = await chrome.topSites.get();
  await storage.set('cachedTopSites', JSON.stringify({ sites, timestamp: Date.now() }));
  return sites;
}
```

Speed Dial Implementation
```typescript
function createSpeedDialHTML(sites) {
  return sites.slice(0, 12).map(site => `
    <a href="${site.url}" class="speed-dial-item" title="${site.title}">
      <div class="favicon">
        <img src="https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=64" />
      </div>
      <span class="title">${site.title}</span>
    </a>
  `).join('');
}
```

Quick Access Popup
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: 'quick-launch.html' });
});

async function renderQuickLaunch() {
  const sites = await chrome.topSites.get();
  const container = document.getElementById('sites');
  
  sites.forEach(site => {
    const link = document.createElement('a');
    link.href = site.url;
    link.textContent = site.title;
    container.appendChild(link);
  });
}
```

Common Use Cases

Custom New Tab Pages
The most popular use case for `topSites` is creating custom new tab pages that display a speed dial or grid of frequently visited sites. This provides quick access without requiring users to navigate to their bookmarks.

Productivity Dashboards
Build dashboard extensions that show users their browsing patterns. This helps users understand their habits and provides quick access to frequently used tools and sites.

Quick Launch Panels
Create popup panels or side panels that function as a quick launcher. Users can type to filter their top sites and press Enter to navigate to the selected site.

Browsing Analytics
Display statistics about users' browsing habits. Show which sites they visit most, how many unique sites they visit, and trends over time.

Site Recommendation Engine
Analyze top sites and provide recommendations based on browsing patterns. For example, suggest productivity tools to users who frequently visit work-related sites.

Best Practices

Respect User Privacy
Top sites reveal sensitive information about user behavior. Never transmit this data to external servers without explicit consent. Store and process all data locally.

Implement Caching
Since there are no events, implement caching to reduce API calls. Cache results for a reasonable period (5-15 minutes is typical) and only refresh when needed.

Handle Empty States
Some users may have no browsing history or have cleared their history. Provide helpful empty states and alternative content in these cases.

Provide User Control
Allow users to exclude sites from appearing in top sites. Some users may not want certain sites (like banking or email) appearing in quick access lists.

Consider Performance
Rendering many favicons can be slow. Use lazy loading or a service like Google's favicon API with appropriate sizing to improve performance.

Be Transparent About the Permission
The `topSites` permission requires a user warning and may undergo additional review in the Chrome Web Store. Be transparent about why you need this permission.

Test with New Users
New Chrome profiles have minimal browsing history. Test your extension with fresh profiles to ensure the UI handles sparse data gracefully.

Cross-References

Cross-references {#cross-references}
- patterns/top-sites.md
- tutorials/build-new-tab.md

Frequently Asked Questions

How do I get top sites in Chrome extension?
Use chrome.topSites.get() to retrieve the user's most visited sites. This requires the topSites permission.

Are top sites customizable?
Users can pin sites to appear in top sites. Extensions can only read the current list, not modify it.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
