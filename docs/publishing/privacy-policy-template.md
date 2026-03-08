---
layout: default
title: "Chrome Extension Privacy Policy Template — Publishing Guide"
description: "Privacy policy template and guidelines for Chrome Web Store compliance."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/publishing/privacy-policy-template/"
---

# Privacy Policy Template for Chrome Extensions

A practical guide with copy-paste privacy policy templates for Chrome extensions. This guide helps you create a compliant privacy policy for the Chrome Web Store.

---

## Why You Need a Privacy Policy

A privacy policy is **required by the Chrome Web Store (CWS)** if your extension handles any user data. This includes:

- Collecting, storing, or transmitting any personal information
- Accessing browsing data through permissions
- Using analytics or tracking
- Storing user preferences or data remotely

Google reviews your privacy policy during the extension review process. A clear, honest privacy policy builds trust with your users and ensures compliance with Chrome Web Store policies.

---

## When Is a Privacy Policy Required?

| Extension Type | Privacy Policy Required? |
|----------------|-------------------------|
| Storage only (local) | Recommended (not required, but good practice) |
| `tabs` permission | **Yes** |
| `activeTab` permission | **Yes** |
| `cookies` permission | **Yes** |
| `webRequest` permission | **Yes** |
| Host permissions (all URLs) | **Yes** |
| No special permissions | Not required, but recommended |
| No data collection at all | Not required |

> **Note**: Even if not strictly required, having a privacy policy is always recommended for transparency.

---

## Template: Minimal Extension (No Data Collection)

Use this template if your extension only uses local storage and doesn't collect or transmit any user data.

```markdown
# Privacy Policy

## Overview
[Your Extension Name] is a Chrome extension that operates entirely locally on your device. This privacy policy explains how we handle your data.

## Data Collection
We do not collect, store, or transmit any personal information or browsing data. All data processed by this extension remains on your local device.

## Local Storage
This extension uses chrome.storage.local to save your preferences locally. This data is never transmitted to any external servers.

## Permissions Used
This extension may request the following permissions:
- **Storage**: To save your preferences locally
- **[Other permissions]**: [Brief description of why needed]

## Contact
If you have questions about this privacy policy, please contact us at [email address].

---
*Disclaimer: This privacy policy is provided for informational purposes only and does not constitute legal advice.*
```

### Copy-Paste Version

```markdown
# Privacy Policy

## Overview
My Extension is a Chrome extension that operates entirely locally on your device. This privacy policy explains how we handle your data.

## Data Collection
We do not collect, store, or transmit any personal information or browsing data. All data processed by this extension remains on your local device.

## Local Storage
This extension uses chrome.storage.local to save your preferences locally. This data is never transmitted to any external servers.

## Permissions Used
This extension uses the following Chrome permissions:
- **storage**: Saves your preferences locally on your device

## Contact
If you have questions about this privacy policy, please contact us at your-email@example.com.

---
*Disclaimer: This privacy policy is provided for informational purposes only and does not constitute legal advice.*
```

---

## Template: Extension with Permissions

Use this template if your extension uses permissions like `tabs`, `activeTab`, `cookies`, or host permissions.

```markdown
# Privacy Policy

## Overview
[Your Extension Name] is a Chrome extension designed to [brief description of what your extension does]. This privacy policy explains our data practices.

## Data We Collect
[Describe what data your extension accesses or processes]

## How We Use Data
[Explain how the data is used - e.g., to provide features, improve the extension, etc.]

## Data Storage
- **Local Storage**: [Describe what data is stored locally]
- **No External Servers**: [Specify if data is NOT sent to any servers]

## Permissions Explanation

This extension requires the following Chrome permissions:

### 1. tabs
This permission allows the extension to access information about open tabs in your browser, including URLs and titles. Used for: [your use case].

### 2. activeTab
This permission grants temporary access to the current active tab when you click the extension icon. This is used to: [your use case].

### 3. cookies
This permission allows the extension to read or modify cookies for specific domains. Used for: [your use case].

### 4. Host Permissions ([*.]example.com)
This permission allows the extension to access content on specific websites. Used for: [your use case].

### 5. webRequest
This permission allows the extension to intercept or modify network requests. Used for: [your use case].

## Third-Party Services
[List any third-party services you use - analytics, APIs, etc.]

## Contact
If you have questions about this privacy policy, please contact us at [email address].

---
*Disclaimer: This privacy policy is provided for informational purposes only and does not constitute legal advice.*
```

### Copy-Paste Version (with activeTab and tabs)

```markdown
# Privacy Policy

## Overview
My Extension is a Chrome extension that helps you [describe your extension's purpose]. This privacy policy explains our data practices.

## Data We Collect
This extension accesses the following data to provide its features:
- Current webpage URL and title (when you click the extension)
- Information about open browser tabs

## How We Use Data
The data accessed is used solely to provide the extension's functionality. We do not store, share, or transmit any data to external servers.

## Data Storage
All user preferences are stored locally using chrome.storage.local. This data remains on your device and is never sent to any external servers.

## Permissions Explanation

This extension requires the following Chrome permissions:

### activeTab
This permission grants temporary access to the current active tab when you interact with the extension. This allows the extension to [your specific use case]. Access is only granted when you explicitly click the extension icon or use a keyboard shortcut.

### tabs
This permission allows the extension to access information about all open tabs, including URLs and titles. This is used for [your specific use case].

### storage
This permission allows the extension to save your preferences locally on your device.

## Third-Party Services
We do not use any third-party analytics or tracking services.

## Contact
If you have questions about this privacy policy, please contact us at your-email@example.com.

---
*Disclaimer: This privacy policy is provided for informational purposes only and does not constitute legal advice.*
```

---

## Using @theluckystrike/webext-permissions for Transparency

The `@theluckystrike/webext-permissions` library helps you programmatically check and display what permissions your extension has been granted. This is excellent for transparency in your privacy policy or a dedicated permissions page.

### Installation

```bash
npm install @theluckystrike/webext-permissions
```

### Usage Example

```ts
import { getGrantedPermissions, describePermission } from "@theluckystrike/webext-permissions";

// Get all granted permissions
async function showPermissions() {
  const permissions = await getGrantedPermissions();
  
  console.log("Granted permissions:", permissions);
  // Output: { origins: ['https://example.com/*'], permissions: ['storage', 'tabs'] }
  
  // Get human-readable descriptions
  for (const perm of permissions.permissions || []) {
    console.log(describePermission(perm));
  }
}

// Build a transparency page showing what your extension can access
async function buildTransparencyPage(): Promise<string> {
  const granted = await getGrantedPermissions();
  
  let html = '<h2>Permissions Used by This Extension</h2><ul>';
  
  if (granted.origins?.length) {
    html += '<li><strong>Website Access:</strong> ';
    html += granted.origins.join(', ') + '</li>';
  }
  
  if (granted.permissions?.length) {
    for (const perm of granted.permissions) {
      html += `<li><strong>${perm}:</strong> ${describePermission(perm)}</li>`;
    }
  }
  
  html += '</ul>';
  return html;
}
```

### In Your Privacy Policy

You can reference this library in your privacy policy:

> This extension uses `@theluckystrike/webext-permissions` to provide transparency about what data it can access. Users can see exactly which permissions have been granted by visiting the extension's options page.

---

## Using @theluckystrike/webext-storage for Local-Only Data

The `@theluckystrike/webext-storage` library provides type-safe local storage for Chrome extensions. All data is stored locally and never transmitted.

### Installation

```bash
npm install @theluckystrike/webext-storage
```

### Usage Example

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define your storage schema
const StorageSchema = defineSchema({
  userPreferences: {
    theme: 'light' as 'light' | 'dark',
    notifications: true,
  },
  cachedData: {
    lastUpdated: 0,
    items: [] as string[],
  },
});

// Create typed storage - all data stays local
const storage = createStorage(StorageSchema);

// Save preferences - always local
await storage.userPreferences.set({ theme: 'dark', notifications: false });

// Read preferences
const prefs = await storage.userPreferences.get();
console.log(prefs.theme); // 'dark'
```

### In Your Privacy Policy

Reference this library to document local-only storage:

> This extension uses `@theluckystrike/webext-storage` for local data storage. All user data is stored exclusively on the user's device using chrome.storage.local. No data is ever transmitted to external servers. The library ensures type-safety and provides clear documentation that all storage operations are local-only.

---

## Template: Extension with Analytics

Use this template if your extension uses analytics or collects any user data.

```markdown
# Privacy Policy

## Overview
[Your Extension Name] is a Chrome extension that [description]. This privacy policy explains what data we collect and how we use it.

## Data We Collect

### Usage Data
We collect anonymized usage data to help improve our extension:
- Feature usage statistics
- Error reports
- Performance metrics

### Personal Information
We do not collect personally identifiable information unless you voluntarily provide it (e.g., when contacting us).

## How We Use Data
The data we collect is used to:
- Improve our extension's functionality
- Fix bugs and issues
- Understand how users interact with our extension

## Data Storage
- **Local Storage**: User preferences are stored locally on your device
- **Analytics Data**: Anonymized usage data is stored [describe where - your own servers, third-party analytics, etc.]

## Analytics Implementation

This extension uses [analytics provider] to collect anonymized usage data. The collected data:
- Is anonymized and cannot identify individual users
- Does not include personally identifiable information
- Is used solely for improving the extension

### What We Track
- Which features are used most frequently
- Error occurrences and crash reports
- General usage patterns

### What We Don't Track
- URLs you visit
- Personal information
- Form data or passwords
- Browser history

## Permissions Explanation

### [List your permissions as shown in previous template]

## Contact
If you have questions about this privacy policy or want to opt out of analytics, please contact us at [email address].

---
*Disclaimer: This privacy policy is provided for informational purposes only and does not constitute legal advice.*
```

### Copy-Paste Version with Analytics

```markdown
# Privacy Policy

## Overview
My Extension is a Chrome extension that helps you [describe your extension]. This privacy policy explains what data we collect and how we use it.

## Data We Collect

### Usage Data
We collect anonymized usage data to help improve our extension:
- Feature usage statistics
- Error reports and crash data
- Performance metrics

### Personal Information
We do not collect personally identifiable information unless you voluntarily provide it when contacting us.

## How We Use Data
The data we collect is used solely to:
- Improve our extension's functionality and user experience
- Fix bugs and technical issues
- Understand how users interact with our extension

## Data Storage

### Local Storage
User preferences are stored locally on your device using chrome.storage.local. This data never leaves your device.

### Analytics Data
Anonymized usage data is collected using [Google Analytics / Plausible / other]. This data:
- Is anonymized before collection
- Cannot identify individual users
- Does not include URLs, passwords, or personal data

## What We DON'T Collect
- URLs of websites you visit
- Personal information (name, email, etc.)
- Form data or passwords
- Your browsing history

## Permissions Explanation

### activeTab
Grants temporary access to the current tab when you click the extension. Used to [your use case].

### storage
Saves your preferences locally on your device.

### [Other permissions]
[Description]

## Third-Party Services
- **Analytics**: [Provider name] for anonymized usage tracking
- **No other third-party services** are used

## Contact
If you have questions about this privacy policy, please contact us at your-email@example.com.

---
*Disclaimer: This privacy policy is provided for informational purposes only and does not constitute legal advice.*
```

---

## Where to Host Your Privacy Policy

You have several options for hosting your privacy policy where it can be publicly accessed:

### 1. GitHub Pages (Recommended)
Host your privacy policy as a static page:
- Create a `docs` folder in your repository
- Add your privacy policy as `docs/privacy-policy.html` or `.md`
- Enable GitHub Pages in repository settings
- URL: `https://yourusername.github.io/your-repo/privacy-policy.html`

### 2. GitHub Gist
Create a secret or public Gist:
- Create a new Gist with your privacy policy
- Copy the raw URL
- Use the Gist URL in your Chrome Web Store listing
- Example: `https://gist.github.com/yourusername/gist-id`

### 3. Your Own Website
If you already have a website:
- Add a dedicated `/privacy-policy` page
- Link to it from your extension's Chrome Web Store listing

### 4. Notion (Public Page)
- Create a Notion page with your privacy policy
- Publish it as a public page
- Use the public URL

### 5. Inline in Extension (Not Recommended for CWS)
While you can include the policy in your extension, the Chrome Web Store requires a **publicly accessible URL** that reviewers can verify.

---

## Privacy Policy Checklist

Use this checklist before submitting to the Chrome Web Store:

### Required Elements
- [ ] Publicly accessible URL (not just in the extension)
- [ ] Clear explanation of what data your extension accesses
- [ ] Description of how data is used
- [ ] Contact information for questions

### Permissions Documentation
- [ ] List all permissions your extension uses
- [ ] Explain why each permission is needed
- [ ] Be specific about what data each permission accesses

### Data Collection
- [ ] State whether you collect any user data
- [ ] If analytics are used, explain what is collected and how
- [ ] Mention if data is stored locally or transmitted

### Transparency
- [ ] Include a clear statement about local-only storage if applicable
- [ ] Reference libraries used (like `@theluckystrike/webext-storage`)
- [ ] Provide a way for users to contact you

### Legal
- [ ] Include a disclaimer (not legal advice)
- [ ] Date the policy
- [ ] Update the policy when your extension changes

---

## Summary

A good privacy policy for your Chrome extension should:

1. **Be honest** about what data you access and why
2. **Be specific** about permissions and their purposes
3. **Be accessible** at a public URL the Chrome Web Store can verify
4. **Be transparent** about local vs. remote data storage
5. **Include a disclaimer** that you're not providing legal advice

Using libraries like `@theluckystrike/webext-permissions` and `@theluckystrike/webext-storage` helps demonstrate your commitment to transparency and local-first data handling.

---

*Last updated: [Date]*

*Disclaimer: This privacy policy template is provided for informational purposes only and does not constitute legal advice. Consult with a legal professional for advice specific to your extension and jurisdiction.*
