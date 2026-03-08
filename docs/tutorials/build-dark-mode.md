---
layout: default
title: "Chrome Extension Dark Mode — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Dark Mode Toggle Extension — Full Tutorial

## What We're Building
- One-click dark mode for any website using CSS filters
- Per-site preferences stored with `@theluckystrike/webext-storage`
- Toggle via toolbar icon, auto-apply on navigation
- Uses `activeTab`, `scripting`, `storage` permissions

## manifest.json — MV3, activeTab + scripting + storage, action with icon, background SW

## Step 1: Toggle on Icon Click
- `chrome.action.onClicked` listener in background
- Check domain state from storage, toggle, inject CSS via `chrome.scripting.executeScript`
- Update icon to show dark/light state

## Step 2: CSS Filter Dark Mode
- `html { filter: invert(1) hue-rotate(180deg); }`
- Re-invert images/videos: `img, video, canvas, svg { filter: invert(1) hue-rotate(180deg); }`
- Insert/remove `<style>` element with unique ID

## Step 3: Auto-Apply on Navigation
- Content script checks storage for domain preference on load
- `storage.watch('darkSites', ...)` for real-time toggle from background/popup
- Uses `@theluckystrike/webext-messaging` for background <-> content communication

## Step 4: Options Page
- Brightness/contrast sliders, exclude list, custom CSS per domain
- All preferences in `@theluckystrike/webext-storage` sync storage

## Step 5: Badge Indicator — show "ON" when dark mode active on current tab

## Alternative: Custom Stylesheet Injection — more control, per-site CSS files via web_accessible_resources

## Testing — various site types, image handling, per-site persistence, sync across devices

## What You Learned — scripting.executeScript, activeTab pattern, per-site preferences, CSS filters, storage.watch
