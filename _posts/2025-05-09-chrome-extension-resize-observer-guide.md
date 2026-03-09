---
layout: post
title: "ResizeObserver in Chrome Extensions: Responsive Popups and Panels"
description: "Master ResizeObserver in Chrome extensions to build responsive popups and panels that adapt dynamically to container size changes. Practical examples and best practices."
date: 2025-05-09
categories: [Chrome Extensions, APIs]
tags: [resize-observer, responsive, chrome-extension]
keywords: "chrome extension resize observer, responsive popup chrome, chrome extension resize, dynamic popup size, ResizeObserver extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/05/09/chrome-extension-resize-observer-guide/"
---

# ResizeObserver in Chrome Extensions: Responsive Popups and Panels

Creating truly responsive user interfaces within Chrome extensions requires more than just CSS media queries and percentage-based layouts. Chrome extensions operate within constrained environments—popups with fixed dimensions, side panels that users can resize, and options pages that open in standard browser tabs. Each of these contexts presents unique challenges that traditional responsive design approaches simply cannot address effectively. This is where the ResizeObserver API becomes an essential tool in every extension developer's toolkit.

ResizeObserver provides a powerful mechanism for detecting and responding to changes in element dimensions in real-time. Unlike older approaches that relied on polling or window resize events, ResizeObserver offers precise, performant observation of any element's size changes. For Chrome extension developers, this capability opens up a world of possibilities for creating fluid, adaptive interfaces that respond intelligently to their container's dimensions.

---

## Understanding ResizeObserver Fundamentals

Before exploring extension-specific implementations, developers must grasp the core concepts that make ResizeObserver such a valuable API. At its simplest, ResizeObserver allows you to register a callback function that fires whenever an observed element's dimensions change. This callback receives an array of ResizeObserverEntry objects, each containing detailed information about the size transformations.

The API provides multiple size properties that developers can leverage:

- **contentBoxSize**: The dimensions of the content area
- **borderBoxSize**: The dimensions including the border
- **devicePixelRatio**: The device pixel ratio for precise rendering
- **inlineSize** and **blockSize**: CSS logical properties for writing-mode support

```javascript
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentBoxSize[0];
    console.log(`Element new size: ${width}x${height}`);
  }
});

observer.observe(document.getElementById('popup-container'));
```

What makes ResizeObserver particularly valuable for Chrome extensions is its ability to observe any element, not just the viewport. This means you can observe your popup's root container, individual UI components, or even elements within injected content scripts.

---

## Why ResizeObserver Is Essential for Chrome Extensions

Chrome extensions face sizing challenges that differ substantially from traditional web development. When users click your extension icon, they expect a popup that fits elegantly within their current view. Side panels can be resized by users, creating fluid dimensions that CSS alone cannot elegantly handle. Options pages might open in regular tabs where users have various zoom levels and screen sizes.

The traditional approach of using percentage widths and media queries, while useful, cannot capture the actual available space within your extension's container. A popup might have abundant vertical space but constrained horizontal room. CSS media queries cannot easily detect these specific constraints and adapt your layout accordingly.

ResizeObserver solves this problem elegantly. By observing your container element, you can programmatically adjust your entire UI based on the precise available space. This enables truly dynamic layouts that go far beyond what CSS can accomplish:

- Show or hide elements based on available height
- Dynamically adjust font sizes based on available width
- Switch between single-column and multi-column layouts seamlessly
- Modify interface complexity based on space constraints
- Implement collapsible sections that respond to user preferences

---

## Implementing ResizeObserver in Extension Popups

Extension popups present unique opportunities for ResizeObserver implementation. Unlike fixed-size popups defined in your manifest, modern extensions increasingly use dynamic sizing or allow users to resize side panels. This makes responsive behavior essential for a polished user experience.

Let's build a practical example of a responsive popup that adapts its layout based on available space:

```javascript
// popup.js
class ResponsivePopupManager {
  constructor() {
    this.container = document.getElementById('popup-content');
    this.setupResizeObserver();
    this.initializeUI();
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.handleResize(entry);
      }
    });
    
    this.resizeObserver.observe(this.container);
  }

  handleResize(entry) {
    const { width, height } = entry.contentBoxSize[0];
    const breakpoint = 320;
    
    if (width < breakpoint) {
      this.container.classList.add('compact-mode');
      this.container.classList.remove('expanded-mode');
    } else {
      this.container.classList.add('expanded-mode');
      this.container.classList.remove('compact-mode');
    }
    
    // Adjust font sizes proportionally
    this.adjustFontSizes(width);
    
    // Show/hide elements based on height
    this.adjustVerticalLayout(height);
  }

  adjustFontSizes(width) {
    const baseSize = 14;
    const scaleFactor = Math.min(width / 400, 1.5);
    document.documentElement.style.setProperty(
      '--base-font-size', 
      `${baseSize * scaleFactor}px`
    );
  }

  adjustVerticalLayout(height) {
    const showFullContent = height > 400;
    const secondaryElements = document.querySelectorAll('.secondary-content');
    
    secondaryElements.forEach(el => {
      el.style.display = showFullContent ? 'block' : 'none';
    });
  }

  initializeUI() {
    // Initial layout setup
    const { width, height } = this.container.getBoundingClientRect();
    this.handleResize({
      contentBoxSize: [{
        inlineSize: width,
        blockSize: height
      }]
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ResponsivePopupManager();
});
```

This implementation demonstrates several key patterns for responsive popup development. The class-based approach keeps the code organized, while the resize handler responds to dimension changes in real-time.

---

## Building Responsive Side Panels

Chrome's side panel API allows extensions to provide persistent sidebars that users can resize. This creates a more complex responsive design challenge, as users can dynamically adjust the panel width while browsing. ResizeObserver excels in this scenario.

```javascript
// side-panel.js
class SidePanelResponsiveHandler {
  constructor() {
    this.panel = document.getElementById('side-panel');
    this.observer = null;
    this.throttleTimer = null;
    
    this.init();
  }

  init() {
    this.setupResizeObserver();
    this.applyInitialLayout();
  }

  setupResizeObserver() {
    this.observer = new ResizeObserver((entries) => {
      // Throttle to avoid excessive updates
      if (this.throttleTimer) return;
      
      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null;
        entries.forEach(entry => this.onResize(entry));
      }, 50);
    });

    this.observer.observe(this.panel);
  }

  onResize(entry) {
    const width = entry.contentBoxSize[0]?.inlineSize || 
                  entry.borderBoxSize[0]?.inlineSize;
    
    this.updateLayout(width);
    this.updateComponents(width);
    this.notifyContentScripts(width);
  }

  updateLayout(width) {
    const panel = this.panel;
    
    // Remove existing layout classes
    panel.classList.remove('narrow', 'medium', 'wide');
    
    // Apply new layout class
    if (width < 250) {
      panel.classList.add('narrow');
    } else if (width < 450) {
      panel.classList.add('medium');
    } else {
      panel.classList.add('wide');
    }
  }

  updateComponents(width) {
    // Example: Adjust grid columns based on panel width
    const grid = document.querySelector('.content-grid');
    if (grid) {
      const columns = width > 400 ? 3 : width > 280 ? 2 : 1;
      grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }

    // Example: Adjust image sizes
    const images = document.querySelectorAll('.responsive-image');
    images.forEach(img => {
      const maxWidth = width > 350 ? '100%' : width > 280 ? '80px' : '60px';
      img.style.maxWidth = maxWidth;
    });
  }

  notifyContentScripts(width) {
    // Communicate size changes to content scripts if needed
    chrome.runtime.sendMessage({
      type: 'PANEL_RESIZED',
      width: width,
      timestamp: Date.now()
    }).catch(() => {
      // Ignore errors if no listeners exist
    });
  }

  applyInitialLayout() {
    const rect = this.panel.getBoundingClientRect();
    this.updateLayout(rect.width);
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }
  }
}

// Clean up when panel closes
window.addEventListener('unload', () => {
  if (window.responsiveHandler) {
    window.responsiveHandler.disconnect();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.responsiveHandler = new SidePanelResponsiveHandler();
});
```

This implementation includes throttling to prevent excessive updates during rapid resizing, which is crucial for maintaining smooth performance in resource-constrained extension environments.

---

## Advanced Patterns: Multiple Observers and Coordinated Layouts

Complex extensions often need to coordinate multiple resize observers working together. For instance, you might need to observe both the outer container and inner components, ensuring they respond appropriately to each other while avoiding layout thrashing.

```javascript
// Advanced responsive coordinator
class CoordinatedLayoutManager {
  constructor() {
    this.observers = new Map();
    this.layoutState = {
      containerWidth: 0,
      containerHeight: 0,
      sidebarWidth: 0,
      mainContentHeight: 0
    };
    this.debounceTimer = null;
    
    this.initializeObservers();
  }

  initializeObservers() {
    // Main container observer
    this.createObserver('container', document.getElementById('main-container'), 
      (entry) => {
        this.layoutState.containerWidth = entry.contentBoxSize[0]?.inlineSize || 0;
        this.layoutState.containerHeight = entry.contentBoxSize[0]?.blockSize || 0;
        this.recalculateLayout();
      });

    // Sidebar observer
    this.createObserver('sidebar', document.getElementById('sidebar'), 
      (entry) => {
        this.layoutState.sidebarWidth = entry.contentBoxSize[0]?.inlineSize || 0;
        this.recalculateLayout();
      });

    // Main content observer
    this.createObserver('content', document.getElementById('main-content'), 
      (entry) => {
        this.layoutState.mainContentHeight = entry.contentBoxSize[0]?.blockSize || 0;
        this.adjustContentDisplay();
      });
  }

  createObserver(id, element, callback) {
    if (!element) return;
    
    const observer = new ResizeObserver((entries) => {
      // Debounce individual observer callbacks
      entries.forEach(entry => {
        callback(entry);
      });
    });
    
    observer.observe(element);
    this.observers.set(id, observer);
  }

  recalculateLayout() {
    // Debounce layout calculations
    if (this.debounceTimer) {
      cancelAnimationFrame(this.debounceTimer);
    }
    
    this.debounceTimer = requestAnimationFrame(() => {
      const { containerWidth, sidebarWidth } = this.layoutState;
      const availableWidth = containerWidth - sidebarWidth;
      
      // Calculate optimal component sizes
      const optimalSizes = this.calculateOptimalSizes(availableWidth);
      
      // Apply sizes to components
      this.applySizes(optimalSizes);
    });
  }

  calculateOptimalSizes(availableWidth) {
    const baseUnit = 8;
    const minComponentWidth = 120;
    const maxComponentWidth = 300;
    
    // Determine how many components can fit
    const componentCount = Math.max(
      1, 
      Math.floor(availableWidth / minComponentWidth)
    );
    
    const componentWidth = Math.min(
      availableWidth / componentCount,
      maxComponentWidth
    );
    
    return {
      componentWidth,
      padding: baseUnit * 2,
      gap: baseUnit
    };
  }

  applySizes(sizes) {
    document.documentElement.style.setProperty(
      '--component-width', 
      `${sizes.componentWidth}px`
    );
    document.documentElement.style.setProperty(
      '--content-padding', 
      `${sizes.padding}px`
    );
  }

  adjustContentDisplay() {
    const { mainContentHeight } = this.layoutState;
    const threshold = 300;
    
    // Adjust content density based on available height
    document.body.classList.toggle('high-density', mainContentHeight < threshold);
    document.body.classList.toggle('low-density', mainContentHeight > threshold * 2);
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    if (this.debounceTimer) {
      cancelAnimationFrame(this.debounceTimer);
    }
  }
}
```

This coordinated approach ensures that multiple components work together harmoniously, creating a cohesive responsive experience throughout your extension.

---

## Performance Considerations and Best Practices

While ResizeObserver is a powerful API, implementing it responsibly is crucial for maintaining extension performance. Here are essential best practices every extension developer should follow:

### Throttle and Debounce Appropriately

Resize events can fire extremely rapidly during window resizing or dragging operations. Always implement throttling or debouncing to prevent overwhelming your callback logic:

```javascript
const observer = new ResizeObserver((entries) => {
  let timeoutId;
  
  return () => {
    cancelAnimationFrame(timeoutId);
    timeoutId = requestAnimationFrame(() => {
      entries.forEach(entry => processResize(entry));
    });
  };
}());
```

### Clean Up Observers Properly

Failing to disconnect observers can cause memory leaks, especially in Single Page Application contexts or when users navigate between extension views:

```javascript
// Always clean up when appropriate
class ComponentManager {
  constructor() {
    this.observer = new ResizeObserver(this.handleResize.bind(this));
  }

  componentWillUnmount() {
    this.observer.disconnect();
  }
}
```

### Use CSS Logical Properties

For international extensions supporting right-to-left languages, use logical properties like `inlineSize` and `blockSize` instead of `width` and `height`:

```javascript
const width = entry.contentBoxSize[0].inlineSize;
const height = entry.contentBoxSize[0].blockSize;
```

### Avoid Layout Thrashing

When responding to resize events, avoid triggering additional layout calculations:

```javascript
// Bad: Causes layout thrashing
element.style.width = newWidth + 'px';
const height = element.offsetHeight; // Forces recalculation

// Good: Read then write
const styles = getComputedStyle(element);
const currentWidth = parseInt(styles.width);
element.style.width = newWidth + 'px';
```

---

## Testing Responsive Behavior

Testing responsive extensions requires simulating various container sizes. Chrome DevTools makes this straightforward:

1. Open your extension popup or side panel
2. Open DevTools for the extension view (right-click → Inspect)
3. Use the Elements panel to modify container dimensions
4. Observe how your ResizeObserver callbacks respond

For automated testing, you can programmatically trigger resize observations:

```javascript
async function testResizeBehavior() {
  const element = document.getElementById('test-container');
  
  // Simulate resize
  element.style.width = '200px';
  element.style.height = '300px';
  
  // Wait for observer callback
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify expected behavior
  const hasCompactClass = element.classList.contains('compact-mode');
  console.log('Compact mode activated:', hasCompactClass);
}
```

---

## Browser Support and Polyfills

ResizeObserver enjoys excellent browser support across modern browsers, including Chrome, Firefox, Safari, and Edge. For extensions targeting older browsers or ensuring maximum compatibility, polyfills are available:

```javascript
// Import polyfill for older browser support
import 'resize-observer-polyfill';

const observer = new ResizeObserver((entries) => {
  entries.forEach(entry => {
    // Handle resize
  });
});
```

However, for Chrome extensions targeting modern Chrome versions (Manifest V3), the native API works flawlessly without any polyfill requirements.

---

## Conclusion

ResizeObserver transforms how Chrome extension developers approach responsive design. By providing real-time dimension data for any element, it enables truly adaptive interfaces that respond intelligently to their container's constraints. Whether you're building dynamic popups, resizable side panels, or complex multi-component options pages, ResizeObserver gives you the tools to create polished, professional user experiences.

The key to success lies in implementing proper performance practices: throttling callbacks, cleaning up observers, and avoiding layout thrashing. When used correctly, ResizeObserver becomes an indispensable part of your extension development toolkit, enabling interfaces that feel natural and responsive regardless of how users interact with them.

Start implementing ResizeObserver in your extensions today, and discover how much more polished and professional your extension interfaces can become. Your users will appreciate the attention to detail that responsive, adaptive interfaces provide.
