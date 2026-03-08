---
layout: default
title: "Chrome Extension Lorem Ipsum Generator — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Lorem Ipsum Generator Extension — Full Tutorial

## What We're Building
- Generate placeholder text in multiple formats (paragraphs, sentences, words)
- One-click copy to clipboard with visual feedback
- Multiple word list variants: classic, business, tech, hipster
- Output formats: plain text, HTML paragraphs, markdown
- Context menu integration for right-click insertion
- Content script to fill focused inputs/textareas
- History panel, character count, keyboard shortcuts
- Uses `clipboardWrite`, `contextMenus`, `activeTab` permissions

## manifest.json — MV3, clipboardWrite + contextMenus + activeTab, action popup

## Step 1: Manifest with clipboardWrite Permission
- Declare `clipboardWrite` permission in manifest
- Add `contextMenus` permission for right-click integration
- Define popup with options UI, background service worker
- Reference `patterns/clipboard-patterns.md` for clipboard API usage

## Step 2: Popup UI with Generation Options
- Dropdown: paragraphs / sentences / words
- Number input: count (1-100)
- Format selector: plain text, HTML, markdown
- Variant selector: classic, business, tech, hipster
- Generate button, copy button, clear history button
- Reference `guides/popup-patterns.md` for popup UI best practices

## Step 3: Lorem Ipsum Text Generator Engine
- Word bank arrays for each variant (classic: standard lorem ipsum)
- Business: corporate, ROI, quarterly, synergy, stakeholders
- Tech: algorithm, scalable, deployment, blockchain, AI-driven
- Hipster: artisanal, sustainable, handcrafted, ethically-sourced
- Sentence builder: random word selection, proper punctuation
- Paragraph formatter: join sentences with proper spacing
- Format converters: plain ↔ HTML `<p>` tags ↔ markdown `**bold**`

## Step 4: Copy to Clipboard with One Click
- Use `navigator.clipboard.writeText()` for modern API
- Fallback to `document.execCommand('copy')` if needed
- Show toast/notification on successful copy
- Visual button state change (checkmark icon, green color)
- Reference `patterns/clipboard-patterns.md` for reliable copy implementation

## Step 5: Context Menu Integration
- Create `chrome.contextMenus.create()` on install
- Menu item: "Insert Lorem Ipsum" → submenu with variants
- On click: generate text, inject into focused element
- Use `activeTab` permission to get current tab
- Reference `api-reference/context-menus-api.md` for context menu setup

## Step 6: Content Script for Field Filling
- Content script injected on demand
- Find focused element: `document.activeElement`
- Detect input/textarea, set `value` property
- Dispatch `input` event to trigger React/Vue reactivity
- Support contenteditable elements via `innerHTML`
- Handle security: only modify user's explicit focus

## Step 7: History & Character Count
- Store last 10 generated texts in `chrome.storage.local`
- Display history list in popup sidebar
- Click history item to re-copy or view
- Real-time character/word count display
- Clear history option with confirmation

## Step 8: Options & Keyboard Shortcuts
- Options page: set default format, default count, preferred variant
- `chrome.commands.create()` for keyboard shortcut (e.g., Ctrl+Shift+L)
- Global shortcut generates and copies in one action
- Sync settings across devices via `storage.sync`

## Step 9: Testing
- Verify clipboard works across domains
- Test context menu on various input types
- Check history persistence after browser restart
- Validate all format outputs (plain, HTML, markdown)
- Test keyboard shortcut when popup is closed

## What You Learned
- Clipboard API with fallback strategies
- Context menu creation and handling
- Content script injection for form filling
- Storage for history and preferences
- Keyboard shortcuts in extensions
- Multiple text generation algorithms
- Format conversion between plain/HTML/markdown
