/**
 * Tab Manager with Storage - Background Service Worker
 *
 * Demonstrates: chrome-storage-typed + mv3-messaging + chrome-tabs-manager
 */

import { get, set } from "@theluckystrike/chrome-storage-typed";
import { onMessage } from "@theluckystrike/mv3-messaging";
import { queryTabs, createTab } from "@theluckystrike/chrome-tabs-manager";

interface TabGroup {
  name: string;
  urls: string[];
  createdAt: number;
}

const MAX_GROUPS = 10;

// Register handler: save current window tabs as a group
onMessage<{ groupName: string }, { success: boolean; groupCount: number }>(
  "saveCurrentTabs",
  async (payload) => {
    const tabs = await queryTabs({ currentWindow: true });
    const urls = tabs.map((t) => t.url).filter((u): u is string => !!u);

    const groups = (await get<TabGroup[]>("savedGroups")) ?? [];

    if (groups.length >= MAX_GROUPS) {
      return { success: false, groupCount: groups.length };
    }

    groups.push({ name: payload.groupName, urls, createdAt: Date.now() });
    await set("savedGroups", groups);

    return { success: true, groupCount: groups.length };
  }
);

// Register handler: get all saved groups
onMessage<void, TabGroup[]>("getSavedGroups", async () => {
  return (await get<TabGroup[]>("savedGroups")) ?? [];
});

// Register handler: restore a group by index
onMessage<{ index: number }, { tabsOpened: number }>(
  "restoreGroup",
  async (payload) => {
    const groups = (await get<TabGroup[]>("savedGroups")) ?? [];
    const group = groups[payload.index];
    if (!group) return { tabsOpened: 0 };

    for (const url of group.urls) {
      await createTab(url);
    }
    return { tabsOpened: group.urls.length };
  }
);

// Register handler: delete a group by index
onMessage<{ index: number }, { success: boolean }>(
  "deleteGroup",
  async (payload) => {
    const groups = (await get<TabGroup[]>("savedGroups")) ?? [];
    groups.splice(payload.index, 1);
    await set("savedGroups", groups);
    return { success: true };
  }
);
