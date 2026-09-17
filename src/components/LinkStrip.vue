<script setup lang="ts">
import { computed } from 'vue'
import { linkDetail, linkWord, type LinkState } from '@/composables/useLink'

const props = defineProps<{ state: LinkState; busy: boolean }>()
const word = computed(() => linkWord(props.state))
const detail = computed(() => linkDetail(props.state))
</script>

<template>
  <!--
    The only aria-live region in the application. Link state changes rarely and matters
    when it does, which is exactly the right profile for an announcement.
  -->
  <div class="strip" :data-link="state" role="status" aria-live="polite">
    <span class="dot" aria-hidden="true"></span>
    <strong class="word">{{ word }}</strong>
    <span class="detail">{{ detail }}</span>
    <span v-if="busy" class="busy">checking…</span>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.875rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-rule);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
}
.dot {
  inline-size: 0.6rem;
  block-size: 0.6rem;
  border-radius: 50%;
  background: var(--link-color);
  flex: none;
}
.strip[data-link='online'] {
  --link-color: var(--color-link-online);
}
.strip[data-link='degraded'] {
  --link-color: var(--color-link-degraded);
}
.strip[data-link='offline'] {
  --link-color: var(--color-link-offline);
}
.word {
  color: var(--color-ink);
}
.detail {
  color: var(--color-ink-muted);
}
.busy {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
</style>
