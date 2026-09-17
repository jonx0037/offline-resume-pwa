import { createHash } from 'node:crypto'
import { SECTIONS, SCHEMA_VERSION, CONTENT_AUTHORED_AT } from './_data/resume.js'
// The '.js' extension on a relative import of a '.ts' source is the one spelling that is
// valid under nodenext, native Node ESM, and esbuild simultaneously. Vercel does not bundle
// /api — it strips types and hands the original layout to Node's ESM loader — so an
// extensionless import fails at RUNTIME as a 500 while `tsc --noEmit` stays perfectly green.

const SECTION_IDS = Object.keys(SECTIONS)

/** Strong validator over the exact bytes we would send. */
const tag = (body: string) =>
  `"${createHash('sha256').update(body).digest('base64url').slice(0, 27)}"`

/**
 * RFC 9110 sec. 13.1.2: a recipient MUST use WEAK comparison for If-None-Match.
 * The header is a comma-separated list, may be `*`, and entries may be `W/"..."`.
 *
 * A naive `header === etag` works on localhost and then silently returns 200 forever in
 * production once any intermediary re-encodes the response and weakens the validator.
 * It does not fail — it just quietly stops saving bandwidth, so nothing ever pages you.
 */
function ifNoneMatchSatisfied(header: string | null, etag: string): boolean {
  if (!header) return false
  if (header.trim() === '*') return true
  const norm = (t: string) => t.trim().replace(/^W\//, '')
  return header.split(',').some((t) => norm(t) === norm(etag))
}

function baseHeaders(): Headers {
  const h = new Headers()
  // `private, no-cache` keeps Vercel's CDN from answering on our behalf. If the edge
  // answers, this function never runs and the ETag logic silently stops existing.
  h.set('Cache-Control', 'private, no-cache')
  h.set('Vary', 'Origin, Accept-Encoding')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Server-Time', new Date().toISOString())
  h.set('X-Content-Authored-At', CONTENT_AUTHORED_AT)
  h.set('Access-Control-Allow-Origin', '*')
  // ETag is NOT a CORS-safelisted response header. Without this line a cross-origin client
  // cannot read the validator, so conditional caching silently never happens at all.
  h.set(
    'Access-Control-Expose-Headers',
    'ETag, X-Server-Time, X-Content-Authored-At, X-Demo-Applied, Retry-After',
  )
  return h
}

/** RFC 9457 problem+json. An error should not arrive as HTTP 200 with a body. */
function problem(
  request: Request,
  status: number,
  code: string,
  detail: string,
  extra: Record<string, string> = {},
): Response {
  const url = new URL(request.url)
  const h = baseHeaders()
  for (const [k, v] of Object.entries(extra)) h.set(k, v)
  h.set('Content-Type', 'application/problem+json; charset=utf-8')
  return new Response(
    JSON.stringify({
      type: `https://github.com/jonx0037/offline-resume-pwa#problem-${code}`,
      title: code,
      status,
      detail,
      instance: url.pathname + url.search,
    }),
    { status, headers: h },
  )
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      const h = baseHeaders()
      h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      // If-None-Match is not a safelisted REQUEST header, so a *conditional* cross-origin
      // GET triggers a preflight where a plain one does not. It must be named here or the
      // browser blocks the GET that carries it.
      h.set('Access-Control-Allow-Headers', 'If-None-Match')
      h.set('Access-Control-Max-Age', '600')
      return new Response(null, { status: 204, headers: h })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return problem(
        request,
        405,
        'method-not-allowed',
        `${request.method} is not supported here.`,
        { Allow: 'GET, HEAD, OPTIONS' },
      )
    }

    const section = url.searchParams.get('section')
    if (section === null || !SECTION_IDS.includes(section)) {
      return problem(
        request,
        400,
        'unknown-section',
        `section must be one of: ${SECTION_IDS.join(', ')}. Received ${JSON.stringify(section)}.`,
      )
    }

    // Demo switch: six lines, and it always echoes what it did via X-Demo-Applied.
    // Deliberately not a "fault injection subsystem" — that would be an Envoy-shaped
    // costume over `if (param) return new Response()`.
    const fail = url.searchParams.get('fail')
    if (fail !== null) {
      const status = Number(fail)
      if (!Number.isInteger(status) || status < 400 || status > 599) {
        return problem(request, 400, 'bad-demo-status', `fail must be an integer 400-599.`)
      }
      const h = baseHeaders()
      h.set('X-Demo-Applied', `fail=${status}`)
      if (status === 429 || status === 503) h.set('Retry-After', '7')
      h.set('Content-Type', 'application/problem+json; charset=utf-8')
      return new Response(
        JSON.stringify({
          type: 'https://github.com/jonx0037/offline-resume-pwa#problem-demo',
          title: 'demo-induced-failure',
          status,
          detail: `Induced by ?fail=${status}. This is a demo switch, not a real fault.`,
        }),
        { status, headers: h },
      )
    }

    const s = SECTIONS[section as keyof typeof SECTIONS]
    const body = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      section: s.id,
      title: s.title,
      // The freshness budget travels WITH the data. The server is the authority on how
      // long its own answer stays trustworthy; a client-side constant would be a guess
      // about someone else's data.
      budget: s.budget,
      contentAuthoredAt: CONTENT_AUTHORED_AT,
      body: s.body,
    })

    const etag = tag(body)
    const h = baseHeaders()
    h.set('ETag', etag)
    h.set('Content-Type', 'application/json; charset=utf-8')

    if (ifNoneMatchSatisfied(request.headers.get('If-None-Match'), etag)) {
      // 304 carries no body. The client advances `verifiedAt` and leaves `fetchedAt`
      // and the payload untouched. ~200 bytes instead of the whole section.
      return new Response(null, { status: 304, headers: h })
    }

    const slow = Number(url.searchParams.get('slow') ?? 0)
    if (Number.isFinite(slow) && slow > 0) {
      h.set('X-Demo-Applied', `slow=${Math.min(slow, 10000)}`)
      await new Promise((r) => setTimeout(r, Math.min(slow, 10000)))
    }

    // HEAD must send identical headers and no body.
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: h })
  },
}
