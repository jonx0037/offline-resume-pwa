import { ref, computed, onMounted } from 'vue'
import { createResumeCache } from '@/lib/cache'
import { classifyRecord, type Freshness } from '@/lib/freshness'
import { SCHEMA_VERSION, type CachedSection, type SectionId, type SectionPayload } from '@/lib/types'
import { noteFailure, noteSuccess, REQUEST_TIMEOUT_MS } from './useLink'
import { primeNow } from './useNow'

const cache = createResumeCache()

export type Outcome =
  | 'idle'
  | 'loading'
  | 'fresh-200'
  | 'revalidated-304'
  | 'offline-cached'
  | 'error-cached'
  | 'error-empty'

const OUTCOME_TEXT: Record<Outcome, string> = {
  idle: '',
  loading: 'Checking…',
  'fresh-200': 'Downloaded a new copy (200)',
  'revalidated-304': 'Server confirmed unchanged (304)',
  'offline-cached': 'Offline — showing cached copy',
  'error-cached': 'Request failed — showing cached copy',
  'error-empty': 'Request failed and nothing is cached',
}

export const outcomeText = (o: Outcome) => OUTCOME_TEXT[o]

/**
 * `now` is a GETTER, not a Ref. Vue auto-unwraps refs in templates, so a component that
 * receives the clock as a prop gets a plain number — threading a Ref through would type-
 * check at the call site and then silently lose reactivity one level down.
 */
export function useResumeSection(id: SectionId, now: () => number) {
  const record = ref<CachedSection | null>(null)
  const outcome = ref<Outcome>('idle')
  const inFlight = ref(false)

  const freshness = computed<Freshness>(() => classifyRecord(record.value, now()))
  const verifiedAge = computed(() =>
    record.value ? now() - record.value.verifiedAt : null,
  )
  const fetchedAge = computed(() =>
    record.value ? now() - record.value.fetchedAt : null,
  )
  const payload = computed<SectionPayload | null>(() => record.value?.payload ?? null)

  async function hydrateFromCache() {
    record.value = await cache.get(id)
  }

  async function refresh() {
    if (inFlight.value) return
    inFlight.value = true
    outcome.value = 'loading'

    // Fast-path the one direction the browser is actually authoritative about. Attempting
    // a request we know cannot succeed just burns the timeout budget for no information.
    if (!navigator.onLine) {
      noteFailure()
      outcome.value = record.value ? 'offline-cached' : 'error-empty'
      inFlight.value = false
      return
    }

    const headers: HeadersInit = {}
    if (record.value?.etag) headers['If-None-Match'] = record.value.etag

    try {
      const res = await fetch(`/api/resume?section=${id}`, {
        headers,
        // no-store so OUR conditional request reaches the origin. With the default the
        // browser's HTTP cache can answer from its own copy and the If-None-Match never
        // leaves the machine — the 304 would become invisible and the whole mechanism
        // would silently be decorative.
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      const at = Date.now()

      if (res.status === 304) {
        noteSuccess()
        // The payload is byte-identical, so only verifiedAt moves. fetchedAt stays put.
        // This is the entire contract in one line.
        const next = await cache.touch(id, at)
        if (next) record.value = next
        else if (record.value) record.value = { ...record.value, verifiedAt: at }
        primeNow() // `at` is newer than the last tick; keep now >= verifiedAt
        outcome.value = 'revalidated-304'
        return
      }

      if (!res.ok) {
        noteSuccess() // The server answered; the LINK is fine. The request is not.
        outcome.value = record.value ? 'error-cached' : 'error-empty'
        return
      }

      const body = (await res.json()) as SectionPayload
      noteSuccess()

      if (body.schemaVersion !== SCHEMA_VERSION) {
        // Server speaks a contract this build does not. Keep what we have and say so,
        // rather than writing bytes we cannot interpret later.
        outcome.value = record.value ? 'error-cached' : 'error-empty'
        return
      }

      const next: CachedSection = {
        id,
        schemaVersion: body.schemaVersion,
        etag: res.headers.get('ETag') ?? '',
        payload: body,
        fetchedAt: at,
        verifiedAt: at,
      }
      await cache.put(next)
      record.value = next
      primeNow() // `at` is newer than the last tick; keep now >= verifiedAt
      outcome.value = 'fresh-200'
    } catch {
      // Timeout, abort, DNS, TLS, or transport failure. All indistinguishable to the
      // planner and all mean the same thing: we did not confirm anything.
      noteFailure()
      outcome.value = record.value ? 'error-cached' : 'error-empty'
    } finally {
      inFlight.value = false
    }
  }

  onMounted(async () => {
    // Cache first, always. The screen should never be empty while a request is pending —
    // stale data with an honest badge beats a spinner on a link that may never answer.
    await hydrateFromCache()
    await refresh()
  })

  return { record, payload, freshness, verifiedAge, fetchedAge, outcome, inFlight, refresh }
}

export { cache as resumeCache }
