---
layout: default
title: "Chrome Extension Long Running Operations. Best Practices"
description: "Handle long-running operations in service workers without timeout."
canonical_url: "https://bestchromeextensions.com/patterns/long-running-operations/"
---

# Long-Running Operations Patterns

Overview {#overview}

MV3 service workers have a strict 30-second idle timeout. Unlike MV2 background pages that could run indefinitely, your extension must plan for termination at any time. This guide covers patterns for handling tasks that exceed the service worker lifetime.

---

Challenge: Service Worker Termination {#challenge-service-worker-termination}

```
Service Worker Lifecycle:
                    
        install >  Starting  > activate
                    
                         
                    
         events >   Active   < wake up
                    
                          idle (~30s)
                    
                      Idle    
                    
                          timeout
                    
                     Terminated (all state lost)
                    
```

Long-running tasks face these challenges:
- Service worker terminates after ~30 seconds of inactivity
- All in-memory state is lost on termination
- No way to extend the timeout directly

---

Pattern 1: Chunked Processing with Alarms {#pattern-1-chunked-processing-with-alarms}

Break large tasks into small chunks and process one chunk per wake cycle:

```ts
// background.ts
interface ProcessingState {
  items: string[];
  currentIndex: number;
  totalProcessed: number;
}

const CHUNK_SIZE = 100;

async function startChunkedProcessing(items: string[]): Promise<void> {
  const state: ProcessingState = {
    items,
    currentIndex: 0,
    totalProcessed: 0,
  };
  await chrome.storage.local.set({ processingState: state });
  await chrome.alarms.create("processChunk", { delayInMinutes: 0.1 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "processChunk") return;

  const { processingState } = await chrome.storage.local.get("processingState");
  if (!processingState) return;

  const { items, currentIndex } = processingState;
  const chunk = items.slice(currentIndex, currentIndex + CHUNK_SIZE);

  // Process chunk
  for (const item of chunk) {
    await processItem(item);
  }

  // Save progress
  processingState.currentIndex += chunk.length;
  processingState.totalProcessed += chunk.length;
  await chrome.storage.local.set({ processingState });

  // Schedule next chunk or complete
  if (processingState.currentIndex < items.length) {
    await chrome.alarms.create("processChunk", { delayInMinutes: 0.1 });
  } else {
    await chrome.storage.local.remove("processingState");
    notifyCompletion(processingState.totalProcessed);
  }
});
```

---

Pattern 2: Offscreen Documents for Sustained Work {#pattern-2-offscreen-documents-for-sustained-work}

For tasks requiring longer execution, use an offscreen document:

```ts
// background.ts
async function startLongTask(): Promise<void> {
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Processing large dataset",
  });
  
  // Send work to offscreen document
  const clients = await self.clients.matchAll();
  clients[0]?.postMessage({ type: "START_TASK", data: bigData });
}
```

```ts
// offscreen.ts (runs in offscreen document)
self.onmessage = async (e) => {
  if (e.data.type === "START_TASK") {
    const worker = new Worker("processor.worker.js");
    worker.postMessage(e.data.data);
    
    worker.onmessage = (result) => {
      self.postMessage({ type: "PROGRESS", progress: result.data.progress });
    };
  }
};
```

---

Pattern 3: Keep-Alive Heartbeat {#pattern-3-keep-alive-heartbeat}

For critical background tasks, keep the service worker alive:

```ts
// background.ts - NOT recommended for production
// Use alarms instead for reliability

chrome.runtime.onInstalled.addListener(() => {
  setInterval(async () => {
    await chrome.runtime.getPlatformInfo(); // Keep alive
  }, 20000); // Every 20 seconds (< 30s timeout)
});
```

Prefer alarms. they wake the service worker reliably without polling.

---

Pattern 4: Resumable State Management {#pattern-4-resumable-state-management}

Always save state to `chrome.storage` for resumability:

```ts
interface TaskState {
  id: string;
  status: "pending" | "running" | "paused" | "completed";
  processedCount: number;
  lastProcessedKey: string;
  checkpoint: Record<string, unknown>;
}

async function saveCheckpoint(state: TaskState): Promise<void> {
  await chrome.storage.local.set({ [`task_${state.id}`]: state });
}

async function resumeTask(taskId: string): Promise<void> {
  const stored = await chrome.storage.local.get(`task_${taskId}`);
  const state = stored[`task_${taskId}`];
  
  if (state && state.status === "running") {
    // Resume from checkpoint
    await processFromCheckpoint(state);
  }
}
```

---

Progress Communication {#progress-communication}

Notify the UI via message passing:

```ts
// background.ts
function notifyProgress(count: number, total: number): void {
  const progress = Math.round((count / total) * 100);
  
  chrome.runtime.sendMessage({
    type: "TASK_PROGRESS",
    payload: { count, total, progress }
  }).catch(() => {}); // Ignore if popup closed
}

// popup.ts
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TASK_PROGRESS") {
    updateProgressBar(msg.payload.progress);
  }
});
```

---

Anti-Patterns to Avoid {#anti-patterns-to-avoid}

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Infinite loops | Blocks event loop, forces termination | Use chunking + alarms |
| `setTimeout` in service worker | May not fire after termination | Use `chrome.alarms` |
| Large in-memory state | Lost on termination | Store in `chrome.storage` |
| Unbounded streaming | Connection drops on termination | Chunk + checkpoint |

---

Related Patterns {#related-patterns}

- [Service Worker Lifecycle](./service-worker-lifecycle.md). lifecycle detailed look
- [Offscreen Documents](./offscreen-documents.md). sustained execution contexts
- [MV3 Service Workers](../mv3/service-workers.md). official reference

---

Summary {#summary}

1. Never assume the service worker stays alive. plan for termination
2. Use chrome.alarms for periodic work (not `setInterval`)
3. Chunk processing into small units that complete within one wake cycle
4. Save state to `chrome.storage` for resumability
5. Use offscreen documents for CPU-intensive tasks
6. Communicate progress back to UI via message passing
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
