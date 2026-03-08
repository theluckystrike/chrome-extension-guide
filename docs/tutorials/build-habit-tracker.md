---
layout: default
title: "Chrome Extension Habit Tracker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Habit Tracker Extension — Full Tutorial

## What We're Building
- Daily habit tracking with streak counting and check-off functionality
- Midnight reset using alarms, notification reminders for incomplete habits
- Options page for managing habits and reminder settings
- Weekly summary with visual chart, badge showing progress
- Uses `alarms`, `storage`, `notifications` permissions

## manifest.json — MV3, alarms + storage + notifications permissions, action with icon, background SW

## Step 1: Manifest Configuration
- Declare `alarms`, `storage`, `notifications` permissions in manifest.json
- Add `options_page` for habit management UI
- Background service worker for alarm handling
- Badge text updates for completed/total count

See: [Alarms API](../api-reference/alarms-api.md), [Notifications API](../api-reference/notifications-api.md), [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)

## Step 2: Storage Schema
- Habit object structure: `{ id, name, createdDate, completionLog: { "YYYY-MM-DD": boolean } }`
- Settings object: `{ reminderTime: "HH:MM", enabled: boolean }`
- Use `chrome.storage.local` for persistence across sessions

## Step 3: Popup UI
- Display today's date and habits as checkboxes
- Show streak count per habit (consecutive days completed)
- Visual indicator for completed vs remaining habits
- Quick add habit input at bottom

## Step 4: Streak Calculation Logic
- Iterate through completion log in reverse chronological order
- Count consecutive days where completionLog[date] === true
- Reset to 0 if a day is missed (excluding today if not yet completed)
- Store calculated streaks for display

## Step 5: Daily Reset with Alarms
- Create alarm using `chrome.alarms.create()` to fire at midnight
- Use `when` parameter with calculated milliseconds until midnight
- On alarm trigger: clear today's completion flags, recalculate streaks
- Re-schedule alarm for next day after reset

See: [Alarms API](../api-reference/alarms-api.md)

## Step 6: Notification Reminders
- Use `chrome.notifications.create()` for reminder alerts
- Check incomplete habits at reminder time
- Notification shows count of remaining habits
- Click notification opens popup for quick check-off
- Respect user's reminder time preference from options

See: [Notifications API](../api-reference/notifications-api.md)

## Step 7: Options Page
- List all habits with delete button
- Add new habit input with name field
- Reminder time picker (24-hour format)
- Toggle for enabling/disabling reminders
- Save settings to `chrome.storage.local`

## Step 8: Weekly Summary View
- Calculate completion rate for past 7 days
- Simple bar chart using HTML/CSS (no external libraries)
- Each bar represents one day, height based on completion percentage
- Display total habits, completed count, average streak

## Step 9: Badge Progress Indicator
- Update badge text with "X/Y" format (completed/total)
- Use `chrome.action.setBadgeText()` in popup and on completion
- Badge updates in real-time as habits are checked off
- Clear badge when all habits completed

## Testing
- Test midnight reset by simulating alarm
- Verify streak calculation across multiple days
- Check notification triggers at correct times
- Ensure data persists after browser restart

## What You Learned
- Alarm scheduling for daily tasks, notification API for reminders
- Storage schema design for habit tracking, streak calculation algorithms
- Options page implementation, badge updates, weekly analytics
