# Form Autofill in Chrome Extensions

## Introduction

Form autofill is one of the most practical features you can build in a Chrome extension. Whether it's personal information (name, address, phone), payment details, or frequently used text snippets, autofill saves users countless hours of repetitive data entry. This guide covers the architecture, implementation patterns, and best practices for building a robust form autofill extension.

## Understanding the Architecture

Form autofill extensions typically work in one of three ways:

1. **Content Script Injection** - Inject JavaScript into web pages to detect and fill forms
2. **Declarative Net Request** - Use Chrome's declarative automation rules
3. **Side Panel + Messaging** - Keep autofill data in a side panel and communicate with content scripts

For most use cases, a combination of content scripts and the `chrome.storage` API provides the best balance of flexibility and security.

## Core Data Storage

First, let's set up a TypeScript module to manage autofill profiles:

```typescript
// src/types/autofill.ts
export interface AutofillProfile {
  id: string;
  name: string;
  fields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface FormField {
  name: string;
  value: string;
  selector: string;
}

// src/services/profileStorage.ts
import { storage } from '@theluckystrike/webext-storage';
import type { AutofillProfile } from '../types/autofill';

const PROFILES_KEY = 'autofill_profiles';

export async function saveProfile(profile: AutofillProfile): Promise<void> {
  const profiles = await getProfiles();
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = { ...profile, updatedAt: Date.now() };
  } else {
    profiles.push({ ...profile, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  await storage.set(PROFILES_KEY, profiles);
}

export async function getProfiles(): Promise<AutofillProfile[]> {
  return await storage.get<AutofillProfile[]>(PROFILES_KEY) ?? [];
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await getProfiles();
  await storage.set(PROFILES_KEY, profiles.filter(p => p.id !== id));
}
```

## Form Field Detection

The most challenging part of autofill is accurately detecting form fields on web pages. Different websites use various naming conventions:

```typescript
// src/utils/fieldDetector.ts
interface DetectedField {
  element: HTMLInputElement;
  fieldType: string;
  confidence: number;
}

// Common field name patterns for different data types
const FIELD_PATTERNS = {
  email: /email|e-mail|mail/i,
  firstName: /first.?name|firstname|first_name/i,
  lastName: /last.?name|lastname|last_name|surname/i,
  phone: /phone|mobile|cell|tel/i,
  address: /address|addr|street/i,
  city: /city|town/i,
  state: /state|province|region/i,
  zipCode: /zip|postal|postcode/i,
  country: /country|nation/i,
};

export function detectFields(form: HTMLFormElement): DetectedField[] {
  const inputs = form.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="submit"])'
  );
  
  const detected: DetectedField[] = [];
  
  for (const input of inputs) {
    const fieldType = matchFieldType(input);
    if (fieldType) {
      detected.push({
        element: input,
        fieldType,
        confidence: calculateConfidence(input, fieldType),
      });
    }
  }
  
  return detected.sort((a, b) => b.confidence - a.confidence);
}

function matchFieldType(input: HTMLInputElement): string | null {
  const name = input.name ?? '';
  const id = input.id ?? '';
  const type = input.type ?? '';
  const placeholder = input.placeholder ?? '';
  const label = findAssociatedLabel(input);
  
  const searchText = `${name} ${id} ${type} ${placeholder} ${label}`;
  
  for (const [fieldType, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (pattern.test(searchText)) {
      return fieldType;
    }
  }
  
  return null;
}

function findAssociatedLabel(input: HTMLInputElement): string {
  // Check for explicit label association
  const labeled = input.closest('label');
  if (labeled) return labeled.textContent ?? '';
  
  // Check for label with 'for' attribute
  const label = document.querySelector(`label[for="${input.id}"]`);
  if (label) return label.textContent ?? '';
  
  return '';
}

function calculateConfidence(input: HTMLInputElement, fieldType: string): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence with explicit attributes
  if (input.name && FIELD_PATTERNS[fieldType as keyof typeof FIELD_PATTERNS]?.test(input.name)) {
    confidence += 0.3;
  }
  if (input.id && FIELD_PATTERNS[fieldType as keyof typeof FIELD_PATTERNS]?.test(input.id)) {
    confidence += 0.2;
  }
  if (input.type === 'email' && fieldType === 'email') confidence += 0.2;
  if (input.type === 'tel' && fieldType === 'phone') confidence += 0.2;
  
  return Math.min(confidence, 1);
}
```

## Auto-Fill Implementation

Now let's create the content script that performs the actual filling:

```typescript
// src/content/autofill.ts
import { getProfiles, type AutofillProfile } from '../services/profileStorage';
import { detectFields } from '../utils/fieldDetector';

interface FillRequest {
  profileId: string;
  formIndex?: number;
}

async function handleFillRequest(request: FillRequest): Promise<void> {
  const profiles = await getProfiles();
  const profile = profiles.find(p => p.id === request.profileId);
  
  if (!profile) {
    console.error('Profile not found:', request.profileId);
    return;
  }
  
  const forms = document.querySelectorAll<HTMLFormElement>('form');
  const targetForm = request.formIndex !== undefined 
    ? forms[request.formIndex] 
    : forms[0];
  
  if (!targetForm) {
    console.error('No form found to fill');
    return;
  }
  
  await fillForm(targetForm, profile);
}

async function fillForm(form: HTMLFormElement, profile: AutofillProfile): Promise<void> {
  const detectedFields = detectFields(form);
  let filledCount = 0;
  
  for (const { element, fieldType } of detectedFields) {
    const value = profile.fields[fieldType as keyof FormFields];
    
    if (value) {
      // Use native events to ensure proper validation triggers
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      filledCount++;
    }
  }
  
  // Show feedback to user
  showNotification(`Filled ${filledCount} fields from "${profile.name}"`);
}

function showNotification(message: string): void {
  const notification = document.createElement('div');
  notification.className = 'autofill-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

// Listen for messages from popup/side panel
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'FILL_FORM') {
    handleFillRequest(message.payload);
  }
});
```

## Privacy and Security Considerations

When building autofill extensions, you must handle sensitive data carefully:

```typescript
// src/services/secureStorage.ts
import { storage } from '@theluckystrike/webext-storage';

// Never store sensitive data in localStorage or plain storage
// Use chrome.storage.session for temporary sensitive data
export async function storeSensitiveData(key: string, value: string): Promise<void> {
  await storage.setSession(key, value);
}

export async function getSensitiveData(key: string): Promise<string | null> {
  return await storage.getSession(key);
}

// Clear sensitive data when extension is unloaded
chrome.runtime.onSuspend.addListener(async () => {
  await storage.clearSession();
});

// Implement encryption for stored profiles
import { encrypt, decrypt } from '../utils/crypto';

export async function encryptAndStore(profiles: AutofillProfile[]): Promise<void> {
  const encrypted = await encrypt(JSON.stringify(profiles));
  await storage.set('encrypted_profiles', encrypted);
}
```

## Matching Profiles to Pages

You can create intelligent matching to suggest the right profile:

```typescript
// src/utils/profileMatcher.ts
import type { AutofillProfile } from '../types/autofill';

interface PageInfo {
  url: string;
  domain: string;
  formFields: string[];
}

export function matchProfileToPage(
  profiles: AutofillProfile[],
  pageInfo: PageInfo
): AutofillProfile | null {
  // Score each profile based on domain usage history
  const scored = profiles.map(profile => ({
    profile,
    score: calculateMatchScore(profile, pageInfo),
  }));
  
  // Return highest scoring profile above threshold
  const best = scored
    .filter(s => s.score > 0.5)
    .sort((a, b) => b.score - a.score)[0];
  
  return best?.profile ?? null;
}

function calculateMatchScore(profile: AutofillProfile, pageInfo: PageInfo): number {
  // Check domain patterns (e.g., shopping sites get shipping profiles)
  const domainPatterns = profile.metadata?.domainPatterns ?? [];
  for (const pattern of domainPatterns) {
    if (new RegExp(pattern).test(pageInfo.domain)) {
      return 0.9;
    }
  }
  
  // Fall back to usage frequency
  const usageCount = profile.metadata?.usageCount ?? 0;
  return Math.min(usageCount / 10, 0.5);
}
```

## Best Practices Summary

1. **Use semantic field detection** - Don't rely solely on input names; check labels, placeholders, and types
2. **Trigger proper events** - Always dispatch `input` and `change` events after filling
3. **Encrypt sensitive data** - Never store plain text passwords or payment info
4. **Provide manual override** - Users should be able to edit fields before submission
5. **Support multiple profiles** - Let users create profiles for different contexts (work, personal, shopping)
6. **Respect privacy** - Be transparent about what data you collect and store
7. **Handle dynamic forms** - Use MutationObserver for SPAs with dynamically loaded forms

## Common Pitfalls

- **Overly aggressive filling** - Don't fill hidden fields or fields users have explicitly cleared
- **Not handling autocomplete** - Some browsers override your values; test thoroughly
- **Missing error handling** - Forms may be on different domains with CORS restrictions
- **Performance issues** - Don't scan the entire DOM on every page load; use event delegation

## Related Resources

- `docs/permissions/storage.md` - Full storage API reference
- `docs/mv3/content-scripts.md` - Advanced content script patterns
- `docs/patterns/messaging.md` - Secure communication between contexts
