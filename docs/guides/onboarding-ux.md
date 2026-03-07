# Chrome Extension Onboarding UX Patterns

## Overview

Onboarding is critical for Chrome extension success. A well-designed onboarding experience guides users from installation to realizing value quickly, while respecting their time and privacy. This guide covers proven patterns for creating effective onboarding flows that maximize user activation and retention.

## First-Run Experience with onInstalled

The `chrome.runtime.onInstalled` event is the entry point for onboarding logic. It fires once when the extension is installed or updated, making it ideal for initializing user state and triggering welcome flows.

```ts
// background.ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Fresh installation - start onboarding
    initializeNewUser();
  } else if (details.reason === 'update') {
    // Extension updated - show what's new
    showUpdateNotification();
  }
});

function initializeNewUser() {
  chrome.storage.local.set({
    onboardingStep: 0,
    onboardingCompleted: false,
    firstRunTimestamp: Date.now(),
    featuresDiscovered: []
  });
  
  // Open welcome page
  chrome.tabs.create({
    url: 'welcome.html',
    active: true
  });
}
```

## Welcome Page Design

A well-designed welcome page sets expectations and guides users through initial setup. Keep it focused - users should understand your extension's value in under 30 seconds.

### Key Elements

1. **Clear value proposition** - What does this extension do? Why should I care?
2. **Minimal required permissions** - Explain why each permission is needed
3. **Quick start guide** - 3-5 steps maximum
4. **Skip option** - Let power users bypass onboarding

```html
<!-- welcome.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    .welcome-container { max-width: 600px; margin: 0 auto; padding: 40px; }
    .hero-section { text-align: center; margin-bottom: 32px; }
    .feature-list { display: grid; gap: 16px; }
    .cta-button { 
      background: #4CAF50; color: white; padding: 12px 24px; 
      border: none; border-radius: 4px; cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="welcome-container">
    <div class="hero-section">
      <h1>Welcome to Productivity Pro</h1>
      <p>Your AI-powered productivity assistant</p>
    </div>
    
    <div class="feature-list">
      <div class="feature">
        <h3>🚀 Quick Setup</h3>
        <p>Get started in under 60 seconds</p>
      </div>
      <div class="feature">
        <h3>🔒 Privacy First</h3>
        <p>Your data stays on your device</p>
      </div>
    </div>
    
    <button id="getStarted" class="cta-button">Get Started</button>
    <a href="#" id="skipOnboarding">Skip for now</a>
  </div>
  
  <script src="welcome.js"></script>
</body>
</html>
```

## Permission Request Timing

Requesting permissions at the right time significantly impacts conversion. Never ask for permissions during installation - Chrome's warning scares away users.

### Best Practices

1. **Install-time**: Request only core permissions required for basic functionality
2. **First-use**: Request additional permissions when users attempt a feature that needs them
3. **Contextual**: Show why you need each permission immediately before requesting

```ts
// Request permissions contextually when needed
async function requestTabAccess() {
  const permissions = { permissions: ['tabs'] };
  
  // Check if we already have permission
  if (chrome.permissions) {
    const granted = await chrome.permissions.contains(permissions);
    if (granted) return true;
  }
  
  // Show user context before requesting
  showPermissionRationale({
    title: 'Access to tabs',
    message: 'We need access to tabs to help you organize your workflow.',
    onAccept: async () => {
      const granted = await chrome.permissions.request(permissions);
      if (granted) {
        enableTabFeatures();
      }
      return granted;
    }
  });
}
```

## Progressive Disclosure

Progressive disclosure reveals complexity gradually. Start simple, then introduce advanced features as users become more engaged.

### Implementation Pattern

```ts
// Track user engagement level
const ENGAGEMENT_LEVELS = {
  NEW: 0,
  BASIC: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3
};

function getFeatureVisibility(userEngagement: number) {
  return {
    // Always visible
    basicFeatures: true,
    // Show after some usage
    intermediateFeatures: userEngagement >= ENGAGEMENT_LEVELS.BASIC,
    // Show for power users only
    advancedFeatures: userEngagement >= ENGAGEMENT_LEVELS.INTERMEDIATE
  };
}

// Example: Toggle advanced options in popup
function updateUIForEngagementLevel() {
  const engagement = getUserEngagementLevel();
  const visibility = getFeatureVisibility(engagement);
  
  document.querySelectorAll('.advanced-option').forEach(el => {
    (el as HTMLElement).style.display = 
      visibility.advancedFeatures ? 'block' : 'none';
  });
}
```

## Feature Discovery Patterns

Help users discover features they might miss. Use tooltips, guided tours, and contextual hints.

### Tooltip Pattern

```ts
// Create feature discovery tooltips
class FeatureDiscovery {
  private steps: DiscoveryStep[];
  private currentStep = 0;
  
  async startTour(steps: DiscoveryStep[]) {
    this.steps = steps;
    await this.showStep(0);
  }
  
  private async showStep(index: number) {
    const step = this.steps[index];
    const target = document.querySelector(step.targetSelector);
    
    if (!target) return;
    
    const tooltip = this.createTooltip(step);
    this.positionTooltip(tooltip, target);
    
    // Track step viewed
    await this.trackDiscovery(step.featureId);
  }
  
  private createTooltip(step: DiscoveryStep): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'discovery-tooltip';
    tooltip.innerHTML = `
      <h4>${step.title}</h4>
      <p>${step.description}</p>
      <button class="next-btn">${step.isLast ? 'Got it' : 'Next'}</button>
    `;
    return tooltip;
  }
}
```

## Options Page as Onboarding Wizard

Transform your options page into a guided setup wizard. This works especially well for complex extensions requiring configuration.

### Wizard Pattern

```ts
// options-wizard.ts
interface WizardStep {
  id: string;
  title: string;
  validate: () => Promise<boolean>;
  render: () => string;
}

const wizardSteps: WizardStep[] = [
  {
    id: 'connect-account',
    title: 'Connect Your Account',
    validate: async () => {
      const accountId = await getStoredAccountId();
      return !!accountId;
    },
    render: () => `
      <div class="wizard-step" data-step="connect-account">
        <h2>Connect Your Account</h2>
        <button id="connectBtn">Sign in with Google</button>
      </div>
    `
  },
  {
    id: 'configure-preferences',
    title: 'Set Your Preferences',
    validate: async () => {
      const prefs = await getUserPreferences();
      return prefs.theme && prefs.notifications !== undefined;
    },
    render: () => `...`
  }
];

class OnboardingWizard {
  private currentStep = 0;
  
  async init() {
    const savedStep = await this.getSavedProgress();
    this.currentStep = savedStep;
    this.render();
  }
  
  async next() {
    const step = wizardSteps[this.currentStep];
    const isValid = await step.validate();
    
    if (!isValid) {
      this.showValidationError('Please complete this step');
      return;
    }
    
    this.currentStep++;
    await this.saveProgress();
    this.render();
  }
}
```

## Measuring Completion Rates

Track onboarding funnel metrics to identify drop-off points and optimize the experience.

### Analytics Integration

```ts
// onboarding-analytics.ts
interface OnboardingEvent {
  event: 'step_viewed' | 'step_completed' | 'step_abandoned' | 'onboarding_completed';
  step?: string;
  timestamp: number;
  userId: string;
}

class OnboardingAnalytics {
  private userId: string;
  
  constructor() {
    this.userId = this.getOrCreateUserId();
  }
  
  async trackStepViewed(stepId: string) {
    await this.sendEvent({
      event: 'step_viewed',
      step: stepId,
      timestamp: Date.now(),
      userId: this.userId
    });
  }
  
  async trackCompletion() {
    await this.sendEvent({
      event: 'onboarding_completed',
      timestamp: Date.now(),
      userId: this.userId
    });
    
    // Calculate completion time
    const startTime = await this.getOnboardingStartTime();
    const completionTime = Date.now() - startTime;
    
    await this.sendMetric('onboarding_duration', completionTime);
  }
  
  private async sendEvent(event: OnboardingEvent) {
    // Send to your analytics service
    await fetch('/api/analytics/onboarding', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }
}

// Key metrics to track
const ONBOARDING_METRICS = [
  'install_to_onboarding_start',
  'onboarding_completion_rate',
  'step_drop_off_rate',
  'time_per_step',
  'feature_discovery_rate'
];
```

## Update Notifications

When your extension updates, inform users about new features without disrupting their workflow.

```ts
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    // Check if major update with new features
    if (isMajorUpdate(previousVersion, currentVersion)) {
      await showWhatsNew();
    }
  }
});

async function showWhatsNew() {
  const whatsNewFeatures = [
    { title: 'Dark Mode', description: 'New theme option in settings' },
    { title: 'Keyboard Shortcuts', description: 'Press ? to view all shortcuts' }
  ];
  
  // Show non-intrusive notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'Extension Updated!',
    message: `Version ${chrome.runtime.getManifest().version} is ready.`,
    buttons: [
      { title: 'See What\'s New' },
      { title: 'Later' }
    ]
  });
}
```

## Uninstall Feedback Page

Collect feedback when users uninstall. This valuable data helps improve your extension.

```html
<!-- uninstall-survey.html -->
<!DOCTYPE html>
<html>
<body>
  <h1>We're sorry to see you go</h1>
  <p>Help us improve by answering a few questions:</p>
  
  <form id="uninstallFeedback">
    <label>Why are you uninstalling?</label>
    <select name="reason" required>
      <option value="">Select a reason...</option>
      <option value="not-useful">Not useful</option>
      <option value="too-complex">Too complicated</option>
      <option value="bugs">Found bugs</option>
      <option value="temporary">Only needed it briefly</option>
      <option value="other">Other</option>
    </select>
    
    <label>Additional feedback:</label>
    <textarea name="details" rows="4"></textarea>
    
    <button type="submit">Submit & Uninstall</button>
  </form>
  
  <script>
    document.getElementById('uninstallFeedback').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      await fetch('/api/feedback/uninstall', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      // Allow uninstall after feedback
      window.close();
    });
  </script>
</body>
</html>
```

## Rating Prompt Timing

Timing your rating prompt significantly affects conversion. Ask at moments of high satisfaction, not frustration.

### Optimal Timing Patterns

1. **After successful feature completion** - User just accomplished something
2. **After positive streak** - Multiple sessions without errors
3. **Never after errors** - Wait at least 24 hours after any issue

```ts
class RatingPrompter {
  private static readonly PROMPT_AFTER_SESSIONS = 5;
  private static readonly PROMPT_AFTER_DAYS = 7;
  
  async shouldPromptForRating(): Promise<boolean> {
    const stats = await this.getUsageStats();
    const installTime = await this.getInstallTimestamp();
    const daysSinceInstall = (Date.now() - installTime) / (1000 * 60 * 60 * 24);
    
    // Conditions for rating prompt
    const hasEnoughSessions = stats.successfulSessions >= this.PROMPT_AFTER_SESSIONS;
    const hasWaitedLongEnough = daysSinceInstall >= this.PROMPT_AFTER_DAYS;
    const noRecentErrors = !this.hadErrorsRecently();
    
    return hasEnoughSessions && hasWaitedLongEnough && noRecentErrors;
  }
  
  async showRatingPrompt() {
    const shouldPrompt = await this.shouldPromptForRating();
    if (!shouldPrompt) return;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Enjoying Productivity Pro?',
      message: 'Please take a moment to rate us on the Chrome Web Store.',
      buttons: [
        { title: 'Rate Now' },
        { title: 'Maybe Later' }
      ]
    });
  }
}
```

## Summary

Effective onboarding balances guiding new users with respecting experienced ones. Key principles:

1. **Use onInstalled** for initial setup and update detection
2. **Design focused welcome pages** with clear value propositions
3. **Request permissions contextually** when users need features
4. **Apply progressive disclosure** to reveal complexity gradually
5. **Enable feature discovery** through tooltips and tours
6. **Consider wizard-style options** for complex configuration
7. **Measure everything** to identify optimization opportunities
8. **Communicate updates** without disrupting workflow
9. **Collect uninstall feedback** to improve
10. **Time rating prompts** at moments of maximum satisfaction

## References

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/develop)
- [Chrome Web Store Guidelines](https://developer.chrome.com/docs/webstore)
- [Extension Onboarding Best Practices](https://developer.chrome.com/docs/extensions/mv3/intro/)
