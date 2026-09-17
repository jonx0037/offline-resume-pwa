<script setup lang="ts">
import { computed } from 'vue'
import { freshnessGlyph, freshnessWord, formatAge, type Freshness } from '@/lib/freshness'

const props = defineProps<{
  state: Freshness
  verifiedMs: number | null
  fetchedMs: number | null
}>()

const word = computed(() => freshnessWord(props.state))
const glyph = computed(() => freshnessGlyph(props.state))

/** Screen readers get one sentence, not three fragments read out of order. */
const label = computed(
  () =>
    `${word.value}. Verified ${formatAge(props.verifiedMs)}, downloaded ${formatAge(props.fetchedMs)}.`,
)
</script>

<template>
  <!--
    No role="status" and no aria-live here. This text re-renders every 10 seconds, and a
    live region would announce the age forever. The ONE live region in this app is the
    link strip, whose text changes rarely.
  -->
  <span class="badge" :data-freshness="state" :aria-label="label">
    <span class="glyph" aria-hidden="true">{{ glyph }}</span>
    <span class="word">{{ word }}</span>
    <!--
      Both ages are TEXT, always, and both are on screen at once.

      The conventional design is a colored dot with the timestamp in a tooltip. On a
      finger there is no hover, so that tooltip is unreachable rather than merely
      degraded. And showing only one of the two numbers is what makes a staleness
      indicator a decoration: "6h old" and "6h old, confirmed current 40s ago" are
      completely different operational facts.
    -->
    <span class="ages" aria-hidden="true">
      verified {{ formatAge(verifiedMs) }} &middot; downloaded {{ formatAge(fetchedMs) }}
    </span>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-block-size: var(--size-touch);
  padding-inline: 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-surface-raised);
  border-inline-start: 3px solid var(--badge-color);
}

/* The colour is carried by a data attribute rather than a class so the state is
   inspectable in DevTools without decoding a class list. */
.badge[data-freshness='fresh'] {
  --badge-color: var(--color-fresh);
}
.badge[data-freshness='stale'] {
  --badge-color: var(--color-stale);
}
.badge[data-freshness='expired'] {
  --badge-color: var(--color-expired);
}
.badge[data-freshness='unknown'] {
  --badge-color: var(--color-unknown);
}

.glyph {
  color: var(--badge-color);
  font-size: 0.9rem;
  line-height: 1;
}
.word {
  color: var(--color-ink);
}
.ages {
  color: var(--color-ink-muted);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
</style>
