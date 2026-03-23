---
layout: post
title: "Building Chrome Extensions with StencilJS Web Components"
description: "Learn how to leverage StencilJS web components to build modern, efficient Chrome extensions. Discover the benefits of compiled web components, shared component libraries, and best practices for integrating StencilJS with Manifest V3."
date: 2025-01-23
categories: [tutorials, chrome-extensions, stenciljs]
tags: [stenciljs chrome extension, stencil web components extension, compiled web components chrome, web components, chrome extension development, manifest v3]
keywords: "stenciljs chrome extension, stencil web components extension, compiled web components chrome, stenciljs tutorial, web components chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/01/23/chrome-extension-stencil-js/"
---

# Building Chrome Extensions with StencilJS Web Components

Chrome extensions have evolved significantly over the years, and with the introduction of Manifest V3, developers are looking for more efficient ways to build maintainable, reusable, and performant extension interfaces. StencilJS, a powerful compiler for web components, offers an excellent solution for developers who want to leverage modern web standards while maintaining compatibility with Chrome's extension architecture. In this comprehensive guide, we will explore how to build Chrome extensions using StencilJS web components, understand the benefits of compiled web components, and discover best practices for creating scalable extension architectures.

Web components have revolutionized the way we think about building user interfaces. They provide a standardized way to create reusable components that work across different frameworks and browsers. StencilJS takes this concept further by acting as a compiler that generates standards-compliant web components with additional features like reactive data binding, virtual DOM, and TypeScript support. When combined with Chrome extensions, StencilJS enables developers to build sophisticated interfaces that are lightweight, fast, and easy to maintain.

---

## Why Use StencilJS for Chrome Extensions? {#why-stenciljs}

The decision to use StencilJS in Chrome extension development comes with several compelling advantages that make it stand out from traditional approaches. Understanding these benefits will help you determine whether StencilJS is the right choice for your next extension project.

### Framework Agnostic Architecture

One of the most significant advantages of StencilJS is its framework-agnostic nature. When you build web components with StencilJS, they are compiled to standards-compliant custom elements that work natively in any browser, including Chrome. This means your extension's UI components can be used across different parts of your extension—whether it is the popup, options page, or content scripts—without worrying about framework compatibility. You can also share these components with other projects or even publish them as npm packages for the broader development community.

The framework-agnostic approach is particularly valuable for Chrome extensions because the extension architecture consists of multiple distinct contexts: the background service worker, popup, options page, and content scripts running in web pages. With StencilJS, you can create a single component library that works seamlessly in all these contexts, reducing code duplication and ensuring consistency throughout your extension.

### Small Bundle Size and Performance

Performance is critical for Chrome extensions because users expect them to load quickly and consume minimal resources. StencilJS is designed with performance in mind, generating incredibly small bundle sizes through its innovative lazy-loading mechanism. The compiler only includes the code that is actually needed, resulting in extensions that load faster and use less memory.

Traditional framework-based approaches often require shipping entire frameworks like React or Vue with your extension, even if you only use a small fraction of their features. StencilJS eliminates this overhead by compiling to raw web components that leverage the browser's native capabilities. This approach can reduce your extension's JavaScript bundle by 50% or more compared to framework-based alternatives, leading to faster installation times, quicker popup opens, and a better overall user experience.

### TypeScript Support and Developer Experience

StencilJS is built with TypeScript at its core, providing excellent type safety and developer experience out of the box. TypeScript helps catch errors during development rather than at runtime, which is especially valuable when building complex extensions with multiple interacting components. The compiler provides intelligent autocompletion, inline documentation, and refactoring support that significantly speeds up development.

The TypeScript integration also makes it easier to maintain large extension codebases over time. When you or other developers need to make changes months or years after the initial implementation, the type annotations provide clear documentation of what each component expects and returns. This leads to fewer bugs and more confident code changes, which is essential for maintaining extensions that users rely on daily.

---

## Setting Up Your StencilJS Chrome Extension Project {#project-setup}

Now that we understand the benefits of using StencilJS, let us walk through the process of setting up a new Chrome extension project with StencilJS. This section covers the initial project creation, configuration, and folder structure.

### Initializing the Project

To get started, you will need Node.js installed on your machine. Create a new directory for your extension and initialize a StencilJS project within it. The Stencil CLI provides a convenient way to scaffold a new project with sensible defaults. You can choose between a component-focused starter or a complete application starter, depending on your needs.

For Chrome extensions, the component starter is often the best choice because it focuses on generating individual web components rather than a full application. However, you will likely want some additional tooling for building and packaging your extension. Consider setting up your project with a build configuration that targets both the component output and the extension manifest files.

After initializing the project, you will need to configure the Stencil compiler to output the correct format for Chrome extensions. This involves setting the target to ESNext or a specific browser version, configuring the output targets, and ensuring that the generated custom elements are properly registered. The Stencil configuration file allows you to specify these options and customize the build process to match your extension's requirements.

### Configuring the Chrome Extension Structure

Chrome extensions require a specific file structure that includes the manifest.json, HTML pages, JavaScript files, and various assets. When using StencilJS, you will need to integrate your web component build with the extension's file structure. One common approach is to have Stencil generate its output to a specific directory within your extension, which is then referenced by your HTML files.

The manifest.json file is the cornerstone of your Chrome extension. For Manifest V3, you will need to specify the extension name, version, permissions, and the various entry points such as the background service worker, popup, and options page. Your Stencil components will be loaded in these HTML pages, so you will need to ensure that the build process correctly references the generated JavaScript files.

When organizing your project, consider separating the Stencil components from the Chrome extension-specific code. This separation of concerns makes it easier to maintain and test your components, and it also allows you to reuse the same component library in different contexts if needed. Create separate directories for your extension pages, background scripts, and content scripts, while keeping your Stencil components in their own dedicated space.

---

## Creating Your First StencilJS Component for Chrome Extension {#first-component}

With the project set up, we can now create our first StencilJS component designed specifically for use in a Chrome extension. This section walks through the component creation process, from defining the component to using it in your extension's popup.

### Defining the Component

StencilJS components are created using TypeScript decorators that define the component's properties, state, and rendering logic. When building components for Chrome extensions, there are a few patterns and practices that will help you create more effective extension interfaces. Let us create a simple but practical component that demonstrates these concepts.

Consider a component that displays extension status and provides quick actions to the user. This could be the main component shown in your extension's popup, giving users immediate access to key features without needing to navigate through multiple pages. The component should be responsive, visually appealing, and performant, as it will be the first thing users see when interacting with your extension.

When defining your component, you can use Stencil's reactive properties to automatically re-render when data changes. This is particularly useful for Chrome extensions because you often need to display dynamic data such as settings, user preferences, or extension state. Stencil's reactivity system ensures that your UI stays in sync with your data without requiring manual DOM manipulation.

```typescript
import { Component, Prop, State, h } from '@stencil/core';

@Component({
  tag: 'extension-popup',
  styleUrl: 'extension-popup.css',
  shadow: true,
})
export class ExtensionPopup {
  @Prop() extensionName: string;
  @Prop() isEnabled: boolean = true;
  @State() private _clickCount: number = 0;

  private handleButtonClick = () => {
    this._clickCount++;
  };

  render() {
    return (
      <div class="popup-container">
        <h1>{this.extensionName}</h1>
        <p>Status: {this.isEnabled ? 'Active' : 'Disabled'}</p>
        <button onClick={this.handleButtonClick}>
          Clicked {this._clickCount} times
        </button>
      </div>
    );
  }
}
```

### Using the Component in Your Extension

Once your component is defined and compiled, using it in your Chrome extension's HTML is straightforward. You simply include the generated JavaScript file and add the custom element tag to your HTML. Stencil generates all the necessary registration code, so you do not need to worry about manually defining or registering your components.

In your popup.html or options.html, you would include the compiled script and use your custom element just like any standard HTML element:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <extension-popup extension-name="My Extension" is-enabled="true"></extension-popup>
  <script src="build/extension-popup.esm.js" type="module"></script>
</body>
</html>
```

This simplicity is one of the great benefits of using web components. The component behaves like any other HTML element, meaning you can style it with CSS, manipulate it with JavaScript, and place it anywhere in your extension's pages. Stencil's shadow DOM feature also provides style encapsulation, preventing your component styles from conflicting with the rest of your extension's styles.

---

## Interacting with Chrome Extension APIs {#chrome-apis}

Building a useful Chrome extension requires interacting with Chrome's extension APIs for features like storage, messaging, tabs, and more. StencilJS components can interact with these APIs just like regular JavaScript, but there are some patterns and best practices that will make your code cleaner and more maintainable.

### Accessing Chrome APIs from Components

Chrome provides a rich set of APIs that extensions can use to interact with the browser, web pages, and user data. When using StencilJS, you can access these APIs directly within your component classes. However, there are a few considerations to keep in mind to ensure your components work correctly in all extension contexts.

The chrome.storage API is one of the most commonly used extension APIs, allowing you to persist user settings and extension state across sessions. You can create utility functions that wrap the storage API with promises, making it easier to use with Stencil's asynchronous patterns. This approach also makes your code more testable because you can mock the storage functions during unit testing.

For messaging between different parts of your extension, Chrome uses a message-passing system that allows communication between content scripts, background scripts, and extension pages. You can integrate this messaging system into your Stencil components to send and receive messages from other parts of your extension. This is essential for features that require coordination between the popup and background service worker.

### Handling Permissions and Manifest Configuration

When your Stencil components need to access Chrome APIs that require permissions, you must declare those permissions in your manifest.json file. Understanding which permissions your extension needs is crucial for both security and user trust—requesting unnecessary permissions can make users hesitant to install your extension.

For most extensions, you will need to specify permissions in the manifest based on the APIs you use. Common permissions include storage for persisting data, tabs for interacting with browser tabs, activeTab for accessing the current tab, and scripting for injecting content scripts. Be sure to review the Chrome extension documentation for each API you use to understand what permissions are required.

It is also worth noting that some Chrome APIs are only available in certain contexts. For example, some APIs are available in content scripts but not in the popup, or vice versa. When building your Stencil components, consider which context they will be used in and design accordingly. You can use feature detection to provide graceful degradation when APIs are not available.

---

## Best Practices for StencilJS Chrome Extension Development {#best-practices}

As with any technology, there are established best practices that will help you build better Chrome extensions with StencilJS. Following these patterns will result in more maintainable, performant, and user-friendly extensions.

### Component Architecture and Reusability

Design your components with reusability in mind. Since StencilJS compiles to standards-compliant web components, your components should be generic enough to work in different contexts while still being specific enough to be useful. Create a component library that separates UI components from business logic, allowing you to mix and match components to build different extension pages.

Consider establishing a design system within your component library. This includes consistent colors, typography, spacing, and component patterns that give your extension a cohesive look and feel. StencilJS supports CSS custom properties, making it easy to expose design tokens that can be customized by extension users or adapted for different themes.

### State Management and Data Flow

Managing state effectively is crucial for complex extensions. StencilJS provides its own state management through properties and state decorators, but for larger applications, you might want to consider additional patterns. One approach is to use a centralized state management solution that different components can subscribe to, ensuring that all parts of your extension stay in sync.

When working with Chrome extension APIs, it is important to handle asynchronous operations correctly. Use async/await patterns and ensure that your components handle loading states and errors gracefully. This is especially important for operations that might take time, such as fetching data from storage or communicating with external services.

### Testing Your Components

Testing is essential for maintaining code quality, and StencilJS provides excellent testing utilities. You can write unit tests for your components using Stencil's testing framework, which is built on top of Jest and Puppeteer. These tests can verify that your components render correctly, respond to user interactions, and handle edge cases properly.

For Chrome extension-specific functionality, consider integration tests that test your components in the context of a running extension. This can involve loading your extension in Chrome and interacting with it through automated tests, verifying that all the pieces work together correctly. While more complex to set up, these tests catch issues that unit tests might miss.

---

## Advanced Patterns and Techniques {#advanced-patterns}

Once you have the basics down, there are several advanced patterns that can take your StencilJS Chrome extensions to the next level. These techniques can help you build more sophisticated features and improve the overall quality of your extension.

### Building a Shared Component Library

If you are building multiple Chrome extensions, creating a shared component library makes sense. StencilJS is particularly well-suited for this because it can output individual components or entire libraries that can be npm-installed in other projects. This approach ensures consistency across your extensions and reduces development time by allowing you to build components once and reuse them everywhere.

When creating a shared library, version it semantically and publish it to npm. This allows each of your extensions to specify which version of the component library they use, preventing unexpected breaking changes. Document your components thoroughly, including live demos if possible, so that developers using your library understand how each component works.

### Optimizing for Performance

Performance optimization is an ongoing process that should be considered throughout development. StencilJS provides several features that help with performance, but there are also extension-specific optimizations to keep in mind. For example, lazy-load components that are not immediately visible, use CSS containment where appropriate, and minimize DOM depth to improve rendering performance.

Chrome extensions have specific performance requirements because they run in the browser and can affect the user's browsing experience. Use Chrome's performance tools to profile your extension and identify bottlenecks. Pay particular attention to the popup loading time, as users expect it to appear instantly when they click the extension icon.

---

## Conclusion {#conclusion}

StencilJS offers a powerful and efficient way to build Chrome extensions using modern web standards. Its compiled web component approach provides excellent performance, framework agnosticism, and developer experience. By leveraging StencilJS, you can create extensions that are lightweight, maintainable, and capable of sharing components across multiple projects.

The combination of StencilJS and Chrome extensions represents a significant step forward in extension development. It allows developers to use the latest web technologies while maintaining compatibility with Chrome's extension platform. Whether you are building a simple utility extension or a complex productivity tool, StencilJS provides the foundation you need to create high-quality, professional-grade Chrome extensions.

As you continue to explore StencilJS for Chrome extension development, remember to follow best practices, test thoroughly, and focus on user experience. The web component standard is here to stay, and StencilJS makes it easier than ever to take advantage of this powerful technology in your extension projects.
