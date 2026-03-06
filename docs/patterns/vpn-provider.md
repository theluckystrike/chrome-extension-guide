# VPN Provider API Patterns

## Overview

The `chrome.vpnProvider` API enables Chrome extensions to create and manage VPN connections on ChromeOS. This API allows your extension to act as a VPN client while the operating system handles the network tunnel. This guide covers practical patterns for implementing VPN functionality in your Chrome extension.

---

## Pattern 1: VPN Provider API Overview

### Understanding the VPN Provider API

The `chrome.vpnProvider` API is a ChromeOS-specific API that allows extensions to implement VPN client functionality. The extension acts as the VPN client while ChromeOS handles the network tunnel.

Key characteristics:
- **Platform Limitation**: ChromeOS only
- **Permission Required**: `"vpnProvider"` in manifest
- **Architecture**: Extension as VPN client; OS handles tunnel

### Required Manifest Configuration

```json
{
  "name": "My VPN Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["vpnProvider"],
  "background": { "service_worker": "background.js" }
}
```

### TypeScript Type Definitions

```ts
// types/vpn.ts
interface VpnParameters {
  address: string;
  broadcastAddress: string;
  mtu?: number;
  dnsServers?: string[];
  excludeRoutes?: string[];
  includeRoutes?: string[];
}

type ConnectionState = "connected" | "disconnected" | "error";

interface PlatformMessageInfo {
  state: ConnectionState;
  id: string;
}

interface ConfigInfo {
  id: string;
  name: string;
}

function isVpnProviderSupported(): boolean {
  return typeof chrome !== "undefined" && "vpnProvider" in chrome;
}
```

---

## Pattern 2: Creating a VPN Configuration

### Understanding VPN Configurations

A VPN configuration represents a named VPN connection in ChromeOS network settings. Users can select and connect from the system UI.

### Creating VPN Configurations

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  vpnConfigs: { type: "array", default: [] },
  activeConfigId: { type: "string", default: "" },
});

const storage = createStorage(schema);

interface VpnConfig {
  id: string;
  name: string;
  serverAddress: string;
  username: string;
  createdAt: number;
}

class VpnConfigurationManager {
  async createConfig(name: string, serverAddress: string): Promise<string> {
    const configId = await chrome.vpnProvider.createConfig(name);
    
    const config: VpnConfig = {
      id: configId,
      name,
      serverAddress,
      username: "",
      createdAt: Date.now(),
    };

    const configs = await storage.get("vpnConfigs");
    await storage.set("vpnConfigs", [...configs, config]);

    console.log(`VPN config created: ${name} (${configId})`);
    return configId;
  }

  async deleteConfig(configId: string): Promise<void> {
    await chrome.vpnProvider.destroyConfig(configId);
    
    const configs = await storage.get("vpnConfigs");
    const filtered = configs.filter((c: VpnConfig) => c.id !== configId);
    await storage.set("vpnConfigs", filtered);
  }

  async listConfigs(): Promise<VpnConfig[]> {
    return storage.get("vpnConfigs");
  }
}

const vpnManager = new VpnConfigurationManager();

// Listen for config events
chrome.vpnProvider.onConfigCreated.addListener((info) => {
  console.log("Config created:", info);
});

chrome.vpnProvider.onConfigRemoved.addListener((id) => {
  console.log("Config removed:", id);
});
```

---

## Pattern 3: Connection Lifecycle

### Understanding the Connection Lifecycle

The VPN connection lifecycle consists of states notified through `chrome.vpnProvider.onPlatformMessage`.

### Connection States

| State | Description |
|-------|-------------|
| `connected` | User/system initiated connection |
| `disconnected` | User/system disconnected |
| `error` | Connection error occurred |

### Handling Platform Messages

```ts
// background.ts
interface ConnectionInfo {
  configId: string;
  state: ConnectionState;
  connectedSince?: number;
  errorMessage?: string;
}

class VpnConnectionManager {
  private currentConnection: ConnectionInfo | null = null;

  constructor() {
    this.setupPlatformMessageHandler();
  }

  private setupPlatformMessageHandler(): void {
    chrome.vpnProvider.onPlatformMessage.addListener(
      async (message: string, info: PlatformMessageInfo) => {
        console.log(`Platform message: ${message}`, info);

        switch (message) {
          case "connected":
            await this.handleConnect(info.id);
            break;
          case "disconnected":
            await this.handleDisconnect(info.id);
            break;
          case "error":
            await this.handleError(info.id);
            break;
        }
      }
    );
  }

  private async handleConnect(configId: string): Promise<void> {
    this.currentConnection = {
      configId,
      state: "connected",
      connectedSince: Date.now(),
    };

    await this.setVpnParameters();
    await chrome.vpnProvider.notifyConnectionStateChanged("connected");

    // Update badge
    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

    this.broadcastUpdate(this.currentConnection);
  }

  private async handleDisconnect(configId: string): Promise<void> {
    this.currentConnection = {
      configId,
      state: "disconnected",
    };

    await chrome.action.setBadgeText({ text: "OFF" });
    await chrome.action.setBadgeBackgroundColor({ color: "#9E9E9E" });

    this.broadcastUpdate(this.currentConnection);
  }

  private async handleError(configId: string): Promise<void> {
    this.currentConnection = {
      configId,
      state: "error",
      errorMessage: "Connection error occurred",
    };

    await chrome.action.setBadgeText({ text: "ERR" });
    await chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
  }

  private async setVpnParameters(): Promise<void> {
    const parameters: VpnParameters = {
      address: "10.0.0.1",
      broadcastAddress: "10.0.0.255",
      mtu: 1500,
      dnsServers: ["8.8.8.8", "8.8.4.4"],
      excludeRoutes: ["192.168.0.0/16"],
      includeRoutes: ["0.0.0.0/0"],
    };

    await chrome.vpnProvider.setParameters(parameters);
  }

  private broadcastUpdate(connection: ConnectionInfo): void {
    chrome.runtime.sendMessage({
      type: "VPN_CONNECTION_UPDATE",
      payload: connection,
    }).catch(() => {});
  }

  getConnectionInfo(): ConnectionInfo | null {
    return this.currentConnection;
  }
}

const connectionManager = new VpnConnectionManager();
```

---

## Pattern 4: Sending and Receiving Packets

### Understanding Packet Handling

The VPN Provider API uses raw IP packets as ArrayBuffers. Your extension receives packets from the OS and sends packets to the OS.

### Packet Handling Implementation

```ts
// background.ts
class VpnPacketHandler {
  private isRunning: boolean = false;

  constructor() {
    this.setupPacketReceiver();
  }

  private setupPacketReceiver(): void {
    chrome.vpnProvider.onPacketReceived.addListener(
      async (packet: ArrayBuffer) => {
        await this.processIncomingPacket(packet);
      }
    );
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log("Packet handler started");
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log("Packet handler stopped");
  }

  private async processIncomingPacket(packet: ArrayBuffer): Promise<void> {
    if (!this.isRunning) return;

    try {
      const ipPacket = this.parseIpHeader(packet);
      console.log(`Packet: ${ipPacket.protocol} from ${ipPacket.sourceIp}`);

      // Forward to VPN server (implementation depends on your protocol)
      await this.forwardToVpnServer(packet);
    } catch (error) {
      console.error("Error processing packet:", error);
    }
  }

  async sendPacket(data: ArrayBuffer): Promise<void> {
    try {
      await chrome.vpnProvider.sendPacket(data);
    } catch (error) {
      console.error("Failed to send packet:", error);
    }
  }

  private async forwardToVpnServer(packet: ArrayBuffer): Promise<void> {
    // Encapsulate and send to your VPN server
    // Using fetch() or WebSocket depending on protocol
    console.log(`Forwarding ${packet.byteLength} bytes to VPN server`);
  }

  private parseIpHeader(packet: ArrayBuffer): IpHeader {
    const view = new DataView(packet);
    const protocol = view.getUint8(9);
    const sourceIp = `${view.getUint8(12)}.${view.getUint8(13)}.${view.getUint8(14)}.${view.getUint8(15)}`;
    const destIp = `${view.getUint8(16)}.${view.getUint8(17)}.${view.getUint8(18)}.${view.getUint8(19)}`;

    return { protocol, sourceIp, destIp };
  }
}

interface IpHeader {
  protocol: number;
  sourceIp: string;
  destIp: string;
}

const packetHandler = new VpnPacketHandler();
```

### Keepalive Implementation

```ts
// background.ts
class KeepaliveManager {
  private intervalId: number | null = null;
  private readonly KEEPALIVE_INTERVAL = 30 * 1000;

  start(): void {
    this.intervalId = window.setInterval(() => this.sendKeepalive(), this.KEEPALIVE_INTERVAL);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async sendKeepalive(): Promise<void> {
    const keepalivePacket = this.createKeepalivePacket();
    await packetHandler.sendPacket(keepalivePacket);
    console.log("Keepalive sent");
  }

  private createKeepalivePacket(): ArrayBuffer {
    const buffer = new ArrayBuffer(20);
    const view = new DataView(buffer);
    view.setUint8(0, 0x45); // Version + IHL
    view.setUint8(1, 0);
    view.setUint16(2, 20, false);
    view.setUint16(4, 0, false);
    view.setUint16(6, 0, false);
    view.setUint8(8, 64); // TTL
    view.setUint8(9, 1); // ICMP
    view.setUint16(10, 0, false); // Checksum placeholder
    view.setUint8(12, 10); view.setUint8(13, 0);
    view.setUint8(14, 0); view.setUint8(15, 1); // Source: 10.0.0.1
    view.setUint8(16, 10); view.setUint8(17, 0);
    view.setUint8(18, 0); view.setUint8(19, 2); // Dest: 10.0.0.2
    return buffer;
  }
}

const keepaliveManager = new KeepaliveManager();
```

---

## Pattern 5: VPN Configuration Parameters

### Understanding VPN Parameters

The `chrome.vpnProvider.setParameters()` configures the virtual network interface.

### Basic Parameters

```ts
// background.ts
interface VpnParameters {
  address: string;
  broadcastAddress: string;
  mtu?: number;
  dnsServers?: string[];
  excludeRoutes?: string[];
  includeRoutes?: string[];
}

async function setBasicParameters(): Promise<void> {
  const parameters: VpnParameters = {
    address: "10.8.0.2",
    broadcastAddress: "10.8.0.255",
    mtu: 1500,
    dnsServers: ["10.8.0.1", "8.8.8.8"],
  };

  await chrome.vpnProvider.setParameters(parameters);
}
```

### Advanced Route Configuration

```ts
// Full tunnel - all traffic through VPN
async function setFullTunnelParameters(): Promise<void> {
  const parameters: VpnParameters = {
    address: "10.8.0.2",
    broadcastAddress: "10.8.0.255",
    dnsServers: ["10.8.0.1"],
    includeRoutes: ["0.0.0.0/0"],
    excludeRoutes: [],
  };
  await chrome.vpnProvider.setParameters(parameters);
}

// Split tunnel - only specific traffic through VPN
async function setSplitTunnelParameters(): Promise<void> {
  const parameters: VpnParameters = {
    address: "10.8.0.2",
    broadcastAddress: "10.8.0.255",
    dnsServers: ["10.8.0.1"],
    includeRoutes: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
    excludeRoutes: ["192.168.1.0/24"], // Direct access to home network
  };
  await chrome.vpnProvider.setParameters(parameters);
}

// Corporate VPN - route only corporate network
async function setCorporateTunnelParameters(): Promise<void> {
  const parameters: VpnParameters = {
    address: "10.8.0.2",
    broadcastAddress: "10.8.0.255",
    dnsServers: ["10.8.0.1"],
    includeRoutes: ["10.0.0.0/8", "172.16.0.0/12"],
    excludeRoutes: ["0.0.0.0/0"],
  };
  await chrome.vpnProvider.setParameters(parameters);
}
```

---

## Pattern 6: Authentication Flow

### Implementing VPN Authentication

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const authSchema = defineSchema({
  credentials: { type: "object", default: null },
  authToken: { type: "string", default: "" },
  tokenExpiry: { type: "number", default: 0 },
  refreshToken: { type: "string", default: "" },
});

const authStorage = createStorage(authSchema);

interface VpnCredentials {
  username: string;
  password: string;
  serverAddress: string;
}

class VpnAuthManager {
  async saveCredentials(credentials: VpnCredentials): Promise<void> {
    await authStorage.set("credentials", credentials);
  }

  async getCredentials(): Promise<VpnCredentials | null> {
    return authStorage.get("credentials");
  }

  async authenticate(credentials: VpnCredentials): Promise<void> {
    const response = await fetch("https://vpn.example.com/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.statusText}`);
    }

    const token = await response.json();
    await authStorage.set("authToken", token.accessToken);
    await authStorage.set("refreshToken", token.refreshToken);
    await authStorage.set("tokenExpiry", Date.now() + token.expiresIn * 1000);
    await this.saveCredentials(credentials);
  }

  async getValidToken(): Promise<string | null> {
    const token = await authStorage.get("authToken");
    const expiry = await authStorage.get("tokenExpiry");

    if (!token || Date.now() >= expiry - 5 * 60 * 1000) {
      return this.refreshToken();
    }
    return token;
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = await authStorage.get("refreshToken");
    if (!refreshToken) return null;

    const response = await fetch("https://vpn.example.com/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const token = await response.json();
    await authStorage.set("authToken", token.accessToken);
    await authStorage.set("tokenExpiry", Date.now() + token.expiresIn * 1000);
    return token.accessToken;
  }

  async clearCredentials(): Promise<void> {
    await authStorage.set("credentials", null);
    await authStorage.set("authToken", "");
    await authStorage.set("refreshToken", "");
  }
}

const authManager = new VpnAuthManager();
```

### OAuth Integration

```ts
// background.ts
class EnterpriseAuthManager {
  private readonly CLIENT_ID = "your-client-id";
  private readonly REDIRECT_URI = chrome.identity.getRedirectURL();

  async initiateOAuthFlow(): Promise<string> {
    const authUrl = new URL("https://enterprise.vpn.com/oauth/authorize");
    authUrl.searchParams.set("client_id", this.CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", this.REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "vpn:connect");

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        async (redirectUrl) => {
          if (chrome.runtime.lastError || !redirectUrl) {
            reject(chrome.runtime.lastError);
            return;
          }

          const code = new URL(redirectUrl).searchParams.get("code");
          if (!code) {
            reject(new Error("No authorization code"));
            return;
          }

          const token = await this.exchangeCode(code);
          resolve(token.accessToken);
        }
      );
    });
  }

  private async exchangeCode(code: string): Promise<any> {
    const response = await fetch("https://enterprise.vpn.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.CLIENT_ID,
        redirect_uri: this.REDIRECT_URI,
      }),
    });
    return response.json();
  }
}

const enterpriseAuth = new EnterpriseAuthManager();
```

---

## Pattern 7: Connection Status UI

### Badge Status Management

```ts
// background.ts
type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

const BADGE_STATES: Record<ConnectionStatus, { text: string; color: string; title: string }> = {
  connected: { text: "ON", color: "#4CAF50", title: "VPN Connected" },
  connecting: { text: "...", color: "#FF9800", title: "Connecting..." },
  disconnected: { text: "OFF", color: "#9E9E9E", title: "VPN Disconnected" },
  error: { text: "ERR", color: "#F44336", title: "VPN Error" },
};

class BadgeManager {
  async setStatus(status: ConnectionStatus): Promise<void> {
    const config = BADGE_STATES[status];
    await Promise.all([
      chrome.action.setBadgeText({ text: config.text }),
      chrome.action.setBadgeBackgroundColor({ color: config.color }),
      chrome.action.setTitle({ title: config.title }),
    ]);
  }
}

const badgeManager = new BadgeManager();
```

### Popup Implementation

```ts
// popup/popup.ts
interface PopupState {
  isConnected: boolean;
  serverName: string;
  virtualIp: string;
  connectedSince: number | null;
}

class VpnPopup {
  private state: PopupState = {
    isConnected: false,
    serverName: "",
    virtualIp: "",
    connectedSince: null,
  };

  async initialize(): Promise<void> {
    await this.loadState();
    this.setupEventListeners();
    this.setupMessageListener();
    this.updateUI();
  }

  private async loadState(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: "GET_VPN_STATUS" });
    if (response) {
      this.state = { ...this.state, ...response };
    }
  }

  private setupEventListeners(): void {
    document.getElementById("toggle-vpn")?.addEventListener("click", () => this.toggle());
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "VPN_CONNECTION_UPDATE") {
        this.state = { ...this.state, ...message.payload };
        this.updateUI();
      }
    });
  }

  private async toggle(): Promise<void> {
    if (this.state.isConnected) {
      await chrome.runtime.sendMessage({ type: "DISCONNECT_VPN" });
    } else {
      const configs = await chrome.runtime.sendMessage({ type: "GET_VPN_CONFIGS" });
      if (configs?.[0]) {
        await chrome.runtime.sendMessage({ type: "CONNECT_VPN", payload: { configId: configs[0].id } });
      }
    }
  }

  private updateUI(): void {
    const statusEl = document.getElementById("connection-status");
    const serverEl = document.getElementById("server-name");
    const ipEl = document.getElementById("virtual-ip");
    const btnEl = document.getElementById("toggle-vpn") as HTMLButtonElement;

    if (statusEl) {
      statusEl.textContent = this.state.isConnected ? "Connected" : "Disconnected";
      statusEl.className = this.state.isConnected ? "connected" : "disconnected";
    }
    if (serverEl) serverEl.textContent = this.state.serverName || "-";
    if (ipEl) ipEl.textContent = this.state.virtualIp || "-";
    if (btnEl) btnEl.textContent = this.state.isConnected ? "Disconnect" : "Connect";
  }
}

document.addEventListener("DOMContentLoaded", () => new VpnPopup().initialize());
```

---

## Pattern 8: Error Handling and Reconnection

### Network Change Detection

```ts
// background.ts
class NetworkMonitor {
  private isOnline: boolean = true;
  private onChangeCallback: ((online: boolean) => void) | null = null;

  constructor() {
    window.addEventListener("online", () => this.handleChange(true));
    window.addEventListener("offline", () => this.handleChange(false));
  }

  private handleChange(online: boolean): void {
    if (this.isOnline === online) return;
    this.isOnline = online;
    console.log(`Network ${online ? "online" : "offline"}`);
    this.onChangeCallback?.(online);
  }

  onChange(callback: (online: boolean) => void): void {
    this.onChangeCallback = callback;
  }

  getStatus(): boolean {
    return this.isOnline;
  }
}

const networkMonitor = new NetworkMonitor();
```

### Automatic Reconnection

```ts
// background.ts
interface ReconnectConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

class ReconnectionManager {
  private retryCount: number = 0;
  private config: ReconnectConfig = {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
  };

  async attemptReconnection(
    configId: string,
    connectFn: (id: string) => Promise<void>
  ): Promise<boolean> {
    if (this.retryCount >= this.config.maxRetries) {
      console.log("Max retries reached");
      return false;
    }

    this.retryCount++;
    const delay = this.calculateDelay();

    console.log(`Reconnection attempt ${this.retryCount} in ${delay}ms`);

    await this.notifyAttempt();

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await connectFn(configId);
          this.reset();
          await this.notifySuccess();
          resolve(true);
        } catch {
          const success = await this.attemptReconnection(configId, connectFn);
          resolve(success);
        }
      }, delay);
    });
  }

  private calculateDelay(): number {
    const delay = Math.min(
      this.config.initialDelayMs * Math.pow(2, this.retryCount - 1),
      this.config.maxDelayMs
    );
    return delay + Math.floor(delay * 0.1 * (Math.random() - 0.5));
  }

  private async notifyAttempt(): Promise<void> {
    chrome.notifications.create({
      type: "basic",
      title: "VPN Reconnecting",
      message: `Attempt ${this.retryCount}/${this.config.maxRetries}...`,
    });
  }

  private async notifySuccess(): Promise<void> {
    chrome.notifications.create({
      type: "basic",
      title: "VPN Reconnected",
      message: "VPN connection restored.",
    });
  }

  reset(): void {
    this.retryCount = 0;
  }
}

const reconnectionManager = new ReconnectionManager();
```

### Error Handler Integration

```ts
// background.ts
class VpnErrorHandler {
  constructor(
    private connectionManager: VpnConnectionManager,
    private reconnectionManager: ReconnectionManager,
    private networkMonitor: NetworkMonitor
  ) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.networkMonitor.onChange(async (online) => {
      if (!online) {
        await badgeManager.setStatus("disconnected");
      } else {
        await this.handleNetworkRestored();
      }
    });

    chrome.vpnProvider.onPlatformMessage.addListener(
      async (message, info) => {
        if (message === "disconnected") {
          await this.handleDisconnect(info.id);
        }
      }
    );
  }

  private async handleNetworkRestored(): Promise<void> {
    const conn = this.connectionManager.getConnectionInfo();
    if (conn?.configId) {
      await this.reconnectionManager.attemptReconnection(
        conn.configId,
        async (id) => console.log(`Reconnecting to ${id}`)
      );
    }
  }

  private async handleDisconnect(configId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 2000));
    const conn = this.connectionManager.getConnectionInfo();
    if (conn?.state === "disconnected" && conn.configId) {
      const success = await this.reconnectionManager.attemptReconnection(
        configId,
        async (id) => console.log(`Reconnecting to ${id}`)
      );
      if (!success) {
        chrome.notifications.create({
          type: "basic",
          title: "VPN Failed",
          message: "Could not restore VPN connection.",
        });
      }
    }
  }
}

const errorHandler = new VpnErrorHandler(connectionManager, reconnectionManager, networkMonitor);
```

---

## Summary Table

| Pattern | API Method/Event | Use Case |
|---------|------------------|----------|
| **Pattern 1: API Overview** | `chrome.vpnProvider` | Understanding API capabilities |
| **Pattern 2: VPN Configuration** | `createConfig()`, `destroyConfig()` | Creating/deleting VPN configs |
| **Pattern 3: Connection Lifecycle** | `onPlatformMessage`, `notifyConnectionStateChanged` | Managing connect/disconnect states |
| **Pattern 4: Packet Handling** | `sendPacket()`, `onPacketReceived` | Raw IP packet tunnel communication |
| **Pattern 5: Parameters** | `setParameters()` | Configuring IP, DNS, routes, MTU |
| **Pattern 6: Authentication** | Storage + OAuth | Credential and token management |
| **Pattern 7: Status UI** | Badge + Popup | Connection state visualization |
| **Pattern 8: Error Handling** | Network events + reconnection | Network changes and auto-reconnect |

### Quick Reference

```ts
// Essential VPN Provider API
const api = chrome.vpnProvider;

// Create configuration
const configId = await api.createConfig("My VPN");

// Set tunnel parameters
await api.setParameters({
  address: "10.8.0.2",
  broadcastAddress: "10.8.0.255",
  mtu: 1500,
  dnsServers: ["8.8.8.8"],
  includeRoutes: ["0.0.0.0/0"],
});

// Send packet
await api.sendPacket(packetArrayBuffer);

// Notify state
await api.notifyConnectionStateChanged("connected");

// Events
api.onPlatformMessage.addListener((msg, info) => {});
api.onPacketReceived.addListener((packet) => {});
api.onConfigCreated.addListener((info) => {});
api.onConfigDisconnected.addListener((id) => {});
```

### Key Takeaways

1. **ChromeOS Only**: Always verify `chrome.vpnProvider` availability before use
2. **Configuration First**: Create VPN configs that appear in ChromeOS network settings
3. **State Management**: Handle lifecycle events and call `notifyConnectionStateChanged()` appropriately
4. **Packet Handling**: IP packets are ArrayBuffers; implement proper parsing for your protocol
5. **Parameters**: Configure `address`, `dnsServers`, and routes (`includeRoutes`/`excludeRoutes`) correctly
6. **Security**: Use secure credential storage and implement token refresh mechanisms
7. **Robustness**: Implement network change detection and exponential backoff reconnection
8. **User Feedback**: Use badges and notifications to maintain clear communication
