import { describe, it, expect } from 'vitest'
import { classify, classifyRecord, formatAge, FALLBACK_BUDGET } from './freshness'
import { SCHEMA_VERSION, type CachedSection } from './types'

const HOUR = 3600_000
const NOW = 1_800_000_000_000 // fixed; no Date.now() in tests
const budget = { freshMs: 6 * HOUR, staleMs: 48 * HOUR }

const at = (ageMs: number) => classify({ verifiedAt: NOW - ageMs, now: NOW, budget })

describe('classify: the four states', () => {
  it('is fresh strictly inside the fresh budget', () => {
    expect(at(0)).toBe('fresh')
    expect(at(6 * HOUR - 1)).toBe('fresh')
  })

  it('is stale at the fresh boundary and inside the stale window', () => {
    // Boundary is exclusive on fresh: exactly at freshMs you are no longer fresh.
    expect(at(6 * HOUR)).toBe('stale')
    expect(at(48 * HOUR - 1)).toBe('stale')
  })

  it('is expired at and beyond the stale boundary', () => {
    expect(at(48 * HOUR)).toBe('expired')
    expect(at(365 * 24 * HOUR)).toBe('expired')
  })
})

describe('classify: every uncertain path fails to unknown, never to fresh', () => {
  it('treats never-synced as unknown', () => {
    expect(classify({ verifiedAt: null, now: NOW, budget })).toBe('unknown')
    expect(classify({ verifiedAt: undefined, now: NOW, budget })).toBe('unknown')
  })

  it('treats a FUTURE timestamp as unknown, not as brand new', () => {
    // This is the case I care most about. A device whose clock jumped backwards — or a
    // record written by a clock ahead of this one — produces a negative age. Naive code
    // rounds that to "0ms old" and renders it as the freshest possible data at exactly
    // the moment it is least trustworthy.
    expect(classify({ verifiedAt: NOW + HOUR, now: NOW, budget })).toBe('unknown')
    expect(at(-1)).toBe('unknown')
  })

  it('treats non-finite inputs as unknown', () => {
    expect(classify({ verifiedAt: NaN, now: NOW, budget })).toBe('unknown')
    expect(classify({ verifiedAt: NOW, now: Infinity, budget })).toBe('unknown')
  })

  it('treats a schema-version mismatch as unknown even when the data is recent', () => {
    // We hold bytes we can no longer confidently interpret. Recency is irrelevant.
    expect(
      classify({ verifiedAt: NOW, now: NOW, budget, schemaVersion: SCHEMA_VERSION + 1 }),
    ).toBe('unknown')
  })

  it('refuses an inverted budget rather than making `stale` unreachable', () => {
    expect(
      classify({ verifiedAt: NOW, now: NOW, budget: { freshMs: 48 * HOUR, staleMs: 6 * HOUR } }),
    ).toBe('unknown')
  })

  it('refuses non-positive or non-finite budgets', () => {
    expect(classify({ verifiedAt: NOW, now: NOW, budget: { freshMs: 0, staleMs: HOUR } })).toBe('unknown')
    expect(classify({ verifiedAt: NOW, now: NOW, budget: { freshMs: HOUR, staleMs: NaN } })).toBe('unknown')
  })

  it('falls back to the client budget only when the server declared none', () => {
    // Absent budget is a degraded-but-usable case, unlike a malformed one.
    expect(classify({ verifiedAt: NOW, now: NOW, budget: null })).toBe('fresh')
    expect(classify({ verifiedAt: NOW - FALLBACK_BUDGET.staleMs, now: NOW, budget: null })).toBe('expired')
  })
})

describe('classifyRecord', () => {
  const rec = (over: Partial<CachedSection> = {}): CachedSection => ({
    id: 'experience',
    schemaVersion: SCHEMA_VERSION,
    etag: '"abc"',
    payload: {
      schemaVersion: SCHEMA_VERSION,
      section: 'experience',
      title: 'Experience',
      budget,
      contentAuthoredAt: '2026-09-17T18:00:00.000Z',
      body: [],
    },
    fetchedAt: NOW - 30 * HOUR,
    verifiedAt: NOW - HOUR,
    ...over,
  })

  it('classifies on verifiedAt, NOT on fetchedAt', () => {
    // The whole point: bytes 30 hours old, confirmed current an hour ago, are `fresh`.
    // A 304 is what makes that possible, and it costs ~200 bytes instead of the payload.
    const r = rec()
    expect(r.fetchedAt).toBeLessThan(r.verifiedAt)
    expect(classifyRecord(r, NOW)).toBe('fresh')
  })

  it('returns unknown for a missing record', () => {
    expect(classifyRecord(null, NOW)).toBe('unknown')
    expect(classifyRecord(undefined, NOW)).toBe('unknown')
  })

  it('honors the budget carried in the payload envelope', () => {
    const tight = rec()
    tight.payload.budget = { freshMs: 1000, staleMs: 2000 }
    expect(classifyRecord(tight, NOW)).toBe('expired')
  })
})

describe('formatAge', () => {
  it('formats across the scale', () => {
    expect(formatAge(0)).toBe('just now')
    expect(formatAge(30_000)).toBe('30s ago')
    expect(formatAge(5 * 60_000)).toBe('5m ago')
    expect(formatAge(3 * HOUR)).toBe('3h ago')
    expect(formatAge(50 * HOUR)).toBe('2d ago')
  })

  it('names the absence of a timestamp rather than rendering 0', () => {
    expect(formatAge(null)).toBe('never')
    expect(formatAge(undefined)).toBe('never')
    expect(formatAge(NaN)).toBe('never')
  })

  it('names clock skew rather than hiding it', () => {
    expect(formatAge(-5000)).toBe('clock skew')
  })
})
