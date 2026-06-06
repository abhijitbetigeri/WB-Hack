'use client'
import { useState } from 'react'
import VibeBlueprintCard from '@/components/VibeBlueprintCard'
import CommentGradingFeed from '@/components/CommentGradingFeed'
import VibeReport from '@/components/VibeReport'
import type { VibeBlueprint } from '@/lib/insforge'
import type { GradedComment, AuditAnalytics } from '@/lib/grader'

type Platform = 'youtube' | 'x'

const HUMANEBENCH_PRINCIPLES = [
  {
    code: 'respect_attention',
    name: 'Respect Attention',
    description: 'Does the comment honor the creator\'s focus, or demand more content/effort from them?',
    dot: 'bg-violet-400',
  },
  {
    code: 'meaningful_choices',
    name: 'Meaningful Choices',
    description: 'Does it support creator autonomy, or pressure them toward a specific decision?',
    dot: 'bg-indigo-400',
  },
  {
    code: 'enhance_capabilities',
    name: 'Enhance Capabilities',
    description: 'Does it help the creator grow their skills, knowledge, or creative practice?',
    dot: 'bg-sky-400',
  },
  {
    code: 'dignity_safety',
    name: 'Dignity & Safety',
    description: 'Does it protect the creator\'s dignity and emotional safety, free from harm?',
    dot: 'bg-emerald-400',
  },
  {
    code: 'healthy_relationships',
    name: 'Healthy Relationships',
    description: 'Does it foster healthy parasocial boundaries, or create unhealthy attachment?',
    dot: 'bg-teal-400',
  },
  {
    code: 'longterm_wellbeing',
    name: 'Long-term Wellbeing',
    description: 'Does it support sustainable creator mental health, not just short-term engagement?',
    dot: 'bg-amber-400',
  },
  {
    code: 'transparency_honesty',
    name: 'Transparency & Honesty',
    description: 'Is the engagement genuine and transparent, not flattery or manipulation?',
    dot: 'bg-orange-400',
  },
  {
    code: 'equity_inclusion',
    name: 'Equity & Inclusion',
    description: 'Is the comment inclusive and equitable, free from marginalizing language?',
    dot: 'bg-rose-400',
  },
]

const PLATFORM_META: Record<Platform, { label: string; icon: string; handle: string; title: string; url: string }> = {
  youtube: {
    label: 'YouTube',
    icon: '▶',
    handle: '@alexcreates',
    title: "I Almost Quit Creating. Here's What Stopped Me.",
    url: 'https://www.youtube.com/watch?v=example_burnout',
  },
  x: {
    label: 'X / Twitter',
    icon: '𝕏',
    handle: '@jordanbuilds',
    title: 'Thread: On shipping in public and the cost nobody talks about',
    url: 'https://x.com/jordanbuilds/status/1234567890',
  },
}

interface BlueprintState {
  contentItemId: string
  vibeBlueprint: VibeBlueprint
  creatorHandle: string
  title: string
  platform: Platform
  contentUrl: string
  isLive?: boolean
}

interface AuditState {
  gradedComments: GradedComment[]
  analytics: AuditAnalytics
  source: 'demo' | 'live'
  evaluatedInSandbox?: boolean
  commentsUnavailable?: boolean
}

export default function Home() {
  const [platform, setPlatform] = useState<Platform>('youtube')
  const [blueprintState, setBlueprintState] = useState<BlueprintState | null>(null)
  const [auditState, setAuditState] = useState<AuditState | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveUrl, setLiveUrl] = useState('')

  async function runAudit(contentItemId: string) {
    setAuditLoading(true)
    setAuditState(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentItemId }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuditState({ gradedComments: data.gradedComments, analytics: data.analytics, source: data.source, evaluatedInSandbox: data.evaluatedInSandbox })
      }
    } catch {
      // audit failure is non-fatal — blueprint still shows
    } finally {
      setAuditLoading(false)
    }
  }

  async function loadBlueprint(p: Platform) {
    setPlatform(p)
    setBlueprintState(null)
    setAuditState(null)
    setError(null)
    setLoading(true)
    setLoadingMsg('Fetching transcript from Tigris → analyzing with HumaneBench principles...')
    try {
      const res = await fetch(`/api/blueprint?platform=${p}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load blueprint')
        return
      }
      setBlueprintState({
        contentItemId: data.contentItemId,
        vibeBlueprint: data.vibeBlueprint,
        creatorHandle: PLATFORM_META[p].handle,
        title: PLATFORM_META[p].title,
        platform: p,
        contentUrl: PLATFORM_META[p].url,
      })
      setLoading(false)
      runAudit(data.contentItemId)
    } catch {
      setError('Network error — check the dev server logs')
    } finally {
      setLoading(false)
    }
  }

  async function ingestLiveUrl() {
    if (!liveUrl.trim()) return
    setBlueprintState(null)
    setAuditState(null)
    setError(null)
    setLoading(true)
    setLoadingMsg('Scraping via Apify → generating Vibe Blueprint → grading comments...')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: liveUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Audit failed')
      } else {
        setPlatform(data.platform as Platform)
        setBlueprintState({
          contentItemId: data.contentItemId,
          vibeBlueprint: data.vibeBlueprint,
          creatorHandle: data.creatorHandle,
          title: data.title,
          platform: data.platform,
          contentUrl: data.contentUrl,
          isLive: true,
        })
        setAuditState({ gradedComments: data.gradedComments, analytics: data.analytics, source: data.source, evaluatedInSandbox: data.evaluatedInSandbox, commentsUnavailable: data.commentsUnavailable })
        setLiveUrl('')
      }
    } catch {
      setError('Network error — check the dev server logs')
    } finally {
      setLoading(false)
    }
  }

  const displayHandle = blueprintState?.creatorHandle ?? PLATFORM_META[platform].handle
  const displayTitle  = blueprintState?.title ?? PLATFORM_META[platform].title
  const displayUrl    = blueprintState?.contentUrl ?? PLATFORM_META[platform].url

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#08081a]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
              S
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white leading-none">Syntropimaxx</h1>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Creator Vibe Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            HumaneBench v3.0 · 8 principles
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">

        {/* ── Hero URL input ── */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* gradient border trick */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600/40 via-indigo-500/30 to-purple-600/40 p-px">
            <div className="h-full w-full rounded-2xl bg-[#181940]" />
          </div>
          <div className="relative px-6 py-6">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
              Creator Intelligence · Paste any link
            </p>
            <p className="text-sm text-slate-400 mb-4">
              Drop a YouTube video or X/Twitter post URL — we'll scrape it, generate a Vibe Blueprint, and grade every comment A–F.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ingestLiveUrl()}
                placeholder="youtube.com/watch?v=...  or  x.com/user/status/..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all"
              />
              <button
                onClick={ingestLiveUrl}
                disabled={!liveUrl.trim() || loading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold disabled:opacity-40 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-900/40 whitespace-nowrap"
              >
                Analyse →
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-600">
              <span>Apify scraping</span>
              <span className="w-1 h-1 rounded-full bg-slate-700 inline-block" />
              <span>Nebius LLM</span>
              <span className="w-1 h-1 rounded-full bg-slate-700 inline-block" />
              <span>Tigris storage</span>
              <span className="w-1 h-1 rounded-full bg-slate-700 inline-block" />
              <span>InsForge DB</span>
            </div>
          </div>
        </div>

        {/* ── Demo buttons ── */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Or try a demo
          </p>
          <div className="flex gap-3">
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
              const m = PLATFORM_META[p]
              const isActive = platform === p && blueprintState && !blueprintState.isLive
              return (
                <button
                  key={p}
                  onClick={() => loadBlueprint(p)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? 'border-violet-500/60 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-900/20'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.15] hover:text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className={`text-base ${p === 'youtube' ? 'text-red-400' : 'text-slate-300'}`}>{m.icon}</span>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── HumaneBench principles ── */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            HumaneBench v3.0 — 8 Evaluation Principles
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HUMANEBENCH_PRINCIPLES.map((p) => (
              <div key={p.code} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                  <span className="text-[11px] font-bold text-slate-300 leading-tight">{p.name}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Content info bar ── */}
        {(blueprintState || loading) && (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">
              {PLATFORM_META[blueprintState?.platform ?? platform].icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{displayTitle}</p>
              <p className="text-xs text-slate-500 truncate">
                {displayHandle} · <a href={displayUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-slate-300">{displayUrl}</a>
              </p>
            </div>
            {blueprintState?.isLive && (
              <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        )}

        {/* ── Blueprint loading state ── */}
        {loading && (
          <div className="flex items-center gap-4 rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-5">
            <div className="shrink-0 w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-semibold text-violet-300">Generating Vibe Blueprint</p>
              <p className="text-xs text-slate-500 mt-0.5">{loadingMsg}</p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Main grid ── */}
        {blueprintState && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VibeBlueprintCard
              blueprint={blueprintState.vibeBlueprint}
              creatorHandle={displayHandle}
              platform={blueprintState.platform}
            />
            <CommentGradingFeed
              comments={auditState?.gradedComments ?? []}
              source={auditState?.source}
              evaluatedInSandbox={auditState?.evaluatedInSandbox}
              commentsUnavailable={auditState?.commentsUnavailable}
              loading={auditLoading}
            />
          </div>
        )}

        {/* ── Prompt Chips ── */}
        {blueprintState && (
          <div className="rounded-2xl border border-white/[0.10] bg-[#1e2048] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-white">
                  Contextual Prompt Chips
                  <span className="text-slate-500 font-normal ml-1.5">// Community Conversation Starters</span>
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Pin these as top comments to guide your audience toward high-signal engagement
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-2.5 py-1 rounded-full font-medium">
                {blueprintState.vibeBlueprint.contextual_prompts.prompt_chips.length} chips
              </span>
            </div>
            <div className="px-5 py-5">
              <div className="flex flex-wrap gap-2.5">
                {blueprintState.vibeBlueprint.contextual_prompts.prompt_chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-block px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-200 text-sm font-medium border border-indigo-500/25 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition-all cursor-default"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-600 mt-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                Principle: {blueprintState.vibeBlueprint.contextual_prompts.humanebench_principle.replace(/-/g, ' ')}
              </p>
            </div>
          </div>
        )}

        {/* ── Analytics report ── */}
        {blueprintState && auditState && (
          <VibeReport analytics={auditState.analytics} creatorHandle={displayHandle} />
        )}

        {/* ── Empty state ── */}
        {!blueprintState && !loading && !error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 mb-5">
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-base font-semibold text-slate-300 mb-2">
              Grade your community, instantly
            </p>
            <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
              HumaneBench v3.0 evaluates every comment across 8 principles and maps the result to an A–F grade with actionable feedback.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-white/[0.05] px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-slate-700">
          <span>Syntropimaxx · Applied Intelligence Hackathon 2026</span>
          <span>HumaneBench · Nebius · Tigris · InsForge · Apify</span>
        </div>
      </footer>
    </div>
  )
}
