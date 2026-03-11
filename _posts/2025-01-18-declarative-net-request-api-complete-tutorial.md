---
layout: post
title: "DeclarativeNetRequest API Complete Tutorial: Master Chrome Network Rules in Manifest V3"
description: "Learn how to use the DeclarativeNetRequest API to block network requests, modify headers, and implement content filtering in your Chrome extensions. This comprehensive tutorial covers everything from basic setup to advanced network rule configuration for Manifest V3."
date: 2025-01-18
categories: [Chrome-Extensions]
tags: [chrome-extension, development]
keywords: "declarativeNetRequest tutorial, chrome network rules, mv3 network blocking, chrome.declarativeNetRequest API, Manifest V3 network request modification"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/18/declarative-net-request-api-complete-tutorial/"
---

# DeclarativeNetRequest API Complete Tutorial: Master Chrome Network Rules in Manifest V3

The DeclarativeNetRequest API represents one of the most powerful additions to Chrome extensions in the Manifest V3 era. This API enables extension developers to intercept, block, and modify network requests directly from the extension's service worker, without requiring the intrusive background scripts that were common in Manifest V2. Whether you're building an ad blocker, content filter, privacy extension, or developer tool, understanding the DeclarativeNetRequest API is essential for creating modern, privacy-conscious Chrome extensions that respect user autonomy while providing powerful network control capabilities.

This comprehensive tutorial will guide you through every aspect of the DeclarativeNetRequest API, from basic concepts and permissions to advanced rule creation and optimization techniques. By the end of this guide, you'll have the knowledge and practical code examples needed to implement sophisticated network request handling in your own Chrome extensions.

---

## Understanding the DeclarativeNetRequest API {#understanding-declarative-net-request}

The DeclarativeNetRequest API provides a declarative way to specify rules that evaluate and modify network requests. Unlike the older webRequest API, which required persistent background scripts with extensive permissions, DeclarativeNetRequest allows Chrome to evaluate rules efficiently while maintaining user privacy and extension performance. The API is designed to be more privacy-preserving because it doesn't expose the full details of every network request to extension code—instead, you define rules that Chrome applies internally.

### Why DeclarativeNetRequest Replaced webRequest in Manifest V3

In Manifest V2, developers primarily used the webRequest API to intercept and modify network requests. However, this approach had significant drawbacks that prompted Google to introduce DeclarativeNetRequest as the preferred alternative for Manifest V3. The webRequest API required background scripts to run continuously, consuming system resources and creating potential privacy concerns since extensions could observe all network traffic in detail.

DeclarativeNetRequest addresses these issues by shifting the rule evaluation to Chrome's internal engine. Extensions define static rules in JSON format, and Chrome applies these rules efficiently without needing to execute extension code for every network request. This approach results in better performance, improved privacy, and a more streamlined extension review process for the Chrome Web Store.

### Core Concepts and Terminology

Before diving into implementation, it's important to understand the fundamental concepts that govern how DeclarativeNetRequest works. The API operates around three primary entities: rules, rule sets, and actions.

**Rules** are the basic unit of network request modification. Each rule specifies conditions that determine when it should be applied and an action to take when those conditions are met. Rules can block requests, redirect them to different URLs, modify request or response headers, and more. Rules are defined in JSON format and can be loaded from external files or dynamically added by the extension.

**Rule Sets** are collections of rules that are loaded together. Extensions can have multiple rule sets, with one being the primary set that's always active and additional sets that can be enabled or disabled dynamically. This flexibility allows extensions to offer users different filtering profiles or toggle specific rule categories on and off.

**Actions** define what happens when a rule's conditions are met. The DeclarativeNetRequest API supports several action types, including blocking requests entirely, redirecting to a different URL, modifying headers, and allowing requests to proceed unchanged. Each action type has its own parameters and use cases, which we'll explore in detail throughout this tutorial.

---

## Setting Up Your Extension for DeclarativeNetRequest {#manifest-configuration}

Proper manifest configuration is the first step in implementing DeclarativeNetRequest in your Chrome extension. This section covers the required permissions, manifest declarations, and best practices for setting up your extension environment.

### Required Permissions in Manifest V3

To use the DeclarativeNetRequest API, your extension needs specific permissions declared in the manifest.json file. The exact permissions depend on what you want to achieve with your rules, but there are some common patterns you should follow.

For basic request blocking and redirection, you'll need to declare the `declarativeNetRequest` permission in your manifest. This permission alone allows you to use most of the API's functionality. However, if you need to modify headers or access more detailed request information, you may also need to specify host permissions for the URLs you want to affect.

```json
{
  "manifest_version": 3,
  "name": "Network Rule Controller",
  "version": "1.0",
  "description": "A demonstration of DeclarativeNetRequest API",
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

It's worth noting that you should always request the minimum permissions necessary for your extension's functionality. If you only need to block requests to specific domains, specify those domains in your host permissions rather than using `<all_urls>`. This focused approach leads to better user trust and a smoother review process for the Chrome Web Store.

### Understanding Rule File Structure

DeclarativeNetRequest rules are typically stored in JSON files within your extension's directory. These files define the conditions and actions that Chrome will apply to matching network requests. The structure of these files is straightforward but requires careful attention to syntax.

Each rule file contains an array of rule objects. Each rule must have an ID, a priority, an action, and a condition. The ID uniquely identifies the rule within its rule set, the priority determines the order of evaluation when multiple rules match the same request, the action specifies what to do with matching requests, and the condition defines which requests the rule applies to.

```json
{
  "rules": [
    {
      "id": 1,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": "example.com",
        "resourceTypes": ["script", "image"]
      }
    }
  ]
}
```

Understanding how these components work together is crucial for creating effective network rules. The rule evaluation process follows a specific order: Chrome first checks the conditions of each rule against the incoming request, then applies the action from the highest-priority matching rule. This means you can create sophisticated filtering logic by carefully designing your rule priorities and conditions.

---

## Creating Your First Network Rules {#creating-first-rules}

Now that you understand the basics, let's create some practical rules. We'll start with simple blocking rules and progressively move to more complex scenarios involving redirection and header modification.

### Blocking Requests with DeclarativeNetRequest

Blocking requests is the most common use case for DeclarativeNetRequest. Whether you're building an ad blocker, a privacy tool, or a content filter, the ability to prevent certain requests from completing is fundamental to your extension's functionality.

To block requests, you need to create a rule with the action type set to "block". The condition should specify which requests to block using URL filters and resource types. Here's an example that blocks all scripts from a specific domain:

```json
{
  "rules": [
    {
      "id": 1,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": "||tracker.example.com^",
        "resourceTypes": ["script"]
      }
    }
  ]
}
```

The URL filter syntax uses several special characters to match patterns effectively. The double pipe (`||`) at the beginning matches the beginning of a domain, the caret (`^`) matches the end of a domain or the end of a URL segment, and the asterisk (`*`) acts as a wildcard. This syntax gives you fine-grained control over which URLs your rules match.

You can also block multiple resource types in a single rule by specifying them as an array. This is useful for creating comprehensive blocking rules that target specific categories of content:

```json
{
  "rules": [
    {
      "id": 2,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": ".*\\.advertisement\\.com",
        "resourceTypes": ["script", "image", "sub_frame", "main_frame"]
      }
    }
  ]
}
```

### Redirecting Requests

Another powerful capability of DeclarativeNetRequest is the ability to redirect requests to different URLs. This is useful for blocking content by redirecting it to an empty page, for URL shortening extensions, or for implementing custom routing logic.

To redirect a request, use the "redirect" action type and specify the destination URL:

```json
{
  "rules": [
    {
      "id": 3,
      "priority": 1,
      "action": {
        "type": "redirect",
        "redirect": { "url": "https://example.com/blocked.html" }
      },
      "condition": {
        "urlFilter": "||malicious-site.com^",
        "resourceTypes": ["main_frame"]
      }
    }
  ]
}
```

For more sophisticated redirection, you can use URL transforms that modify parts of the original URL. This is particularly useful when you want to redirect to a similar but safer version of a URL:

```json
{
  "rules": [
    {
      "id": 4,
      "priority": 1,
      "action": {
        "type": "redirect",
        "redirect": {
          "transform": {
            "scheme": "https",
            "host": "redirected.example.com"
          }
        }
      },
      "condition": {
        "urlFilter": "||original.example.com^",
        "resourceTypes": ["main_frame"]
      }
    }
  ]
}
```

---

## Modifying Headers with DeclarativeNetRequest {#modifying-headers}

Header modification is one of the most powerful features of DeclarativeNetRequest, enabling extensions to add, remove, or modify HTTP headers on both requests and responses. This capability is essential for implementing privacy features, debugging tools, and various extension functionalities.

### Modifying Request Headers

Request headers can be modified before they are sent to the server. This is useful for adding custom headers, removing tracking headers, or modifying authentication headers. To modify request headers, use the "modifyHeaders" action type:

```json
{
  "rules": [
    {
      "id": 5,
      "priority": 1,
      "action": {
        "type": "modifyHeaders",
        "requestHeaders": [
          { "header": "X-Custom-Extension-Header", "operation": "set", "value": "my-extension-value" },
          { "header": "Do-Not-Track", "operation": "set", "value": "1" }
        ]
      },
      "condition": {
        "urlFilter": ".*",
        "resourceTypes": ["xmlhttprequest", "fetch"]
      }
    }
  ]
}
```

The modifyHeaders action supports four operations: "set" to set a header value (adding it if it doesn't exist), "append" to add to an existing header value, "remove" to delete a header entirely, and "remove" with an empty value to clear specific headers.

### Modifying Response Headers

Response headers can be modified after the server responds but before the browser processes the content. This enables various powerful use cases, including adding CORS headers, modifying caching headers, or stripping tracking cookies from headers:

```json
{
  "rules": [
    {
      "id": 6,
      "priority": 1,
      "action": {
        "type": "modifyHeaders",
        "responseHeaders": [
          { "header": "Access-Control-Allow-Origin", "operation": "set", "value": "*" },
          { "header": "Set-Cookie", "operation": "remove" }
        ]
      },
      "condition": {
        "urlFilter": "||api.example.com^",
        "resourceTypes": ["xmlhttprequest"]
      }
    }
  ]
}
```

When modifying response headers, be aware that some headers are protected and cannot be modified by extensions. These include security-sensitive headers like Content-Security-Policy and a few others that Chrome reserves for its own use.

---

## Loading and Managing Rules in Your Extension {#loading-managing-rules}

Now that you understand how to create rules, you need to know how to load them in your extension's background service worker and manage them programmatically. This section covers the JavaScript API for working with DeclarativeNetRequest.

### Loading Static Rules from Files

The most common approach is to define rules in static JSON files and load them through the manifest. This approach is simple and efficient, as the rules are evaluated by Chrome without requiring any JavaScript execution:

In your manifest.json, specify the rule files:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "declarative_net_request": {
    "rule_files": [
      "rules/block_ads.json",
      "rules/redirects.json"
    ]
  }
}
```

The rules are automatically loaded when your extension starts. Chrome will apply these rules to all matching network requests without requiring any additional code in your service worker.

### Dynamic Rule Management

For more flexible rule management, you can add, update, and remove rules programmatically using the chrome.declarativeNetRequest API. This is useful for extensions that need to let users toggle rules on and off or add custom rules:

```javascript
// background.js - Service Worker

// Add new rules dynamically
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 100,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: "||new-blocked-domain.com^",
        resourceTypes: ["script"]
      }
    }
  ],
  removeRuleIds: [1, 2] // Remove rules with IDs 1 and 2
}).then(() => {
  console.log("Rules updated successfully");
}).catch(error => {
  console.error("Error updating rules:", error);
});
```

You can also query the currently active rules to understand what's being applied:

```javascript
// Get all dynamic rules
chrome.declarativeNetRequest.getDynamicRules()
  .then(rules => {
    console.log("Current dynamic rules:", rules);
  });

// Get all rules from a specific rule set
chrome.declarativeNetRequest.getAvailableStaticRuleCount()
  .then(count => {
    console.log("Available static rule quota:", count);
  });
```

---

## Advanced Rule Techniques {#advanced-techniques}

With the basics covered, let's explore some advanced techniques that will help you build more sophisticated network filtering capabilities.

### Using Regex URL Filters

For complex matching requirements, DeclarativeNetRequest supports regular expression URL filters. This gives you much more flexibility than the basic wildcard syntax:

```json
{
  "rules": [
    {
      "id": 10,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": ".*\\.(jpg|png|gif|webp)$",
        "regexFilter": ".*",
        "resourceTypes": ["image"],
        "isUrlFilterCaseSensitive": false
      }
    }
  ]
}
```

Regular expression filters are more powerful but also more resource-intensive than basic URL filters. Use them when you need complex pattern matching that isn't possible with the standard filter syntax.

### Rule Priority and Conflict Resolution

When multiple rules could apply to the same request, Chrome uses a priority system to determine which rule wins. Understanding this system is crucial for creating predictable behavior in your extension.

Rules with higher priority values are evaluated first. When multiple rules have the same priority, they are evaluated in order of their rule ID. You can explicitly set priority in your rules:

```json
{
  "rules": [
    {
      "id": 20,
      "priority": 100,
      "action": { "type": "allow" },
      "condition": {
        "urlFilter": "||trusted-site.com^",
        "resourceTypes": ["script"]
      }
    },
    {
      "id": 21,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": ".*",
        "resourceTypes": ["script"]
      }
    }
  ]
}
```

In this example, scripts from trusted-site.com are always allowed (priority 100), while all other scripts are blocked (priority 1). The allow action takes precedence over block when the priorities are evaluated.

### Testing and Debugging Rules

Testing DeclarativeNetRequest rules can be challenging since the rules are evaluated internally by Chrome. Here are some strategies for debugging:

Use the chrome.declarativeNetRequest.getMatchedRules API to see which rules are matching:

```javascript
chrome.declarativeNetRequest.getMatchedRules({})
  .then(result => {
    result.rulesMatchedInfo.forEach(match => {
      console.log("Rule matched:", match.rule.ruleId);
      console.log("Request URL:", match.request.url);
    });
  });
```

You can also use Chrome's extension pages to view logs and test your rules. Visit chrome://extensions and enable developer mode, then use the "Service Worker" link to access console logs from your background script.

---

## Best Practices and Performance Optimization {#best-practices}

Creating functional rules is only part of the equation. Following best practices ensures your extension performs well, maintains user privacy, and provides a good user experience.

### Rule Quotas and Limitations

Chrome imposes limits on the number of rules you can use. As of the current API version, you can have up to 30,000 static rules per rule set and up to 5,000 dynamic rules. However, each Chrome profile has a global limit that considers all extensions installed.

To optimize within these limits, combine similar rules where possible and remove rules that are no longer needed. Regularly audit your rules to ensure they're all serving a purpose.

### Performance Considerations

Every rule adds some processing overhead, so it's important to optimize your rule set for performance. Here are some tips:

Use the most specific URL filters possible rather than overly broad patterns. A rule that matches `||ads.example.com^` is more efficient than `.*example\.com.*` because Chrome can quickly determine domain matches without evaluating a regex.

Group related rules into the same rule set to minimize the number of rule sets Chrome needs to evaluate. While separate rule sets are useful for user-controllable toggles, avoid creating many small rule sets for rules that are always active together.

### User Privacy Considerations

When implementing network filtering, always consider user privacy. The DeclarativeNetRequest API is designed to be privacy-preserving, but how you use it matters:

Be transparent about what your extension does and what rules it applies. Users should understand what content is being blocked or modified.

Avoid collecting or transmitting any data about users' network requests. The API is designed to work without sending request data to external servers.

Provide users with meaningful controls over what rules are applied. Allow them to whitelist sites or disable specific categories of filtering.

---

## Conclusion {#conclusion}

The DeclarativeNetRequest API is an essential tool for Chrome extension developers building network filtering, privacy protection, or content control features. Its declarative nature provides excellent performance while maintaining user privacy—a key consideration in modern extension development.

Throughout this tutorial, you've learned the fundamental concepts of rules, rule sets, and actions, explored how to configure your manifest for DeclarativeNetRequest, and gained hands-on experience creating blocking, redirecting, and header-modifying rules. You've also discovered advanced techniques like regex filtering, priority management, and performance optimization strategies.

As you continue developing your extension, remember to test thoroughly across different scenarios and browsers, stay updated with Chrome's API changes, and always prioritize user privacy and experience. The DeclarativeNetRequest API provides powerful capabilities—use them responsibly to create extensions that users trust and value.

With this knowledge, you're now equipped to build sophisticated network filtering extensions that leverage the full power of Manifest V3. Start experimenting with your own rule sets, and don't hesitate to explore the additional possibilities that the DeclarativeNetRequest API offers.

---
## Turn Your Extension Into a Business
Ready to monetize? The Extension Monetization Playbook covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Built by theluckystrike at zovo.one*