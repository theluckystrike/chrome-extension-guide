# Building a Habit Tracker Chrome Extension

## Overview

This guide covers building a production-ready Chrome extension for daily habit tracking with streak counting, reminder notifications, progress visualization, and cross-device synchronization using `chrome.storage.sync`.

## Architecture

The Habit Tracker extension follows a modular architecture:

```
src/
├── manifest.json          # Extension configuration
├── background/
│   └── service-worker.ts  # Handles alarms, sync, notifications
├── popup/
│   ├── popup.ts           # Popup entry point
│   ├── components/        # UI components
│   └── styles.css         # Popup styles
├── content/
│   └── content-script.ts  # Injected for additional features
├── shared/
│   ├── types.ts           # TypeScript interfaces
│   ├── storage.ts         # Storage abstraction layer
│   └── utils.ts           # Helper functions
└── options/
    └── options.ts          # Settings page
```

### Key Components

- **Service Worker**: Manages alarms, background sync, and notifications
- **Popup**: Quick access to mark habits complete
- **Options Page**: Configure habits, reminder times, and preferences
- **Shared Types**: Consistent TypeScript interfaces across all modules

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Habit Tracker Pro",
  "version": "1.0.0",
  "description": "Track daily habits with streaks and reminders",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "options_page": "options/options.html"
}
```

## TypeScript Implementation

### Shared Types (src/shared/types.ts)

```typescript
export interface Habit {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  archived: boolean;
  reminderTime?: string; // HH:MM format
  color?: string;
}

export interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
  completedAt: number;
}

export interface HabitWithStreak extends Habit {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletedDate?: string;
}

export interface ExtensionSettings {
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  defaultReminderTime: string;
  theme: 'light' | 'dark' | 'system';
}

export interface StorageSchema {
  habits: Habit[];
  logs: HabitLog[];
  settings: ExtensionSettings;
}
```

### Storage Layer (src/shared/storage.ts)

```typescript
import { StorageSchema, Habit, HabitLog, ExtensionSettings } from './types';

const DEFAULT_SETTINGS: ExtensionSettings = {
  syncEnabled: true,
  notificationsEnabled: true,
  defaultReminderTime: '09:00',
  theme: 'system'
};

export class StorageManager {
  private static instance: StorageManager;
  
  private constructor() {}
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }
  
  async getHabits(): Promise<Habit[]> {
    const data = await chrome.storage.sync.get('habits');
    return data.habits || [];
  }
  
  async saveHabit(habit: Habit): Promise<void> {
    const habits = await this.getHabits();
    const index = habits.findIndex(h => h.id === habit.id);
    
    if (index >= 0) {
      habits[index] = habit;
    } else {
      habits.push(habit);
    }
    
    await chrome.storage.sync.set({ habits });
  }
  
  async getLogs(): Promise<HabitLog[]> {
    const data = await chrome.storage.sync.get('logs');
    return data.logs || [];
  }
  
  async logCompletion(habitId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const logs = await this.getLogs();
    
    const existingLog = logs.find(
      log => log.habitId === habitId && log.date === today
    );
    
    if (!existingLog) {
      logs.push({
        habitId,
        date: today,
        completedAt: Date.now()
      });
      await chrome.storage.sync.set({ logs });
    }
  }
  
  async getSettings(): Promise<ExtensionSettings> {
    const data = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...data.settings };
  }
  
  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.sync.set({
      settings: { ...current, ...settings }
    });
  }
  
  async calculateStreak(habitId: string): Promise<{
    current: number;
    longest: number;
    total: number;
    lastCompletedDate?: string;
  }> {
    const logs = await this.getLogs();
    const habitLogs = logs
      .filter(log => log.habitId === habitId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (habitLogs.length === 0) {
      return { current: 0, longest: 0, total: 0 };
    }
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    
    // Calculate current streak
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasLog = habitLogs.some(log => log.date === dateStr);
      
      if (hasLog) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Not completed today yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    const sortedDates = habitLogs.map(l => l.date).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.floor(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }
    
    return {
      current: currentStreak,
      longest: longestStreak,
      total: habitLogs.length,
      lastCompletedDate: habitLogs[0]?.date
    };
  }
}
```

### Service Worker (src/background/service-worker.ts)

```typescript
import { StorageManager } from '../shared/storage';
import { Habit, HabitLog } from '../shared/types';

const storage = StorageManager.getInstance();

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Habit Tracker installed');
  await setupAlarms();
});

// Setup daily alarm for reminders
async function setupAlarms(): Promise<void> {
  const settings = await storage.getSettings();
  
  // Clear existing alarms
  chrome.alarms.clearAll();
  
  // Create a repeating alarm for checking reminders
  chrome.alarms.create('habit-reminder', {
    periodInMinutes: 60 // Check every hour
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'habit-reminder') {
    await checkReminders();
  }
});

async function checkReminders(): Promise<void> {
  const settings = await storage.getSettings();
  if (!settings.notificationsEnabled) return;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const habits = await storage.getHabits();
  const logs = await storage.getLogs();
  const today = new Date().toISOString().split('T')[0];
  
  for (const habit of habits) {
    if (habit.archived) continue;
    if (habit.reminderTime === currentTime) {
      // Check if already completed today
      const completedToday = logs.some(
        log => log.habitId === habit.id && log.date === today
      );
      
      if (!completedToday) {
        await showReminder(habit);
      }
    }
  }
}

async function showReminder(habit: Habit): Promise<void> {
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Habit Reminder',
    message: `Don't forget to complete: ${habit.name}`,
    buttons: [{ title: 'Mark Complete' }]
  });
}

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Extract habit ID from notification if stored
    // For simplicity, open popup
    chrome.action.openPopup();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STREAKS') {
    storage.getHabits().then(async habits => {
      const streaks = await Promise.all(
        habits
          .filter(h => !h.archived)
          .map(async h => ({
            habitId: h.id,
            ...await storage.calculateStreak(h.id)
          }))
      );
      sendResponse(streaks);
    });
    return true;
  }
});
```

### Popup Component (src/popup/popup.ts)

```typescript
import { StorageManager } from '../shared/storage';
import { HabitWithStreak } from '../shared/types';

const storage = StorageManager.getInstance();

interface HabitDisplay extends HabitWithStreak {
  completedToday: boolean;
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderHabits();
});

async function renderHabits(): Promise<void> {
  const container = document.getElementById('habits-container');
  if (!container) return;
  
  const habits = await storage.getHabits();
  const logs = await storage.getLogs();
  const today = new Date().toISOString().split('T')[0];
  
  const habitDisplays: HabitDisplay[] = await Promise.all(
    habits
      .filter(h => !h.archived)
      .map(async h => {
        const streak = await storage.calculateStreak(h.id);
        return {
          ...h,
          ...streak,
          completedToday: logs.some(l => l.habitId === h.id && l.date === today)
        };
      })
  );
  
  container.innerHTML = habitDisplays.map(habit => `
    <div class="habit-card ${habit.completedToday ? 'completed' : ''}">
      <div class="habit-info">
        <h3>${habit.name}</h3>
        <p class="streak">🔥 ${habit.currentStreak} day streak</p>
      </div>
      <button 
        class="complete-btn ${habit.completedToday ? 'done' : ''}"
        data-habit-id="${habit.id}"
        ${habit.completedToday ? 'disabled' : ''}
      >
        ${habit.completedToday ? '✓' : '○'}
      </button>
    </div>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.complete-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const habitId = (e.target as HTMLElement).dataset.habitId!;
      await storage.logCompletion(habitId);
      await renderHabits();
    });
  });
}
```

### Progress Chart (src/popup/chart.ts)

```typescript
import { StorageManager } from '../shared/storage';

export class ProgressChart {
  private storage: StorageManager;
  
  constructor() {
    this.storage = StorageManager.getInstance();
  }
  
  async renderWeeklyProgress(habitId: string): Promise<string> {
    const logs = await this.storage.getLogs();
    const habitLogs = logs.filter(l => l.habitId === habitId);
    
    const days: string[] = [];
    const data: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      
      days.push(dayName);
      data.push(habitLogs.some(l => l.date === dateStr) ? 1 : 0);
    }
    
    return this.generateChartSVG(days, data);
  }
  
  private generateChartSVG(days: string[], data: number[]): string {
    const width = 280;
    const height = 100;
    const barWidth = (width - 40) / 7;
    const maxBarHeight = height - 30;
    
    const bars = data.map((value, index) => {
      const barHeight = value * maxBarHeight;
      const x = 20 + index * barWidth;
      const y = height - 20 - barHeight;
      
      return `<rect 
        x="${x}" 
        y="${y}" 
        width="${barWidth - 4}" 
        height="${barHeight}" 
        fill="${value ? '#4CAF50' : '#e0e0e0'}" 
        rx="2"
      />`;
    }).join('');
    
    const labels = days.map((day, index) => {
      const x = 20 + index * barWidth + (barWidth - 4) / 2;
      return `<text x="${x}" y="${height - 5}" text-anchor="middle" font-size="10">${day}</text>`;
    }).join('');
    
    return `<svg width="${width}" height="${height}">${bars}${labels}</svg>`;
  }
}
```

## UI Design

### Popup Styling (src/popup/styles.css)

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 360px;
  min-height: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.header h1 {
  font-size: 20px;
  margin-bottom: 4px;
}

.header p {
  font-size: 12px;
  opacity: 0.9;
}

.habits-container {
  padding: 16px;
}

.habit-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.habit-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.habit-card.completed {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.habit-info h3 {
  font-size: 16px;
  margin-bottom: 4px;
}

.streak {
  font-size: 13px;
  color: #666;
}

.complete-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #ddd;
  background: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.complete-btn:hover:not([disabled]) {
  border-color: #4CAF50;
  background: #e8f5e9;
}

.complete-btn.done {
  background: #4CAF50;
  border-color: #4CAF50;
  color: white;
}

.complete-btn:disabled {
  cursor: default;
}

.chart-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.chart-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}
```

## Chrome APIs Used

### 1. chrome.storage.sync
- **Purpose**: Cross-device data persistence
- **Usage**: Store habits, logs, and settings
- **Quota**: ~100KB, syncs automatically

```typescript
await chrome.storage.sync.set({ key: value });
const data = await chrome.storage.sync.get('key');
```

### 2. chrome.alarms
- **Purpose**: Schedule periodic tasks
- **Usage**: Daily reminder checks

```typescript
chrome.alarms.create('reminder', {
  delayInMinutes: 60,
  periodInMinutes: 60
});
```

### 3. chrome.notifications
- **Purpose**: System notifications
- **Usage**: Habit reminders

```typescript
chrome.notifications.create({
  type: 'basic',
  title: 'Reminder',
  message: 'Complete your habit!'
});
```

### 4. chrome.runtime
- **Purpose**: Extension lifecycle
- **Usage**: Message passing, install events

## Testing Approach

### Unit Testing
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from './storage';

describe('StorageManager', () => {
  let storage: StorageManager;
  
  beforeEach(() => {
    // Mock chrome.storage
    chrome.storage.sync.get = async () => ({});
    chrome.storage.sync.set = async () => {};
    storage = StorageManager.getInstance();
  });
  
  it('calculates streak correctly', async () => {
    // Test streak calculation logic
  });
});
```

### Integration Testing
- Use Playwright for popup UI tests
- Test alarm triggers in background
- Verify storage sync between contexts

### Manual Testing Checklist
- [ ] Add new habit
- [ ] Mark habit complete
- [ ] Verify streak updates
- [ ] Test notification delivery
- [ ] Verify cross-device sync
- [ ] Test on multiple browsers

## Building and Testing

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click Load unpacked
# 4. Select dist folder

# Run tests
npm test

# Package for store
npm run package
```

## Best Practices

1. **Always use TypeScript** for type safety
2. **Modular architecture** - separate concerns into different modules
3. **Error handling** - wrap async operations in try-catch
4. **Storage efficiency** - batch operations when possible
5. **User privacy** - only request necessary permissions
6. **Offline first** - handle sync failures gracefully

## Conclusion

This guide provides a complete foundation for building a production-ready Habit Tracker Chrome extension. The architecture supports easy extension with features like:
- Habit categories and tags
- Weekly/monthly reports
- Social sharing
- Data export/import
- Widget support for Chrome OS

Remember to test thoroughly and follow Chrome Web Store policies before publishing.

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
