import { ref, readonly, onMounted, onUnmounted } from 'vue'

/**
 * Link state — a claim about the NETWORK, kept strictly separate from the freshness badge,
 * which is a claim about the DATA.
 *
 * Three states, not two, because the product requirement is DEGRADED comms, not absent
 * ones:
 *
 *   offline   — navigator.onLine === false. This direction IS authoritative.
 *   degraded  — requests are being attempted but timing out or failing.
 *   online    — a request actually COMPLETED inside the timeout budget.
 *
 * navigator.onLine === true means only that there is a route to an interface. Not that
 * anyone is listening. On a radio that is attached with no backhaul, or behind a captive
 * portal, onLine reports true and every request hangs until it times out — which is
 * strictly worse for a planner than showing cached data with an honest badge. So `true`
 * is a hint that must be PROVEN by a completed request; only `false` is trusted outright.
 */
export type LinkState = 'online' | 'degraded' | 'offline'

/** Every request gets this budget. A hung request is a failed request that lies about it. */
export const REQUEST_TIMEOUT_MS = 4000

const state = ref<LinkState>(navigator.onLine ? 'degraded' : 'offline')
const lastSuccessAt = ref<number | null>(null)
const consecutiveFailures = ref(0)

function onBrowserOffline() {
  state.value = 'offline'
}

function onBrowserOnline() {
  // Not `online`: the OS says an interface came up, which we have not yet proven means
  // anything reaches us. Downgrade to degraded and let the next completed request decide.
  state.value = 'degraded'
}

/** Call after a request completes successfully. */
export function noteSuccess() {
  consecutiveFailures.value = 0
  lastSuccessAt.value = Date.now()
  state.value = 'online'
}

/** Call after a request times out, aborts, or fails at the transport layer. */
export function noteFailure() {
  consecutiveFailures.value += 1
  state.value = navigator.onLine ? 'degraded' : 'offline'
}

export function useLink() {
  onMounted(() => {
    window.addEventListener('offline', onBrowserOffline)
    window.addEventListener('online', onBrowserOnline)
    if (!navigator.onLine) state.value = 'offline'
  })
  onUnmounted(() => {
    window.removeEventListener('offline', onBrowserOffline)
    window.removeEventListener('online', onBrowserOnline)
  })

  return {
    link: readonly(state),
    lastSuccessAt: readonly(lastSuccessAt),
    consecutiveFailures: readonly(consecutiveFailures),
  }
}

const LINK_WORD: Record<LinkState, string> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
}

const LINK_DETAIL: Record<LinkState, string> = {
  online: 'A request completed inside the timeout budget.',
  degraded: 'An interface is up, but requests are not completing.',
  offline: 'The browser reports no network interface.',
}

export const linkWord = (s: LinkState) => LINK_WORD[s]
export const linkDetail = (s: LinkState) => LINK_DETAIL[s]
