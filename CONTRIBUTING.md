Contributing to Chrome Extension Guide

Thank you for your interest in contributing to the Chrome Extension Guide! This document outlines how you can contribute to this project.

How to Contribute

Reporting Issues

If you find a bug, typo, or have a suggestion for improvement:

1. Check if there's already an existing issue
2. If not, create a new issue using the appropriate template:
   - [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
   - [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)
   - [Documentation Request](.github/ISSUE_TEMPLATE/documentation.md)
3. Provide as much detail as possible, including:
   - Clear description of the issue
   - Steps to reproduce (for bugs)
   - Expected vs. actual behavior
   - Relevant code snippets or links

Pull Requests

We welcome pull requests for:

- Bug fixes
- New documentation
- Code improvements
- New features
- Translation updates

PR Process

1. Fork the repository and create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Test your changes to ensure they work correctly
4. Update documentation if your changes affect the API or usage
5. Submit a pull request to the `main` branch
6. Respond to review feedback and make necessary changes

When submitting a PR, please include:
- A clear description of what the PR does
- Links to any related issues
- Screenshots for UI changes (if applicable)
- Test results (if applicable)

Getting Started

```bash
Clone your fork
git clone https://github.com/YOUR_USERNAME/chrome-extension-guide.git

Create a new branch
git checkout -b your-feature-branch

Make your changes and commit them
git add .
git commit -m "Description of your changes"

Push to your fork
git push origin your-feature-branch
```

Code Style

General Guidelines

- Use TypeScript for all code contributions
- Follow existing code conventions in the repository
- Keep code clean and well-commented
- Write meaningful commit messages

TypeScript Style

- Use strict TypeScript with explicit types
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Keep functions small and focused
- Use async/await over raw promises

Documentation Style

- Use clear, concise language
- Include code examples where helpful
- Follow the existing documentation structure
- Use Markdown formatting consistently

Git Commit Messages

- Use imperative mood ("Add feature" not "Added feature")
- Keep the first line under 72 characters
- Reference issues and PRs when applicable

```
Add TypeScript types for storage API

- Added type definitions for StorageArea
- Included schema validation types
- Fixed type inference for get/set methods

Closes #123
```

PR Requirements

Before submitting a pull request, ensure:

- [ ] Your code follows the style guidelines
- [ ] You have tested your changes locally
- [ ] Documentation is updated (if applicable)
- [ ] Your commits are atomic and well-organized
- [ ] PR description clearly explains the changes

Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

Please read the full [Code of Conduct](CODE_OF_CONDUCT.md) to understand what behavior is and isn't acceptable.

Recognition

Contributors will be recognized in the following ways:
- Listed in the README contributors section
- Mentioned in release notes for significant contributions

Questions?

If you have questions about contributing:
- Open an issue with the "question" label
- Check existing issues and discussions
- Review the documentation thoroughly

---

Thank you for contributing to make the Chrome Extension Guide better for everyone!
