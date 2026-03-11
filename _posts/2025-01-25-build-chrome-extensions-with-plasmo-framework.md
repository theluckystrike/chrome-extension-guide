---
layout: post
title: "Build Chrome Extensions with Plasmo Framework: Complete 2025 Guide"
description: "Learn how to build Chrome extensions efficiently using Plasmo Framework. Discover why Plasmo is the best extension framework 2025 with hot reloading, TypeScript support, and effortless Manifest V3 deployment."
date: 2025-01-25
categories: [Chrome-Extensions, Framework]
tags: [chrome-extension, framework, tooling]
keywords: "plasmo chrome extension, plasmo framework, extension framework 2025, chrome extension development framework, build chrome extension with plasmo"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/build-chrome-extensions-with-plasmo-framework/"
---

# Build Chrome Extensions with Plasmo Framework: Complete 2025 Guide

If you have ever built a Chrome extension from scratch, you know the pain: setting up webpack configurations, managing multiple build processes for different extension contexts, handling hot reloading during development, and navigating the ever-changing requirements of Manifest V3. What if there was a better way? Enter **Plasmo Framework** — the modern, opinionated framework designed specifically for building browser extensions that will dramatically accelerate your development workflow in 2025.

This comprehensive guide will walk you through everything you need to know about using Plasmo Framework to build production-ready Chrome extensions. Whether you are a seasoned extension developer looking to modernize your workflow or a newcomer eager to build your first extension, this guide will equip you with the knowledge and practical skills to leverage Plasmo effectively.

---

## What is Plasmo Framework? {#what-is-plasmo}

**Plasmo** is a purpose-built framework for creating browser extensions across multiple browsers, including Chrome, Firefox, Safari, and Edge. Created by the team at [Plasmatic](https://plasmframework.com/), this framework takes the complexity out of extension development by providing a batteries-included approach that handles the build system, hot module replacement, and cross-browser compatibility out of the box.

What makes Plasmo stand out from traditional extension development approaches is its developer experience philosophy. It borrows heavily from modern web development best practices — think Next.js for React or Nuxt for Vue — but adapts them specifically for the unique requirements of browser extensions.

The framework has gained significant traction in the extension development community, with thousands of extensions built using Plasmo and a vibrant ecosystem of plugins and extensions. In 2025, it has become the go-to choice for developers who want to focus on building their extension's functionality rather than wrestling with build configurations.

### Why Choose Plasmo for Chrome Extension Development?

The Chrome extension development landscape has evolved dramatically, and with Manifest V3 came new requirements and best practices that can be challenging to implement correctly. Here is why Plasmo Framework has become the preferred choice for developers in 2025:

**1. Zero-Config Setup**: Unlike traditional approaches where you spend hours configuring webpack, Babel, and various plugins, Plasmo provides a sensible default configuration that just works. You can create a new extension project and start writing code within minutes.

**2. Hot Module Replacement**: Development speed is critical, and Plasmo's built-in hot reloading means changes to your popup, background scripts, content scripts, or options page are reflected instantly without losing extension state.

**3. First-Class TypeScript Support**: TypeScript has become the standard for robust JavaScript development, and Plasmo provides first-class TypeScript support with automatic type generation for extension APIs.

**4. Multi-Context Bundling**: Extensions run in multiple contexts — popup, background service worker, content scripts, and options page. Plasmo handles the complexity of bundling each context appropriately, ensuring your code works seamlessly across all of them.

**5. Built-in Manifest V3 Support**: With Google fully committed to Manifest V3, Plasmo ensures your extensions are compliant by default, handling the nuances of service workers, declarative Net Request, and other Manifest V3 requirements.

---

## Getting Started with Plasmo Framework {#getting-started}

Setting up a new Chrome extension project with Plasmo is remarkably straightforward. The framework provides a CLI that handles project creation, development server management, and building for production. Let us walk through the complete setup process.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 18 or higher)
- **npm** or **pnpm** (pnpm is recommended for faster installs)
- A modern code editor like **VS Code** with appropriate extensions

### Creating Your First Plasmo Project

Open your terminal and run the following command to create a new Plasmo project:

```bash
npm create plasmo@latest my-plasmo-extension
```

The CLI will prompt you with several configuration options. For this guide, we will select the basic template to get started quickly:

```
? Select a template to use › 
  - starter (Default)
  - with-options
  - with-popup
  - with-background
  - with-content-script
```

Select **starter** (or press Enter for defaults), and choose **TypeScript** when asked about TypeScript preference. The CLI will generate a complete project structure and install dependencies.

### Project Structure Overview

After creation, your project will have the following structure:

```
my-plasmo-extension/
├── assets/
│   └── icon.png
├── node_modules/
├── src/
│   ├── background.ts
│   ├── content.ts
│   ├── options.tsx
│   └── popup.tsx
├── manifest.json
├── package.json
└── tsconfig.json
```

Let us examine each key file to understand how Plasmo structures extension projects:

**manifest.json**: This is your extension's manifest file. In a Plasmo project, you can define your manifest declaratively, and the framework handles the conversion to the correct format for different browsers.

**src/background.ts**: This is your background service worker (for Manifest V3) or background script (for Manifest V2). It handles events that occur in the background of the browser, such as browser alarms, messages, and extension lifecycle events.

**src/content.ts**: Content scripts are JavaScript files that run in the context of web pages. Plasmo provides a clean API for injecting and managing content scripts.

**src/popup.tsx**: The popup is the small window that appears when users click your extension icon in the browser toolbar. Plasmo supports both React and vanilla JavaScript for popup development.

**src/options.tsx**: The options page allows users to configure your extension's settings. Plasmo makes it easy to create a full-featured options page with React.

### Running Your Extension

One of Plasmo's most powerful features is its development server with hot module replacement. To start developing, run:

```bash
cd my-plasmo-extension
npm run dev
```

This command starts a development server and provides you with instructions to load your extension in Chrome. Typically, you navigate to `chrome://extensions`, enable Developer Mode, and click "Load Unpacked" to select your project's `build/chrome-mv3-dev` folder.

As you make changes to your code, Plasmo will automatically rebuild and reload your extension, preserving the extension state so you can test features iteratively.

---

## Building a Complete Chrome Extension with Plasmo {#building-complete-extension}

Now that you understand the basics, let us build a practical Chrome extension using Plasmo. We will create a "Tab Manager" extension that allows users to organize, search, and manage their open tabs efficiently. This example will demonstrate multiple Plasmo features including content scripts, background workers, storage, and React integration.

### Step 1: Defining the Manifest

In Plasmo, you define your extension's capabilities in a declarative way. Create or update your `manifest.json` (or use the declarative API in newer versions):

```json
{
  "name": "Tab Manager Pro",
  "description": "Organize and manage your Chrome tabs efficiently",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### Step 2: Creating the Background Worker

The background worker handles the core logic for managing tabs. Create or update `src/background.ts`:

```typescript
import { PlasmoMessaging } from "@plasmohq/messaging"

export interface TabInfo {
  id: number
  title: string
  url: string
  favIconUrl: string
  windowId: number
  groupId?: number
}

// Get all tabs across all windows
const getAllTabs = async (): Promise<TabInfo[]> => {
  const tabs = await chrome.tabs.query({})
  return tabs.map(tab => ({
    id: tab.id,
    title: tab.title || "Untitled",
    url: tab.url || "",
    favIconUrl: tab.favIconUrl || "",
    windowId: tab.windowId,
    groupId: tab.groupId
  }))
}

// Close a specific tab
const closeTab = async (tabId: number): Promise<void> => {
  await chrome.tabs.remove(tabId)
}

// Create a new tab group from selected tabs
const groupTabs = async (tabIds: number[]): Promise<number> => {
  return await chrome.tabs.group({ tabIds })
}

export type RequestBody = {
  action: "getTabs" | "closeTab" | "groupTabs"
  tabId?: number
  tabIds?: number[]
}

export type ResponseBody = {
  tabs?: TabInfo[]
  success?: boolean
  groupId?: number
}

export default {
  async sendMessage(request: RequestBody): Promise<ResponseBody> {
    switch (request.action) {
      case "getTabs":
        const tabs = await getAllTabs()
        return { tabs }
      
      case "closeTab":
        if (request.tabId) {
          await closeTab(request.tabId)
          return { success: true }
        }
        return { success: false }
      
      case "groupTabs":
        if (request.tabIds) {
          const groupId = await groupTabs(request.tabIds)
          return { success: true, groupId }
        }
        return { success: false }
      
      default:
        return { success: false }
    }
  }
} as PlasmoMessaging.MessageHandler
```

### Step 3: Building the Popup UI

Now let us create the user interface for the popup. We will use React for a modern, interactive experience. Update `src/popup.tsx`:

{% raw %}
```tsx
import { useState, useEffect } from "react"
import { sendMessage } from "@plasmohq/messaging"

interface TabInfo {
  id: number
  title: string
  url: string
  favIconUrl: string
  windowId: number
  groupId?: number
}

function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedTabs, setSelectedTabs] = useState<number[]>([])

  useEffect(() => {
    loadTabs()
  }, [])

  const loadTabs = async () => {
    setLoading(true)
    try {
      const response = await sendMessage<{ tabs: TabInfo[] }>({
        name: "main",
        body: { action: "getTabs" }
      })
      
      if (response.tabs) {
        setTabs(response.tabs)
      }
    } catch (error) {
      console.error("Failed to load tabs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseTab = async (tabId: number) => {
    await sendMessage({
      name: "main",
      body: { action: "closeTab", tabId }
    })
    loadTabs()
  }

  const handleGroupTabs = async () => {
    if (selectedTabs.length > 0) {
      await sendMessage({
        name: "main",
        body: { action: "groupTabs", tabIds: selectedTabs }
      })
      setSelectedTabs([])
      loadTabs()
    }
  }

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleTabSelection = (tabId: number) => {
    setSelectedTabs(prev =>
      prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    )
  }

  return (
    <div style={{ width: "400px", minHeight: "500px", padding: "16px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
          Tab Manager Pro
        </h1>
        <input
          type="text"
          placeholder="Search tabs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px"
          }}
        />
      </div>

      {selectedTabs.length > 0 && (
        <button
          onClick={handleGroupTabs}
          style={{
            width: "100%",
            padding: "8px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "12px",
            fontWeight: "bold"
          }}
        >
          Group {selectedTabs.length} Tabs
        </button>
      )}

      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {loading ? (
          <p>Loading tabs...</p>
        ) : filteredTabs.length === 0 ? (
          <p>No tabs found</p>
        ) : (
          filteredTabs.map(tab => (
            <div
              key={tab.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px",
                borderBottom: "1px solid #eee",
                gap: "8px"
              }}
            >
              <input
                type="checkbox"
                checked={selectedTabs.includes(tab.id)}
                onChange={() => toggleTabSelection(tab.id)}
              />
              {tab.favIconUrl && (
                <img src={tab.favIconUrl} width="16" height="16" alt="" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {tab.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {new URL(tab.url).hostname}
                </div>
              </div>
              <button
                onClick={() => handleCloseTab(tab.id)}
                style={{
                  padding: "4px 8px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Close
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #eee" }}>
        <span style={{ fontSize: "12px", color: "#666" }}>
          {tabs.length} total tabs
        </span>
      </div>
    </div>
  )
}

export default Popup
```
{% endraw %}

### Step 4: Adding Storage Persistence

Many extensions need to persist user settings or data. Plasmo makes this easy with the `@plasmohq/storage` package. Let us add the ability to save user preferences:

```tsx
import { useStorage } from "@plasmohq/storage"

function Popup() {
  // Use local storage with automatic sync
  const [maxTabs, setMaxTabs] = useStorage<number>("maxTabs", 50)
  const [theme, setTheme] = useStorage<"light" | "dark">("theme", "light")
  
  // ... rest of component
}
```

### Step 5: Creating an Options Page

For more complex settings, create an options page at `src/options.tsx`:

{% raw %}
```tsx
import { useStorage } from "@plasmohq/storage"

function Options() {
  const [maxTabs, setMaxTabs] = useStorage<number>("maxTabs", 50)
  const [theme, setTheme] = useStorage<"light" | "dark">("theme", "light")
  const [notifications, setNotifications] = useStorage<boolean>("notifications", true)

  return (
    <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Extension Settings</h1>
      
      <div style={{ marginTop: "24px" }}>
        <label>
          Maximum tabs to display:
          <input
            type="number"
            value={maxTabs}
            onChange={(e) => setMaxTabs(parseInt(e.target.value))}
          />
        </label>
      </div>

      <div style={{ marginTop: "16px" }}>
        <label>
          Theme:
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div style={{ marginTop: "16px" }}>
        <label>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          Enable notifications
        </label>
      </div>
    </div>
  )
}

export default Options
```
{% endraw %}

---

## Advanced Plasmo Features {#advanced-features}

Now that you have built a complete extension, let us explore some advanced Plasmo features that can take your extension to the next level.

### Content Script Injection

Plasmo provides powerful APIs for content script management. You can create content scripts that run on specific pages or under specific conditions:

```typescript
// src/content.ts
import { runOnStartup, onMessage } from "@plasmohq/content/hook"

runOnStartup(() => {
  console.log("Content script loaded")
})

onMessage("getPageInfo", async () => {
  return {
    title: document.title,
    url: window.location.href,
    links: Array.from(document.querySelectorAll("a")).map(a => a.href)
  }
})
```

### Cross-Extension Communication

If you need your extension to communicate with other extensions, Plasmo supports this through the messaging APIs:

```typescript
// Sending to another extension
await chrome.runtime.sendMessage(extensionId, { message: "hello" })

// Receiving from another extension
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log("Received from:", sender.id)
  sendResponse({ received: true })
})
```

### Using Plasmo Storage in Background Scripts

You can also use the storage API in background scripts for persistent state management:

```typescript
import { getStorage } from "@plasmohq/storage"

const storage = getStorage()

// Store data
await storage.set("userSettings", { theme: "dark" })

// Retrieve data
const settings = await storage.get("userSettings")
```

### Environment-Based Configuration

Plasmo supports environment-specific configuration, which is useful for development vs. production builds:

```typescript
const apiUrl = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3000"
```

Define your environment variables in `.env.production` and `.env.development` files.

---

## Building and Publishing Your Extension {#building-publishing}

When you are ready to release your extension, Plasmo makes the build process straightforward.

### Building for Production

Run the following command to create a production build:

```bash
npm run build
```

This generates optimized bundles in the `build` folder, organized by browser and manifest version. For Chrome with Manifest V3, you will find your extension in `build/chrome-mv3-prod`.

### Loading Your Extension

To test the production build:

1. Navigate to `chrome://extensions` in Chrome
2. Enable Developer Mode (toggle in the top right)
3. Click "Load Unpacked"
4. Select the appropriate build folder (e.g., `build/chrome-mv3-prod`)

### Publishing to Chrome Web Store

For publishing to the Chrome Web Store, you will need to create a ZIP file of your build folder and upload it through the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

Plaso provides helpful utilities for common publishing tasks. You can also configure your `package.json` with metadata for the store:

```json
{
  "name": "tab-manager-pro",
  "version": "1.0.0",
  "description": "Organize and manage your Chrome tabs efficiently",
  "author": "Your Name",
  "keywords": ["chrome-extension", "tab-manager", "productivity"]
}
```

---

## Why Plasmo is the Best Extension Framework 2025 {#why-plasmo-best-2025}

As we have explored throughout this guide, **Plasmo Framework** offers compelling advantages that make it the top choice for Chrome extension development in 2025:

1. **Developer Experience**: The hot reloading, zero-config setup, and sensible defaults mean developers can focus on building features rather than configuring build tools.

2. **Modern Stack**: First-class TypeScript support, React integration, and compatibility with the latest web development patterns keep your codebase modern and maintainable.

3. **Manifest V3 Compliance**: With Google fully transitioned to Manifest V3, Plasmo ensures your extensions are compliant by default, avoiding the pitfalls of migrating from older manifest versions.

4. **Cross-Browser Support**: Build once and deploy to Chrome, Firefox, Safari, and Edge from a single codebase.

5. **Active Ecosystem**: A growing ecosystem of plugins, active community support, and regular framework updates ensure long-term viability.

6. **Production Ready**: Extensions built with Plasmo are running in production with millions of users, proving its reliability for real-world applications.

---

## Conclusion {#conclusion}

Building Chrome extensions has never been easier thanks to **Plasmo Framework**. Throughout this comprehensive guide, we have covered everything you need to know to get started: from project setup and basic structure to building a complete tab management extension with background workers, popups, and options pages.

The **plasmo chrome extension** development experience dramatically improves upon traditional approaches, eliminating configuration headaches and providing modern developer tools that make extension development as enjoyable as building web applications. Whether you are building a simple utility or a complex enterprise extension, Plasmo provides the foundation you need to succeed.

As the extension ecosystem continues to evolve in 2025 and beyond, frameworks like Plasmo will become increasingly important for maintaining developer productivity and building robust, standards-compliant extensions. The combination of excellent developer experience, modern tooling, and strong community support makes **Plasmo Framework** the clear choice for your next Chrome extension project.

Start building today with `npm create plasmo@latest`, and join thousands of developers who have already discovered the future of browser extension development.

---

**Ready to build your Chrome extension with Plasmo?** Check out the official [Plasmo documentation](https://docs.plasmo.com) for more advanced tutorials and API references. Happy coding!
