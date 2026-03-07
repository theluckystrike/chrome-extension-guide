import { defineSchema, createStorage } from "@theluckystrike/webext-storage";
import { sendTabMessage, onMessage } from "@theluckystrike/webext-messaging";

interface PageAnalysis {
  url: string;
  title: string;
  headingCount: number;
  wordCount: number;
  linkCount: number;
  analyzedAt: number;
}

// Messages: background -> content script
type ContentMessages = {
  analyzePage: {
    request: void;
    response: Omit<PageAnalysis, "analyzedAt">;
  };
};

// Messages: popup -> background
type BackgroundMessages = {
  getHistory: {
    request: void;
    response: PageAnalysis[];
  };
  clearHistory: {
    request: void;
    response: { success: boolean };
  };
};

const schema = defineSchema({
  analysisHistory: [] as PageAnalysis[],
  maxHistory: 50,
});

const storage = createStorage({ schema, area: "local" });

// Context menu setup
chrome.contextMenus.create({
  id: "analyze-page",
  title: "Analyze this page",
  contexts: ["page"],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "analyze-page" || !tab?.id) return;

  // Send message to content script to extract page data
  const analysis = await sendTabMessage<ContentMessages, "analyzePage">(
    { tabId: tab.id },
    "analyzePage",
    undefined
  );

  // Store result
  const history = await storage.get("analysisHistory");
  const maxHistory = await storage.get("maxHistory");

  history.unshift({ ...analysis, analyzedAt: Date.now() });
  if (history.length > maxHistory) history.length = maxHistory;

  await storage.set("analysisHistory", history);
});

// Handle popup messages
onMessage<BackgroundMessages>({
  async getHistory() {
    return storage.get("analysisHistory");
  },
  async clearHistory() {
    await storage.set("analysisHistory", []);
    return { success: true };
  },
});
