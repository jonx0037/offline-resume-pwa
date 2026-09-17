/**
 * Resume content, split into six independently-revalidated sections.
 *
 * Each section declares its OWN freshness budget. That is deliberate: the budget is a
 * property of the data, not of the client, so the server is the authority on how long
 * its own answer stays trustworthy. A client-side constant would be a guess about
 * someone else's data.
 *
 * The budgets differ per section so the UI shows a realistic MIX of states rather than
 * six badges that all flip at once. Skills go stale fastest (they change most often);
 * identity and education are effectively static.
 *
 * Contact PII (phone, personal email) is deliberately absent — this is a public,
 * crawlable URL. LinkedIn and GitHub are the intended contact paths.
 */

export const SCHEMA_VERSION = 1

/** When the underlying content was last edited by a human. Distinct from when it was served. */
export const CONTENT_AUTHORED_AT = '2026-09-17T18:00:00.000Z'

export type SectionId =
  | 'identity'
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'

export interface FreshnessBudget {
  /** Verified more recently than this -> `fresh`. Milliseconds. */
  freshMs: number
  /** Verified more recently than this -> `stale`. Beyond it -> `expired`. Milliseconds. */
  staleMs: number
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export interface Section {
  id: SectionId
  title: string
  budget: FreshnessBudget
  body: unknown
}

export const SECTIONS: Record<SectionId, Section> = {
  identity: {
    id: 'identity',
    title: 'Identity',
    budget: { freshMs: 24 * HOUR, staleMs: 7 * DAY },
    body: {
      name: 'Jonathan A. Rocha',
      headline: 'Full-Stack Engineer · AI Agents & Applied LLMs',
      location: 'Austin, TX',
      links: [
        { label: 'Portfolio', href: 'https://jonathanaaronrocha.com' },
        { label: 'LinkedIn', href: 'https://linkedin.com/in/jonathan-rocha-ai' },
        { label: 'GitHub', href: 'https://github.com/jonx0037' },
      ],
      note: 'Phone and email are deliberately omitted from this public payload.',
    },
  },

  summary: {
    id: 'summary',
    title: 'Summary',
    budget: { freshMs: 12 * HOUR, staleMs: 3 * DAY },
    body: {
      text:
        'Full-stack engineer with 20+ years shipping production React/Next.js front ends and ' +
        'Python back ends, now building agentic AI on that foundation: multi-agent orchestration, ' +
        'RAG retrieval layers, and LLM-integrated developer tooling. I design the full stack — ' +
        'typed API contracts, retrieval and state layers, and the interfaces that make agent ' +
        'behavior legible to the people relying on it.',
      ownership:
        'I own systems past the merge: API contracts, failure modes, performance, and honest ' +
        'handling of upstream data that arrives late or incomplete.',
    },
  },

  experience: {
    id: 'experience',
    title: 'Experience',
    budget: { freshMs: 6 * HOUR, staleMs: 2 * DAY },
    body: [
      {
        role: 'Principal Data Scientist',
        org: 'DataSalt.ai',
        location: 'Austin, TX',
        start: 'Jan 2026',
        end: 'Present',
        bullets: [
          'Run a boutique AI/ML consultancy; ship agent-based and RAG systems end-to-end for 10+ clients — Next.js 16 / Tailwind front ends, FastAPI services, Qdrant and MongoDB data layers on Vercel and Railway',
          'Created the Formal platform series — four sites (Astro 5, React 18, MDX, Tailwind CSS 4, D3.js v7) covering 180+ topics across 39 tracks on a shared token and primitive layer',
          'Built SaltyDog, a custom-avatar AI chatbot, and a programmatic hero-image generator for datasalt.ai',
        ],
      },
      {
        role: 'Senior Web Developer & Full-Stack Engineer',
        org: 'Fullsteam',
        location: 'Austin, TX',
        start: 'Jun 2021',
        end: 'Dec 2025',
        bullets: [
          'Built the client sales-reporting pipeline: a nightly Python runner reconciling POS, Google Analytics, and Google/Facebook ad-spend APIs into a single reporting view across 100+ accounts, reclaiming roughly 20 analyst hours per week',
          'Engineered explicit partial-data detection into that pipeline — upstream provider lag made backfill impossible, so incomplete days were flagged rather than reported as complete',
          'Architected and maintained 150+ React web applications across JavaScript, Python, and Go, plus the database systems and AWS infrastructure behind them',
          'Integrated Cohere/LLM tooling and e-commerce chatbots into 40+ client properties; built Python NLP and SEO-analytics pipelines that replaced $1,500+/yr in paid SaaS tools',
          'Performance work cut median page load 400% and lifted search visibility 125% across Fullsteam digital properties',
        ],
      },
      {
        role: 'Web Developer',
        org: 'DRS',
        location: 'Austin, TX',
        start: 'Feb 2017',
        end: 'Jun 2021',
        bullets: [
          'Front-end engineering for e-commerce: built Bootstrap- and React-based interfaces for 100+ client storefronts',
          'Full-stack delivery across JavaScript, Python, and Go on AWS; built responsive mobile-first layouts wired to back-end services over REST APIs',
        ],
      },
      {
        role: 'Earlier',
        org: 'Amaru Motors · Wells Fargo',
        location: '',
        start: '2004',
        end: '2017',
        bullets: [
          'Web Developer, Amaru Motors (Mar 2009 – Jan 2017)',
          'Web Developer, Wells Fargo (2004 – 2009) — regulated online banking',
        ],
      },
    ],
  },

  projects: {
    id: 'projects',
    title: 'Selected Projects',
    budget: { freshMs: 2 * HOUR, staleMs: 1 * DAY },
    body: [
      {
        name: 'CounselOS',
        blurb:
          'Multi-agent legal matter intake — five-agent FastAPI pipeline driven by a custom ' +
          'state-machine orchestrator, no agent framework. Next.js client, Railway + Vercel.',
      },
      {
        name: 'finrag.io',
        blurb:
          'Multimodal financial RAG platform — Gemini Embeddings 2 over Qdrant, Cloudflare R2 ' +
          'document store, FastAPI backend, Claude Sonnet synthesis, Next.js on Vercel.',
      },
      {
        name: 'market-sentiment.io',
        blurb:
          'SMU capstone dashboard with a hybrid RAG + live-context chatbot over GARCH(1,1) and ' +
          'Statistical Jump Model regime signals.',
      },
      {
        name: 'This application',
        blurb:
          'Vue 3 offline-first PWA. The freshness contract is the point; the resume is the payload.',
      },
    ],
  },

  skills: {
    id: 'skills',
    title: 'Technical Skills',
    budget: { freshMs: 1 * HOUR, staleMs: 12 * HOUR },
    body: [
      {
        group: 'Languages',
        items: ['TypeScript', 'JavaScript (ES6+)', 'Python', 'Go', 'SQL', 'HTML', 'CSS', 'R'],
      },
      {
        group: 'Front End',
        items: [
          'React 18', 'Next.js 16', 'Astro 5', 'Vue 3 (this project)', 'MDX',
          'Tailwind CSS 4', 'D3.js v7', 'mobile-first responsive UI', 'accessibility',
        ],
      },
      {
        group: 'Back End & Data',
        items: ['FastAPI', 'Node.js', 'Flask', 'REST API design', 'microservices', 'MongoDB', 'Qdrant', 'Delta Lake', 'PySpark'],
      },
      {
        group: 'AI Agents & LLMs',
        items: [
          'Multi-agent orchestration', 'state-machine agent pipelines',
          'RAG (chunking, retrieval, reranking, grounding)', 'tool calling',
          'Claude / Claude Code', 'Gemini', 'Cohere', 'Ollama', 'Hugging Face Transformers',
        ],
      },
      {
        group: 'Cloud & CI/CD',
        items: ['AWS', 'Vercel', 'Railway', 'Cloudflare R2', 'Azure DevOps pipelines', 'Databricks', 'Docker', 'Git-based CI/CD'],
      },
    ],
  },

  education: {
    id: 'education',
    title: 'Education',
    budget: { freshMs: 24 * HOUR, staleMs: 7 * DAY },
    body: [
      {
        degree: 'M.S. in Data Science',
        school: 'Southern Methodist University',
        location: 'Dallas, TX',
        date: 'Aug 2026',
        detail: 'GPA 3.8 · Applied Statistics I & II · Machine Learning II · Artificial Intelligence · Cloud Computing (Databricks)',
      },
      {
        degree: 'M.A. in English',
        school: 'Texas A&M University–Central Texas',
        location: 'Killeen, TX',
        date: 'Dec 2024',
        detail: '',
      },
      {
        degree: 'B.A. in History',
        school: 'Texas A&M University',
        location: 'College Station, TX',
        date: 'Aug 2004',
        detail: '',
      },
    ],
  },
}
