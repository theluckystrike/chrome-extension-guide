# Chrome VPN Provider API

The Chrome VPN Provider API (`chrome.vpnProvider`) enables ChromeOS extensions to create, configure, and manage VPN connections directly from Chrome, integrating with ChromeOS's built-in VPN infrastructure.

## Platform Requirements

The `chrome.vpnProvider` API is **exclusively available on ChromeOS**.

```json
{
  "permissions": ["vpnProvider"],
  "platforms": ["chromeos"]
}
```

## Creating VPN Configurations with createConfig

The `chrome.vpnProvider.createConfig()` method creates VPN configurations that persist across browser restarts.

```javascript
// background.js - Creating VPN configuration

chrome.vpnProvider.createConfig(
  "my-vpn-tunnel",
  {
    name: "My Company VPN",
    description: "Corporate VPN",
    host: "vpn.example.com",
    udp: true,
    mtu: 1500,
    username: "user@example.com",
    password: "encrypted_password",
    serverCertificate: "-----BEGIN CERTIFICATE-----\n...-----END CERTIFICATE-----"
  },
  (config) => {
    if (chrome.runtime.lastError) {
      console.error("Failed:", chrome.runtime.lastError.message);
      return;
    }
    console.log("VPN config created:", config.name);
  }
);
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name |
| `host` | string | Server hostname |
| `udp` | boolean | Use UDP vs TCP |
| `mtu` | number | Max Transmission Unit |
| `username` | string | Auth username |
| `password` | string | Auth password |

```javascript
// Remove configuration
chrome.vpnProvider.destroyConfig("my-vpn-tunnel", () => {});
```

## Handling Platform Messages with onPlatformMessage

The `chrome.vpnProvider.onPlatformMessage` event handles connection events from ChromeOS.

```javascript
// background.js - Platform message handling

chrome.vpnProvider.onPlatformMessage.addListener((message, callback) => {
  console.log("Message:", message.type);
  
  switch (message.type) {
    case "connected":
      console.log("VPN up! Interface:", message.tunnelInterface, "IP:", message.ip);
      chrome.runtime.sendMessage({ action: "vpnStatusChanged", status: "connected" });
      break;
    case "disconnected":
      console.log("VPN down, reason:", message.reason);
      chrome.runtime.sendMessage({ action: "vpnStatusChanged", status: "disconnected" });
      break;
    case "error":
      console.error("VPN error:", message.error);
      break;
    case "configRemoved":
      console.log("Config removed:", message.id);
      break;
  }
  callback();
});
```

**Message Types:**

| Type | Description | Properties |
|------|-------------|------------|
| `connected` | Tunnel established | `tunnelInterface`, `ip`, `dns` |
| `disconnected` | Tunnel closed | `reason` |
| `error` | Connection error | `error` |
| `configRemoved` | Config deleted | `id` |

## Sending Packets with sendPacket

The `chrome.vpnProvider.sendPacket()` transmits data through the VPN tunnel.

```javascript
// Sending a packet
const packetData = new ArrayBuffer(1024);
// ... fill packetData

chrome.vpnProvider.sendPacket(packetData, () => {
  if (chrome.runtime.lastError) {
    console.error("Send failed:", chrome.runtime.lastError.message);
  }
});
```

## Receiving Packets with onPacketReceived

The `chrome.vpnProvider.onPacketReceived` event fires when packets arrive from the tunnel.

```javascript
// background.js - Receiving packets

chrome.vpnProvider.onPacketReceived.addListener((packet) => {
  const dataView = new Uint8Array(packet.data);
  console.log(`Received: ${dataView.length} bytes`);
  
  // Process packet
  const view = new DataView(packet.data);
  const protocol = view.getUint8(9); // IP protocol
  
  if (protocol === 6) handleTcp(packet.data);
  else if (protocol === 17) handleUdp(packet.data);
});

function handleTcp(data) { /* TCP handling */ }
function handleUdp(data) { /* UDP handling */ }
```

## VPN Connection Lifecycle Management

Lifecycle: configuration → connection → tunnel → packet transfer → disconnection → cleanup.

```javascript
// background.js - Lifecycle management

class VpnConnectionManager {
  constructor() {
    this.isConnected = false;
    this.tunnelInterface = null;
    this.packetQueue = [];
    this.initialize();
  }
  
  initialize() {
    chrome.vpnProvider.onPlatformMessage.addListener((msg, cb) => {
      this.handlePlatformMessage(msg);
      cb();
    });
    
    chrome.vpnProvider.onPacketReceived.addListener((packet) => {
      this.handleIncomingPacket(packet);
    });
    
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "getStatus") {
        sendResponse({ connected: this.isConnected, tunnelInterface: this.tunnelInterface });
      }
    });
  }
  
  handlePlatformMessage(message) {
    switch (message.type) {
      case "connected":
        this.isConnected = true;
        this.tunnelInterface = message.tunnelInterface;
        console.log("VPN connected:", message.ip);
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        this.processPacketQueue();
        break;
      case "disconnected":
        this.isConnected = false;
        this.tunnelInterface = null;
        chrome.action.setBadgeText({ text: "" });
        this.packetQueue = [];
        break;
      case "error":
        console.error("VPN error:", message.error);
        break;
    }
  }
  
  handleIncomingPacket(packet) {
    if (!this.isConnected) return;
    console.log("Incoming packet:", packet.data.byteLength, "bytes");
  }
  
  sendPacket(data) {
    if (!this.isConnected) {
      this.packetQueue.push(data);
      return false;
    }
    chrome.vpnProvider.sendPacket(data, () => {});
    return true;
  }
  
  processPacketQueue() {
    while (this.packetQueue.length > 0) {
      this.sendPacket(this.packetQueue.shift());
    }
  }
}

const vpnManager = new VpnConnectionManager();
```

## UI Notifications for Connection Status

```javascript
// background.js - UI notifications

function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/vpn-48.png",
    title: title,
    message: message,
    priority: 1
  });
}

// Handle UI events
chrome.vpnProvider.onUIEvent.addListener((event, callback) => {
  if (event.type === "showAddDialog") {
    chrome.windows.create({ url: "setup.html", type: "popup", width: 500, height: 600 });
  }
  callback();
});

// Connection notifications
chrome.vpnProvider.onPlatformMessage.addListener((msg, cb) => {
  if (msg.type === "connected") {
    showNotification("VPN Connected", "Your connection is secure.");
  } else if (msg.type === "disconnected") {
    showNotification("VPN Disconnected", "Connection closed.");
  } else if (msg.type === "error") {
    showNotification("VPN Error", msg.error);
  }
  cb();
});
```

```javascript
// popup.js - Display VPN status

document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ action: "getVpnStatus" }, updateUI);
});

function updateUI(status) {
  document.getElementById("status").textContent = status.connected ? "Connected" : "Disconnected";
  document.getElementById("action-btn").textContent = status.connected ? "Disconnect" : "Connect";
}
```

## Complete Example

```javascript
// background.js - Full VPN Provider

class SimpleVpnProvider {
  constructor() {
    this.configId = "simple-vpn";
    this.connected = false;
    this.createConfig();
    this.setupListeners();
  }
  
  createConfig() {
    chrome.vpnProvider.createConfig(this.configId, {
      name: "Simple VPN",
      description: "Demo VPN provider",
      host: "vpn.example.com",
      udp: true,
      mtu: 1400
    }, () => {});
  }
  
  setupListeners() {
    chrome.vpnProvider.onPlatformMessage.addListener((msg, cb) => {
      if (msg.type === "connected") {
        this.connected = true;
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        chrome.notifications.create({ type: "basic", title: "VPN Connected", message: "Secure tunnel active" });
      } else if (msg.type === "disconnected") {
        this.connected = false;
        chrome.action.setBadgeText({ text: "" });
      } else if (msg.type === "error") {
        chrome.notifications.create({ type: "basic", title: "VPN Error", message: msg.error });
      }
      cb();
    });
    
    chrome.vpnProvider.onPacketReceived.addListener((packet) => {
      console.log("Packet:", packet.data.byteLength, "bytes");
    });
    
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "getStatus") sendResponse({ connected: this.connected });
    });
  }
}

new SimpleVpnProvider();
```

## Best Practices

1. **Verify server certificates** to prevent MITM attacks
2. **Use strong encryption** for all tunneled traffic
3. **Handle disconnection gracefully** - clean up resources properly
4. **Store credentials securely** using Chrome Storage with encryption
5. **Test on ChromeOS thoroughly** before publishing
6. **Communicate platform limitations** clearly to users
