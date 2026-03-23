---
layout: post
title: "Build a Calendar Widget Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a powerful calendar chrome extension and schedule widget for Chrome. This comprehensive guide covers Manifest V3, local storage, event management, and publishing your daily planner extension to the Chrome Web Store."
date: 2025-01-24
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "calendar chrome extension, schedule widget, daily planner extension, build chrome extension calendar, chrome extension development tutorial"
canonical_url: "https://bestchromeextensions.com/2025/01/24/build-calendar-widget-chrome-extension/"
---

# Build a Calendar Widget Chrome Extension: Complete Developer's Guide

In today's fast-paced digital world, staying organized is more important than ever. Whether you're managing work deadlines, personal appointments, or tracking daily habits, a well-designed calendar chrome extension can transform your browsing experience. This comprehensive guide will walk you through building a fully functional schedule widget that lives directly in your browser, helping you manage your time without ever leaving your current tab.

A calendar chrome extension offers significant advantages over traditional calendar applications. Users spend most of their workday in the browser, switching between email, documents, and web applications. Having a daily planner extension embedded in the browser means you can quickly check upcoming events, add new reminders, and stay on top of your schedule without disrupting your workflow. This guide will teach you how to leverage Chrome's powerful extension APIs to create a schedule widget that feels seamless and intuitive.

In this tutorial, we'll build a Manifest V3 compliant calendar chrome extension featuring a sleek popup interface, local storage for data persistence, event creation and management, month navigation, and visual indicators for scheduled items. By the end of this guide, you'll have a complete working extension that you can customize further or publish to the Chrome Web Store.

---

## Understanding the Architecture of a Calendar Chrome Extension {#architecture}

Before diving into code, let's discuss the fundamental architecture of a calendar chrome extension. Chrome extensions following Manifest V3 consist of several key components that work together to deliver a cohesive user experience. Understanding these components will help you make informed decisions throughout the development process.

### Core Components

The popup window serves as the primary interface for your schedule widget. This is what users see when they click your extension icon in the Chrome toolbar. The popup contains the calendar grid, event list, and controls for adding new events. Unlike traditional web applications that load every time you visit a page, Chrome extensions load their popup instantly because they're bundled with the extension package.

The background service worker handles tasks that need to run continuously or respond to browser events. For our calendar chrome extension, the service worker can manage alarm notifications, sync data across devices using chrome.storage.sync, and handle any long-running operations that shouldn't block the popup interface.

Content scripts allow your extension to interact with web pages, but for a standalone calendar widget, we won't need content scripts. Our extension will function entirely within the Chrome popup, keeping things simple and secure. This approach also means users won't need to grant broad permissions, making your daily planner extension more trustworthy.

The manifest.json file defines your extension's configuration, permissions, and resources. For our calendar chrome extension, we'll need minimal permissions—just access to storage for saving events and alarms for notification functionality.

---

## Setting Up Your Development Environment {#setup}

Every successful chrome extension project starts with proper organization. Create a dedicated folder for your calendar widget project and organize your files in a logical structure. This organization will make development smoother and future updates easier to manage.

Your project structure should include the following key files: manifest.json for configuration, popup.html for the user interface, popup.css for styling, popup.js for the application logic, and an icons folder containing your extension's icon in various sizes. Additionally, you'll want a _locales folder for internationalization support if you plan to support multiple languages.

Let's start by creating the manifest.json file. This configuration tells Chrome about your extension's capabilities and requirements:

```json
{
  "manifest_version": 3,
  "name": "Daily Planner Calendar",
  "version": "1.0.0",
  "description": "A powerful calendar chrome extension with schedule widget functionality",
  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares that we're building a schedule widget that uses storage for saving events and alarms for notifications. The default_popup property specifies that clicking the extension icon should open our popup.html interface.

---

## Building the Popup Interface {#popup-interface}

The user interface of your calendar chrome extension needs to be intuitive, visually appealing, and functional within the limited space of a browser popup. Let's create a clean, modern design that provides all the functionality users expect from a daily planner extension.

Open popup.html and add the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Planner</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <button id="prevMonth" class="nav-btn">&lt;</button>
      <h2 id="currentMonth">January 2025</h2>
      <button id="nextMonth" class="nav-btn">&gt;</button>
    </header>
    
    <div class="calendar-grid">
      <div class="day-names">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div id="calendarDays" class="days"></div>
    </div>
    
    <div class="events-section">
      <h3>Today's Events</h3>
      <div id="eventsList" class="events-list"></div>
      <button id="addEventBtn" class="add-event-btn">+ Add Event</button>
    </div>
    
    <div id="eventModal" class="modal">
      <div class="modal-content">
        <h3>Add New Event</h3>
        <input type="text" id="eventTitle" placeholder="Event title">
        <input type="time" id="eventTime">
        <input type="date" id="eventDate">
        <div class="modal-buttons">
          <button id="saveEvent" class="save-btn">Save</button>
          <button id="cancelEvent" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides the foundation for our calendar chrome extension. The header displays the current month with navigation buttons, the calendar grid shows days organized by week, and the events section displays today's scheduled items with a button to add new events.

---

## Styling Your Schedule Widget {#styling}

The visual design of your daily planner extension plays a crucial role in user adoption. A polished, professional appearance builds trust and makes the extension pleasant to use daily. Let's create styles that match Chrome's Material Design aesthetic while remaining unique to your brand.

Open popup.css and add these styles:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 350px;
  min-height: 450px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #333;
}

.container {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1a73e8;
}

.nav-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: #5f6368;
}

.nav-btn:hover {
  background: #f1f3f4;
}

.calendar-grid {
  margin-bottom: 16px;
}

.day-names {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
}

.day-names span {
  font-size: 11px;
  font-weight: 500;
  color: #5f6368;
  text-transform: uppercase;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
}

.day:hover:not(.empty) {
  background: #f1f3f4;
}

.day.today {
  background: #1a73e8;
  color: white;
  font-weight: 600;
}

.day.has-event {
  position: relative;
}

.day.has-event::after {
  content: '';
  position: absolute;
  bottom: 2px;
  width: 4px;
  height: 4px;
  background: #1a73e8;
  border-radius: 50%;
}

.day.selected {
  background: #e8f0fe;
  color: #1a73e8;
}

.events-section {
  border-top: 1px solid #e0e0e0;
  padding-top: 12px;
}

.events-section h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #202124;
}

.events-list {
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 12px;
}

.event-time {
  color: #1a73e8;
  font-weight: 500;
}

.event-title {
  flex: 1;
  margin-left: 8px;
  color: #333;
}

.add-event-btn {
  width: 100%;
  padding: 10px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-event-btn:hover {
  background: #1557b0;
}

.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
}

.modal.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 280px;
}

.modal-content h3 {
  margin-bottom: 16px;
  font-size: 16px;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 13px;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.save-btn, .cancel-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.save-btn {
  background: #1a73e8;
  color: white;
}

.cancel-btn {
  background: #f1f3f4;
  color: #333;
}
```

These styles create a clean, modern calendar chrome extension interface. The design uses Google's blue accent color (#1a73e8) consistently throughout, providing a cohesive visual experience. The calendar grid uses CSS Grid for precise alignment, and the event modal uses a fixed overlay for focus.

---

## Implementing Calendar Logic {#calendar-logic}

Now comes the most important part of your schedule widget—the JavaScript logic that makes everything work. We'll implement month navigation, day selection, event storage, and display functionality. This is where your daily planner extension truly comes to life.

Open popup.js and add the following code:

```javascript
// Calendar State
let currentDate = new Date();
let selectedDate = new Date();
let events = {};

// Initialize extension
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  renderCalendar();
  setupEventListeners();
});

// Load events from storage
function loadEvents() {
  chrome.storage.local.get(['calendarEvents'], (result) => {
    if (result.calendarEvents) {
      events = result.calendarEvents;
      renderEventsList();
    }
  });
}

// Save events to storage
function saveEvents() {
  chrome.storage.local.set({ calendarEvents: events });
}

// Render the calendar
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get today's date for comparison
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  // Render calendar days
  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';
  
  // Empty cells for days before first of month
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'day empty';
    calendarDays.appendChild(emptyDay);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'day';
    dayElement.textContent = day;
    
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Highlight today
    if (isCurrentMonth && today.getDate() === day) {
      dayElement.classList.add('today');
    }
    
    // Mark days with events
    if (events[dateKey] && events[dateKey].length > 0) {
      dayElement.classList.add('has-event');
    }
    
    // Mark selected date
    if (selectedDate.getDate() === day && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year) {
      dayElement.classList.add('selected');
    }
    
    dayElement.addEventListener('click', () => selectDate(year, month, day));
    calendarDays.appendChild(dayElement);
  }
}

// Handle date selection
function selectDate(year, month, day) {
  selectedDate = new Date(year, month, day);
  renderCalendar();
  renderEventsList();
}

// Render events for selected date
function renderEventsList() {
  const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const dayEvents = events[dateKey] || [];
  
  const eventsList = document.getElementById('eventsList');
  
  if (dayEvents.length === 0) {
    eventsList.innerHTML = '<p class="no-events">No events scheduled</p>';
    return;
  }
  
  // Sort events by time
  dayEvents.sort((a, b) => a.time.localeCompare(b.time));
  
  eventsList.innerHTML = dayEvents.map((event, index) => `
    <div class="event-item">
      <span class="event-time">${event.time}</span>
      <span class="event-title">${event.title}</span>
      <button class="delete-event" data-index="${index}">&times;</button>
    </div>
  `).join('');
  
  // Add delete event listeners
  document.querySelectorAll('.delete-event').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteEvent(dateKey, index);
    });
  });
}

// Add new event
function addEvent(title, time, date) {
  const dateKey = date || `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  if (!events[dateKey]) {
    events[dateKey] = [];
  }
  
  events[dateKey].push({ title, time });
  saveEvents();
  renderCalendar();
  renderEventsList();
}

// Delete event
function deleteEvent(dateKey, index) {
  events[dateKey].splice(index, 1);
  if (events[dateKey].length === 0) {
    delete events[dateKey];
  }
  saveEvents();
  renderCalendar();
  renderEventsList();
}

// Setup event listeners
function setupEventListeners() {
  // Month navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Add event modal
  const modal = document.getElementById('eventModal');
  const addEventBtn = document.getElementById('addEventBtn');
  const saveEventBtn = document.getElementById('saveEvent');
  const cancelEventBtn = document.getElementById('cancelEvent');
  
  addEventBtn.addEventListener('click', () => {
    modal.classList.add('active');
    document.getElementById('eventDate').value = 
      `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  });
  
  cancelEventBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventTime').value = '';
  });
  
  saveEventBtn.addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value.trim();
    const time = document.getElementById('eventTime').value;
    const date = document.getElementById('eventDate').value;
    
    if (title && time) {
      addEvent(title, time, date);
      modal.classList.remove('active');
      document.getElementById('eventTitle').value = '';
      document.getElementById('eventTime').value = '';
    }
  });
  
  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}
```

This JavaScript implementation provides all the core functionality for your calendar chrome extension. The code handles month navigation, displays the correct number of days for each month, highlights the current day, and manages event storage using Chrome's local storage API. Users can select dates, add new events with titles and times, and delete existing events.

---

## Testing Your Chrome Extension {#testing}

Before publishing your calendar chrome extension, thorough testing ensures everything works correctly. Chrome provides built-in tools for loading unpacked extensions, making the testing process straightforward and efficient.

To test your schedule widget, open Chrome and navigate to chrome://extensions/. Enable "Developer mode" using the toggle in the top right corner. Click "Load unpacked" and select your extension's folder. Chrome will load your extension and display any errors in the console.

Test each feature systematically: verify month navigation works correctly, confirm you can select different dates, add events to various days, and ensure events persist after closing and reopening the popup. Pay special attention to edge cases like adding events on the last day of a month, navigating between years, and handling empty event lists.

The Chrome Developer Tools extension inspector provides valuable debugging capabilities. Access it from the extensions page by clicking "Service Worker" or "Inspect views" on your extension card. This opens the console where you can view logs, debug JavaScript, and inspect storage contents.

---

## Enhancing Your Calendar Widget {#enhancements}

Once your basic daily planner extension is working, consider adding features that will make it stand out in the Chrome Web Store. Notification reminders ensure users never miss important events, while data export and import functionality provides backup and restore capabilities.

Adding support for recurring events makes your calendar chrome extension significantly more useful for users with regular commitments. Implementing drag-and-drop event rescheduling improves the UX for desktop users. Color-coding events by category helps users visually distinguish between work, personal, and other types of commitments.

Consider adding a dark mode that automatically matches Chrome's system theme preference. This small addition significantly improves the extension's polish and shows attention to detail. Integration with Google Calendar through their API would enable two-way sync, though this requires additional permissions and authentication flow.

---

## Publishing Your Extension {#publishing}

When your calendar chrome extension is ready for the world, the Chrome Web Store provides global distribution. Create a developer account at the Chrome Web Store developer dashboard, pay the one-time registration fee, and prepare your store listing with compelling descriptions and screenshots.

Your extension's listing should prominently feature the keywords "calendar chrome extension," "schedule widget," and "daily planner extension" in the title and description for SEO purposes. High-quality screenshots demonstrating the interface and key features significantly improve conversion rates.

After submitting your extension, Google reviews it for policy compliance. The review process typically takes a few days. Once approved, your schedule widget becomes available to millions of Chrome users worldwide. Regular updates based on user feedback will help maintain positive reviews and grow your user base.

---

## Conclusion

Building a calendar chrome extension is an excellent project that teaches fundamental concepts of Chrome extension development while creating something genuinely useful. Your schedule widget demonstrates proficiency with Manifest V3, Chrome's storage API, popup development, and JavaScript calendar logic.

The extension we've built in this guide provides a solid foundation that you can customize and expand based on your needs. Whether you keep it simple with just event management or add advanced features like notifications and calendar sync, the core architecture supports both approaches.

Start building your calendar chrome extension today, and join the community of developers creating tools that millions of users rely on every day. The Chrome Web Store awaits your schedule widget, and users are always looking for better ways to organize their time.
