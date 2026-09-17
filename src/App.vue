<script setup lang="ts">
import { onErrorCaptured, ref, onMounted } from 'vue'
import BuildLog from './components/BuildLog.vue'
import SectionPanel from './components/SectionPanel.vue'
import SectionBody from './components/SectionBody.vue'
import LinkStrip from './components/LinkStrip.vue'
import { useNow } from './composables/useNow'
import { useLink } from './composables/useLink'
import { requestPersistentStorage } from './lib/cache'
import { SECTION_IDS, type SectionId } from './lib/types'

const now = useNow()
const { link } = useLink()
const persisted = ref<boolean | null>(null)

const TITLES: Record<SectionId, string> = {
  identity: 'Identity',
  summary: 'Summary',
  experience: 'Experience',
  projects: 'Selected Projects',
  skills: 'Technical Skills',
  education: 'Education',
}

// An app whose entire thesis is graceful degradation must not white-screen on a malformed
// cached payload. One throw while rendering is all it would take.
const fatal = ref<string | null>(null)
onErrorCaptured((err) => {
  fatal.value = err instanceof Error ? err.message : String(err)
  return false
})

onMounted(async () => {
  persisted.value = await requestPersistentStorage()
})
</script>

<template>
  <a class="skip-link" href="#sections">Skip to r&eacute;sum&eacute; sections</a>

  <div class="shell">
    <header class="top">
      <LinkStrip :state="link" :busy="false" />
      <p v-if="persisted === false" class="persist">
        Storage is not marked persistent &mdash; the browser may evict this cache under pressure.
      </p>
    </header>

    <main class="grid">
      <div class="col col-log">
        <BuildLog />
      </div>

      <div class="col col-sections" id="sections">
        <p v-if="fatal" class="fatal">
          Something failed while rendering: {{ fatal }} &mdash; the cached data is still in
          IndexedDB; a reload will re-read it.
        </p>
        <SectionPanel
          v-for="id in SECTION_IDS"
          :key="id"
          :id="id"
          :title="TITLES[id]"
          :now="now"
        >
          <template #default="{ body }">
            <SectionBody :id="id" :body="body" />
          </template>
        </SectionPanel>
      </div>
    </main>

    <footer class="foot">
      <a class="tap" href="https://github.com/jonx0037/offline-resume-pwa" target="_blank" rel="noopener">
        Source on GitHub
      </a>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  max-inline-size: 1400px;
  margin-inline: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.top { display: flex; flex-direction: column; gap: 0.5rem; }
.persist { margin: 0; font-size: 0.75rem; color: var(--color-stale); }

/* Single column by default; two panes from tablet-landscape up. A mounted iPad is rarely
   portrait, so landscape is the layout that gets the real design, not the fallback. */
.grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media (min-width: 60rem) {
  .grid { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); align-items: start; }
  .col-log { position: sticky; top: 1rem; max-block-size: calc(100dvh - 2rem); overflow-y: auto; }
}
.col { display: flex; flex-direction: column; gap: 1rem; min-inline-size: 0; }
.fatal {
  margin: 0; padding: 0.75rem; border-radius: 0.5rem;
  background: var(--color-surface-raised);
  border-inline-start: 3px solid var(--color-expired);
  font-size: 0.8125rem;
}
.foot { padding-block: 0.5rem; font-size: 0.8125rem; }
.foot a { color: var(--color-accent); display: inline-flex; align-items: center; }
</style>
