---
layout: default
title: "Chrome Extension Accessibility Checker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-accessibility-checker/"
---
# Build an Accessibility Checker Extension

## What You'll Build {#what-youll-build}
- Scan any web page for common accessibility issues
- Check alt text on images
- Validate color contrast (WCAG AA/AAA)
- Analyze heading hierarchy
- Validate ARIA attributes
- Check form labels
- Test keyboard navigation
- Visualize focus order
- Detect landmark regions
- Generate accessibility reports with severity levels

## Manifest {#manifest}
- permissions: activeTab, scripting, storage
- host_permissions: <all_urls>
- content scripts for page scanning
- side_panel for results display

---

## Step 1: DOM Scanner {#step-1-dom-scanner}

Scan the page for accessibility issues:

```javascript
function scanPageForA11yIssues() {
  const issues = [];
  
  // Check images without alt text
  document.querySelectorAll('img').forEach((img, index) => {
    if (!img.alt && !img.getAttribute('role')) {
      issues.push({
        type: 'missing-alt',
        severity: 'error',
        element: img,
        message: 'Image missing alt attribute',
        selector: getSelector(img)
      });
    }
  });
  
  // Check empty links
  document.querySelectorAll('a').forEach(link => {
    if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
      issues.push({
        type: 'empty-link',
        severity: 'warning',
        element: link,
        message: 'Link has no accessible name',
        selector: getSelector(link)
      });
    }
  });
  
  // Check headings order
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(h => {
    const level = parseInt(h.tagName[1]);
    if (level > lastLevel + 1) {
      issues.push({
        type: 'heading-skip',
        severity: 'warning',
        element: h,
        message: `Heading level skipped: h${lastLevel} to h${level}`,
        selector: getSelector(h)
      });
    }
    lastLevel = level;
  });
  
  return issues;
}

function getSelector(el) {
  if (el.id) return `#${el.id}`;
  let selector = el.tagName.toLowerCase();
  if (el.className) selector += `.${el.className.split(' ')[0]}`;
  return selector;
}
```

---

## Step 2: Color Contrast Calculator {#step-2-color-contrast-calculator}

Validate WCAG color contrast ratios:

```javascript
function calculateContrastRatio(fgColor, bgColor) {
  const getLuminance = (rgb) => {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const fg = getLuminance(parseRgb(fgColor));
  const bg = getLuminance(parseRgb(bgColor));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(color) {
  const match = color.match(/\d+/g);
  return match ? match.map(Number) : [0, 0, 0];
}

function checkWcagCompliance(ratio) {
  return {
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5
  };
}

// Check text elements
document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li').forEach(el => {
  const style = window.getComputedStyle(el);
  const ratio = calculateContrastRatio(style.color, style.backgroundColor);
  if (ratio < 4.5) {
    issues.push({
      type: 'low-contrast',
      severity: ratio < 3 ? 'error' : 'warning',
      element: el,
      message: `Low contrast: ${ratio.toFixed(2)}:1 (need 4.5:1)`,
      selector: getSelector(el)
    });
  }
});
```

---

## Step 3: Issue Highlighter Overlay {#step-3-issue-highlighter-overlay}

Visual overlay to highlight issues on page:

```javascript
function createHighlightOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'a11y-highlighter-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999998;';
  document.body.appendChild(overlay);
  
  return overlay;
}

function highlightIssues(issues) {
  const overlay = document.getElementById('a11y-highlighter-overlay') || createHighlightOverlay();
  overlay.innerHTML = '';
  
  const severityStyles = {
    error: 'border: 3px solid #ff0000; background: rgba(255,0,0,0.1);',
    warning: 'border: 3px solid #ffaa00; background: rgba(255,170,0,0.1);',
    info: 'border: 3px solid #00aaff; background: rgba(0,170,255,0.1);'
  };
  
  issues.forEach(issue => {
    if (!issue.element) return;
    const rect = issue.element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: absolute;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      ${severityStyles[issue.severity]}
      pointer-events: none;
    `;
    overlay.appendChild(highlight);
  });
}
```

---

## Step 4: Report Generator {#step-4-report-generator}

Create detailed accessibility report:

```javascript
function generateReport(issues) {
  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    summary: {
      total: issues.length,
      error: issues.filter(i => i.severity === 'error').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length
    },
    issues: issues.map(i => ({
      type: i.type,
      severity: i.severity,
      message: i.message,
      selector: i.selector
    })),
    recommendations: generateRecommendations(issues)
  };
  
  return report;
}

function generateRecommendations(issues) {
  const recs = [];
  if (issues.some(i => i.type === 'missing-alt')) {
    recs.push('Add descriptive alt text to all images');
  }
  if (issues.some(i => i.type === 'low-contrast')) {
    recs.push('Increase color contrast to meet WCAG AA (4.5:1)');
  }
  if (issues.some(i => i.type === 'heading-skip')) {
    recs.push('Ensure heading levels increment by one');
  }
  if (issues.some(i => i.type === 'empty-link')) {
    recs.push('Add aria-label or text content to links');
  }
  return recs;
}

// Display in side panel
function displayReport(report) {
  const container = document.getElementById('a11y-report');
  container.innerHTML = `
    <h2>Accessibility Report</h2>
    <div class="summary">
      <span class="error">${report.summary.error} Errors</span>
      <span class="warning">${report.summary.warning} Warnings</span>
      <span class="info">${report.summary.info} Info</span>
    </div>
    <ul class="issues">
      ${report.issues.map(i => `
        <li class="${i.severity}">
          <strong>${i.severity.toUpperCase()}</strong>: ${i.message}
          <code>${i.selector}</code>
        </li>
      `).join('')}
    </ul>
  `;
}
```

---

## Testing {#testing}

```javascript
// Run accessibility check
document.getElementById('run-scan').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const issues = [
        ...scanPageForA11yIssues(),
        ...checkContrastIssues()
      ];
      return issues;
    }
  }, (results) => {
    const issues = results[0].result;
    highlightIssues(issues);
    const report = generateReport(issues);
    chrome.runtime.sendMessage({ action: 'display-report', report });
  });
});
```

---

## Cross-References {#cross-references}
- [guides/accessibility.md](../guides/accessibility.md)
- [guides/extension-a11y-testing.md](../guides/extension-a11y-testing.md)
- [patterns/dom-observer-patterns.md](../patterns/dom-observer-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
---

## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.