---
layout: post
title: "Chrome Declarative Content API Complete Guide"
description: "Master the Chrome Declarative Content API to build powerful extensions that react to page content automatically. Learn how to create page action rules, implement conditional extension actions, and optimize your extension's performance."
date: 2025-01-27
categories: [Chrome-Extensions, API-Guide]
tags: [chrome-extension, api]
keywords: "declarative content extension, page action rules, conditional extension action, chrome declarativeContent api, chrome.contentSettings api"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/27/chrome-declarative-content-api-guide/"
---

# Chrome Declarative Content API Complete Guide

The Chrome Declarative Content API is one of the most powerful yet often underutilized APIs available to Chrome extension developers. This comprehensive guide will walk you through everything you need to know about building extensions that automatically react to page content using declarative content extension patterns. Whether you're looking to create intelligent page action rules, implement conditional extension actions, or optimize how your extension responds to website content, this guide has you covered.

The Declarative Content API represents a paradigm shift in how Chrome extensions interact with web pages. Instead of constantly scanning page content using content scripts or actively monitoring DOM changes, developers can now declare conditions under which their extension should take action. This approach offers significant performance benefits and cleaner code architecture.

---

## Understanding the Declarative Content API {#understanding-declarative-content-api}

The Chrome Declarative Content API, accessible via `chrome.declarativeContent`, enables extensions to trigger actions based on the content of web pages without requiring permission to read page content directly. This is a crucial distinction that makes the API both powerful and privacy-friendly. Your extension can specify conditions like "when the page contains a specific element" or "when the user is on a shopping site" without actually needing to read or analyze the page's content.

This API works by registering declarative rules with Chrome's internal content matching engine. When a page loads or changes, Chrome evaluates these rules against the page's structure and triggers the appropriate actions. This evaluation happens at the browser level, making it significantly more efficient than traditional content script approaches that require injection and execution within each page context.

### Why Use Declarative Content Over Traditional Methods

Traditional Chrome extensions often rely on content scripts that run on every page, constantly checking for specific conditions or DOM elements. This approach has several drawbacks that the Declarative Content API addresses elegantly.

First, content scripts run in an isolated world within each page, meaning they share nothing with the page's own JavaScript but also cannot easily communicate with your extension's background scripts without message passing. The Declarative Content API eliminates this complexity by handling the matching logic at the browser level and triggering actions in your background script.

Second, content scripts must be injected into every page your extension might affect, which means declaring extensive permissions in your manifest. With the Declarative Content API, you can often use more limited permissions while still achieving the same functionality. This is particularly important for extensions that only need to act on specific types of pages.

Third, and perhaps most importantly, content scripts must actively examine page content to detect conditions. The Declarative Content API uses Chrome's internal page analysis to passively detect conditions, resulting in better performance and faster response times. Your extension doesn't need to wait for a content script to inject, execute, and check the DOM—it simply receives events when conditions are met.

### The Architecture of Declarative Content

The Declarative Content API is built around three core concepts: conditions, actions, and rules. Understanding how these work together is essential for building effective extensions.

Conditions define what must be true about a page for your extension to take action. Chrome provides several built-in condition types, including page state conditions (like whether a page contains specific elements), URL conditions (matching against URL patterns), and content settings conditions. You can combine multiple conditions using logical operators to create sophisticated matching logic.

Actions define what happens when conditions are met. The most common action is the ShowPageAction action, which displays your extension's page action icon in the browser's toolbar. However, you can also trigger more complex behaviors by combining declarative content rules with other extension APIs.

Rules tie conditions and actions together. A rule specifies which conditions to match and which actions to trigger when those conditions are met. You can register multiple rules, and Chrome will evaluate them efficiently whenever page content changes.

---

## Setting Up Your Manifest for Declarative Content {#manifest-configuration}

Before you can use the Declarative Content API, you need to configure your extension's manifest.json file correctly. This involves declaring the necessary permissions and specifying any content settings your extension requires.

### Required Permissions

The Declarative Content API requires the `"declarativeContent"` permission in your manifest. This permission allows your extension to register declarative rules without granting full access to page content. Here's how your permissions section should look:

```json
{
  "permissions": [
    "declarativeContent"
  ]
}
```

It's worth noting that you typically don't need the `"activeTab"` permission when using declarative content, because the API is designed to work without requiring user interaction or tab access. However, if your extension needs to take actions that require additional permissions (like modifying cookies or accessing storage), you'll need to declare those permissions separately.

### Understanding Page Action vs Browser Action

One common point of confusion when working with the Declarative Content API is the difference between page actions and browser actions. Understanding this distinction is crucial for building intuitive extensions.

A browser action displays an icon in the Chrome toolbar that appears on all pages. It's suitable for extensions that provide functionality regardless of which website the user is visiting. A page action, on the other hand, appears in the address bar and is typically used for extensions that only relevant on specific pages.

The Declarative Content API is most commonly used with page actions because it excels at detecting when your extension should be active. When conditions are met, you use the ShowPageAction action to display your icon; when conditions are no longer met, the icon automatically hides. This creates a clean, context-aware user experience.

Here's a minimal manifest configuration for an extension using declarative content with a page action:

```json
{
  "manifest_version": 3,
  "name": "My Declarative Content Extension",
  "version": "1.0",
  "permissions": [
    "declarativeContent"
  ],
  "action": {
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    },
    "default_title": "Click to activate"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## Creating Declarative Content Rules {#creating-rules}

Now let's dive into the core of the Declarative Content API—creating rules that detect page conditions and trigger appropriate actions. This section covers the syntax, options, and best practices for building effective declarative rules.

### Basic Rule Structure

A declarative content rule consists of three main components: conditions, actions, and an optional identifier. The conditions specify when the rule should trigger, the actions define what happens when conditions are met, and the identifier helps you manage rules later.

Here's a basic example that shows a page action when a page contains a specific element:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ["input[type='email']"]
        })
      ],
      actions: [
        new chrome.declarativeContent.ShowPageAction()
      ]
    }
  ]);
});
```

This code creates a rule with a single condition: the page must contain an input element with type "email". When this condition is met, Chrome automatically shows the extension's page action icon. The rule is registered when the extension is installed.

### Using PageStateMatcher for Content Detection

The PageStateMatcher is the most commonly used condition type in declarative content extensions. It allows you to match pages based on their content without actually reading that content. Chrome evaluates these matchers internally, making them efficient and privacy-preserving.

The CSS selector matching is particularly powerful. You can specify any valid CSS selector, and Chrome will detect whether at least one element matching that selector exists on the page. This works for detecting specific HTML elements, classes, IDs, attributes, or more complex selectors.

For example, to detect shopping pages, you might use:

```javascript
new chrome.declarativeContent.PageStateMatcher({
  css: [
    "[data-product]",
    ".product-price",
    "#add-to-cart-button"
  ]
})
```

This condition becomes true when any of these selectors match elements on the page. You can also use the `matchType` property to control how the selector matching works—for instance, requiring all selectors to match rather than just one.

### URL-Based Conditions

In addition to content matching, you can also create conditions based on URL patterns. This is useful when you know in advance which websites your extension should interact with. URL conditions are evaluated before content conditions, making them faster for filtering to specific domains.

```javascript
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: {
    hostSuffix: "example.com",
    schemes: ["https"]
  }
})
```

This matcher triggers for any HTTPS page on example.com or its subdomains. You can combine host suffixes, prefixes, and exact matches with schemes and ports to create precise URL filtering rules.

### Combining Multiple Conditions

One of the most powerful features of the Declarative Content API is the ability to combine multiple conditions within a single rule. By requiring multiple conditions to be true, you can create sophisticated logic that triggers actions only in very specific circumstances.

```javascript
chrome.declarativeContent.onPageChanged.addRules([
  {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: "shopping.com" }
      }),
      new chrome.declarativeContent.PageStateMatcher({
        css: [".add-to-cart", "#buy-now"]
      })
    ],
    actions: [
      new chrome.declarativeContent.ShowPageAction()
    ]
  }
]);
```

This rule only shows the page action when the user is on a shopping.com page AND the page contains either an "add-to-cart" or "buy-now" element. This level of specificity ensures your extension only appears when truly relevant.

---

## Implementing Conditional Extension Actions {#conditional-actions}

Beyond simply showing a page action, the Declarative Content API can trigger more complex behaviors. Understanding how to implement conditional extension actions will help you build more sophisticated extensions that respond intelligently to page context.

### Responding to Rule Triggers

When your declarative content conditions are met, you need a way to respond to that event. The background script receives these events through the onPageChanged listener, where you can implement any logic your extension requires.

```javascript
chrome.declarativeContent.onPageChanged.addRules(rules);

// You can also listen for specific conditions being met
// and take immediate action in the background
chrome.declarativeContent.onPageChanged.addListener((changeInfo) => {
  if (changeInfo.state === "complete") {
    // Page has finished loading and conditions are evaluated
    // This is where you can trigger background script logic
  }
});
```

However, note that the ShowPageAction action is the primary built-in action. For more complex behaviors, you typically use the page action as a trigger that users click, which then executes your extension's full functionality. This keeps your extension lightweight while still providing rich functionality.

### Using Declarative Content with Other APIs

The real power of the Declarative Content API emerges when you combine it with other Chrome extension APIs. This combination allows you to build extensions that detect context and then perform complex operations.

For example, you might combine declarative content with the tabs API to automatically open a side panel when certain conditions are met:

```javascript
// In background.js
chrome.declarativeContent.onPageChanged.addRules([
  {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        css: ["#primary-content"]
      })
    ],
    actions: [
      new chrome.declarativeContent.ShowPageAction()
    ]
  }
]);

chrome.action.onClicked.addListener(async (tab) => {
  // This runs when user clicks the page action
  await chrome.sidePanel.open({ tabId: tab.id });
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    page: "sidepanel.html"
  });
});
```

This pattern—using declarative content to show a context-aware icon, then responding to user clicks to provide full functionality—provides an excellent user experience while maintaining performance.

---

## Advanced Patterns and Best Practices {#advanced-patterns}

As you become more comfortable with the Declarative Content API, you'll want to learn advanced patterns that make your extensions more robust, efficient, and maintainable. This section covers techniques for handling complex scenarios.

### Managing Rule Lifecycle

Understanding how to properly manage declarative content rules throughout your extension's lifecycle is essential. Rules persist across browser sessions, but you may need to update them based on user preferences or extension state.

You can remove rules when they're no longer needed:

```javascript
chrome.declarativeContent.onPageChanged.removeRules(["ruleId"], () => {
  // Rules removed, can add new ones now
});
```

And you can query existing rules to check what's registered:

```javascript
chrome.declarativeContent.onPageChanged.getRules((rules) => {
  console.log("Active rules:", rules);
});
```

This is particularly useful for extensions that allow users to configure which sites or conditions should trigger the extension. You can store user preferences and dynamically update rules to match.

### Handling Dynamic Content

Modern web pages often load content dynamically through JavaScript, which can be challenging for the Declarative Content API. By default, the API evaluates conditions when the page loads, but you may need to handle pages that modify their content after initial load.

The Declarative Content API does not automatically re-evaluate when DOM mutations occur. However, Chrome will re-evaluate rules when the page sends certain signals, such as the completion of the page's load event. For heavily dynamic pages, you might need to combine declarative content with other approaches.

One effective strategy is to use declarative content to detect the initial condition (like a page belonging to a specific site), then use a content script for ongoing monitoring if needed. This hybrid approach gives you the best of both worlds: efficient initial detection and continuous monitoring for complex scenarios.

### Performance Optimization

While the Declarative Content API is inherently more efficient than content script scanning, you can still optimize your implementation for better performance.

First, be specific with your CSS selectors. Broad selectors that match many elements on many pages will cause Chrome to do more work evaluating conditions. Specific selectors that target unique elements are faster to evaluate.

Second, use URL conditions when possible. URL matching happens before content matching, so combining URL and content conditions is more efficient than content conditions alone. If you know your extension only applies to specific domains, always include URL conditions.

Third, limit the number of rules. Each rule requires evaluation, and having dozens of rules with overlapping conditions can slow down page load. Combine related conditions into single rules rather than creating multiple rules that could fire simultaneously.

---

## Common Use Cases for Declarative Content {#common-use-cases}

The Declarative Content API is versatile and can be applied to numerous extension types. Understanding common use cases will help you recognize opportunities to use this API in your own projects.

### Form Enhancement Extensions

One of the most popular use cases for declarative content extensions is enhancing web forms. You can detect when users are on pages with specific types of forms and provide helpful functionality.

For instance, an extension that helps users fill forms might detect email inputs, phone number fields, or address forms and offer autofill capabilities. The declarative content API detects these form elements efficiently, and your extension provides the enhanced functionality when users click the page action.

### E-Commerce助手

Shopping assistants are another excellent use case. These extensions can detect when users are viewing products, are on checkout pages, or are looking at pricing information. The page action can show discount opportunities, price comparisons, or deal alerts when conditions are met.

Detecting e-commerce pages typically involves matching against common product page elements like price displays, "add to cart" buttons, product images, and review sections. A well-designed shopping assistant will match multiple common e-commerce patterns to provide broad coverage.

### Developer Tools

Web developers can use declarative content to create context-aware developer tools. For instance, an extension that provides debugging information might only appear on pages running specific JavaScript frameworks or on pages with console errors.

You can detect React, Vue, Angular, or other framework signatures in the page to show appropriate tooling options. This creates a development environment that adapts to the technology stack of each project.

### Content Management System Extensions

Many extensions target specific content management systems like WordPress, Shopify, or custom platforms. The Declarative Content API makes it easy to detect when users are on admin pages, editing interfaces, or specific content types.

By matching against CMS-specific elements like admin navigation, content editors, or dashboard widgets, you can provide contextual tools that only appear where they're relevant. This creates a much cleaner user experience than traditional content script approaches.

---

## Troubleshooting and Debugging {#troubleshooting}

Even well-designed declarative content extensions can encounter issues. This section covers common problems and how to resolve them.

### Rules Not Firing

If your rules aren't triggering as expected, start by checking the basic configuration. Ensure your manifest correctly declares the declarativeContent permission and that your background script properly registers rules on installation.

Use the Chrome extension debugging console to verify that your rules are actually registered:

```javascript
chrome.declarativeContent.onPageChanged.getRules((rules) => {
  console.log("Registered rules:", JSON.stringify(rules, null, 2));
});
```

If rules are registered but not firing, check that your CSS selectors are valid and that the pages you're testing actually contain matching elements. Also verify that your URL conditions, if any, are correct.

### Permission Issues

Some developers encounter permission-related issues when combining declarative content with other APIs. Remember that the declarativeContent permission alone doesn't grant access to page content—it only allows you to detect conditions. If you need to read or manipulate page content, you'll need additional permissions.

For manifest version 3, be particularly careful about which permissions you request. Some permissions trigger installation warnings that can reduce user trust. Whenever possible, use the declarative content approach to limit what your extension actually needs.

### Conflicts with Other Extensions

In rare cases, multiple extensions using declarative content on the same pages can create unexpected behavior. Chrome evaluates all registered declarative rules, and there can be interactions between different extensions' rules.

If you're experiencing unusual behavior, try disabling other extensions temporarily to see if the issue resolves. This can help identify whether another extension is interfering with your rules.

---

## Conclusion {#conclusion}

The Chrome Declarative Content API is an essential tool for modern Chrome extension development. By allowing extensions to react to page content without actively scanning DOM elements, it provides a performant, privacy-friendly approach to building context-aware extensions.

Throughout this guide, you've learned how to configure your manifest for declarative content, create effective rules using PageStateMatcher, implement conditional extension actions, and apply best practices for optimal performance. These skills enable you to build sophisticated extensions that appear exactly when users need them.

Remember the key principles: use specific CSS selectors for efficient matching, combine URL and content conditions for better performance, and leverage the page action pattern for clean user experiences. With these techniques, you can create extensions that feel like native Chrome features rather than intrusive add-ons.

Start experimenting with the Declarative Content API in your own projects. The combination of performance benefits and improved user experience makes it worth the learning curve. Your users will appreciate extensions that appear contextually and disappear when not relevant, creating a more seamless browsing experience.

For more information on related Chrome extension APIs and development techniques, explore other guides in this comprehensive Chrome extension development series.
