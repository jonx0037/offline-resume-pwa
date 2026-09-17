<script setup lang="ts">
import StalenessBadge from './StalenessBadge.vue'
import { useResumeSection, outcomeText } from '@/composables/useResumeSection'
import type { SectionId } from '@/lib/types'

const props = defineProps<{ id: SectionId; title: string; now: number }>()

const { payload, freshness, verifiedAge, fetchedAge, outcome, inFlight, refresh } =
  useResumeSection(props.id, () => props.now)
</script>

<template>
  <section class="panel" :aria-labelledby="`h-${id}`">
    <header class="head">
      <h2 :id="`h-${id}`">{{ payload?.title ?? title }}</h2>
      <StalenessBadge :state="freshness" :verified-ms="verifiedAge" :fetched-ms="fetchedAge" />
    </header>

    <p class="outcome" :data-outcome="outcome">{{ outcomeText(outcome) }}</p>

    <div class="body">
      <!--
        A scoped slot hands the raw section body up to the parent. The panel owns the
        freshness chrome; it deliberately knows nothing about what a resume section
        contains, which is why it is the only piece here that could move into a shared
        library unchanged.
      -->
      <slot v-if="payload" :body="payload.body" />
      <p v-else-if="inFlight" class="empty">Loading…</p>
      <p v-else class="empty">
        Nothing cached for this section, and the request did not succeed.
      </p>
    </div>

    <footer class="foot">
      <button type="button" :disabled="inFlight" @click="refresh()">
        {{ inFlight ? 'Checking…' : 'Refresh' }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-rule);
  border-radius: 0.75rem;
  padding: 1rem 1.125rem 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}
.outcome {
  margin: 0;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-ink-muted);
  min-block-size: 1rem;
}
.outcome[data-outcome='revalidated-304'] {
  color: var(--color-fresh);
}
.outcome[data-outcome='offline-cached'],
.outcome[data-outcome='error-cached'] {
  color: var(--color-stale);
}
.outcome[data-outcome='error-empty'] {
  color: var(--color-expired);
}
.body {
  color: var(--color-ink);
  line-height: 1.55;
}
.empty {
  color: var(--color-ink-muted);
  font-style: italic;
}
.foot {
  display: flex;
  justify-content: flex-end;
}
button {
  background: var(--color-surface-raised);
  color: var(--color-ink);
  border: 1px solid var(--color-rule);
  border-radius: 0.375rem;
  padding-inline: 1rem;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
/* Hover styling only where hover actually exists as a capability. Pointer and hover are
   different things, and a mounted iPad has neither. */
@media (hover: hover) and (pointer: fine) {
  button:not(:disabled):hover {
    border-color: var(--color-accent);
  }
}
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
