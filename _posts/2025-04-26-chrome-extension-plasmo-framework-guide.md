---
layout: post
title: "Plasmo Framework for Chrome Extensions: Build Extensions Like Web Apps"
description: "Discover Plasmo Framework, the modern way to build Chrome extensions using React. Learn how to use hot reloading, TypeScript, and web development workflows to create powerful browser extensions faster."
date: 2025-04-26
categories: [Chrome-Extensions, Frameworks]
tags: [plasmo, framework, chrome-extension]
keywords: "plasmo chrome extension, plasmo framework, build extension plasmo, plasmo react extension, modern chrome extension plasmo"
canonical_url: "https://bestchromeextensions.com/2025/04/26/chrome-extension-plasmo-framework-guide/"
---

Plasmo Framework for Chrome Extensions: Build Extensions Like Web Apps

If you have ever built a Chrome extension from scratch, you know the pain: manually configuring webpack, wrestling with manifest files, setting up separate build processes for different extension components, and constantly refreshing your browser to see changes. What if building a Chrome extension felt exactly like building a modern web application? Enter Plasmo Framework. the game-changing solution that brings the full power of React, TypeScript, and modern development workflows to browser extension development.

Plasmo is a framework specifically designed for building browser extensions with a focus on developer experience. It handles all the complex configuration, bundling, and deployment intricacies behind the scenes, letting you focus entirely on building your extension's functionality. Whether you are a seasoned web developer looking to expand into extension development or someone building their first browser extension, Plasmo provides the tooling and abstractions that make the process remarkably smooth.

What is Plasmo Framework?

Plasmo is an open-source framework created by the team at [Plasmo](https://www.plasmo.com/) that aims to make browser extension development as easy as building a web app. Unlike traditional approaches where you manually configure bundlers like webpack or Vite and figure out the intricacies of Chrome's extension architecture yourself, Plasmo provides a pre-configured, opinionated setup that follows best practices out of the box.

The framework supports multiple browser targets including Chrome, Firefox, Safari, and Edge, though it shines brightest with Chrome and Chromium-based browsers. It integrates deeply with React, allowing you to build your extension's popup, options page, side panel, and content scripts using familiar React patterns. Beyond React, Plasmo also supports Vue, Svelte, and vanilla JavaScript, making it versatile for developers with different framework preferences.

One of Plasmo's standout features is its first-class support for hot module replacement during development. When you make changes to your extension's code, Plasmo automatically reloads the relevant parts without requiring you to manually click the reload button in Chrome's extensions page. This alone can save hours of frustration over the course of an extension development project.

Why Use Plasmo for Chrome Extension Development?

The traditional Chrome extension development workflow involves several problems that Plasmo directly addresses. Understanding these benefits helps you appreciate why so many developers are making the switch.

Simplified Configuration

When you create a raw Chrome extension, you need to create and maintain a manifest.json file, configure your bundler to output the correct file structure, set up separate entry points for your popup, background service worker, and content scripts, and figure out how to handle cross-context communication. Plasmo abstracts all of this away. You write your code in a structure that feels natural, and Plasmo handles the transformation into a valid Chrome extension behind the scenes.

TypeScript First

Plasmo has excellent TypeScript support built in. Type safety catches bugs early, improves code maintainability, and makes working with Chrome's extension APIs much more pleasant since you get proper autocomplete and type checking. The framework includes type definitions for Chrome's APIs, so you no longer have to guess what parameters a method accepts or what properties an object has.

Built-in Best Practices

The framework incorporates years of collective knowledge about what works and what does not in Chrome extension development. It enforces patterns that lead to better performing, more secure, and more maintainable extensions. For example, Plasmo automatically handles the complexities of service worker lifecycle management and helps you avoid common pitfalls like memory leaks in content scripts.

Multi-Context Support

Modern extensions often need to interact with multiple parts of the browser: a popup UI, an options page, a background service worker, content scripts that run on web pages, and possibly a devtools panel. Plasmo makes it straightforward to organize code for each of these contexts while providing clean APIs for communication between them.

Getting Started with Plasmo

Setting up a new Plasmo project takes just a few minutes. The framework provides a CLI that handles project creation and development server management. Let us walk through the process of building a simple extension to demonstrate Plasmo's workflow.

Installation

First, ensure you have Node.js version 18 or higher installed. Then create a new Plasmo project using the CLI:

```bash
npm create plasmo@latest my-extension
```

The CLI will prompt you to choose your preferred framework (React, Vue, Svelte, or vanilla), whether you want TypeScript, and some other configuration options. For this guide, we will assume you choose React with TypeScript.

After the project is created, navigate into the directory and install dependencies:

```bash
cd my-extension
npm install
```

Project Structure

A newly created Plasmo project has a clean, intuitive structure. The main directories you will work with are:

- `src/`: Your source code lives here
- `src/background.ts`: Background service worker (or background.service-worker.ts)
- `src/content.ts`: Content script that runs on web pages
- `src/options.tsx`: Options page (or options directory for more complex setups)
- `src/popup.tsx`: Extension popup

This structure makes it immediately clear where each piece of your extension lives, unlike raw Chrome extension projects where you might struggle to organize files consistently.

Running Development Mode

Start the development server with:

```bash
npm run dev
```

Plasmo will compile your code and start a development server. It will also output instructions for loading your extension in Chrome. You typically navigate to `chrome://extensions`, enable Developer Mode, click "Load Unpacked", and select the `build` directory that Plasmo creates.

The key advantage here is Plasmo's HMR support. Keep the extension loaded in Chrome while your dev server runs. Make a change to your popup code, save the file, and watch it update instantly in your browser without any manual reloading.

Building a Real Extension with Plasmo and React

Let us build a practical example to demonstrate Plasmo's capabilities. We will create a simple extension that lets users highlight text on any webpage and save it to a local list. This example will touch on content scripts, popup UI, and cross-context communication.

Creating the Content Script

First, let us create a content script that will run on web pages and allow users to select text. In Plasmo, content scripts are defined in `src/content.ts`:

```typescript
import { sendToBackground } from "@plasmohq/messaging"

export default function ContentScript() {
  // This runs when the content script loads on a page
  console.log("Extension content script loaded")
  
  // You can add event listeners, manipulate DOM, etc.
  return null
}
```

For our text highlighter, we might want to listen for text selection events and provide a way to save selected text. You would add mouseup or selectionchange event listeners here to capture user selections.

Building the Popup Interface

The popup is your extension's most visible component. In Plasmo with React, you build it just like any other React component. Edit `src/popup.tsx`:

{% raw %}
```tsx
import { useState, useEffect } from "react"

function Popup() {
  const [savedTexts, setSavedTexts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load saved texts when popup opens
    loadSavedTexts()
  }, [])

  const loadSavedTexts = async () => {
    try {
      const response = await chrome.storage.local.get("highlightedTexts")
      setSavedTexts(response.highlightedTexts || [])
    } catch (error) {
      console.error("Failed to load texts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearAll = async () => {
    await chrome.storage.local.set({ highlightedTexts: [] })
    setSavedTexts([])
  }

  return (
    <div style={{ padding: "16px", minWidth: "300px" }}>
      <h2>Saved Highlights</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : savedTexts.length === 0 ? (
        <p>No highlights yet. Select text on any page to save it.</p>
      ) : (
        <>
          <ul>
            {savedTexts.map((text, index) => (
              <li key={index} style={{ marginBottom: "8px" }}>
                {text.substring(0, 100)}
                {text.length > 100 ? "..." : ""}
              </li>
            ))}
          </ul>
          <button onClick={clearAll}>Clear All</button>
        </>
      )}
    </div>
  )
}

export default Popup
```
{% endraw %}

This popup component uses Chrome's storage API to persist data. Notice how similar this is to building a regular React application. you have state management, effects, event handlers, and JSX rendering.

Adding Messaging Between Contexts

For more complex extensions, you will need to communicate between your content script, popup, and background worker. Plasmo provides a messaging system that makes this straightforward. The `@plasmohq/messaging` package offers a clean API for sending messages between contexts.

In your content script:

```typescript
import { sendToBackground } from "@plasmohq/messaging"

const handleTextSelected = async (text: string) => {
  await sendToBackground({
    name: "SAVE_HIGHLIGHT",
    body: { text }
  })
}
```

In your background script:

```typescript
import { sendToBackground } from "@plasmohq/messaging"

chrome.runtime.onMessage.addListener((message) => {
  if (message.name === "SAVE_HIGHLIGHT") {
    // Handle saving the highlight
  }
})
```

This pattern keeps your code organized and makes it easy to understand where different logic lives.

Plasmo Features for Production Extensions

Beyond the basics, Plasmo offers several features that become valuable as your extension grows in complexity.

Environment Variables

Plasmo supports environment variables through `.env` files, making it easy to configure different settings for development, staging, and production. This is essential when you need different API keys or configuration values in different environments.

Automatic Manifest Generation

You do not manually write your `manifest.json` in Plasmo. Instead, you configure your extension's permissions, content script matches, and other manifest properties through a configuration file. Plasmo then generates the manifest automatically during the build process. This approach reduces errors and ensures your manifest always matches your actual code.

Storage Abstraction

Plasmo provides a storage abstraction that simplifies working with Chrome's storage API. It offers a type-safe interface for reading and writing data, with built-in support for synchronization across devices when users are signed into Chrome.

Testing Support

The framework integrates with popular testing tools. You can write unit tests for your React components, integration tests for your messaging system, and end-to-end tests that simulate user interactions with your extension.

Performance Considerations with Plasmo

Chrome extensions face unique performance challenges that Plasmo helps you address. Extensions that consume excessive memory or CPU can be disabled by Chrome or uninstalled by frustrated users, so performance should be a primary concern from the start.

Code Splitting

Plasmo automatically code-splits your extension, ensuring that users only download the JavaScript needed for the context they are using. The popup code does not load when the user is browsing normally, and content script code does not impact the popup's load time.

Service Worker Optimization

Background service workers in Manifest V3 have strict resource limits. Plasmo helps you structure your code to minimize the service worker's memory footprint, using lazy loading patterns and properly cleaning up event listeners when they are no longer needed.

Content Script Efficiency

Content scripts run on every page matching your patterns, making efficiency critical. Plasmo encourages patterns that keep content scripts lightweight, such as using message passing to delegate heavy processing to the background context rather than running it directly on page threads.

Deploying Your Plasmo Extension

When you are ready to publish, Plasmo makes the build process straightforward:

```bash
npm run build
```

This creates a production-ready build in the `build` directory. You can then upload this directly to the Chrome Web Store. Plasmo's build output follows Chrome's best practices, ensuring your extension passes Google's review process more smoothly.

For teams wanting continuous deployment, you can integrate the build process into CI/CD pipelines that automatically deploy new versions when you push to your repository.

Conclusion

Plasmo Framework represents a significant step forward in Chrome extension development. By bringing modern web development practices. React, TypeScript, hot module replacement, and sensible defaults. to the extension ecosystem, it dramatically lowers the barrier to entry while providing the power that professional developers need.

Whether you are building your first Chrome extension or maintaining a complex production extension, Plasmo deserves consideration. Its focus on developer experience translates to faster development cycles, more maintainable code, and ultimately, better extensions for end users. The framework is actively maintained, has a growing community, and continues to add features that keep pace with Chrome's evolving extension platform.

If you have been hesitant to build a Chrome extension because of the technical complexity, or if you have been struggling with manual configuration and tooling issues, give Plasmo a try. You might find that building extensions is not just manageable. it is actually enjoyable.

---

Ready to start building? Head over to the [official Plasmo documentation](https://docs.plasmo.com/) to dive deeper into specific topics like content script injection, storage patterns, or deployment workflows. The community is active and responsive if you have questions along the way.
