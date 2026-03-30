---
layout: guide
title: "Chrome Extension Feature Flags. How to Roll Out Features Safely"
description: "Learn how to implement feature flags in Chrome extensions for safe, controlled feature rollouts, A/B testing, and emergency kill switches."
last_modified_at: 2026-01-15
---

Chrome Extension Feature Flags. How to Roll Out Features Safely

Feature flags (also known as feature toggles) are a powerful engineering practice that allows you to enable or disable functionality in your extension without deploying new code. Instead of shipping a new version every time you want to test a feature or respond to a critical bug, you can toggle behavior dynamically. This guide covers everything you need to implement feature flags in your Chrome extension.

What Are Feature Flags and Why Extensions Need Them

Feature flags are configuration values that control which code paths execute in your extension. At their simplest, they're boolean values that your code checks before running certain functionality. When the flag is `true`, the feature runs; when `false`, it's skipped or replaced with alternative behavior.

Chrome extensions particularly benefit from feature flags for several reasons. First, Chrome Web Store review times are unpredictable. a critical bug fix might take days to get approved. With feature flags, you can disable problematic functionality immediately without waiting for a new release. Second, extensions run across millions of users with different Chrome versions, OS configurations, and usage patterns. flags let you gradually roll out features to catch issues before they affect everyone. Third, A/B testing in extensions requires flags to show different experiences to different user groups.

Beyond release management, feature flags enable ops-driven controls like kill switches for emergency situations, percentage-based rollouts for gradual adoption, and user segmentation to target specific audiences.

Implementing Feature Flags with chrome.storage.sync

The most solid way to store feature flags in Chrome extensions is using `chrome.storage.sync`. This API synchronizes data across all instances of the extension where the user is signed into Chrome, ensuring consistent behavior across devices.

Here's a foundational implementation:

```javascript
// feature-flags.js. Core feature flag system

const FeatureFlags = {
  // Default flag values. these serve as fallbacks
  defaults: {
    newDashboard: false,
    darkModePreview: false,
    experimentalAPIs: false,
    betaAnalytics: false,
  },

  // Cache for synchronous access
  cache: null,

  // Initialize flags from storage
  async init() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['featureFlags'], (result) => {
        this.cache = { ...this.defaults, ...result.featureFlags };
        resolve(this.cache);
      });
    });
  },

  // Get a specific flag value
  isEnabled(flagName) {
    if (this.cache === null) {
      console.warn('FeatureFlags not initialized. using default');
      return this.defaults[flagName] ?? false;
    }
    return this.cache[flagName] ?? false;
  },

  // Update a flag value
  async setFlag(flagName, value) {
    return new Promise((resolve) => {
      const update = { [`featureFlags.${flagName}`]: value };
      chrome.storage.sync.set(update, () => {
        this.cache[flagName] = value;
        resolve();
      });
    });
  },

  // Listen for changes from other extension instances
  onChanged(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.featureFlags) {
        this.cache = { ...this.cache, ...changes.featureFlags.newValue };
        callback(changes.featureFlags);
      }
    });
  },
};
```

This implementation provides synchronous reads after initialization, automatic sync across devices, and change listeners to update in real-time when flags change.

Server-Side vs Client-Side Flags

Understanding the distinction between server-side and client-side feature flags is crucial for choosing the right approach.

Client-side flags are stored in `chrome.storage` and controlled entirely by your extension code. They're perfect for extension-specific features, UI experiments, and any flags that don't require external coordination. The implementation above is entirely client-side. Advantages include zero network latency, offline functionality, and simplicity.

Server-side flags live on your backend and are fetched by the extension. Use these when you need centralized control across multiple platforms (web app, mobile, extension), want real-time updates without requiring users to restart the extension, or need sophisticated targeting rules that change frequently.

```javascript
// Fetching server-side flags
async function fetchServerFlags() {
  try {
    const response = await fetch('https://api.yourdomain.com/flags');
    const serverFlags = await response.json();
    
    // Merge with local defaults and storage
    const localFlags = await getLocalFlags();
    return { ...localFlags, ...serverFlags };
  } catch (error) {
    console.error('Failed to fetch server flags:', error);
    return getLocalFlags();
  }
}
```

For most extension use cases, client-side flags are sufficient and preferable due to their reliability and simplicity. Use server-side flags only when you have a specific need for centralized control.

Gradual Rollouts and Percentage-Based Flags

Percentage-based rollouts let you enable a feature for a subset of users, gradually increasing the percentage as confidence grows. The key is deterministically assigning users to buckets so they always get the same experience.

```javascript
// Percentage-based rollout implementation
function getRolloutBucket(userId, flagName) {
  // Create a deterministic hash from user ID and flag name
  const input = `${userId}-${flagName}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to 0-100 range
  const bucket = Math.abs(hash) % 100;
  return bucket;
}

async function isFeatureEnabledForUser(flagName, percentage) {
  const userId = await getUserId(); // Get consistent user identifier
  const bucket = getRolloutBucket(userId, flagName);
  return bucket < percentage;
}
```

For extensions without user accounts, you can use `chrome.runtime.id` as a pseudo-user identifier. It's consistent per installation but won't provide true user identity across devices.

Kill Switches for Emergency Disabling

Kill switches are critical feature flags that can immediately disable problematic functionality across all users. Design your extension to check kill switch flags early in execution and gracefully degrade when triggered.

```javascript
// Kill switch implementation
const KillSwitches = {
  async checkAll() {
    const flags = await FeatureFlags.init();
    
    // Check for emergency disables
    if (flags.emergencyDisableAll) {
      return { enabled: false, reason: 'emergency_disable' };
    }
    
    if (flags.disableNewFeatures) {
      return { enabled: false, reason: 'new_features_disabled' };
    }
    
    return { enabled: true, reason: null };
  },

  // Wrap feature code with kill switch check
  async withFeature(flagName, featureCallback, fallbackCallback) {
    const checks = await this.checkAll();
    if (!checks.enabled) {
      console.log(`Feature ${flagName} disabled: ${checks.reason}`);
      return fallbackCallback ? fallbackCallback() : null;
    }
    
    if (!FeatureFlags.isEnabled(flagName)) {
      return fallbackCallback ? fallbackCallback() : null;
    }
    
    return featureCallback();
  },
};
```

When implementing kill switches, ensure they work even when the extension fails to load properly. Consider storing critical kill switches in `chrome.storage.local` with a very small keyset so it loads fast.

Managing Flag Lifecycle

Feature flags require ongoing maintenance. Without a clear lifecycle, they'll accumulate and become technical debt.

Phase 1: Testing. Enable flags for internal users or a small test group. Validate the feature works correctly and doesn't cause regressions.

Phase 2: Gradual Rollout. Increase the percentage incrementally, monitoring error rates and user feedback at each stage. Stop if issues appear.

Phase 3: Full Rollout. Once confident, enable for 100% of users. Keep the flag in place for a cooling period.

Phase 4: Cleanup. Remove the flag and all conditional code paths. This is often forgotten but essential for long-term maintainability. Set calendar reminders to review flags quarterly and remove unused ones.

Document each flag with its purpose, owner, and planned cleanup date:

```javascript
// Flag metadata (store in a separate configuration)
const FLAG_METADATA = {
  newDashboard: {
    description: 'Redesigned dashboard with analytics',
    owner: 'feature-team',
    rolloutPercent: 50,
    cleanupDate: '2025-06-01',
  },
  experimentalAPIs: {
    description: 'Access to experimental Chrome APIs',
    owner: 'platform-team',
    rolloutPercent: 10,
    cleanupDate: '2025-04-15',
  },
};
```

Feature flags transform how you ship Chrome extensions. from risky big-bang releases to incremental, controlled changes. Start with simple boolean flags stored in `chrome.storage.sync`, add percentage-based rollouts as you mature, and always have kill switches ready for emergencies. Your users (and your on-call rotation) will thank you.
