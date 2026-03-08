---
layout: default
title: "Chrome Extension Accessibility Implementation — Developer Guide"
description: "Learn Chrome extension accessibility implementation with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/accessibility/"
---
# Accessibility in Chrome Extensions

## Introduction {#introduction}
- Extensions add UI (popups, options, side panels) that must be accessible
- 15% of users have some disability — a11y is not optional
- Chrome extensions should follow WCAG 2.1 AA guidelines

## Popup Accessibility {#popup-accessibility}
- Use semantic HTML: `<button>`, `<nav>`, `<main>`, `<h1>`-`<h6>`, not `<div>` for everything
- ARIA roles and labels: `aria-label`, `aria-labelledby`, `aria-describedby`
- `role="status"` for live update regions, `aria-live="polite"` for dynamic content
- Keyboard navigation: Tab order, Enter/Space for buttons, Escape to close
- Focus management: auto-focus first interactive element on popup open
- Focus trap: keep focus inside popup (it's a separate window)

## Options Page Accessibility {#options-page-accessibility}
- Form labels: every `<input>` needs a `<label>` with `for` attribute
- Fieldsets and legends for grouped controls
- Error messages: `aria-invalid="true"` + `aria-describedby` pointing to error text
- Save confirmation: `aria-live` region for "Settings saved" feedback

## Side Panel Accessibility {#side-panel-accessibility}
- Same rules as popup but persistent — manage focus on panel open
- Scrollable content: ensure keyboard scrolling works
- Cross-ref: `docs/mv3/side-panel.md`

## Keyboard Navigation {#keyboard-navigation}
- All interactive elements must be reachable via Tab key
- `tabindex="0"` for custom interactive elements
- `tabindex="-1"` for programmatically focusable elements
- Key handlers: Enter/Space for buttons, Arrow keys for menus/lists
- `Escape` to close popups, dismiss dialogs
- Never use `tabindex > 0` — breaks natural tab order
```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePopup();
  if (e.key === 'ArrowDown') focusNextItem();
  if (e.key === 'ArrowUp') focusPreviousItem();
});
```

## Color and Contrast {#color-and-contrast}
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- Don't convey information with color alone — use icons, text, patterns too
- Test with Chrome DevTools: Rendering > Emulate vision deficiencies
- Support high contrast mode: `@media (forced-colors: active)`
- Support dark mode: `@media (prefers-color-scheme: dark)`
- Store user preference with `@theluckystrike/webext-storage`

## Screen Reader Support {#screen-reader-support}
- Test with ChromeVox (built into ChromeOS), NVDA (Windows), VoiceOver (macOS)
- Meaningful alt text for images: `<img alt="Extension icon showing...">`
- Hide decorative elements: `aria-hidden="true"`
- Announce dynamic changes: `aria-live="polite"` regions
- Use `chrome.tts` for custom speech output (cross-ref: `docs/permissions/tts.md`)

## Reduced Motion {#reduced-motion}
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition-duration: 0.01ms !important; }
}
```
- Respect user's OS setting
- Avoid auto-playing animations

## Font and Text {#font-and-text}
- Use relative units (`rem`, `em`) not fixed `px` for text
- Minimum 14px equivalent for body text
- Allow text resize without breaking layout
- Line height: at least 1.5x font size

## Content Script Injected UI {#content-script-injected-ui}
- Injected elements must also be accessible
- Use Shadow DOM to isolate styles but ensure a11y tree is correct
- Don't break the page's existing accessibility
- Use `role` and `aria-*` on injected elements

## Testing Tools {#testing-tools}
- Chrome DevTools: Accessibility panel (in Elements), Lighthouse audit
- axe DevTools extension
- ChromeVox screen reader
- Keyboard-only navigation testing
- Color contrast checker in DevTools

## Accessibility Checklist {#accessibility-checklist}
- [ ] All interactive elements keyboard-accessible
- [ ] Proper focus management in popup/panel
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Screen reader tested (ChromeVox/NVDA)
- [ ] ARIA labels on non-semantic elements
- [ ] Form inputs have associated labels
- [ ] Dynamic content uses aria-live regions
- [ ] Reduced motion respected
- [ ] Text resizable without layout break
- [ ] No information conveyed by color alone

## Common Mistakes {#common-mistakes}
- Using `<div onclick>` instead of `<button>` — not keyboard accessible
- Missing form labels — screen readers can't identify inputs
- Low contrast text — fails WCAG, hard to read in bright light
- Trapping focus without Escape key exit
- `aria-label` on elements that already have visible text (redundant)

## Related Articles {#related-articles}

- [Accessibility Patterns](../patterns/accessibility.md)
- [Keyboard Shortcuts Guide](../guides/keyboard-shortcuts.md)
- [Accessibility Testing](../guides/extension-a11y-testing.md)
