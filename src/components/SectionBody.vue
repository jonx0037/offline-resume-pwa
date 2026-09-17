<script setup lang="ts">
import type { SectionId } from '@/lib/types'
defineProps<{ id: SectionId; body: unknown }>()

// Deliberately NOT promoted into components/primitives/. These renderers are bound to the
// shape of one payload; sharing them would mean exporting a prop surface larger than the
// markup it replaces. I promote on the third real use, and this is the first.
const asAny = (v: unknown) => v as any
</script>

<template>
  <div class="sb">
    <template v-if="id === 'identity'">
      <p class="name">{{ asAny(body).name }}</p>
      <p class="headline">{{ asAny(body).headline }}</p>
      <p class="muted">{{ asAny(body).location }}</p>
      <ul class="links">
        <li v-for="l in asAny(body).links" :key="l.href">
          <a class="tap" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
        </li>
      </ul>
      <p class="note">{{ asAny(body).note }}</p>
    </template>

    <template v-else-if="id === 'summary'">
      <p>{{ asAny(body).text }}</p>
      <p class="ownership">{{ asAny(body).ownership }}</p>
    </template>

    <template v-else-if="id === 'experience'">
      <article v-for="job in asAny(body)" :key="job.org + job.start" class="job">
        <h3>{{ job.role }} <span class="muted">· {{ job.org }}</span></h3>
        <p class="meta">{{ job.start }} – {{ job.end }}<span v-if="job.location"> · {{ job.location }}</span></p>
        <ul>
          <li v-for="(b, i) in job.bullets" :key="i">{{ b }}</li>
        </ul>
      </article>
    </template>

    <template v-else-if="id === 'projects'">
      <article v-for="p in asAny(body)" :key="p.name" class="proj">
        <h3>{{ p.name }}</h3>
        <p>{{ p.blurb }}</p>
      </article>
    </template>

    <template v-else-if="id === 'skills'">
      <div v-for="g in asAny(body)" :key="g.group" class="skills">
        <h3>{{ g.group }}</h3>
        <p>{{ g.items.join(' · ') }}</p>
      </div>
    </template>

    <template v-else-if="id === 'education'">
      <article v-for="e in asAny(body)" :key="e.degree" class="edu">
        <h3>{{ e.degree }}</h3>
        <p class="meta">{{ e.school }}<span v-if="e.location"> · {{ e.location }}</span> · {{ e.date }}</p>
        <p v-if="e.detail" class="muted">{{ e.detail }}</p>
      </article>
    </template>
  </div>
</template>

<style scoped>
.sb { display: flex; flex-direction: column; gap: 0.75rem; }
h3 { margin: 0 0 0.125rem; font-size: 0.95rem; color: var(--color-ink); }
p { margin: 0; }
ul { margin: 0.25rem 0 0; padding-inline-start: 1.1rem; }
li { margin-block: 0.2rem; }
.name { font-size: 1.25rem; font-weight: 700; }
.headline { color: var(--color-accent); }
.muted { color: var(--color-ink-muted); }
.note { color: var(--color-ink-muted); font-size: 0.75rem; font-style: italic; }
.meta { color: var(--color-ink-muted); font-size: 0.8125rem; font-family: var(--font-mono); }
.ownership { border-inline-start: 3px solid var(--color-accent); padding-inline-start: 0.75rem; color: var(--color-ink); }
.links { display: flex; gap: 1rem; list-style: none; padding: 0; margin: 0.25rem 0 0; flex-wrap: wrap; }
.links a { color: var(--color-accent); display: inline-flex; align-items: center; }
.job, .proj, .edu, .skills { padding-block-end: 0.5rem; }
.job + .job, .proj + .proj, .edu + .edu, .skills + .skills { border-block-start: 1px solid var(--color-rule); padding-block-start: 0.75rem; }
</style>
