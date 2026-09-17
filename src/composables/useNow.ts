import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * One shared clock for the whole app.
 *
 * Every badge on screen needs "how long ago", and giving each its own interval would mean
 * N timers that drift apart, so two badges written in the same millisecond can render
 * ages a second apart. One source, one tick.
 *
 * Re-primed on visibilitychange and focus because background tabs throttle timers heavily
 * — on iOS they can stop entirely. Without the re-prime, a tab restored after a night
 * asleep renders last night's ages until the next tick, which is the precise failure this
 * application exists to avoid.
 */
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
let subscribers = 0

function prime() {
  now.value = Date.now()
}

function start() {
  if (timer !== null) return
  timer = setInterval(prime, 10_000)
  document.addEventListener('visibilitychange', prime)
  window.addEventListener('focus', prime)
  window.addEventListener('online', prime)
  prime()
}

function stop() {
  if (timer !== null) clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', prime)
  window.removeEventListener('focus', prime)
  window.removeEventListener('online', prime)
}

export function useNow(): Ref<number> {
  onMounted(() => {
    subscribers += 1
    start()
  })
  onUnmounted(() => {
    subscribers -= 1
    if (subscribers <= 0) stop()
  })
  return now
}

/** Non-reactive read, for imperative paths that must not subscribe. */
export const readNow = () => Date.now()
