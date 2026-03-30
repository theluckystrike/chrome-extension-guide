---
layout: default
title: "Chrome Extension Animation Patterns. Best Practices"
description: "Create smooth animations in extension popups and content scripts."
canonical_url: "https://bestchromeextensions.com/patterns/animation-patterns/"
last_modified_at: 2026-01-15
---

Animation and Transition Patterns for Chrome Extensions

Practical patterns for adding motion to Chrome extension UIs -- popups, content script overlays, badge icons, loading states, toasts, drag interactions, theme transitions, and accessibility. All patterns respect user motion preferences.

---

Table of Contents {#table-of-contents}

1. [Popup Open/Close Transitions](#pattern-1-popup-openclose-transitions)
2. [Content Script Overlay Animations](#pattern-2-content-script-overlay-animations)
3. [Badge Animation (Pulse, Count-Up)](#pattern-3-badge-animation-pulse-count-up)
4. [Loading States and Skeleton Screens](#pattern-4-loading-states-and-skeleton-screens)
5. [Toast Notification Animations in Content Scripts](#pattern-5-toast-notification-animations-in-content-scripts)
6. [Drag and Reorder with Smooth Transitions](#pattern-6-drag-and-reorder-with-smooth-transitions)
7. [Dark/Light Theme Transition](#pattern-7-darklight-theme-transition)
8. [Respecting prefers-reduced-motion](#pattern-8-respecting-prefers-reduced-motion)
9. [Summary Table](#summary-table)

---

Pattern 1: Popup Open/Close Transitions {#pattern-1-popup-openclose-transitions}

Chrome popups appear instantly by default. Adding an entrance animation makes the UI feel polished. The trick is that there is no "close" event -- you must anticipate the close and play the exit animation preemptively.

Entrance Animation {#entrance-animation}

```css
/* popup.css */
body {
  width: 360px;
  min-height: 200px;
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  overflow: hidden;
}

.popup-content {
  animation: popup-enter 0.2s ease-out;
}

@keyframes popup-enter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

Staggered Content Entrance {#staggered-content-entrance}

```css
/* Each child section enters with a slight delay */
.popup-content > section {
  opacity: 0;
  animation: section-enter 0.25s ease-out forwards;
}

.popup-content > section:nth-child(1) { animation-delay: 0.05s; }
.popup-content > section:nth-child(2) { animation-delay: 0.1s; }
.popup-content > section:nth-child(3) { animation-delay: 0.15s; }
.popup-content > section:nth-child(4) { animation-delay: 0.2s; }

@keyframes section-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

View Transitions Within the Popup {#view-transitions-within-the-popup}

```typescript
// Smooth transition between popup "pages" (e.g., main view -> detail view)
function navigatePopupView(fromId: string, toId: string): void {
  const from = document.getElementById(fromId)!;
  const to = document.getElementById(toId)!;

  // Check if View Transitions API is available
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      from.hidden = true;
      to.hidden = false;
    });
  } else {
    // Fallback: CSS class-based transition
    from.classList.add('view-exit');
    from.addEventListener('animationend', () => {
      from.hidden = true;
      from.classList.remove('view-exit');
      to.hidden = false;
      to.classList.add('view-enter');
      to.addEventListener('animationend', () => {
        to.classList.remove('view-enter');
      }, { once: true });
    }, { once: true });
  }
}
```

```css
.view-exit {
  animation: slide-out-left 0.2s ease-in forwards;
}

.view-enter {
  animation: slide-in-right 0.2s ease-out forwards;
}

@keyframes slide-out-left {
  to { opacity: 0; transform: translateX(-20px); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

Keep popup entrance animations under 200ms. Use `startViewTransition` when available for page-like navigation inside the popup.

---

Pattern 2: Content Script Overlay Animations {#pattern-2-content-script-overlay-animations}

Content scripts inject UI into host pages. Overlays must animate smoothly without interfering with the page's own styles.

Slide-In Side Panel {#slide-in-side-panel}

```typescript
// content-overlay.ts
function createSidePanel(): HTMLElement {
  const shadow = document.createElement('div');
  shadow.id = 'ext-panel-host';
  const root = shadow.attachShadow({ mode: 'closed' });

  root.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        top: 0;
        right: 0;
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
      }

      .panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 360px;
        height: 100vh;
        background: #1a1a2e;
        color: #e0e0e0;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
      }

      .panel.open {
        transform: translateX(0);
      }

      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        transition: background 0.3s ease;
        pointer-events: none;
      }

      .backdrop.visible {
        background: rgba(0, 0, 0, 0.4);
        pointer-events: auto;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #333;
      }

      .close-btn {
        background: none;
        border: 1px solid #555;
        color: #e0e0e0;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
      }
    </style>
    <div class="backdrop"></div>
    <div class="panel" role="dialog" aria-label="Extension panel">
      <div class="panel-header">
        <h2>Extension</h2>
        <button class="close-btn">Close</button>
      </div>
      <div class="panel-body"></div>
    </div>
  `;

  const panel = root.querySelector('.panel') as HTMLElement;
  const backdrop = root.querySelector('.backdrop') as HTMLElement;
  const closeBtn = root.querySelector('.close-btn') as HTMLButtonElement;

  closeBtn.addEventListener('click', () => closePanel(panel, backdrop, shadow));
  backdrop.addEventListener('click', () => closePanel(panel, backdrop, shadow));

  document.body.appendChild(shadow);

  // Trigger animation after DOM insertion
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.classList.add('open');
      backdrop.classList.add('visible');
    });
  });

  return root.querySelector('.panel-body') as HTMLElement;
}

function closePanel(panel: HTMLElement, backdrop: HTMLElement, host: HTMLElement): void {
  panel.classList.remove('open');
  backdrop.classList.remove('visible');
  panel.addEventListener('transitionend', () => {
    host.remove();
  }, { once: true });
}
```

Fade-In Modal {#fade-in-modal}

```typescript
function createModal(content: string): void {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'closed' });

  root.innerHTML = `
    <style>
      .overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0);
        transition: background 0.25s ease;
      }

      .overlay.active {
        background: rgba(0, 0, 0, 0.5);
      }

      .modal {
        background: #1a1a2e;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 24px;
        max-width: 480px;
        width: 90%;
        opacity: 0;
        transform: scale(0.9) translateY(10px);
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .overlay.active .modal {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    </style>
    <div class="overlay" role="dialog" aria-modal="true">
      <div class="modal">${content}</div>
    </div>
  `;

  const overlay = root.querySelector('.overlay') as HTMLElement;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismissModal(overlay, host);
  });

  document.body.appendChild(host);
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function dismissModal(overlay: HTMLElement, host: HTMLElement): void {
  overlay.classList.remove('active');
  overlay.addEventListener('transitionend', () => host.remove(), { once: true });
}
```

Always use Shadow DOM to isolate animation styles from the host page. Use `requestAnimationFrame` double-nesting to ensure the browser has painted before triggering transitions.

---

Pattern 3: Badge Animation (Pulse, Count-Up) {#pattern-3-badge-animation-pulse-count-up}

Chrome's `chrome.action` API controls the toolbar badge. Since there is no CSS for the badge itself, animation requires programmatic updates.

Pulsing Badge Color {#pulsing-badge-color}

```typescript
// background.ts - Pulse badge between two colors to draw attention

async function pulseBadge(
  count: number,
  cycles = 3,
  intervalMs = 400
): Promise<void> {
  await chrome.action.setBadgeText({ text: String(count) });

  const colors: [number, number, number, number][] = [
    [255, 64, 64, 255],   // Red
    [200, 40, 40, 255],   // Darker red
  ];

  let i = 0;
  const timer = setInterval(() => {
    chrome.action.setBadgeBackgroundColor({ color: colors[i % 2] });
    i++;
    if (i >= cycles * 2) {
      clearInterval(timer);
      chrome.action.setBadgeBackgroundColor({ color: [66, 133, 244, 255] }); // Reset to blue
    }
  }, intervalMs);
}
```

Animated Count-Up {#animated-count-up}

```typescript
// Smoothly count up from 0 to the target number on the badge

async function animateBadgeCount(target: number, durationMs = 600): Promise<void> {
  if (target <= 0) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  const steps = Math.min(target, 15); // Cap frame count
  const stepDuration = durationMs / steps;
  let current = 0;

  return new Promise<void>((resolve) => {
    const timer = setInterval(async () => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        current = target;
        clearInterval(timer);
        resolve();
      }
      await chrome.action.setBadgeText({ text: String(current) });
    }, stepDuration);
  });
}

// Usage: when new items arrive
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'NEW_ITEMS') {
    await animateBadgeCount(msg.count);
    await pulseBadge(msg.count);
  }
});
```

Icon Swap Animation {#icon-swap-animation}

```typescript
// Alternate between icon frames to simulate animation

async function animateIcon(frames: string[], intervalMs = 200, cycles = 3): Promise<void> {
  let i = 0;
  const total = frames.length * cycles;

  return new Promise<void>((resolve) => {
    const timer = setInterval(async () => {
      await chrome.action.setIcon({ path: frames[i % frames.length] });
      i++;
      if (i >= total) {
        clearInterval(timer);
        await chrome.action.setIcon({ path: frames[0] }); // Reset to default
        resolve();
      }
    }, intervalMs);
  });
}

// Example: loading spinner icon frames
animateIcon([
  'icons/spinner-1.png',
  'icons/spinner-2.png',
  'icons/spinner-3.png',
  'icons/spinner-4.png',
], 150, 5);
```

Badge animations use `setInterval` and `setBadgeBackgroundColor` since there is no CSS access. Keep cycles short to avoid being annoying.

---

Pattern 4: Loading States and Skeleton Screens {#pattern-4-loading-states-and-skeleton-screens}

Show structure before data arrives. Skeleton screens reduce perceived load time compared to spinners.

Skeleton Screen CSS {#skeleton-screen-css}

```css
/* Shared skeleton styles */
.skeleton {
  background: linear-gradient(
    90deg,
    #2a2a3e 25%,
    #3a3a4e 50%,
    #2a2a3e 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite ease-in-out;
  border-radius: 4px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 14px;
  margin-bottom: 8px;
  width: 100%;
}

.skeleton-text.short { width: 60%; }
.skeleton-text.medium { width: 80%; }

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.skeleton-card {
  padding: 16px;
  border: 1px solid #333;
  border-radius: 8px;
  margin-bottom: 8px;
}

/* Transition from skeleton to real content */
.content-loaded {
  animation: content-reveal 0.3s ease-out;
}

@keyframes content-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Skeleton Template Generator {#skeleton-template-generator}

```typescript
function createSkeletonList(count: number): string {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-row" style="display:flex;gap:12px;align-items:center">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex:1">
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// Usage in popup
async function loadItems(): Promise<void> {
  const container = document.getElementById('items')!;

  // Show skeleton immediately
  container.innerHTML = createSkeletonList(5);

  // Fetch real data
  const items = await fetchItemsFromStorage();

  // Replace with real content
  container.innerHTML = '';
  container.classList.add('content-loaded');

  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'item-card';
    el.innerHTML = `
      <img src="${item.avatar}" alt="${item.name}" class="avatar">
      <div>
        <div class="name">${item.name}</div>
        <div class="detail">${item.detail}</div>
      </div>
    `;
    container.appendChild(el);
  }
}
```

Inline Loading Indicator {#inline-loading-indicator}

```typescript
// Button loading state with spinner
function setButtonLoading(btn: HTMLButtonElement, loading: boolean): void {
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.textContent || '';
    btn.innerHTML = `<span class="btn-spinner"></span> Loading...`;
  } else {
    btn.textContent = btn.dataset.originalText || 'Submit';
  }
}
```

```css
.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

Show skeletons immediately on popup open, then crossfade to real content. This eliminates the blank flash that makes extensions feel slow.

---

Pattern 5: Toast Notification Animations in Content Scripts {#pattern-5-toast-notification-animations-in-content-scripts}

Floating notifications that appear and auto-dismiss. These must be injected into host pages via content scripts without style leakage.

Toast Manager {#toast-manager}

```typescript
// content-toast.ts

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

class ToastManager {
  private host: HTMLElement;
  private root: ShadowRoot;
  private container: HTMLElement;
  private position: string;

  constructor(position = 'top-right') {
    this.position = position;
    this.host = document.createElement('div');
    this.host.id = 'ext-toast-host';
    this.root = this.host.attachShadow({ mode: 'closed' });

    const positionMap: Record<string, string> = {
      'top-right': 'top: 16px; right: 16px;',
      'top-left': 'top: 16px; left: 16px;',
      'bottom-right': 'bottom: 16px; right: 16px;',
      'bottom-left': 'bottom: 16px; left: 16px;',
    };

    this.root.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          ${positionMap[position] || positionMap['top-right']}
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          min-width: 280px;
          max-width: 400px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          pointer-events: auto;
          cursor: pointer;
          transform: translateX(calc(100% + 20px));
          opacity: 0;
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.35s ease;
        }

        :host-context([data-position^="top-left"]) .toast,
        .toast.from-left {
          transform: translateX(calc(-100% - 20px));
        }

        .toast.visible {
          transform: translateX(0);
          opacity: 1;
        }

        .toast.exit {
          transform: translateX(calc(100% + 20px));
          opacity: 0;
        }

        .toast.from-left.exit {
          transform: translateX(calc(-100% - 20px));
        }

        .toast-success { background: #1b5e20; color: #c8e6c9; border-left: 4px solid #4caf50; }
        .toast-error   { background: #b71c1c; color: #ffcdd2; border-left: 4px solid #f44336; }
        .toast-info    { background: #0d47a1; color: #bbdefb; border-left: 4px solid #2196f3; }
        .toast-warning { background: #e65100; color: #ffe0b2; border-left: 4px solid #ff9800; }

        .toast-icon { font-size: 18px; flex-shrink: 0; }
        .toast-message { font-size: 14px; line-height: 1.4; }
        .toast-close {
          margin-left: auto;
          background: none;
          border: none;
          color: inherit;
          opacity: 0.7;
          cursor: pointer;
          font-size: 16px;
          padding: 0 4px;
        }
        .toast-close:hover { opacity: 1; }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 0 0 0 8px;
          animation: toast-timer linear forwards;
        }

        @keyframes toast-timer {
          from { width: 100%; }
          to { width: 0%; }
        }
      </style>
      <div class="container"></div>
    `;

    this.container = this.root.querySelector('.container')!;
    document.body.appendChild(this.host);
  }

  show(options: ToastOptions): void {
    const { message, type = 'info', duration = 4000 } = options;
    const fromLeft = this.position.includes('left');

    const icons: Record<string, string> = {
      success: '\u2713', error: '\u2717', info: '\u2139', warning: '\u26A0',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}${fromLeft ? ' from-left' : ''}`;
    toast.setAttribute('role', 'alert');
    toast.style.position = 'relative';
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Dismiss">\u00D7</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    const dismiss = () => {
      toast.classList.remove('visible');
      toast.classList.add('exit');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.toast-close')!.addEventListener('click', dismiss);
    toast.addEventListener('click', dismiss);

    this.container.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('visible'));
    });

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  destroy(): void {
    this.host.remove();
  }
}

// Usage from content script
const toasts = new ToastManager('top-right');

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_TOAST') {
    toasts.show({
      message: msg.message,
      type: msg.toastType || 'info',
      duration: msg.duration || 4000,
    });
  }
});
```

Use Shadow DOM to prevent host page styles from breaking toast appearance. Auto-dismiss with a visible progress bar so users know when it will vanish.

---

Pattern 6: Drag and Reorder with Smooth Transitions {#pattern-6-drag-and-reorder-with-smooth-transitions}

Let users reorder lists (bookmarks, rules, shortcuts) with drag-and-drop that has smooth position transitions.

Sortable List {#sortable-list}

```typescript
class SortableList {
  private container: HTMLElement;
  private items: HTMLElement[] = [];
  private draggedItem: HTMLElement | null = null;
  private placeholder: HTMLElement;
  private onReorder: (order: string[]) => void;

  constructor(container: HTMLElement, onReorder: (order: string[]) => void) {
    this.container = container;
    this.onReorder = onReorder;

    this.placeholder = document.createElement('div');
    this.placeholder.className = 'sortable-placeholder';

    this.init();
  }

  private init(): void {
    this.items = Array.from(this.container.querySelectorAll('.sortable-item'));

    for (const item of this.items) {
      item.draggable = true;
      item.addEventListener('dragstart', (e) => this.onDragStart(e, item));
      item.addEventListener('dragover', (e) => this.onDragOver(e, item));
      item.addEventListener('dragend', () => this.onDragEnd());
    }

    this.container.addEventListener('dragover', (e) => e.preventDefault());
  }

  private onDragStart(e: DragEvent, item: HTMLElement): void {
    this.draggedItem = item;
    item.classList.add('dragging');

    // Ghost image
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      // Slight delay so the item is still visible for the ghost
      requestAnimationFrame(() => {
        item.style.opacity = '0.4';
      });
    }
  }

  private onDragOver(e: DragEvent, overItem: HTMLElement): void {
    e.preventDefault();
    if (!this.draggedItem || overItem === this.draggedItem) return;

    const rect = overItem.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const after = e.clientY > midY;

    // Animate other items moving out of the way
    const items = Array.from(this.container.querySelectorAll('.sortable-item:not(.dragging)'));
    items.forEach((el) => (el as HTMLElement).style.transition = 'transform 0.2s ease');

    if (after) {
      overItem.after(this.draggedItem);
    } else {
      overItem.before(this.draggedItem);
    }
  }

  private onDragEnd(): void {
    if (!this.draggedItem) return;

    this.draggedItem.classList.remove('dragging');
    this.draggedItem.style.opacity = '';

    // Animate into final position
    this.draggedItem.classList.add('drop-settle');
    this.draggedItem.addEventListener('animationend', () => {
      this.draggedItem?.classList.remove('drop-settle');
    }, { once: true });

    // Report new order
    const newOrder = Array.from(this.container.querySelectorAll('.sortable-item'))
      .map((el) => el.getAttribute('data-id')!)
      .filter(Boolean);
    this.onReorder(newOrder);

    this.draggedItem = null;
  }
}
```

CSS for Drag Interactions {#css-for-drag-interactions}

```css
.sortable-item {
  padding: 10px 14px;
  background: #1e1e32;
  border: 1px solid #333;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.sortable-item:active {
  cursor: grabbing;
}

.sortable-item.dragging {
  opacity: 0.4;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.sortable-placeholder {
  height: 48px;
  border: 2px dashed #00ff41;
  border-radius: 6px;
  margin-bottom: 4px;
  background: rgba(0, 255, 65, 0.05);
}

.drop-settle {
  animation: settle 0.25s ease-out;
}

@keyframes settle {
  0% { transform: scale(1.03); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); }
  100% { transform: scale(1); box-shadow: none; }
}

/* Drag handle icon */
.drag-handle {
  color: #555;
  cursor: grab;
  font-size: 16px;
  line-height: 1;
}

.drag-handle::before {
  content: '\2261'; /* hamburger/grip icon */
}
```

Persisting Order {#persisting-order}

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(
  defineSchema({ itemOrder: 'string' }),
  'sync'
);

const list = new SortableList(
  document.getElementById('rule-list')!,
  async (order: string[]) => {
    await storage.set('itemOrder', JSON.stringify(order));
  }
);

// On load, restore order
async function restoreOrder(): Promise<void> {
  const raw = await storage.get('itemOrder');
  if (!raw) return;

  const order: string[] = JSON.parse(raw);
  const container = document.getElementById('rule-list')!;
  const fragment = document.createDocumentFragment();

  for (const id of order) {
    const el = container.querySelector(`[data-id="${id}"]`);
    if (el) fragment.appendChild(el);
  }

  // Append any items not in the saved order (new items)
  container.querySelectorAll('.sortable-item').forEach((el) => {
    if (!fragment.contains(el)) fragment.appendChild(el);
  });

  container.appendChild(fragment);
}
```

Use native HTML5 drag-and-drop with CSS transitions on sibling elements to create smooth reorder animations. Persist the order to storage immediately.

---

Pattern 7: Dark/Light Theme Transition {#pattern-7-darklight-theme-transition}

Smooth theme switching without a jarring flash. Uses CSS custom properties and a transition overlay.

Theme System {#theme-system}

```typescript
type Theme = 'light' | 'dark' | 'system';

async function setTheme(theme: Theme): Promise<void> {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const root = document.documentElement;

  // Animate the transition
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      root.setAttribute('data-theme', resolved);
    });
  } else {
    // Fallback: cross-fade overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: ${resolved === 'dark' ? '#1a1a2e' : '#ffffff'};
      opacity: 0; transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.addEventListener('transitionend', () => {
        root.setAttribute('data-theme', resolved);
        requestAnimationFrame(() => {
          overlay.style.opacity = '0';
          overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        });
      }, { once: true });
    });
  }

  await chrome.storage.sync.set({ theme });
}
```

CSS Custom Properties {#css-custom-properties}

```css
:root,
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-card: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border: #e0e0e0;
  --accent: #1976d2;
  --accent-hover: #1565c0;
  --shadow: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #0d0d1a;
  --bg-card: #1e1e32;
  --text-primary: #e0e0e0;
  --text-secondary: #999999;
  --border: #333333;
  --accent: #00ff41;
  --accent-hover: #00cc33;
  --shadow: rgba(0, 0, 0, 0.4);
}

/* Apply transitions only to color properties */
body,
.card,
input,
select,
button {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}

/* Apply custom properties */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px var(--shadow);
}

input, select {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
```

Theme Toggle Button {#theme-toggle-button}

```typescript
class ThemeToggle {
  private btn: HTMLButtonElement;
  private current: Theme = 'system';

  constructor(buttonId: string) {
    this.btn = document.getElementById(buttonId) as HTMLButtonElement;
    this.btn.addEventListener('click', () => this.cycle());
    this.init();
  }

  private async init(): Promise<void> {
    const { theme } = await chrome.storage.sync.get('theme');
    this.current = (theme as Theme) || 'system';
    this.updateButton();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.current === 'system') {
          setTheme('system');
        }
      });

    // Apply initial theme without animation
    const resolved = this.current === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : this.current;
    document.documentElement.setAttribute('data-theme', resolved);
  }

  private async cycle(): Promise<void> {
    const order: Theme[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(this.current);
    this.current = order[(idx + 1) % order.length];
    this.updateButton();
    await setTheme(this.current);
  }

  private updateButton(): void {
    const labels: Record<Theme, string> = {
      light: 'Light',
      dark: 'Dark',
      system: 'Auto',
    };
    this.btn.textContent = labels[this.current];
    this.btn.setAttribute('aria-label', `Theme: ${labels[this.current]}. Click to change.`);
  }
}

new ThemeToggle('theme-toggle');
```

Use CSS custom properties for all theme-dependent values. Transition only color-related properties to avoid layout thrashing. Use View Transitions API when available.

---

Pattern 8: Respecting prefers-reduced-motion {#pattern-8-respecting-prefers-reduced-motion}

Users who enable "Reduce motion" in their OS settings expect extensions to respect that preference. This pattern shows how to conditionally disable animations throughout your extension.

CSS Approach: Disable All Animations {#css-approach-disable-all-animations}

```css
/* Global motion reduction */
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

Granular CSS: Replace Instead of Remove {#granular-css-replace-instead-of-remove}

```css
/* Instead of removing all motion, replace with gentler alternatives */
@media (prefers-reduced-motion: reduce) {
  /* Replace slide-in with fade-in */
  .popup-content {
    animation: fade-only 0.15s ease-out;
  }

  @keyframes fade-only {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Replace slide transitions with instant */
  .panel {
    transition: opacity 0.15s ease !important;
    transform: none !important;
  }

  .panel.open {
    opacity: 1;
  }

  .panel:not(.open) {
    opacity: 0;
    pointer-events: none;
  }

  /* Disable skeleton shimmer but keep the gray boxes */
  .skeleton {
    animation: none;
    background: #2a2a3e;
  }

  /* Replace toast slide with fade */
  .toast {
    transform: none !important;
    transition: opacity 0.15s ease !important;
  }

  .toast.visible {
    opacity: 1;
  }

  .toast.exit {
    opacity: 0;
  }

  /* Disable drag animation, keep snap behavior */
  .sortable-item {
    transition: none !important;
  }

  .drop-settle {
    animation: none;
  }
}
```

TypeScript: Query and React to Motion Preference {#typescript-query-and-react-to-motion-preference}

```typescript
// Utility: check if user prefers reduced motion
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Utility: get appropriate duration
function getAnimationDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs;
}

// Listen for changes (user might toggle it while extension is open)
function watchMotionPreference(callback: (reduced: boolean) => void): void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => callback(e.matches));
  // Call immediately with current value
  callback(mq.matches);
}

// Usage in animation code
function slideInPanel(panel: HTMLElement): void {
  if (prefersReducedMotion()) {
    // Instant show
    panel.style.transform = 'translateX(0)';
    panel.style.opacity = '1';
    return;
  }

  // Animated show
  panel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
  requestAnimationFrame(() => {
    panel.style.transform = 'translateX(0)';
    panel.style.opacity = '1';
  });
}
```

Background Script: Conditional Badge Animation {#background-script-conditional-badge-animation}

```typescript
// background.ts - Skip badge animation when reduced motion is preferred

// Service workers can't access window.matchMedia, so store the preference
let reducedMotion = false;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'MOTION_PREFERENCE') {
    reducedMotion = msg.reduced;
  }
});

async function updateBadge(count: number): Promise<void> {
  if (reducedMotion || count === 0) {
    // Direct update, no animation
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: [66, 133, 244, 255] });
    return;
  }

  // Animated update
  await animateBadgeCount(count);
  await pulseBadge(count);
}
```

Popup: Report Motion Preference to Background {#popup-report-motion-preference-to-background}

```typescript
// popup.ts - Tell the background script about the user's motion preference
watchMotionPreference((reduced) => {
  chrome.runtime.sendMessage({
    type: 'MOTION_PREFERENCE',
    reduced,
  });
});
```

Testing Reduced Motion {#testing-reduced-motion}

```typescript
// In development: force reduced motion for testing
// Add this to your dev tools console or a test helper
function simulateReducedMotion(reduced: boolean): void {
  if (reduced) {
    document.documentElement.style.setProperty('--force-reduced-motion', 'reduce');
    document.documentElement.classList.add('force-reduced-motion');
  } else {
    document.documentElement.style.removeProperty('--force-reduced-motion');
    document.documentElement.classList.remove('force-reduced-motion');
  }
}
```

```css
/* Support forced reduced motion for testing */
.force-reduced-motion *,
.force-reduced-motion *::before,
.force-reduced-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

Never just remove animations for reduced-motion users -- replace them with subtle fades or instant state changes. Always provide the same information that the animation conveyed (e.g., a new item appeared) through non-animated means.

---

Summary Table {#summary-table}

| Pattern | Technique | Key CSS/API | Reduced Motion Fallback |
|---|---|---|---|
| Popup transitions | CSS keyframe on load | `@keyframes`, `animation-delay` | Instant appear (fade only) |
| Content overlays | Shadow DOM + `transition` | `transform`, `cubic-bezier` | Fade in/out, no slide |
| Badge animation | `setInterval` + API calls | `setBadgeBackgroundColor`, `setIcon` | Direct update, no pulse |
| Skeleton screens | Shimmer gradient animation | `background-size`, `@keyframes` | Static gray placeholder |
| Toast notifications | Shadow DOM + slide + auto-dismiss | `transform`, `transitionend` | Fade in/out |
| Drag and reorder | HTML5 drag events + CSS | `draggable`, `dragover`, `transition` | Instant snap, no settle |
| Theme transition | CSS custom properties + View Transitions | `data-theme`, `startViewTransition` | Instant swap |
| Reduced motion | `prefers-reduced-motion` media query | `matchMedia`, `@media` | N/A (this IS the fallback) |

---

Further Reading {#further-reading}

- [Chrome Action API](https://developer.chrome.com/docs/extensions/reference/api/action)
- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
