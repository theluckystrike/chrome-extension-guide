---
layout: default
title: "Chrome Extension Extension Ab Testing. Best Practices"
description: "Implement A/B testing patterns for Chrome extensions to experiment with features."
canonical_url: "https://bestchromeextensions.com/patterns/extension-ab-testing/"
last_modified_at: 2026-01-15
---

A/B Testing Patterns for Chrome Extensions

Overview {#overview}

A/B testing (or experimentation) enables data-driven feature decisions by comparing user responses to different variants. Unlike feature flags that toggle on/off, experiments assign users to cohorts and measure outcomes. This pattern covers client-side experimentation with consistent bucketing, remote configuration, and analytics integration.

See also: [Feature Flags](./feature-flags.md), [Feature Flags Implementation](./extension-feature-flags-impl.md), [Analytics and Telemetry](./analytics-telemetry.md), [Remote Config](../guides/remote-config.md)

---

Consistent User Bucketing {#consistent-user-bucketing}

Assign users to variants consistently using deterministic hashing. The user's ID (extension install ID or anonymous token) combined with experiment ID produces a stable bucket.

```js
// utils/experiment-hash.js
export function getBucket(userId, experimentId, variantCount = 2) {
  const input = `${userId}:${experimentId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % variantCount;
}
```

This ensures the same user always lands in the same variant. Never use PII (email, name) as input, use only anonymous identifiers.

---

Experiment Manager Class {#experiment-manager-class}

Centralized manager to load experiments, assign variants, and persist assignments:

```js
// experiments/manager.js
import { getBucket } from '../utils/experiment-hash.js';

const EXPERIMENT_KEY = 'experiments';

class ExperimentManager {
  constructor() {
    this.experiments = {};
    this.assignments = {};
  }

  async init() {
    const stored = await chrome.storage.local.get(EXPERIMENT_KEY);
    this.assignments = stored[EXPERIMENT_KEY] || {};
    await this.syncRemote();
  }

  async syncRemote() {
    try {
      const resp = await fetch('https://api.example.com/experiments');
      const data = await resp.json();
      this.experiments = data.experiments || {};
      await chrome.storage.local.set({
        experimentsConfig: this.experiments,
        experimentsTimestamp: Date.now()
      });
    } catch (e) {
      const cached = await chrome.storage.local.get('experimentsConfig');
      this.experiments = cached.experimentsConfig || {};
    }
  }

  getVariant(experimentId, userId) {
    if (this.assignments[experimentId]) {
      return this.assignments[experimentId];
    }
    const exp = this.experiments[experimentId];
    if (!exp || !exp.active) return 'control';

    const bucket = getBucket(userId, experimentId, exp.variants.length);
    const variant = exp.variants[bucket];
    this.assignments[experimentId] = variant;
    chrome.storage.local.set({ [EXPERIMENT_KEY]: this.assignments });
    return variant;
  }
}

export const experimentManager = new ExperimentManager();
```

---

Variant Renderer {#variant-renderer}

Apply variants to UI consistently in content scripts or popup:

```js
// experiments/renderer.js
import { experimentManager } from './manager.js';

export async function renderWithVariant(rootElement, userId) {
  const variant = experimentManager.getVariant('new-onboarding-flow', userId);
  
  if (variant === 'control') {
    rootElement.innerHTML = '<div>Legacy onboarding</div>';
  } else if (variant === 'variant-a') {
    rootElement.innerHTML = '<div>New onboarding flow A</div>';
  } else if (variant === 'variant-b') {
    rootElement.innerHTML = '<div>New onboarding flow B</div>';
  }

  // Track exposure
  await analytics.track('experiment_exposure', {
    experiment: 'new-onboarding-flow',
    variant
  });
}
```

---

Analytics Integration {#analytics-integration}

Track experiment outcomes alongside variant assignment:

```js
// experiments/analytics.js
export async function trackConversion(userId, experimentId, metric) {
  const variant = experimentManager.getVariant(experimentId, userId);
  await analytics.track('experiment_conversion', {
    experiment: experimentId,
    variant,
    metric,
    timestamp: Date.now()
  });
}
```

Always include the variant in conversion events to enable segmented analysis.

---

Gradual Rollouts {#gradual-rollouts}

Use percentage-based gates for staged rollouts:

```js
getVariant(experimentId, userId) {
  const exp = this.experiments[experimentId];
  if (!exp || !exp.active) return 'control';
  
  const bucket = getBucket(userId, experimentId, 100);
  if (bucket >= (exp.rolloutPercent || 100)) {
    return 'control';
  }
  
  const variantBucket = getBucket(userId, experimentId, exp.variants.length);
  return exp.variants[variantBucket];
}
```

Start at 5-10%, monitor metrics, then increase. Always keep control group.

---

Experiment Lifecycle {#experiment-lifecycle}

| Phase | Actions |
|-------|---------|
| Design | Define hypothesis, metrics, sample size |
| Launch | Deploy with remote config, small % |
| Measure | Monitor variant performance, check for regressions |
| Conclude | Roll out winner, archive experiment, clean storage |

Archive concluded experiments and clear their assignments from storage to prevent stale data.

---

Privacy Considerations {#privacy-considerations}

- Never bucket by PII; use install ID or anonymous token
- Store assignments locally only; never send to analytics raw
- Provide opt-out in extension settings
- Minimum viable data: experiment ID, variant, timestamp only

---

Related Patterns {#related-patterns}

- [Feature Flags](./feature-flags.md) - Toggle features independently
- [Extension Feature Flags Implementation](./extension-feature-flags-impl.md) - Detailed flag patterns
- [Analytics and Telemetry](./analytics-telemetry.md) - Privacy-first analytics
- [Remote Config](../guides/remote-config.md) - Server-side configuration delivery
- [Crash Reporting](../guides/crash-reporting.md) - Monitor experiment errors
- [Storage API](../permissions/storage.md) - Persist experiment assignments
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
