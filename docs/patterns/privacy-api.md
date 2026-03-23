---
layout: default
title: "Chrome Extension Privacy Api. Best Practices"
description: "Use the Privacy API to respect user privacy settings."
canonical_url: "https://bestchromeextensions.com/patterns/privacy-api/"
---

Chrome Extension Privacy API Patterns

Overview {#overview}

The Chrome Privacy API (`chrome.privacy`) enables extensions to read and modify browser privacy settings. This guide covers eight practical patterns from basic setting retrieval to building a privacy dashboard with presets and monitoring.

The API is organized into three categories:
- chrome.privacy.network: WebRTC, connection prediction
- chrome.privacy.services: Safe browsing, spelling, translation
- chrome.privacy.websites: Cookies, referrers, DNT

---

Required Permission {#required-permission}

```json
{ "permissions": ["privacy"] }
```

---

Pattern 1: Reading Privacy Settings {#pattern-1-reading-privacy-settings}

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({ cachedSettings: { type: "object", default: null } }));

interface AllSettings {
  network: { webRTCIPHandlingPolicy: string; networkPredictionEnabled: boolean };
  services: { safeBrowsingEnabled: boolean; spellingServiceEnabled: boolean; };
  websites: { thirdPartyCookiesAllowed: boolean; referrersEnabled: boolean; doNotTrackEnabled: boolean };
}

async function getAllPrivacySettings(): Promise<AllSettings> {
  const [net, svc, web] = await Promise.all([
    Promise.all([
      chrome.privacy.network.webRTCIPHandlingPolicy.get({}),
      chrome.privacy.network.networkPredictionEnabled.get({}),
    ]),
    Promise.all([
      chrome.privacy.services.safeBrowsingEnabled.get({}),
      chrome.privacy.services.spellingServiceEnabled.get({}),
    ]),
    Promise.all([
      chrome.privacy.websites.thirdPartyCookiesAllowed.get({}),
      chrome.privacy.websites.referrersEnabled.get({}),
      chrome.privacy.websites.doNotTrackEnabled.get({}),
    ]),
  ]);

  return {
    network: { webRTCIPHandlingPolicy: net[0].value as string, networkPredictionEnabled: net[1].value as boolean },
    services: { safeBrowsingEnabled: svc[0].value as boolean, spellingServiceEnabled: svc[1].value as boolean },
    websites: { thirdPartyCookiesAllowed: web[0].value as boolean, referrersEnabled: web[1].value as boolean, doNotTrackEnabled: web[2].value as boolean },
  };
}
```

---

Pattern 2: Controlling WebRTC IP Handling {#pattern-2-controlling-webrtc-ip-handling}

WebRTC can leak your real IP address even with VPNs.

```ts
type IPHandlingPolicy = "default" | "default_public_and_private_interfaces" | "default_public_interface_only" | "disable_non_proxied_udp";

async function setWebRTCPolicy(policy: IPHandlingPolicy): Promise<void> {
  await chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: policy });
}

// Usage
async function examples() {
  await setWebRTCPolicy("default");                         // Least private
  await setWebRTCPolicy("default_public_interface_only"); // Moderate
  await setWebRTCPolicy("disable_non_proxied_udp");       // Most private
}
```

---

Pattern 3: Managing Third-Party Cookies {#pattern-3-managing-third-party-cookies}

```ts
async function setThirdPartyCookies(allowed: boolean): Promise<void> {
  await chrome.privacy.websites.thirdPartyCookiesAllowed.set({ value: allowed });
}

async function getCookieStatus(): Promise<boolean> {
  const result = await chrome.privacy.websites.thirdPartyCookiesAllowed.get({});
  return result.value as boolean;
}

// Check current third-party cookie status with details
async function getCookieCapabilities(): Promise<{ allowed: boolean; levelOfControl: string }> {
  const result = await chrome.privacy.websites.thirdPartyCookiesAllowed.get({});
  return {
    allowed: result.value as boolean,
    levelOfControl: result.levelOfControl,
  };
}
```

---

Pattern 4: Toggling Safe Browsing and Predictions {#pattern-4-toggling-safe-browsing-and-predictions}

```ts
async function setSafeBrowsingEnabled(enabled: boolean): Promise<void> {
  await chrome.privacy.services.safeBrowsingEnabled.set({ value: enabled });
}

async function setPredictionServices(settings: { networkPrediction: boolean; spelling: boolean; translation: boolean }): Promise<void> {
  await Promise.all([
    chrome.privacy.network.networkPredictionEnabled.set({ value: settings.networkPrediction }),
    chrome.privacy.services.spellingServiceEnabled.set({ value: settings.spelling }),
    chrome.privacy.services.translationServiceEnabled.set({ value: settings.translation }),
  ]);
}
```

---

Pattern 5: Privacy Dashboard Popup {#pattern-5-privacy-dashboard-popup}

Popup HTML {#popup-html}

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 340px; font-family: system-ui; }
    .section { padding: 12px; border-bottom: 1px solid #eee; }
    .section h3 { margin: 0 0 10px; font-size: 14px; }
    .setting { display: flex; justify-content: space-between; margin: 8px 0; }
    .toggle { position: relative; width: 40px; height: 22px; }
    .toggle input { opacity: 0; width: 0; }
    .slider { position: absolute; inset: 0; background: #ccc; border-radius: 22px; cursor: pointer; transition: 0.3s; }
    .slider:before { content: ""; position: absolute; height: 18px; width: 18px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; }
    input:checked + .slider { background: #4CAF50; }
    input:checked + .slider:before { transform: translateX(18px); }
    select { padding: 4px; border-radius: 4px; }
    .btn { width: 100%; padding: 10px; background: #2196F3; color: white; border: none; cursor: pointer; }
    .status { font-size: 11px; color: #666; text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="section">
    <h3>Network</h3>
    <div class="setting"><label>WebRTC</label><select id="webrtc"><option value="default">Default</option><option value="default_public_interface_only">Public</option><option value="disable_non_proxied_udp">No UDP</option></select></div>
    <div class="setting"><label>Prediction</label><label class="toggle"><input type="checkbox" id="prediction"><span class="slider"></span></label></div>
  </div>
  <div class="section">
    <h3>Privacy</h3>
    <div class="setting"><label>Cookies</label><label class="toggle"><input type="checkbox" id="cookies"><span class="slider"></span></label></div>
    <div class="setting"><label>DNT</label><label class="toggle"><input type="checkbox" id="dnt"><span class="slider"></span></label></div>
    <div class="setting"><label>Referrers</label><label class="toggle"><input type="checkbox" id="referrers"><span class="slider"></span></label></div>
  </div>
  <div class="section">
    <h3>Services</h3>
    <div class="setting"><label>Safe Browsing</label><label class="toggle"><input type="checkbox" id="safebrowsing"><span class="slider"></span></label></div>
    <div class="setting"><label>Spelling</label><label class="toggle"><input type="checkbox" id="spelling"><span class="slider"></span></label></div>
  </div>
  <div class="section">
    <button class="btn" id="refresh">Refresh</button>
    <div class="status" id="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Popup TypeScript {#popup-typescript}

```ts
// popup.ts
import { sendMessage } from "@theluckystrike/webext-messaging";

async function loadSettings(): Promise<void> {
  const status = document.getElementById("status");
  status.textContent = "Loading...";
  try {
    const settings = await sendMessage<{ type: "GET_SETTINGS" }, any>({ type: "GET_SETTINGS" });
    applySettings(settings);
    status.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
  } catch { status.textContent = "Error"; }
}

function applySettings(s: any): void {
  (document.getElementById("webrtc") as HTMLSelectElement).value = s.network.webRTCIPHandlingPolicy;
  (document.getElementById("prediction") as HTMLInputElement).checked = s.network.networkPredictionEnabled;
  (document.getElementById("cookies") as HTMLInputElement).checked = s.websites.thirdPartyCookiesAllowed;
  (document.getElementById("dnt") as HTMLInputElement).checked = s.websites.doNotTrackEnabled;
  (document.getElementById("referrers") as HTMLInputElement).checked = s.websites.referrersEnabled;
  (document.getElementById("safebrowsing") as HTMLInputElement).checked = s.services.safeBrowsingEnabled;
  (document.getElementById("spelling") as HTMLInputElement).checked = s.services.spellingServiceEnabled;
}

function setupHandler(key: string, type: "select" | "checkbox"): void {
  const el = document.getElementById(key);
  el.addEventListener("change", (e) => {
    const value = type === "select" ? (e.target as HTMLSelectElement).value : (e.target as HTMLInputElement).checked;
    sendMessage({ type: "SET_SETTING", key, value });
  });
}

setupHandler("webrtc", "select");
["prediction", "cookies", "dnt", "referrers", "safebrowsing", "spelling"].forEach(k => setupHandler(k, "checkbox"));
document.getElementById("refresh").addEventListener("click", loadSettings);
loadSettings();
```

Background Handler {#background-handler}

```ts
// background.ts
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === "GET_SETTINGS") { getAllPrivacySettings().then(sendResponse); return true; }
  if (msg.type === "SET_SETTING") { handleSet(msg.key, msg.value).then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message })); return true; }
});

const setters: Record<string, () => Promise<void>> = {
  webRTC: () => chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: arguments[1] }),
  prediction: () => chrome.privacy.network.networkPredictionEnabled.set({ value: arguments[1] }),
  cookies: () => chrome.privacy.websites.thirdPartyCookiesAllowed.set({ value: arguments[1] }),
  dnt: () => chrome.privacy.websites.doNotTrackEnabled.set({ value: arguments[1] }),
  referrers: () => chrome.privacy.websites.referrersEnabled.set({ value: arguments[1] }),
  safeBrowsing: () => chrome.privacy.services.safeBrowsingEnabled.set({ value: arguments[1] }),
  spelling: () => chrome.privacy.services.spellingServiceEnabled.set({ value: arguments[1] }),
};

async function handleSet(key: string, value: any): Promise<void> {
  const map: Record<string, any> = {
    webRTC: chrome.privacy.network.webRTCIPHandlingPolicy,
    prediction: chrome.privacy.network.networkPredictionEnabled,
    cookies: chrome.privacy.websites.thirdPartyCookiesAllowed,
    dnt: chrome.privacy.websites.doNotTrackEnabled,
    referrers: chrome.privacy.websites.referrersEnabled,
    safeBrowsing: chrome.privacy.services.safeBrowsing,
    spelling: chrome.privacy.services.spellingServiceEnabled,
  };
  if (map[key]) await map[key].set({ value });
}
```

---

Pattern 6: One-Click Privacy Hardening {#pattern-6-one-click-privacy-hardening}

```ts
const HARDENING = {
  webRTCIPHandlingPolicy: "disable_non_proxied_udp",
  networkPredictionEnabled: false,
  thirdPartyCookiesAllowed: false,
  referrersEnabled: false,
  hyperlinkAuditingEnabled: false,
  doNotTrackEnabled: true,
  safeBrowsingEnabled: true,
  spellingServiceEnabled: false,
  translationServiceEnabled: false,
};

async function applyHardening(): Promise<{ applied: string[]; errors: string[] }> {
  const result = { applied: [] as string[], errors: [] as string[] };
  const map: Record<string, any> = {
    webRTCIPHandlingPolicy: chrome.privacy.network.webRTCIPHandlingPolicy,
    networkPredictionEnabled: chrome.privacy.network.networkPredictionEnabled,
    thirdPartyCookiesAllowed: chrome.privacy.websites.thirdPartyCookiesAllowed,
    referrersEnabled: chrome.privacy.websites.referrersEnabled,
    hyperlinkAuditingEnabled: chrome.privacy.websites.hyperlinkAuditingEnabled,
    doNotTrackEnabled: chrome.privacy.websites.doNotTrackEnabled,
    safeBrowsingEnabled: chrome.privacy.services.safeBrowsingEnabled,
    spellingServiceEnabled: chrome.privacy.services.spellingServiceEnabled,
    translationServiceEnabled: chrome.privacy.services.translationServiceEnabled,
  };

  await Promise.all(Object.entries(HARDENING).map(async ([k, v]) => {
    try { await map[k].set({ value: v }); result.applied.push(k); }
    catch (e) { result.errors.push(`${k}: ${e}`); }
  }));

  return result;
}
```

---

Pattern 7: Per-Profile Privacy Presets {#pattern-7-per-profile-privacy-presets}

```ts
interface Preset { id: string; name: string; description: string; settings: Record<string, any>; }

const PRESETS: Preset[] = [
  { id: "relaxed", name: "Relaxed", description: "Balanced", settings: { webRTCIPHandlingPolicy: "default", networkPredictionEnabled: true, thirdPartyCookiesAllowed: true, referrersEnabled: true, safeBrowsingEnabled: true } },
  { id: "moderate", name: "Moderate", description: "Enhanced privacy", settings: { webRTCIPHandlingPolicy: "default_public_interface_only", networkPredictionEnabled: true, thirdPartyCookiesAllowed: true, referrersEnabled: true, hyperlinkAuditingEnabled: false, doNotTrackEnabled: true, safeBrowsingEnabled: true } },
  { id: "strict", name: "Strict", description: "Maximum privacy", settings: { webRTCIPHandlingPolicy: "disable_non_proxied_udp", networkPredictionEnabled: false, thirdPartyCookiesAllowed: false, referrersEnabled: false, hyperlinkAuditingEnabled: false, doNotTrackEnabled: true, safeBrowsingEnabled: true } },
];

class PresetManager {
  private storage = createStorage(defineSchema({ activePreset: { type: "string", default: "moderate" } }));

  async apply(presetId: string): Promise<{ applied: string[]; errors: string[] }> {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) throw new Error(`Unknown preset: ${presetId}`);
    const result = { applied: [] as string[], errors: [] as string[] };
    const map: Record<string, any> = {
      webRTCIPHandlingPolicy: chrome.privacy.network.webRTCIPHandlingPolicy,
      networkPredictionEnabled: chrome.privacy.network.networkPredictionEnabled,
      thirdPartyCookiesAllowed: chrome.privacy.websites.thirdPartyCookiesAllowed,
      referrersEnabled: chrome.privacy.websites.referrersEnabled,
      hyperlinkAuditingEnabled: chrome.privacy.websites.hyperlinkAuditingEnabled,
      doNotTrackEnabled: chrome.privacy.websites.doNotTrackEnabled,
      safeBrowsingEnabled: chrome.privacy.services.safeBrowsingEnabled,
    };
    await Promise.all(Object.entries(preset.settings).map(async ([k, v]) => {
      try { await map[k].set({ value: v }); result.applied.push(k); }
      catch (e) { result.errors.push(`${k}: ${e}`); }
    }));
    await this.storage.set("activePreset", presetId);
    return result;
  }

  async getActive(): Promise<string> { return (await this.storage.get("activePreset")) || "moderate"; }
}

export const presetManager = new PresetManager();
```

---

Pattern 8: Monitoring and Alerting {#pattern-8-monitoring-and-alerting}

```ts
interface ChangeEvent { setting: string; oldValue: any; newValue: any; timestamp: number; }

const monitorStorage = createStorage(defineSchema({
  changeHistory: { type: "array", default: [] },
  pendingAlerts: { type: "array", default: [] },
}));

let original: any = null;

async function initMonitor(): Promise<void> {
  original = await getAllPrivacySettings();
  setInterval(checkChanges, 30000);
}

async function checkChanges(): Promise<void> {
  const current = await getAllPrivacySettings();
  const changes = diff(original, current);
  if (changes.length > 0) {
    await handleChanges(changes);
    original = current;
  }
}

function diff(orig: any, curr: any, path = ""): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  for (const key in curr) {
    const fullPath = path ? `${path}.${key}` : key;
    if (typeof curr[key] === "object") changes.push(...diff(orig[key], curr[key], fullPath));
    else if (orig[key] !== curr[key]) changes.push({ setting: fullPath, oldValue: orig[key], newValue: curr[key], timestamp: Date.now() });
  }
  return changes;
}

async function handleChanges(changes: ChangeEvent[]): Promise<void> {
  const history: ChangeEvent[] = (await monitorStorage.get("changeHistory")) || [];
  history.push(...changes);
  if (history.length > 100) history.splice(0, history.length - 100);
  await monitorStorage.set("changeHistory", history);

  const risks = changes.filter(c => isRisk(c.setting, c.newValue));
  if (risks.length > 0) {
    await monitorStorage.set("pendingAlerts", risks);
    chrome.action.setBadgeText({ text: risks.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
  }
}

function isRisk(setting: string, value: any): boolean {
  const risks: Record<string, any> = { "network.webRTCIPHandlingPolicy": "default", "websites.thirdPartyCookiesAllowed": true, "websites.referrersEnabled": true };
  return risks[setting] === value;
}
```

---

Summary Table {#summary-table}

| Pattern | Description | Key APIs |
|---------|-------------|----------|
| 1: Reading Settings | Retrieve all privacy values | `chrome.privacy.*.get({})` |
| 2: WebRTC Control | Control IP handling | `webRTCIPHandlingPolicy` |
| 3: Cookie Management | Toggle third-party cookies | `thirdPartyCookiesAllowed` |
| 4: Safe Browsing | Toggle protection | `safeBrowsingEnabled` |
| 5: Dashboard Popup | Interactive UI | Message passing |
| 6: Hardening | One-click privacy lock | Batch `set()` |
| 7: Presets | Relaxed/Moderate/Strict | `PresetManager` |
| 8: Monitoring | Track and alert | Polling + badges |

Dependencies {#dependencies}

```bash
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging
```

Settings Quick Reference {#settings-quick-reference}

| Category | Settings |
|----------|----------|
| network | `webRTCIPHandlingPolicy`, `networkPredictionEnabled` |
| services | `safeBrowsingEnabled`, `spellingServiceEnabled`, `translationServiceEnabled` |
| websites | `thirdPartyCookiesAllowed`, `referrersEnabled`, `doNotTrackEnabled`, `hyperlinkAuditingEnabled` |
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
