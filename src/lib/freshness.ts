import { SCHEMA_VERSION, type CachedSection, type FreshnessBudget } from './types'

/**
 * The freshness contract.
 *
 * Four states, and deliberately NO `live` state. "Live" would be a claim about the link;
 * this is a claim about the data. They are different sentences, and conflating them is how
 * a UI ends up confidently showing a number that is six hours old.
 *
 * The link has its own separate three-state indicator. See useLink.ts.
 */
export type Freshness = 'unknown' | 'fresh' | 'stale' | 'expired'

/** Fallback only. The server declares the real budget in the payload envelope. */
export const FALLBACK_BUDGET: FreshnessBudget = {
  freshMs: 60 * 60 * 1000,
  staleMs: 24 * 60 * 60 * 1000,
}

export interface FreshnessInput {
  /** Client-clock ms when the server last confirmed this data. Null/undefined => never. */
  verifiedAt: number | null | undefined
  /** Client-clock ms now. */
  now: number
  /** Server-declared budget; falls back if absent. */
  budget?: FreshnessBudget | null
  /** Schema version of the cached record, to detect a stale client/server contract. */
  schemaVersion?: number | null
}

/**
 * Classify a cached record.
 *
 * Every uncertain path resolves to `unknown`, never to `fresh`. That direction matters:
 * failing open here means telling a planner that data is current when you do not know
 * that it is, which is the exact failure this whole application is built to avoid.
 */
export function classify(input: FreshnessInput): Freshness {
  const { verifiedAt, now } = input

  // Never synced.
  if (verifiedAt === null || verifiedAt === undefined) return 'unknown'
  if (!Number.isFinite(verifiedAt) || !Number.isFinite(now)) return 'unknown'

  // Schema drift: we hold bytes we can no longer interpret with confidence.
  if (input.schemaVersion !== null && input.schemaVersion !== undefined) {
    if (input.schemaVersion !== SCHEMA_VERSION) return 'unknown'
  }

  const age = now - verifiedAt

  // A negative age means the device clock jumped backwards, or the record was written by
  // a clock ahead of this one. Naive code rounds that to "brand new" at exactly the moment
  // the data is least trustworthy. Fail closed.
  if (age < 0) return 'unknown'

  const budget = normalizeBudget(input.budget)
  if (budget === null) return 'unknown'

  if (age < budget.freshMs) return 'fresh'
  if (age < budget.staleMs) return 'stale'
  return 'expired'
}

/**
 * A budget is only usable if both bounds are finite, positive, and ordered.
 * An inverted budget (stale < fresh) is a server bug; refuse it rather than silently
 * producing a state machine where `stale` is unreachable.
 */
function normalizeBudget(b: FreshnessBudget | null | undefined): FreshnessBudget | null {
  const candidate = b ?? FALLBACK_BUDGET
  const { freshMs, staleMs } = candidate
  if (!Number.isFinite(freshMs) || !Number.isFinite(staleMs)) return null
  if (freshMs <= 0 || staleMs <= 0) return null
  if (staleMs < freshMs) return null
  return { freshMs, staleMs }
}

/** Convenience wrapper over a whole cached record. */
export function classifyRecord(rec: CachedSection | null | undefined, now: number): Freshness {
  if (!rec) return 'unknown'
  return classify({
    verifiedAt: rec.verifiedAt,
    now,
    budget: rec.payload?.budget,
    schemaVersion: rec.schemaVersion,
  })
}

const WORD: Record<Freshness, string> = {
  unknown: 'Unknown',
  fresh: 'Current',
  stale: 'Aging',
  expired: 'Expired',
}

/**
 * Redundant encoding: a glyph as well as a color, because color alone fails for roughly
 * 8% of men, and because an iPad in outdoor light loses color distinction long before it
 * loses shape distinction.
 */
const GLYPH: Record<Freshness, string> = {
  unknown: '?',
  fresh: '●',
  stale: '◑',
  expired: '○',
}

export const freshnessWord = (f: Freshness) => WORD[f]
export const freshnessGlyph = (f: Freshness) => GLYPH[f]

/**
 * Human age. Deliberately coarse above a minute — false precision on a staleness readout
 * invites the reader to trust a number the underlying link cannot actually support.
 */
export function formatAge(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return 'never'
  if (ms < 0) return 'clock skew'
  const s = Math.floor(ms / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
