# Offline-First Résumé

A Vue 3 progressive web app that keeps rendering when the network is gone, and is honest
about how old what you're looking at is.

**Live:** https://offline-resume-pwa.vercel.app

---

## What this is actually about

The payload is my résumé. It is deliberately the wrong shape for the machinery — it never
changes, and in a real application it would ship in the bundle. I picked it because the
content had to be true, and because it let me build the freshness contract against a real
ETag over a real link instead of against a fixture.

What's worth looking at is the contract, not the document.

I also had not written production Vue before this week. My production work is React, Next,
and Astro, so I already live in Vite but not in Vue. This exists so that when someone asks
me about Vue, I'm answering from something I built rather than from documentation.

## The contract

Every cached section carries **two** timestamps, and both are on screen:

| | meaning |
|---|---|
| `fetchedAt` | when these bytes arrived. Only a `200` moves it. |
| `verifiedAt` | when the server last **confirmed** they're still current. A `200` **or** a `304` moves it. |

A `304 Not Modified` advances `verifiedAt` and leaves `fetchedAt` and the payload
byte-identical. So a badge can read *"six days old, verified forty seconds ago"* — which on
a degraded link is a completely different operational fact from *"six days old, never
checked"* — and it costs about two hundred bytes to establish instead of the whole payload.

### Four states

| state | meaning |
|---|---|
| `unknown` | never synced, wrong schema version, malformed budget, or an age that isn't computable |
| `fresh` | verified within the server-declared budget |
| `stale` | past fresh, inside the stale window |
| `expired` | past the stale window |

There is **no `live` state**, on purpose. "Live" is a claim about the *link*; the badge is a
claim about the *data*. They are different sentences, and conflating them is how an
interface ends up confidently showing a number that is six hours old. The link has its own
indicator with three states rather than two, because `navigator.onLine === true` only means
there is a route to an interface — not that anyone is listening. On a radio that's attached
with no backhaul, or behind a captive portal, `onLine` reports `true` and every request
hangs until it times out. So `false` is trusted outright; `true` is a hint that has to be
proven by a request that actually completed inside a 4-second budget.

### Every uncertain path fails to `unknown`, never to `fresh`

Most of all, a **future** timestamp. A device clock that has jumped backwards produces a
negative age, which naive code rounds to "brand new" at exactly the moment the data is
least trustworthy.

That guard caught a real bug in this codebase, and the commit history has it: the shared
clock ticked on an interval, but records are written when a fetch *resolves* — after the
last tick — so `verifiedAt` was briefly newer than `now` and every fresh load showed six
`Unknown / clock skew` badges. The guard was right. The clock was wrong.

### The validator is weak in production, and that matters

The function emits a **strong** ETag. Vercel's edge re-encodes the response and hands back
a **weak** one (`W/"…"`). `If-None-Match` therefore has to use weak comparison per
[RFC 9110 §13.1.2](https://www.rfc-editor.org/rfc/rfc9110#section-13.1.2) — the header is a
comma-separated list, may be `*`, and entries may be `W/`-prefixed.

A naive `header === etag` works perfectly on localhost and then silently returns `200`
forever in production. It doesn't fail; it just quietly stops saving bandwidth, so nothing
ever pages you.

## Architecture notes

- **The service worker owns the shell. IndexedDB owns the data.** They never cache the same
  bytes. `/api` is declared `NetworkOnly` explicitly rather than merely omitted — a Workbox
  cache in front of that route would serve its own `200` and make the conditional GET
  decorative. Client fetches use `cache: 'no-store'` so `If-None-Match` actually reaches
  the origin.
- **The freshness budget is server-declared** and travels in the payload envelope. The
  server is the authority on how long its own answer stays trustworthy; a client-side
  constant would be a guess about someone else's data.
- **`src/lib/freshness.ts` has zero Vue imports.** That's why it unit-tests in Node in
  milliseconds, and it's the piece that would actually move into a shared design library.
- **No Pinia, no router.** One page, one composable. Pinia earns its place when multiple
  writers and readers live in sibling subtrees that don't share a parent; none of that is
  true here, and adding a store I never needed is how you end up owning a dependency you
  can't justify. Same reasoning kept `SectionBody` out of a primitives folder: I promote on
  the third real use, and only when the prop surface stays smaller than the markup it
  replaces.

## Boundaries — what this deliberately does not do

- **No write path.** The résumé is read-only and a fake one would be theater. The policy I'd
  ship is an append-only log of intents with `If-Match` optimistic concurrency and explicit
  human adjudication on `409`. Last-write-wins is wrong twice over: it silently destroys the
  losing writer's work, and "last" is a wall-clock comparison across devices whose clocks
  this design spends its whole length refusing to trust. CRDTs converge automatically, and
  I'd reach for them for collaborative free text, but they buy that with a merge no human
  authored — and where you have to answer "who ordered this, and when," an unauthored merge
  is an auditability liability.
- **No end-to-end offline test suite.** The classifier is unit-tested; offline behavior is
  verified by hand against the deployed URL. The honest reason: `serviceWorker.ready` tells
  you a worker *activated*, `.controller` tells you *this page is served by it*, and a test
  that goes offline between the two fails for reasons that have nothing to do with the app.
  That's a half-day to get non-flaky and I had an evening.
- **Not verified on a physical iPad.** Touch targets (44px floor), landscape-first layout,
  `viewport-fit=cover` with safe-area insets, and no hover-dependent affordances are all
  designed for one. I have not run it on the device.
- **Storage eviction is untested.** WebKit clears script-writable storage after roughly
  seven days of Safari use without interaction. A home-screen web app is exempt, because it
  isn't part of Safari and keeps its own counter — which is what turns an install prompt
  from a growth nag into the mechanism that lets the cache survive at all. I don't detect
  eviction, and I can't: everything I'd use to remember gets wiped in the same sweep. On a
  real system the server knows when the device last synced, and that's the side that
  doesn't get cleared.

## Try it

```bash
# The 304 is the thing. Against production, not localhost.
BASE=https://offline-resume-pwa.vercel.app
ETAG=$(curl -sI "$BASE/api/resume?section=experience" | awk -F': ' 'tolower($1)=="etag"{print $2}' | tr -d '\r')
curl -sI -H "If-None-Match: $ETAG" "$BASE/api/resume?section=experience" | head -1   # 304
curl -sI -H 'If-None-Match: *'     "$BASE/api/resume?section=experience" | head -1   # 304

curl -sI "$BASE/api/resume?section=nonsense"          | head -1   # 400 + problem+json
curl -sI -X POST "$BASE/api/resume?section=identity"  | head -1   # 405 + Allow
curl -sI "$BASE/api/resume?section=identity&fail=429" | grep -i retry-after   # 7
```

In the browser: load the page, then DevTools → Network → **Offline** → reload. It renders.
Click **Refresh** while online and watch `verified` reset to *just now* while `downloaded`
doesn't move — that's the 304.

## Local development

```bash
nvm use 24            # Node 20.17 fails both vite@8 and create-vue
pnpm install
pnpm dev              # /api is proxied at the deployed Vercel URL — see vite.config.ts
pnpm test             # 18 assertions, pure Node, milliseconds
pnpm type-check
pnpm build
```

`vite dev` has no service worker and `vite preview` has no functions, so there is no local
environment where both exist. Rather than write a Node-req/res-to-Web-Request adapter to
simulate the edge, dev proxies `/api` at the real deployment — which means every conditional
request made while building is a real production round trip, and that's the only place a
`304` actually breaks.

## Stack

Vue 3.5 · Vite 8 · TypeScript 6 · Tailwind 4 · idb 8 · vite-plugin-pwa (Workbox) ·
Vitest · Vercel Functions (web-standard `fetch` handlers)

Built on Vue 3.5 stable rather than 3.6.0-rc.8. Vapor Mode is the interesting part of 3.6
and genuinely relevant to a data-dense tablet app, but shipping a demonstration on a release
candidate is a risk with no upside.

TypeScript is pinned to 6.x and the build is plain `vite build`, not
`vue-tsc -b && vite build` — Vite strips types with esbuild and never type-checks, so gating
the build on the type-checker buys nothing and adds a failure mode. `pnpm type-check` is a
separate, opt-in script.

---

Built with Claude Code as a pair, the way I work day to day. The architecture decisions are
mine and I can defend them, including the ones I rejected and why. I read every line before
it shipped.
