---
layout: default
title: "Chrome Extension Open Source — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Guide to Open-Sourcing Chrome Extensions

This guide covers the process, benefits, and best practices for open-sourcing your Chrome extension.

---

## Why Open Source?

- **Trust**: Users inspect code, verify security, understand data handling
- **Community Contributions**: Others submit bug fixes and features
- **Portfolio**: Demonstrates your skills to employers or clients
- **Faster Iteration**: Community feedback helps prioritize features

---

## License Selection

| License | Best For |
|---------|----------|
| **MIT** | Maximum adoption, commercial projects |
| **Apache 2.0** | Patent protection matters |
| **GPL v3** | Enforcing open-source throughout ecosystem |

**Warning**: Linking to GPL libraries may require GPL compatibility.

Cross-ref: `docs/guides/license-mit.md`

---

## Repository Structure

```
src/     # Source code
docs/    # Documentation
.github/ # Workflows, templates
tests/   # Test files
README.md
LICENSE
.gitignore
```

---

## README Essentials

```markdown
# Extension Name

Brief description.

## Chrome Web Store
[Install from Chrome Web Store](https://chrome.google.com/webstore/detail/...)

## Development Setup
pnpm install && pnpm build

## Contributing
See CONTRIBUTING.md
```

Cross-ref: `docs/guides/contributing-guide.md`

---

## Separating Secrets

Never commit sensitive data. Use `.env` files (gitignored), inject secrets at build time. Cross-ref: `docs/guides/security-best-practices.md`

---

## Reproducible Builds

Pin dependency versions, use lockfiles, generate checksums, tag releases (`git tag v1.2.0`).

---

## CI/CD for Extensions

Automate builds: run linters, type checkers, tests on every PR. Cross-ref: `docs/guides/ci-cd-pipeline.md`

---

## Contributor Guidelines

Create `CONTRIBUTING.md` with bug reporting, PR workflow, code style, and testing requirements.

---

## Handling Forks

Track forks for attribution. GPL projects: forks must also be open source. Cross-ref: `docs/guides/fork-policy.md`

---

## GitHub Actions for CWS Publishing

```yaml
name: Publish to CWS
on: release
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install && npm run build
      - uses: mna/publish-chrome-extension@v1
        with:
          file-path: dist/extension.zip
          client-id: ${{ secrets.CWS_CLIENT_ID }}
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
```

Cross-ref: `docs/publishing/publishing-guide.md`

---

## Security: Responsible Disclosure

Create `SECURITY.md` with vulnerability reporting contact. Cross-ref: `docs/guides/security-best-practices.md`

---

## Monetization with Open Source

Offer premium features, use extension as lead magnet, accept donations via GitHub Sponsors. Cross-ref: `docs/publishing/monetization-strategies.md`

---

## Related Guides

- `docs/guides/ci-cd-pipeline.md`
- `docs/publishing/publishing-guide.md`
- `docs/guides/security-best-practices.md`
