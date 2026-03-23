---
layout: default
title: "Chrome Extension Service Worker Async Cookbook — Best Practices"
description: "Async patterns cookbook for service workers."
canonical_url: "https://bestchromeextensions.com/patterns/service-worker-async-cookbook/"
---

Service Worker Async Patterns Cookbook

This guide covers practical async patterns for Chrome extension service workers. These patterns help you write reliable, performant code that handles Chrome's unique execution environment.

Async Message Handler Pattern

The fundamental pattern for handling messages with async operations. Your handler must return true to keep the message channel open while the promise resolves.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchData') {
    handleFetch(message.url).then(sendResponse);
    return true;
  }
});

Returning true signals Chrome to hold the response channel open until you call sendResponse.

Promise-Based API Wrappers

Chrome APIs are callback-based. Wrapping them in promises makes your code cleaner.

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

Now you can chain operations with async/await naturally.

Sequential Async Operations Surviving Termination

Service workers terminate after idle periods. When chaining operations, each step must persist state so the next wake-up can continue.

async function processQueue() {
  const { queue, cursor } = await getStorage(['queue', 'cursor']);
  const remaining = queue.slice(cursor);
  
  for (let i = 0; i < remaining.length; i++) {
    await processItem(remaining[i]);
    await setStorage({ cursor: cursor + i + 1 });
  }
  
  await setStorage({ cursor: 0 });
}

Each iteration updates storage before potentially terminating.

Parallel Chrome API Calls with Promise.all

When multiple independent operations are needed, Promise.all runs them concurrently.

async function gatherTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [cookies, storage] = await Promise.all([
    chrome.cookies.get({ url: tab.url, name: 'session' }),
    getStorage(['userPrefs', 'cache'])
  ]);
  
  return { tab, cookies, storage };
}

Parallel execution reduces total latency significantly.

Retry with Backoff Using Alarms

Network calls fail. Using chrome.alarms provides reliable retry scheduling.

chrome.alarms.create('retry', { delayInMinutes: Math.pow(2, attempt) });

Async Initialization on Wake-Up

When the service worker wakes, verify your state before processing.

chrome.runtime.onStartup.addListener(async () => {
  const { initialized } = await getStorage('initialized');
  if (!initialized) {
    await setupExtension();
  }
});

Long-Running Operations Split Across Alarms

Large tasks cannot complete in one execution. Break them into chunks.

async function processLargeDataset() {
  const { items, index } = await getStorage(['items', 'index']);
  const batchSize = 100;
  const batch = items.slice(index, index + batchSize);
  
  for (const item of batch) {
    await processItem(item);
  }
  
  const newIndex = index + batchSize;
  if (newIndex < items.length) {
    await setStorage({ index: newIndex });
    chrome.alarms.create('continue', { delayInMinutes: 1 });
  } else {
    await setStorage({ index: 0 });
  }
}

Error Boundaries

Wrap async operations in try-catch to prevent unhandled rejections from terminating your worker.

async function safeFetch(url) {
  try {
    return await fetch(url).then(r => r.json());
  } catch (error) {
    console.error('Fetch failed', error);
    await setStorage({ lastError: error.message });
    return null;
  }
}

Logging errors to storage helps debug issues that occur while the worker is not running.

Debouncing Rapid Events

Events like onChanged can fire rapidly. Debounce to batch operations.

let debounceTimer;
function debounceFetch(tabId) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchPageContent(tabId);
  }, 300);
}

For more complex debouncing across service worker restarts, store state in storage and check timestamps on wake-up.

These patterns form the foundation of reliable async service worker code. Combine them as needed. For more extension development resources, check out zovo.one.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
