---
layout: post
title: "Build a Custom Search Engine Chrome Extension: Search Multiple Sites at Once"
description: "Learn to build a custom search engine Chrome extension that searches multiple sites simultaneously. Complete guide with code examples using Manifest V3."
date: 2025-05-12
categories: [Chrome-Extensions, Tutorials]
tags: [search, multi-search, chrome-extension]
keywords: "chrome extension search engine, custom search chrome, multi search chrome extension, search aggregator extension, build search extension"
canonical_url: "https://bestchromeextensions.com/2025/05/12/build-custom-search-engine-chrome-extension/"
---

# Build a Custom Search Engine Chrome Extension: Search Multiple Sites at Once

If you frequently search across multiple websites, like checking prices across different retailers, comparing code snippets on Stack Overflow and GitHub, or looking up topics across various documentation sites, you've probably wished there was a way to search everything at once. This is exactly what a multi-search Chrome extension can do for you. I'll walk you through building a custom search engine Chrome extension that lets you search multiple sites simultaneously, saving you time and boosting your productivity.

This tutorial uses Chrome's latest Manifest V3 format, ensuring your extension works with modern Chrome architecture and passes the Chrome Web Store review process. Whether you're a beginner to Chrome extension development or an experienced developer looking to expand your skills, this guide will provide you with everything you need to create a powerful search aggregator extension.

---

Understanding Multi-Search Extensions {#understanding-multi-search}

Before we dive into the code, let's understand what makes a multi-search extension work and why you might want to build one.

What Is a Multi-Search Chrome Extension?

A multi-search Chrome extension, also known as a search aggregator, is a browser extension that takes a single search query and executes it across multiple websites simultaneously. Instead of manually visiting each site, typing your search term, and waiting for results, you enter your query once in the extension, and it opens multiple search results in new tabs or displays them in a consolidated view.

For example, imagine you want to compare the price of a product across Amazon, eBay, and Walmart. With a custom search extension, you would type the product name once, and the extension would automatically open three tabs, one with Amazon results, one with eBay results, and one with Walmart results. This is incredibly valuable for researchers, shoppers, developers, and anyone who regularly searches multiple sources.

Why Build a Custom Search Engine Extension?

The popularity of extensions like "Search All" and "SearchPreview" demonstrates the demand for this type of tool. Building your own gives you several advantages:

First, you can customize it for your specific needs. Maybe you need to search specific documentation sites, particular news outlets, or niche shopping platforms. A custom extension lets you define exactly which sites to search and how to format the queries.

Second, you gain complete control over the user interface. You can design the popup to match your preferences, add keyboard shortcuts, implement save functionality for frequently used search combinations, and more.

Third, building a multi-search extension is an excellent learning project. It touches on several key Chrome extension concepts: the popup interface, browser tabs API, URL manipulation, user preferences storage, and message passing between extension components.

---

Project Architecture {#project-architecture}

Our multi-search Chrome extension will consist of several key components:

1. manifest.json: The configuration file that defines the extension's capabilities and permissions
2. popup.html: The user interface that appears when you click the extension icon
3. popup.js: The JavaScript that handles user interactions and executes searches
4. popup.css: Styling for the popup interface
5. background.js (optional): For handling background tasks if needed

Let's start building each component.

---

Step 1: Creating the Manifest File {#manifest-file}

Every Chrome extension begins with a manifest.json file. This tells Chrome about your extension's name, version, permissions, and the files it uses. For Manifest V3, we need to specify the correct version and declare our popup:

```json
{
  "manifest_version": 3,
  "name": "Multi-Search Hub",
  "version": "1.0",
  "description": "Search multiple sites at once with this custom search engine extension",
  "permissions": ["activeTab", "tabs"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The `permissions` array includes `activeTab` and `tabs`, which we'll need to create new tabs programmatically. The `action` section defines our popup interface.

---

Step 2: Building the Popup Interface {#popup-interface}

The popup is what users see when they click your extension icon. Let's create a clean, functional interface:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Search Hub</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Multi-Search Hub</h1>
      <p class="subtitle">Search multiple sites at once</p>
    </header>
    
    <main>
      <form id="searchForm">
        <div class="search-input-wrapper">
          <input 
            type="text" 
            id="searchQuery" 
            placeholder="Enter your search term..." 
            autocomplete="off"
            required
          >
          <button type="submit" id="searchButton">Search</button>
        </div>
      </form>
      
      <div class="search-engines">
        <h3>Search Engines</h3>
        <div class="engine-list">
          <label class="engine-option">
            <input type="checkbox" id="google" checked>
            <span>Google</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="bing" checked>
            <span>Bing</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="duckduckgo" checked>
            <span>DuckDuckGo</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="youtube" checked>
            <span>YouTube</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="stackoverflow">
            <span>Stack Overflow</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="github">
            <span>GitHub</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="wikipedia">
            <span>Wikipedia</span>
          </label>
          <label class="engine-option">
            <input type="checkbox" id="amazon">
            <span>Amazon</span>
          </label>
        </div>
      </div>
      
      <div class="quick-search">
        <h3>Quick Search</h3>
        <div class="quick-buttons">
          <button class="quick-btn" data-engine="google" data-query="chrome extension">Google</button>
          <button class="quick-btn" data-engine="github" data-query="javascript">GitHub</button>
          <button class="quick-btn" data-engine="stackoverflow" data-query="api">Stack Overflow</button>
        </div>
      </div>
    </main>
    
    <footer>
      <p>Select engines and enter your search</p>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This interface provides a clean input field for the search query, checkboxes to select which search engines to use, and quick search buttons for common searches.

---

Step 3: Styling the Popup {#styling-popup}

Let's add some modern CSS to make our extension look professional:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background-color: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.search-input-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

#searchQuery {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

#searchQuery:focus {
  border-color: #1a73e8;
}

#searchButton {
  padding: 10px 16px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

#searchButton:hover {
  background-color: #1557b0;
}

.search-engines h3,
.quick-search h3 {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.engine-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.engine-option:hover {
  background: #e8f0fe;
}

.engine-option input {
  accent-color: #1a73e8;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
  color: #1a73e8;
}

footer {
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

footer p {
  font-size: 11px;
  color: #888;
}
```

---

Step 4: Implementing the Search Logic {#search-logic}

Now let's create the JavaScript that handles the search functionality:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchQuery = document.getElementById('searchQuery');
  const searchButton = document.getElementById('searchButton');
  
  // Search engine configurations with their URL patterns
  // The {QUERY} placeholder will be replaced with the user's search term
  const searchEngines = {
    google: {
      url: 'https://www.google.com/search?q={QUERY}',
      active: () => document.getElementById('google').checked
    },
    bing: {
      url: 'https://www.bing.com/search?q={QUERY}',
      active: () => document.getElementById('bing').checked
    },
    duckduckgo: {
      url: 'https://duckduckgo.com/?q={QUERY}',
      active: () => document.getElementById('duckduckgo').checked
    },
    youtube: {
      url: 'https://www.youtube.com/results?search_query={QUERY}',
      active: () => document.getElementById('youtube').checked
    },
    stackoverflow: {
      url: 'https://stackoverflow.com/search?q={QUERY}',
      active: () => document.getElementById('stackoverflow').checked
    },
    github: {
      url: 'https://github.com/search?q={QUERY}',
      active: () => document.getElementById('github').checked
    },
    wikipedia: {
      url: 'https://en.wikipedia.org/wiki/Special:Search?search={QUERY}',
      active: () => document.getElementById('wikipedia').checked
    },
    amazon: {
      url: 'https://www.amazon.com/s?k={QUERY}',
      active: () => document.getElementById('amazon').checked
    }
  };
  
  // Function to encode the search query for URL safety
  function encodeQuery(query) {
    return encodeURIComponent(query.trim());
  }
  
  // Function to perform the search across selected engines
  async function performSearch(query) {
    const encodedQuery = encodeQuery(query);
    const activeEngines = [];
    
    // Collect all active search engines
    for (const [engine, config] of Object.entries(searchEngines)) {
      if (config.active()) {
        activeEngines.push({ name: engine, url: config.url.replace('{QUERY}', encodedQuery) });
      }
    }
    
    if (activeEngines.length === 0) {
      alert('Please select at least one search engine');
      return;
    }
    
    // Open search results in new tabs
    for (let i = 0; i < activeEngines.length; i++) {
      const engine = activeEngines[i];
      
      // Create a new tab for each search engine
      // The first result replaces the current tab, others open in new tabs
      const createNewTab = i > 0;
      
      await chrome.tabs.create({
        url: engine.url,
        active: createNewTab ? false : true
      });
    }
  }
  
  // Handle form submission
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchQuery.value.trim();
    
    if (query) {
      performSearch(query);
    }
  });
  
  // Handle search button click
  searchButton.addEventListener('click', (e) => {
    e.preventDefault();
    const query = searchQuery.value.trim();
    
    if (query) {
      performSearch(query);
    }
  });
  
  // Handle quick search buttons
  document.querySelectorAll('.quick-btn').forEach(button => {
    button.addEventListener('click', () => {
      const engine = button.dataset.engine;
      const query = button.dataset.query;
      
      // Check if the engine is selected
      if (searchEngines[engine] && searchEngines[engine].active()) {
        const encodedQuery = encodeQuery(query);
        const url = searchEngines[engine].url.replace('{QUERY}', encodedQuery);
        
        chrome.tabs.create({
          url: url,
          active: true
        });
      } else {
        // If not selected, just perform search on Google
        const encodedQuery = encodeQuery(query);
        const url = searchEngines.google.url.replace('{QUERY}', encodedQuery);
        
        chrome.tabs.create({
          url: url,
          active: true
        });
      }
    });
  });
  
  // Handle Enter key in input field
  searchQuery.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.value.trim();
      
      if (query) {
        performSearch(query);
      }
    }
  });
});
```

This JavaScript file handles all the core functionality: reading which search engines are selected, encoding the query for URL safety, and opening the appropriate URLs in new tabs.

---

Step 5: Creating Extension Icons {#creating-icons}

Every Chrome extension needs icons. For a production extension, you'd want to create proper icon files. For this tutorial, you can create simple placeholder icons or use any image editing tool to create them. The manifest references three icon sizes: 16x16, 48x48, and 128x128 pixels.

Create an `icons` folder and add your icon files:
- icons/icon16.png (16x16 pixels)
- icons/icon48.png (48x48 pixels)  
- icons/icon128.png (128x128 pixels)

---

Step 6: Loading and Testing the Extension {#loading-testing}

Now let's test our extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your Chrome toolbar
5. Click the icon to open the popup and test the search functionality

You should be able to:
- Enter a search query and see results open in multiple tabs
- Check/uncheck different search engines to customize your search
- Use quick search buttons for common searches

---

Advanced Features to Consider {#advanced-features}

Once you have the basic multi-search extension working, here are some advanced features you could implement:

Save Custom Search Profiles

Allow users to save their preferred combination of search engines under a custom name. This would use Chrome's storage API to persist the profiles.

Keyboard Shortcuts

Add keyboard shortcuts so users can trigger searches without opening the popup. You can implement this using the commands permission in your manifest.

Search History

Implement local search history so users can quickly repeat previous searches. This would also use the storage API.

Custom Search Engines

Allow users to add their own custom search engines beyond the defaults. This would require additional UI for adding custom URLs with {QUERY} placeholders.

Open in Current Tab

Instead of opening all results in new tabs, give users the option to cycle through results in the current tab.

---

Troubleshooting Common Issues {#troubleshooting}

Here are some common issues you might encounter when building your multi-search extension:

Extension not appearing: Make sure you've loaded the unpacked extension correctly in chrome://extensions/. Check for any errors in the console.

Search not working: Verify that your URL templates are correct. Some sites encode spaces differently, using encodeURIComponent should handle most cases.

Tabs not opening: Ensure you have the "tabs" permission in your manifest. Also, Chrome may block multiple tab creations in quick succession; adding a small delay between tab creations can help.

Popup closing too quickly: When testing, make sure you're not accidentally clicking outside the popup area, which would cause it to close.

---

Publishing Your Extension {#publishing}

Once your extension is working correctly, you can publish it to the Chrome Web Store:

1. Create a developer account at the Chrome Web Store
2. Zip your extension folder
3. Upload the zip file through the developer dashboard
4. Fill in the store listing details (description, screenshots, category)
5. Submit for review

Make sure your extension follows Chrome's policies, particularly around user data and functionality. Multi-search extensions are generally straightforward to get approved.

---

Conclusion {#conclusion}

Congratulations! You've learned how to build a custom search engine Chrome extension that searches multiple sites simultaneously. This multi-search extension demonstrates several important Chrome extension development concepts: popup interfaces, tab management, user interactions, and URL manipulation.

The extension you built today is fully functional and can be used in your daily workflow. It's also a great foundation for adding more advanced features like saved search profiles, custom search engines, and keyboard shortcuts.

Building Chrome extensions is an excellent way to enhance your productivity and share useful tools with others. The multi-search concept can be adapted for many use cases, price comparison, academic research, code documentation, news aggregation, and more. Let your imagination guide you to the next great Chrome extension!

Remember to check out the official Chrome Extension Documentation for the latest updates and best practices. Happy coding!
