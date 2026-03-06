# dns Permission

## What It Grants
Access to the `chrome.dns` API for performing DNS resolution from the extension context.

## Manifest
```json
{
  "permissions": ["dns"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## Availability
- **Chrome Dev/Canary channel only** (not stable)
- Limited platform support
- Consider alternatives for production extensions

## API Access
Single method:
```typescript
const result = await chrome.dns.resolve('example.com');
console.log(result.resultCode); // 0 = success
console.log(result.address);    // "93.184.216.34"
```

## ResolveCallbackResolveInfo
```typescript
interface ResolveCallbackResolveInfo {
  resultCode: number;  // 0 = success, non-zero = error
  address?: string;    // Resolved IP address
}
```

## Basic Usage
```typescript
async function resolveHostname(hostname: string): Promise<string | null> {
  try {
    const result = await chrome.dns.resolve(hostname);
    if (result.resultCode === 0) {
      return result.address || null;
    }
    return null;
  } catch (e) {
    console.error(`DNS resolution failed for ${hostname}:`, e);
    return null;
  }
}

const ip = await resolveHostname('google.com');
console.log(`google.com resolves to ${ip}`);
```

## Network Diagnostics Pattern
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  DNS_LOOKUP: { request: { hostname: string }; response: { ip: string | null; error?: string } };
  CONNECTIVITY_CHECK: { request: { hosts: string[] }; response: { results: Array<{ host: string; ip: string | null }> } };
};
const m = createMessenger<Messages>();

m.onMessage('DNS_LOOKUP', async ({ hostname }) => {
  try {
    const result = await chrome.dns.resolve(hostname);
    return { ip: result.resultCode === 0 ? result.address || null : null };
  } catch (e) {
    return { ip: null, error: String(e) };
  }
});

m.onMessage('CONNECTIVITY_CHECK', async ({ hosts }) => {
  const results = await Promise.all(
    hosts.map(async (host) => {
      try {
        const r = await chrome.dns.resolve(host);
        return { host, ip: r.resultCode === 0 ? r.address || null : null };
      } catch {
        return { host, ip: null };
      }
    })
  );
  return { results };
});
```

## DNS-Based Filtering
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ blockedIPs: 'string' }); // JSON array
const storage = createStorage(schema, 'local');

async function isBlocked(hostname: string): Promise<boolean> {
  const result = await chrome.dns.resolve(hostname);
  if (result.resultCode !== 0) return false;

  const blocked = JSON.parse(await storage.get('blockedIPs') || '[]');
  return blocked.includes(result.address);
}
```

## Use Cases
- Network diagnostic tools
- DNS lookup utilities
- Hostname verification
- IP-based filtering/blocking
- Security analysis extensions
- Developer tools

## Alternatives for Production
Since `chrome.dns` is dev-channel only, consider:
- **fetch HEAD request** — check if a host is reachable
- **WebRTC** — can reveal local IP (limited)
- **External DNS API** — DoH (DNS over HTTPS) via `fetch('https://dns.google/resolve?name=example.com')`

```typescript
// Production alternative: DNS over HTTPS
async function dohResolve(hostname: string): Promise<string | null> {
  const resp = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
  const data = await resp.json();
  return data.Answer?.[0]?.data || null;
}
```

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('dns');
```

## Cross-References
- Related: `docs/permissions/proxy.md`, `docs/permissions/webRequest.md`
