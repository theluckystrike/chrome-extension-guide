---
layout: default
title: "Chrome Extension Remote Config — How to Update Settings Without Republishing"
description: "Learn how to implement remote configuration for Chrome extensions to update settings, feature flags, and behavior without requiring users to reinstall or update your extension."
---
# Chrome Extension Remote Config — How to Update Settings Without Republishing

## Overview

Remote configuration (remote config) is a powerful pattern that allows you to modify your Chrome extension's behavior, settings, and features after it's been published to the Chrome Web Store—without going through the time-consuming review and update process. By fetching configuration values from an external endpoint, you can control feature toggles, set A/B test parameters, adjust UI behavior, roll out changes gradually, and fix critical bugs in real-time.

This guide covers everything you need to implement a robust remote config system in your Chrome extension, from basic setup to advanced patterns like feature flags and A/B testing.

## Why Remote Config Matters for Extensions

Chrome extensions have a unique deployment challenge: every update must go through Chrome Web Store review, which can take hours or even days. Unlike web applications where you can deploy instantly, extensions are bound by this review process. Remote config solves this problem by externalizing your configuration.

There are several compelling use cases for remote config. **Emergency toggles** let you instantly disable a feature that's causing issues without waiting for review. **Gradual rollouts** enable you to enable new features for a percentage of users first. **A/B testing** allows you to experiment with different UX approaches. **Region-specific behavior** helps you adapt features based on user location. Finally, **configuration synchronization** ensures all users get the same settings instantly across your user base.

Without remote config, you'd need to ship a new version for every configuration change, creating friction for both developers and users.

## Setting Up a Config Endpoint

The first step is creating an HTTP endpoint that your extension can query to retrieve configuration values. This endpoint should return JSON and be accessible over HTTPS.

A simple config endpoint might return:

```json
{
  "version": 1,
  "features": {
    "darkMode": true,
    "newDashboard": "enabled",
    "apiRateLimit": 100
  },
  "messages": {
    "welcomeBanner": "Welcome to our extension!",
    "upgradePrompt": "Upgrade to Pro for unlimited features"
  }
}
```

For production use, consider using established services like Firebase Remote Config, AWS AppConfig, or LaunchDarkly. These platforms provide version control, rollback capabilities, and targeting rules out of the box. For simpler needs, a basic JSON file hosted on any static hosting service works fine.

When designing your config structure, organize settings by category and use semantic versioning for the config itself so your extension can detect changes.

## Fetching and Caching Config Values

Your extension should fetch remote config during initialization and cache it locally to avoid making network requests on every extension load. Here's a practical implementation pattern:

```typescript
// config.ts
const CONFIG_ENDPOINT = 'https://your-api.com/config.json';
const CACHE_KEY = 'remote_config_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface RemoteConfig {
  version: number;
  features: Record<string, any>;
  messages: Record<string, string>;
}

async function fetchRemoteConfig(): Promise<RemoteConfig | null> {
  try {
    const response = await fetch(CONFIG_ENDPOINT);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch remote config:', error);
    return null;
  }
}

async function getConfig(): Promise<RemoteConfig> {
  const cached = await chrome.storage.local.get(CACHE_KEY);
  const now = Date.now();
  
  // Return cached if valid and not expired
  if (cached[CACHE_KEY] && 
      now - cached[CACHE_KEY].timestamp < CACHE_DURATION_MS) {
    return cached[CACHE_KEY].data;
  }
  
  // Fetch fresh config
  const freshConfig = await fetchRemoteConfig();
  if (freshConfig) {
    await chrome.storage.local.set({
      [CACHE_KEY]: {
        data: freshConfig,
        timestamp: now
      }
    });
    return freshConfig;
  }
  
  // Fallback to expired cache if fetch fails
  if (cached[CACHE_KEY]) {
    return cached[CACHE_KEY].data;
  }
  
  // Last resort: return defaults
  return getDefaultConfig();
}
```

This pattern ensures your extension remains functional even when network requests fail. The cache-first approach also improves performance by reducing latency on subsequent loads.

Consider using the Chrome Alarms API to periodically refresh config in the background:

```typescript
chrome.alarms.create('configRefresh', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'configRefresh') {
    fetchRemoteConfig().then(config => {
      if (config) {
        chrome.storage.local.set({ 
          [CACHE_KEY]: { data: config, timestamp: Date.now() } 
        });
      }
    });
  }
});
```

## Fallback Defaults for Offline Use

Always design your config system with sensible defaults embedded in your extension code. Users may be offline, your API might be down, or network requests might be blocked by corporate firewalls. Your extension should work seamlessly in these scenarios.

Define default values as constants in your code:

```typescript
const DEFAULT_CONFIG = {
  features: {
    darkMode: false,
    experimentalFeatures: false,
    maxResults: 50,
    syncEnabled: true
  },
  ui: {
    theme: 'system',
    language: 'en',
    showTutorial: true
  },
  limits: {
    apiRateLimit: 60,
    maxBookmarks: 1000,
    cacheSize: 50
  }
};

function getDefaultConfig(): RemoteConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}
```

When accessing config values, use a helper function that merges remote config with defaults:

```typescript
function getFeatureFlag(key: string, defaultValue: boolean): boolean {
  const config = getConfigSync();
  if (config?.features && key in config.features) {
    return config.features[key];
  }
  return DEFAULT_CONFIG.features[key] ?? defaultValue;
}
```

This defensive approach ensures your extension never crashes due to missing config values, regardless of network conditions.

## Security Considerations

Security is critical when fetching and applying remote configuration. Attackers could potentially compromise your config endpoint to inject malicious values that affect all your users.

**Always use HTTPS.** Never fetch config over plain HTTP, as it's vulnerable to man-in-the-middle attacks. Chrome will also block requests to HTTP endpoints in extensions by default.

**Validate incoming config data.** Don't trust the remote endpoint blindly. Validate the structure and types of config values before using them:

```typescript
function validateConfig(config: unknown): config is RemoteConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  if (typeof c.version !== 'number') return false;
  if (!c.features || typeof c.features !== 'object') return false;
  return true;
}

async function getConfig(): Promise<RemoteConfig> {
  const raw = await fetchRemoteConfig();
  if (!raw || !validateConfig(raw)) {
    console.warn('Invalid config received, using defaults');
    return getDefaultConfig();
  }
  return raw;
}
```

**Implement request signing** for high-security use cases. Include a signature or hash in your config response that your extension can verify before applying any settings.

**Be cautious with code execution.** Never use `eval()` or `new Function()` with config values, even if they come from your own server. Treat all config as data, not code.

## Using with Feature Flags and A/B Testing

Remote config provides the foundation for sophisticated feature management strategies. Here's how to leverage it for feature flags and experiments.

**Simple feature flags** let you toggle features on or off:

```typescript
const FEATURE_FLAGS = {
  newDashboard: 'enabled',  // 'enabled', 'disabled', 'rollout'
  aiAssistant: 'rollout',   // rollout with percentage
};

function isFeatureEnabled(flag: string): boolean {
  const config = getConfigSync();
  const flagValue = config?.features?.[flag];
  
  if (flagValue === 'enabled') return true;
  if (flagValue === 'disabled') return false;
  
  // Handle rollout percentage
  if (typeof flagValue === 'number' && flagValue > 0) {
    const userId = getUserHash(); // Consistent user identifier
    const bucket = userId % 100;
    return bucket < flagValue;
  }
  
  return false;
}
```

**A/B testing** becomes straightforward with remote config. Assign users to test groups server-side and deliver the group assignment through config:

```typescript
interface ExperimentConfig {
  experiments: {
    onboardingFlow: {
      variant: 'control' | 'treatment-a' | 'treatment-b';
      rolloutPercentage: number;
    };
    pricingDisplay: {
      variant: 'monthly' | 'annual';
    };
  };
}

function getExperimentVariant(experimentName: string): string {
  const config = getConfigSync();
  const experiment = config?.experiments?.[experimentName];
  return experiment?.variant ?? 'control';
}
```

Track experiment results through your analytics system, then analyze performance to determine winners. Remote config makes it easy to roll out winning variants to everyone while disabling underperforming treatments.

## Conclusion

Remote configuration is an essential pattern for production Chrome extensions. By externalizing your settings, you gain the flexibility to respond to issues instantly, experiment with features safely, and deliver personalized experiences to your users—all without the delays of the Chrome Web Store review process.

Start with a simple JSON endpoint and basic caching, then evolve toward成熟的 solutions like Firebase Remote Config or dedicated feature flag platforms as your needs grow. Remember to always prioritize security through HTTPS and input validation, and design for failure with robust fallback defaults.

With remote config in place, your extension becomes truly dynamic—adapting to user needs and business requirements long after the initial publish.

## Related Articles

- [Feature Flags](../patterns/feature-flags.md) - Toggle features on/off
- [Extension Feature Flags Implementation](../patterns/extension-feature-flags-impl.md) - Detailed flag patterns
- [A/B Testing](../patterns/extension-ab-testing.md) - Experiment with variants
- [Crash Reporting](./crash-reporting.md) - Monitor remote config errors
- [Alarms Scheduling](../guides/alarms-scheduling.md) - Periodic config refresh
- [Storage API](../permissions/storage.md) - Cache configuration locally


---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://bestchromeextensions.com/extension-monetization-playbook/monetization/stripe-integration), subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
