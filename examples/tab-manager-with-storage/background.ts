import { defineSchema, createStorage } from "@theluckystrike/webext-storage";
import { onMessage } from "@theluckystrike/webext-messaging";

// Define typed storage schema
const schema = defineSchema({
  savedGroups: [] as Array<{ name: string; urls: string[]; createdAt: number }>,
  maxGroups: 10,
});

const storage = createStorage({ schema, area: "local" });

// Message types for popup <-> background
type Messages = {
  saveCurrentTabs: {
    request: { groupName: string };
    response: { success: boolean; groupCount: number };
  };
  getSavedGroups: {
    request: void;
    response: Array<{ name: string; urls: string[]; createdAt: number }>;
  };
  restoreGroup: {
    request: { index: number };
    response: { tabsOpened: number };
  };
  deleteGroup: {
    request: { index: number };
    response: { success: boolean };
  };
};

// Register message handlers
onMessage<Messages>({
  async saveCurrentTabs({ groupName }) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urls = tabs.map((t) => t.url).filter((u): u is string => !!u);

    const groups = await storage.get("savedGroups");
    const maxGroups = await storage.get("maxGroups");

    if (groups.length >= maxGroups) {
      return { success: false, groupCount: groups.length };
    }

    groups.push({ name: groupName, urls, createdAt: Date.now() });
    await storage.set("savedGroups", groups);

    return { success: true, groupCount: groups.length };
  },

  async getSavedGroups() {
    return storage.get("savedGroups");
  },

  async restoreGroup({ index }) {
    const groups = await storage.get("savedGroups");
    const group = groups[index];
    if (!group) return { tabsOpened: 0 };

    for (const url of group.urls) {
      await chrome.tabs.create({ url });
    }
    return { tabsOpened: group.urls.length };
  },

  async deleteGroup({ index }) {
    const groups = await storage.get("savedGroups");
    groups.splice(index, 1);
    await storage.set("savedGroups", groups);
    return { success: true };
  },
});
