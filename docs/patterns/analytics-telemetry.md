---
layout: default
title: "Chrome Extension Analytics Telemetry — Best Practices"
description: "Implement analytics and telemetry in extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/analytics-telemetry/"
---

# Extension Analytics and Telemetry

## Overview {#overview}

Understanding how users interact with your extension is critical for prioritizing features and catching regressions. However, Chrome extensions face unique constraints: no third-party analytics scripts in service workers, strict Content Security Policy, and heightened user expectations around privacy. This guide covers production patterns for building a privacy-respecting, first-party analytics system entirely within your extension.

> **Key principle:** Collect the minimum data needed to make product decisions. Never collect PII, browsing history, or page content. Always provide a clear opt-out.

---

## Pattern 1: Privacy-Respecting Analytics Architecture {#pattern-1-privacy-respecting-analytics-architecture}

Build a self-contained analytics layer that runs entirely in your service worker:

```ts
// analytics/core.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface AnalyticsEvent {
  name: string;
  properties: Record<string, string | number | boolean>;
  timestamp: number;
  sessionId: string;
}

interface AnalyticsConfig {
  endpoint: string;
  flushIntervalMs: number;
  maxBatchSize: number;
  enabled: boolean;
}

const schema = defineSchema({
  analyticsConsent: {
    granted: false,
    decidedAt: 0,
  },
  analyticsQueue: [] as AnalyticsEvent[],
  analyticsSession: {
    id: "",
    startedAt: 0,
  },
});

const storage = createStorage({ schema, area: "local" });

export class Analytics {
  private config: AnalyticsConfig;
  private sessionId = "";

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  async init() {
    const consent = await storage.get("analyticsConsent");
    if (!consent?.granted) {
      this.config.enabled = false;
      return;
    }

    // Generate or resume session
    const session = await storage.get("analyticsSession");
    const now = Date.now();
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    if (session?.id && now - session.startedAt < SESSION_TIMEOUT) {
      this.sessionId = session.id;
    } else {
      this.sessionId = crypto.randomUUID();
      await storage.set("analyticsSession", { id: this.sessionId, startedAt: now });
    }

    // Schedule periodic flush
    chrome.alarms.create("analytics-flush", {
      periodInMinutes: this.config.flushIntervalMs / 60_000,
    });
  }

  async track(name: string, properties: Record<string, string | number | boolean> = {}) {
    if (!this.config.enabled) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        extensionVersion: chrome.runtime.getManifest().version,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    const queue = (await storage.get("analyticsQueue")) ?? [];
    queue.push(event);
    await storage.set("analyticsQueue", queue);

    // Auto-flush if batch is full
    if (queue.length >= this.config.maxBatchSize) {
      await this.flush();
    }
  }

  async flush() {
    const queue = (await storage.get("analyticsQueue")) ?? [];
    if (queue.length === 0) return;

    // Clear the queue immediately to avoid double-sends
    await storage.set("analyticsQueue", []);

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: queue,
          sentAt: Date.now(),
        }),
      });

      if (!response.ok) {
        // Put events back on failure
        const current = (await storage.get("analyticsQueue")) ?? [];
        await storage.set("analyticsQueue", [...queue, ...current]);
      }
    } catch {
      // Network error — re-enqueue
      const current = (await storage.get("analyticsQueue")) ?? [];
      await storage.set("analyticsQueue", [...queue, ...current]);
    }
  }
}

// Singleton
export const analytics = new Analytics({
  endpoint: "https://api.yourextension.com/v1/events",
  flushIntervalMs: 5 * 60_000, // 5 minutes
  maxBatchSize: 25,
  enabled: true,
});
```

---

## Pattern 2: Event Tracking Without Third-Party Scripts {#pattern-2-event-tracking-without-third-party-scripts}

Chrome extensions cannot load remote scripts in service workers. All tracking must be first-party:

```ts
// analytics/tracker.ts

// Type-safe event catalog — define every event your extension can emit
type EventMap = {
  "extension.installed": { source: "store" | "sideload" | "update" };
  "extension.updated": { from: string; to: string };
  "feature.used": { feature: string; duration_ms?: number };
  "popup.opened": Record<string, never>;
  "popup.action": { action: string; target: string };
  "setting.changed": { key: string; value: string };
  "error.occurred": { code: string; message: string; fatal: boolean };
};

export function createTracker(analytics: Analytics) {
  return {
    track<K extends keyof EventMap>(event: K, properties: EventMap[K]) {
      return analytics.track(event, properties as Record<string, string | number | boolean>);
    },
  };
}

// background.ts — Wire up lifecycle events
const tracker = createTracker(analytics);

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    tracker.track("extension.installed", { source: "store" });
  } else if (details.reason === "update") {
    tracker.track("extension.updated", {
      from: details.previousVersion ?? "unknown",
      to: chrome.runtime.getManifest().version,
    });
  }
});
```

```ts
// popup.ts — Track popup interactions
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  "analytics:track": {
    request: { event: string; properties: Record<string, string | number | boolean> };
    response: void;
  };
};

const msg = createMessenger<Messages>();

// Popup cannot run analytics directly (short-lived), so relay to background
function trackPopupEvent(action: string, target: string) {
  msg.send("analytics:track", {
    event: "popup.action",
    properties: { action, target },
  });
}

document.getElementById("settings-btn")?.addEventListener("click", () => {
  trackPopupEvent("click", "settings-btn");
});
```

---

## Pattern 3: Feature Usage Measurement {#pattern-3-feature-usage-measurement}

Track which features are used, how often, and for how long:

```ts
// analytics/features.ts

interface FeatureTimer {
  feature: string;
  startedAt: number;
}

const activeTimers = new Map<string, FeatureTimer>();

export function startFeatureTimer(feature: string) {
  activeTimers.set(feature, { feature, startedAt: Date.now() });
}

export function stopFeatureTimer(feature: string): number | null {
  const timer = activeTimers.get(feature);
  if (!timer) return null;

  activeTimers.delete(feature);
  const duration = Date.now() - timer.startedAt;

  analytics.track("feature.used", {
    feature,
    duration_ms: duration,
  });

  return duration;
}

// Track feature adoption over time
export async function trackFeatureAdoption(feature: string) {
  const key = `feature_first_use_${feature}`;
  const result = await chrome.storage.local.get(key);

  if (!result[key]) {
    await chrome.storage.local.set({ [key]: Date.now() });
    analytics.track("feature.first_use", { feature });
  }

  analytics.track("feature.used", { feature });
}
```

```ts
// Usage in content script or popup
import { startFeatureTimer, stopFeatureTimer, trackFeatureAdoption } from "./analytics/features";

// Example: user opens the annotation tool
async function onAnnotationToolOpened() {
  await trackFeatureAdoption("annotation-tool");
  startFeatureTimer("annotation-tool");
}

function onAnnotationToolClosed() {
  const duration = stopFeatureTimer("annotation-tool");
  // duration is automatically tracked
}
```

---

## Pattern 4: Error Telemetry and Crash Reporting {#pattern-4-error-telemetry-and-crash-reporting}

Capture unhandled errors and report them without leaking sensitive data:

```ts
// analytics/errors.ts

interface ErrorReport {
  code: string;
  message: string;
  stack: string;
  context: string;
  fatal: boolean;
}

function sanitizeStack(stack: string): string {
  // Remove file paths that might contain usernames
  return stack.replace(/chrome-extension:\/\/[a-z]+\//g, "ext://");
}

function sanitizeMessage(message: string): string {
  // Strip potential PII like URLs, emails, file paths
  return message
    .replace(/https?:\/\/[^\s]+/g, "[URL]")
    .replace(/[\w.-]+@[\w.-]+/g, "[EMAIL]")
    .replace(/\/Users\/[^\s/]+/g, "/Users/[REDACTED]");
}

export function reportError(error: Error, context: string, fatal = false) {
  const report: ErrorReport = {
    code: error.name,
    message: sanitizeMessage(error.message),
    stack: sanitizeStack(error.stack ?? ""),
    context,
    fatal,
  };

  analytics.track("error.occurred", {
    code: report.code,
    message: report.message.slice(0, 200),
    context: report.context,
    fatal: report.fatal,
  });

  if (fatal) {
    // Flush immediately for fatal errors
    analytics.flush();
  }
}

// Global error handlers for the service worker
self.addEventListener("error", (event) => {
  reportError(
    event.error ?? new Error(event.message),
    "global:error",
    false
  );
});

self.addEventListener("unhandledrejection", (event) => {
  const error =
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
  reportError(error, "global:unhandledrejection", false);
});
```

```ts
// Wrap async handlers to catch errors automatically
export function withErrorReporting<T extends (...args: unknown[]) => Promise<unknown>>(
  context: string,
  fn: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      reportError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  }) as T;
}

// Usage
chrome.action.onClicked.addListener(
  withErrorReporting("action.onClicked", async (tab) => {
    // If this throws, it gets reported automatically
    await doSomethingWithTab(tab);
  })
);
```

---

## Pattern 5: Opt-In/Opt-Out Consent Management {#pattern-5-opt-inopt-out-consent-management}

Implement a transparent consent flow that respects user choice:

```ts
// consent.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

type ConsentStatus = "pending" | "granted" | "denied";

const schema = defineSchema({
  analyticsConsent: {
    status: "pending" as ConsentStatus,
    decidedAt: 0,
    version: 1, // Bump when privacy policy changes
  },
});

const storage = createStorage({ schema, area: "sync" });

const CURRENT_CONSENT_VERSION = 1;

export async function getConsentStatus(): Promise<ConsentStatus> {
  const consent = await storage.get("analyticsConsent");
  if (!consent || consent.version < CURRENT_CONSENT_VERSION) {
    return "pending";
  }
  return consent.status;
}

export async function setConsent(granted: boolean) {
  await storage.set("analyticsConsent", {
    status: granted ? "granted" : "denied",
    decidedAt: Date.now(),
    version: CURRENT_CONSENT_VERSION,
  });

  if (granted) {
    analytics.init();
    analytics.track("consent.granted", {});
  } else {
    // Purge any queued events
    await chrome.storage.local.remove([
      "analyticsQueue",
      "analyticsSession",
    ]);
    analytics.track("consent.denied", {}); // This won't send — analytics is off
  }
}

// Show consent prompt on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const status = await getConsentStatus();
    if (status === "pending") {
      // Open a dedicated consent page
      chrome.tabs.create({
        url: chrome.runtime.getURL("consent.html"),
      });
    }
  }
});
```

```html
<!-- consent.html — Clean, honest consent UI -->
<!DOCTYPE html>
<html>
<head>
  <title>Analytics Preferences</title>
  <style>
    body { font-family: system-ui; max-width: 480px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 1.4em; }
    .what-we-collect { background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .what-we-collect li { margin: 4px 0; }
    .actions { display: flex; gap: 12px; margin-top: 24px; }
    button { padding: 10px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; }
    .accept { background: #1a73e8; color: white; border: none; }
    .decline { background: white; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Help improve this extension</h1>
  <p>We collect anonymous usage data to understand which features matter most. Here is exactly what we track:</p>
  <div class="what-we-collect">
    <ul>
      <li>Which features you use (not what content you view)</li>
      <li>Crash reports and error counts</li>
      <li>Extension version and browser version</li>
    </ul>
  </div>
  <p><strong>We never collect:</strong> URLs you visit, page content, personal information, or browsing history.</p>
  <div class="actions">
    <button class="accept" id="accept">Allow analytics</button>
    <button class="decline" id="decline">No thanks</button>
  </div>
  <script src="consent.js"></script>
</body>
</html>
```

```ts
// consent.ts (UI script)
document.getElementById("accept")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "set-consent", granted: true });
  window.close();
});

document.getElementById("decline")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "set-consent", granted: false });
  window.close();
});
```

---

## Pattern 6: Batched Event Submission {#pattern-6-batched-event-submission}

Queue events locally and submit them in batches to reduce network overhead:

```ts
// analytics/batcher.ts

interface BatchConfig {
  maxSize: number;
  maxAgeMs: number;
  endpoint: string;
  headers?: Record<string, string>;
}

export class EventBatcher {
  private queue: AnalyticsEvent[] = [];
  private config: BatchConfig;

  constructor(config: BatchConfig) {
    this.config = config;

    // Flush on alarm
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "analytics-flush") {
        this.flush();
      }
    });

    // Flush before the service worker terminates
    // (best-effort — no guarantee this fires)
    self.addEventListener("beforeunload", () => {
      if (this.queue.length > 0) {
        this.flushSync();
      }
    });
  }

  async enqueue(event: AnalyticsEvent) {
    this.queue.push(event);

    // Persist to storage in case the service worker restarts
    await chrome.storage.local.set({
      analyticsQueue: this.queue,
    });

    if (this.queue.length >= this.config.maxSize) {
      await this.flush();
    }
  }

  async flush() {
    // Restore from storage (service worker may have restarted)
    const stored = await chrome.storage.local.get("analyticsQueue");
    const events: AnalyticsEvent[] = stored.analyticsQueue ?? [];

    if (events.length === 0) return;

    // Atomic swap: clear storage, then send
    await chrome.storage.local.set({ analyticsQueue: [] });
    this.queue = [];

    // Split into smaller batches if needed
    const CHUNK_SIZE = 50;
    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
      const chunk = events.slice(i, i + CHUNK_SIZE);
      await this.sendBatch(chunk);
    }
  }

  private async sendBatch(events: AnalyticsEvent[]): Promise<boolean> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify({
          batch: events,
          sentAt: new Date().toISOString(),
          sdk: "webext-analytics/1.0",
        }),
      });

      return response.ok;
    } catch {
      // Re-enqueue on failure
      const stored = await chrome.storage.local.get("analyticsQueue");
      const current: AnalyticsEvent[] = stored.analyticsQueue ?? [];
      await chrome.storage.local.set({
        analyticsQueue: [...events, ...current],
      });
      return false;
    }
  }

  /** Synchronous fallback using sendBeacon (last resort) */
  private flushSync() {
    if (this.queue.length === 0) return;
    const payload = JSON.stringify({ batch: this.queue });
    navigator.sendBeacon(this.config.endpoint, payload);
    this.queue = [];
  }
}
```

---

## Pattern 7: Session and Daily Active User Tracking {#pattern-7-session-and-daily-active-user-tracking}

Count active users without storing any user-identifying information:

```ts
// analytics/usage.ts

interface UsageStats {
  installId: string;        // Random ID, not tied to any account
  firstSeenDate: string;    // YYYY-MM-DD
  lastActiveDate: string;   // YYYY-MM-DD
  totalSessions: number;
  daysActive: number;
}

async function getOrCreateInstallId(): Promise<string> {
  const result = await chrome.storage.local.get("installId");
  if (result.installId) return result.installId;

  // Generate a random, non-identifying ID
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ installId: id });
  return id;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordDailyActive() {
  const installId = await getOrCreateInstallId();
  const today = todayString();

  const result = await chrome.storage.local.get("usageStats");
  const stats: UsageStats = result.usageStats ?? {
    installId,
    firstSeenDate: today,
    lastActiveDate: "",
    totalSessions: 0,
    daysActive: 0,
  };

  // Only count once per day
  if (stats.lastActiveDate === today) return;

  stats.lastActiveDate = today;
  stats.daysActive++;
  stats.totalSessions++;

  await chrome.storage.local.set({ usageStats: stats });

  analytics.track("dau.ping", {
    installId: stats.installId,
    daysActive: stats.daysActive,
    daysSinceInstall: daysBetween(stats.firstSeenDate, today),
  });
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

// Fire on service worker startup
chrome.runtime.onStartup.addListener(() => {
  recordDailyActive();
});

// Also fire on install/update
chrome.runtime.onInstalled.addListener(() => {
  recordDailyActive();
});
```

```ts
// Session tracking with idle detection
let sessionStart = Date.now();

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") {
    // User returned — start a new session
    sessionStart = Date.now();
    analytics.track("session.start", {});
  } else if (state === "idle" || state === "locked") {
    // User left — end the session
    const duration = Date.now() - sessionStart;
    analytics.track("session.end", {
      duration_ms: duration,
    });
  }
});

// Set idle detection threshold (seconds)
chrome.idle.setDetectionInterval(300); // 5 minutes
```

---

## Pattern 8: A/B Testing Infrastructure for Extensions {#pattern-8-ab-testing-infrastructure-for-extensions}

Run experiments to test UI variations and feature flags:

```ts
// analytics/experiments.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface Experiment {
  name: string;
  variants: string[];
  weights: number[];    // Must sum to 1.0
  active: boolean;
}

interface ExperimentAssignment {
  variant: string;
  assignedAt: number;
  experiment: string;
}

const schema = defineSchema({
  experimentAssignments: {} as Record<string, ExperimentAssignment>,
});

const storage = createStorage({ schema, area: "local" });

// Define experiments in code (or fetch from a server)
const EXPERIMENTS: Experiment[] = [
  {
    name: "onboarding-flow",
    variants: ["control", "streamlined", "interactive"],
    weights: [0.34, 0.33, 0.33],
    active: true,
  },
  {
    name: "popup-layout",
    variants: ["list", "grid"],
    weights: [0.5, 0.5],
    active: true,
  },
];

function selectVariant(experiment: Experiment): string {
  const rand = Math.random();
  let cumulative = 0;

  for (let i = 0; i < experiment.variants.length; i++) {
    cumulative += experiment.weights[i];
    if (rand < cumulative) {
      return experiment.variants[i];
    }
  }

  return experiment.variants[experiment.variants.length - 1];
}

export async function getVariant(experimentName: string): Promise<string | null> {
  const experiment = EXPERIMENTS.find((e) => e.name === experimentName);
  if (!experiment || !experiment.active) return null;

  const assignments = (await storage.get("experimentAssignments")) ?? {};

  // Return existing assignment if present (sticky bucketing)
  if (assignments[experimentName]) {
    return assignments[experimentName].variant;
  }

  // Assign a new variant
  const variant = selectVariant(experiment);
  assignments[experimentName] = {
    variant,
    assignedAt: Date.now(),
    experiment: experimentName,
  };

  await storage.set("experimentAssignments", assignments);

  analytics.track("experiment.assigned", {
    experiment: experimentName,
    variant,
  });

  return variant;
}

export async function trackExperimentExposure(experimentName: string) {
  const variant = await getVariant(experimentName);
  if (!variant) return;

  analytics.track("experiment.exposed", {
    experiment: experimentName,
    variant,
  });
}

export async function trackExperimentConversion(
  experimentName: string,
  metric: string,
  value: number = 1
) {
  const variant = await getVariant(experimentName);
  if (!variant) return;

  analytics.track("experiment.conversion", {
    experiment: experimentName,
    variant,
    metric,
    value,
  });
}
```

```ts
// Usage in popup or content script
const layout = await getVariant("popup-layout");

if (layout === "grid") {
  renderGridLayout();
} else {
  renderListLayout();
}

await trackExperimentExposure("popup-layout");

// When the user completes a desired action
document.getElementById("save-btn")?.addEventListener("click", async () => {
  await trackExperimentConversion("popup-layout", "save-click");
});
```

---

## Summary {#summary}

| Pattern | Use Case |
|---------|----------|
| Privacy-first architecture | Self-contained analytics with no third-party dependencies |
| First-party event tracking | Type-safe event catalog relayed through the service worker |
| Feature usage measurement | Track adoption rates and time-in-feature metrics |
| Error telemetry | Sanitized crash reports without leaking PII |
| Consent management | Transparent opt-in/opt-out with versioned privacy policy |
| Batched submission | Queue events locally and flush on a timer or threshold |
| DAU/session tracking | Count active users with anonymous install IDs |
| A/B testing | Sticky variant assignment with exposure and conversion tracking |

Extension analytics must be built from scratch because third-party scripts (Google Analytics, Mixpanel, etc.) cannot run in service workers. The patterns above give you the same capabilities -- event tracking, error reporting, experimentation -- while keeping the user in full control of their data.
