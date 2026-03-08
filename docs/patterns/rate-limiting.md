---
layout: default
title: "Chrome Extension Rate Limiting — Best Practices"
description: "Implement rate limiting to prevent API abuse and throttling."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/rate-limiting/"
---

# Rate Limiting Patterns

## Overview {#overview}

Handle API rate limits and quota management in extensions. Prevents 429 errors and storage sync quota exhaustion. Applies to external APIs and Chrome API quotas.

---

## Chrome API Quotas {#chrome-api-quotas}

| API | Quota | Notes |
|-----|-------|-------|
| `storage.sync` | 120 writes/min | Per extension |
| `alarms` | Min 30 seconds | Min interval |
| `webRequest` | Unlimited | Impacts perf |

Batch writes: `await chrome.storage.sync.set({a:1,b:2})` not separate calls.

---

## Token Bucket {#token-bucket}

```ts
class Bucket {
  constructor(private cap: number, private r: number) { this.t=cap; this.l=Date.now(); }
  private t: number; private l: number;
  private rf(){const e=Date.now()-this.l;this.t=Math.min(this.cap,this.t+e*(this.r/1000));this.l=Date.now();}
  wait(n=1){this.rf();return this.t>=n?0:Math.ceil((n-this.t)/(this.r/1000));}
  take(n=1){this.rf();return this.t>=n?(this.t-=n,true):false;}
}
const lim = new Bucket(10,10);
async function fet(url:string){const w=lim.wait();if(w)await new Promise(r=>setTimeout(r,w));lim.take();return fetch(url);}
```

Store in `chrome.storage.session` for SW restart survival.

---

## Debouncing & Throttling {#debouncing-throttling}

```ts
// Debounced writer
class Debounce{
  private x?:number;private m=new Map<string,unknown>();
  set(k:string,v:unknown){this.m.set(k,v);if(this.x)clearTimeout(this.x);this.x=setTimeout(()=>{chrome.storage.sync.set(Object.fromEntries(this.m));this.m.clear();},500);}
}
// Alarm throttler
class Throttle{constructor(private n:string,private s=30){}
async a():Promise<boolean>{const A=await chrome.alarms.get(this.n);if(!A){await chrome.alarms.create(this.n,{delayInMinutes:this.s/60});return true;}return false;}
}
```

---

## Exponential Backoff {#exponential-backoff}

```ts
async function retry(url:string,max=5,base=1000):Promise<Response>{
  for(let i=0;i<=max;i++){
    const r=await fetch(url);
    if(r.ok||(r.status!==429&&r.status<500))return r;
    await new Promise(x=>setTimeout(x,Math.min(base*2**i*(0.8+Math.random()*0.4),30000)));
  }throw new Error('max');
}
```

---

## Request Queue {#request-queue}

```ts
class Q{
  private q:Array<()=>Promise<void>>=[];private a=0;
  constructor(private m=3){}
  async e<T>(f:()=>Promise<T>):Promise<T>{return new Promise((rs,rj)=>{this.q.push(async()=>{try{rs(await f())}catch(e){rj(e)}});this.p();});}
  private async p(){while(this.a<this.m&&this.q.length){this.a++;const x=this.q.shift()!;await x().finally(()=>{this.a--;this.p()})}}
}
```

---

## Batching Storage {#batching-storage}

```ts
class Batch{
  private m=new Map<string,unknown>();
  async set(k:string,v:unknown){this.m.set(k,v);if(!await chrome.alarms.get('f'))await chrome.alarms.create('f',{delayInMinutes:1/60});}
  async flush(){if(this.m.size){await chrome.storage.sync.set(Object.fromEntries(this.m));this.m.clear();await chrome.alarms.clear('f');}}
}
```

Listen to `chrome.alarms.onAlarm` to flush.

---

## External API Tips {#external-api-tips}

- Cache with TTL in `chrome.storage.local`
- Use ETag/If-None-Match
- Parse `X-RateLimit-*` headers
- Show user feedback when limited

---

## Summary {#summary}

| Pattern | Use | Benefit |
|---------|-----|---------|
| Token Bucket | API throttle | Bursts |
| Debouncing | Storage writes | Fewer ops |
| Backoff | 429 errors | Recovery |
| Queue | Concurrent API | Control |
| Batching | Storage | Reduces writes |

---

## See Also {#see-also}

- [Error Handling](./error-handling.md)
- [State Management](./state-management.md)
- [Storage Patterns](../reference/storage-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
