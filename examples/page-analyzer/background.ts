/**
 * Page Analyzer - Background Service Worker
 *
 * Demonstrates: chrome-storage-typed + mv3-messaging + chrome.contextMenus
 */

import { get, set } from "@theluckystrike/chrome-storage-typed";
import { sendToTab, onMessage } from "@theluckystrike/mv3-messaging";

interface PageAnalysis {
  url: string;
  title: string;
  headingCount: number;
  wordCount: number;
  linkCount: number;
  analyzedAt: number;
}

const MAX_HISTORY = 50;

// Context menu setup
chrome.contextMenus.create({
  id: "analyze-page",
  title: "Analyze this page",
  contexts: ["page"],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "analyze-page" || !tab?.id) return;

  // Send message to content script to extract page data
  const analysis = await sendToTab<
    void,
    Omit<PageAnalysis, "analyzedAt">
  >(tab.id, "analyzePage", undefined as unknown as void);

  // Store result
  const history = (await get<PageAnalysis[]>("analysisHistory")) ?? [];

  history.unshift({ ...analysis, analyzedAt: Date.now() });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

  await set("analysisHistory", history);
});

// Handle popup messages
onMessage<void, PageAnalysis[]>("getHistory", async () => {
  return (await get<PageAnalysis[]>("analysisHistory")) ?? [];
});

onMessage<void, { success: boolean }>("clearHistory", async () => {
  await set<PageAnalysis[]>("analysisHistory", []);
  return { success: true };
});
