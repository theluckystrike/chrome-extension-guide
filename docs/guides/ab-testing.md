---
layout: guide
title: Chrome Extension A/B Testing — How to Test Features and Optimize Conversions
description: Learn how to implement A/B testing in Chrome extensions to experiment with features, optimize user experience, and make data-driven development decisions.
---

# Chrome Extension A/B Testing — How to Test Features and Optimize Conversions

A/B testing is an essential methodology for making data-driven decisions in Chrome extension development. By comparing different versions of features, UI elements, or user flows, you can understand what resonates with your users and optimize for better engagement, conversion rates, and overall satisfaction. This guide covers the complete implementation of A/B testing in Chrome extensions, from basic concepts to advanced statistical analysis.

## Why A/B Test in Extensions

Chrome extensions present unique opportunities and challenges for experimentation. Unlike traditional web applications, extensions have direct access to user browser behavior, can run in the background, and interact with web pages in powerful ways. This creates richer data sources for understanding user behavior while also requiring careful consideration of privacy and performance.

Extensions benefit from A/B testing in several key areas. First, you can test different onboarding flows to improve installation completion rates. Second, you can experiment with UI variations in popups, side panels, or options pages to maximize engagement. Third, you can test feature introductions without disrupting existing users. Fourth, you can optimize monetization strategies, including premium feature placement and pricing presentations.

The direct relationship with users through extensions provides higher intent signals than typical web properties. Users actively choose to install your extension, indicating genuine interest in your offering. This makes your user base particularly valuable for experimentation, as small improvements in conversion or engagement can translate to significant long-term retention gains.

## Setting Up Experiments with chrome.storage

The foundation of any extension experimentation system is reliable storage for experiment configuration and user assignment. Chrome's storage API provides the persistence layer needed to maintain consistent user experience across sessions while allowing centralized configuration updates.

Start by creating an experiment framework that handles variant assignment and persistence:

```javascript
// src/experiments/manager.js
class ExperimentManager {
  constructor() {
    this.storageKey = 'experiment_state';
  }

  async getVariant(experimentId, variants) {
    // Check if user already has an assignment
    const state = await chrome.storage.local.get(this.storageKey);
    const experiments = state[this.storageKey] || {};
    
    if (experiments[experimentId]) {
      return experiments[experimentId];
    }
    
    // Assign new variant using deterministic hashing
    const userId = await this.getUserId();
    const variantIndex = this.hashToIndex(userId + experimentId, variants.length);
    const variant = variants[variantIndex];
    
    // Persist the assignment
    experiments[experimentId] = variant;
    await chrome.storage.local.set({
      [this.storageKey]: experiments
    });
# A/B Testing in Chrome Extensions

A comprehensive guide to implementing experiments and A/B testing in Chrome extensions to make data-driven decisions about feature development and user experience.

## Overview

A/B testing (or experimentation) allows you to compare different versions of features, UIs, or flows to determine which performs better. For Chrome extensions, experimentation requires unique considerations due to the browser environment, storage constraints, and Chrome Web Store policies. This guide covers building a robust experimentation framework that respects user privacy while delivering meaningful insights.

## Why Experiment in Extensions?

Extensions benefit from experimentation because you have direct access to user interaction data that typical web applications lack. Users install extensions intentionally, indicating higher intent than casual website visitors. However, you must balance this against privacy expectations and Chrome Web Store policies that restrict certain data collection practices.

## Experiment Framework Setup

### Core Architecture

Build a modular experimentation system that handles group assignment, feature flag evaluation, and metrics collection. The framework should be flexible enough to support various experiment types while remaining lightweight enough for extension constraints.

```javascript
// src/experiments/framework.js
class ExperimentFramework {
  constructor() {
    this.experiments = new Map();
    this.userBuckets = new Map();
    this.featureFlags = new Map();
  }

  async initialize() {
    // Load cached buckets and flags from storage
    const stored = await chrome.storage.local.get(['experiments_cache']);
    if (stored.experiments_cache) {
      this.userBuckets = new Map(stored.experiments_cache.buckets);
      this.featureFlags = new Map(stored.experiments_cache.flags);
    }
    
    // Fetch latest experiment configuration
    await this.syncRemoteConfig();
    
    // Setup periodic sync (every 30 minutes)
    chrome.alarms.create('experiment_sync', { periodInMinutes: 30 });
  }

  async syncRemoteConfig() {
    try {
      const response = await fetch('https://api.yourextension.com/config/experiments');
      const config = await response.json();
      this.applyConfig(config);
    } catch (error) {
      console.warn('Failed to sync experiments:', error);
    }
  }

  applyConfig(config) {
    // Update experiment definitions
    this.experiments.clear();
    for (const exp of config.experiments) {
      this.experiments.set(exp.id, exp);
    }
    
    // Update feature flags
    this.featureFlags.clear();
    for (const flag of config.flags) {
      this.featureFlags.set(flag.key, flag.value);
    }
    
    // Persist to storage
    this.persistState();
  }

  persistState() {
    chrome.storage.local.set({
      experiments_cache: {
        buckets: Array.from(this.userBuckets.entries()),
        flags: Array.from(this.featureFlags.entries()),
        lastSync: Date.now()
      }
    });
  }
}
```

## Random Group Assignment

### Deterministic Bucketing

Use consistent hashing to assign users to experiment groups. This ensures users always see the same variant across sessions without storing assignments server-side.

```javascript
// src/experiments/bucketing.js
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function assignVariant(userId, experimentId, variants) {
  const hash = hashString(`${userId}:${experimentId}`);
  const bucket = hash % 100;
  
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.name;
    }
  }
  return variants[variants.length - 1].name;
}

// Usage
const userId = await getUserId();
const variant = assignVariant(userId, 'popup_redesign_2024', [
  { name: 'control', weight: 50 },
  { name: 'variant_a', weight: 25 },
  { name: 'variant_b', weight: 25 }
]);
```

### User Identification

Create anonymous user IDs that persist across sessions while respecting privacy requirements.

```javascript
// src/experiments/identity.js
async function getUserId() {
  const KEY = 'user_id';
  const result = await chrome.storage.local.get(KEY);
  
  if (result[KEY]) {
    return result[KEY];
  }
  
  // Generate anonymous ID
  const newId = crypto.randomUUID();
  await chrome.storage.local.set({ [KEY]: newId });
  return newId;
}
```

## Persistent User Bucketing

Store experiment assignments to ensure consistency throughout a user's session and across extension updates.

```javascript
// src/experiments/persistence.js
class PersistentBucketing {
  constructor(framework) {
    this.framework = framework;
  }

  async getVariant(experimentId) {
    const userId = await getUserId();
    
    // Check cached assignment first
    if (this.framework.userBuckets.has(`${userId}:${experimentId}`)) {
      return this.framework.userBuckets.get(`${userId}:${experimentId}`);
    }
    
    // Get experiment config
    const experiment = this.framework.experiments.get(experimentId);
    if (!experiment || !experiment.active) {
      return 'control';
    }
    
    // Assign variant
    const variant = assignVariant(userId, experimentId, experiment.variants);
    this.framework.userBuckets.set(`${userId}:${experimentId}`, variant);
    this.framework.persistState();
    
    // Track assignment
    this.trackAssignment(experimentId, variant);
    
    return variant;
  }

  async getUserId() {
    const state = await chrome.storage.local.get('user_id');
    if (state.user_id) return state.user_id;
    
    const newId = crypto.randomUUID();
    await chrome.storage.local.set({ user_id: newId });
    return newId;
  }

  hashToIndex(str, max) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % max;
  trackAssignment(experimentId, variant) {
    // Send to your analytics (privacy-respecting)
    this.framework.trackEvent('experiment_assigned', {
      experiment_id: experimentId,
      variant: variant,
      timestamp: Date.now()
    });
  }
}
```

This framework ensures users receive consistent variant assignments across sessions while supporting multiple concurrent experiments. The deterministic hashing approach means the same user always receives the same variant for a given experiment, eliminating the need for server-side assignment tracking.

## Using Remote Config for Variant Assignment

While local assignment works for basic experiments, production-grade systems benefit from remote configuration. This approach allows you to adjust variant distributions, add new experiments, or roll out features gradually without pushing extension updates through the Chrome Web Store.

Set up a remote configuration system that pulls experiment definitions from your backend:

```javascript
// src/experiments/remote-config.js
class RemoteConfigManager {
  constructor(configUrl) {
    this.configUrl = configUrl;
    this.cacheKey = 'remote_config_cache';
    this.cacheExpiry = 1000 * 60 * 60; // 1 hour
  }

  async fetchConfig() {
    const cached = await chrome.storage.local.get(this.cacheKey);
    
    if (cached[this.cacheKey] && 
        Date.now() - cached[this.cacheKey].timestamp < this.cacheExpiry) {
      return cached[this.cacheKey].data;
    }

    try {
      const response = await fetch(this.configUrl);
      const data = await response.json();
      
      await chrome.storage.local.set({
        [this.cacheKey]: {
          data,
          timestamp: Date.now()
        }
      });
      
      return data;
    } catch (error) {
      // Fall back to cached config on network failure
      return cached[this.cacheKey]?.data || { experiments: [] };
    }
  }

  async getExperimentConfig(experimentId) {
    const config = await this.fetchConfig();
    return config.experiments.find(e => e.id === experimentId);
  }
}
```

This system caches configuration locally to ensure offline functionality while periodically refreshing from your server. You can control rollout percentages by adjusting the traffic allocation in your remote configuration, enabling gradual feature deployment with the ability to pause immediately if issues arise.

## Tracking Metrics with Analytics

Meaningful experiments require robust event tracking. Your analytics implementation should capture user interactions, conversion events, and experiment-specific metrics while respecting user privacy and complying with Chrome Web Store policies.

Implement a flexible event tracking system:

```javascript
// src/analytics/tracker.js
class ExperimentTracker {
  constructor analyticsEndpoint) {
    this.endpoint = analyticsEndpoint;
    this.queue = [];
    this.sessionId = crypto.randomUUID();
  }

  async track(eventName, properties = {}) {
    const event = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      session_id: this.sessionId,
      extension_version: chrome.runtime.getManifest().version,
      experiment_variant: properties.experiment_variant
    };

    this.queue.push(event);
    
    // Flush queue periodically
    if (this.queue.length >= 10) {
      await this.flush();
## Server-Side Configuration

### Remote Config Pattern

Store experiment definitions server-side to enable dynamic adjustments without requiring extension updates.

```javascript
// Server response structure (config/experiments)
{
  "experiments": [
    {
      "id": "popup_design_v2",
      "name": "Popup Redesign",
      "active": true,
      "start_date": "2024-01-01",
      "end_date": "2024-02-01",
      "variants": [
        { "name": "control", "weight": 50 },
        { "name": "variant_a", "weight": 25 },
        { "name": "variant_b", "weight": 25 }
      ],
      "targeting": {
        "min_version": "1.0.0",
        "platforms": ["chrome"]
      }
    }
  ],
  "flags": [
    { "key": "new_feature_enabled", "value": true },
    { "key": "dark_mode_default", "value": false }
  ]
}
```

### Emergency Kill Switch

Always include the ability to disable experiments instantly from the server.

```javascript
applyConfig(config) {
  // Check for emergency disable
  if (config.global_kill_switch) {
    this.userBuckets.clear();
    this.featureFlags.clear();
    this.persistState();
    return;
  }
  
  // Normal config apply...
}
```

## Feature Flags

### Simple Flag Evaluation

Feature flags provide a simpler alternative to full experiments for gradual rollouts.

```javascript
// src/experiments/flags.js
class FeatureFlags {
  constructor(framework) {
    this.framework = framework;
  }

  async isEnabled(flagKey) {
    // Check local cache first for performance
    if (this.framework.featureFlags.has(flagKey)) {
      return this.framework.featureFlags.get(flagKey);
    }
    
    // Fetch from remote (debounced)
    await this.framework.syncRemoteConfig();
    return this.framework.featureFlags.get(flagKey) ?? false;
  }

  async withFeature(flagKey, callback) {
    if (await this.isEnabled(flagKey)) {
      return callback();
    }
    return null;
  }
}

// Usage in extension code
const flags = new FeatureFlags(framework);

// In popup.js
if (await flags.isEnabled('new_dashboard')) {
  renderNewDashboard();
} else {
  renderLegacyDashboard();
}
```

### Percentage Rollouts

Gradually enable features for a percentage of users.

```javascript
async function isEnabledForUser(flagKey, percentage) {
  const userId = await getUserId();
  const hash = hashString(userId);
  const bucket = hash % 100;
  return bucket < percentage;
}

// 10% rollout
if (await isEnabledForUser('experimental_feature', 10)) {
  enableFeature();
}
```

## Measuring Metrics

### Custom Metrics Tracking

Track metrics that matter for extension success beyond simple click-through rates.

```javascript
// src/experiments/metrics.js
class MetricsCollector {
  constructor(framework) {
    this.events = [];
  }

  trackMetric(name, value, properties = {}) {
    const metric = {
      name,
      value,
      properties,
      timestamp: Date.now(),
      extension_version: chrome.runtime.getManifest().version
    };
    
    this.events.push(metric);
    
    // Send batched (every 10 events or 30 seconds)
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      // Re-queue failed events
      this.queue = [...events, ...this.queue];
    if (this.events.length === 0) return;
    
    const payload = [...this.events];
    this.events = [];
    
    try {
      await fetch('https://api.yourextension.com/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Re-queue failed events
      this.events.push(...payload);
    }
  }
}
```

Track metrics that align with your business objectives, including primary conversion events, engagement indicators like feature usage frequency, retention measurements through repeat installation anniversary, and experiment-specific goals such as onboarding completion or settings configuration.

## Statistical Significance Basics

Understanding statistical significance prevents false conclusions from random variation. When comparing variants, you need enough data to distinguish genuine performance differences from noise.

Calculate statistical significance for your experiment results:

```javascript
// src/experiments/statistics.js
function calculateSignificance(control, treatment, totalControl, totalTreatment) {
  // Calculate conversion rates
  const rateControl = control / totalControl;
  const rateTreatment = treatment / totalTreatment;
  
  // Calculate standard error
  const pooledRate = (control + treatment) / (totalControl + totalTreatment);
  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1/totalControl + 1/totalTreatment)
  );
  
  // Calculate z-score
  const zScore = (rateTreatment - rateControl) / standardError;
  
  // Calculate p-value from z-score
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  
  // Determine significance (p < 0.05 is typically significant)
  const significant = pValue < 0.05;
  
  return {
    controlRate: rateControl,
    treatmentRate: rateTreatment,
    improvement: ((rateTreatment - rateControl) / rateControl) * 100,
    confidence: (1 - pValue) * 100,
    significant,
    sampleSize: totalControl + totalTreatment
  };
}

function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}
```

A common mistake is declaring winners too early. Always run experiments for a predetermined duration or sample size, and avoid peeking at results before reaching your planned endpoint. The more variants you test simultaneously, the larger your required sample size becomes to maintain statistical power.

## Common Pitfalls and Best Practices

Successful experimentation requires avoiding common mistakes that can invalidate your results or harm user experience.

One major pitfall is testing too many variants simultaneously. Each additional variant reduces your statistical power and requires proportionally more traffic to achieve significance. Limit concurrent experiments and prioritize your hypotheses based on potential impact.

Another issue is contaminated data from users who modify extension settings or clear storage mid-experiment. Implement proper user identification and consider excluding users with irregular behavior patterns from your analysis.

Avoid testing cosmetic changes that don't align with meaningful business outcomes. Focus experiments on features, flows, and messaging that could genuinely impact user value or conversion rather than minor visual tweaks that may produce statistically significant but practically meaningless results.

Always implement proper cleanup when experiments end. Remove experimental code paths, migrate users to the winning variant, and document your findings for future reference. This keeps your codebase clean and builds institutional knowledge about what works for your user base.

## Conclusion

A/B testing in Chrome extensions requires thoughtful implementation of storage, configuration, analytics, and statistical analysis. Start with simple local experiments to validate your framework, then scale to remote configuration for production flexibility. Track meaningful metrics that align with your business objectives, and always apply proper statistical rigor to avoid false conclusions.

The investment in robust experimentation pays dividends through continuous improvement of your extension's user experience and conversion performance. Each well-designed experiment builds knowledge about your users and guides product decisions with evidence rather than intuition.
### Key Metrics for Extensions

Focus on metrics that indicate genuine value delivery:

| Metric | Description | Target |
|--------|-------------|--------|
| DAU/MAU Ratio | Active usage frequency | > 30% |
| Feature Adoption | % using new features | > 20% |
| Session Duration | Time in popup/extension | > 30s |
| Retention D7/D30 | Day 7/30 retention | > 40%/20% |
| Uninstall Rate | Chrome Web Store metric | < 10% |

## Conversion Tracking

### Define Clear Conversions

Map your business goals to measurable conversion events.

```javascript
// src/experiments/conversions.js
const CONVERSION_EVENTS = {
  SIGNUP: 'conversion_signup',
  PREMIUM: 'conversion_premium',
  INVITE: 'conversion_invite',
  FEATURE_USE: 'conversion_feature_use',
  EXTENSION_SHARE: 'conversion_share'
};

async function trackConversion(eventType, value = 1) {
  const userId = await getUserId();
  
  // Get user's experiment assignments
  const assignments = getExperimentAssignments();
  
  const conversion = {
    event: eventType,
    value,
    user_id: userId,
    experiments: assignments,
    timestamp: Date.now(),
    url: window.location.href
  };
  
  await fetch('https://api.yourextension.com/conversions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conversion)
  });
}
```

### Attribution Window

Set appropriate attribution windows for your conversion cycle.

```javascript
// Attribution: 7-day click + 30-day view
const ATTRIBUTION_WINDOW = {
  click: 7 * 24 * 60 * 60 * 1000,  // 7 days
  view: 30 * 24 * 60 * 60 * 1000   // 30 days
};
```

## Popup Variant Testing

### Dynamic Popup Rendering

Test different popup designs by conditionally rendering components.

```javascript
// popup.js
async function initPopup() {
  const framework = await ExperimentFramework.getInstance();
  const variant = await framework.bucketing.getVariant('popup_redesign_v2');
  
  document.body.classList.add(`variant-${variant}`);
  
  switch (variant) {
    case 'variant_a':
      renderCompactLayout();
      break;
    case 'variant_b':
      renderExpandedLayout();
      break;
    default:
      renderControlLayout();
  }
  
  // Track popup views
  framework.metrics.trackMetric('popup_view', 1, { variant });
}
```

### Testing Popup Elements

```javascript
// Test different CTA button colors
async function getCtaVariant() {
  const framework = await ExperimentFramework.getInstance();
  return framework.bucketing.getVariant('popup_cta_color');
}

async function renderCta() {
  const variant = await getCtaVariant();
  const colors = {
    control: '#007bff',
    blue: '#0066cc',
    green: '#28a745',
    orange: '#fd7e14'
  };
  
  const button = document.getElementById('cta-button');
  button.style.backgroundColor = colors[variant] || colors.control;
}
```

## Onboarding Experiments

### Testing Onboarding Flows

Experiment with different onboarding approaches to improve activation rates.

```javascript
// onboarding.js
async function initOnboarding() {
  const framework = await ExperimentFramework.getInstance();
  const flow = await framework.bucketing.getVariant('onboarding_flow');
  
  switch (flow) {
    case 'quick_setup':
      renderQuickSetup();
      break;
    case 'detailed':
      renderDetailedOnboarding();
      break;
    case 'no_onboarding':
      skipOnboarding();
      return;
  }
  
  // Track onboarding completion
  document.getElementById('complete-btn').addEventListener('click', async () => {
    await framework.metrics.trackMetric('onboarding_complete', 1, { 
      flow,
      steps_completed: getStepsCompleted() 
    });
  });
}
```

### Measuring Activation

Define and track activation events that indicate successful onboarding.

```javascript
// Define activation events
const ACTIVATION_EVENTS = [
  'onboarding_complete',
  'first_feature_use',
  'settings_configured',
  'first_import'
];

async function checkActivation() {
  const userId = await getUserId();
  const activated = await chrome.storage.local.get('activated');
  
  if (!activated.activated) {
    const events = await chrome.storage.local.get(ACTIVATION_EVENTS);
    const hasActivated = ACTIVATION_EVENTS.some(e => events[e]);
    
    if (hasActivated) {
      await chrome.storage.local.set({ activated: true, activated_at: Date.now() });
      trackActivationMetric(userId);
    }
  }
}
```

## Analytics Integration

### Privacy-Preserving Analytics

Design your analytics to respect user privacy while gathering actionable insights.

```javascript
// src/experiments/analytics.js
class PrivacyRespectingAnalytics {
  constructor() {
    this.userId = null;
    this.doNotTrack = navigator.doNotTrack === '1';
  }

  async init() {
    if (this.doNotTrack) {
      console.log('Do Not Track enabled - limiting analytics');
      return false;
    }
    
    const consent = await chrome.storage.local.get('analytics_consent');
    if (!consent.analytics_consent) {
      return false;
    }
    
    this.userId = await getUserId();
    return true;
  }

  async track(event, properties = {}) {
    if (this.doNotTrack) return;
    
    // Anonymize data
    const payload = {
      event,
      user_id: this.hashUserId(this.userId),  // Hashed for privacy
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      extension_version: chrome.runtime.getManifest().version
    };
    
    await this.send(payload);
  }

  hashUserId(id) {
    // Simple hash - consider using HMAC in production
    return hashString(id).toString(36);
  }

  sanitizeProperties(props) {
    // Remove any potential PII
    const sanitized = { ...props };
    const piiKeys = ['email', 'name', 'phone', 'address'];
    for (const key of piiKeys) {
      delete sanitized[key];
    }
    return sanitized;
  }
}
```

### Integration with Analytics Platforms

```javascript
// Send to multiple platforms
async function sendToAnalytics(analytics, event, properties) {
  const promises = [];
  
  // Your own analytics
  promises.push(analytics.track(event, properties));
  
  // Server-side GA4 (via your backend)
  promises.push(fetch('/api/analytics/track', {
    method: 'POST',
    body: JSON.stringify({ event, properties })
  }));
  
  await Promise.allSettled(promises);
}
```

## Privacy-Respecting Experiments

### GDPR/CCPA Compliance

Ensure your experiments comply with privacy regulations.

```javascript
// src/experiments/privacy.js
class ExperimentPrivacy {
  static REQUIRED_CONSENTS = [
    'analytics',
    'experiments',
    'personalization'
  ];

  static async hasConsent() {
    const consent = await chrome.storage.local.get('consent');
    return ExperimentPrivacy.REQUIRED_CONSENTS.every(
      c => consent.consent?.[c] === true
    );
  }

  static async recordConsent(granted) {
    await chrome.storage.local.set({
      consent: {
        analytics: granted.analytics ?? false,
        experiments: granted.experiments ?? false,
        personalization: granted.personalization ?? false,
        timestamp: Date.now()
      }
    });
  }

  static async canRunExperiment(experiment) {
    // Check user consent
    if (!await ExperimentPrivacy.hasConsent()) {
      return false;
    }
    
    // Check if user opted out of experiments
    const settings = await chrome.storage.local.get('experiment_opt_out');
    if (settings.experiment_opt_out) {
      return false;
    }
    
    // Check geographic restrictions
    // Note: Use server-side geo-detection for accuracy
    return true;
  }
}
```

### Data Minimization

Collect only what you need for experiment analysis.

```javascript
// Good: Minimal data collection
{
  "event": "popup_click",
  "variant": "variant_a",
  "element": "cta_button",
  "timestamp": 1234567890
}

// Avoid: Excessive data
{
  "event": "popup_click",
  "user_id": "actual_user_id",  // Don't send real IDs
  "full_url": "https://...",    // Don't collect URLs
  "browser_history": []         // Never
}
```

## Code Examples

### Complete Experiment Hook

```javascript
// src/experiments/useExperiment.js
function useExperiment(experimentId) {
  const [variant, setVariant] = useState('control');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVariant() {
      const framework = await ExperimentFramework.getInstance();
      const v = await framework.bucketing.getVariant(experimentId);
      setVariant(v);
      setIsLoading(false);
    }
    loadVariant();
  }, [experimentId]);

  const track = (event, properties = {}) => {
    const framework = ExperimentFramework.getInstance();
    framework.metrics.trackMetric(event, 1, { 
      ...properties, 
      experiment_id: experimentId, 
      variant 
    });
  };

  return { variant, isLoading, track };
}
```

### React Component Example

{% raw %}
```javascript
// components/ExperimentWrapper.jsx
function ExperimentWrapper({ experimentId, children, variants }) {
  const { variant, isLoading, track } = useExperiment(experimentId);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  const Component = variants[variant] || variants.control;
  return <Component track={track} />;
}

// Usage
<ExperimentWrapper
  experimentId="popup_header_test"
  variants={{
    control: ControlHeader,
    variant_a: NewHeader,
    variant_b: MinimalHeader
  }}
/>
```
{% endraw %}

## Testing Experiments

### Local Testing

```javascript
// Debug mode - force variants
async function getVariantForTesting(experimentId, forceVariant) {
  if (forceVariant) {
    return forceVariant;
  }
  return framework.bucketing.getVariant(experimentId);
}

// Force variant via URL parameter
const urlParams = new URLSearchParams(window.location.search);
const forcedVariant = urlParams.get('experiment_variant');
```

### QA Checklist

- [ ] Verify all variants render correctly
- [ ] Test with fresh install (no cached assignment)
- [ ] Test with existing install (cached assignment)
- [ ] Verify metrics are being tracked
- [ ] Check experiment end date behavior
- [ ] Test emergency kill switch

## Reference Resources

For more information on Chrome extension development and best practices:

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/develop)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies)
- [Extension Privacy Guidelines](https://developer.chrome.com/docs/extensions/privacy)
- [Best Practices for Extension UX](https://developer.chrome.com/docs/extensions/ui)

## Best Practices Summary

1. **Start simple** - Begin with feature flags before complex A/B tests
2. **Clear hypotheses** - Define what you're testing and why
3. ** Adequate sample size** - Run experiments long enough for statistical significance
4. **Respect privacy** - Always get consent and minimize data collection
5. **Document learnings** - Store experiment results for future reference
6. **Monitor continuously** - Watch for issues and have kill switches ready
7. **Iterate** - Use learnings to design better experiments

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

