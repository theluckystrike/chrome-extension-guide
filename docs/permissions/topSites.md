# topSites Permission

## Overview
- Permission string: `"topSites"`
- Grants access to `chrome.topSites` API
- Returns the user's most visited sites

## API Methods
- `chrome.topSites.get()` returns Promise with array of MostVisitedURL
  - MostVisitedURL: `{ title, url }`
  - Returns approximately 15-20 most visited sites
  - Excludes incognito visits
  - Results are pre-sorted by visit frequency

## No Events
- No events available, poll on demand
- Cache results and refresh periodically if needed

## Manifest Declaration
```json
{ "permissions": ["topSites"] }
```

## Privacy Considerations
- Exposes user's browsing habits to the extension
- Be transparent in privacy policy about data usage
- Never transmit this data to external servers without consent
- Chrome Web Store review may scrutinize this permission

## Use Cases
- Custom new tab page: show speed dial of top sites
- Productivity dashboard: display most visited sites
- Analytics: show user their browsing patterns
- Quick-launch panel: easy access to frequent sites

## Code Examples
- Fetch and display top sites
- Custom new tab page with top sites grid
- Cache top sites with @theluckystrike/webext-storage and refresh interval
- Combine with favicon API for site icons

## Fetch and Display Top Sites
```typescript
const topSites = await chrome.topSites.get();
for (const site of topSites) {
  console.log(`${site.title}: ${site.url}`);
}
```

## Custom New Tab Page
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

## Cross-references
- patterns/top-sites.md
- tutorials/build-new-tab.md
