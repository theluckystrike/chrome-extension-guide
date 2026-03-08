# Extension Onboarding Patterns

Onboarding is critical for Chrome extensions. Unlike web apps where users can immediately interact, extensions require installation, often need permissions, and users may be skeptical about granting access to their browser. A well-designed onboarding experience can dramatically improve activation rates, reduce uninstalls, and set the foundation for long-term engagement. This guide covers proven patterns for welcoming new users, educating them about features, and guiding them through initial setup.

## Table of Contents

- [First-Run Experience](#first-run-experience)
- [Welcome Page Patterns](#welcome-page-patterns)
- [Feature Tours and Tooltips](#feature-tours-and-tooltips)
- [Progressive Disclosure of Features](#progressive-disclosure-of-features)
- [Permission Requests](#permission-requests)
- [Tracking Onboarding Completion](#tracking-onboarding-completion)
- [A/B Testing Onboarding Flows](#ab-testing-onboarding-flows)
- [Examples from Popular Extensions](#examples-from-popular-extensions)

---

## First-Run Experience

The first-run experience begins the moment your extension is installed. Chrome provides the `chrome.runtime.onInstalled` event which fires when the extension is first installed, updated to a new version, or the browser restarts. This is your opportunity to initialize state and trigger onboarding flows.

### Detecting Fresh Installation

```ts
// background.ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First-time installation - show welcome flow
    initializeOnboarding();
  } else if (details.reason === "update") {
    // Extension was updated - show what's new
    showChangelog();
  }
});

async function initializeOnboarding() {
  // Set onboarding state
  await chrome.storage.local.set({
    onboardingComplete: false,
    onboardingStep: 0,
    installDate: Date.now(),
  });

  // Open welcome page in new tab
  chrome.tabs.create({
    url: "welcome.html",
    active: true,
  });
}
```

The `reason` parameter distinguishes between fresh installs, updates, and browser restarts. Never assume an install event means first-time use - always check the reason and possibly stored state to determine the appropriate flow.

---

## Welcome Page Patterns

Welcome pages provide dedicated space to explain your extension's value proposition, walk through key features, and collect any necessary configuration. Opening a new tab ensures users see the content prominently rather than hiding it in a small popup.

### Basic Welcome Page Flow

```ts
// welcome.html - Simple welcome page
const steps = [
  {
    title: "Welcome to [Extension Name]",
    content: "Your new tool for [primary benefit]",
    image: "/images/welcome-1.png",
  },
  {
    title: "How It Works",
    content: "We automatically [core functionality] when you [trigger]",
    image: "/images/welcome-2.png",
  },
  {
    title: "Getting Started",
    content: "Click the extension icon to enable features",
    image: "/images/welcome-3.png",
  },
];

let currentStep = 0;

function renderStep() {
  const step = steps[currentStep];
  document.getElementById("title").textContent = step.title;
  document.getElementById("content").textContent = step.content;
  document.getElementById("image").src = step.image;
  
  document.getElementById("prev").disabled = currentStep === 0;
  document.getElementById("next").textContent = 
    currentStep === steps.length - 1 ? "Get Started" : "Next";
}

function completeOnboarding() {
  chrome.storage.local.set({ onboardingComplete: true });
  chrome.runtime.sendMessage({ action: "onboardingComplete" });
  window.close();
}
```

### Welcome Page with Configuration

Many extensions need user input during onboarding. Create a welcome page that collects essential preferences before activating core functionality:

```ts
// Collect preferences before enabling full features
document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const preferences = {
    enableNotifications: document.getElementById("notifications").checked,
    defaultSettings: document.getElementById("defaults").value,
    trackingConsent: document.getElementById("analytics").checked,
  };
  
  await chrome.storage.local.set({
    preferences,
    onboardingComplete: true,
    onboardingStep: "completed",
  });
  
  // Notify background to enable features
  chrome.runtime.sendMessage({
    type: "ONBOARDING_COMPLETE",
    payload: preferences,
  });
  
  window.close();
});
```

---

## Feature Tours and Tooltips

Once users reach your extension's main interface (popup, side panel, or options page), feature tours guide them through specific capabilities. Content script-based tooltips can highlight page elements and provide contextual help.

### Popup-Based Feature Tour

```ts
// tour.ts - Overlay tour system
class FeatureTour {
  private steps: TourStep[] = [];
  private currentIndex = 0;
  private overlay: HTMLElement | null = null;

  constructor(steps: TourStep[]) {
    this.steps = steps;
  }

  start() {
    this.render();
    this.attachKeyboardHandlers();
  }

  private render() {
    const step = this.steps[this.currentIndex];
    
    // Remove existing overlay
    this.overlay?.remove();
    
    this.overlay = document.createElement("div");
    this.overlay.className = "tour-overlay";
    this.overlay.innerHTML = `
      <div class="tour-card" style="top: ${step.position.y}px; left: ${step.position.x}px">
        <h3>${step.title}</h3>
        <p>${step.content}</p>
        <div class="tour-actions">
          <button id="tour-skip">Skip</button>
          <span class="tour-progress">${this.currentIndex + 1}/${this.steps.length}</span>
          <button id="tour-next">${this.isLastStep ? "Finish" : "Next"}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    
    // Highlight target element if specified
    if (step.target) {
      document.querySelector(step.target)?.classList.add("tour-highlight");
    }
  }

  next() {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this.render();
    } else {
      this.complete();
    }
  }

  complete() {
    this.overlay?.remove();
    document.querySelectorAll(".tour-highlight").forEach(el => 
      el.classList.remove("tour-highlight")
    );
    chrome.storage.local.set({ tourCompleted: true });
  }
}

// Usage in popup
const tour = new FeatureTour([
  {
    title: "Enable the Extension",
    content: "Toggle this switch to activate protection",
    target: "#enable-toggle",
    position: { x: 200, y: 100 },
  },
  {
    title: "Customize Settings",
    content: "Click here to configure your preferences",
    target: "#settings-btn",
    position: { x: 200, y: 180 },
  },
  {
    title: "View Statistics",
    content: "Track your usage and savings here",
    target: "#stats-panel",
    position: { x: 200, y: 260 },
  },
]);
```

### Content Script Tooltips

For extensions that interact with page content, tooltips can guide users through in-page features:

```ts
// content-script-tooltip.ts
function showTooltip(targetElement: Element, message: string) {
  const tooltip = document.createElement("div");
  tooltip.className = "extension-tooltip";
  tooltip.textContent = message;
  tooltip.style.cssText = `
    position: absolute;
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    pointer-events: none;
    max-width: 250px;
  `;
  
  const rect = targetElement.getBoundingClientRect();
  tooltip.style.top = `${rect.bottom + 10}px`;
  tooltip.style.left = `${rect.left}px`;
  
  document.body.appendChild(tooltip);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => tooltip.remove(), 5000);
  
  return tooltip;
}
```

---

## Progressive Disclosure of Features

Rather than overwhelming new users with all features at once, progressive disclosure reveals functionality over time based on usage patterns. This reduces cognitive load and helps users master the extension gradually.

### Usage-Based Feature Reveal

```ts
// Track feature usage and unlock progressively
const featureMilestones = {
  basic: ["enable_toggle"],      // Available immediately
  intermediate: ["save_item", "search"],   // After 3 actions
  advanced: ["bulk_export", "api_access"],  // After 10 actions
};

async function checkAndUnlockFeatures(actionType: string) {
  const { actionCounts = {}, unlockedFeatures = ["basic"] } = 
    await chrome.storage.local.get(["actionCounts", "unlockedFeatures"]);
  
  // Increment action count
  actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
  
  // Check milestones
  const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
  
  if (totalActions >= 3 && !unlockedFeatures.includes("intermediate")) {
    unlockedFeatures.push("intermediate");
    showFeatureUnlockNotification("Intermediate features unlocked!");
  }
  
  if (totalActions >= 10 && !unlockedFeatures.includes("advanced")) {
    unlockedFeatures.push("advanced");
    showFeatureUnlockNotification("Advanced features now available!");
  }
  
  await chrome.storage.local.set({ actionCounts, unlockedFeatures });
}
```

### Contextual Feature Introduction

```ts
// Introduce features when context suggests relevance
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PAGE_CONTEXT_DETECTED") {
    const context = message.context; // e.g., "shopping", "writing", "coding"
    
    suggestRelevantFeatures(context);
  }
});

async function suggestRelevantFeatures(context: string) {
  const contextFeatures: Record<string, string[]> = {
    shopping: ["price_alerts", "coupon_finder", "wishlist"],
    writing: ["grammar_check", "word_count", "tone_analysis"],
    coding: ["snippet_save", "api_docs", "error_detection"],
  };
  
  const suggestions = contextFeatures[context] || [];
  const { shownSuggestions = [] } = await chrome.storage.local.get("shownSuggestions");
  
  for (const feature of suggestions) {
    if (!shownSuggestions.includes(feature)) {
      showFeatureCard(feature);
      shownSuggestions.push(feature);
    }
  }
  
  await chrome.storage.local.set({ shownSuggestions });
}
```

---

## Permission Requests

Asking for permissions at the right time dramatically affects approval rates. Requesting too many permissions immediately creates suspicion, while requesting too late frustrates users who have already invested time in your extension.

### On-Demand Permission Pattern

MV3 supports optional permissions that can be requested when needed:

```ts
// manifest.json
{
  "permissions": ["storage"],
  "optional_host_permissions": ["<all_urls>"]
}
```

```ts
// Request permissions when needed
async function requestPageAccess() {
  if (!chrome.runtime.canCheck) {
    // Prompt user to grant host permission
    const granted = await chrome.permissions.request({
      origins: ["<all_urls>"],
    });
    
    if (granted) {
      enableFullFeatures();
    } else {
      showLimitedModeMessage();
    }
  }
}
```

### Permission Timing Best Practices

| Timing | Approach | Example |
|--------|----------|---------|
| Install | No permissions or minimal | Grammarly requests writing analysis after sign-up |
| First use | Core feature permissions | Honey requests on first "Apply Coupon" click |
| Advanced use | Optional/rare permissions | uBlock Origin advanced blocking settings |

```ts
// Gradual permission request flow
const permissionStages = [
  {
    name: "basic",
    permissions: ["storage"],
    trigger: "install",
    message: "Basic functionality enabled",
  },
  {
    name: "content",
    permissions: { origins: ["<all_urls>"] },
    trigger: "first_page_interaction",
    message: "Page analysis enabled",
  },
  {
    name: "notifications",
    permissions: ["notifications"],
    trigger: "user_opt_in",
    message: "Alerts enabled",
  },
];

async function requestPermissionStage(stageName: string) {
  const stage = permissionStages.find(s => s.name === stageName);
  if (!stage) return;
  
  const granted = await chrome.permissions.request(stage.permissions as any);
  
  if (granted) {
    await chrome.storage.local.set({ [`${stageName}Enabled`]: true });
    showNotification(stage.message);
  }
}
```

---

## Tracking Onboarding Completion

Reliable tracking ensures you can measure funnel effectiveness and re-engage users who didn't complete onboarding.

### Storage-Based Tracking

```ts
// Track onboarding funnel progress
const onboardingSteps = [
  "installed",
  "welcome_viewed",
  "first_action_completed",
  "settings_configured",
  "onboarding_complete",
];

async function trackOnboardingStep(step: string) {
  const { onboardingProgress = [] } = await chrome.storage.local.get("onboardingProgress");
  
  if (!onboardingProgress.includes(step)) {
    onboardingProgress.push(step);
    await chrome.storage.local.set({ onboardingProgress });
    
    // Send to analytics (if consented)
    if (await hasAnalyticsConsent()) {
      await sendAnalyticsEvent("onboarding_step", { step });
    }
  }
  
  // Check for completion
  if (onboardingProgress.length >= onboardingSteps.length - 1) {
    await onOnboardingComplete();
  }
}

async function onOnboardingComplete() {
  await chrome.storage.local.set({ 
    onboardingComplete: true,
    onboardingCompleteDate: Date.now(),
  });
  
  await sendAnalyticsEvent("onboarding_completed");
}
```

---

## A/B Testing Onboarding Flows

Testing different onboarding approaches helps optimize conversion. Use variant assignment stored in extension storage or backend-driven assignment.

### Simple A/B Testing Implementation

```ts
// Assign user to variant on install
async function assignVariant() {
  const { variant } = await chrome.storage.local.get("variant");
  
  if (variant) return variant; // Already assigned
  
  // 50/50 split
  const newVariant = Math.random() < 0.5 ? "control" : "treatment";
  await chrome.storage.local.set({ variant: newVariant });
  
  return newVariant;
}

// Apply variant-specific onboarding
async function initializeOnboarding() {
  const variant = await assignVariant();
  
  if (variant === "treatment") {
    // Shorter, more visual onboarding
    showQuickOnboarding();
  } else {
    // Detailed onboarding
    showFullOnboarding();
  }
  
  // Track which variant was shown
  await sendAnalyticsEvent("onboarding_variant", { variant });
}
```

### Server-Side A/B Testing

For more sophisticated testing, integrate with a backend:

```ts
// Fetch variant from server
async function fetchServerVariant(): Promise<string> {
  try {
    const response = await fetch("https://api.example.com/variant/assignment", {
      method: "POST",
      body: JSON.stringify({
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version,
      }),
    });
    
    const data = await response.json();
    return data.variant;
  } catch {
    return "control"; // Fallback
  }
}
```

---

## Examples from Popular Extensions

### Grammarly

Grammarly uses a sophisticated multi-stage onboarding:
1. **Install**: Minimal welcome, asks to create account
2. **Account creation**: Collects writing goals and preferences
3. **First document**: Offers to analyze sample text
4. **Progressive feature reveal**: Shows premium features after consistent usage

Their approach emphasizes value demonstration before asking for payment or advanced permissions.

### Honey

Honey's onboarding is highly contextual:
1. **Install**: Brief welcome explaining coupon finding
2. **First checkout**: Prompts to activate on current site
3. **Permission request**: Triggered by actual shopping behavior
4. **Reward notifications**: Builds engagement through savings

This "just-in-time" permission model results in higher approval rates.

### uBlock Origin

uBlock Origin takes a minimal onboarding approach:
1. **Install**: Immediately functional with default blocklists
2. **First use**: Dashboard shows statistics, not setup wizard
3. **Advanced users**: Settings are available but not required

This respects user autonomy and gets to value immediately.

---

## Summary

Effective onboarding balances several competing priorities: demonstrating value quickly, avoiding permission fatigue, respecting user time, and setting the foundation for long-term engagement. Key principles to remember:

1. **Start strong**: The first-run experience sets the tone for the entire user relationship
2. **Show value immediately**: Let users experience your core benefit before asking for anything
3. **Request permissions contextually**: Ask for access when users are about to use features that need it
4. **Track everything**: Measure completion rates at each step to identify friction points
5. **Test and iterate**: A/B test onboarding flows to optimize conversion

With these patterns, you can create onboarding experiences that users appreciate rather than tolerate - turning the initial setup into the beginning of a lasting relationship.

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://theluckystrike.github.io/extension-monetization-playbook/monetization/stripe-integration), and [user onboarding strategies](https://theluckystrike.github.io/extension-monetization-playbook/growth/onboarding-strategies) that convert free users to paid.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
