---
layout: post
title: "Build a DNS Lookup Chrome Extension: Complete Developer Guide"
description: "Learn how to build a DNS lookup Chrome extension from scratch. This comprehensive guide covers domain info chrome tools, whois extension development, and practical implementation using JavaScript and Chrome APIs."
date: 2025-01-26
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, developer-tools]
keywords: "dns lookup extension, domain info chrome, whois extension, chrome extension development, DNS checker chrome"
canonical_url: "https://bestchromeextensions.com/2025/01/26/build-dns-lookup-chrome-extension/"
---

# Build a DNS Lookup Chrome Extension: Complete Developer Guide

In the world of web development and network administration, having quick access to DNS information is essential. Whether you are troubleshooting website issues, verifying domain configuration, or investigating potential security threats, a dns lookup extension can save valuable time. This comprehensive guide will walk you through building a fully functional DNS lookup Chrome extension from scratch, covering everything from project setup to advanced features like whois lookups and domain info retrieval.

Chrome extensions have become indispensable tools for developers, and the demand for network-related utilities continues to grow. By the end of this tutorial, you will have created a professional-grade domain info chrome extension that performs DNS lookups, displays domain records, and provides whois information—all from the convenience of your browser toolbar.

---

## Understanding DNS and Chrome Extension Architecture {#understanding-dns}

Before diving into the code, it is important to understand the fundamental concepts that will power your extension. DNS, or Domain Name System, serves as the internet's phone book, translating human-readable domain names into IP addresses that computers use to identify each other. When you type "example.com" into your browser, DNS servers work behind the scenes to resolve that domain name to an IP address like "93.184.216.34".

A dns lookup extension must interact with DNS servers to retrieve various types of records. The most common record types include A records (IPv4 addresses), AAAA records (IPv6 addresses), MX records (mail servers), TXT records (text information), CNAME records (canonical names), and NS records (name servers). Each record type serves a different purpose, and understanding these differences is crucial for building a useful domain info chrome tool.

Chrome extensions operate within a sandboxed environment with specific permissions and limitations. Your extension will need to communicate with external DNS servers, which presents certain challenges due to browser security restrictions. We will overcome these challenges by leveraging web APIs and service workers to perform the actual DNS queries.

The architecture of a Chrome extension typically includes a manifest file defining permissions and capabilities, a popup interface for user interaction, background scripts for long-running tasks, and content scripts for page interaction. For our DNS lookup extension, we will focus on the popup and background script architecture, as we need to perform network requests that content scripts cannot handle directly.

---

## Setting Up Your Project Structure {#project-setup}

Every Chrome extension begins with a well-organized project structure. Create a new folder for your extension and set up the following files: manifest.json, popup.html, popup.js, popup.css, and background.js. This organization keeps your code maintainable and makes it easier to add features later.

The manifest.json file serves as the blueprint for your extension. For Manifest V3, which is the current standard, your manifest will define the extension name, version, description, and permissions. You will need the "activeTab" permission for accessing current page information and "scripting" for executing code on pages. Additionally, you will need host permissions for making network requests to DNS lookup APIs.

Your popup.html file defines the user interface that appears when users click your extension icon. Design a clean, intuitive interface with an input field for entering domain names, buttons for triggering different types of lookups, and display areas for showing results. The interface should be responsive and work well on different screen sizes.

The popup.css file handles styling to make your extension visually appealing. Use modern CSS techniques like flexbox and grid for layout, and choose a color scheme that matches Chrome's aesthetic. Consider adding dark mode support for users who prefer darker interfaces.

The background.js file runs in the background and handles communication between your popup and external services. This is where we will make API calls to DNS lookup services, process the responses, and send them back to the popup for display.

---

## Implementing the Manifest Configuration {#manifest-configuration}

The manifest.json file is the heart of your Chrome extension. Let us create a comprehensive manifest that supports all the features we need for our dns lookup extension:

```json
{
  "manifest_version": 3,
  "name": "DNS Lookup Tool",
  "version": "1.0",
  "description": "Perform DNS lookups and retrieve domain information directly from your browser",
  "permissions": [
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://dns.google/resolve/*",
    "https://whois.freeaiapi.xyz/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

This manifest declares the necessary permissions for our domain info chrome tool. The host_permissions section is crucial because it allows our extension to make network requests to DNS and whois APIs. Without these permissions, browser security would block our external requests.

For the extension icon, you will need to create simple icon files in the icons folder. These icons appear in the Chrome toolbar and in the extension management page. While you can use placeholder images initially, investing in a well-designed icon helps your extension look professional.

---

## Creating the Popup Interface {#popup-interface}

The popup.html file defines what users see when they click your extension icon. Create an intuitive interface that guides users through the lookup process:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DNS Lookup Tool</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>DNS Lookup Tool</h1>
      <p class="subtitle">Domain Information Chrome Extension</p>
    </header>
    
    <div class="search-section">
      <input type="text" id="domain-input" placeholder="Enter domain name (e.g., example.com)">
      <button id="lookup-btn">Lookup DNS</button>
    </div>
    
    <div class="lookup-options">
      <label><input type="checkbox" id="check-a" checked> A Record</label>
      <label><input type="checkbox" id="check-mx"> MX Record</label>
      <label><input type="checkbox" id="check-txt"> TXT Record</label>
      <label><input type="checkbox" id="check-ns"> NS Record</label>
      <label><input type="checkbox" id="check-whois" checked> Whois Info</label>
    </div>
    
    <div id="results" class="results-section">
      <div class="loading" id="loading" style="display: none;">
        <div class="spinner"></div>
        <p>Looking up DNS records...</p>
      </div>
      
      <div id="dns-results" class="result-group" style="display: none;">
        <h2>DNS Records</h2>
        <div id="records-content"></div>
      </div>
      
      <div id="whois-results" class="result-group" style="display: none;">
        <h2>Whois Information</h2>
        <div id="whois-content"></div>
      </div>
      
      <div id="error-message" class="error" style="display: none;"></div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a clean, organized interface with sections for input, lookup options, and results display. The loading indicator keeps users informed during the lookup process, which is important because DNS queries can take several seconds to complete.

---

## Styling Your Extension {#popup-styling}

The popup.css file transforms your plain HTML into an attractive, professional-looking interface. Use these styles to create a polished user experience:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 400px;
  min-height: 500px;
  background: #f8f9fa;
  color: #333;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 20px;
  color: #1a73e8;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

.search-section {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

#domain-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

#domain-input:focus {
  border-color: #1a73e8;
}

#lookup-btn {
  padding: 10px 20px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

#lookup-btn:hover {
  background: #1557b0;
}

#lookup-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.lookup-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.lookup-options label {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.results-section {
  background: white;
  border-radius: 6px;
  padding: 15px;
  min-height: 200px;
}

.result-group {
  margin-bottom: 20px;
}

.result-group h2 {
  font-size: 14px;
  color: #1a73e8;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.record-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.record-type {
  font-weight: 600;
  color: #666;
  margin-right: 8px;
}

.record-value {
  font-family: monospace;
  color: #333;
  word-break: break-all;
}

.loading {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #d93025;
  padding: 10px;
  background: #fce8e6;
  border-radius: 4px;
  font-size: 13px;
}
```

These styles create a modern, clean interface that matches Chrome's design language. The use of proper spacing, clear typography, and visual feedback (like button hover states) ensures a professional user experience for your domain info chrome extension.

---

## Implementing the Background Script {#background-script}

The background.js file handles the actual DNS lookups by communicating with external APIs. This separation of concerns keeps your extension responsive and handles network operations efficiently:

```javascript
// Background script for DNS Lookup Chrome Extension

// Google DNS-over-HTTPS API endpoint
const DNS_API_BASE = 'https://dns.google/resolve';

// Whois API endpoint
const WHOIS_API_BASE = 'https://whois.freeaiapi.xyz/api';

async function fetchDNSRecord(domain, recordType) {
  try {
    const url = `${DNS_API_BASE}?name=${encodeURIComponent(domain)}&type=${recordType}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('DNS lookup error:', error);
    return { Status: 2, Answer: [] }; // 2 = Server Error
  }
}

async function fetchWhois(domain) {
  try {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const url = `${WHOIS_API_BASE}?domain=${encodeURIComponent(cleanDomain)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Whois lookup error:', error);
    return { error: error.message };
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'lookupDNS') {
    const { domain, options } = message.data;
    
    Promise.all([
      options.checkA ? fetchDNSRecord(domain, 'A') : Promise.resolve(null),
      options.checkMX ? fetchDNSRecord(domain, 'MX') : Promise.resolve(null),
      options.checkTXT ? fetchDNSRecord(domain, 'TXT') : Promise.resolve(null),
      options.checkNS ? fetchDNSRecord(domain, 'NS') : Promise.resolve(null),
      options.checkWhois ? fetchWhois(domain) : Promise.resolve(null)
    ]).then(results => {
      sendResponse({
        success: true,
        data: {
          a: results[0],
          mx: results[1],
          txt: results[2],
          ns: results[3],
          whois: results[4]
        }
      });
    });
    
    return true; // Keep message channel open for async response
  }
});
```

This background script provides the core functionality for your dns lookup extension. It uses Google DNS-over-HTTPS API for standard DNS queries and a whois API for domain information. The Promise.all approach allows multiple lookups to run concurrently, improving performance.

---

## Building the Popup Logic {#popup-logic}

The popup.js file connects your interface to the background script, handling user interactions and displaying results:

```javascript
// Popup script for DNS Lookup Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  const domainInput = document.getElementById('domain-input');
  const lookupBtn = document.getElementById('lookup-btn');
  const loading = document.getElementById('loading');
  const dnsResults = document.getElementById('dns-results');
  const whoisResults = document.getElementById('whois-results');
  const errorMessage = document.getElementById('error-message');
  
  // Get active tab URL to pre-fill domain
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        domainInput.value = url.hostname;
      } catch (e) {
        // Invalid URL, leave input empty
      }
    }
  });
  
  // Handle lookup button click
  lookupBtn.addEventListener('click', performLookup);
  
  // Allow Enter key to trigger lookup
  domainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performLookup();
    }
  });
  
  async function performLookup() {
    const domain = domainInput.value.trim();
    
    if (!domain) {
      showError('Please enter a domain name');
      return;
    }
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      showError('Please enter a valid domain name');
      return;
    }
    
    // Get selected options
    const options = {
      checkA: document.getElementById('check-a').checked,
      checkMX: document.getElementById('check-mx').checked,
      checkTXT: document.getElementById('check-txt').checked,
      checkNS: document.getElementById('check-ns').checked,
      checkWhois: document.getElementById('check-whois').checked
    };
    
    // Show loading state
    showLoading();
    
    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'lookupDNS',
        data: { domain, options }
      });
      
      if (response.success) {
        displayResults(response.data);
      } else {
        showError('Failed to perform DNS lookup');
      }
    } catch (error) {
      showError('Error: ' + error.message);
    }
  }
  
  function showLoading() {
    loading.style.display = 'block';
    dnsResults.style.display = 'none';
    whoisResults.style.display = 'none';
    errorMessage.style.display = 'none';
    lookupBtn.disabled = true;
  }
  
  function showError(message) {
    loading.style.display = 'none';
    dnsResults.style.display = 'none';
    whoisResults.style.display = 'none';
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    lookupBtn.disabled = false;
  }
  
  function displayResults(data) {
    loading.style.display = 'none';
    lookupBtn.disabled = false;
    errorMessage.style.display = 'none';
    
    // Display DNS records
    const recordsContent = document.getElementById('records-content');
    recordsContent.innerHTML = '';
    let hasRecords = false;
    
    if (data.a && data.a.Answer) {
      hasRecords = true;
      data.a.Answer.forEach(record => {
        recordsContent.appendChild(createRecordItem('A', record.data));
      });
    }
    
    if (data.mx && data.mx.Answer) {
      hasRecords = true;
      data.mx.Answer.forEach(record => {
        recordsContent.appendChild(createRecordItem('MX', record.data));
      });
    }
    
    if (data.txt && data.txt.Answer) {
      hasRecords = true;
      data.txt.Answer.forEach(record => {
        recordsContent.appendChild(createRecordItem('TXT', record.data));
      });
    }
    
    if (data.ns && data.ns.Answer) {
      hasRecords = true;
      data.ns.Answer.forEach(record => {
        recordsContent.appendChild(createRecordItem('NS', record.data));
      });
    }
    
    dnsResults.style.display = hasRecords ? 'block' : 'none';
    
    // Display Whois information
    const whoisContent = document.getElementById('whois-content');
    whoisContent.innerHTML = '';
    
    if (data.whois && !data.whois.error) {
      const whoisInfo = data.whois;
      
      if (whoIsInfo.domain) {
        whoisContent.appendChild(createWhoisItem('Domain Name', whoIsInfo.domain));
      }
      if (whoIsInfo.registrar) {
        whoisContent.appendChild(createWhoisItem('Registrar', whoIsInfo.registrar));
      }
      if (whoIsInfo.createdDate) {
        whoisContent.appendChild(createWhoisItem('Created Date', whoIsInfo.createdDate));
      }
      if (whoIsInfo.expirationDate) {
        whoisContent.appendChild(createWhoisItem('Expiration Date', whoIsInfo.expirationDate));
      }
      if (whoIsInfo.nameServers) {
        whoisContent.appendChild(createWhoisItem('Name Servers', whoIsInfo.nameServers.join(', ')));
      }
      
      whoisResults.style.display = 'block';
    } else {
      whoisResults.style.display = 'none';
    }
  }
  
  function createRecordItem(type, value) {
    const div = document.createElement('div');
    div.className = 'record-item';
    div.innerHTML = `<span class="record-type">${type}:</span><span class="record-value">${value}</span>`;
    return div;
  }
  
  function createWhoisItem(label, value) {
    const div = document.createElement('div');
    div.className = 'record-item';
    div.innerHTML = `<span class="record-type">${label}:</span><span class="record-value">${value}</span>`;
    return div;
  }
});
```

This popup script handles user input validation, communicates with the background service worker, and displays results in a readable format. It also pre-fills the domain input with the current tab's hostname, making it convenient for users to look up the site they are currently viewing—a key feature of any useful domain info chrome tool.

---

## Testing Your Extension {#testing-extension}

Before publishing your dns lookup extension, thorough testing ensures everything works correctly. Load your extension in Chrome by navigating to chrome://extensions, enabling Developer mode, and clicking "Load unpacked". Select your extension folder to load it.

Test the extension with various domain names to verify it handles different scenarios correctly. Try common domains like google.com, smaller domains, and domains with unusual TLDs. Check that all record types work as expected and that the whois functionality returns accurate information.

Pay attention to error handling. Enter invalid domains, test with no internet connection, and verify that appropriate error messages appear. Users should never see confusing technical errors—always provide helpful, human-readable messages.

Performance is also important. DNS lookups should complete within a few seconds, and the UI should remain responsive throughout. If lookups take too long, consider adding timeout handling or showing progress indicators for each individual record type.

---

## Publishing Your Extension {#publishing-extension}

Once you have thoroughly tested your dns lookup extension, you can publish it to the Chrome Web Store. Create a developer account if you do not already have one, prepare your store listing with screenshots and descriptions, and submit your extension for review.

Your extension description should highlight key features like fast DNS lookups, comprehensive record types, whois information, and the convenience of having domain info chrome tools directly in your browser. Use the keywords "dns lookup extension", "domain info chrome", and "whois extension" naturally throughout your description to improve search visibility.

Consider adding screenshots that demonstrate the extension in action. Show the clean interface, example lookup results, and how easy it is to use. Good screenshots significantly increase conversion rates and help users understand the value of your extension.

---

## Conclusion {#conclusion}

Congratulations! You have now built a complete, professional-grade DNS lookup Chrome extension. This domain info chrome tool demonstrates how to create useful utilities that integrate seamlessly with the browser, providing real value to developers, network administrators, and everyday users.

The skills you have learned in this tutorial—manifest configuration, popup interface design, background script communication, and API integration—apply to countless other extension ideas. Whether you want to build a whois extension, a network diagnostic tool, or something completely different, you now have the foundation to bring your ideas to life.

Remember that the best Chrome extensions solve real problems elegantly. Your dns lookup extension fills a genuine need for quick domain information access, and with continued improvement based on user feedback, it can become an essential tool in many developers' toolboxes.
