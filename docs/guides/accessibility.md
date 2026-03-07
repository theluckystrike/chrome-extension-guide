# Accessibility in Chrome Extensions

Accessibility (a11y) is essential for Chrome extensions. Over 1 billion people worldwide have some form of disability, and extensions that ignore accessibility exclude a significant portion of potential users. Beyond ethics, accessible extensions are often required for enterprise deployment and comply with legal requirements in many jurisdictions.

This guide covers how to build accessible Chrome extensions following WCAG 2.1 AA guidelines, the industry standard for web accessibility.

## WCAG Compliance for Extension UIs

The Web Content Accessibility Guidelines (WCAG) 2.1 AA is the baseline for extension accessibility. Key principles include:

- **Perceivable**: Content must be presentable in ways users can perceive
- **Operable**: Interface components must be operable by all users
- **Understandable**: Information and operation must be understandable
- **Robust**: Content must be interpreted reliably by assistive technologies

Extensions must apply WCAG to all UI surfaces: popups, options pages, side panels, content script injections, and onboarding flows. Reference: https://developer.chrome.com/docs/extensions/develop/ui/accessibility

## Keyboard Navigation in Popups

All interactive elements in extension popups must be keyboard-accessible. This is the most fundamental accessibility requirement.

```javascript
// Handle keyboard navigation in popup
document.addEventListener('keydown', (e) => {
  const focusableElements = popup.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (e.key === 'Escape') {
    window.close();
  }

  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    navigateMenu(e.key === 'ArrowDown');
  }

  if (e.key === 'Enter' || e.key === ' ') {
    if (document.activeElement.tagName === 'BUTTON') {
      document.activeElement.click();
    }
  }
});

function navigateMenu(moveForward = true) {
  const items = menu.querySelectorAll('[role="menuitem"]');
  const currentIndex = Array.from(items).indexOf(document.activeElement);
  let nextIndex = moveForward ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex >= items.length) nextIndex = 0;
  if (nextIndex < 0) nextIndex = items.length - 1;

  items[nextIndex].focus();
}
```

## Focus Management in Extension Pages

Proper focus management ensures users can navigate efficiently. When a popup opens, focus should automatically move to the first interactive element. When closed, focus should return to the triggering element.

```javascript
// popup.js - On popup open
document.addEventListener('DOMContentLoaded', () => {
  const firstFocusable = popup.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (firstFocusable) {
    firstFocusable.focus();
  }
});

// Focus trap for modal dialogs
function createFocusTrap(container) {
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = container.querySelectorAll(focusableSelector);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  });

  return container;
}
```

## ARIA Labels and Roles

Semantic HTML should be your first choice, but ARIA (Accessible Rich Internet Applications) provides additional accessibility information when semantic elements aren't sufficient.

```html
<!-- Semantic HTML first -->
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="#dashboard">Dashboard</a></li>
    <li><a href="#settings">Settings</a></li>
  </ul>
</nav>

<!-- Custom interactive elements need roles -->
<div class="custom-toggle" role="switch" tabindex="0" 
     aria-checked="false" aria-label="Enable notifications">
  <span class="toggle-slider"></span>
</div>

<!-- Status announcements with live regions -->
<div aria-live="polite" aria-atomic="true" class="status-region">
  Settings saved successfully
</div>

<!-- Descriptions for complex controls -->
<button aria-describedby="tooltip-1" class="info-button">
  More info
</button>
<div id="tooltip-1" role="tooltip" hidden>
  Click to learn more about this feature
</div>
```

## Screen Reader Support

Screen readers convert visual interfaces into spoken output. Test with ChromeVox (built into ChromeOS), NVDA (Windows), or VoiceOver (macOS).

```javascript
// Announce dynamic content changes
function announceStatus(message, priority = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  document.body.appendChild(announcer);

  setTimeout(() => announcer.remove(), 1000);
}

// Hide decorative elements from screen readers
document.querySelectorAll('.decorative-icon').forEach(el => {
  el.setAttribute('aria-hidden', 'true');
});
```

## Color Contrast Requirements

WCAG AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (18px+ or 14px+ bold). Use Chrome DevTools to check contrast.

```css
/* Minimum contrast for text */
.text-primary {
  color: #212121; /* Contrast ratio: 16:1 on white */
  background-color: #ffffff;
}

/* Large text (18px+ or 14px+ bold) needs 3:1 */
.text-large {
  color: #595959; /* Contrast ratio: 4.5:1 on white */
  font-size: 18px;
}

/* Don't convey information with color alone */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #4CAF50;
}

.status-indicator[data-status="warning"]::before {
  background-color: #FF9800;
}

.status-indicator[data-status="warning"]::after {
  content: 'Warning'; /* Text backup for color-blind users */
}
```

## High Contrast Mode Support

Users with visual impairments often use high contrast mode. Use CSS media queries to detect and adapt.

```css
/* Detect high contrast mode */
@media (forced-colors: active) {
  .button-primary {
    forced-color-adjust: none;
    background-color: Highlight;
    color: HighlightText;
    border: 2px solid ButtonText;
  }

  .status-indicator::before {
    forced-color-adjust: none;
    background-color: CanvasText;
    border: 2px solid CanvasText;
  }

  /* Ensure focus indicators are visible */
  *:focus {
    outline: 3px solid CanvasText;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --text-primary: #e0e0e0;
    --accent-color: #4dabf7;
  }
}
```

## Reduced Motion Preferences

Respect users who experience motion sensitivity by respecting the `prefers-reduced-motion` media query.

```css
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

## Font Size and Zoom Handling

Allow text resize up to 200% without breaking layout. Use relative units (`rem`, `em`, `%`) rather than fixed pixels.

```css
/* Use rem for scalable text */
html {
  font-size: 100%; /* User's default, typically 16px */
}

body {
  font-size: 1rem; /* 16px base */
  line-height: 1.5;
}

/* Ensure layout doesn't break at high zoom */
.container {
  max-width: 100%;
  overflow-x: auto;
}

button, input, select, textarea {
  min-height: 44px; /* Minimum touch target size */
  min-width: 44px;
  font-size: 1rem; /* Prevent browser zoom on iOS */
}
```

## Accessible Forms in Options Pages

Every form input needs a properly associated label. Use fieldsets for grouped controls.

```html
<form id="settings-form">
  <fieldset>
    <legend>Notification Settings</legend>

    <label for="enable-notifications">
      <input type="checkbox" id="enable-notifications" name="notifications">
      Enable desktop notifications
    </label>

    <label for="notification-frequency">
      Notification frequency
      <select id="notification-frequency" name="frequency">
        <option value="immediate">Immediate</option>
        <option value="daily">Daily digest</option>
        <option value="weekly">Weekly summary</option>
      </select>
    </label>
  </fieldset>

  <fieldset>
    <legend>Appearance</legend>

    <label for="theme-select">
      Theme
      <select id="theme-select" name="theme" aria-describedby="theme-help">
        <option value="system">System default</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    <p id="theme-help">Choose your preferred color scheme</p>

    <label for="font-size">
      Font size
      <input type="range" id="font-size" name="fontSize" 
             min="12" max="24" value="16"
             aria-valuemin="12" aria-valuemax="24" aria-valuenow="16">
      <span aria-live="polite"><span id="font-size-value">16</span>px</span>
    </label>
  </fieldset>

  <button type="submit">Save settings</button>
  <div role="status" aria-live="polite" id="save-status"></div>
</form>

<script>
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('save-status');
  status.textContent = 'Saving...';

  try {
    await saveSettings(new FormData(e.target));
    status.textContent = 'Settings saved successfully';
    setTimeout(() => status.textContent = '', 3000);
  } catch (error) {
    status.textContent = 'Error: ' + error.message;
    status.setAttribute('role', 'alert');
  }
});
</script>
```

## Accessible Context Menus

Context menus triggered by browser.contextMenus should also be accessible. While Chrome handles the native context menu accessibility, ensure your extension's internal menus are accessible.

```javascript
// Create accessible context menu items
chrome.contextMenus.create({
  id: 'extension-menu',
  title: 'Extension Tools',
  contexts: ['selection']
});

chrome.contextMenus.create({
  parentId: 'extension-menu',
  id: 'analyze-text',
  title: 'Analyze selected text',
  contexts: ['selection']
});

chrome.contextMenus.create({
  parentId: 'extension-menu',
  id: 'search-web',
  title: 'Search the web',
  contexts: ['selection']
});
```

## Accessible Notifications

When using chrome.notifications, provide accessible information for screen readers.

```javascript
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icons/icon-128.png',
  title: 'Extension Update Available',
  message: 'A new version is ready to install. Click to update.',
  priority: 1,
  requireInteraction: true
  // Note: Notifications are announced by screen readers
  // Keep messages concise and meaningful
});
```

## Accessible Extension Icons

Icons should have alternative text when used in ways users can see them. For extension icons shown in the toolbar, use the default tooltip, but for icons within your UI:

```html
<button class="icon-button" aria-label="Settings">
  <svg aria-hidden="true" focusable="false">
    <use href="/icons/settings.svg"></use>
  </svg>
</button>

<!-- For images -->
<img src="extension-logo.png" alt="Extension logo">
```

## Accessible Onboarding Flows

Onboarding flows must be accessible, including any welcome pages or tutorial steps.

```html
<!-- Onboarding dialog -->
<dialog id="onboarding-dialog" aria-labelledby="onboarding-title">
  <h1 id="onboarding-title">Welcome to Extension Name</h1>

  <div role="region" aria-label="Step indicator">
    <span aria-current="step">Step 1 of 3</span>
  </div>

  <div id="step-content">
    <p>Let's get started by granting necessary permissions.</p>
  </div>

  <div class="onboarding-actions">
    <button id="skip-btn" type="button">Skip</button>
    <button id="next-btn" type="button" autofocus>Next</button>
  </div>
</dialog>
```

## Testing Accessibility with axe-core

Use axe-core for automated accessibility testing in your extension.

```javascript
// Install: npm install axe-core
import axe from 'axe-core';

async function runAccessibilityAudit() {
  const results = await axe.run();

  if (results.violations.length > 0) {
    console.error('Accessibility violations found:');
    results.violations.forEach(violation => {
      console.error(`- ${violation.id}: ${violation.description}`);
      console.error(`  Impact: ${violation.impact}`);
      violation.nodes.forEach(node => {
        console.error(`  Element: ${node.html}`);
      });
    });
  }

  return results;
}

// Run in popup/options page
document.addEventListener('DOMContentLoaded', () => {
  if (process.env.NODE_ENV !== 'production') {
    runAccessibilityAudit();
  }
});
```

## Chrome Accessibility DevTools

Chrome DevTools provides excellent accessibility auditing:

1. **Accessibility Panel** (Elements tab): Inspect accessibility tree, ARIA attributes, and computed properties
2. **Lighthouse Audit**: Run accessibility audits with detailed reports
3. **Rendering Tab**: Emulate vision deficiencies (blur, protanopia, deuteranopia, tritanopia)
4. **Contrast Checker**: Use color picker to check contrast ratios

```javascript
// Open DevTools accessibility panel programmatically
chrome.devtools.panels.create(
  'Accessibility',
  'icons/accessibility.png',
  'panel.html',
  (panel) => {
    panel.onShown.addListener((panelWindow) => {
      // Initialize accessibility tools
    });
  }
);
```

## Accessibility Checklist

Before publishing your extension, verify:

- [ ] All interactive elements keyboard-accessible (Tab, Enter, Space, Escape)
- [ ] Focus managed correctly on popup open/close
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] No information conveyed by color alone
- [ ] Screen reader tested (ChromeVox, NVDA, or VoiceOver)
- [ ] ARIA labels on non-semantic interactive elements
- [ ] Form inputs have properly associated labels
- [ ] Dynamic content uses aria-live regions
- [ ] Reduced motion preference respected
- [ ] Text resizable to 200% without layout break
- [ ] High contrast mode supported
- [ ] Focus indicators visible (3:1 contrast minimum)
- [ ] Touch targets minimum 44x44px
- [ ] No auto-playing animations without user control

## Common Mistakes to Avoid

- Using `<div onclick>` instead of `<button>` — not keyboard accessible
- Missing form labels — screen readers cannot identify inputs
- Low contrast text — fails WCAG, difficult to read
- Trapping focus without Escape key to exit
- Redundant `aria-label` on elements with visible text
- Using `tabindex > 0` — breaks natural tab order
- Missing alt text on informative images
- Not announcing dynamic content changes

## Additional Resources

- [Chrome Extension Accessibility Documentation](https://developer.chrome.com/docs/extensions/develop/ui/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core GitHub](https://github.com/dequelabs/axe-core)
- [ChromeVox Tutorial](https://support.google.com/chromebook/answer/7031755)
