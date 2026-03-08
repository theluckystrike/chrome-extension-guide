---
layout: default
title: "Chrome Extension Popup State Persistence — Best Practices"
description: "Persist popup UI state across sessions."
---

# Popup State Persistence

## Overview

Chrome extension popups are ephemeral by design. When a user clicks outside the popup or presses Escape, the popup closes and all in-memory state is lost. Any form inputs, scroll positions, active selections, and UI state vanish. This creates a frustrating user experience for extensions with complex forms, multi-step wizards, or feature-rich interfaces.

This pattern covers techniques to persist popup state across closures, ensuring users resume where they left off. For extensions requiring truly persistent UI, consider alternatives like side panels or tab-based interfaces.

---

## The Problem

When a popup closes, Chrome destroys the DOM and JavaScript context entirely. Unlike tabs, popups have no navigation history and cannot be restored from the back button. This affects several user experience aspects:

**Form Data Loss**: Text inputs, checkboxes, selects, and other form controls lose their values when the popup reopens.

**Scroll Position Reset**: Users lose their place in long lists or scrollable content.

**Active Section/Tab Memory**: Navigational state within the popup, such as which tab or accordion section is open, resets to defaults.

**Selection State**: Any selected items, highlighted rows, or checked options disappear.

---

## Solution: storage.session Persistence

The most appropriate storage for ephemeral popup state is `chrome.storage.session`. This API stores data in memory while the browser session is active and clears when the browser closes. It's faster than `chrome.storage.local` and appropriate for data that shouldn't persist across browser restarts.

### Basic Implementation

```typescript
// popup.ts - Save state on every change
const STORAGE_KEY = 'popupState';

interface PopupState {
  formData: Record<string, unknown>;
  activeTab: string;
  scrollPosition: number;
}

function getStorageKey(): string {
  return `${STORAGE_KEY}`;
}

async function saveState(state: PopupState): Promise<void> {
  await chrome.storage.session.set({ [getStorageKey()]: state });
}

async function loadState(): Promise<PopupState | null> {
  const result = await chrome.storage.session.get(getStorageKey());
  return result[getStorageKey()] || null;
}

// Restore on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const state = await loadState();
  if (state) {
    restoreForm(state.formData);
    restoreScrollPosition(state.scrollPosition);
    switchTab(state.activeTab);
  }
});
```

---

## Debounced Saves

Saving on every keystroke or scroll event creates excessive storage writes. Use debouncing to batch updates:

```typescript
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

const debouncedSave = debounce(async (state: PopupState) => {
  await saveState(state);
}, 300);

// Attach to input events
document.querySelectorAll('input, select, textarea').forEach(el => {
  el.addEventListener('input', () => {
    const state = captureCurrentState();
    debouncedSave(state);
  });
});

// Capture scroll position with debounce
let scrollTimeout: number;
document.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = window.setTimeout(() => {
    saveState({ ...captureCurrentState(), scrollPosition: window.scrollY });
  }, 150);
});
```

---

## Scroll Position Persistence

Restoring scroll position requires capturing it before the popup closes and applying it after the DOM is ready:

```typescript
// Capture scroll before popup potentially closes
window.addEventListener('beforeunload', () => {
  const state = captureCurrentState();
  state.scrollPosition = window.scrollY;
  saveState(state);
});

// Restore with a slight delay to ensure DOM is ready
async function restoreScrollPosition(position: number): Promise<void> {
  // Wait for any lazy-loaded content
  await new Promise(resolve => setTimeout(resolve, 100));
  window.scrollTo({ top: position, behavior: 'instant' });
}
```

---

## Active Tab/Section Memory

Track and restore navigational state within the popup:

```typescript
interface NavigationState {
  activeTabId: string;
  expandedSections: string[];
  selectedItemId: string | null;
}

function switchTab(tabId: string): void {
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== tabId);
  });
  document.querySelectorAll('.tab-button').forEach(el => {
    el.classList.toggle('active', el.dataset.tabId === tabId);
  });
  
  const state = captureCurrentState();
  state.activeTabId = tabId;
  saveState(state);
}

// Initialize - switch to saved tab or default
document.addEventListener('DOMContentLoaded', async () => {
  const state = await loadState();
  if (state?.activeTabId) {
    switchTab(state.activeTabId);
  }
});
```

---

## Using @theluckystrike/webext-storage

For TypeScript projects, `@theluckystrike/webext-storage` provides typed persistence with less boilerplate:

```typescript
import { createStorage } from '@theluckystrike/webext-storage';

interface PopupState {
  formData: Record<string, unknown>;
  activeTab: string;
  scrollPosition: number;
}

const popupStorage = createStorage<PopupState>('popupState', {
  formData: {},
  activeTab: 'main',
  scrollPosition: 0,
});

// Reactive state - auto-saves on changes
class PopupStateManager {
  private state: PopupState;
  private debouncedSave = debounce((s: PopupState) => {
    popupStorage.set(s);
  }, 300);

  constructor() {
    this.state = { ...popupStorage.get() };
  }

  updateFormData(data: Record<string, unknown>): void {
    this.state.formData = { ...this.state.formData, ...data };
    this.debouncedSave(this.state);
  }

  updateActiveTab(tabId: string): void {
    this.state.activeTab = tabId;
    popupStorage.set(this.state);
  }

  getState(): PopupState {
    return this.state;
  }
}
```

---

## Alternative: Side Panel for Persistent UI

For extensions requiring always-available UI that persists across browser sessions, consider the side panel:

```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

The side panel remains open while browsing and maintains DOM state. See [Side Panel Patterns](./side-panel.md) for implementation details.

---

## Alternative: Tab-Based Interface

Open complex UIs as tabs instead of popups for full persistence:

```typescript
document.getElementById('expand-btn')?.addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html?mode=tab')
  });
  window.close();
});
```

Tabs maintain scroll position, form state, and navigation automatically. See [Popup-to-Tab Pattern](./popup-to-tab.md) for detailed implementation.

---

## Related Patterns

This pattern works alongside several other extension development approaches. The [State Management](./state-management.md) pattern provides centralized state architecture for larger extensions. For truly persistent UI, the [Side Panel](./side-panel.md) or [Popup-to-Tab](./popup-to-tab.md) patterns offer alternative interaction models that eliminate the persistence problem entirely.
