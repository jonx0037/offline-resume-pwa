import { openDB, type IDBPDatabase } from 'idb'
import { SCHEMA_VERSION, type CachedSection, type SectionId } from './types'

const DB_NAME = 'resume-offline'
const DB_VERSION = 1
const STORE = 'sections'

interface CacheHandle {
  get(id: SectionId): Promise<CachedSection | null>
  getAll(): Promise<CachedSection[]>
  put(rec: CachedSection): Promise<void>
  /** A 304: advance verifiedAt only. fetchedAt and the payload are untouched. */
  touch(id: SectionId, verifiedAt: number): Promise<CachedSection | null>
  clear(): Promise<void>
  available(): Promise<boolean>
}

/**
 * Factory, not a module-level singleton.
 *
 * A memoized module-scope handle makes per-test isolation impossible and hides failures:
 * if openDB rejects once (Safari private browsing, blocked storage, a corrupt database),
 * a singleton caches the rejection for the life of the page.
 *
 * Every method swallows its own errors and degrades to "no cache" rather than throwing.
 * The thesis of this app is graceful degradation; a cache layer that can white-screen the
 * page when storage is unavailable would contradict it in the most embarrassing way.
 */
export function createResumeCache(dbName = DB_NAME): CacheHandle {
  let dbp: Promise<IDBPDatabase> | null = null

  function db(): Promise<IDBPDatabase> {
    if (!dbp) {
      dbp = openDB(dbName, DB_VERSION, {
        upgrade(database) {
          if (!database.objectStoreNames.contains(STORE)) {
            database.createObjectStore(STORE, { keyPath: 'id' })
          }
        },
        blocked() {
          console.warn('[cache] upgrade blocked by another open tab')
        },
        // NOTE: `blocking` receives (currentVersion, blockedVersion, event) — it does NOT
        // receive a database handle. Closing here requires the handle from the closure.
        blocking() {
          console.warn('[cache] another tab wants to upgrade; closing this connection')
          dbp?.then((d) => d.close()).catch(() => {})
          dbp = null
        },
        terminated() {
          dbp = null
        },
      })
    }
    return dbp
  }

  async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      console.warn('[cache] degraded to no-cache:', err)
      return fallback
    }
  }

  return {
    async available() {
      return safe(async () => {
        await db()
        return true
      }, false)
    },

    async get(id) {
      return safe(async () => {
        const rec = (await (await db()).get(STORE, id)) as CachedSection | undefined
        if (!rec) return null
        // Refuse to hand back a record written under a contract we no longer speak.
        // classify() also guards this, but a caller reading .payload directly should
        // never receive bytes it cannot interpret.
        if (rec.schemaVersion !== SCHEMA_VERSION) return null
        return rec
      }, null)
    },

    async getAll() {
      return safe(async () => {
        const all = (await (await db()).getAll(STORE)) as CachedSection[]
        return all.filter((r) => r.schemaVersion === SCHEMA_VERSION)
      }, [])
    },

    async put(rec) {
      await safe(async () => {
        await (await db()).put(STORE, rec)
      }, undefined)
    },

    async touch(id, verifiedAt) {
      return safe(async () => {
        const d = await db()
        const tx = d.transaction(STORE, 'readwrite')
        const rec = (await tx.store.get(id)) as CachedSection | undefined
        if (!rec) {
          await tx.done
          return null
        }
        const next: CachedSection = { ...rec, verifiedAt }
        await tx.store.put(next)
        await tx.done
        return next
      }, null)
    },

    async clear() {
      await safe(async () => {
        await (await db()).clear(STORE)
      }, undefined)
    },
  }
}

/**
 * Ask the browser to make this origin's storage durable.
 *
 * On iPadOS this is the difference between a working app and a blank screen: WebKit
 * clears script-writable storage after ~7 days of Safari use without interaction. A
 * home-screen web app is exempt, because it isn't part of Safari and keeps its own
 * counter of days of use — which reframes the install prompt from a growth nag into the
 * mechanism that makes the cache allowed to survive at all.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
