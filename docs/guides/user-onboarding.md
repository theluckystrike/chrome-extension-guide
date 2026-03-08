---
layout: default
title: "Chrome Extension User Onboarding — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/user-onboarding/"
---
# User Onboarding Guide

A comprehensive guide to designing effective onboarding experiences for Chrome extensions that drive user adoption and retention.

## Overview {#overview}

First impressions are critical in determining whether users continue using your extension or uninstall it within the first few minutes. A well-designed onboarding experience guides users through initial setup, demonstrates value quickly, and reduces the overall uninstall rate. This guide covers best practices for creating onboarding flows that educate users, request permissions appropriately, and set expectations for ongoing value.

## onInstalled Welcome Page {#oninstalled-welcome-page}

The `onInstalled` event is the entry point for your onboarding experience. When a user installs your extension, you can automatically open a welcome page that guides them through setup.

```javascript
// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // New installation - show welcome flow
    chrome.tabs.create({ url: 'onboarding.html' });
  } else if (details.reason === 'update') {
    // Extension updated - show changelog
    chrome.tabs.create({ url: 'changelog.html' });
  }
});
```

The `details.reason` property distinguishes between fresh installations and updates, allowing you to tailor the experience accordingly.

## Onboarding Page Design {#onboarding-page-design}

Effective onboarding pages share several key characteristics that maximize user engagement and comprehension:

**Keep it concise** - Limit your onboarding flow to 3-5 steps maximum. Users are more likely to complete shorter flows and retain information presented in smaller chunks.

**Demonstrate value immediately** - The first screen should clearly communicate what your extension does and why the user should care. Use screenshots, GIFs, or short videos to show the extension in action.

**Request permissions strategically** - When requesting optional permissions, provide clear explanations of why each permission is needed and how it benefits the user. Always allow users to skip optional permissions.

**Enable preference configuration** - Let users configure basic preferences during onboarding. This creates a sense of personalization and investment in your extension.

**Include clear call-to-action** - The final step should have a prominent button that transitions users to the main application experience.

```html
<!-- onboarding.html - Multi-step wizard structure -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles/onboarding.css">
</head>
<body>
  <div class="onboarding-container">
    <div class="progress-bar">
      <div class="progress-fill" id="progress"></div>
    </div>
    
    <div class="step" data-step="1">
      <h1>Welcome to ExtensionName</h1>
      <p>Automate your workflow with powerful features...</p>
      <img src="images/demo.gif" alt="Extension demo">
      <button class="btn-primary" onclick="nextStep()">Get Started</button>
    </div>
    
    <div class="step hidden" data-step="2">
      <h2>Enable Notifications</h2>
      <p>We need notification permission to alert you when...</p>
      <div class="permission-card">
        <input type="checkbox" id="notify-perm" checked>
        <label for="notify-perm">Enable notifications</label>
      </div>
      <button class="btn-primary" onclick="nextStep()">Continue</button>
    </div>
    
    <div class="step hidden" data-step="3">
      <h2>You're All Set!</h2>
      <p>Configure your preferences and start using ExtensionName.</p>
      <button class="btn-primary" onclick="finishOnboarding()">
        Open Extension
      </button>
    </div>
  </div>
  
  <script src="scripts/onboarding.js"></script>
</body>
</html>
```

## Progressive Disclosure {#progressive-disclosure}

Rather than overwhelming users with all features at once, implement progressive disclosure to reveal functionality as users explore your extension. This approach reduces initial cognitive load and encourages continued discovery.

**Tooltip-style hints** - Show contextual tooltips when users first encounter specific features. These hints should appear on the first use and can be dismissed or permanently hidden by the user.

```javascript
// Feature tooltip system
class FeatureTooltip {
  constructor() {
    this.storageKey = 'feature_tooltips_dismissed';
    this.tooltips = document.querySelectorAll('[data-tooltip]');
    this.init();
  }
  
  init() {
    chrome.storage.local.get(this.storageKey, (result) => {
      const dismissed = result[this.storageKey] || [];
      this.tooltips.forEach(element => {
        const featureId = element.dataset.tooltip;
        if (!dismissed.includes(featureId)) {
          this.showTooltip(element, featureId);
        }
      });
    });
  }
  
  showTooltip(element, featureId) {
    const tooltip = document.createElement('div');
    tooltip.className = 'feature-tooltip';
    tooltip.textContent = this.getTooltipText(featureId);
    element.appendChild(tooltip);
    
    tooltip.addEventListener('click', () => {
      this.dismissTooltip(featureId);
      tooltip.remove();
    });
  }
  
  dismissTooltip(featureId) {
    chrome.storage.local.get(this.storageKey, (result) => {
      const dismissed = result[this.storageKey] || [];
      dismissed.push(featureId);
      chrome.storage.local.set({ [this.storageKey]: dismissed });
    });
  }
  
  getTooltipText(featureId) {
    const texts = {
      'shortcuts': 'Press Ctrl+Shift+S to quickly access...',
      'bookmarks': 'Save your favorite pages for quick access...',
      // Add more tooltip texts
    };
    return texts[featureId] || '';
  }
}
```

**Badge notifications** - Use badge notifications to draw attention to undiscovered features. Display a badge on UI elements that have new or unused features:

```javascript
// Feature discovery via badge notifications
function updateFeatureBadges() {
  chrome.storage.local.get(['usedFeatures', 'allFeatures'], (result) => {
    const used = result.usedFeatures || [];
    const all = result.allFeatures || [];
    
    all.forEach(feature => {
      if (!used.includes(feature)) {
        // Show badge on undiscovered features
        showBadge(`feature-${feature}`, 'NEW');
      }
    });
  });
}

function showBadge(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    const badge = document.createElement('span');
    badge.className = 'feature-badge';
    badge.textContent = text;
    element.appendChild(badge);
  }
}
```

## Permission Requests {#permission-requests}

Requesting permissions requires careful consideration to maintain user trust. Always explain each permission in plain language and provide graceful degradation when users decline.

**Request from user gesture** - Always trigger permission requests from explicit user actions like button clicks. This ensures the request appears in the browser's context and improves approval rates.

```javascript
// Permission request with explanation UI
function requestPermissionsWithExplanation() {
  const explanations = {
    'tabs': 'Access your open tabs to enable quick switching',
    'storage': 'Save your preferences and settings locally',
    'notifications': 'Receive alerts about important updates',
    'activeTab': 'Access the current page when you click the extension icon'
  };
  
  // Show explanation UI first
  showPermissionModal(explanations).then(granted => {
    if (granted) {
      chrome.permissions.request({
        permissions: ['tabs', 'storage'],
        origins: ['https://*.example.com/*']
      }, (success) => {
        if (success) {
          console.log('Permissions granted');
        } else {
          console.log('Permissions denied - graceful degradation');
          enableLimitedMode();
        }
      });
    }
  });
}

function enableLimitedMode() {
  // Provide core functionality without optional permissions
  chrome.storage.local.set({ limitedMode: true });
  // Update UI to reflect reduced functionality
}
```

**Allow skipping gracefully** - Design your extension to function (perhaps with reduced functionality) when users decline permissions. This approach builds trust and prevents users from feeling pressured.

## Update Notifications {#update-notifications}

When your extension updates, users may miss new features or breaking changes. Show a changelog notification to keep users informed:

```javascript
// Update notification with changelog
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    // Fetch changelog for this version
    fetchChangelog(previousVersion, currentVersion).then(changelog => {
      showUpdateNotification(changelog);
    });
  }
});

function showUpdateNotification(changelog) {
  chrome.storage.local.set({ 
    showChangelog: true, 
    changelogContent: changelog 
  });
  
  // Create notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon-128.png',
    title: 'Extension Updated!',
    message: 'Click to see what\'s new in this version.',
    priority: 1
  }, (notificationId) => {
    // Handle notification click
  });
}
```

## Tracking Completion {#tracking-completion}

Store onboarding state using `@theluckystrike/webext-storage` to track progress and enable users to resume where they left off. This is especially valuable for multi-step onboarding flows.

```javascript
// Onboarding state management
class OnboardingState {
  constructor() {
    this.storageKey = 'onboarding_state';
  }
  
  async getState() {
    return new Promise(resolve => {
      chrome.storage.local.get(this.storageKey, result => {
        resolve(result[this.storageKey] || { 
          completed: false, 
          currentStep: 1,
          completedSteps: [] 
        });
      });
    });
  }
  
  async updateState(updates) {
    const current = await this.getState();
    const updated = { ...current, ...updates };
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.storageKey]: updated }, resolve);
    });
  }
  
  async markStepComplete(stepNumber) {
    const state = await this.getState();
    if (!state.completedSteps.includes(stepNumber)) {
      state.completedSteps.push(stepNumber);
      state.currentStep = stepNumber + 1;
      await this.updateState(state);
    }
  }
  
  async completeOnboarding() {
    await this.updateState({ completed: true });
  }
  
  async shouldShowOnboarding() {
    const state = await this.getState();
    return !state.completed;
  }
}

// Usage in onboarding flow
const onboarding = new OnboardingState();

async function initOnboarding() {
  const shouldShow = await onboarding.shouldShowOnboarding();
  if (!shouldShow) {
    // Skip to main app
    window.location.href = 'app.html';
    return;
  }
  
  // Resume from last step
  const state = await onboarding.getState();
  showStep(state.currentStep);
}
```

**Don't repeat completed steps** - Always check stored state before showing onboarding content. If a user has completed certain steps, skip them automatically while allowing manual review if desired.

## Code Examples {#code-examples}

The following examples demonstrate complete implementations of key onboarding patterns:

### Multi-Step Wizard Welcome Page {#multi-step-wizard-welcome-page}

A full implementation of a step-by-step wizard that guides users through setup with progress tracking and state persistence.

### Permission Request with Explanation UI {#permission-request-with-explanation-ui}

Demonstrates how to present permission requests with clear explanations and graceful fallback when users decline.

### Feature Tooltip System {#feature-tooltip-system}

Shows contextual hints that appear on first use, track dismissal state, and can be revisited by users.

### Update Changelog Notification {#update-changelog-notification}

Implements automatic changelog display when users install updates, keeping them informed of new features.

## Cross-References {#cross-references}

For more information on related topics, consult these additional guides:

- **[Extension Updates](../guides/extension-updates.md)** - Best practices for managing update flows and maintaining backward compatibility
- **[State Management Patterns](../patterns/state-management.md)** - Comprehensive guide to storing and retrieving extension state
- **[Listing Optimization](../publishing/listing-optimization.md)** - Tips for optimizing your Chrome Web Store listing to improve conversion rates

## Related Articles {#related-articles}

## Related Articles

- [Onboarding Patterns](../patterns/extension-onboarding.md)
- [User Research](../guides/chrome-extension-user-research.md)
-e 
---

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://theluckystrike.github.io/extension-monetization-playbook/monetization/stripe-integration), and [user onboarding strategies](https://theluckystrike.github.io/extension-monetization-playbook/growth/onboarding-strategies) that convert free users to paid.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
