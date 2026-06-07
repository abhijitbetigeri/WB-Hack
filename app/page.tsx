'use client'
import { useState } from 'react'
import { useCoAgent } from '@copilotkit/react-core'
import { CopilotSidebar } from '@copilotkit/react-ui'
import VibeBlueprintCard from '@/components/VibeBlueprintCard'
import CommentGradingFeed from '@/components/CommentGradingFeed'
import VibeReport from '@/components/VibeReport'

// ── Agent state shape mirrors Python AuditState ────────────────────────────────
interface AuditState {
  url: string
  stage: string
  progress: string
  platform?: string
  title?: string
  creator_handle?: string
  blueprint?: Record<string, unknown>
  raw_comments?: string[]
  comment_ids?: string[]
  graded_comments?: Record<string, unknown>[]
  analytics?: Record<string, unknown>
  comments_unavailable?: boolean
  error?: string
}

const STAGE_LABELS: Record<string, string> = {
  scraping:   'Scraping content via Apify…',
  blueprint:  'Generating Vibe Blueprint via WandB LLM…',
  indexing:   'Embedding & indexing comments in Redis VL…',
  grading:    'Grading comments with HumaneBench v3.0…',
  done:       'Done',
  error:      'Error',
}

const STAGE_ORDER = ['scraping', 'blueprint', 'indexing', 'grading', 'done']

export default function Home() {
  const [url, setUrl] = useState('')

  const { state, setState, run, stop, isRunning } = useCoAgent<AuditState>({
    name: 'audit_agent',
    initialState: { url: '', stage: 'idle', progress: '' },
  })

  async function handleAnalyse() {
    if (!url.trim() || isRunning) return
    await setState({ url: url.trim(), stage: 'scraping', progress: 'Starting…' })
    await run()
    setUrl('')
  }

  const stage = state?.stage ?? 'idle'
  const isDone = stage === 'done'
  const isError = stage === 'error'
  const stageIdx = STAGE_ORDER.indexOf(stage)

  return (
    <CopilotSidebar
      defaultOpen={false}
      labels={{ title: 'Audit Agent', placeholder: 'Ask about the results…' }}
      instructions="You are the Syntropimaxx audit assistant. Answer questions about the Vibe Blueprint, comment grades, and HumaneBench principles based on the current audit state."
    >
      <div className="min-h-screen flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#08081a]/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">S</div>
              <div>
                <h1 className="text-[15px] font-bold text-white leading-none">Syntropimaxx</h1>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Multi-Agent Creator Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              LangGraph · WandB Weave · Redis VL
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">

          {/* URL input */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600/40 via-indigo-500/30 to-purple-600/40 p-px">
              <div className="h-full w-full rounded-2xl bg-[#181940]" />
            </div>
            <div className="relative px-6 py-6">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">Multi-Agent Pipeline · Paste any link</p>
              <p className="text-sm text-slate-400 mb-4">
                Drop a YouTube video or X/Twitter post URL — a LangGraph supervisor will orchestrate scraping, blueprint generation, Redis indexing, and HumaneBench grading.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyse()}
                  placeholder="youtube.com/watch?v=...  or  x.com/user/status/..."
                  disabled={isRunning}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all disabled:opacity-40"
                />
                <button
                  onClick={isRunning ? stop : handleAnalyse}
                  disabled={!isRunning && !url.trim()}
                  className={`px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all shadow-lg whitespace-nowrap disabled:opacity-40 ${
                    isRunning
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-900/40'
                  }`}
                >
                  {isRunning ? 'Stop ✕' : 'Analyse →'}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-600">
                {['Apify scraping', 'WandB LLM', 'Redis VL', 'W&B Weave traces'].map((t, i) => (
                  <span key={t} className="flex items-center gap-1.5">
                    {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-700 inline-block" />}
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline progress */}
          {isRunning && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#1a1a3a] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-sm font-semibold text-violet-300">{STAGE_LABELS[stage] ?? 'Running…'}</p>
              </div>
              {/* Stage pipeline indicator */}
              <div className="flex items-center gap-1">
                {STAGE_ORDER.filter(s => s !== 'done').map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`h-1.5 flex-1 rounded-full transition-all ${
                      i < stageIdx ? 'bg-violet-500' :
                      i === stageIdx ? 'bg-violet-400 animate-pulse' :
                      'bg-white/10'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                {['Scrape', 'Blueprint', 'Index', 'Grade'].map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              {state?.progress && (
                <p className="text-[11px] text-slate-500 font-mono">{state.progress}</p>
              )}
            </div>
          )}

          {/* Error */}
          {isError && state?.error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          {/* Content bar */}
          {isDone && state?.title && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                {state.platform === 'youtube' ? '▶' : '𝕏'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200 truncate">{state.title}</p>
                <p className="text-xs text-slate-500 truncate">{state.creator_handle}</p>
              </div>
              <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
          )}

          {/* Results grid */}
          {isDone && state?.blueprint && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VibeBlueprintCard
                  blueprint={state.blueprint as never}
                  creatorHandle={state.creator_handle ?? ''}
                  platform={(state.platform ?? 'youtube') as 'youtube' | 'x'}
                />
                <CommentGradingFeed
                  comments={(state.graded_comments ?? []) as never[]}
                  source="live"
                  commentsUnavailable={state.comments_unavailable}
                />
              </div>

              {/* Prompt chips */}
              {(state.blueprint as Record<string, Record<string, string[]>>)?.contextual_prompts?.prompt_chips?.length > 0 && (
                <div className="rounded-2xl border border-white/[0.10] bg-[#1e2048] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06]">
                    <h3 className="text-[13px] font-bold text-white">
                      Contextual Prompt Chips
                      <span className="text-slate-500 font-normal ml-1.5">// Community Conversation Starters</span>
                    </h3>
                  </div>
                  <div className="px-5 py-5 flex flex-wrap gap-2.5">
                    {(state.blueprint as Record<string, Record<string, string[]>>).contextual_prompts.prompt_chips.map((chip: string) => (
                      <span key={chip} className="px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-200 text-sm font-medium border border-indigo-500/25 hover:bg-indigo-500/20 transition-all cursor-default">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {state.analytics && (
                <VibeReport analytics={state.analytics as never} creatorHandle={state.creator_handle ?? ''} />
              )}
            </>
          )}

          {/* Empty state */}
          {!isRunning && !isDone && !isError && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 mb-5">
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-base font-semibold text-slate-300 mb-2">Multi-agent pipeline ready</p>
              <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                LangGraph supervisor coordinates 4 specialist agents — scraper, blueprint, indexer, and grader — all traced in W&B Weave.
              </p>
              <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-slate-700">
                <span>ScraperAgent</span>
                <span>→</span>
                <span>BlueprintAgent</span>
                <span>→</span>
                <span>IndexerAgent</span>
                <span>→</span>
                <span>GraderAgent</span>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-white/[0.05] px-6 py-4 mt-8">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-slate-700">
            <span>Syntropimaxx · Applied Intelligence Hackathon 2026</span>
            <span>LangGraph · OpenAI Agents SDK · WandB Weave · Redis VL · Apify</span>
          </div>
        </footer>
      </div>
    </CopilotSidebar>
  )
}
