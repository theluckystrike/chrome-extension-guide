# Contributing to Chrome Extension Guide

Thank you for your interest in contributing to the Chrome Extension Guide! This document outlines how you can contribute to this project.

## How to Contribute

### Reporting Issues

If you find a bug, typo, or have a suggestion:

1. Check if there's already an existing issue
2. If not, create a new issue using the appropriate template:
   - [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) - For reporting errors or unexpected behavior
   - [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) - For suggesting new features or improvements
   - [Documentation Request](.github/ISSUE_TEMPLATE/documentation.md) - For documentation improvements

### Pull Requests

We welcome pull requests! Here's how to contribute:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b docs/your-feature-name`
3. **Make your changes** following our code style guidelines
4. **Test your changes** thoroughly
5. **Commit your changes**: `git commit -m 'Add some feature'`
6. **Push to your fork**: `git push origin docs/your-feature-name`
7. **Submit a Pull Request** to the `main` branch

### Quick Start for Documentation Contributions

```bash
# Clone the repository
git clone https://github.com/theluckystrike/chrome-extension-guide.git
cd chrome-extension-guide

# Create a new branch
git checkout -b docs/your-docs-branch

# Make your documentation changes
# Add your .md files to the appropriate docs/ folder

# Commit and push
git add .
git commit -m 'Add documentation for XYZ'
git push origin docs/your-docs-branch
```

## Code Style

### Documentation Style

- Use clear, concise language
- Include code examples where applicable
- Follow the existing documentation structure
- Use proper Markdown formatting with headings, lists, and code blocks

### TypeScript/JavaScript Examples

When writing code examples:

```typescript
// Use TypeScript for type safety
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define clear types
interface UserSettings {
  theme: "dark" | "light";
  notifications: boolean;
}

// Use meaningful variable names
const userSettings: UserSettings = {
  theme: "dark",
  notifications: true,
};
```

### General Guidelines

- Run `npm run lint` before committing (if available)
- Keep lines under 100 characters when possible
- Use meaningful commit messages
- Comment complex logic

## Pull Request Process

### Before Submitting

1. **Ensure your changes align with the project goals** - This is a Chrome extension development guide
2. **Test your examples** - Code examples should work
3. **Check for typos** - Use a spell checker
4. **Review existing documentation** - Follow the established patterns

### PR Requirements

- **Title**: Clear and descriptive
- **Description**: Explain what you changed and why
- **Screenshots**: For UI changes, include before/after images
- **Linked Issues**: Reference any related issues

### Review Process

1. Maintainers will review your PR
2. You may receive feedback or change requests
3. Once approved, your PR will be merged

## Issue Templates

We use GitHub issue templates to standardize contributions:

- **Bug Report** - For errors and unexpected behavior
- **Feature Request** - For new features and enhancements
- **Documentation** - For documentation improvements

Find these templates in [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/)

## Code of Conduct

This project follows a Code of Conduct to ensure a welcoming environment for everyone.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to understand the expectations for participation in our community.

## Getting Help

- **Discord**: Join our community for questions and discussions
- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bug reports and feature requests

## Recognition

Contributors will be acknowledged in the README.md and on our contributors page.

Thank you for contributing to the Chrome Extension Guide!
