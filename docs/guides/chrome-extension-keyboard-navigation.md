---
layout: default
title: "Chrome Extension Keyboard Navigation — Developer Guide"
description: "Learn Chrome extension keyboard navigation with this developer guide covering implementation, best practices, and code examples."
---
# Keyboard Navigation in Chrome Extensions

## Introduction
- Extension UIs (popups, options pages, side panels) must be fully keyboard accessible
- Many users rely on keyboards for navigation — it's core accessibility
- This guide covers keyboard patterns for extension-specific UI components

## Focus Management

### Auto-Focus First Element
- Popups should auto-focus the first interactive element on open
- Prevents users from having to tab through irrelevant content
```javascript
// popup.js - run on popup open
document.addEventListener('DOMContentLoaded', () => {
  const firstFocusable = document.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (firstFocusable) firstFocusable.focus();
});
```

### Tab Order with tabindex
- Use `tabindex="0"` for custom interactive elements (make them focusable)
- Use `tabindex="-1"` for elements that need programmatic focus but not tab order
- Never use `tabindex > 0` — it disrupts natural tab sequence
- Rely on DOM order: place elements in logical tab sequence

## Arrow Key Navigation

### Roving Tabindex Pattern
- For lists and grids: only one item has `tabindex="0"`, others have `-1`
- Arrow keys move focus and update which element has `tabindex="0"`
- This is the standard pattern for menu items, list views, and grids
```javascript
// Roving tabindex for a list
const listItems = document.querySelectorAll('.list-item');
listItems.forEach((item, index) => {
  item.setAttribute('tabindex', index === 0 ? '0' : '-1');
  item.addEventListener('keydown', (e) => {
    let newIndex = index;
    if (e.key === 'ArrowDown') newIndex = (index + 1) % listItems.length;
    if (e.key === 'ArrowUp') newIndex = (index - 1 + listItems.length) % listItems.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      listItems[index].setAttribute('tabindex', '-1');
      listItems[newIndex].setAttribute('tabindex', '0');
      listItems[newIndex].focus();
    }
  });
});
```

## Extension Keyboard Shortcuts

### chrome.commands API
- Define shortcuts in manifest.json for global and extension-specific shortcuts
```json
{
  "commands": {
    "toggle-popup": {
      "suggested_key": "Ctrl+Shift+P",
      "description": "Toggle the extension popup"
    },
    "open-options": {
      "suggested_key": "Ctrl+Shift+O",
      "description": "Open extension options"
    }
  }
}
```
- Listen for commands in the service worker
```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-popup') // handle toggle
  if (command === 'open-options') chrome.runtime.openOptionsPage();
});
```
- Cross-ref: See [commands-keyboard-shortcuts.md](./commands-keyboard-shortcuts.md) for full reference

## Focus Trapping in Modals

### Modal Focus Trap
- When a modal opens, Tab should cycle only within the modal
- Restore focus to trigger element when modal closes
```javascript
function trapFocus(container) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
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
}
```

## Search Patterns

### Search Auto-Focus and Escape
- Auto-focus search input when user starts typing or opens a view
- Escape clears search and returns focus to main content
```javascript
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    searchInput.blur();
    document.querySelector('.main-content').focus();
  }
});
// Auto-focus on '/'
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});
```

## List Interaction Patterns

### Enter, Space, Delete
- Enter: select item, navigate to detail, or submit
- Space: toggle checkbox, expand/collapse, or play/pause
- Delete/Backspace: remove selected item with confirmation
```javascript
listItem.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') openItem(item.id);
  if (e.key === ' ') {
    e.preventDefault();
    toggleItemSelection(item.id);
  }
  if (e.key === 'Delete') {
    e.preventDefault();
    confirmAndRemove(item.id);
  }
});
```

## Visual Focus Indicators

### Never Remove Outline
- Never use `outline: none` without providing an alternative focus style
- Custom focus indicators: border, background color, or box-shadow
```css
/* Always visible focus */
:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Enhanced focus for interactive elements */
button:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.3);
}
```

## Screen Reader Support

### ARIA Live Regions
- Announce dynamic updates to screen readers
- Use `aria-live="polite"` for non-critical updates, "assertive" for urgent
```html
<div aria-live="polite" class="sr-only" id="status-announcer"></div>
```
```javascript
function announce(message) {
  const announcer = document.getElementById('status-announcer');
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = message; }, 50);
}
```

## Related Guides
- [accessibility.md](./accessibility.md) — Full accessibility guide
- [keyboard-shortcuts.md](./keyboard-shortcuts.md) — Extension shortcut configuration
- [commands-keyboard-shortcuts.md](./commands-keyboard-shortcuts.md) — Commands API deep dive

## Related Articles

- [Accessibility](../guides/accessibility.md)
- [Keyboard Shortcuts](../guides/commands-keyboard-shortcuts.md)
