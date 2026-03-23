---
layout: default
title: "Chrome Extension Lorem Ipsum Generator — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-lorem-ipsum-generator/"
---
# Build a Lorem Ipsum Generator Extension — Full Tutorial

## What We're Building {#what-were-building}
- Generate placeholder text in multiple formats (paragraphs, sentences, words)
- One-click copy to clipboard with visual feedback
- Multiple word list variants: classic, business, tech, hipster
- Output formats: plain text, HTML paragraphs, markdown
- Context menu integration for right-click insertion
- Content script to fill focused inputs/textareas
- History panel, character count, keyboard shortcuts
- Uses `clipboardWrite`, `contextMenus`, `activeTab` permissions

## manifest.json — MV3, clipboardWrite + contextMenus + activeTab, action popup {#manifestjson-mv3-clipboardwrite-contextmenus-activetab-action-popup}

## Step 1: Manifest with clipboardWrite Permission {#step-1-manifest-with-clipboardwrite-permission}
- Declare `clipboardWrite` permission in manifest
- Add `contextMenus` permission for right-click integration
- Define popup with options UI, background service worker
- Reference `patterns/clipboard-patterns.md` for clipboard API usage

## Step 2: Popup UI with Generation Options {#step-2-popup-ui-with-generation-options}
- Dropdown: paragraphs / sentences / words
- Number input: count (1-100)
- Format selector: plain text, HTML, markdown
- Variant selector: classic, business, tech, hipster
- Generate button, copy button, clear history button
- Reference `guides/popup-patterns.md` for popup UI best practices

## Step 3: Lorem Ipsum Text Generator Engine {#step-3-lorem-ipsum-text-generator-engine}
- Word bank arrays for each variant (classic: standard lorem ipsum)
- Business: corporate, ROI, quarterly, synergy, stakeholders
- Tech: algorithm, scalable, deployment, blockchain, AI-driven
- Hipster: artisanal, sustainable, handcrafted, ethically-sourced
- Sentence builder: random word selection, proper punctuation
- Paragraph formatter: join sentences with proper spacing
- Format converters: plain ↔ HTML `<p>` tags ↔ markdown `**bold**`

## Step 4: Copy to Clipboard with One Click {#step-4-copy-to-clipboard-with-one-click}
- Use `navigator.clipboard.writeText()` for modern API
- Fallback to `document.execCommand('copy')` if needed
- Show toast/notification on successful copy
- Visual button state change (checkmark icon, green color)
- Reference `patterns/clipboard-patterns.md` for reliable copy implementation

## Step 5: Context Menu Integration {#step-5-context-menu-integration}
- Create `chrome.contextMenus.create()` on install
- Menu item: "Insert Lorem Ipsum" → submenu with variants
- On click: generate text, inject into focused element
- Use `activeTab` permission to get current tab
- Reference `api-reference/context-menus-api.md` for context menu setup

## Step 6: Content Script for Field Filling {#step-6-content-script-for-field-filling}
- Content script injected on demand
- Find focused element: `document.activeElement`
- Detect input/textarea, set `value` property
- Dispatch `input` event to trigger React/Vue reactivity
- Support contenteditable elements via `innerHTML`
- Handle security: only modify user's explicit focus

## Step 7: History & Character Count {#step-7-history-character-count}
- Store last 10 generated texts in `chrome.storage.local`
- Display history list in popup sidebar
- Click history item to re-copy or view
- Real-time character/word count display
- Clear history option with confirmation

## Step 8: Options & Keyboard Shortcuts {#step-8-options-keyboard-shortcuts}
- Options page: set default format, default count, preferred variant
- `chrome.commands.create()` for keyboard shortcut (e.g., Ctrl+Shift+L)
- Global shortcut generates and copies in one action
- Sync settings across devices via `storage.sync`

## Step 9: Testing {#step-9-testing}
- Verify clipboard works across domains
- Test context menu on various input types
- Check history persistence after browser restart
- Validate all format outputs (plain, HTML, markdown)
- Test keyboard shortcut when popup is closed

## What You Learned {#what-you-learned}
- Clipboard API with fallback strategies
- Context menu creation and handling
- Content script injection for form filling
- Storage for history and preferences
- Keyboard shortcuts in extensions
- Multiple text generation algorithms
- Format conversion between plain/HTML/markdown
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
