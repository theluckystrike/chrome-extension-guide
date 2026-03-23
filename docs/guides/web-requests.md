---
layout: default
title: "Chrome Extension Web Requests. How to Intercept and Modify Network Traffic"
description: "A comprehensive guide to intercepting and modifying network traffic in Chrome extensions using chrome.webRequest API and declarativeNetRequest for Manifest V3."
canonical_url: "https://bestchromeextensions.com/guides/web-requests/"
---

Chrome Extension Web Requests. How to Intercept and Modify Network Traffic

Overview

Chrome extensions have powerful capabilities to intercept, analyze, and modify network traffic flowing through the browser. This functionality is essential for building ad blockers, developer tools, privacy extensions, API testing utilities, and debugging utilities. Understanding the network request APIs is fundamental to creating extensions that need to interact with web traffic beyond simple content scripts.

Chrome provides two primary APIs for working with network requests: the chrome.webRequest API for observing and analyzing traffic, and the declarativeNetRequest API (Manifest V3) for blocking and modifying requests through declarative rules. Each serves different purposes and has distinct permission requirements that extension developers must understand.

The chrome.webRequest API

The chrome.webRequest API enables extensions to observe network requests and, in certain configurations, intercept and modify them. This API fires events at various stages of the request lifecycle, allowing developers to hook into almost any aspect of HTTP communication.

The request lifecycle includes several key events that fire in sequence. The onBeforeRequest event fires when a request is about to be initiated, this is the earliest point where you can intercept a request and either cancel it or redirect it to a different URL. The onBeforeSendHeaders event fires just before the request headers are sent, providing an opportunity to add, remove, or modify headers such as User-Agent, Accept-Language, or custom headers your extension requires.

When the server responds, the onHeadersReceived event fires with the response headers, allowing you to read or modify headers like Content-Type, Cache-Control, or Set-Cookie. The onAuthRequired event fires when the server requests authentication, enabling your extension to provide credentials programmatically. Finally, onCompleted fires when the request finishes successfully, and onErrorOccurred fires if something goes wrong.

To use the webRequest API, you must declare the `"webRequest"` permission in your manifest.json. Additionally, you need host permissions for the URLs you want to intercept, for example, `"https://*.example.com/*"` to observe requests to that domain. The API supports filtering by URL patterns, request types (like script, image, xmlhttprequest), and tab IDs.

One critical consideration for Manifest V3 is that the blocking and modification capabilities of webRequest are significantly restricted. While you can still observe all requests without additional permissions, actually blocking or modifying requests requires either staying on Manifest V2 or using the enterprise policy workaround in V3. For public extensions, the recommended approach is to use the declarativeNetRequest API.

declarativeNetRequest for Manifest V3

The declarativeNetRequest API is the Manifest V3 replacement for the blocking capabilities of webRequest. Instead of writing code that runs for each request, you define declarative rules that the browser applies natively, resulting in better performance and improved privacy semantics.

This API works through rule sets that you bundle with your extension or load dynamically. Rules can block requests entirely, redirect them to different URLs, modify request or response headers, or upgrade HTTP requests to HTTPS. The browser processes these rules natively, which means your extension's service worker doesn't need to wake up for every network request, significantly improving efficiency.

To use declarativeNetRequest, you need to declare the `"declarativeNetRequest"` permission in your manifest. For static rules bundled with your extension, you also need to specify rule resources in the manifest's `"declarative_net_request"` field, pointing to JSON rule files. Host permissions are still required for the URLs your rules affect, but you can now block or modify requests with a simpler permission model than the old blocking webRequest approach.

Request Blocking Implementation

Blocking requests is one of the most common use cases for network interception in extensions. Whether you're building an ad blocker, a content filter, or a productivity tool that blocks distracting websites, understanding how to block requests programmatically is essential.

With webRequest in Manifest V2, blocking was straightforward, you'd add a listener for onBeforeRequest and return an object with `cancel: true`. In Manifest V3, you transition to declarative rules. A basic block rule in declarativeNetRequest looks like this: you specify a condition with URL filters and resource types, and set the action type to "block". The browser then automatically prevents matching requests from completing.

For more complex blocking scenarios, you can combine blocking with other conditions. For example, you might block requests to certain domains only during specific hours, or block resources of type "image" on particular websites. Dynamic rules allow you to update blocking rules at runtime based on user preferences or external configuration, giving flexibility without requiring extension updates.

Header Modification Techniques

Modifying HTTP headers is another powerful capability that enables numerous extension use cases. Common applications include adding authentication tokens to outgoing requests, removing tracking cookies, modifying User-Agent strings for testing, or adding CORS headers to enable cross-origin requests that would otherwise be blocked.

The webRequest API provides access to both request and response headers. For request headers, the onBeforeSendHeaders event lets you add, remove, or modify headers before they're sent to the server. For response headers, onHeadersReceived lets you do the same with headers coming back from the server. You must specify `["requestHeaders"]` or `["responseHeaders"]` in the extraInfoSpec array to access header data.

In declarativeNetRequest, header modification uses the "modifyHeaders" action type. You can specify a list of header operations, each with an action (set, remove, or append), the header name, and optionally a value. For example, to add a custom header to all requests matching certain criteria, you'd define a rule with the appropriate URL filter and a modifyHeaders action that sets your custom header.

When modifying headers, be aware of certain restrictions. Some headers are considered "unsafe" and cannot be modified by extensions, this includes headers like Host, Content-Length, and cookies in certain contexts. Additionally, modifications to request headers only affect the extension's view of the request; the browser may have its own handling for certain headers that takes precedence.

Redirect Rules and URL Manipulation

Redirecting requests is essential for many extensions, from URL shorteners to ad blockers that redirect tracking domains to neutral pages, to developer tools that point API endpoints to local servers. Both webRequest and declarativeNetRequest support redirect functionality.

With webRequest, you return a `redirectUrl` property in your listener's return value. The browser then redirects the request to your specified URL before it's sent. This works for both simple redirects and complex logic where you might construct new URLs based on the original request's properties.

DeclarativeNetRequest offers similar functionality through the "redirect" action type. You can specify a redirect URL directly, or use the "regexSubstitution" option for more dynamic redirects that use regular expressions to transform the original URL. This is particularly useful for transforming URLs based on patterns, for example, redirecting all HTTP requests to their HTTPS equivalents.

Redirects can also be combined with other rule types. An extension might first block certain requests, redirect others, and modify headers on the remaining requests, all using the same declarative rule system. This flexibility makes declarativeNetRequest a powerful foundation for building sophisticated network manipulation tools.

Performance and Best Practices

When working with network request APIs, performance should be a primary consideration. Each event listener that matches "<all_urls>" will fire for every single network request in the browser, which can be thousands per minute during normal browsing. Optimizing your URL filters to match only the requests you actually need to process is crucial.

Use specific URL patterns rather than wildcards whenever possible. If you only need to observe requests to api.example.com, filter to "*://api.example.com/*" rather than "<all_urls>". Similarly, filter by request type if you only care about XHR calls or images, the types array in your filter options significantly reduces the number of events your code processes.

For declarativeNetRequest rules, the browser performs rule matching natively, which is much more efficient than JavaScript-based interception. However, having too many rules or overly complex regex patterns can still impact performance. Keep your rule sets focused and test the performance impact of your rules in realistic browsing scenarios.

Related Articles

- [WebRequest API Patterns](web-request-patterns.md)
- [Network Interception Patterns](../patterns/network-interception.md)
- [Manifest V3 Migration Guide](../mv3/mv3-migration-cheatsheet.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
