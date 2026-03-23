---
layout: post
title: "Build a Lighthouse Runner Chrome Extension: Complete 2025 Tutorial"
description: "Learn how to build a Lighthouse Runner Chrome Extension from scratch. This comprehensive tutorial covers performance audit chrome tools, integrating Lighthouse API, creating user-friendly interfaces, and deploying your extension to the Chrome Web Store."
date: 2025-01-23
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "lighthouse extension, performance audit chrome, web performance extension, lighthouse chrome extension, build chrome extension lighthouse, lighthouse runner extension"
canonical_url: "https://bestchromeextensions.com/2025/01/23/build-lighthouse-runner-chrome-extension/"
---

Build a Lighthouse Runner Chrome Extension: Complete 2025 Tutorial

Web performance has become a critical factor in user experience, search engine rankings, and conversion rates. As developers and site owners strive to deliver lightning-fast experiences, having the right tools at your fingertips is essential. Google's Lighthouse has emerged as the gold standard for performance auditing, but running audits typically requires opening DevTools or using command-line tools. What if you could bring powerful performance auditing directly into your browser workflow?

In this comprehensive tutorial, you'll learn how to build a Lighthouse Runner Chrome Extension that allows you to run performance audits with a single click, view results in a beautiful popup interface, and integrate smoothly with your development workflow. By the end of this guide, you'll have a fully functional extension that brings the power of Lighthouse to your browser toolbar.

---

Understanding Lighthouse and Chrome Extension Architecture {#understanding-lighthouse}

Before diving into the code, it's essential to understand the foundational technologies you'll be working with and how they integrate together to create a powerful performance auditing tool.

What is Google Lighthouse?

Google Lighthouse is an open-source, automated tool for improving the quality of web pages. It provides audits for performance, accessibility, progressive web apps, SEO, and more. Lighthouse can be run from Chrome DevTools, from the command line, or as a Node module. The tool generates a detailed report with scores and actionable recommendations for improvement.

The Lighthouse engine works by navigating to a URL, running a series of audits against the page, and generating a comprehensive report. Each audit evaluates a specific aspect of the page, such as first contentful paint, time to interactive, cumulative layout shift, and first input delay. These metrics collectively determine the overall performance score.

For developers, having quick access to Lighthouse is crucial for iterative development. The ability to run performance audits directly from the browser, without switching contexts or opening additional tools, can significantly streamline the development workflow. This is exactly what we'll build in this tutorial.

Chrome Extension Architecture Overview

Chrome extensions are web applications that extend the functionality of the Chrome browser. They consist of several components that work together to deliver a smooth user experience. Understanding these components is crucial for building a well-structured extension.

The manifest file (manifest.json) serves as the blueprint of your extension. It defines the extension's name, version, permissions, and the various components it includes. In Manifest V3, the current standard, you'll specify background scripts, content scripts, popup pages, and any additional resources.

Background scripts run in the background and handle events, manage state, and coordinate between different parts of the extension. They have access to Chrome APIs that aren't available to regular web pages.

Popup pages are the small interfaces that appear when you click the extension icon in the toolbar. These are perfect for quick actions and displaying results in a compact format.

Content scripts are JavaScript files that run in the context of web pages. They can modify page content, inject styles, and communicate with background scripts.

For our Lighthouse Runner extension, we'll use the popup interface for user interaction and results display, while using background scripts to handle the heavy lifting of running Lighthouse audits.

---

Setting Up Your Development Environment {#development-environment}

Every great project starts with proper setup. Let's configure our development environment and create the foundation for our Lighthouse Runner extension.

Prerequisites

Before you begin, ensure you have the following installed on your system:

- A modern code editor (VS Code is recommended)
- Node.js (version 18 or higher)
- Chrome browser (for testing your extension)
- Basic familiarity with JavaScript and HTML/CSS

You'll also need to understand how to load unpacked extensions in Chrome. Navigate to chrome://extensions, enable "Developer mode" in the top right corner, and use the "Load unpacked" button to test your extension during development.

Creating the Project Structure

Create a new directory for your extension project and set up the following file structure:

```
lighthouse-runner/
 manifest.json
 popup/
    popup.html
    popup.css
    popup.js
 background/
    background.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 utils/
     lighthouse-helper.js
```

This structure separates concerns logically, making your code maintainable and easy to extend. The popup directory contains everything needed for the user interface, while the background directory holds scripts that run independently of any particular webpage.

Configuring the Manifest File

The manifest.json file is the heart of your Chrome extension. Here's the configuration for our Lighthouse Runner:

```json
{
  "manifest_version": 3,
  "name": "Lighthouse Runner",
  "version": "1.0.0",
  "description": "Run performance audits directly from your browser with Google Lighthouse",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares the necessary permissions for our extension. The "activeTab" permission allows us to access the currently active tab for auditing, "scripting" enables us to execute code in the context of web pages, and "storage" lets us save user preferences and audit history.

---

Building the Popup Interface {#popup-interface}

The popup is what users see when they click your extension icon. It needs to be intuitive, informative, and fast. Let's build a polished interface that makes running audits and viewing results a breeze.

HTML Structure

Create the popup.html file with a clean, modern layout:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse Runner</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Lighthouse Runner</h1>
      <p class="subtitle">Performance Audit Tool</p>
    </header>

    <main>
      <div class="url-section">
        <label for="url-input">Target URL</label>
        <input type="text" id="url-input" placeholder="Enter URL or use current tab">
      </div>

      <div class="audit-options">
        <h3>Audit Categories</h3>
        <div class="checkbox-group">
          <label><input type="checkbox" id="perf-audit" checked> Performance</label>
          <label><input type="checkbox" id="access-audit" checked> Accessibility</label>
          <label><input type="checkbox" id="best-practices-audit" checked> Best Practices</label>
          <label><input type="checkbox" id="seo-audit" checked> SEO</label>
          <label><input type="checkbox" id="pwa-audit"> PWA</label>
        </div>
      </div>

      <button id="run-audit" class="primary-button">
        <span class="button-text">Run Audit</span>
        <div class="spinner hidden"></div>
      </button>

      <div id="results-section" class="hidden">
        <h2>Audit Results</h2>
        <div class="score-overview">
          <div class="score-circle" id="overall-score">
            <span class="score-value">--</span>
          </div>
          <div class="score-details">
            <div class="metric">
              <span class="metric-label">Performance</span>
              <span class="metric-value" id="perf-score">--</span>
            </div>
            <div class="metric">
              <span class="metric-label">Accessibility</span>
              <span class="metric-value" id="access-score">--</span>
            </div>
            <div class="metric">
              <span class="metric-label">Best Practices</span>
              <span class="metric-value" id="bp-score">--</span>
            </div>
            <div class="metric">
              <span class="metric-label">SEO</span>
              <span class="metric-value" id="seo-score">--</span>
            </div>
          </div>
        </div>
        <button id="view-full-report" class="secondary-button">View Full Report</button>
      </div>
    </main>

    <footer>
      <p>Powered by Google Lighthouse</p>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a clear hierarchy: header with branding, main content area with controls and results, and a footer. The results section is hidden by default and revealed only after an audit completes.

Styling the Popup

Create popup.css to give your extension a professional, polished look:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 360px;
  min-height: 400px;
  background: #ffffff;
  color: #333;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 15px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a73e8;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.url-section {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  margin-bottom: 6px;
}

input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input[type="text"]:focus {
  outline: none;
  border-color: #1a73e8;
}

.audit-options {
  margin-bottom: 20px;
}

.audit-options h3 {
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 8px;
}

.checkbox-group input[type="checkbox"] {
  accent-color: #1a73e8;
}

.primary-button {
  width: 100%;
  padding: 12px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.primary-button:hover {
  background: #1557b0;
}

.primary-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.hidden {
  display: none !important;
}

#results-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

#results-section h2 {
  font-size: 16px;
  margin-bottom: 15px;
}

.score-overview {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
}

.score-details {
  flex: 1;
}

.metric {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: 600;
}

.secondary-button {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-button:hover {
  background: #e8e8e8;
}

footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

footer p {
  font-size: 11px;
  color: #999;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

This CSS provides a clean, modern interface following Google's design language. The color scheme uses Google's blue (#1a73e8) as the primary color, with subtle grays for text and backgrounds.

---

Implementing the Core Functionality {#core-functionality}

Now comes the heart of our extension, connecting the popup interface to Lighthouse's powerful auditing engine. We'll create the JavaScript files that make everything work together.

The Popup Script

The popup script handles user interactions and communicates with the background script:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('url-input');
  const runAuditBtn = document.getElementById('run-audit');
  const resultsSection = document.getElementById('results-section');
  const viewReportBtn = document.getElementById('view-full-report');
  
  // Check if we're on a tab and get its URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      urlInput.value = tabs[0].url;
    }
  });

  runAuditBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    // Get selected audit categories
    const categories = [];
    if (document.getElementById('perf-audit').checked) categories.push('performance');
    if (document.getElementById('access-audit').checked) categories.push('accessibility');
    if (document.getElementById('best-practices-audit').checked) categories.push('best-practices');
    if (document.getElementById('seo-audit').checked) categories.push('seo');
    if (document.getElementById('pwa-audit').checked) categories.push('pwa');

    if (categories.length === 0) {
      alert('Please select at least one audit category');
      return;
    }

    // Show loading state
    runAuditBtn.disabled = true;
    runAuditBtn.querySelector('.button-text').textContent = 'Running Audit...';
    runAuditBtn.querySelector('.spinner').classList.remove('hidden');
    resultsSection.classList.add('hidden');

    try {
      // Send message to background script to run Lighthouse
      const response = await chrome.runtime.sendMessage({
        action: 'runLighthouse',
        url: url,
        categories: categories
      });

      if (response.error) {
        throw new Error(response.error);
      }

      displayResults(response.results);
    } catch (error) {
      alert('Error running audit: ' + error.message);
    } finally {
      runAuditBtn.disabled = false;
      runAuditBtn.querySelector('.button-text').textContent = 'Run Audit';
      runAuditBtn.querySelector('.spinner').classList.add('hidden');
    }
  });

  viewReportBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://developers.google.com/web/tools/lighthouse' });
  });

  function displayResults(results) {
    const overallScore = Math.round(results.categories.performance?.score * 100) || 0;
    document.querySelector('#overall-score .score-value').textContent = overallScore;
    
    // Update score colors based on value
    updateScoreColor('#overall-score', overallScore);

    const categoryScores = {
      'perf-score': results.categories.performance?.score,
      'access-score': results.categories.accessibility?.score,
      'bp-score': results.categories['best-practices']?.score,
      'seo-score': results.categories.seo?.score
    };

    for (const [elementId, score] of Object.entries(categoryScores)) {
      const scoreValue = score ? Math.round(score * 100) : '--';
      document.getElementById(elementId).textContent = scoreValue;
      if (score) {
        updateScoreColor('#' + elementId, scoreValue);
      }
    }

    resultsSection.classList.remove('hidden');
  }

  function updateScoreColor(selector, score) {
    const element = document.querySelector(selector);
    if (score >= 90) {
      element.style.background = '#0cce6b';
      element.style.color = 'white';
    } else if (score >= 50) {
      element.style.background = '#ffa400';
      element.style.color = 'white';
    } else {
      element.style.background = '#ff4e42';
      element.style.color = 'white';
    }
  }
});
```

This script manages the popup's interactivity: capturing user input, sending messages to the background script, handling the loading state, and displaying results. It also implements color coding for scores, green for good (90+), orange for needs improvement (50-89), and red for poor (below 50).

The Background Script

The background script serves as the bridge between the popup and Lighthouse. It handles the actual Lighthouse execution:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'runLighthouse') {
    runLighthouseAudit(message.url, message.categories)
      .then(results => sendResponse({ results }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function runLighthouseAudit(url, categories) {
  // Lighthouse expects category names in a specific format
  const categoryMap = {
    'performance': 'performance',
    'accessibility': 'accessibility',
    'best-practices': 'best-practices',
    'seo': 'seo',
    'pwa': 'pwa'
  };

  const enabledCategories = {};
  categories.forEach(cat => {
    if (categoryMap[cat]) {
      enabledCategories[cat] = true;
    }
  });

  // Use the Lighthouse bundler from CDN
  const lighthouse = await loadLighthouse();
  
  const results = await lighthouse(url, {
    onlyCategories: categories,
    port: undefined,
    output: 'json',
    logLevel: 'silent',
    chromeFlags: ['--headless']
  });

  return results.lhr;
}

async function loadLighthouse() {
  // For a production extension, you'd bundle Lighthouse with webpack
  // or use a different approach. This is a simplified example.
  return window.lighthouse;
}
```

---

Testing and Refining Your Extension {#testing}

With the core functionality implemented, it's time to test your extension and refine it based on real-world usage.

Loading Your Extension in Chrome

1. Open Chrome and navigate to chrome://extensions
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension's directory
4. Pin your extension to the toolbar for easy access

Testing the Audit Functionality

Click your extension icon, and you should see the popup interface. Try running an audit on a known website. Watch for:

- Proper loading states while the audit runs
- Accurate score display after completion
- Correct error handling for invalid URLs or failed audits
- Responsive layout across different screen sizes

Optimization Tips

As you test, consider these improvements:

Performance: Lighthouse audits can take 30-60 seconds. Add progress indicators to keep users informed. Consider caching recent results to avoid re-running audits for the same URL.

Error Handling: Network issues, timeouts, and blocked resources can cause audits to fail. Implement solid error messages that guide users toward solutions.

User Experience: Add keyboard shortcuts for power users. Consider adding history functionality to track audit results over time.

---

Advanced Features and Extensions {#advanced-features}

Once you have the basic Lighthouse Runner working, consider adding these advanced features to make your extension truly standout.

Export and Share Results

Add functionality to export audit results in various formats, JSON for developers, PDF reports for stakeholders, or shareable links.

Automated Scheduled Audits

Use Chrome's alarm API to run periodic audits on specified URLs. This is valuable for monitoring the performance of web applications over time.

Comparison Tools

Implement a feature that compares current audit results with previous runs, highlighting improvements or regressions in key metrics.

Integration with CI/CD

Create a build script that exports Lighthouse results in formats compatible with popular CI/CD platforms, enabling automated performance regression testing.

---

Deployment and Distribution {#deployment}

When your extension is ready for the world, you'll want to publish it to the Chrome Web Store.

Preparing for Release

Before publishing, ensure your extension meets Chrome's policies:

- Complete all required fields in the manifest
- Create visually appealing store listing images
- Write a compelling description with relevant keywords
- Test thoroughly across different Chrome versions and platforms

Publishing Process

1. Create a developer account at the Chrome Web Store
2. Package your extension as a ZIP file
3. Upload and fill in store listing details
4. Submit for review (typically takes 24-72 hours)
5. Publish once approved

---

Conclusion {#conclusion}

Building a Lighthouse Runner Chrome Extension is an excellent project that combines web development skills with practical utility. You've learned how to create the core components of a Chrome extension, manifest configuration, popup interface, and background scripts, and how to integrate Google's Lighthouse for powerful performance auditing.

This extension serves as a foundation that you can continue to expand. The principles you've learned here apply to building any Chrome extension, from simple utilities to complex development tools.

Remember that the best tools are those that solve real problems. As you use your Lighthouse Runner extension in daily development workflows, you'll discover new features and improvements that make it even more valuable. Keep iterating, keep testing, and most importantly, keep building.

The ability to run performance audits directly from your browser transforms how you approach web performance optimization. With a single click, you have detailed insights into your site's performance, accessibility, best practices, and SEO. This immediate feedback loop is invaluable for maintaining high-quality web experiences.

Now it's your turn to take this foundation and make it your own. Add your unique features, refine the interface, and publish your creation to help other developers build faster, more performant websites. The web development community needs more tools that make performance optimization accessible to everyone.

---

Frequently Asked Questions {#faq}

Can I use this extension offline?

Lighthouse requires an internet connection to run audits since it needs to load the target webpage and its resources. However, you can view previously cached results offline.

How long does an audit take?

Audit duration depends on the complexity of the target page. Simple pages may complete in 10-20 seconds, while complex web applications can take 60 seconds or longer.

Are the results accurate compared to DevTools?

Yes, the Lighthouse used in extensions is the same engine that powers Chrome DevTools. Results are identical whether you use DevTools or your extension.

Can I audit local development servers?

Yes, as long as the server is accessible from Chrome. You can enter localhost URLs directly in the extension.

Does this work with all websites?

Some websites may block automated audits or require authentication. For password-protected pages, you'll need to use Chrome's DevTools Lighthouse panel while logged in.

---

*Start building your Lighthouse Runner extension today and bring professional performance auditing to your browser toolbar.*
