---
layout: default
title: "Chrome Extension Feature Flags — Best Practices"
description: "Implement feature flags for gradual rollout and testing."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/feature-flags/"
---

# Feature Flag Patterns

## Overview {#overview}

Feature flags enable enabling or disabling functionality without deploying new versions. They support gradual rollouts, A/B testing, and kill switches for emergency response. Essential for extensions with large user bases where instant updates aren't feasible.

For server-side configuration and remote flag management, see [Remote Config](../guides/remote-config.md).

---

## Local Feature Flags {#local-feature-flags}

Store flags in `chrome.storage.local` or `chrome.storage.sync`. Define defaults in code, then override from storage if present.

```js
// defaults.js
const DEFAULT_FLAGS = {
  newUI: { default: false, description: 'New popup design' },
  darkMode: { default: true, description: 'Dark mode support' },
  aiFeature: { default: false, description: 'AI writing helper' }
};

class LocalFlagManager {
  constructor(namespace = 'flags') {
    this.namespace = namespace;
    this.cache = null;
  }

  async init() {
    const stored = await chrome.storage.local.get(this.namespace);
    this.cache = { ...DEFAULT_FLAGS, ...stored[this.namespace] };
    return this.cache;
  }

  get(name) {
    if (!this.cache) throw new Error('FlagManager not initialized');
    return this.cache[name]?.value ?? DEFAULT_FLAGS[name]?.default ?? false;
  }

  async set(name, value) {
    this.cache[name] = { ...this.cache[name], value };
    await chrome.storage.local.set({ [this.namespace]: this.cache });
  }
}
```

Toggle via options page or developer console. Good for beta features and user preferences.

---

## Remote Feature Flags {#remote-feature-flags}

Fetch flag config from your server periodically. Cache with TTL in `chrome.storage.local`. Use `chrome.alarms` for periodic refresh.

```js
class RemoteFlagManager {
  constructor(endpoint, ttlMinutes = 15) {
    this.endpoint = endpoint;
    this.ttl = ttlMinutes * 60 * 1000;
    this.flags = {};
  }

  async fetch() {
    try {
      const resp = await fetch(this.endpoint);
      const data = await resp.json();
      this.flags = data.flags || {};
      await chrome.storage.local.set({
        remoteFlags: this.flags,
        flagsTimestamp: Date.now()
      });
      return this.flags;
    } catch (e) {
      return this.getCached();
    }
  }

  async getCached() {
    const { remoteFlags, flagsTimestamp } = await chrome.storage.local.get(['remoteFlags', 'flagsTimestamp']);
    if (Date.now() - flagsTimestamp < this.ttl) {
      return remoteFlags || {};
    }
    return {};
  }

  get(name, defaultValue = false) {
    return this.flags[name] ?? defaultValue;
  }
}

// Setup periodic refresh
chrome.alarms.create('refreshFlags', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshFlags') remoteManager.fetch();
});
```

Fallback to cached values when offline. Check on extension startup.

---

## Flag Evaluation {#flag-evaluation}

Check flag before rendering feature UI. Gate API calls behind flags. Conditional content script injection based on flags.

```js
// In service worker or popup
async function initFeatureFlags() {
  const local = await localFlags.init();
  const remote = await remoteFlags.fetch();
  return { ...local, ...remote };
}

// Usage before rendering
async function renderPopup() {
  const flags = await initFeatureFlags();
  if (flags.newUI) {
    renderNewDesign();
  } else {
    renderLegacyDesign();
  }
}
```

Support user-level overrides by checking local storage first, then remote, then defaults.

---

## Gradual Rollout {#gradual-rollout}

Hash extension installation ID for consistent bucketing. Enable for X% of users. Increase percentage over time.

```js
function getBucket(installId, flagName, percentage) {
  const str = `${installId}:${flagName}`;
  const hash = Array.from(str).reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
  const bucket = Math.abs(hash) % 100;
  return bucket < percentage;
}

async function shouldEnableFlag(flagName, percentage) {
  const { installId } = await chrome.storage.local.get('installId');
  if (!installId) return false;
  return getBucket(installId, flagName, percentage);
}

// Usage
const rollout = await shouldEnableFlag('newUI', 10); // 10% rollout
```

Monitor error rates per flag state to detect issues early.

---

## Kill Switch Pattern {#kill-switch-pattern}

Remote flag that disables broken features immediately. Check on extension startup and periodically. Faster than Chrome Web Store update cycle.

```js
class KillSwitch {
  constructor() {
    this.criticalFlags = ['aiFeature', 'paymentIntegration', 'syncAPI'];
  }

  async check() {
    const remote = await remoteFlags.getCached();
    for (const flag of this.criticalFlags) {
      if (remote[flag] === false) {
        console.warn(`KILL SWITCH: ${flag} disabled remotely`);
        await this.disableFeature(flag);
      }
    }
  }

  async disableFeature(flagName) {
    await chrome.storage.local.set({ [`${flagName}_enabled`]: false });
  }

  isEnabled(flagName) {
    return chrome.storage.local.get([`${flagName}_enabled`]);
  }
}
```

Critical for production incident response. Always check on startup.

---

## Developer/Debug Flags {#developerdebug-flags}

Special flags for development and testing. Enable verbose logging, mock data, debug UI.

```js
const DEBUG_FLAGS = {
  verboseLogging: { default: false, env: 'development' },
  mockAPIResponses: { default: false, env: 'development' },
  showDebugPanel: { default: false, env: 'development' }
};

function isDevMode() {
  return !chrome.runtime.id.startsWith('*') && !chrome.runtime.id;
}
```

Never ship with debug flags enabled in production. Use build environment checks.

---

## Cross-References {#cross-references}

- [State Management](./state-management.md) - Persisting flag state
- [Update Migration](./update-migration.md) - Handling flag schema changes
- [Extension Updates](../guides/extension-updates.md) - Update patterns
- [Remote Config](../guides/remote-config.md) - Server-side configuration
- [A/B Testing](./extension-ab-testing.md) - Experiment with variants
- [Crash Reporting](../guides/crash-reporting.md) - Monitor flag-related errors
- [Alarms API](../permissions/alarms.md) - Periodic flag refresh

---

## Summary {#summary}

| Flag Type | Storage | Use Case |
|-----------|---------|----------|
| Local | `chrome.storage` | User preferences, beta features |
| Remote | Server + cache | Rollouts, kill switches, A/B tests |
| Debug | Code/environment | Development, testing |
