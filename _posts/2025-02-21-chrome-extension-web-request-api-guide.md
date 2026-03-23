---
layout: post
title: "Chrome Extension Web Request API: Intercept and Modify Network Requests"
description: "Master the Chrome Extension Web Request API to intercept, block, and modify network requests. Learn declarativeNetRequest, practical examples, and best practices for building powerful network-modifying extensions in 2025."
date: 2025-02-21
categories: [Chrome-Extensions, APIs]
tags: [web-request, network, chrome-extension]
keywords: "chrome extension web request, intercept network requests chrome, chrome extension modify requests, declarativeNetRequest chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/02/21/chrome-extension-web-request-api-guide/"
---

Chrome Extension Web Request API: Intercept and Modify Network Requests

The ability to intercept and modify network requests is one of the most powerful capabilities available to Chrome extension developers. Whether you are building an ad blocker, a privacy tool, a developer debugging tool, or a productivity extension that customizes how web pages behave, understanding the Chrome Extension Web Request API is essential. This comprehensive guide walks you through everything you need to know about intercepting network requests in Chrome extensions, from basic concepts to advanced implementation patterns.

Network request manipulation in Chrome extensions has evolved significantly over the years. Originally, developers had broad access to modify requests in nearly any way they imagined. However, as privacy and security concerns grew, Google introduced restrictions and new APIs to balance functionality with user safety. Today, the declarativeNetRequest API represents the modern, recommended approach for most use cases, while the webRequest API remains available for specific scenarios that require more granular control.

---

Understanding Network Request Interception in Chrome Extensions {#understanding-network-request-interception}

Before diving into implementation details, it is crucial to understand what network request interception means in the context of browser extensions. When a web page makes a request, whether to fetch HTML, load a script, retrieve an image, or make an API call, the browser processes this request through various stages. Chrome extensions can observe and potentially modify requests at different points in this lifecycle.

The Chrome Extension Web Request API provides a way to hook into these network events. You can observe requests as they are initiated, see the headers and body before they are sent, and even modify or block them entirely. This capability opens up a wide range of practical applications that millions of users rely on daily.

Ad blockers use this technology to prevent unwanted requests from loading, saving bandwidth and improving page load times. Privacy extensions block tracking pixels and analytics scripts before they can transmit user data. Developer tools intercept API calls to debug applications, inspect headers, and analyze network behavior. Enterprise applications use request modification to inject corporate headers, enforce security policies, and control what resources employees can access.

The Evolution of Request APIs in Chrome

Chrome's approach to network request interception has undergone significant changes. The original webRequest API provided extensive capabilities to observe and modify virtually any aspect of a network request. Developers could block requests, modify headers, redirect URLs, and even alter response bodies. This flexibility was powerful but raised concerns about potential abuse.

In response to privacy concerns and to improve performance, Google introduced the declarativeNetRequest API as the preferred solution for static request modification. This API uses a declarative ruleset approach where you define rules in a JSON file, and Chrome evaluates these rules internally without giving extensions direct access to request data. This design provides better privacy guarantees and improved performance since rules are evaluated in the browser's core rather than in extension code.

Understanding this evolution is important because it affects how you should approach building your extension. For most use cases, declarativeNetRequest is now the recommended path forward. However, the traditional webRequest API still serves specific scenarios where its capabilities are necessary.

---

The declarativeNetRequest API: Modern Approach to Request Modification {#declarative-net-request-api}

The declarativeNetRequest API represents Chrome's current recommendation for extensions that need to modify network requests. This API provides a declarative way to specify rules that Chrome applies automatically when processing network requests. Instead of writing code that intercepts each request individually, you define a set of rules, and Chrome handles the matching and application internally.

Setting Up Your Manifest

To use the declarativeNetRequest API, you need to declare the appropriate permissions in your extension's manifest.json file. The core permission you need is "declarativeNetRequest". You may also need "declarativeNetRequestWithHostAccess" if your rules need to match requests based on host patterns, or you can use the more restricted "declarativeNetRequestFeedback" for cases where you only need to observe rule matches without modifying requests.

Here is a basic manifest configuration for an extension using declarativeNetRequest:

```json
{
  "name": "My Network Modifier Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

For extensions that only need to modify requests on specific domains, you should replace "<all_urls>" with specific host patterns to follow the principle of least privilege.

Creating Rule Sets

Rules in declarativeNetRequest are defined in JSON files stored in your extension's _locales folder or in a rules directory. Each rule specifies conditions that determine when it should apply and an action that defines what should happen when those conditions are met.

The basic structure of a rule includes an ID, priority, action type, and condition. Here is a simple example that blocks all requests to a specific domain:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "example-ad-domain.com",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  }
]
```

This rule blocks any script, image, or sub-frame request matching "example-ad-domain.com". The urlFilter supports regular expression patterns, giving you powerful matching capabilities.

Action Types Available

The declarativeNetRequest API supports several action types that let you control how requests are handled. The "block" action prevents the request from completing entirely. The "allow" action permits requests that might otherwise be blocked by other rules. The "redirect" action sends the request to a different URL, which is useful for replacing blocked resources with alternatives or for URL transformation.

The "modifyHeaders" action lets you add, remove, or modify request and response headers. This is particularly useful for adding custom headers, removing tracking parameters from URLs, or adjusting caching headers. The "upgradeScheme" action upgrades HTTP requests to HTTPS for security.

For advanced use cases, you can also use "requestHeaders" and "responseHeaders" modifiers to specifically target headers rather than the entire request.

Building a Simple Ad Blocker

Let us walk through a practical example of building a simple ad blocker using declarativeNetRequest. This demonstrates the complete workflow from defining rules to testing your extension.

First, create a rules.json file in your extension's rules directory:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*\\.doubleclick\\.net",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*\\.googlesyndication\\.com",
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      }
    },
    "condition": {
      "urlFilter": ".*\\.google-analytics\\.com",
      "resourceTypes": ["script"]
    }
  }
]
```

This ruleset blocks common ad-serving domains while redirecting analytics scripts to a transparent GIF, a common technique to prevent tracking while avoiding JavaScript errors.

Next, reference these rules in your manifest:

```json
{
  "name": "Simple Ad Blocker",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ad_blocking_rules",
      "enabled": true,
      "path": "rules/rules.json"
    }]
  }
}
```

When you load this extension in Chrome and visit a page containing ads from these domains, the requests will be blocked or redirected automatically.

---

The webRequest API: Advanced Capabilities {#web-request-api}

While declarativeNetRequest is recommended for most use cases, the traditional webRequest API remains available for scenarios requiring more granular control. This API provides an event-based model where your extension code receives callbacks for network events and can modify requests in more sophisticated ways.

When to Use webRequest

The webRequest API is appropriate when you need capabilities that declarativeNetRequest does not support. This includes scenarios where you need to dynamically decide whether to block a request based on complex logic that cannot be expressed in static rules, when you need to read request bodies or response bodies, or when you need to modify requests in ways that require runtime computation.

For example, if you are building an extension that blocks requests based on user preferences stored locally, or if you need to analyze request content before deciding what to do, webRequest provides the flexibility you need.

Setting Up webRequest Permissions

The webRequest API requires the "webRequest" permission along with host permissions that specify which URLs your extension can intercept. For Chrome Manifest V3, you also need to use the "blocking" or "async" option carefully, as these capabilities have restrictions.

Here is a manifest configuration for an extension using webRequest:

```json
{
  "name": "Advanced Request Modifier",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "webRequest",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

Implementing Request Interception

With webRequest, you register event listeners that Chrome calls at various stages of request processing. The main events include onBeforeRequest (called before a request is sent), onBeforeSendHeaders (called before headers are sent), onSendHeaders (called after headers are sent), onHeadersReceived (called when response headers are received), onResponseStarted (called when the response body starts), and onCompleted (called when the request is finished).

Here is an example that modifies request headers:

```javascript
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    // Add a custom header to track requests from our extension
    details.requestHeaders.push({
      name: "X-Extension-Modified",
      value: "true"
    });
    
    // Remove a specific header if it exists
    details.requestHeaders = details.requestHeaders.filter(
      header => header.name !== "Do-Not-Track"
    );
    
    return { requestHeaders: details.requestHeaders };
  },
  {
    urls: ["<all_urls>"],
    types: ["xmlhttprequest", "script"]
  },
  ["requestHeaders", "blocking"]
);
```

This code adds a custom header to XMLHttpRequest and script requests while removing the Do-Not-Track header. The "blocking" option ensures the request is held until our handler completes.

Important Limitations in Manifest V3

Chrome Manifest V3 introduced significant changes to how webRequest works. The most notable change is that you can no longer use the "blocking" option for most event listeners in the same way. Instead, you must use "async" callbacks or combine webRequest with declarativeNetRequest.

This change was made for privacy and performance reasons. Extensions can no longer block requests synchronously for arbitrary URLs, which prevents some potentially abusive behaviors. For most use cases, this means you should prefer declarativeNetRequest and only use webRequest when you have a specific need that cannot be met otherwise.

---

Practical Applications and Real-World Examples {#practical-applications}

Understanding the theoretical aspects of request interception is valuable, but seeing how these concepts apply to real-world scenarios helps cement your understanding. Let us explore several practical applications that demonstrate the versatility of these APIs.

Building a Privacy Protector Extension

Privacy extensions are among the most common users of network request modification. These extensions typically block tracking scripts, pixels, and analytics services that collect user data without consent. Building such an extension combines declarativeNetRequest rules with a user interface that lets users customize blocking behavior.

A comprehensive privacy extension might include rules that block known trackers, redirect tracking URLs to remove identifying parameters, and modify headers to prevent fingerprinting. You can maintain a list of blocking rules in a JSON file that gets updated regularly as new trackers emerge.

The key to a successful privacy extension is maintaining an up-to-date list of blocking rules. Many popular ad blockers use subscription-based rule sets that are updated daily or even more frequently. Your extension can fetch these rule updates from a remote server and apply them dynamically.

Creating a Developer Debugging Tool

Developer tools often need to inspect network requests in detail, including viewing request bodies, response bodies, and timing information. While Chrome DevTools provides excellent built-in functionality, extensions can add specialized capabilities tailored to specific workflows.

A developer debugging extension might use webRequest to capture API calls and log them to a custom console, replay requests with modified parameters, or automatically add authentication headers to requests. The combination of request interception with storage capabilities allows you to build powerful debugging workflows.

For example, you might create an extension that automatically captures all API responses, stores them locally, and provides a UI for searching and replaying past requests. This can be invaluable for debugging issues that are difficult to reproduce.

Implementing URL Redirects and Transformations

URL redirection is another common use case for network request modification. Extensions can redirect users away from unwanted content, enforce HTTPS connections, or transform URLs according to custom rules.

Consider an extension that automatically redirects search queries to privacy-respecting alternatives. When a user performs a search on a traditional search engine, the extension detects this, extracts the query parameters, and redirects to a privacy-focused search service. This happens entirely at the network level, before the original search engine even receives the request.

---

Best Practices and Performance Considerations {#best-practices}

When building extensions that modify network requests, following best practices ensures your extension is efficient, respectful of user privacy, and compliant with Chrome Web Store policies.

Rule Optimization

The efficiency of your declarativeNetRequest rules directly impacts your extension's performance. Optimize your rules by using specific URL filters rather than broad patterns, limiting the number of rules that need evaluation, and organizing rules by priority so the most common cases are handled quickly.

Avoid using overly broad URL filters like ".*" unless absolutely necessary. Each request is checked against your rules, so more specific filters reduce the processing overhead. Similarly, limit the resource types your rules match to only those that are relevant, blocking images on a rule meant for scripts wastes processing cycles.

User Privacy Considerations

When building extensions that handle network requests, user privacy must be a primary concern. Even though you have access to network data, you should not collect or transmit this data without clear user consent and legitimate purpose.

Follow these privacy principles: only collect data that is necessary for your extension's functionality, store data securely with appropriate encryption, provide clear disclosure of what data your extension accesses, and give users meaningful control over what your extension does.

Chrome Web Store Compliance

Extensions that modify network requests face additional scrutiny during Chrome Web Store review. Google has specific policies around functionality that intercepts network requests, particularly for extensions that could be used to track users or modify content in unexpected ways.

To maximize your chances of approval, clearly describe your extension's functionality in the store listing, implement appropriate user consent mechanisms, avoid deceptive practices, and ensure your extension provides clear value to users.

---

Conclusion {#conclusion}

The Chrome Extension Web Request API and its modern counterpart, declarativeNetRequest, provide powerful capabilities for intercepting and modifying network requests. Whether you are building ad blockers, privacy tools, developer utilities, or enterprise applications, understanding these APIs is essential for creating effective Chrome extensions.

The key takeaways from this guide are: prefer declarativeNetRequest for most use cases due to its better performance and privacy characteristics, use webRequest only when you need capabilities that declarativeNetRequest does not support, optimize your rules for performance by being specific in your patterns, and always prioritize user privacy in your extension design.

As Chrome continues to evolve its extension platform, staying current with the latest APIs and best practices ensures your extensions remain functional and compliant. The concepts covered here provide a solid foundation for building sophisticated network-modifying extensions that serve real user needs while respecting the browser ecosystem.

---

Additional Resources {#additional-resources}

To continue learning about Chrome extension development and network request manipulation, explore these resources: the official Chrome Extensions documentation at developer.chrome.com/docs/extensions, the declarativeNetRequest API reference for detailed technical information, community forums where extension developers share insights and patterns, and open-source extensions that demonstrate various approaches to network modification.
