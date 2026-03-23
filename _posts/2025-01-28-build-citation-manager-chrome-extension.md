---
layout: post
title: "Build a Citation Manager Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a powerful citation manager Chrome extension that automates bibliography creation. Step-by-step tutorial covering Manifest V3, content scripts, storage APIs, and publishing."
date: 2025-01-28
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "citation manager extension, reference tool chrome, bibliography extension, chrome extension citation manager, build citation tool chrome"
canonical_url: "https://bestchromeextensions.com/2025/01/28/build-citation-manager-chrome-extension/"
---

# Build a Citation Manager Chrome Extension: Complete Developer's Guide

Managing citations and references is one of the most time-consuming aspects of academic writing, research, and professional documentation. Whether you are a student writing a thesis, a researcher preparing a paper, or a professional creating reports with multiple sources, manually formatting citations can consume hours of tedious work. This is exactly the kind of problem that Chrome extensions were designed to solve.

In this comprehensive tutorial, we will walk through the complete process of building a citation manager Chrome extension from scratch. By the end of this guide, you will have a fully functional extension capable of detecting scholarly content on web pages, extracting citation metadata, storing references, and generating formatted bibliographies in multiple citation styles.

---

Why Build a Citation Manager Extension? {#why-build-citation-manager}

The demand for citation management tools continues to grow as academic publishing expands and digital content becomes increasingly complex. Researchers and students frequently encounter valuable sources while browsing the web, but the process of capturing these references and formatting them correctly is often so cumbersome that many simply bookmark the page and hope they remember where they found the information later.

A well-designed citation manager extension solves this problem by meeting users where they already work, in their browser. Rather than requiring users to manually copy-paste information from websites into separate reference management software, an extension can automatically detect scholarly content, extract relevant metadata, and store references with a single click.

The citation manager extension market presents a significant opportunity for developers. Existing solutions often require expensive subscriptions, lack modern web integration, or impose steep learning curves on new users. By building a citation manager extension, you can create a tool that addresses real problems while developing valuable skills in Chrome extension development, web scraping, data extraction, and integration with external APIs.

---

Project Architecture and Features {#project-architecture}

Before writing any code, let us establish the architecture and feature set for our citation manager extension. A production-quality citation manager should include several core capabilities.

The extension needs to detect when users are viewing academic content on web pages. This includes journal articles, conference papers, preprints, dissertations, and books. When such content is detected, the extension should offer to extract and save the citation automatically.

The extraction process must handle multiple metadata formats. Academic websites often embed citation information in various formats, including APA, MLA, Chicago, BibTeX, RIS, and custom metadata schemas. Our extension needs to parse these different formats and normalize the data into a consistent internal structure.

Users should be able to organize their collected references into custom collections or folders. This allows them to group citations by project, topic, or paper. The extension must provide a user interface for managing these collections, adding notes to references, and searching through saved citations.

Perhaps most importantly, the extension must generate properly formatted bibliographies. Users should be able to export their references in multiple citation styles, including APA 7th edition, MLA 9th edition, Chicago, Harvard, and Vancouver. The export should be available in formats like plain text, formatted document text, BibTeX, and RIS for compatibility with other reference managers.

Finally, the extension should synchronize data across devices. Using Chrome's storage API, users can access their citation library from any Chrome browser where they are signed in.

---

Setting Up the Project Structure {#project-structure}

Let us begin by creating the project structure. We will use Manifest V3, the current standard for Chrome extensions, and organize our code into logical modules.

Create a new directory for your extension and set up the following file structure:

```
citation-manager/
 manifest.json
 popup/
    popup.html
    popup.js
    popup.css
 content/
    content.js
 background/
    background.js
 shared/
    citation-formatter.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 _locales/
     en/
         messages.json
```

This structure separates concerns between the popup interface, content scripts that run on web pages, background service workers, and shared utilities.

---

Creating the Manifest File {#manifest-file}

The manifest.json file defines our extension and its capabilities. For a citation manager, we need specific permissions to access web page content, store data, and interact with external APIs.

```json
{
  "manifest_version": 3,
  "name": "Citation Manager",
  "version": "1.0.0",
  "description": "Automatically capture, organize, and format citations from any webpage",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": ["content/content.js"]
    }
  ],
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

This manifest declares that our extension needs to read page content, store data locally, and run scripts on all websites. The `activeTab` permission ensures we can only access the current tab when the user explicitly invokes the extension, which is essential for user privacy.

---

Building the Content Script for Citation Detection {#content-script}

The content script is the heart of citation detection. It runs on every webpage and looks for signs of scholarly content. Modern academic websites typically embed citation metadata in several standard formats, and our content script needs to detect and extract all of them.

The most common format is Schema.org metadata, which uses JSON-LD or microdata to describe page content in a machine-readable format. Many academic publishers embed structured data indicating that a page is an article, including fields for title, authors, publication date, and journal information.

Citation managers also frequently embed COinS (Context Object in Span) metadata, which encodes citation information in a compact format within HTML span elements. Additionally, websites may include direct citation links in various formats, BibTeX entries, or RIS files.

Our content script will first check for Schema.org data, then fall back to COinS parsing, and finally attempt general metadata extraction:

```javascript
// content/content.js

// Citation detection and extraction logic
class CitationDetector {
  constructor() {
    this.citationData = null;
  }

  // Check for Schema.org JSON-LD metadata
  detectSchemaOrg() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'ScholarlyArticle' || 
            data['@type'] === 'Article' ||
            data['@type'] === 'Book') {
          return this.extractFromSchemaOrg(data);
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }
    return null;
  }

  // Extract citation from Schema.org data
  extractFromSchemaOrg(data) {
    const authors = data.author ? 
      (Array.isArray(data.author) ? 
        data.author.map(a => a.name || a) : 
        [data.author.name || data.author]) : 
      [];

    return {
      type: 'article',
      title: data.headline || data.name || '',
      authors: authors,
      journal: data.publisher?.name || '',
      year: data.datePublished ? new Date(data.datePublished).getFullYear() : '',
      doi: data.identifier?.find(id => id.propertyID === 'doi')?.value || '',
      url: data.url || window.location.href,
      abstract: data.description || ''
    };
  }

  // Parse COinS metadata
  detectCOinS() {
    const spans = document.querySelectorAll('span.coins');
    for (const span of spans) {
      const coInsData = span.getAttribute('title');
      if (coInsData) {
        return this.parseCOinS(coInsData);
      }
    }
    return null;
  }

  // Parse COinS format
  parseCOinS(coInsString) {
    const params = new URLSearchParams(coInsString);
    return {
      type: 'article',
      title: params.get('rft.atitle') || '',
      authors: (params.get('rft.au') || '').split(';').filter(a => a),
      journal: params.get('rft.jtitle') || '',
      year: params.get('rft.date') || '',
      volume: params.get('rft.volume') || '',
      issue: params.get('rft.issue') || '',
      pages: params.get('rft.pages') || '',
      doi: params.get('rft.doi') || '',
      url: params.get('rft.identifier') || window.location.href
    };
  }

  // Fallback to meta tag extraction
  detectFromMetaTags() {
    const metaSelectors = {
      title: 'meta[name="citation_title"]',
      author: 'meta[name="citation_author"]',
      journal: 'meta[name="citation_journal_title"]',
      date: 'meta[name="citation_publication_date"]',
      doi: 'meta[name="citation_doi"]'
    };

    const citation = { type: 'article', url: window.location.href };

    for (const [field, selector] of Object.entries(metaSelectors)) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        if (field === 'author') {
          citation.authors = Array.from(elements).map(el => el.getAttribute('content'));
        } else {
          citation[field] = elements[0].getAttribute('content');
        }
      }
    }

    return Object.keys(citation).length > 2 ? citation : null;
  }

  // Main detection method
  detect() {
    return this.detectSchemaOrg() || 
           this.detectCOinS() || 
           this.detectFromMetaTags();
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCitation') {
    const detector = new CitationDetector();
    const citation = detector.detect();
    sendResponse({ citation: citation });
  }
  return true;
});
```

This content script provides a solid foundation for detecting citations across different types of academic websites. The three-layer detection strategy ensures we capture citations even when websites use non-standard formats.

---

Building the Popup Interface {#popup-interface}

The popup provides the user interface for interacting with the extension. It should allow users to save citations, browse their library, and export formatted references.

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Citation Manager</h1>
    </header>
    
    <div id="detection-status" class="status">
      <span class="loading">Checking page for citations...</span>
    </div>

    <div id="citation-preview" class="citation-card" style="display: none;">
      <h3>Citation Detected</h3>
      <div class="citation-details">
        <p><strong>Title:</strong> <span id="cit-title"></span></p>
        <p><strong>Authors:</strong> <span id="cit-authors"></span></p>
        <p><strong>Journal:</strong> <span id="cit-journal"></span></p>
        <p><strong>Year:</strong> <span id="cit-year"></span></p>
      </div>
      <div class="actions">
        <button id="save-btn" class="primary-btn">Save Citation</button>
        <button id="dismiss-btn" class="secondary-btn">Dismiss</button>
      </div>
    </div>

    <div id="library-section">
      <h2>My Library</h2>
      <div class="controls">
        <select id="export-style">
          <option value="apa">APA 7th</option>
          <option value="mla">MLA 9th</option>
          <option value="chicago">Chicago</option>
          <option value="bibtex">BibTeX</option>
        </select>
        <button id="export-btn" class="secondary-btn">Export</button>
      </div>
      <div id="citations-list"></div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The popup interface provides a clean, functional design for managing citations. Users can view detected citations, save them to their library, and export their collection in various formats.

---

Implementing Popup Logic and Storage {#popup-logic}

The popup JavaScript coordinates between the user interface and Chrome's storage system. It retrieves detected citations from the content script, saves them to persistent storage, and handles export functionality.

```javascript
// popup/popup.js

class CitationPopup {
  constructor() {
    this.citations = [];
    this.init();
  }

  async init() {
    await this.loadCitations();
    await this.detectCurrentPage();
    this.bindEvents();
  }

  async detectCurrentPage() {
    const statusEl = document.getElementById('detection-status');
    const previewEl = document.getElementById('citation-preview');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCitation' });
      
      if (response && response.citation) {
        this.currentCitation = response.citation;
        this.displayCitationPreview(response.citation);
        statusEl.style.display = 'none';
        previewEl.style.display = 'block';
      } else {
        statusEl.innerHTML = '<span class="no-citation">No citation detected on this page</span>';
      }
    } catch (error) {
      statusEl.innerHTML = '<span class="no-citation">Unable to detect citation on this page</span>';
    }
  }

  displayCitationPreview(citation) {
    document.getElementById('cit-title').textContent = citation.title || 'Untitled';
    document.getElementById('cit-authors').textContent = 
      (citation.authors && citation.authors.length) ? citation.authors.join(', ') : 'Unknown';
    document.getElementById('cit-journal').textContent = citation.journal || 'N/A';
    document.getElementById('cit-year').textContent = citation.year || 'N/A';
  }

  async loadCitations() {
    const result = await chrome.storage.local.get('citations');
    this.citations = result.citations || [];
    this.renderCitationsList();
  }

  async saveCitation() {
    if (!this.currentCitation) return;
    
    this.currentCitation.id = Date.now().toString();
    this.currentCitation.savedAt = new Date().toISOString();
    
    this.citations.push(this.currentCitation);
    await chrome.storage.local.set({ citations: this.citations });
    
    this.renderCitationsList();
    document.getElementById('citation-preview').style.display = 'none';
    document.getElementById('detection-status').innerHTML = 
      '<span class="success">Citation saved!</span>';
    document.getElementById('detection-status').style.display = 'block';
  }

  renderCitationsList() {
    const listEl = document.getElementById('citations-list');
    
    if (this.citations.length === 0) {
      listEl.innerHTML = '<p class="empty">No citations saved yet</p>';
      return;
    }

    listEl.innerHTML = this.citations.map(cit => `
      <div class="citation-item">
        <h4>${cit.title || 'Untitled'}</h4>
        <p class="authors">${(cit.authors || []).join(', ')}</p>
        <p class="meta">${cit.journal || ''} ${cit.year ? `(${cit.year})` : ''}</p>
      </div>
    `).join('');
  }

  async exportCitations() {
    const style = document.getElementById('export-style').value;
    const formatter = new CitationFormatter();
    const formatted = this.citations.map(cit => formatter.format(cit, style)).join('\n\n');
    
    await navigator.clipboard.writeText(formatted);
    alert('Citations copied to clipboard!');
  }

  bindEvents() {
    document.getElementById('save-btn')?.addEventListener('click', () => this.saveCitation());
    document.getElementById('export-btn')?.addEventListener('click', () => this.exportCitations());
    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      document.getElementById('citation-preview').style.display = 'none';
    });
  }
}

new CitationPopup();
```

This popup logic connects all the pieces together, handling user interactions and managing the citation storage. The CitationFormatter class, which we will implement next, handles the actual format conversion.

---

Citation Formatting Engine {#citation-formatter}

The citation formatter is responsible for converting stored citation data into properly formatted bibliographies. Different citation styles have specific rules for punctuation, ordering, and capitalization.

```javascript
// shared/citation-formatter.js

class CitationFormatter {
  format(citation, style) {
    switch (style) {
      case 'apa':
        return this.formatAPA(citation);
      case 'mla':
        return this.formatMLA(citation);
      case 'chicago':
        return this.formatChicago(citation);
      case 'bibtex':
        return this.formatBibTeX(citation);
      default:
        return this.formatAPA(citation);
    }
  }

  formatAPA(citation) {
    const authors = this.formatAPAAuthors(citation.authors);
    const year = citation.year ? `(${citation.year})` : '(n.d.)';
    const title = citation.title || 'Untitled';
    const journal = citation.journal ? `*${citation.journal}*` : '';
    const volume = citation.volume ? `, *${citation.volume}*` : '';
    const issue = citation.issue ? `(${citation.issue})` : '';
    const pages = citation.pages ? `, ${citation.pages}` : '';
    const doi = citation.doi ? ` https://doi.org/${citation.doi}` : '';
    
    return `${authors} ${year}. ${title}. ${journal}${volume}${issue}${pages}.${doi}`;
  }

  formatAPAAuthors(authors) {
    if (!authors || !authors.length) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  formatMLA(citation) {
    const authors = citation.authors ? citation.authors.join(', ') : '';
    const title = citation.title ? `"${citation.title}."` : '';
    const journal = citation.journal ? `*${citation.journal}*` : '';
    const volume = citation.volume ? `, vol. ${citation.volume}` : '';
    const issue = citation.issue ? `, no. ${citation.issue}` : '';
    const year = citation.year ? `, ${citation.year}` : '';
    const pages = citation.pages ? `, pp. ${citation.pages}` : '';
    
    return `${authors}. ${title} ${journal}${volume}${issue}${year}${pages}.`;
  }

  formatChicago(citation) {
    const authors = citation.authors ? citation.authors.join(', ') : '';
    const title = citation.title ? `"${citation.title}."` : '';
    const journal = citation.journal ? `*${citation.journal}*` : '';
    const volume = citation.volume || '';
    const issue = citation.issue ? `, no. ${citation.issue}` : '';
    const year = citation.year ? ` (${citation.year})` : '';
    const pages = citation.pages ? `: ${citation.pages}` : '';
    
    return `${authors}. ${title} ${journal} ${volume}${issue}${year}${pages}.`;
  }

  formatBibTeX(citation) {
    const id = citation.id || 'unknown';
    const authors = citation.authors ? 
      citation.authors.join(' and ') : 'Unknown';
    
    return `@article{${id},
  author = {${authors}},
  title = {${citation.title || ''}},
  journal = {${citation.journal || ''}},
  year = {${citation.year || ''}},
  volume = {${citation.volume || ''}},
  pages = {${citation.pages || ''}},
  doi = {${citation.doi || ''}}
}`;
  }
}
```

This formatter provides support for four common citation styles plus BibTeX, which is essential for compatibility with academic tools and other reference managers.

---

Styling the Extension {#extension-styling}

The visual design should be clean and professional, matching the academic nature of the tool while remaining easy to use.

```css
/* popup/popup.css */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 350px;
  min-height: 400px;
  background: #f5f5f5;
}

.container {
  padding: 16px;
}

header h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #4285f4;
}

.status {
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.status .loading {
  color: #666;
  font-size: 14px;
}

.status .success {
  color: #34a853;
  font-weight: 500;
}

.status .no-citation {
  color: #999;
  font-size: 14px;
}

.citation-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.citation-card h3 {
  font-size: 14px;
  color: #4285f4;
  margin-bottom: 12px;
}

.citation-details p {
  font-size: 13px;
  margin-bottom: 6px;
  color: #555;
}

.citation-details strong {
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn {
  background: #4285f4;
  color: white;
}

.primary-btn:hover {
  background: #3367d6;
}

.secondary-btn {
  background: #e8eaed;
  color: #333;
}

.secondary-btn:hover {
  background: #dfe0e3;
}

#library-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

#library-section h2 {
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.controls select {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

#citations-list {
  max-height: 200px;
  overflow-y: auto;
}

.citation-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.citation-item:last-child {
  border-bottom: none;
}

.citation-item h4 {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.citation-item .authors {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.citation-item .meta {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

.empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px;
}
```

This styling creates a professional, usable interface that fits smoothly with Chrome's design language while providing all the functionality users need to manage their citations effectively.

---

Testing and Loading Your Extension {#testing-extension}

Before publishing, thoroughly test your extension in development mode. Load it into Chrome by navigating to chrome://extensions, enabling Developer mode, and clicking "Load unpacked." Select your extension directory.

Test the extension on various academic websites, including journal platforms like JSTOR, PubMed, Google Scholar, and university repositories. Verify that citations are correctly detected and that the formatting produces accurate results.

Pay special attention to edge cases. Some websites may have incomplete metadata, unusual formatting, or no citation information at all. Your extension should handle these gracefully, either by showing appropriate messages or by allowing manual entry of missing information.

---

Publishing to the Chrome Web Store {#publishing}

Once your extension is thoroughly tested, you can publish it to the Chrome Web Store. Prepare your store listing with a compelling description that highlights the key features and benefits. Use screenshots to demonstrate the extension in action.

The Chrome Web Store charges a one-time $5 developer registration fee. After paying this fee and completing your store listing, you can publish your extension. Google reviews submissions typically within a few hours to a few days.

For your citation manager extension, emphasize features like automatic detection, multi-format support, and easy export capabilities in your store listing. These are the features that will attract users searching for citation management solutions.

---

Conclusion and Future Enhancements {#conclusion}

Building a citation manager Chrome extension is an excellent project that combines practical utility with meaningful technical challenges. The skills you develop, working with content scripts, managing persistent storage, parsing complex metadata formats, and implementing export functionality, transfer directly to many other extension projects.

This foundational implementation provides a solid starting point. From here, you can add powerful features like cloud synchronization, integration with reference databases like CrossRef and PubMed, support for more citation styles, collaborative sharing, and even AI-powered metadata enhancement.

The citation manager niche remains underserved by free, modern tools. A well-built extension in this space can genuinely help students, researchers, and professionals save hours of tedious work while developing your skills as a Chrome extension developer.
