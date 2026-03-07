/**
 * Clipboard Manager - Background Service Worker
 *
 * Demonstrates: chrome-storage-typed + mv3-messaging + chrome.offscreen API
 */

import { get, set } from "@theluckystrike/chrome-storage-typed";
import { onMessage, sendToBackground } from "@theluckystrike/mv3-messaging";

interface ClipboardEntry {
  text: string;
  copiedAt: number;
}

const MAX_ENTRIES = 25;

// Ensure offscreen document exists for clipboard access
async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Read/write clipboard from service worker",
  });
}

// Handle popup request to copy text
onMessage<{ text: string }, { success: boolean }>(
  "copyText",
  async (payload) => {
    await ensureOffscreen();

    // Forward to offscreen document for actual clipboard access
    const result = await sendToBackground<
      { text: string },
      { success: boolean }
    >("writeClipboard", { text: payload.text });

    if (result.success) {
      const history = (await get<ClipboardEntry[]>("clipboardHistory")) ?? [];

      history.unshift({ text: payload.text, copiedAt: Date.now() });
      if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
      await set("clipboardHistory", history);
    }

    return result;
  }
);

// Handle popup request to get history
onMessage<void, ClipboardEntry[]>("getHistory", async () => {
  return (await get<ClipboardEntry[]>("clipboardHistory")) ?? [];
});

// Handle popup request to clear history
onMessage<void, { success: boolean }>("clearHistory", async () => {
  await set<ClipboardEntry[]>("clipboardHistory", []);
  return { success: true };
});
