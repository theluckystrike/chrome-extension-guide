# Contributing to Chrome Extension Guide

Thank you for your interest in contributing to the Chrome Extension Guide! This project exists to make Chrome extension development accessible to everyone, from complete beginners to experienced developers building production-ready extensions. We believe that high-quality, well-documented resources are essential for growing the extension development community, and we're excited to have you join us in this mission.

Whether you're a seasoned Chrome extension developer, a technical writer passionate about explaining complex concepts, or someone just starting their journey with extensions, there are many ways you can contribute to this project. Every contribution—whether it's a new guide, a bug fix, a translation, or even a small correction—helps make our community stronger and our resources better for everyone.

## Ways to Contribute

The Chrome Extension Guide thrives on community contributions. There are several meaningful ways you can help us build the most comprehensive resource for extension developers:

**Writing New Guides and Articles**: If you have expertise in a particular aspect of Chrome extension development—whether it's working with specific APIs, implementing design patterns, or solving common challenges—we'd love to help you share that knowledge. New guides on topics like advanced debugging techniques, performance optimization, security hardening, or integration with specific frameworks can provide immense value to other developers.

**Improving Existing Articles**: Even the best documentation can be improved. You can help by fixing errors, clarifying confusing explanations, adding more practical examples, expanding thin sections, or updating content that has become outdated due to changes in Chrome's APIs or best practices. Every improvement makes the guide more useful for the community.

**Code Examples and Sample Projects**: High-quality, runnable code examples are the heart of any developer guide. If you've built extensions that demonstrate interesting patterns or solve common problems, consider contributing code snippets or even full sample projects that others can learn from and build upon.

**Translations**: Chrome extension development is a global community. If you're fluent in a language other than English, translating existing guides or creating multilingual versions can help make this resource accessible to developers around the world who prefer learning in their native language.

**Bug Reports and Feature Requests**: If you find incorrect information, broken links, or missing content, please let us know through GitHub Issues. Similarly, if there are topics you'd like to see covered or features that would improve the guide, your suggestions help us prioritize what to build next.

**Reviewing Pull Requests**: As the project grows, reviewing contributions from other contributors becomes increasingly valuable. If you have expertise in a particular area, your feedback on pull requests helps maintain quality and ensures accuracy.

## Getting Started

Ready to start contributing? Here's how to set up your development environment and submit your first contribution:

1. **Fork the Repository**: Visit the Chrome Extension Guide repository on GitHub and click the "Fork" button. This creates your own copy of the repository where you can make changes without affecting the original project.

2. **Clone Your Fork**: Clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chrome-extension-guide.git
   cd chrome-extension-guide
   ```

3. **Create a Branch**: Create a new branch for your changes. We use a naming convention to keep things organized:
   - For new articles: `content/your-topic` (e.g., `content/offscreen-documents`)
   - For fixes and improvements: `fix/description` (e.g., `fix/typos-in-storage-guide`)

4. **Make Your Changes**: Edit existing files or create new ones following our article guidelines (detailed below). Test your changes locally if possible.

5. **Submit a Pull Request**: Push your branch to your fork and open a pull request against the `main` branch of the original repository. Fill out the PR template with details about your changes.

## Article Guidelines

Consistency in our articles helps readers navigate the guide easily and find the information they need. Please follow these guidelines when writing new content:

### Length Requirements

New guides should be comprehensive and thorough. We require a minimum of 1,500 words for new articles to ensure adequate coverage of the topic. This length allows for proper introductions, detailed explanations, multiple code examples, and practical guidance.

### Structure

All articles should follow a consistent structure that readers can expect:

- **Introduction**: Provide 2-3 paragraphs introducing the topic, explaining why it matters, and outlining what readers will learn.
- **Main Sections**: Use H2 headings for major sections and H3 headings for subsections. Break complex topics into logical chunks.
- **Code Examples**: Include practical code examples throughout the article to demonstrate concepts in action.
- **Best Practices**: Summarize key recommendations in a bulleted list when applicable.
- **Common Mistakes**: Help readers avoid pitfalls by documenting what to avoid.
- **Conclusion**: Wrap up with a summary and suggested next steps.
- **Related Guides**: Link to other relevant articles within the guide to help readers discover more content.

### Code Examples

All code examples in the Chrome Extension Guide must meet high standards:

- **Language**: Use TypeScript for all code examples. It's the preferred language for modern extension development and provides better type safety and developer experience.
- **Completeness**: Code examples must be complete and runnable. Don't include snippets that require readers to fill in missing parts.
- **Comments**: Add comments explaining the "why" behind code, not the "what." Explain design decisions, important caveats, and non-obvious implementations.
- **Modern Practices**: Use contemporary JavaScript/TypeScript patterns. Prefer `const` and `let` over `var`. Use async/await over Promise chains. Include appropriate type annotations.

### Jekyll Front Matter

Every article must include Jekyll front matter at the top of the file:

```yaml
---
layout: default
title: "Your Title Here"
description: "SEO-friendly description under 160 characters"
permalink: /guides/your-article-slug/
---
```

The `title` field should be descriptive and include "Chrome Extension" when relevant. The `description` should be concise and optimized for search engines, staying under 160 characters. The `permalink` should follow the pattern `/guides/chrome-extension-your-topic/` for consistency.

### File Naming

New articles should follow our naming convention: `chrome-extension-[topic].md` in the `docs/guides/` directory. For example, a guide about the storage API would be named `chrome-extension-storage-api.md`.

### Images

If your article includes images, place them in the `assets/images/guides/` directory. Use descriptive filenames that indicate what the image shows, such as `manifest-v3-fields.png` or `service-worker-lifecycle-diagram.png`. Include alt text when referencing images in your content.

### Internal and External Links

Link to related articles within the guide using relative paths. This helps readers discover more content and keeps the guide cohesive. When relevant, also link to official Chrome Extension documentation to provide authoritative references for API details and official guidance.

## Article Template

Use this template as a starting point for new articles:

```markdown
---
layout: default
title: ""
description: ""
permalink: /guides/chrome-extension-your-topic/
---

# Your Title

## Introduction
[2-3 paragraphs introducing the topic]

## Section 1
[Content with code examples]

## Section 2
[Content with code examples]

## Best Practices
[Bulleted list]

## Common Mistakes
[What to avoid]

## Conclusion
[Summary and next steps]

## Related Guides
- [Link to related guide 1]
- [Link to related guide 2]

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
```

## Code Style

Consistent code style improves readability and helps contributors quickly understand examples. Please follow these conventions:

- **TypeScript Preferred**: Use TypeScript for all code examples. It provides better type safety and matches modern extension development practices.
- **Variables**: Use `const` by default, and `let` only when reassignment is necessary. Never use `var`.
- **Async Code**: Prefer async/await over `.then()` chains for cleaner, more readable asynchronous code.
- **Type Annotations**: Include type annotations for function parameters, return types, and variables to improve code clarity and catch errors early.
- **Meaningful Names**: Use descriptive variable and function names that clearly communicate purpose. Avoid single-letter names except in standard contexts like loop counters.
- **Comments**: Add comments that explain the reasoning behind code decisions, not what the code does. Explain why a particular approach was chosen, what edge cases are handled, and any important caveats.

## Pull Request Guidelines

To help us review and merge your contributions efficiently, please follow these guidelines:

- **One Topic Per PR**: Keep each pull request focused on a single topic or change. This makes reviews easier and reduces the chance of conflicts.
- **Descriptive Title**: Use a clear, descriptive title that summarizes what your PR does. "Add new guide about offscreen documents" is better than "Update" or "My changes."
- **Detailed Description**: Explain what you changed, why you made those changes, and how readers will benefit. For new articles, include the word count to help editors plan content.
- **Self-Review**: Before submitting, review your changes for clarity, accuracy, and adherence to our style guide. Check that all links work and code examples are correct.
- **Respond to Feedback**: Reviewers may suggest changes or ask questions. Please respond to feedback within 48 hours to keep the review process moving forward.

## Code of Conduct

We are committed to creating a welcoming and inclusive community for all contributors. Please be respectful and constructive in all interactions. Treat fellow contributors with kindness, appreciate diverse perspectives, and provide constructive feedback that helps everyone improve. Harassment, discrimination, and disrespectful behavior have no place in our community.

## Questions?

If you have questions about contributing, need help getting started, or want to discuss ideas before making a contribution, please don't hesitate to reach out. You can open a GitHub Issue for bug reports and feature requests, or use GitHub Discussions for questions and community conversations. We welcome dialogue and are happy to help you find the best way to contribute.

We look forward to your contributions and to building the best Chrome Extension development resource together!

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
