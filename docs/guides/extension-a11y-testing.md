---
layout: default
title: "Chrome Extension Accessibility Testing — Developer Guide"
description: "Master Chrome extension debugging and testing with this guide covering tools, techniques, and common issues."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/extension-a11y-testing/"
---
# Accessibility Testing for Chrome Extensions

## Overview {#overview}
Accessibility testing ensures extension UIs work for all users, including those using assistive technologies. Chrome extensions present unique testing challenges due to popup windows, content script injections, and isolated contexts.

## Testing Tools {#testing-tools}

### Chrome DevTools Lighthouse Audit {#chrome-devtools-lighthouse-audit}
Run Lighthouse accessibility audits directly on extension pages:
1. Open extension popup or options page
2. DevTools > Lighthouse tab
3. Select "Accessibility" category
4. Run audit to get WCAG compliance score

### axe-core Integration {#axe-core-integration}
Add axe-core to automated tests for continuous a11y validation:
```javascript
import axe from 'axe-core';

async function runAccessibilityTest() {
  const results = await axe.run(document);
  if (results.violations.length > 0) {
    console.error('Accessibility violations:', results.violations);
  }
}
```

### WAVE Extension {#wave-extension}
Web Accessibility Evaluation tool identifies:
- Missing alt text
- Contrast errors
- Missing form labels
- ARIA issues

## Popup Accessibility Testing {#popup-accessibility-testing}

### Keyboard Navigation {#keyboard-navigation}
Verify all interactions work without a mouse:
- Tab through all interactive elements
- Enter/Space activates buttons
- Arrow keys navigate menus
- Escape closes popup
- All actions reachable via keyboard only

### Focus Management {#focus-management}
Test focus behavior:
- First interactive element receives focus on popup open
- Focus trapped inside popup (doesn't escape to page)
- Focus returns to trigger element on close
- No focus loss during dynamic content updates

### Screen Reader Compatibility {#screen-reader-compatibility}
Test with ChromeVox, NVDA, and VoiceOver:
- All elements announce correct roles
- Labels properly associated with inputs
- Dynamic updates announced via aria-live
- No redundant announcements

## Color Contrast Testing {#color-contrast-testing}

### Popup and Options Pages {#popup-and-options-pages}
Check contrast ratios using DevTools:
1. Elements panel > computed styles
2. Look for color and background-color
3. Use color picker to verify 4.5:1 for normal text (3:1 for large text)

### High Contrast Mode {#high-contrast-mode}
Test with `@media (forced-colors: active)`:
- Ensure focus indicators visible
- Verify button text remains readable
- Check form borders render correctly

## Content Script Testing {#content-script-testing}

### Injected UI Accessibility {#injected-ui-accessibility}
Content scripts inject UI into host pages—test that you don't break page accessibility:
- Injected elements use proper ARIA roles
- Shadow DOM maintains correct accessibility tree
- No conflicts with page ARIA labels
- Injected modals trap focus correctly

### Host Page Compatibility {#host-page-compatibility}
- Verify extension doesn't override page focus
- Check injected styles don't override page a11y
- Test with various screen reader + browser combinations

## Screen Reader Testing {#screen-reader-testing}

### ChromeVox (ChromeOS) {#chromevox-chromeos}
- Built into Chrome, easiest to test
- Navigate popup with Tab, arrow keys
- Verify all announcements are meaningful

### NVDA (Windows) {#nvda-windows}
- Most popular Windows screen reader
- Test form field announcements
- Check heading navigation (H key)

### VoiceOver (macOS) {#voiceover-macos}
- Use rotor to navigate by headings, links, form fields
- Verify Smart Backward compatibility

## Keyboard-Only Navigation {#keyboard-only-navigation}

Ensure every action works without a mouse:
- All buttons/links keyboard-activatable
- No click-only interactions
- Custom dropdowns/keyboard navigable
- Drag-and-drop alternatives exist

## Focus Trapping in Modals {#focus-trapping-in-modals}

Extension modals and overlays must trap focus:
```javascript
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
}
```

## High Contrast and Reduced Motion {#high-contrast-and-reduced-motion}

### High Contrast Mode {#high-contrast-mode}
Test using DevTools rendering emulations:
- Forced colors mode
- Contrast boost
- Custom CSS: `@media (forced-colors: active) { ... }`

### Reduced Motion {#reduced-motion}
Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
  * { transition: none !important; }
}
```

## Automated Testing with axe-core {#automated-testing-with-axe-core}

Add axe-core to unit/integration tests:
```javascript
describe('Accessibility', () => {
  it('popup passes axe-core audit', async () => {
    const results = await axe.run(popupContainer);
    expect(results.violations).toHaveLength(0);
  });
});
```

## WCAG 2.1 AA Compliance Checklist {#wcag-21-aa-compliance-checklist}

- [ ] All text meets 4.5:1 contrast ratio
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators clearly visible
- [ ] Form inputs have associated labels
- [ ] Images have appropriate alt text
- [ ] Headings follow proper hierarchy (h1 > h2 > h3)
- [ ] Focus trapped in modals/overlays
- [ ] Dynamic content announced via aria-live
- [ ] Reduced motion preference respected
- [ ] High contrast mode supported

## Common Violations {#common-violations}

### Missing Alt Text {#missing-alt-text}
```javascript
// Bad
<img src="icon.png">

// Good
<img src="icon.png" alt="Settings gear icon">
```

### Insufficient Contrast {#insufficient-contrast}
- Text color too light against background
- Icon color indistinguishable from surroundings
- Use DevTools to verify 4.5:1 ratio

### Missing Form Labels {#missing-form-labels}
```javascript
// Bad
<input type="text" placeholder="Email">

// Good
<label for="email">Email</label>
<input type="text" id="email" placeholder="Email">
```

### No Focus Indicators {#no-focus-indicators}
Never remove outline without replacement:
```css
/* Bad */
*:focus { outline: none; }

/* Good */
*:focus { outline: 2px solid currentColor; outline-offset: 2px; }
```

## Related Guides {#related-guides}
- [Accessibility](guides/accessibility.md) - General a11y principles
- [Accessibility Patterns](patterns/accessibility.md) - Implementation patterns

## Related Articles {#related-articles}

## Related Articles

- [Accessibility](../guides/accessibility.md)
- [Testing Extensions](../guides/testing-extensions.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
