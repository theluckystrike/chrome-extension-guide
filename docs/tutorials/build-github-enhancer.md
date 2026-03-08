---
title: Building a GitHub UI Enhancer Extension
description: Learn how to build a Chrome extension that enhances GitHub with file tree sidebar, copy button, repo size display, and enhanced diffs.
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-github-enhancer/"
---

# Chrome Extension Building a GitHub UI Enhancer Extension — Complete Developer's Guide

Learn how to build powerful Chrome extensions with this comprehensive guide covering practical implementation and best practices. This guide provides step-by-step instructions for creating professional-grade extensions.
This tutorial walks you through creating a Chrome extension that enhances GitHub's UI with productivity features.

## Prerequisites
- Chrome browser (version 88+)
- GitHub account
- Basic knowledge of JavaScript and Chrome extensions

## Project Structure
```
github-enhancer/
├── manifest.json
├── content.js
├── popup/popup.html, popup.js
├── utils/api.js
├── utils/dom.js
```

## Step 1: Manifest Configuration

Configure the manifest with content scripts matching GitHub URLs:

```json
{
  "manifest_version": 3,
  "name": "GitHub Enhancer",
  "permissions": ["storage"],
  "host_permissions": ["https://github.com/", "https://api.github.com/"],
  "action": { "default_popup": "popup/popup.html" },
  "content_scripts": [{
    "matches": ["https://github.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

## Step 2: Detect GitHub Page Type

Identify which GitHub page type the user is viewing using URL patterns:

```javascript
const PageType = {
  REPO: /github\.com\/[^/]+\/[^/]+$/,
  FILE: /github\.com\/[^/]+\/[^/]+\/blob\//,
  PR: /github\.com\/[^/]+\/[^/]+\/pull\//,
  ISSUES: /github\.com\/[^/]+\/[^/]+\/issues\//
};

function detectPageType(url) {
  if (PageType.PR.test(url)) return 'pr';
  if (PageType.FILE.test(url)) return 'file';
  if (PageType.ISSUES.test(url)) return 'issues';
  if (PageType.REPO.test(url)) return 'repo';
  return null;
}
```

Reference: [URL Matching Patterns](/docs/patterns/url-matching-patterns.md)

## Step 3: File Tree Sidebar

Build a file tree sidebar using GitHub API or DOM scraping:

```javascript
async function buildFileTreeSidebar() {
  const repo = extractRepoInfo();
  const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`);
  const data = await response.json();
  
  const tree = document.createElement('div');
  tree.className = 'gh-enhancer-file-tree';
  tree.innerHTML = renderFileTree(data.tree);
  document.querySelector('.Layout-sidebar').prepend(tree);
}
```

## Step 4: Copy Raw File Button

Add a copy button to file headers:

```javascript
function addCopyButton() {
  const header = document.querySelector('.file-header');
  if (!header) return;
  
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm gh-enhancer-copy';
  btn.textContent = 'Copy';
  btn.onclick = async () => {
    const content = await fetchRawFileContent();
    await navigator.clipboard.writeText(content);
    btn.textContent = 'Copied!';
  };
  header.appendChild(btn);
}
```

## Step 5: Repo Size Display

Fetch and display repository size in the header:

```javascript
async function displayRepoSize() {
  const repo = extractRepoInfo();
  const response = await fetch(`https://api.github.com/repos/${repo}`);
  const data = await response.json();
  
  const sizeKB = data.size * 1024;
  const sizeDisplay = formatSize(sizeKB);
  
  const header = document.querySelector('.repo-header');
  const sizeEl = document.createElement('span');
  sizeEl.className = 'gh-enhancer-repo-size';
  sizeEl.textContent = `Size: ${sizeDisplay}`;
  header.appendChild(sizeEl);
}
```

## Step 6: Enhanced Diff View

Add word-level diff highlighting in PR files:

```javascript
function enhanceDiffView() {
  document.querySelectorAll('.diff-table tbody tr').forEach(row => {
    const additions = row.querySelector('.blob-code-addition');
    const deletions = row.querySelector('.blob-code-deletion');
    
    if (additions) additions.classList.add('gh-enhancer-diff-add');
    if (deletions) deletions.classList.add('gh-enhancer-diff-del');
  });
}
```

## Step 7: Quick Actions with Keyboard Shortcuts

Implement keyboard shortcuts for common GitHub actions:

```javascript
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'n') {
    window.location.href += '/new';
  }
  if (e.altKey && e.key === 'i') {
    window.location.href += '/issues/new';
  }
});
```

Reference: [Keyboard Shortcuts API](/docs/guides/keyboard-shortcuts.md)

## Step 8: Settings Popup

Create a settings popup to toggle features:

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html><body>
<h3>GitHub Enhancer Settings</h3>
<label><input type="checkbox" id="fileTree" checked> File Tree</label>
<label><input type="checkbox" id="copyButton" checked> Copy Button</label>
<label><input type="checkbox" id="repoSize" checked> Repo Size</label>
<label><input type="checkbox" id="enhancedDiff" checked> Enhanced Diff</label>
<script src="popup.js"></script>
</body></html>
```

```javascript
// popup/popup.js
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('change', (e) => {
    chrome.storage.sync.set({ [e.target.id]: e.target.checked });
  });
});
```

## SPA Navigation Handling

GitHub uses Turbo/PJAX for navigation. Use MutationObserver to detect page changes:

```javascript
const observer = new MutationObserver((mutations) => {
  const pageType = detectPageType(window.location.href);
  handlePageType(pageType);
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

Reference: [DOM Observer Patterns](/docs/patterns/dom-observer-patterns.md), [Dynamic Content Injection](/docs/patterns/dynamic-content-injection.md)

## GitHub API Rate Limits

Handle rate limits by caching responses and using auth tokens:

```javascript
const cache = new Map();

async function fetchWithCache(url) {
  if (cache.has(url)) return cache.get(url);
  
  const response = await fetch(url);
  if (response.status === 403) {
    console.warn('API rate limit reached');
    return null;
  }
  
  const data = await response.json();
  cache.set(url, data);
  return data;
}
```

Reference: [Content Script Patterns](/docs/guides/content-script-patterns.md)

## Summary

This tutorial covered building a GitHub UI enhancer with:
- Manifest configuration for GitHub domains
- Page type detection from URL patterns
- File tree sidebar using GitHub API
- Copy button for file content
- Repository size display
- Enhanced diff highlighting
- Keyboard shortcuts for quick actions
- Settings popup for feature toggles
- SPA navigation handling with MutationObserver
- API rate limit handling with caching
