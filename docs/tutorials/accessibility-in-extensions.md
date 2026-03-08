---
layout: default
title: "Building Accessible Chrome Extensions"
description: "Learn how to build accessible Chrome extensions with proper ARIA attributes, keyboard navigation, screen reader support, focus management, color contrast, and WCAG compliance."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/accessibility-in-extensions/"
---

# Building Accessible Chrome Extensions

Accessibility is not just a best practice—it's a legal requirement in many jurisdictions and a moral imperative to ensure your extension serves all users, including those with disabilities. Chrome extensions present unique accessibility challenges because they encompass multiple UI contexts: popups, options pages, side panels, and content scripts. This guide covers essential accessibility patterns and WCAG compliance strategies specifically for Chrome extension development.

## Understanding Extension Accessibility Contexts

Chrome extensions have several distinct UI surfaces, each with its own accessibility considerations. The popup appears when users click the extension icon, the options page provides configuration settings, the side panel offers a persistent sidebar experience, and content scripts inject UI into web pages. Each context requires different accessibility approaches, but all share fundamental principles of perceivable, operable, understandable, and robust design.

### Extension Manifest Requirements

Your extension's manifest should declare appropriate permissions and configurations that support accessibility:

```json
{
  "manifest_version": 3,
  "name": "Accessible Extension",
  "version": "1.0",
  "description": "An accessible Chrome extension example",
  "permissions": ["storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "options_page": "options.html",
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

## ARIA Attributes in Extension UIs

Accessible Rich Internet Applications (ARIA) attributes provide semantic information to assistive technologies. Proper ARIA usage is crucial for making complex extension interfaces understandable to screen readers.

### ARIA in Popups

The popup is often the primary interface for your extension. Ensure all interactive elements have appropriate ARIA labels:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Actions</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <main role="main" aria-labelledby="popup-title">
    <h1 id="popup-title" class="sr-only">Quick Actions Extension</h1>
    
    <!-- Accessible button with aria-label -->
    <button 
      id="bookmark-btn"
      type="button"
      aria-label="Bookmark this page"
      aria-describedby="bookmark-desc">
      <span aria-hidden="true">⭐</span>
      <span id="bookmark-desc" class="sr-only">Add current page to bookmarks</span>
    </button>

    <!-- Accessible toggle switch -->
    <div 
      role="switch" 
      id="dark-mode-toggle"
      aria-checked="false"
      aria-label="Enable dark mode"
      tabindex="0"
      role="button">
      <span>Dark Mode</span>
      <span class="toggle-indicator" aria-hidden="true"></span>
    </div>

    <!-- Accessible list with aria-describedby -->
    <ul 
      role="list" 
      aria-label="Recent bookmarks"
      aria-describedby="list-instructions">
      <li role="listitem">
        <a href="#" aria-label="Bookmark: Chrome Extensions Guide">
          Chrome Extensions Guide
        </a>
      </li>
    </ul>
    <p id="list-instructions" class="sr-only">
      Use arrow keys to navigate between bookmarks
    </p>
  </main>
  <script src="popup.js"></script>
</body>
</html>
```

### ARIA in Options Pages

Options pages often contain complex forms and settings. Use fieldset and legend for grouped controls:

```html
<!-- options.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Extension Settings</title>
</head>
<body>
  <main>
    <h1>Settings</h1>
    
    <form id="settings-form">
      <!-- Grouped settings with fieldset -->
      <fieldset>
        <legend>Notification Preferences</legend>
        
        <div role="group" aria-labelledby="notification-types">
          <h2 id="notification-types" class="sr-only">Notification Types</h2>
          
          <label>
            <input type="checkbox" name="notify_bookmarks">
            Bookmark notifications
          </label>
          
          <label>
            <input type="checkbox" name="notify_updates">
            Update notifications
          </label>
        </div>
        
        <div role="radiogroup" aria-labelledby="frequency-label">
          <h2 id="frequency-label">Notification Frequency</h2>
          
          <label>
            <input type="radio" name="frequency" value="immediate">
            Immediate
          </label>
          
          <label>
            <input type="radio" name="frequency" value="daily">
            Daily digest
          </label>
          
          <label>
            <input type="radio" name="frequency" value="weekly">
            Weekly summary
          </label>
        </div>
      </fieldset>

      <!-- Live region for dynamic updates -->
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        id="save-status">
      </div>
      
      <button type="submit">Save Settings</button>
    </form>
  </main>
</body>
</html>
```

### ARIA in Side Panels

Side panels can contain rich interactive content. Ensure proper navigation patterns:

```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Side Panel</title>
</head>
<body>
  <div class="app-container">
    <!-- Skip link for keyboard users -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
    <nav aria-label="Side panel navigation">
      <ul role="tablist" aria-label="Panel sections">
        <li role="presentation">
          <button 
            role="tab" 
            aria-selected="true" 
            aria-controls="tabpanel-home"
            id="tab-home"
            tabindex="0">
            Home
          </button>
        </li>
        <li role="presentation">
          <button 
            role="tab" 
            aria-selected="false" 
            aria-controls="tabpanel-settings"
            id="tab-settings"
            tabindex="-1">
            Settings
          </button>
        </li>
      </ul>
    </nav>
    
    <div role="tabpanel" id="tabpanel-home" aria-labelledby="tab-home">
      <h1 id="main-content">Dashboard</h1>
      <!-- Tab panel content -->
    </div>
    
    <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings" hidden>
      <!-- Settings content -->
    </div>
  </div>
</body>
</html>
```

## Keyboard Navigation

Keyboard accessibility is fundamental for users who cannot use a mouse. All functionality must be accessible via keyboard alone.

### Implementing Focus Management

Proper focus management ensures users can navigate logically through your interface:

```javascript
// popup.js - Proper focus management
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('dark-mode-toggle');
  const form = document.getElementById('settings-form');
  const statusRegion = document.getElementById('save-status');
  
  // Make toggle keyboard accessible
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });
  
  toggle.addEventListener('click', () => {
    const isChecked = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', !isChecked);
    
    // Announce state change to screen readers
    announceToScreenReader(
      `Dark mode ${isChecked ? 'disabled' : 'enabled'}`
    );
  });
  
  // Form submission handling
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      await saveSettings();
      
      // Focus on status region and announce success
      statusRegion.textContent = 'Settings saved successfully';
      statusRegion.focus();
      
      // Clear status after delay
      setTimeout(() => {
        statusRegion.textContent = '';
      }, 3000);
    } catch (error) {
      statusRegion.setAttribute('role', 'alert');
      statusRegion.textContent = 'Error saving settings. Please try again.';
    }
  });
});

// Helper function for screen reader announcements
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  setTimeout(() => announcement.remove(), 1000);
}
```

### Keyboard Shortcuts for Extensions

Chrome's commands API enables keyboard shortcuts while respecting system accessibility settings:

```json
{
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Toggle feature on/off"
    },
    "open-settings": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Open extension settings"
    }
  }
}
```

```javascript
// background.js - Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-feature':
      toggleFeature();
      break;
    case 'open-settings':
      chrome.runtime.openOptionsPage();
      break;
  }
});

async function toggleFeature() {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab[0].id, { 
    action: 'toggleFeature' 
  }, (response) => {
    if (chrome.runtime.lastError) {
      // Handle case where content script isn't loaded
      console.log('Content script not available');
    }
  });
}
```

## Screen Reader Compatibility

Screen readers like NVDA, JAWS, and VoiceOver require specific HTML patterns and ARIA roles to properly interpret your UI.

### Semantic HTML Fundamentals

Always prefer semantic HTML elements over generic divs:

```html
<!-- Good: Semantic HTML -->
<header>
  <h1>Extension Title</h1>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="#home">Home</a></li>
      <li><a href="#settings">Settings</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h2>Article Title</h2>
    <p>Article content...</p>
  </article>
  
  <aside aria-label="Related information">
    <h3>Related</h3>
  </aside>
</main>

<footer>
  <p>&copy; 2024 Extension</p>
</footer>

<!-- Avoid: Non-semantic markup -->
<div class="header">
  <div class="title">Extension Title</div>
  <div class="nav">
    <div class="link">Home</div>
  </div>
</div>
```

### Managing Focus in Dynamic Content

When content loads dynamically, manage focus appropriately:

```javascript
// Handle dynamic content loading with focus management
async function loadBookmarks() {
  const container = document.getElementById('bookmarks-container');
  const loading = document.getElementById('loading-indicator');
  
  // Show loading state
  loading.setAttribute('role', 'status');
  loading.setAttribute('aria-live', 'polite');
  loading.textContent = 'Loading bookmarks...';
  
  try {
    const bookmarks = await fetchBookmarks();
    
    // Clear loading indicator
    loading.textContent = '';
    
    // Build bookmark list
    container.innerHTML = '';
    
    if (bookmarks.length === 0) {
      container.innerHTML = '<p>No bookmarks found</p>';
      return;
    }
    
    const list = document.createElement('ul');
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', 'Your bookmarks');
    
    bookmarks.forEach((bookmark, index) => {
      const item = document.createElement('li');
      item.setAttribute('role', 'listitem');
      
      const link = document.createElement('a');
      link.href = bookmark.url;
      link.textContent = bookmark.title;
      link.setAttribute('aria-label', 
        `Bookmark ${index + 1} of ${bookmarks.length}: ${bookmark.title}`
      );
      
      item.appendChild(link);
      list.appendChild(item);
    });
    
    container.appendChild(list);
    
    // Focus on first item for screen reader users
    const firstLink = list.querySelector('a');
    if (firstLink) {
      firstLink.focus();
    }
    
  } catch (error) {
    loading.setAttribute('role', 'alert');
    loading.textContent = 'Failed to load bookmarks. Please try again.';
  }
}
```

## Color Contrast and Visual Design

WCAG requires sufficient color contrast to ensure text is readable for users with visual impairments.

### Meeting WCAG Contrast Requirements

Target these contrast ratios:

```css
/* styles.css - Accessible color scheme */

/* WCAG AA: 4.5:1 for normal text, 3:1 for large text */
:root {
  /* High contrast colors */
  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --background-primary: #ffffff;
  --background-secondary: #f5f5f5;
  --accent-color: #0066cc;
  --accent-hover: #004999;
  --error-color: #cc0000;
  --success-color: #007500;
  --warning-color: #995500;
  
  /* Focus indicator - high visibility */
  --focus-outline: 3px solid #0066cc;
  --focus-offset: 2px;
}

/* Dark mode with sufficient contrast */
[data-theme="dark"] {
  --text-primary: #f0f0f0;
  --text-secondary: #c0c0c0;
  --background-primary: #1a1a1a;
  --background-secondary: #2d2d2d;
  --accent-color: #66b3ff;
  --accent-hover: #99ccff;
  --error-color: #ff6666;
  --success-color: #66cc66;
  --warning-color: #ffcc66;
}

/* Ensure links have visual distinction */
a {
  color: var(--accent-color);
  text-decoration: underline;
}

a:hover {
  color: var(--accent-hover);
}

/* Focus styles - critical for keyboard navigation */
*:focus {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}
```

### Testing Color Contrast

```javascript
// contrast-checker.js - Simple contrast ratio calculator

function getLuminance(hexColor) {
  const rgb = hexToRgb(hexColor);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928
      ? c / 12.92
      : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function calculateContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG thresholds
const WCAG = {
  AA_NORMAL_TEXT: 4.5,
  AA_LARGE_TEXT: 3,
  AAA_NORMAL_TEXT: 7,
  AAA_LARGE_TEXT: 4.5,
};

function checkContrast(foreground, background) {
  const ratio = calculateContrastRatio(foreground, background);
  return {
    ratio: ratio.toFixed(2),
    aaNormal: ratio >= WCAG.AA_NORMAL_TEXT,
    aaLarge: ratio >= WCAG.AA_LARGE_TEXT,
    aaaNormal: ratio >= WCAG.AAA_NORMAL_TEXT,
    aaaLarge: ratio >= WCAG.AAA_LARGE_TEXT,
  };
}

// Example usage
const result = checkContrast('#1a1a1a', '#ffffff');
console.log(`Contrast ratio: ${result.ratio}:1`);
console.log(`WCAG AA Normal Text: ${result.aaNormal ? 'PASS' : 'FAIL'}`);
```

## High Contrast Mode Support

High contrast mode is essential for users with low vision. Detect and adapt to system preferences:

```javascript
// detect-high-contrast.js

function detectHighContrast() {
  // Check for high contrast mode
  const isHighContrast = window.matchMedia(
    '(forced-colors: active), (prefers-contrast: more)'
  ).matches;
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  
  return { isHighContrast, prefersReducedMotion };
}

// Apply appropriate styles based on user preferences
function applyAccessibleStyles() {
  const { isHighContrast, prefersReducedMotion } = detectHighContrast();
  
  if (isHighContrast) {
    document.body.classList.add('high-contrast');
  }
  
  if (prefersReducedMotion) {
    document.body.classList.add('reduced-motion');
  }
}

// Listen for preference changes
window.matchMedia('(prefers-contrast: more)').addEventListener('change', () => {
  applyAccessibleStyles();
});

window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
  applyAccessibleStyles();
});
```

```css
/* high-contrast.css - High contrast mode styles */
@media (forced-colors: active) {
  /* Use system colors that work in high contrast */
  button {
    background: ButtonFace;
    border: 2px solid ButtonText;
    color: ButtonText;
  }
  
  button:focus {
    outline: 3px solid Highlight;
  }
  
  /* Ensure links are distinguishable */
  a {
    text-decoration: underline;
    color: LinkText;
  }
  
  /* High contrast focus indicators */
  :focus {
    outline: 3px solid Highlight;
    outline-offset: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Accessible Notifications

Notifications must be perceivable by all users, including those using screen readers:

```javascript
// Accessible notification handling
class AccessibleNotifier {
  constructor() {
    this.liveRegion = this.createLiveRegion();
  }
  
  createLiveRegion() {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
    return region;
  }
  
  announce(message, priority = 'polite') {
    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = '';
    
    // Small delay to ensure screen reader picks up change
    setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 100);
  }
  
  async showChromeNotification(title, message, iconUrl) {
    return new Promise((resolve, reject) => {
      chrome.notifications.create(
        {
          type: 'basic',
          iconUrl: iconUrl,
          title: title,
          message: message,
          priority: 1,
          // Accessibility: don't require dismissal
          requireInteraction: false,
        },
        (notificationId) => {
          if (chrome.runtime.lastError) {
            this.announce(`Error: ${chrome.runtime.lastError.message}`, 'assertive');
            reject(chrome.runtime.lastError);
          } else {
            this.announce(`${title}: ${message}`, 'polite');
            resolve(notificationId);
          }
        }
      );
    });
  }
}

// Usage
const notifier = new AccessibleNotifier();

async function handleAction() {
  try {
    await chrome.storage.session.set({ key: 'value' });
    notifier.announce('Settings saved successfully');
  } catch (error) {
    notifier.announce('Failed to save settings. Please try again.', 'assertive');
  }
}
```

## Testing with Chrome Accessibility Tools

Chrome provides built-in accessibility auditing through Lighthouse and the Accessibility Inspector.

### Running Accessibility Audits

```javascript
// Using Chrome's accessibility auditing in extensions
async function runAccessibilityAudit() {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Inject a content script to run audits
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Check for common accessibility issues
      const issues = [];
      
      // Check for images missing alt text
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.hasAttribute('alt') && !img.getAttribute('role')) {
          issues.push({
            severity: 'serious',
            message: `Image at index ${index} missing alt text`,
            element: img.outerHTML.substring(0, 100)
          });
        }
      });
      
      // Check for buttons without accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach((btn, index) => {
        if (!btn.getAttribute('aria-label') && 
            !btn.textContent.trim() && 
            !btn.getAttribute('title')) {
          issues.push({
            severity: 'critical',
            message: `Button at index ${index} has no accessible name`,
            element: btn.outerHTML.substring(0, 100)
          });
        }
      });
      
      // Check for form inputs missing labels
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([aria-hidden])');
      inputs.forEach((input, index) => {
        const hasLabel = input.getAttribute('aria-label') || 
                        input.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${input.id}"]`);
        if (!hasLabel) {
          issues.push({
            severity: 'critical',
            message: `Input at index ${index} missing label`,
            element: input.outerHTML.substring(0, 100)
          });
        }
      });
      
      // Check color contrast (simplified)
      const elements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6');
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        const textColor = style.color;
        
        if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          // Note: This is a simplified check; real contrast checking is more complex
          issues.push({
            severity: 'warning',
            message: 'Element may have contrast issues - verify manually',
            element: el.outerHTML.substring(0, 100)
          });
        }
      });
      
      return {
        url: window.location.href,
        issues: issues,
        timestamp: new Date().toISOString()
      };
    }
  });
  
  return results[0].result;
}
```

### Using the Accessibility Inspector

The Accessibility Inspector in Chrome DevTools provides detailed information about any element's accessibility properties:

1. Open Chrome DevTools (F12)
2. Navigate to the Accessibility tab
3. Select an element to view its accessibility tree
4. Check the computed properties, ARIA attributes, and AXObject properties

```javascript
// Debug script to log accessibility tree
async function logAccessibilityTree(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      function getAccessibleDescription(el) {
        const aria = el.getAttribute('aria-description');
        const title = el.getAttribute('title');
        const label = el.getAttribute('aria-label');
        const labelledBy = el.getAttribute('aria-labelledby');
        
        return { aria, title, label, labelledBy };
      }
      
      const elements = document.querySelectorAll('button, a, input, select, textarea');
      return Array.from(elements).slice(0, 10).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: el.className || null,
        text: el.textContent?.substring(0, 50) || null,
        role: el.getAttribute('role') || null,
        accessibleName: el.name || null,
        description: getAccessibleDescription(el),
        tabIndex: el.getAttribute('tabindex'),
      }));
    }
  });
  
  console.table(results[0].result);
}
```

## WCAG Compliance Checklist for Extension UIs

Use this checklist to ensure your extension meets WCAG 2.1 AA standards:

### Perceivable

- [ ] All images have appropriate alt text or are marked as decorative (`alt=""` or `role="presentation"`)
- [ ] Color is not the only means of conveying information
- [ ] Text has sufficient contrast (4.5:1 for normal text, 3:1 for large text)
- [ ] Content can be resized to 200% without loss of functionality
- [ ] Videos have captions or transcripts
- [ ] Audio can be paused or muted

### Operable

- [ ] All functionality is available via keyboard
- [ ] Focus order is logical and intuitive
- [ ] Focus is visible on all interactive elements
- [ ] No keyboard traps (users can always exit)
- [ ] Skip links are provided for main content
- [ ] Motion can be disabled via prefers-reduced-motion
- [ ] Sufficient time is provided for reading and interacting

### Understandable

- [ ] Language is declared in HTML (`lang="en"`)
- [ ] Error messages are descriptive and helpful
- [ ] Form inputs have associated labels
- [ ] Instructions are clear and concise
- [ ] Consistent navigation across pages
- [ ] Content is predictable in behavior

### Robust

- [ ] Valid HTML is used semantically correctly
- [ ] ARIA is used correctly (follows specification)
- [ ] Name, role, and value are available for all UI components
- [ ] Works across different browsers and assistive technologies
- [ ] No deprecated HTML elements

### Extension-Specific Checks

- [ ] Popup content is accessible within size constraints
- [ ] Side panel navigation is properly structured
- [ ] Options page forms are fully accessible
- [ ] Context menus have accessible labels
- [ ] Badge icons have text alternatives
- [ ] Keyboard shortcuts are documented and don't conflict with browser shortcuts
- [ ] Notifications are announced to screen readers

## Related Articles

- [Chrome Extension Keyboard Navigation](/chrome-extension-guide/guides/chrome-extension-keyboard-navigation.html) - Learn how to implement comprehensive keyboard navigation patterns in your extensions
- [Extension Accessibility Testing Guide](/chrome-extension-guide/guides/extension-a11y-testing.html) - Detailed testing methodologies and tools for verifying extension accessibility
- [Building with React for Extensions](/chrome-extension-guide/patterns/building-with-react.html) - Using React to build accessible extension interfaces with proper component patterns

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
