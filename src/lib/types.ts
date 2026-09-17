export const SCHEMA_VERSION = 1

export const SECTION_IDS = [
  'identity',
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export interface FreshnessBudget {
  freshMs: number
  staleMs: number
}

/** The envelope as it arrives over the wire. */
export interface SectionPayload {
  schemaVersion: number
  section: SectionId
  title: string
  budget: FreshnessBudget
  contentAuthoredAt: string
  body: unknown
}

/**
 * A cached section. The two timestamps are the whole point of this application.
 *
 * `fetchedAt`  — when these bytes arrived. Only a 200 moves it.
 * `verifiedAt` — when the server last CONFIRMED these bytes are still current.
 *                Both a 200 and a 304 move it.
 *
 * A 304 advances `verifiedAt` and leaves `fetchedAt` and the payload untouched, so the
 * UI can say "six days old, verified forty seconds ago" — which on a degraded link is a
 * completely different operational fact from "six days old, never checked".
 *
 * Both are raw Date.now() from the CLIENT clock. That is deliberate: age is computed as
 * Date.now() - verifiedAt, so the same clock is used at both ends. Correcting for server
 * skew would make the two ends disagree on a cold offline boot — which is the one case
 * this application exists to handle.
 */
export interface CachedSection {
  id: SectionId
  schemaVersion: number
  etag: string
  payload: SectionPayload
  fetchedAt: number
  verifiedAt: number
}
