WebRTC in Chrome Extensions

Overview
WebRTC (Web Real-Time Communication) enables peer-to-peer audio, video, and data streaming directly in the browser. While Chrome extensions share many web platform capabilities, implementing WebRTC in extensions requires understanding unique constraints around permissions, content scripts, and service worker lifecycles. This guide covers patterns for building extension-powered video conferencing tools, screen sharing utilities, and real-time communication features.

Manifest Requirements

WebRTC requires specific manifest configuration depending on your use case:

```json
{
  "manifest_version": 3,
  "permissions": [
    "tabCapture",
    "desktopCapture",
    "activeTab"
  ],
  "host_permissions": [
    "*://*.your-domain.com/*"
  ]
}
```

The `tabCapture` and `desktopCapture` permissions are essential for capturing browser tabs or the entire screen. For peer-to-peer connections to external servers, you'll need appropriate host permissions.

Capturing Tab or Screen Audio/Video

The `chrome.tabCapture` and `chrome.desktopCapture` APIs are the foundation of extension-based WebRTC:

```ts
// background.ts - Request tab capture
async function captureTabVideo(tabId: number): Promise<MediaStream | null> {
  try {
    const stream = await chrome.tabCapture.capture({
      tabId,
      audio: true,
      video: true,
      videoConstraints: {
        mandatory: {
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080,
          frameRate: 30
        }
      }
    });
    return stream;
  } catch (error) {
    console.error('Tab capture failed:', error);
    return null;
  }
}

// List available capture sources
async function getCaptureSources(): Promise<chrome.desktopCapture.DesktopCaptureSource[]> {
  return new Promise((resolve) => {
    chrome.desktopCapture.getSources(
      {
        types: ['window', 'screen', 'tab'],
        thumbnailSize: { width: 320, height: 180 }
      },
      (sources) => resolve(sources)
    );
  });
}
```

Implementing a Peer Connection Manager

Managing WebRTC connections in extensions requires careful handling of the service worker lifecycle:

```ts
// background.ts - WebRTC Peer Connection Manager
interface PeerConnectionConfig {
  iceServers: RTCIceServer[];
}

class ExtensionPeerManager {
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  
  constructor(private config: PeerConnectionConfig) {}
  
  async initializeLocalStream(tabId: number): Promise<MediaStream | null> {
    this.localStream = await captureTabVideo(tabId);
    return this.localStream;
  }
  
  createPeerConnection(
    peerId: string, 
    onIceCandidate: (candidate: RTCIceCandidate, peerId: string) => void,
    onTrack: (stream: MediaStream, peerId: string) => void
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate, peerId);
      }
    };
    
    pc.ontrack = (event) => {
      onTrack(event.streams[0], peerId);
    };
    
    // Add local stream tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    this.peerConnections.set(peerId, pc);
    return pc;
  }
  
  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }
  
  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    
    await pc.setRemoteDescription(answer);
  }
  
  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;
    
    await pc.addIceCandidate(candidate);
  }
  
  closePeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }
  
  cleanup(): void {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
  }
}
```

Communication Between Contexts

WebRTC streams must be passed between extension contexts carefully:

```ts
// background.ts - Message passing for stream handling
type StreamMessage = 
  | { type: 'offer'; peerId: string; sdp: string }
  | { type: 'answer'; peerId: string; sdp: string }
  | { type: 'ice-candidate'; peerId: string; candidate: RTCIceCandidateInit };

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: StreamMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;
  
  switch (message.type) {
    case 'offer':
      handleOffer(tabId, message);
      break;
    case 'answer':
      handleAnswer(tabId, message);
      break;
    case 'ice-candidate':
      handleIceCandidate(tabId, message);
      break;
  }
});

// content.ts - Send offer to background
async function initiateCall(peerId: string): Promise<void> {
  const peerManager = getPeerManager(); // Your instance
  const offer = await peerManager.createOffer(peerId);
  
  chrome.runtime.sendMessage({
    type: 'offer',
    peerId,
    sdp: offer.sdp
  });
}
```

Handling Service Worker Termination

Service workers in MV3 can be terminated after inactivity. Implement reconnection logic:

```ts
// background.ts - Persistence and reconnection
const STORAGE_KEY = 'webrtc_state';

interface PersistedState {
  peers: Array<{
    peerId: string;
    localDescription?: RTCSessionDescriptionInit;
    remoteDescription?: RTCSessionDescriptionInit;
    iceCandidates: RTCIceCandidateInit[];
  }>;
}

async function persistState(state: PersistedState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

async function restoreState(): Promise<PersistedState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
}

// Reinitialize on service worker startup
chrome.runtime.onStartup.addListener(async () => {
  const savedState = await restoreState();
  if (savedState) {
    // Reconstruct peer connections from saved state
    await reinitializePeers(savedState);
  }
});
```

Best Practices

1. Always handle permissions gracefully - Users may revoke camera/microphone access at any time
2. Use `getUserMedia` constraints properly - Test various resolution and frame rate combinations
3. Implement proper cleanup - Close peer connections and stop tracks when done
4. Handle ICE server failures - Provide fallback servers and connection state monitoring
5. Consider MV2 to MV3 differences - Background pages in MV2 stay alive; service workers in MV3 need reconnection logic

Common Use Cases

- Screen recording extensions: Capture tabs or windows for tutorial creation
- Meeting boosters: Add functionality to existing video conferencing platforms
- Peer-to-peer file transfer: Direct browser-to-browser file sharing
- Live streaming tools: Broadcast captured content to RTMP servers

WebRTC in Chrome extensions opens powerful real-time communication possibilities. By understanding the unique constraints of extension architecture and implementing proper state management, you can build solid video, audio, and data streaming features.
