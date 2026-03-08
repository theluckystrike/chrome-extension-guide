---
layout: default
title: "Chrome Extension Extension Feature Flags Impl — Best Practices"
description: "Implement feature flags with storage and remote configuration."
---

# Extension Feature Flag Implementation

## Overview

Feature flags in Chrome extensions require specific implementations due to the extension's unique runtime model. This guide covers practical patterns for implementing flags in browser extensions.

---

## Local Flags

Store flags in `chrome.storage.local` or `chrome.storage.sync`. Local flags are toggled via an options page, ideal for user preferences and experimental features.

```js
// Feature flag manager
class FeatureFlagManager {
  constructor() {
    this.defaults = {
      newDashboard: { default: false, description: 'New dashboard UI' },
      advancedAnalytics: { default: true, description: 'Advanced analytics panel' },
      betaFeatures: { default: false, description: 'Enable beta features' }
    };
  }

  async init() {
    const stored = await chrome.storage.local.get('featureFlags');
    this.flags = { ...this.defaults, ...stored.featureFlags };
    return this.flags;
  }

  get(key) {
    return this.flags[key]?.value ?? this.defaults[key]?.default ?? false;
  }

  async toggle(key, value) {
    this.flags[key] = { ...this.flags[key], value };
    await chrome.storage.local.set({ featureFlags: this.flags });
  }
}

export const flagManager = new FeatureFlagManager();
```

Toggle flags in your options page with a simple checkbox UI.

---

## Build-Time Flags

Define flags at build time for different environments (dev, staging, prod). Use environment variables or build configuration.

```js
// build-config.js
const BUILD_FLAGS = {
  dev: { apiEndpoint: 'http://localhost:3000', debugMode: true },
  staging: { apiEndpoint: 'https://staging.api.com', debugMode: true },
  prod: { apiEndpoint: 'https://api.com', debugMode: false }
};

// Use with webpack DefinePlugin or similar
export const config = BUILD_FLAGS[process.env.NODE_ENV] || BUILD_FLAGS.dev;
```

Build-time flags cannot be changed at runtime but reduce bundle size by eliminating dead code.

---

## Remote Flags

Fetch flags from your server and cache locally. Use `chrome.alarms` for periodic refresh.

```js
class RemoteFlagService {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async fetch() {
    try {
      const resp = await fetch(this.endpoint);
      const data = await resp.json();
      await chrome.storage.local.set({
        remoteFlags: data.flags,
        flagsLastFetched: Date.now()
      });
      return data.flags;
    } catch (e) {
      return this.getCached();
    }
  }

  async getCached() {
    const { remoteFlags } = await chrome.storage.local.get('remoteFlags');
    return remoteFlags || {};
  }

  async shouldRefresh() {
    const { flagsLastFetched } = await chrome.storage.local.get('flagsLastFetched');
    return !flagsLastFetched || Date.now() - flagsLastFetched > 900000; // 15 min
  }
}

// Periodic refresh
chrome.alarms.create('flagRefresh', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flagRefresh') remoteService.fetch();
});
```

---

## Flag Types

### Boolean Flags
Simple on/off control for features.

### Percentage Rollout
Gradually enable for X% of users using consistent hashing.

```js
function getPercentageBucket(userId, flagName, percentage) {
  const hash = (userId + flagName).split('').reduce((a, c) => {
    return ((a << 5) - a) + c.charCodeAt(0);
  }, 0);
  return Math.abs(hash) % 100 < percentage;
}
```

### User Segment Flags
Target specific user groups (beta users, premium, etc.).

```js
async function getUserSegmentFlag(flagName) {
  const { userTier, isBetaTester } = await chrome.storage.local.get(['userTier', 'isBetaTester']);
  if (isBetaTester) return true;
  return userTier === 'premium';
}
```

---

## Default Values

Always define defaults for when storage is empty or a flag is missing.

```js
const DEFAULT_FLAGS = {
  newFeature: { default: false },
  rolloutPercentage: { default: 0 },
  targetSegment: { default: 'all' }
};

function getFlag(key, fallback = false) {
  return flags[key] ?? DEFAULT_FLAGS[key]?.default ?? fallback;
}
```

---

## Flag Evaluation

Check flags at feature entry points and gate entire code paths.

```js
async function initFeature() {
  const flags = await flagManager.init();
  
  if (!flags.newFeature) {
    return; // Early return if feature disabled
  }
  
  // Initialize feature
  registerEventListeners();
  renderUI();
}
```

---

## UI Gating

Conditionally render UI elements based on flag state.

```js
// In popup or options page
async function renderSettings() {
  const flags = await flagManager.init();
  
  if (flags.advancedAnalytics) {
    document.getElementById('analytics-panel').style.display = 'block';
  }
  
  if (flags.betaFeatures) {
    renderBetaSettingsSection();
  }
}
```

---

## Code Gating

Conditionally register event listeners or features.

```js
function registerFeatureHandlers() {
  flagManager.init().then(flags => {
    if (flags.newDashboard) {
      chrome.runtime.onMessage.addListener(handleDashboardMessage);
    }
    
    if (flags.analyticsTracking) {
      enableAnalytics();
    }
  });
}
```

---

## A/B Testing

Random assignment with persistent user bucket.

```js
async function assignUserBucket(experimentId, variants) {
  const { installId } = await chrome.storage.local.get('installId') || 
                        { installId: crypto.randomUUID() };
  
  const bucket = Math.abs(hash(installId + experimentId)) % 100;
  const variantIndex = bucket % variants.length;
  
  await chrome.storage.local.set({ [`exp_${experimentId}`]: variants[variantIndex] });
  return variants[variantIndex];
}
```

---

## Flag Lifecycle

1. **Experimental**: Limited internal testing, may be unstable
2. **Beta**: Broader testing, user opt-in
3. **Stable**: Available to all users
4. **Removed**: Feature is permanent or deprecated

Document flags with lifecycle status and planned removal date.

---

## Cleanup

Remove flag checks when features become permanent.

```js
// When newFeature is stable, remove the flag check:
// Before
if (flags.newFeature) renderNewUI();

// After (remove conditional)
// renderNewUI();

// Remove from flag configuration and defaults
```

---

## Developer Mode

Add an options page section for toggling experimental features.

```js
// DeveloperSettings component
function renderDevSettings(flags) {
  const container = document.getElementById('dev-settings');
  
  for (const [key, config] of Object.entries(EXPERIMENTAL_FLAGS)) {
    const toggle = createToggle(key, flags[key], (value) => {
      flagManager.toggle(key, value);
    });
    container.appendChild(toggle);
  }
}
```

---

## Analytics

Track flag state with usage events.

```js
function trackFeatureUsage(featureName, flags) {
  chrome.runtime.sendMessage({
    type: 'ANALYTICS_EVENT',
    event: 'feature_usage',
    data: {
      feature: featureName,
      flagState: flags[featureName],
      timestamp: Date.now()
    }
  });
}
```

---

## See Also

- [Feature Flags](./feature-flags.md)
- [Extension Configuration](./extension-configuration.md)
- [Chrome Extension Deployment Strategies](../guides/chrome-extension-deployment-strategies.md)
