import { defineSchema, createStorage } from "@theluckystrike/webext-storage";
import { onMessage, sendMessage } from "@theluckystrike/webext-messaging";

interface ClipboardEntry {
  text: string;
  copiedAt: number;
}

const schema = defineSchema({
  clipboardHistory: [] as ClipboardEntry[],
  maxEntries: 25,
});

const storage = createStorage({ schema, area: "local" });

// Ensure offscreen document exists
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

// Messages from offscreen document
type OffscreenMessages = {
  writeClipboard: {
    request: { text: string };
    response: { success: boolean };
  };
  readClipboard: {
    request: void;
    response: { text: string };
  };
};

// Messages from popup
type PopupMessages = {
  copyText: {
    request: { text: string };
    response: { success: boolean };
  };
  getHistory: {
    request: void;
    response: ClipboardEntry[];
  };
  clearHistory: {
    request: void;
    response: { success: boolean };
  };
};

onMessage<PopupMessages>({
  async copyText({ text }) {
    await ensureOffscreen();

    // Forward to offscreen document for actual clipboard access
    const result = await sendMessage<OffscreenMessages, "writeClipboard">(
      "writeClipboard",
      { text }
    );

    if (result.success) {
      // Save to history
      const history = await storage.get("clipboardHistory");
      const maxEntries = await storage.get("maxEntries");

      history.unshift({ text, copiedAt: Date.now() });
      if (history.length > maxEntries) history.length = maxEntries;
      await storage.set("clipboardHistory", history);
    }

    return result;
  },

  async getHistory() {
    return storage.get("clipboardHistory");
  },

  async clearHistory() {
    await storage.set("clipboardHistory", []);
    return { success: true };
  },
});
