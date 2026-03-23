---
layout: default
title: "Chrome Extension Background Queue Processing. Best Practices"
description: "Process tasks in the background with queue-based patterns."
canonical_url: "https://bestchromeextensions.com/patterns/background-queue-processing/"
---

# Background Queue Processing Patterns

Overview {#overview}

Chrome extensions often have multiple contexts (popup, content scripts, options page) that submit work to the background service worker. Processing requests immediately can overwhelm the system, cause race conditions, or fail when the service worker is terminated. A queue-based architecture ensures work is processed sequentially, survives restarts, and handles failures gracefully.

Persistent Task Queue {#persistent-task-queue}

Store queue in `chrome.storage.local` to survive service worker termination:

```javascript
// background.ts
const QUEUE_KEY = "taskQueue";
const MAX_RETRIES = 3;

async function enqueueTask(task) {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  task.id = crypto.randomUUID();
  task.status = "pending";
  task.retries = 0;
  task.createdAt = Date.now();
  queue.push(task);
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  scheduleProcessing();
}

async function processQueue() {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  const pending = queue.filter(t => t.status === "pending");
  
  for (const task of pending) {
    try {
      task.status = "processing";
      await chrome.storage.local.set({ [QUEUE_KEY]: queue });
      
      await executeTask(task);
      
      task.status = "completed";
      task.completedAt = Date.now();
      await chrome.storage.local.set({ [QUEUE_KEY]: queue });
    } catch (error) {
      await handleFailure(task, error, queue);
    }
  }
}

async function handleFailure(task, error, queue) {
  task.retries++;
  if (task.retries < MAX_RETRIES) {
    task.status = "pending";
    task.lastError = error.message;
  } else {
    task.status = "dead-letter";
    task.failedAt = Date.now();
  }
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

function scheduleProcessing() {
  chrome.alarms.create("processQueue", { delayInMinutes: 0.1 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "processQueue") processQueue();
});
```

Priority Queue {#priority-queue}

Process urgent items first by sorting before processing:

```javascript
async function processPriorityQueue() {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  
  // Sort: priority (high first) then by creation time
  queue.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.createdAt - b.createdAt;
  });
  
  const pending = queue.filter(t => t.status === "pending").slice(0, 10);
  
  for (const task of pending) {
    await processTask(task, queue);
  }
}
```

Batch Processing with Alarms {#batch-processing-with-alarms}

Process N items per wake cycle, schedule alarm for remainder:

```javascript
const BATCH_SIZE = 5;

async function processBatch() {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  const pending = queue.filter(t => t.status === "pending");
  
  const batch = pending.slice(0, BATCH_SIZE);
  
  for (const task of batch) {
    await processTask(task, queue);
  }
  
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  
  // Schedule next batch if more items remain
  const remaining = queue.filter(t => t.status === "pending").length;
  if (remaining > 0) {
    chrome.alarms.create("processBatch", { delayInMinutes: 0.5 });
  }
}
```

Deduplication {#deduplication}

Prevent duplicate entries based on task signature:

```javascript
async function enqueueWithDedup(task) {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  
  const isDuplicate = queue.some(t => 
    t.status !== "completed" && 
    t.type === task.type && 
    t.signature === task.signature
  );
  
  if (isDuplicate) return;
  
  queue.push({ ...task, id: crypto.randomUUID(), status: "pending" });
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}
```

Queue Monitoring in Popup {#queue-monitoring-in-popup}

Display queue depth and status to users:

```javascript
// popup.ts - show queue status
async function updateQueueDisplay() {
  const { [QUEUE_KEY]: queue = [] } = await chrome.storage.local.get(QUEUE_KEY);
  
  const pending = queue.filter(t => t.status === "pending").length;
  const processing = queue.filter(t => t.status === "processing").length;
  const completed = queue.filter(t => t.status === "completed").length;
  const failed = queue.filter(t => t.status === "dead-letter").length;
  
  document.getElementById("queue-status").textContent = 
    `Pending: ${pending} | Processing: ${processing} | Done: ${completed} | Failed: ${failed}`;
}

chrome.storage.onChanged.addListener(updateQueueDisplay);
```

Related Patterns {#related-patterns}

- [Long-Running Operations](./long-running-operations.md). chunked processing patterns
- [Retry Patterns](./retry-patterns.md). failure handling strategies
- [Alarms API](../api-reference/alarms-api.md). scheduled background processing
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
