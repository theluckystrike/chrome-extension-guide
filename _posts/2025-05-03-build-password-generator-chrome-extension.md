---
layout: post
title: "Build a Password Generator Chrome Extension: Secure Passwords in One Click"
description: "Learn how to build a password generator Chrome extension from scratch. Create secure, random passwords with one click using this comprehensive developer guide."
date: 2025-05-03
categories: [Chrome Extensions, Security]
tags: [password-generator, security, chrome-extension]
keywords: "chrome extension password generator, generate password chrome, build password extension, random password chrome, secure password extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/05/03/build-password-generator-chrome-extension/
---

# Build a Password Generator Chrome Extension: Secure Passwords in One Click

Password security remains one of the most critical concerns in the digital age. With data breaches affecting millions of users annually, having strong, unique passwords for every account is essential. Building a password generator Chrome extension is an excellent project that combines practical utility with fundamental Chrome extension development concepts. This guide will walk you through creating a fully functional password generator extension using Manifest V3, HTML, CSS, and JavaScript.

In this comprehensive tutorial, you will learn how to create an extension that generates secure random passwords, allows customization of password length and character types, copies passwords to the clipboard with one click, and stores user preferences for future use. By the end of this guide, you will have a production-ready extension that you can publish to the Chrome Web Store or use privately.

---

## Why Build a Password Generator Chrome Extension? {#why-build-password-generator}

Before diving into the code, let us explore why building a password generator extension is worthwhile. Password managers have become essential tools in everyone's digital toolkit. According to security research, the average person manages over 100 online accounts, each requiring a unique password. Reusing passwords across multiple sites is extremely dangerous because a single breach can compromise all your accounts.

A dedicated password generator Chrome extension solves this problem by making password creation effortless. Unlike standalone password managers that require subscriptions or complex setup, a simple generator extension works immediately after installation. Users can generate passwords on demand without opening additional applications or navigating away from their current workflow.

From a development perspective, this project teaches valuable skills that apply to many other extension ideas. You will work with the Chrome Storage API for persisting user preferences, the Clipboard API for copying generated passwords, browser action popups for user interaction, and random number generation for creating cryptographically secure passwords. These concepts form the foundation for building more complex extensions like note-taking apps, productivity tools, or integration utilities.

---

## Project Overview and Features {#project-overview}

Our password generator extension will include the following features:

1. **Customizable Password Length**: Users can adjust password length using a slider or input field, ranging from 8 to 64 characters.
2. **Character Type Selection**: Checkboxes to include or exclude uppercase letters, lowercase letters, numbers, and special characters.
3. **Password Generation Algorithm**: Cryptographically secure random password generation using JavaScript's crypto.getRandomValues() method.
4. **One-Click Copy**: A copy button that copies the generated password to the user's clipboard.
5. **Password Strength Indicator**: Visual feedback showing the relative strength of the generated password.
6. **Preference Storage**: Remember user settings using Chrome's storage API so they persist between sessions.

The extension will feature a clean, modern popup interface that appears when clicking the extension icon in the Chrome toolbar. Users will see the generated password immediately upon opening the popup, with options to customize and regenerate as needed.

---

## Setting Up the Project Structure {#project-structure}

Create a new folder for your extension project. Inside this folder, you will need to create several files that work together to create the extension functionality. Let us start by creating the directory structure and the essential files.

The minimal file structure for our password generator extension includes:

```
password-generator/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

For this tutorial, we will focus on the core functionality files. You can create simple placeholder icons or skip them initially since Chrome allows extensions to run without custom icons during development.

---

## Creating the Manifest File {#manifest-file}

The manifest.json file is the configuration file that tells Chrome about your extension. For our password generator, we will use Manifest V3, which is the current standard for Chrome extensions. Create a file named manifest.json in your project folder with the following content:

```json
{
  "manifest_version": 3,
  "name": "Secure Password Generator",
  "version": "1.0.0",
  "description": "Generate secure random passwords with one click. Customize length and character types for maximum security.",
  "permissions": [
    "storage"
  ],
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

This manifest file declares the extension name, version, and description. The "permissions" array includes "storage" which allows us to save user preferences. The "action" section defines the popup that appears when users click the extension icon. Notice that we are using a popup-based approach rather than a full page, which keeps the extension lightweight and fast.

---

## Building the Popup Interface {#popup-interface}

The popup.html file defines the user interface that appears when users click our extension icon. We will create a clean, intuitive interface that displays the generated password and provides controls for customization. Create popup.html with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Generator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Password Generator</h1>
    </header>
    
    <main>
      <div class="password-display">
        <input type="text" id="passwordOutput" readonly placeholder="Click Generate">
        <button id="copyBtn" class="icon-btn" title="Copy to clipboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
      
      <div class="strength-indicator">
        <div class="strength-bar">
          <div id="strengthFill" class="strength-fill"></div>
        </div>
        <span id="strengthText" class="strength-text">Generate a password</span>
      </div>
      
      <div class="controls">
        <div class="control-group">
          <label for="lengthSlider">Password Length: <span id="lengthValue">16</span></label>
          <input type="range" id="lengthSlider" min="8" max="64" value="16">
        </div>
        
        <div class="control-group checkboxes">
          <label>
            <input type="checkbox" id="includeUppercase" checked>
            Uppercase (A-Z)
          </label>
          <label>
            <input type="checkbox" id="includeLowercase" checked>
            Lowercase (a-z)
          </label>
          <label>
            <input type="checkbox" id="includeNumbers" checked>
            Numbers (0-9)
          </label>
          <label>
            <input type="checkbox" id="includeSymbols" checked>
            Symbols (!@#$%)
          </label>
        </div>
        
        <button id="generateBtn" class="primary-btn">Generate Password</button>
      </div>
    </main>
    
    <footer>
      <p>Secure &amp; Local</p>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a clean layout with a password output field, copy button, strength indicator, and various controls. The interface uses semantic HTML and includes accessibility considerations such as proper labels and ARIA-compatible elements.

---

## Styling the Extension {#styling}

The popup.css file styles our extension to look professional and user-friendly. We will use a modern design with a dark theme that is easy on the eyes and provides clear visual feedback. Create popup.css with the following styles:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #1a1a2e;
  color: #eaeaea;
  width: 320px;
  min-height: 400px;
}

.container {
  padding: 20px;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
  color: #00d9ff;
}

.password-display {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

#passwordOutput {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  background-color: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  color: #00ff88;
  outline: none;
}

#passwordOutput:focus {
  border-color: #00d9ff;
}

.icon-btn {
  padding: 12px;
  background-color: #0f3460;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: background-color 0.2s;
}

.icon-btn:hover {
  background-color: #00d9ff;
  color: #1a1a2e;
}

.strength-indicator {
  margin-bottom: 20px;
}

.strength-bar {
  height: 6px;
  background-color: #16213e;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.strength-fill {
  height: 100%;
  width: 0%;
  transition: width 0.3s, background-color 0.3s;
}

.strength-text {
  font-size: 12px;
  color: #888;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 14px;
  color: #ccc;
}

.control-group.checkboxes {
  gap: 10px;
}

.control-group.checkboxes label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.control-group.checkboxes input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #00d9ff;
}

#lengthSlider {
  width: 100%;
  accent-color: #00d9ff;
}

.primary-btn {
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #00d9ff, #00ff88);
  border: none;
  border-radius: 8px;
  color: #1a1a2e;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.3);
}

.primary-btn:active {
  transform: translateY(0);
}

footer {
  margin-top: 20px;
  text-align: center;
}

footer p {
  font-size: 11px;
  color: #666;
}
```

These styles create a dark, modern interface with vibrant accent colors. The gradient button draws attention to the primary action, while the monospace font for the password output makes it easy to read characters clearly.

---

## Implementing the Password Generation Logic {#password-generation}

The popup.js file contains all the JavaScript logic for our extension. This includes generating passwords, calculating strength, copying to clipboard, and managing user preferences. Create popup.js with the following code:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const passwordOutput = document.getElementById('passwordOutput');
  const copyBtn = document.getElementById('copyBtn');
  const generateBtn = document.getElementById('generateBtn');
  const lengthSlider = document.getElementById('lengthSlider');
  const lengthValue = document.getElementById('lengthValue');
  const includeUppercase = document.getElementById('includeUppercase');
  const includeLowercase = document.getElementById('includeLowercase');
  const includeNumbers = document.getElementById('includeNumbers');
  const includeSymbols = document.getElementById('includeSymbols');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');

  // Character Sets
  const charSets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  // Load saved preferences
  loadPreferences();

  // Event Listeners
  generateBtn.addEventListener('click', generatePassword);
  copyBtn.addEventListener('click', copyToClipboard);
  lengthSlider.addEventListener('input', updateLengthDisplay);
  
  // Save preferences when changed
  [lengthSlider, includeUppercase, includeLowercase, includeNumbers, includeSymbols].forEach(el => {
    el.addEventListener('change', savePreferences);
  });

  function updateLengthDisplay() {
    lengthValue.textContent = lengthSlider.value;
  }

  function generatePassword() {
    let charset = '';
    let password = '';
    
    // Build character set based on selections
    if (includeUppercase.checked) charset += charSets.uppercase;
    if (includeLowercase.checked) charset += charSets.lowercase;
    if (includeNumbers.checked) charset += charSets.numbers;
    if (includeSymbols.checked) charset += charSets.symbols;
    
    // Validate that at least one character type is selected
    if (charset.length === 0) {
      alert('Please select at least one character type');
      return;
    }
    
    // Generate password using cryptographically secure random values
    const length = parseInt(lengthSlider.value);
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
    
    passwordOutput.value = password;
    updateStrength(password);
    savePreferences();
  }

  function updateStrength(password) {
    let strength = 0;
    let width = '0%';
    let color = '#ff4444';
    let text = 'Very Weak';
    
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (password.length >= 16) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    switch (strength) {
      case 0:
      case 1:
        width = '20%';
        color = '#ff4444';
        text = 'Very Weak';
        break;
      case 2:
        width = '40%';
        color = '#ff8844';
        text = 'Weak';
        break;
      case 3:
      case 4:
        width = '60%';
        color = '#ffdd44';
        text = 'Medium';
        break;
      case 5:
        width = '80%';
        color = '#88ff44';
        text = 'Strong';
        break;
      case 6:
      case 7:
        width = '100%';
        color = '#00ff88';
        text = 'Very Strong';
        break;
    }
    
    strengthFill.style.width = width;
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
  }

  async function copyToClipboard() {
    const password = passwordOutput.value;
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      setTimeout(() => {
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function savePreferences() {
    const preferences = {
      length: lengthSlider.value,
      includeUppercase: includeUppercase.checked,
      includeLowercase: includeLowercase.checked,
      includeNumbers: includeNumbers.checked,
      includeSymbols: includeSymbols.checked
    };
    
    chrome.storage.local.set({ passwordGeneratorPrefs: preferences });
  }

  function loadPreferences() {
    chrome.storage.local.get('passwordGeneratorPrefs', (result) => {
      const prefs = result.passwordGeneratorPrefs;
      
      if (prefs) {
        lengthSlider.value = prefs.length || 16;
        lengthValue.textContent = lengthSlider.value;
        includeUppercase.checked = prefs.includeUppercase !== false;
        includeLowercase.checked = prefs.includeLowercase !== false;
        includeNumbers.checked = prefs.includeNumbers !== false;
        includeSymbols.checked = prefs.includeSymbols !== false;
      }
      
      // Generate initial password
      generatePassword();
    });
  }
});
```

This JavaScript code implements several key features. The password generation uses `crypto.getRandomValues()` which provides cryptographically secure random numbers, far superior to `Math.random()` for security purposes. The code also calculates password strength based on length and character variety, displays visual feedback through the strength indicator, and uses the Chrome Storage API to persist user preferences between sessions.

---

## Testing Your Extension {#testing}

Now that you have created all the necessary files, it is time to test your extension in Chrome. Follow these steps to load your extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click the "Load unpacked" button that appears
4. Select the folder containing your extension files
5. Your extension should now appear in the extensions list

Click the extension icon in the Chrome toolbar to open the popup. You should see your password generator interface with a randomly generated password already displayed. Test the various controls to ensure they work correctly. Try adjusting the length slider, toggling character types, and clicking the generate button to create new passwords. The copy button should copy the current password to your clipboard.

If you encounter any issues, check the Chrome developer tools for error messages. You can right-click anywhere in the popup and select "Inspect" to open the developer tools console for your extension.

---

## Security Best Practices {#security-best-practices}

When building password-related extensions, security must be your top priority. Our implementation already includes several security best practices that you should maintain in any future enhancements.

First, we use `crypto.getRandomValues()` instead of `Math.random()` for generating passwords. The standard JavaScript random function is not cryptographically secure and should never be used for security-sensitive operations. The Web Crypto API provides the secure alternative we need.

Second, we store preferences locally using Chrome's storage API rather than sending data to external servers. This ensures that user preferences never leave their device, maintaining privacy. Never transmit password-related data from your extension unless the user explicitly requests it and understands the implications.

Third, we generate passwords entirely on the client side. There is no server component that could potentially log or store generated passwords. This "zero-knowledge" approach is essential for any security tool.

---

## Publishing Your Extension {#publishing}

Once you have tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store. The publishing process requires a Google Developer account and a one-time registration fee. After paying the fee, you can upload your extension, provide store listing details, and submit it for review.

For the store listing, write a compelling description that highlights the key features of your extension. Include relevant keywords such as "password generator," "secure passwords," and "Chrome extension" to improve discoverability. Take screenshots or create a promotional video showing the extension in action.

After submission, Google's team will review your extension to ensure it meets their policies. The review process typically takes a few days. Once approved, your extension will be available to all Chrome users worldwide.

---

## Conclusion {#conclusion}

Congratulations! You have successfully built a fully functional password generator Chrome extension. This project demonstrates fundamental concepts that apply to many other extension types, including popup interfaces, user preferences storage, clipboard interactions, and secure random number generation.

The extension you created includes all essential features: customizable password length, character type selection, cryptographically secure generation, one-click copying, password strength indication, and persistent user preferences. These features combine to create a useful tool that helps users improve their online security.

You can extend this project further by adding features such as password history, integration with form filling, export functionality, or even synchronization across devices. The Chrome extension platform provides many APIs that enable powerful capabilities while maintaining user security and privacy.

Remember that this extension, like all security tools, should be used as part of a comprehensive security strategy. Encourage users to use unique passwords for every account, enable two-factor authentication where available, and consider using a dedicated password manager for sensitive credentials.

Now that you have the knowledge and working code, the possibilities for extending and improving your password generator are limitless. Start experimenting with new features, and happy coding!
