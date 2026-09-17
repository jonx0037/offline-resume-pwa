<script setup lang="ts">
// The build log is the landing content, deliberately. An unexplained Vue app invites
// "so how much Vue do you actually know?" — this answers it in writing, first, unprompted.
const mappings = [
  ['ref / reactive', 'useState', 'Proxy-based tracking, so updates are fine-grained rather than re-rendering a subtree.'],
  ['computed', 'useMemo', 'Dependencies tracked automatically. I reached for a dependency array out of reflex; there isn’t one.'],
  ['watch / watchEffect', 'useEffect', 'Explicit sources remove the stale-closure class of bug outright.'],
  ['provide / inject', 'Context', 'Same idea, no provider re-render cascade.'],
  ['<script setup>', 'Component file', 'Template, logic, and scoped CSS in one file; scoping is built in, not a convention.'],
  ['Scoped slots', 'Render props', 'More explicit than prop-drilled render functions. SectionPanel uses one.'],
]
</script>

<template>
  <article class="log" id="build-log">
    <h1>A r&eacute;sum&eacute; that still renders with the network off</h1>

    <p class="lede">
      This is a Vue 3 progressive web app. The payload is my r&eacute;sum&eacute;, but the
      r&eacute;sum&eacute; is not the point &mdash; the freshness contract is. Turn the
      network off and reload: it keeps working, and it tells you honestly how old what
      you are looking at is.
    </p>

    <h2>The honest boundary</h2>
    <p>
      I had not written production Vue before this week. My production work is React,
      Next, and Astro &mdash; so I already live in Vite, but not in Vue. I built this so
      that when someone asks me about Vue I am answering from something I built rather
      than from documentation. That is the whole reason it exists, and I would rather say
      so here than be asked.
    </p>

    <h2>What surprised me, coming from React</h2>
    <table>
      <thead>
        <tr><th>Vue 3</th><th>What I already knew</th><th>The difference worth naming</th></tr>
      </thead>
      <tbody>
        <tr v-for="m in mappings" :key="m[0]">
          <td><code>{{ m[0] }}</code></td>
          <td>{{ m[1] }}</td>
          <td>{{ m[2] }}</td>
        </tr>
      </tbody>
    </table>

    <h2>The freshness contract</h2>
    <p>
      Every cached section carries <strong>two</strong> timestamps, and both are on screen.
      <code>fetchedAt</code> is when the bytes arrived. <code>verifiedAt</code> is when the
      server last <em>confirmed</em> they are still current &mdash; and a
      <code>304 Not Modified</code> advances the second without touching the first.
    </p>
    <p>
      So a badge can say &ldquo;six days old, verified forty seconds ago,&rdquo; which is a
      completely different operational fact from &ldquo;six days old, never checked&rdquo;
      &mdash; and it costs about two hundred bytes to establish instead of the whole payload.
    </p>
    <p>
      There is no <code>live</code> state, on purpose. &ldquo;Live&rdquo; is a claim about
      the link; the badge is a claim about the data. The link has its own indicator, and it
      has three states rather than two, because <code>navigator.onLine === true</code> only
      means there is a route to an interface &mdash; not that anyone is listening.
    </p>
    <p>
      I have solved a version of this before. At Fullsteam I ran a nightly reconciliation
      across POS, Google Analytics, and ad-spend APIs for 100+ accounts where backfill was
      impossible &mdash; a day could be permanently incomplete. The work that mattered was
      not the pipeline; it was detecting partial days and telling non-technical clients
      &ldquo;this is incomplete&rdquo; instead of handing them a number that looked whole.
    </p>

    <h2>What this deliberately does not do</h2>
    <ul>
      <li>
        <strong>No write path.</strong> The r&eacute;sum&eacute; is read-only and a fake one
        would be theater. The policy I would ship is an append-only log of intents with
        <code>If-Match</code> optimistic concurrency and explicit human adjudication on
        <code>409</code>. Last-write-wins is wrong twice over here: it silently destroys the
        losing writer&rsquo;s work, and &ldquo;last&rdquo; is a wall-clock comparison across
        devices whose clocks this design spends its whole length refusing to trust.
      </li>
      <li>
        <strong>Not verified on a physical iPad.</strong> Touch targets, landscape-first
        layout, and safe-area handling are designed for one. I have not run it on the device.
      </li>
      <li>
        <strong>No end-to-end offline test suite.</strong> The classifier is a pure function
        with no Vue in it and is unit-tested in Node; the end-to-end behavior is verified by
        hand against the deployed URL.
      </li>
      <li>
        <strong>Storage eviction is untested.</strong> WebKit clears script-writable storage
        after roughly seven days of Safari use without interaction. A home-screen web app is
        exempt, because it is not part of Safari and keeps its own counter &mdash; which is
        what turns an install prompt from a growth nag into the mechanism that lets the
        cache survive at all.
      </li>
    </ul>

    <h2>Colophon</h2>
    <p class="colophon">
      Vue 3.5.43 &middot; Vite 8.3 &middot; TypeScript 6 &middot; Tailwind 4.3 &middot;
      idb 8 &middot; vite-plugin-pwa &middot; Vitest &middot; Vercel Functions.
      Built on Vue 3.5 stable rather than 3.6.0-rc.8 &mdash; Vapor Mode is the interesting
      part of 3.6 and genuinely relevant to a data-dense tablet app, but shipping a
      demonstration on a release candidate is a risk with no upside.
      No Pinia and no router: one page, one composable. Adding a store I never needed is
      how you end up owning a dependency you cannot justify.
    </p>
    <p class="colophon">
      Built with Claude Code as a pair, the way I work day to day. The architecture
      decisions are mine and I can defend them, including the ones I rejected. I read every
      line before it shipped.
    </p>
  </article>
</template>

<style scoped>
.log { max-inline-size: var(--size-measure); display: flex; flex-direction: column; gap: 0.75rem; }
h1 { font-size: clamp(1.35rem, 3.5vw, 2rem); margin: 0 0 0.25rem; line-height: 1.2; }
h2 { font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-ink-muted); margin: 1rem 0 0; }
p { margin: 0; line-height: 1.6; }
ul { margin: 0; padding-inline-start: 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; line-height: 1.55; }
.lede { font-size: 1.05rem; color: var(--color-ink); }
.colophon { color: var(--color-ink-muted); font-size: 0.8125rem; }
code { font-family: var(--font-mono); font-size: 0.85em; background: var(--color-surface-raised); padding: 0.1em 0.35em; border-radius: 0.25rem; }
table { border-collapse: collapse; font-size: 0.8125rem; inline-size: 100%; }
th, td { text-align: start; padding: 0.4rem 0.5rem; border-block-end: 1px solid var(--color-rule); vertical-align: top; }
th { color: var(--color-ink-muted); font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.04em; }
/* A table is the right structure here, but it must not force a horizontal page scroll
   at phone width. */
@media (max-width: 40rem) {
  table, thead, tbody, tr, th, td { display: block; }
  thead { display: none; }
  tr { border-block-end: 1px solid var(--color-rule); padding-block: 0.5rem; }
  td { border: 0; padding: 0.1rem 0; }
  td:first-child { font-weight: 600; }
}
</style>
