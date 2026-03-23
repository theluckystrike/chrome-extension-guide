---
layout: post
title: "Build an Accessibility Overlay Chrome Extension: Complete 2025 Tutorial"
description: "Learn how to build a powerful accessibility overlay Chrome extension from scratch. This comprehensive guide covers WCAG compliance, a11y checker tools, and creating an accessibility overlay extension that helps users identify and fix accessibility issues on any website."
date: 2025-01-26
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "accessibility overlay extension, a11y checker chrome, wcag overlay extension, chrome accessibility tool, web accessibility checker"
canonical_url: "https://bestchromeextensions.com/2025/01/26/build-accessibility-overlay-chrome-extension/"
---

# Build an Accessibility Overlay Chrome Extension: Complete 2025 Tutorial

Web accessibility is no longer optional—it is a legal requirement, a moral imperative, and a business necessity. With over one billion people worldwide living with some form of disability, ensuring your website is accessible is essential. This comprehensive guide teaches you how to build an accessibility overlay Chrome extension that helps users identify and fix accessibility issues in real-time.

Whether you are a developer looking to create tools for accessibility testing or want to build a product that helps others make their websites compliant, this tutorial covers everything from project setup to advanced WCAG compliance checking features.

---

## What is an Accessibility Overlay Extension? {#what-is-accessibility-overlay}

An accessibility overlay extension is a Chrome extension that overlays visual indicators on web pages to highlight accessibility issues. These tools can scan websites for WCAG (Web Content Accessibility Guidelines) violations, provide real-time feedback, and offer suggestions for fixing problems.

The best accessibility overlay extensions serve multiple purposes. They act as an **a11y checker chrome** tool, helping developers identify issues during development. They also serve end users who may need visual aids, high contrast modes, or text-to-speech functionality. Some popular accessibility overlay extensions include screen readers, contrast checkers, focus indicators, and keyboard navigation helpers.

Building your own accessibility overlay extension gives you complete control over the features and functionality. You can customize it for specific use cases, integrate with your existing development workflow, or create a product for the accessibility-conscious market.

### Why Build an Accessibility Overlay Extension in 2025

The demand for accessibility tools has never been higher. Several factors drive this growth:

1. **Legal Requirements**: The Americans with Disabilities Act (ADA), European Accessibility Act, and similar laws worldwide require websites to be accessible. Companies face lawsuits and fines when they fail to comply.

2. **SEO Benefits**: Accessible websites often rank higher in search results. Google rewards sites that provide good user experiences, including accessibility features.

3. **Market Size**: The global accessibility market is projected to reach $25 billion by 2025, creating significant opportunities for developers and entrepreneurs.

4. **Developer Need**: Developers increasingly need quick ways to check accessibility during development, making **wcag overlay extension** tools valuable in their workflow.

---

## Project Setup and Extension Structure {#project-setup}

Let's start building our accessibility overlay Chrome extension. We'll use Manifest V3, the latest Chrome extension platform.

### Creating the Project Directory

First, create a new directory for your project:

```bash
mkdir accessibility-overlay-extension
cd accessibility-overlay-extension
```

### Manifest File (manifest.json)

Create the manifest.json file with the necessary permissions:

```json
{
  "manifest_version": 3,
  "name": "Accessibility Overlay Tool",
  "version": "1.0",
  "description": "A powerful accessibility overlay extension for WCAG compliance checking",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ]
}
```

The manifest declares permissions for accessing the active tab, injecting scripts, and storing user preferences. The content scripts will run on all websites to analyze and overlay accessibility information.

### Popup Interface (popup.html)

Create a user-friendly popup interface:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 320px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    h2 {
      margin: 0 0 12px 0;
      font-size: 18px;
      color: #333;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 10px;
      margin: 8px 0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-primary {
      background: #4F46E5;
      color: white;
    }
    .btn-primary:hover {
      background: #4338CA;
    }
    .btn-secondary {
      background: #E5E7EB;
      color: #374151;
    }
    .btn-secondary:hover {
      background: #D1D5DB;
    }
    .results {
      margin-top: 16px;
      padding: 12px;
      background: #F3F4F6;
      border-radius: 6px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <h2>Accessibility Overlay</h2>
  <button id="scanBtn" class="btn btn-primary">Scan Page for Issues</button>
  <button id="toggleOverlay" class="btn btn-secondary">Toggle Overlay</button>
  <button id="highContrast" class="btn btn-secondary">High Contrast Mode</button>
  <button id="focusIndicator" class="btn btn-secondary">Enhanced Focus Indicators</button>
  
  <div id="results" class="results" style="display: none;">
    <strong>Scan Results:</strong>
    <div id="issueCount"></div>
    <ul id="issueList"></ul>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Popup Logic (popup.js)

Handle user interactions and communicate with the content script:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scanBtn');
  const toggleOverlay = document.getElementById('toggleOverlay');
  const highContrast = document.getElementById('highContrast');
  const focusIndicator = document.getElementById('focusIndicator');
  
  scanBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'scan' }, (response) => {
      if (response && response.issues) {
        displayResults(response.issues);
      }
    });
  });
  
  toggleOverlay.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
  });
  
  highContrast.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'highContrast' });
  });
  
  focusIndicator.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'focusIndicator' });
  });
  
  function displayResults(issues) {
    const resultsDiv = document.getElementById('results');
    const issueCount = document.getElementById('issueCount');
    const issueList = document.getElementById('issueList');
    
    resultsDiv.style.display = 'block';
    issueCount.textContent = `Found ${issues.length} accessibility issues`;
    
    issueList.innerHTML = '';
    issues.forEach(issue => {
      const li = document.createElement('li');
      li.textContent = `${issue.type}: ${issue.element} - ${issue.message}`;
      issueList.appendChild(li);
    });
  }
});
```

---

## Core Accessibility Checking Logic {#accessibility-checking}

Now let's build the core functionality that makes this a true **a11y checker chrome** tool. Create the content script that analyzes pages for accessibility issues.

### Content Script (content.js)

This script runs on every page and performs comprehensive accessibility analysis:

```javascript
// Accessibility rules based on WCAG 2.1 guidelines
const accessibilityRules = [
  {
    id: 'img-alt',
    name: 'Image Alt Text',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'IMG') {
        return !!element.alt || element.getAttribute('role') === 'presentation';
      }
      return null;
    },
    message: 'Images must have alt text or be marked as presentation'
  },
  {
    id: 'heading-order',
    name: 'Heading Order',
    level: 'A',
    check: (element) => {
      if (/^H[1-6]$/.test(element.tagName)) {
        const previousHeading = findPreviousHeading(element);
        if (previousHeading) {
          const currentLevel = parseInt(element.tagName[1]);
          const previousLevel = parseInt(previousHeading.tagName[1]);
          if (currentLevel > previousLevel + 1) {
            return `Heading level should not skip from H${previousLevel} to H${currentLevel}`;
          }
        }
      }
      return null;
    }
  },
  {
    id: 'link-name',
    name: 'Link Name',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'A') {
        const hasText = element.textContent.trim().length > 0;
        const hasAriaLabel = element.getAttribute('aria-label') || 
                            element.getAttribute('aria-labelledby');
        return hasText || hasAriaLabel || 'Links must have accessible names';
      }
      return null;
    }
  },
  {
    id: 'button-name',
    name: 'Button Name',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'BUTTON') {
        const hasText = element.textContent.trim().length > 0;
        const hasAriaLabel = element.getAttribute('aria-label');
        return hasText || hasAriaLabel || 'Buttons must have accessible names';
      }
      return null;
    }
  },
  {
    id: 'form-label',
    name: 'Form Label',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'INPUT') {
        const type = element.getAttribute('type');
        if (type === 'hidden' || type === 'submit' || type === 'button') {
          return null;
        }
        const hasLabel = element.getAttribute('aria-label') ||
                        element.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${element.id}"]`);
        return hasLabel || 'Form inputs must have associated labels';
      }
      return null;
    }
  },
  {
    id: 'color-contrast',
    name: 'Color Contrast',
    level: 'AA',
    check: (element) => {
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor;
      const color = style.color;
      
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        return null;
      }
      
      const contrast = calculateContrast(color, bgColor);
      if (contrast < 4.5 && element.tagName !== 'BODY') {
        return `Color contrast ratio is ${contrast.toFixed(2)}, should be at least 4.5:1`;
      }
      return null;
    }
  },
  {
    id: 'focus-visible',
    name: 'Focus Visible',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'BODY') {
        return null;
      }
      const style = window.getComputedStyle(element);
      const outlineStyle = style.outlineStyle;
      const outlineWidth = style.outlineWidth;
      
      if (outlineStyle === 'none' || outlineWidth === '0px') {
        if (element.tabIndex >= 0 && element.tagName !== 'DIV' && element.tagName !== 'SPAN') {
          return 'Interactive elements must have visible focus indicators';
        }
      }
      return null;
    }
  },
  {
    id: 'html-lang',
    name: 'Language Attribute',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'HTML') {
        return element.getAttribute('lang') || 'HTML element must have a lang attribute';
      }
      return null;
    }
  },
  {
    id: 'meta-viewport',
    name: 'Viewport Zoom',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'META') {
        const name = element.getAttribute('name');
        const content = element.getAttribute('content');
        if (name === 'viewport' && content.includes('user-scalable=no')) {
          return 'Do not disable user zooming in viewport meta tag';
        }
      }
      return null;
    }
  }
];

// Helper functions
function findPreviousHeading(element) {
  const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const currentIndex = allHeadings.indexOf(element);
  if (currentIndex > 0) {
    return allHeadings[currentIndex - 1];
  }
  return null;
}

function calculateContrast(color1, color2) {
  const getLuminance = (rgb) => {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const parseColor = (color) => {
    const match = color.match(/\d+/g);
    return match ? match.slice(0, 3).map(Number) : [0, 0, 0];
  };
  
  const l1 = getLuminance(parseColor(color1));
  const l2 = getLuminance(parseColor(color2));
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Main scanning function
function scanPage() {
  const issues = [];
  const elements = document.querySelectorAll('*');
  
  elements.forEach(element => {
    accessibilityRules.forEach(rule => {
      const result = rule.check(element);
      if (result) {
        issues.push({
          type: rule.name,
          level: rule.level,
          element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : ''),
          message: typeof result === 'string' ? result : rule.message
        });
      }
    });
  });
  
  return issues;
}

// Create visual overlay
function createOverlay() {
  removeOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'a11y-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
  `;
  
  const elements = document.querySelectorAll('img:not([alt]), img[alt=""], input:not([aria-label]), button:not([aria-label]), a:not([aria-label])');
  
  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: absolute;
      border: 2px solid #FF0000;
      background: rgba(255, 0, 0, 0.1);
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
    `;
    overlay.appendChild(highlight);
  });
  
  document.body.appendChild(overlay);
}

function removeOverlay() {
  const existing = document.getElementById('a11y-overlay');
  if (existing) {
    existing.remove();
  }
}

// High contrast mode
function toggleHighContrast() {
  document.body.classList.toggle('a11y-high-contrast');
  
  if (!document.getElementById('a11y-styles')) {
    const style = document.createElement('style');
    style.id = 'a11y-styles';
    style.textContent = `
      .a11y-high-contrast {
        filter: contrast(150%) brightness(110%) !important;
      }
      .a11y-high-contrast * {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        border-color: #000000 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Enhanced focus indicators
function toggleFocusIndicators() {
  document.body.classList.toggle('a11y-focus-mode');
  
  if (!document.getElementById('a11y-focus-styles')) {
    const style = document.createElement('style');
    style.id = 'a11y-focus-styles';
    style.textContent = `
      .a11y-focus-mode *:focus {
        outline: 3px solid #0066CC !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'scan':
      const issues = scanPage();
      sendResponse({ issues });
      break;
    case 'toggleOverlay':
      const overlay = document.getElementById('a11y-overlay');
      if (overlay) {
        removeOverlay();
      } else {
        createOverlay();
      }
      break;
    case 'highContrast':
      toggleHighContrast();
      break;
    case 'focusIndicator':
      toggleFocusIndicators();
      break;
  }
});
```

This content script implements comprehensive **wcag overlay extension** functionality, scanning for multiple accessibility issues and providing visual overlays.

### Overlay Styles (styles.css)

Create styles for the accessibility highlights:

```css
/* Accessibility overlay indicator styles */
#a11y-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999999;
}

#a11y-issue-marker {
  position: absolute;
  border: 2px solid #E53E3E;
  background-color: rgba(229, 62, 62, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}

#a11y-issue-marker:hover {
  background-color: rgba(229, 62, 62, 0.3);
}

#a11y-issue-marker::after {
  content: attr(data-issue);
  position: absolute;
  top: -24px;
  left: 0;
  background: #E53E3E;
  color: white;
  padding: 2px 6px;
  font-size: 11px;
  white-space: nowrap;
  border-radius: 3px;
  font-family: sans-serif;
}

/* High contrast mode styles */
.high-contrast-mode {
  filter: contrast(150%) !important;
}

.high-contrast-mode img {
  filter: contrast(200%) !important;
}

/* Focus indicator styles */
.enhanced-focus *:focus {
  outline: 3px solid #0066CC !important;
  outline-offset: 2px !important;
}

.enhanced-focus *:focus:not(:focus-visible) {
  outline: none !important;
}
```

---

## Advanced WCAG Compliance Features {#advanced-wcag}

To make your **accessibility overlay extension** truly comprehensive, add support for more advanced WCAG guidelines.

### ARIA Validation

Implement proper ARIA attribute validation:

```javascript
const ariaRules = {
  'role': {
    valid: ['alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'],
    check: (element) => {
      const role = element.getAttribute('role');
      if (role && !ariaRules.role.valid.includes(role.split(' ')[0])) {
        return `Invalid ARIA role: ${role}`;
      }
      return null;
    }
  },
  'aria-hidden': {
    check: (element) => {
      if (element.getAttribute('aria-hidden') === 'true' && element.tabIndex === 0) {
        return 'Elements with aria-hidden="true" should not be focusable';
      }
      return null;
    }
  },
  'aria-required': {
    check: (element) => {
      if (element.getAttribute('aria-required') === 'true' && !element.getAttribute('aria-invalid')) {
        return 'Required fields should indicate invalid state with aria-invalid';
      }
      return null;
    }
  }
};
```

### Keyboard Navigation Testing

Add keyboard navigation testing capabilities:

```javascript
function testKeyboardNavigation() {
  const issues = [];
  const focusableSelectors = [
    'a[href]', 'button', 'input', 'select', 'textarea',
    '[tabindex]:not([tabindex="-1"])'
  ];
  
  const focusableElements = document.querySelectorAll(focusableSelectors.join(', '));
  const focusOrder = Array.from(focusableElements)
    .filter(el => el.tabIndex >= 0)
    .sort((a, b) => a.tabIndex - b.tabIndex);
  
  // Check for tabindex > 0 (should be avoided)
  focusOrder.forEach((element, index) => {
    if (element.tabIndex > 0) {
      issues.push({
        type: 'Keyboard Navigation',
        element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : ''),
        message: `Avoid tabindex > 0; found tabindex="${element.tabIndex}"`
      });
    }
  });
  
  // Check focus order is logical
  let lastTabIndex = 0;
  focusOrder.forEach(element => {
    if (element.tabIndex > 0 && element.tabIndex < lastTabIndex) {
      issues.push({
        type: 'Keyboard Navigation',
        element: element.tagName.toLowerCase(),
        message: 'Focus order is not logical'
      });
    }
    lastTabIndex = element.tabIndex;
  });
  
  return issues;
}
```

---

## Testing and Deployment {#testing-deployment}

### Local Testing

To test your extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. Visit any website and test the accessibility scanning features

### Building for Distribution

Create a production build:

```bash
# Create distribution directory
mkdir dist

# Copy necessary files
cp -r manifest.json popup.html popup.js popup.css content.js styles.css dist/

# Create icons directory if needed
mkdir -p dist/icons
```

### Best Practices for Accessibility Extensions

Follow these best practices when building your **a11y checker chrome** tool:

1. **Respect User Privacy**: Only access necessary data and be transparent about what your extension does.

2. **Performance Matters**: Run accessibility checks efficiently without blocking the main thread.

3. **Provide Clear Feedback**: Users should understand what issues were found and how to fix them.

4. **Support Multiple Languages**: Consider adding i18n support for international users.

5. **Keep Updated**: WCAG guidelines evolve; keep your extension updated with the latest requirements.

---

## Conclusion {#conclusion}

Building an accessibility overlay Chrome extension is a rewarding project that helps make the web more inclusive. This tutorial covered the essential components: manifest configuration, popup interface, content scripts for page analysis, and visual overlay rendering.

Your **wcag overlay extension** can now scan for common accessibility issues including missing alt text, improper heading hierarchy, missing form labels, color contrast problems, and missing focus indicators. The extension provides practical tools like high contrast mode and enhanced focus indicators to help users with disabilities navigate the web more easily.

The accessibility market continues to grow, and there is significant demand for tools that help developers and website owners create more accessible experiences. By following this guide and expanding on these concepts, you can build a valuable tool that makes a real difference in people's lives.

Remember that accessibility is not a one-time fix but an ongoing commitment. Encourage users of your extension to continuously test and improve their websites. With the foundation built in this tutorial, you have the starting point for creating a powerful accessibility tool that serves both developers and end users.

Start building today, and contribute to making the web accessible for everyone.
