---
layout: default
title: "Chrome Extension Extension Onboarding — Best Practices"
description: "Design effective onboarding flows for new extension users."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-onboarding/"
---

# Extension Onboarding Patterns

User onboarding is critical for Chrome extensions to ensure users understand and adopt key features. This document covers proven onboarding patterns that improve user engagement and reduce early churn.

## First Install Detection {#first-install-detection}

Use `chrome.runtime.onInstalled` to detect first-time installation:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time install - start onboarding
    chrome.storage.local.set({ onboardingCompleted: false });
    openOnboardingPage();
  } else if (details.reason === 'update') {
    // Extension updated - show what's new
    handleUpdate(details.previousVersion);
  }
});

function openOnboardingPage() {
  chrome.tabs.create({ url: 'onboarding.html' });
}
```

## Welcome Page {#welcome-page}

Open an onboarding tab immediately after first install. The welcome page should:

- Clearly state the extension's value proposition
- Provide a brief overview of core features
- Include a "Get Started" button to begin setup

```javascript
// In onboarding.html
document.getElementById('getStarted').addEventListener('click', () => {
  startSetupWizard();
});
```

## Step-by-Step Setup Wizard {#step-by-step-setup-wizard}

Guide users through key features with a multi-step wizard:

1. **Introduction** - What the extension does
2. **Permissions** - Explain and request necessary permissions
3. **Configuration** - Set initial preferences
4. **Tutorial** - Quick walkthrough of main features
5. **Completion** - Confirmation and tips

## Permission Requests During Onboarding {#permission-requests-during-onboarding}

Always explain why each permission is needed before requesting:

```javascript
const permissionRationale = {
  'tabs': 'We need access to tabs to help you manage your workflow',
  'storage': 'Storage permission saves your preferences across sessions',
  'activeTab': 'ActiveTab lets us assist with the current page you're viewing'
};

function requestPermissionWithExplanation(permission, rationale) {
  showExplanationModal(permission, rationale);
  // Then request the actual permission
  chrome.permissions.request({ permissions: [permission] });
}
```

## Feature Highlights & Tooltips {#feature-highlights-tooltips}

Use tooltip-style overlays to highlight new features:

```javascript
function showFeatureTour(steps) {
  let currentStep = 0;
  
  function nextStep() {
    if (currentStep >= steps.length) {
      endTour();
      return;
    }
    const step = steps[currentStep];
    highlightElement(step.selector, step.message);
    currentStep++;
  }
  
  return { nextStep, endTour };
}
```

## Interactive Tutorials {#interactive-tutorials}

In-extension guided tours help users learn by doing:

- Highlight UI elements sequentially
- Provide contextual instructions
- Allow users to practice each step
- Include "Next" and "Skip" buttons

## Settings Initialization {#settings-initialization}

Set sensible defaults, then allow customization:

```javascript
const defaultSettings = {
  theme: 'light',
  notifications: true,
  autoSave: true,
  shortcut: 'Ctrl+Shift+E'
};

function initializeSettings() {
  chrome.storage.sync.get(defaultSettings, (result) => {
    if (chrome.runtime.lastError) {
      // First run - set defaults
      chrome.storage.sync.set(defaultSettings);
    }
  });
}
```

## Pin Extension Prompt {#pin-extension-prompt}

Remind users to pin the extension for easy access:

```javascript
function showPinPrompt() {
  // Check if already pinned
  chrome.action.isPinned((isPinned) => {
    if (!isPinned) {
      showModal('Pin Extension', 
        'For the best experience, pin this extension to your toolbar.');
    }
  });
}
```

## Keyboard Shortcut Setup {#keyboard-shortcut-setup}

Display current shortcuts and link to shortcut settings:

```javascript
function displayShortcuts() {
  chrome.commands.getAll((commands) => {
    const shortcuts = commands.map(cmd => 
      `${cmd.name}: ${cmd.shortcut || 'Not set'}`
    );
    renderShortcutList(shortcuts);
  });
}

// Link to chrome://extensions/shortcuts
document.getElementById('shortcutSettings').href = 
  'chrome://extensions/shortcuts';
```

## Skip Option {#skip-option}

Always allow users to skip onboarding:

```javascript
function skipOnboarding() {
  chrome.storage.local.set({ 
    onboardingCompleted: true,
    skippedAt: Date.now()
  });
  redirectToMainPage();
}
```

## Progress Tracking {#progress-tracking}

Store completion status in storage:

```javascript
function completeOnboarding() {
  chrome.storage.local.set({
    onboardingCompleted: true,
    onboardingCompletedAt: Date.now(),
    onboardingVersion: chrome.runtime.getManifest().version
  });
}

function checkOnboardingStatus(callback) {
  chrome.storage.local.get('onboardingCompleted', (result) => {
    callback(result.onboardingCompleted);
  });
}
```

## Returning User Detection {#returning-user-detection}

Distinguish between new installs and updates:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case 'install':
      showNewUserOnboarding();
      break;
    case 'update':
      showWhatsNew(details.previousVersion);
      break;
    case 'chrome_update':
      // Handle browser update
      break;
  }
});
```

## A/B Testing Onboarding Flows {#ab-testing-onboarding-flows}

Test different onboarding approaches:

```javascript
function assignOnboardingVariant() {
  const variants = ['wizard', 'video', 'interactive'];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  chrome.storage.local.set({ onboardingVariant: variant });
  return variant;
}
```

## Related Patterns {#related-patterns}

- [User Onboarding Guide](../guides/user-onboarding.md) - Detailed onboarding strategies
- [Permission Gating](../patterns/permission-gating.md) - Best practices for requesting permissions
- [Extension Updates](../guides/extension-updates.md) - Handling updates and migrations
- [A/B Testing Patterns](./extension-ab-testing.md) - Testing different onboarding approaches
- [Feature Flags](./feature-flags.md) - Toggle features during onboarding
- [Remote Config](../guides/remote-config.md) - Dynamic configuration without updates
- [Crash Reporting](../guides/crash-reporting.md) - Monitor onboarding errors
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
