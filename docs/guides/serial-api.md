---
layout: guide
title: Chrome Serial API Guide
description: Learn how to use the Chrome Serial API to communicate with serial devices from Chrome extensions.
---

# Chrome Serial API Guide

Overview
The Chrome Serial API (`chrome.serial`) enables Chrome extensions to communicate with serial devices connected to the user's computer via USB or Bluetooth. This API is particularly useful for building extensions that interact with microcontrollers (Arduino, Raspberry Pi), industrial equipment, or any device using serial communication (RS-232, RS-485).

The Serial API provides a complete set of functions for discovering ports, establishing connections, sending and receiving data, and handling errors. It's available in both Manifest V2 and V3, though V3 requires the API to be accessed from a service worker or background context.

Required Permissions

To use the Serial API, you must declare the `serial` permission in your extension's manifest:

```json
{
  "name": "Serial Device Controller",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["serial"],
  "host_permissions": ["serial://*/*"]
}
```

The `host_permissions` field is optional but can be used to restrict access to specific serial devices or device patterns. Without host permissions, the extension will prompt the user to select a device each time a connection is attempted.

Listing Serial Ports with getDevices

Before connecting to a serial device, you need to discover available ports. The `chrome.serial.getDevices()` method returns a list of all available serial ports on the user's system.

```javascript
// Get all available serial ports
async function listSerialPorts() {
  try {
    const ports = await chrome.serial.getDevices();
    
    ports.forEach((port) => {
      console.log(`Port: ${port.path}`);
      console.log(`Display Name: ${port.displayName || 'Unknown'}`);
      console.log(`Vendor ID: ${port.vendorId}`);
      console.log(`Product ID: ${port.productId}`);
    });
    
    return ports;
  } catch (error) {
    console.error('Error getting serial ports:', error);
    return [];
  }
}

// Call the function
listSerialPorts();
```

The `getDevices()` method returns an array of `SerialPort` objects, each containing:
- `path`: The system path to the port (e.g., `/dev/ttyUSB0` on Linux, `COM3` on Windows)
- `displayName`: A human-readable name for the port (if available)
- `vendorId`: The USB vendor ID (if it's a USB device)
- `productId`: The USB product ID (if it's a USB device)

For a more user-friendly interface, you might want to populate a dropdown menu with the available ports:

```javascript
function populatePortDropdown(ports) {
  const select = document.getElementById('port-select');
  select.innerHTML = '<option value="">Select a port...</option>';
  
  ports.forEach((port) => {
    const option = document.createElement('option');
    option.value = port.path;
    option.textContent = port.displayName || port.path;
    select.appendChild(option);
  });
}
```

Connecting to Ports with connect

Once you've identified the target port, you can establish a connection using `chrome.serial.connect()`. This method accepts the port path and connection options, returning a connection ID that you'll use for subsequent operations.

```javascript
// Connect to a serial port with default settings
async function connectToPort(portPath) {
  const connectionOptions = {
    bitrate: 9600,
    dataBits: 'eight',
    parityBit: 'no',
    stopBits: 'one',
    persistentConnection: false
  };
  
  try {
    const connectionInfo = await chrome.serial.connect(portPath, connectionOptions);
    console.log('Connected with ID:', connectionInfo.connectionId);
    console.log('Buffer size:', connectionInfo.bufferSize);
    return connectionInfo;
  } catch (error) {
    console.error('Connection failed:', error);
    throw error;
  }
}

// Example usage
const ports = await chrome.serial.getDevices();
if (ports.length > 0) {
  const connection = await connectToPort(ports[0].path);
}
```

The `connect()` method returns a `ConnectionInfo` object containing:
- `connectionId`: A unique identifier for the connection (used for send, disconnect, etc.)
- `bufferSize`: The size of the receive buffer

Connection Options: bitrate, dataBits, parityBit, stopBits

The Serial API supports various connection parameters to accommodate different device requirements. Understanding these options is crucial for establishing successful communication with your serial device.

Bitrate
The bitrate (baud rate) determines how many bits are transmitted per second. Common values include:
- 9600 (most common for simple devices)
- 19200
- 38400
- 57600
- 115200 (common for Arduino and similar devices)

```javascript
const connectionOptions = {
  bitrate: 115200
};
```

Data Bits
The number of data bits per frame. Valid values are `'five'`, `'six'`, `'seven'`, or `'eight'`. The default and most common is `'eight'`.

```javascript
const connectionOptions = {
  bitrate: 9600,
  dataBits: 'eight'  // Default, most common
};
```

Parity Bit
Parity checking can detect transmission errors. Valid values are `'no'`, `'odd'`, or `'even'`. Use `'no'` for no parity checking.

```javascript
const connectionOptions = {
  bitrate: 9600,
  parityBit: 'no'    // Default, no parity checking
};
```

Stop Bits
Stop bits separate frames and indicate the end of a character. Valid values are `'one'` or `'two'`. The default is `'one'`.

```javascript
const connectionOptions = {
  bitrate: 9600,
  stopBits: 'one'    // Default, 1 stop bit
};
```

Complete Connection Options Example

```javascript
// Configure connection for a typical Arduino device
const arduinoOptions = {
  bitrate: 9600,
  dataBits: 'eight',
  parityBit: 'no',
  stopBits: 'one',
  persistentConnection: false  // Disconnect when extension is unloaded
};

// Configure for a device requiring specific settings
const customOptions = {
  bitrate: 57600,
  dataBits: 'eight',
  parityBit: 'even',
  stopBits: 'one',
  persistentConnection: true   // Keep connection alive
};
```

Sending Data with send

Once connected, you can transmit data to the serial device using `chrome.serial.send()`. The data must be sent as an ArrayBuffer.

```javascript
// Send string data to the serial device
async function sendString(connectionId, data) {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  
  try {
    await chrome.serial.send(connectionId, buffer.buffer);
    console.log('Data sent successfully');
  } catch (error) {
    console.error('Send failed:', error);
  }
}

// Send numeric data (bytes)
async function sendBytes(connectionId, byteArray) {
  const buffer = new Uint8Array(byteArray).buffer;
  
  try {
    await chrome.serial.send(connectionId, buffer);
    console.log('Bytes sent successfully');
  } catch (error) {
    console.error('Send failed:', error);
  }
}

// Example: Send commands to an Arduino
async function controlArduino(connectionId) {
  // Turn LED on (typically "HIGH" or numeric value)
  await sendString(connectionId, 'LED_ON\n');
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Turn LED off
  await sendString(connectionId, 'LED_OFF\n');
}
```

The `send()` method takes two parameters:
1. `connectionId`: The ID returned by `connect()`
2. `data`: An ArrayBuffer containing the bytes to send

Sending Binary Data

For binary protocols, you may need to construct specific byte sequences:

```javascript
// Send a binary command (e.g., 0xFF 0x01 0x00)
function sendBinaryCommand(connectionId) {
  const command = new Uint8Array([0xFF, 0x01, 0x00]);
  chrome.serial.send(connectionId, command.buffer);
}

// Send data with a specific format (e.g., temperature reading)
function sendTemperatureCommand(connectionId, tempCelsius) {
  const command = new Uint8Array([
    0x01,        // Command byte
    0x42,        // Type: temperature
    tempCelsius  // Value
  ]);
  chrome.serial.send(connectionId, command.buffer);
}
```

Receiving Data with onReceive

To receive data from the serial device, you must set up a listener using `chrome.serial.onReceive.addListener()`. This event fires whenever data is received from the connected device.

```javascript
// Set up receive listener
chrome.serial.onReceive.addListener((info) => {
  if (info.connectionId === currentConnectionId) {
    // Convert ArrayBuffer to string
    const decoder = new TextDecoder();
    const text = decoder.decode(info.data);
    
    console.log('Received:', text);
    
    // Process the received data
    handleReceivedData(text);
  }
});

function handleReceivedData(data) {
  // Parse and process incoming data
  const lines = data.split('\n');
  
  lines.forEach(line => {
    if (line.trim()) {
      console.log('Processing:', line);
    }
  });
}
```

The `onReceive` event provides an `info` object with:
- `connectionId`: The connection that received the data
- `data`: An ArrayBuffer containing the received bytes

Receiving Binary Data

For binary data, you'll need to parse the ArrayBuffer:

```javascript
chrome.serial.onReceive.addListener((info) => {
  const bytes = new Uint8Array(info.data);
  
  console.log('Received', bytes.length, 'bytes');
  
  // Parse specific binary formats
  if (bytes.length >= 4) {
    const command = bytes[0];
    const value = (bytes[1] << 8) | bytes[2];  // 16-bit value
    const checksum = bytes[3];
    
    console.log('Command:', command);
    console.log('Value:', value);
    console.log('Checksum:', checksum);
  }
});
```

Building a Simple Data Parser

```javascript
// Buffer for incomplete messages
let receiveBuffer = '';

chrome.serial.onReceive.addListener((info) => {
  const decoder = new TextDecoder();
  const text = decoder.decode(info.data);
  
  // Append to buffer
  receiveBuffer += text;
  
  // Process complete messages (newline-delimited)
  const lines = receiveBuffer.split('\n');
  receiveBuffer = lines.pop();  // Keep incomplete line in buffer
  
  lines.forEach(processMessage);
});

function processMessage(message) {
  message = message.trim();
  if (!message) return;
  
  console.log('Message:', message);
  
  // Parse JSON responses
  try {
    const data = JSON.parse(message);
    console.log('Parsed:', data);
  } catch (e) {
    // Not JSON, handle as plain text
  }
}
```

Error Handling with onReceiveError

The Serial API provides the `chrome.serial.onReceiveError` event for handling connection errors and unexpected disconnections.

```javascript
// Set up error listener
chrome.serial.onReceiveError.addListener((info) => {
  console.error('Serial error:', info.error);
  
  switch (info.error) {
    case 'disconnected':
      console.log('Device disconnected');
      handleDisconnection(info.connectionId);
      break;
    case 'device_lost':
      console.log('Device lost (e.g., USB unplugged)');
      handleDisconnection(info.connectionId);
      break;
    case 'buffer_overflow':
      console.error('Buffer overflow - data was lost');
      break;
    case ' Framing error':
      console.error('Framing error - check parity and stop bits');
      break;
    case 'parity_error':
      console.error('Parity error - check parity settings');
      break;
    case 'system_error':
      console.error('System error:', info.systemError);
      break;
    default:
      console.error('Unknown error:', info.error);
  }
});

function handleDisconnection(connectionId) {
  console.log('Cleaning up connection:', connectionId);
  currentConnectionId = null;
  updateConnectionStatus('disconnected');
}
```

Error Types

The `onReceiveError` event provides different error types:
- `disconnected`: The connection was closed normally
- `device_lost`: The device was unexpectedly disconnected (e.g., USB removed)
- `buffer_overflow`: The receive buffer was overrun
- `framing_error`: A framing error occurred (check stop bits)
- `parity_error`: A parity error occurred (check parity settings)
- `system_error`: A system-level error occurred

Implementing Automatic Reconnection

```javascript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

chrome.serial.onReceiveError.addListener(async (info) => {
  if (info.error === 'device_lost' || info.error === 'disconnected') {
    console.log('Attempting to reconnect...');
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      
      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        await connectToPort(lastPortPath);
        reconnectAttempts = 0;
        console.log('Reconnected successfully');
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    } else {
      console.log('Max reconnection attempts reached');
      reconnectAttempts = 0;
    }
  }
});
```

Building a Serial Terminal Extension

Now let's put together everything we've learned to build a functional serial terminal extension. This example demonstrates a complete implementation with UI.

manifest.json

```json
{
  "name": "Serial Terminal",
  "version": "1.0",
  "manifest_version": 3,
  "description": "A serial terminal for communicating with connected devices",
  "permissions": ["serial"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>Serial Terminal</title>
  <style>
    body { width: 500px; font-family: monospace; padding: 10px; }
    #terminal {
      height: 300px;
      background: #1e1e1e;
      color: #00ff00;
      overflow-y: auto;
      padding: 10px;
      white-space: pre-wrap;
      border: 1px solid #333;
    }
    .controls { margin: 10px 0; }
    select, input, button { padding: 5px; margin: 2px; }
    #sendInput { width: 300px; }
    .status { padding: 5px; margin-top: 10px; font-size: 12px; }
    .connected { color: green; }
    .disconnected { color: red; }
  </style>
</head>
<body>
  <h3>Serial Terminal</h3>
  
  <div class="controls">
    <select id="portSelect"></select>
    <select id="bitrateSelect">
      <option value="9600">9600</option>
      <option value="19200">19200</option>
      <option value="38400">38400</option>
      <option value="57600">57600</option>
      <option value="115200">115200</option>
    </select>
    <button id="connectBtn">Connect</button>
    <button id="disconnectBtn" disabled>Disconnect</button>
  </div>
  
  <div id="terminal"></div>
  
  <div class="controls">
    <input type="text" id="sendInput" placeholder="Enter command...">
    <button id="sendBtn" disabled>Send</button>
    <button id="clearBtn">Clear</button>
  </div>
  
  <div id="status" class="status disconnected">Status: Disconnected</div>
  
  <script src="popup.js"></script>
</body>
</html>
```

popup.js - Complete Implementation

```javascript
let connectionId = null;
let receiveBuffer = '';
let lastPortPath = '';

document.addEventListener('DOMContentLoaded', async () => {
  await refreshPortList();
  setupEventListeners();
});

async function refreshPortList() {
  const ports = await chrome.serial.getDevices();
  const select = document.getElementById('portSelect');
  select.innerHTML = '<option value="">Select a port...</option>';
  
  ports.forEach((port) => {
    const option = document.createElement('option');
    option.value = port.path;
    option.textContent = port.displayName || port.path;
    select.appendChild(option);
  });
}

function setupEventListeners() {
  document.getElementById('connectBtn').addEventListener('click', connect);
  document.getElementById('disconnectBtn').addEventListener('click', disconnect);
  document.getElementById('sendBtn').addEventListener('click', sendData);
  document.getElementById('clearBtn').addEventListener('click', clearTerminal);
  document.getElementById('sendInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendData();
  });
}

async function connect() {
  const portPath = document.getElementById('portSelect').value;
  const bitrate = parseInt(document.getElementById('bitrateSelect').value);
  
  if (!portPath) {
    alert('Please select a port');
    return;
  }
  
  const options = {
    bitrate: bitrate,
    dataBits: 'eight',
    parityBit: 'no',
    stopBits: 'one'
  };
  
  try {
    const info = await chrome.serial.connect(portPath, options);
    connectionId = info.connectionId;
    lastPortPath = portPath;
    
    updateUI(true);
    logToTerminal(`Connected to ${portPath} at ${bitrate} baud`);
  } catch (error) {
    console.error('Connection failed:', error);
    alert('Connection failed: ' + error.message);
  }
}

async function disconnect() {
  if (connectionId) {
    await chrome.serial.disconnect(connectionId);
    connectionId = null;
    updateUI(false);
    logToTerminal('Disconnected');
  }
}

async function sendData() {
  const input = document.getElementById('sendInput');
  const data = input.value;
  
  if (!connectionId) {
    alert('Not connected');
    return;
  }
  
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data + '\n');
  
  try {
    await chrome.serial.send(connectionId, buffer.buffer);
    logToTerminal(`> ${data}`);
    input.value = '';
  } catch (error) {
    console.error('Send failed:', error);
  }
}

// Receive data handler
chrome.serial.onReceive.addListener((info) => {
  if (info.connectionId === connectionId) {
    const decoder = new TextDecoder();
    const text = decoder.decode(info.data);
    receiveBuffer += text;
    
    // Process complete lines
    const lines = receiveBuffer.split('\n');
    receiveBuffer = lines.pop();
    
    lines.forEach(line => {
      if (line.trim()) {
        logToTerminal(`< ${line}`);
      }
    });
  }
});

// Error handler
chrome.serial.onReceiveError.addListener((info) => {
  if (info.connectionId === connectionId) {
    console.error('Serial error:', info.error);
    logToTerminal(`Error: ${info.error}`);
    
    if (info.error === 'device_lost' || info.error === 'disconnected') {
      connectionId = null;
      updateUI(false);
      logToTerminal('Device disconnected');
    }
  }
});

function logToTerminal(message) {
  const terminal = document.getElementById('terminal');
  const line = document.createElement('div');
  line.textContent = message;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
  document.getElementById('terminal').innerHTML = '';
  receiveBuffer = '';
}

function updateUI(connected) {
  document.getElementById('connectBtn').disabled = connected;
  document.getElementById('disconnectBtn').disabled = !connected;
  document.getElementById('sendBtn').disabled = !connected;
  document.getElementById('portSelect').disabled = connected;
  document.getElementById('bitrateSelect').disabled = connected;
  
  const status = document.getElementById('status');
  if (connected) {
    status.textContent = 'Status: Connected';
    status.className = 'status connected';
  } else {
    status.textContent = 'Status: Disconnected';
    status.className = 'status disconnected';
  }
}
```

Best Practices

When working with the Chrome Serial API, follow these best practices:

1. Always handle errors: Use try-catch blocks and the `onReceiveError` listener to handle connection failures gracefully.

2. Use persistent connections wisely: Set `persistentConnection: true` only if your extension needs to maintain a connection across page loads.

3. Implement proper buffering: Serial data may arrive in chunks, so implement buffering to assemble complete messages.

4. Clean up connections: Always disconnect when the extension is unloaded or when the connection is no longer needed.

5. Test with multiple devices: Different serial devices may have different requirements for bitrate, parity, and stop bits.

6. Consider security: Be cautious about sending commands to serial devices, as they can control physical hardware.

Summary

The Chrome Serial API provides powerful capabilities for extensions to communicate with serial devices. Key methods include:

- `chrome.serial.getDevices()` - Discover available ports
- `chrome.serial.connect()` - Establish connection with configurable options
- `chrome.serial.send()` - Transmit data as ArrayBuffer
- `chrome.serial.onReceive` - Listen for incoming data
- `chrome.serial.onReceiveError` - Handle errors and disconnections
- `chrome.serial.disconnect()` - Close the connection

With these tools, you can build everything from simple serial monitors to complex device control applications.
