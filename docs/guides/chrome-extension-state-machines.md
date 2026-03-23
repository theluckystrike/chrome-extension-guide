---
layout: default
title: "Chrome Extension State Machines. Developer Guide"
description: "Learn Chrome extension state machines with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-state-machines/"
---
State Machines for Chrome Extension Logic

State machines provide a structured way to manage complex extension behavior, turning tangled conditional logic into clear, predictable flows. By defining explicit states and allowed transitions, you eliminate impossible states and make your extension's behavior understandable at a glance.

Why State Machines {#why-state-machines}

Traditional extension logic often relies on scattered boolean flags and nested conditionals:

```javascript
// Fragile approach: hard to track all possible states
let isAuthenticated = false;
let isLoading = false;
let hasError = false;
if (isAuthenticated && !isLoading && !hasError) { /* ... */ }
```

State machines solve this by enforcing explicit transitions:

- Prevent impossible states: Only valid transitions are allowed
- Clear transitions: Every state change has a documented trigger
- Easier debugging: Current state and possible events are explicit

XState Integration {#xstate-integration}

[XState](https://xstate.js.org/) is a lightweight state machine library ideal for extensions:

```bash
npm install xstate
```

Define a machine:

```javascript
import { createMachine, assign } from 'xstate';

const authMachine = createMachine({
  id: 'auth',
  initial: 'idle',
  states: {
    idle: {
      on: { LOGIN: 'authenticating' }
    },
    authenticating: {
      invoke: {
        src: 'loginService',
        onDone: 'authenticated',
        onError: 'failed'
      }
    },
    authenticated: {
      on: { LOGOUT: 'idle' }
    },
    failed: {
      on: { RETRY: 'authenticating', LOGIN: 'authenticating' }
    }
  }
});
```

Extension Use Cases {#extension-use-cases}

Authentication Flow {#authentication-flow}

Manage user authentication with clear states:

```javascript
const authMachine = createMachine({
  id: 'auth',
  initial: 'checking',
  context: { user: null, error: null },
  states: {
    checking: {
      invoke: { src: 'checkAuth', onDone: 'authenticated', onError: 'unauthenticated' }
    },
    authenticating: {
      invoke: { src: 'login', onDone: { target: 'authenticated', actions: 'saveUser' }, onError: { target: 'failed', actions: 'saveError' } }
    },
    authenticated: { on: { LOGOUT: 'unauthenticating' } },
    unauthenticating: { invoke: { src: 'logout', onDone: 'unauthenticated' } },
    failed: { on: { RETRY: 'authenticating' } },
    unauthenticated: { on: { LOGIN: 'authenticating' } }
  }
});
```

Download Manager {#download-manager}

Track download lifecycle:

```javascript
const downloadMachine = createMachine({
  id: 'download',
  initial: 'idle',
  states: {
    idle: { on: { START: 'downloading' } },
    downloading: {
      invoke: { src: 'downloadFile', onDone: 'completed', onError: 'failed' }
    },
    paused: { on: { RESUME: 'downloading', CANCEL: 'cancelled' } },
    completed: { on: { RESET: 'idle' } },
    failed: { on: { RETRY: 'downloading', CANCEL: 'cancelled' } },
    cancelled: { on: { RESET: 'idle' } }
  }
});
```

Onboarding Wizard {#onboarding-wizard}

Multi-step wizard with validation:

```javascript
const onboardingMachine = createMachine({
  id: 'onboarding',
  initial: 'welcome',
  states: {
    welcome: { on: { NEXT: 'profile' } },
    profile: { on: { NEXT: 'preferences', BACK: 'welcome' } },
    preferences: { on: { NEXT: 'complete', BACK: 'profile' } },
    complete: { type: 'final' }
  }
});
```

State Persistence {#state-persistence}

Serialize machine state to `chrome.storage` and restore on service worker wake:

```javascript
const PERSISTENCE_KEY = 'authMachineState';

async function saveState(service) {
  const state = service.getSnapshot();
  await chrome.storage.local.set({ [PERSISTENCE_KEY]: state });
}

async function restoreState() {
  const { [PERSISTENCE_KEY]: state } = await chrome.storage.local.get(PERSISTENCE_KEY);
  return state;
}

// In service worker
const authService = interpret(authMachine).start();

chrome.runtime.onStartup.addListener(async () => {
  const savedState = await restoreState();
  if (savedState) {
    authService.start(savedState);
  }
});

// Subscribe to state changes
authService.onTransition(state => {
  saveState(authService);
});
```

Transition Handlers {#transition-handlers}

Trigger Chrome API calls on state transitions:

```javascript
const machine = createMachine({
  id: 'notifications',
  initial: 'idle',
  states: {
    idle: { on: { ENABLE: 'enabled' } },
    enabled: {
      entry: 'setupListeners',
      exit: 'removeListeners',
      on: { DISABLE: 'idle' }
    }
  }
}, {
  actions: {
    setupListeners: () => {
      chrome.notifications.onClicked.addListener(handleNotificationClick);
    },
    removeListeners: () => {
      chrome.notifications.onClicked.removeListener(handleNotificationClick);
    }
  }
});
```

Guards and Actions {#guards-and-actions}

Use guards for conditional transitions:

```javascript
const machine = createMachine({
  id: 'feature',
  initial: 'checking',
  states: {
    checking: {
      always: [
        { target: 'enabled', cond: 'hasPermission' },
        { target: 'permissionNeeded' }
      ]
    },
    enabled: { on: { DISABLE: 'disabled' } },
    permissionNeeded: { on: { GRANTED: 'enabled', DENIED: 'disabled' } },
    disabled: { on: { ENABLE: 'checking' } }
  }
}, {
  guards: {
    hasPermission: (_, event) => event.permissions.includes('storage')
  }
});
```

Parallel and Hierarchical States {#parallel-and-hierarchical-states}

Parallel States {#parallel-states}

Multiple independent state machines for different features:

```javascript
const extensionMachine = createMachine({
  id: 'extension',
  type: 'parallel',
  states: {
    ui: {
      initial: 'visible',
      states: { visible: { on: { HIDE_UI: 'hidden' } }, hidden: { on: { SHOW_UI: 'visible' } } }
    },
    sync: {
      initial: 'idle',
      states: {
        idle: { on: { START_SYNC: 'syncing' } },
        syncing: { on: { COMPLETE: 'idle', ERROR: 'error' } },
        error: { on: { RETRY: 'syncing' } }
      }
    },
    network: {
      initial: 'online',
      states: {
        online: { on: { OFFLINE: 'offline' } },
        offline: { on: { ONLINE: 'online' } }
      }
    }
  }
});
```

Hierarchical States {#hierarchical-states}

Nested states for complex flows:

```javascript
const checkoutMachine = createMachine({
  id: 'checkout',
  initial: 'cart',
  states: {
    cart: {
      on: { CHECKOUT: 'shipping' }
    },
    shipping: {
      initial: 'editing',
      states: {
        editing: { on: { VALIDATE: 'validating', BACK: 'cart' } },
        validating: { invoke: { src: 'validateAddress', onDone: 'valid', onError: 'invalid' } },
        valid: { on: { NEXT: 'payment', EDIT: 'editing' } },
        invalid: { on: { EDIT: 'editing' } }
      },
      on: { BACK: 'cart' }
    },
    payment: {
      initial: 'selecting',
      states: {
        selecting: { on: { PROCESS: 'processing' } },
        processing: { invoke: { src: 'processPayment', onDone: 'complete', onError: 'failed' } },
        complete: { type: 'final' },
        failed: { on: { RETRY: 'selecting' } }
      }
    }
  }
});
```

Testing State Machines {#testing-state-machines}

State machines are pure and easily unit tested:

```javascript
import { createActor } from 'xstate';

describe('Auth Machine', () => {
  it('should transition from idle to authenticating on LOGIN', () => {
    const actor = createActor(authMachine).start();
    actor.send({ type: 'LOGIN' });
    expect(actor.getSnapshot().value).toBe('authenticating');
  });

  it('should transition to authenticated on successful login', async () => {
    const actor = createActor(authMachine).start();
    actor.send({ type: 'LOGIN' });
    // Wait for async login to complete
    await waitFor(actor, state => state.matches('authenticated'));
    expect(actor.getSnapshot().value).toBe('authenticated');
  });
});
```

Visualizing State {#visualizing-state}

Use the [XState Visualizer](https://stately.ai/viz) during development to diagram your state machines and visualize transitions. Export machine configurations to share with team members.

---

Related Resources {#related-resources}

- [State Management Patterns](../patterns/state-management.md)
- [Extension Architecture Patterns](./architecture-patterns.md)
- [Event-Driven Architecture](../mv3/event-driven-architecture.md)

Related Articles {#related-articles}

Related Articles

- [State Management](../patterns/state-management.md)
- [Extension Architecture](../guides/extension-architecture.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
