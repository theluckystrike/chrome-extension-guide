# topSites Permission

## What It Grants
Access to the `chrome.topSites` API for retrieving the user's most frequently visited sites.

## Manifest
```json
{
  "permissions": ["topSites"]
}
```

## User Warning
"Read your browsing history" — this permission triggers a warning because it exposes browsing habits.

## API Access
Single method:
```typescript
const sites = await chrome.topSites.get();
// Returns array of MostVisitedURL objects
```

## MostVisitedURL Object
```typescript
interface MostVisitedURL {
  title: string;  // Page title
  url: string;    // Page URL
}
```

## Basic Usage
```typescript
const topSites = await chrome.topSites.get();
for (const site of topSites) {
  console.log(`${site.title}: ${site.url}`);
}
// Typically returns 10-15 most visited sites
```

## New Tab Speed Dial
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  pinnedSites: 'string',  // JSON array of pinned URLs
  cachedTopSites: 'string' // JSON cache
});
const storage = createStorage(schema, 'sync');

async function getSpeedDialSites(): Promise<Array<{ title: string; url: string; pinned: boolean }>> {
  const pinned = JSON.parse(await storage.get('pinnedSites') || '[]');
  const topSites = await chrome.topSites.get();

  // Merge: pinned first, then top sites (excluding pinned duplicates)
  const pinnedUrls = new Set(pinned.map((s: any) => s.url));
  const auto = topSites
    .filter(s => !pinnedUrls.has(s.url))
    .map(s => ({ ...s, pinned: false }));

  return [...pinned.map((s: any) => ({ ...s, pinned: true })), ...auto].slice(0, 12);
}
```

## Favicon Display
```typescript
function getFaviconUrl(pageUrl: string): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
}

// Requires manifest: "permissions": ["favicon"]
```

## Caching Pattern
```typescript
async function getCachedTopSites() {
  const cached = await storage.get('cachedTopSites');
  if (cached) {
    const { sites, timestamp } = JSON.parse(cached);
    // Cache for 5 minutes
    if (Date.now() - timestamp < 300000) return sites;
  }
  const sites = await chrome.topSites.get();
  await storage.set('cachedTopSites', JSON.stringify({ sites, timestamp: Date.now() }));
  return sites;
}
```

## Messaging Integration
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_TOP_SITES: { request: { limit?: number }; response: { sites: Array<{ title: string; url: string }> } };
};
const m = createMessenger<Messages>();

m.onMessage('GET_TOP_SITES', async ({ limit }) => {
  const sites = await chrome.topSites.get();
  return { sites: sites.slice(0, limit || 10) };
});
```

## Privacy Considerations
- Exposes user's most visited sites — handle data carefully
- Don't transmit top sites to external servers
- Results exclude incognito visits
- Results can change frequently
- Some users may have few top sites (new profile)

## Key Characteristics
- Returns up to ~15 most visited URLs
- Sorted by visit frequency
- No events — must poll when needed
- Read-only — cannot modify the list
- Does not include incognito data

## When to Use
- Custom new tab pages with speed dial
- Quick-access launchers
- Personalized dashboards
- Start page customization

## When NOT to Use
- If you need full browsing history — use `history` permission
- If you need real-time navigation tracking — use `webNavigation`

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('topSites');
```

## Cross-References
- Patterns: `docs/patterns/top-sites.md`
- Tutorial: `docs/tutorials/build-new-tab.md`
