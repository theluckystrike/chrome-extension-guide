# Chrome Cookies API Guide

## Introduction

The `chrome.cookies` API is one of the most powerful and commonly used APIs in Chrome extension development. It provides complete control over browser cookies, enabling extensions to read, create, modify, and delete cookies across any domain. This API is essential for building session managers, authentication helpers, privacy tools, and cookie editors. Understanding cookie mechanics is fundamental to creating robust and secure extensions.

The Cookies API operates differently from standard web cookie handling. While JavaScript on a webpage can only access cookies for the current domain (and can't see HttpOnly cookies), the Chrome extension Cookies API can access cookies across domains when proper permissions are granted. This makes it incredibly powerful but also requires careful attention to security and privacy considerations.

## Required Permissions

### Manifest Configuration

To use the `chrome.cookies` API, you must declare permissions in your `manifest.json` file. The permission model requires two components:

```json
{
  "name": "Cookie Manager Pro",
  "version": "1.0",
  "permissions": [
    "cookies"
  ],
  "host_permissions": [
    "https://*.example.com/*",
    "https://*.google.com/*"
  ]
}
```

### Understanding Permission Requirements

The `"cookies"` permission alone is not sufficient to access cookies. You must also specify host permissions for each domain whose cookies you want to access. The host permission system uses URL patterns that follow these rules:

- `https://*.example.com/*` - Matches all subdomains of example.com over HTTPS
- `https://example.com/*` - Matches only example.com over HTTPS  
- `<all_urls>` - Matches all URLs (use sparingly due to privacy implications)

When requesting host permissions, always be as specific as possible. Chrome Web Store reviewers may question extensions requesting overly broad cookie access. If your extension only needs to manage cookies for specific sites, list those sites explicitly rather than using wildcards or `<all_urls>`.

## Cookie Data Types

### The Cookie Object

The `Cookie` object represents a single cookie with all its properties. Understanding each field is essential for proper cookie management:

```typescript
interface Cookie {
  name: string;           // Cookie name
  value: string;          // Cookie value
  domain: string;         // Domain the cookie applies to (leading dot for domain cookies)
  hostOnly: boolean;      // True if cookie was set without a domain attribute
  path: string;           // URL path where cookie is sent
  secure: boolean;        // Only sent over HTTPS connections
  httpOnly: boolean;      // Not accessible to JavaScript (document.cookie)
  sameSite: SameSiteStatus; // SameSite attribute value
  session: boolean;       // True if this is a session cookie (no expiration)
  expirationDate?: number; // Unix timestamp (seconds) when cookie expires
  storeId: string;        // ID of the cookie store containing this cookie
  firstPartyDomain: string; // First-party domain for the cookie
  partitionKey?: {        // Storage partition key (for CHIPS)
    topLevelSite: string;
  };
  encryptedValue?: string; // Encrypted value for partitioned cookies
}
```

### SameSite Status Values

The `sameSite` attribute controls when cookies are sent with cross-site requests. Chrome supports four values:

| Value | Description |
|-------|-------------|
| `"no_restriction"` | Cookie sent with all requests (requires Secure) |
| `"lax"` | Cookie sent with safe cross-site top-level navigations |
| `"strict"` | Cookie only sent in first-party context |
| `"unspecified"` | No SameSite attribute was explicitly set |

### CookieChangeInfo Type

The `onChanged` event provides a `CookieChangeInfo` object that describes what changed:

```typescript
interface CookieChangeInfo {
  removed: boolean;       // True if cookie was deleted
  cookie: Cookie;         // The cookie that was changed
  cause: CookieChangeCause; // Why the change occurred
}

type CookieChangeCause = 
  | "evicted"         // Cookie was removed due to eviction
  | "expired"         // Cookie expired naturally
  | "explicit"        // Removed via API call
  | "expired_overwrite" // Overwritten with expired cookie
  | "overwrite"       // Voluntarily overwritten
  | "unknown";        // Unknown cause
```

## Reading Cookies

### chrome.cookies.get()

The `get()` method retrieves a single cookie by name for a specific URL. This is useful when you need to check for a specific cookie value:

```javascript
// Get a specific cookie by name
chrome.cookies.get({
  url: 'https://www.example.com',
  name: 'session_token'
}, (cookie) => {
  if (cookie) {
    console.log('Session token:', cookie.value);
    console.log('Domain:', cookie.domain);
    console.log('Path:', cookie.path);
    console.log('Expires:', cookie.expirationDate 
      ? new Date(cookie.expirationDate * 1000) 
      : 'Session cookie');
    console.log('Secure:', cookie.secure);
    console.log('HttpOnly:', cookie.httpOnly);
    console.log('SameSite:', cookie.sameSite);
  } else {
    console.log('Cookie not found');
  }
});
```

### chrome.cookies.getAll()

The `getAll()` method retrieves all cookies matching the specified criteria. This is more flexible and commonly used for bulk operations:

```javascript
// Get all cookies for a specific URL
chrome.cookies.getAll({ url: 'https://www.example.com' }, (cookies) => {
  console.log(`Found ${cookies.length} cookies:`);
  cookies.forEach(cookie => {
    console.log(`  ${cookie.name}=${cookie.value}`);
  });
});

// Get all cookies for a domain (includes subdomains)
chrome.cookies.getAll({ domain: '.example.com' }, (cookies) => {
  console.log(`Found ${cookies.length} cookies for example.com domain`);
});

// Filter by multiple properties
chrome.cookies.getAll({
  domain: '.example.com',
  secure: true,
  session: false  // Only persistent cookies
}, (cookies) => {
  cookies.forEach(cookie => {
    console.log(`Persistent secure cookie: ${cookie.name}`);
  });
});

// Get all cookies regardless of domain
chrome.cookies.getAll({}, (cookies) => {
  console.log(`Total cookies in default store: ${cookies.length}`);
});
```

## Creating and Updating Cookies

### chrome.cookies.set()

The `set()` method creates a new cookie or updates an existing one with the same name, domain, and path:

```javascript
// Create a basic cookie
chrome.cookies.set({
  url: 'https://www.example.com',
  name: 'user_preference',
  value: 'dark_mode',
  domain: '.example.com',      // Optional: defaults to URL host
  path: '/',                   // Optional: defaults to '/'
  secure: true,                // Only sent over HTTPS
  httpOnly: false,             // Accessible via document.cookie
  sameSite: 'lax',            // SameSite policy
  expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
}, (cookie) => {
  if (cookie) {
    console.log('Cookie created:', cookie.name);
  } else {
    console.error('Failed to set cookie:', chrome.runtime.lastError?.message);
  }
});

// Create a session cookie (no expiration)
chrome.cookies.set({
  url: 'https://www.example.com',
  name: 'session_id',
  value: 'abc123xyz'
});

// Set a cookie for the current page's domain
function setCurrentPageCookie(name, value) {
  chrome.cookies.set({
    url: window.location.href,
    name: name,
    value: value,
    secure: window.location.protocol === 'https:',
    sameSite: 'lax'
  });
}
```

### Updating Existing Cookies

To update a cookie, use `set()` with the same name, domain, and path as the existing cookie. The API will automatically update the value:

```javascript
// Update an existing cookie's value
chrome.cookies.get({ url: 'https://example.com', name: 'counter' }, (cookie) => {
  if (cookie) {
    const currentValue = parseInt(cookie.value) || 0;
    chrome.cookies.set({
      url: 'https://example.com',
      name: 'counter',
      value: String(currentValue + 1),
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate
    });
  }
});
```

## Deleting Cookies

### chrome.cookies.remove()

The `remove()` method deletes a specific cookie:

```javascript
// Remove a specific cookie
chrome.cookies.remove({
  url: 'https://www.example.com',
  name: 'session_token'
}, (details) => {
  if (details) {
    console.log(`Removed cookie: ${details.name}`);
  } else {
    console.log('Cookie not found or already removed');
  }
});

// Remove all cookies for a domain
function clearDomainCookies(domain) {
  chrome.cookies.getAll({ domain: domain }, (cookies) => {
    cookies.forEach(cookie => {
      const protocol = cookie.secure ? 'https' : 'http';
      const url = `${protocol}://${cookie.domain}${cookie.path}`;
      chrome.cookies.remove({ url: url, name: cookie.name });
    });
    console.log(`Cleared ${cookies.length} cookies for ${domain}`);
  });
}

// Remove all cookies for current tab's site
function clearCurrentSiteCookies() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) {
      const url = new URL(tabs[0].url);
      chrome.cookies.getAll({ domain: `.${url.hostname}` }, (cookies) => {
        cookies.forEach(cookie => {
          chrome.cookies.remove({
            url: `${url.protocol}//${cookie.domain}${cookie.path}`,
            name: cookie.name
          });
        });
      });
    }
  });
}
```

## Cookie Stores and Incognito Mode

### chrome.cookies.getAllCookieStores()

Chrome maintains separate cookie stores for normal browsing and incognito windows. The `getAllCookieStores()` method returns all available stores:

```javascript
// List all cookie stores
chrome.cookies.getAllCookieStores((stores) => {
  console.log('Available cookie stores:');
  stores.forEach(store => {
    console.log(`  Store ID: ${store.id}`);
    console.log(`  Tab IDs: ${store.tabIds.join(', ') || 'none'}`);
    console.log(`  Incognito: ${store.id.startsWith('firefox') ? 
      'N/A' : store.id === '1'}`);
  });
});

// Get cookies from a specific store
async function getIncognitoCookies() {
  const stores = await chrome.cookies.getAllCookieStores();
  const incognitoStore = stores.find(s => s.tabIds?.length > 0 && s.id !== '0');
  
  if (incognitoStore) {
    return chrome.cookies.getAll({ storeId: incognitoStore.id });
  }
  return [];
}

// Filter cookies by store
chrome.cookies.getAll({ storeId: '1' }, (cookies) => {
  console.log('Incognito cookies:', cookies.length);
});
```

## Monitoring Cookie Changes

### chrome.cookies.onChanged

The `onChanged` event fires whenever a cookie is created, updated, or removed. This is essential for building real-time cookie monitoring tools:

```javascript
// Listen for all cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  const { removed, cookie, cause } = changeInfo;
  
  console.log(`Cookie ${removed ? 'removed' : 'set'}: ${cookie.name}`);
  console.log(`  Domain: ${cookie.domain}`);
  console.log(`  Value: ${cookie.value.substring(0, 50)}...`);
  console.log(`  Cause: ${cause}`);
  
  if (cause === 'explicit') {
    console.log('  (Removed by extension or user)');
  } else if (cause === 'evicted') {
    console.log('  (Removed due to storage pressure)');
  }
});

// Monitor specific domains
const monitoredDomains = ['google.com', 'facebook.com'];

chrome.cookies.onChanged.addListener((changeInfo) => {
  const domain = changeInfo.cookie.domain;
  const isMonitored = monitoredDomains.some(d => domain.includes(d));
  
  if (isMonitored) {
    notifyUserOfCookieChange(changeInfo);
  }
});

// Track authentication state changes
let previousAuthCookies = {};

chrome.cookies.getAll({ domain: '.example.com' }, (cookies) => {
  cookies.forEach(c => {
    if (c.name.includes('auth') || c.name.includes('session')) {
      previousAuthCookies[c.name] = c.value;
    }
  });
});

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('.example.com')) {
    const name = changeInfo.cookie.name;
    const wasAuthCookie = previousAuthCookies.hasOwnProperty(name);
    
    if (wasAuthCookie && changeInfo.removed) {
      console.log('User logged out!');
    } else if (!wasAuthCookie && !changeInfo.removed) {
      console.log('User logged in!');
    }
    
    // Update tracking
    if (changeInfo.removed) {
      delete previousAuthCookies[name];
    } else {
      previousAuthCookies[name] = changeInfo.cookie.value;
    }
  }
});
```

## Partitioned Cookies and CHIPS

### Understanding Cookie Partitioning

CHIPS (Cookies Having Independent Partitioned State) is a privacy feature that partitions cookies by top-level site. This prevents cross-site tracking while still allowing useful cookie functionality:

```javascript
// Set a partitioned cookie (CHIPS)
chrome.cookies.set({
  url: 'https://subdomain.example.com',
  name: 'preference',
  value: 'dark_mode',
  partitionKey: {
    topLevelSite: 'https://example.com'
  },
  secure: true,
  sameSite: 'none'  // Required for partitioned cookies
}, (cookie) => {
  if (cookie?.partitionKey) {
    console.log('Partitioned cookie created');
    console.log('Top-level site:', cookie.partitionKey.topLevelSite);
  }
});

// Read partitioned cookies
chrome.cookies.getAll({
  partitionKey: {
    topLevelSite: 'https://example.com'
  }
}, (cookies) => {
  cookies.forEach(cookie => {
    if (cookie.partitionKey) {
      console.log(`Partitioned cookie: ${cookie.name}`);
    }
  });
});

// Filter by partition
chrome.cookies.getAll({
  domain: '.example.com',
  partitionKey: { topLevelSite: 'https://tracker.com' }
}, (cookies) => {
  console.log(`Found ${cookies.length} cookies from partition`);
});
```

## Building a Cookie Manager Extension

Here's a complete example combining all concepts to build a functional cookie manager:

```javascript
// background/cookie-manager.js - Core cookie management logic

class CookieManager {
  constructor() {
    this.init();
  }
  
  async init() {
    // Set up change listener
    chrome.cookies.onChanged.addListener(this.handleCookieChange.bind(this));
    
    // Load monitored domains from storage
    const { monitoredDomains } = await chrome.storage.local.get('monitoredDomains');
    this.monitoredDomains = monitoredDomains || [];
  }
  
  handleCookieChange(changeInfo) {
    const { cookie, removed, cause } = changeInfo;
    
    // Only log monitored domains
    const isMonitored = this.monitoredDomains.some(d => 
      cookie.domain.includes(d)
    );
    
    if (isMonitored) {
      console.log(`Cookie ${removed ? 'removed' : 'set'}: ${cookie.name}`);
      this.logToHistory(changeInfo);
    }
  }
  
  async logToHistory(changeInfo) {
    const { history } = await chrome.storage.local.get('history');
    const entries = history || [];
    
    entries.unshift({
      ...changeInfo,
      timestamp: Date.now()
    });
    
    // Keep only last 100 entries
    await chrome.storage.local.set({ 
      history: entries.slice(0, 100) 
    });
  }
  
  async getAllCookies(filters = {}) {
    return new Promise((resolve) => {
      chrome.cookies.getAll(filters, resolve);
    });
  }
  
  async getCookiesForUrl(url) {
    const urlObj = new URL(url);
    return this.getAllCookies({ 
      domain: `.${urlObj.hostname}` 
    });
  }
  
  async setCookie(cookieData) {
    const { name, value, url, days, ...options } = cookieData;
    
    const cookie = {
      url,
      name,
      value,
      secure: true,
      sameSite: 'lax'
    };
    
    if (days) {
      cookie.expirationDate = Math.floor(Date.now() / 1000) + (days * 86400);
    }
    
    Object.assign(cookie, options);
    
    return new Promise((resolve, reject) => {
      chrome.cookies.set(cookie, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }
  
  async removeCookie(url, name) {
    return new Promise((resolve) => {
      chrome.cookies.remove({ url, name }, resolve);
    });
  }
  
  async clearDomain(domain) {
    const cookies = await this.getAllCookies({ domain });
    
    for (const cookie of cookies) {
      const protocol = cookie.secure ? 'https' : 'http';
      await this.removeCookie(
        `${protocol}://${cookie.domain}${cookie.path}`,
        cookie.name
      );
    }
    
    return cookies.length;
  }
}

// Export for use in popup or other contexts
if (typeof chrome !== 'undefined' && chrome.runtime) {
  new CookieManager();
}
```

## Privacy and Security Considerations

### Best Practices

When working with cookies in extensions, security and privacy should be primary concerns:

1. **Minimize permissions**: Only request host permissions for domains your extension actually needs to manage.

2. **Handle sensitive data carefully**: Avoid logging or storing cookie values that may contain sensitive information like session tokens.

3. **Use Secure and HttpOnly when appropriate**: Set these flags whenever possible to protect cookies from XSS attacks and ensure they're only transmitted over encrypted connections.

4. **Respect SameSite policies**: Properly configure SameSite attributes to prevent CSRF attacks and comply with modern browser requirements.

5. **Clear data on uninstall**: Use the `onUninstalled` event to clean up any stored cookie data.

```javascript
// Security-conscious cookie handling
chrome.cookies.set({
  url: 'https://secure.example.com',
  name: 'secure_token',
  value: sensitiveValue,
  secure: true,        // HTTPS only
  httpOnly: true,      // Not accessible to JavaScript
  sameSite: 'strict'   // Prevent CSRF
});

// Audit cookies for security issues
async function auditCookies(domain) {
  const cookies = await chrome.cookies.getAll({ domain });
  const issues = [];
  
  cookies.forEach(cookie => {
    if (!cookie.secure && cookie.value) {
      issues.push({
        name: cookie.name,
        issue: 'Insecure: cookie sent over HTTP'
      });
    }
    
    if (!cookie.httpOnly && cookie.name.includes('session')) {
      issues.push({
        name: cookie.name,
        issue: 'Session cookie is JavaScript-accessible'
      });
    }
    
    if (cookie.sameSite === 'unspecified') {
      issues.push({
        name: cookie.name,
        issue: 'No SameSite policy specified'
      });
    }
  });
  
  return issues;
}
```

### User Privacy

Always be transparent about what cookies your extension accesses and why. The Chrome Web Store has strict policies about cookie access:

- Provide a clear privacy policy explaining cookie usage
- Don't exfiltrate cookie data without user consent
- Minimize the data you collect and store
- Consider providing a "view only" mode that doesn't modify cookies

## Reference and Resources

For complete API documentation, visit the official Chrome Extensions documentation:

- **Main Documentation**: [developer.chrome.com/docs/extensions/reference/api/cookies](https://developer.chrome.com/docs/extensions/reference/api/cookies)
- **Cookie Security Guidelines**: [developer.chrome.com/docs/extensions/mv3/permission warnings/](https://developer.chrome.com/docs/extensions/mv3/permission_warnings/)
- **CHIPS Documentation**: [developer.chrome.com/docs/privacy/chips](https://developer.chrome.com/docs/privacy/chips)

### Additional Resources

- SameSite Cookie Changes: [chromestatus.com/feature/5088147344919552](https://chromestatus.com/feature/5088147344919552)
- Cookie Partitioning: [chromestatus.com/feature/5174877114707968](https://chromestatus.com/feature/5174877114707968)

## Summary

The Chrome Cookies API provides powerful capabilities for managing browser cookies across domains. Key takeaways:

- Always declare both `"cookies"` permission and appropriate host permissions
- Use `get()` for single cookies and `getAll()` with filters for bulk operations
- The `onChanged` event enables real-time monitoring of cookie changes
- Understand cookie stores for proper incognito mode handling
- Follow security best practices: use Secure, HttpOnly, and proper SameSite values
- Respect user privacy and be transparent about cookie access

With these fundamentals, you can build sophisticated cookie management tools, session managers, privacy utilities, and authentication helpers that enhance the browsing experience while maintaining security and privacy.
