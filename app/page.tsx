'use client'
import { useRef, useState } from 'react'
import { useCopilotReadable } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import VibeBlueprintCard from '@/components/VibeBlueprintCard'
import CommentGradingFeed from '@/components/CommentGradingFeed'
import VibeReport from '@/components/VibeReport'

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

function PromptChipsSection({ chips, description, creatorHandle }: {
  chips: string[]
  description: string
  creatorHandle: string
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)

  useCopilotReadable({
    description: 'Contextual prompt chips — AI-generated conversation starters for this creator\'s community',
    value: { chips, description, creatorHandle },
  })

  return (
    <div className="flex flex-col gap-2">
      {/* Main card — overflow-hidden safe, chat is a sibling */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-slate-800">
              Contextual Prompt Chips
              <span className="text-slate-400 font-normal ml-1.5">// Community Conversation Starters</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Click a chip to explore it with AI</p>
          </div>
          <button
            onClick={() => setChatOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
              chatOpen
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <span>{chatOpen ? '✕' : '✦'}</span>
            {chatOpen ? 'Close AI' : 'Explore with AI'}
          </button>
        </div>

        <div className="px-5 py-5 flex flex-wrap gap-2.5">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => { setActiveChip(chip === activeChip ? null : chip); setChatOpen(true) }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeChip === chip
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-1 ring-indigo-300'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* AI chat panel — sibling of overflow-hidden card so input is never clipped */}
      {chatOpen && (
        <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">✦ Prompt Chip AI</span>
              {activeChip && (
                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {activeChip}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeChip && (
                <button onClick={() => setActiveChip(null)} className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                  Clear chip
                </button>
              )}
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">✕</button>
            </div>
          </div>
          <div className="h-72">
            <CopilotChat
              instructions={`You are the CCIP Prompt Chip AI. These prompt chips are AI-generated conversation starters for fans engaging with ${creatorHandle}.
Chips available: ${chips.map((c, i) => `${i + 1}. "${c}"`).join(', ')}.
${description ? `Context: ${description}` : ''}
${activeChip ? `The user selected chip: "${activeChip}". Help them craft a genuine, HumaneBench-aligned comment using this chip. Explain why this chip is relevant to the creator's content and how to personalise it.` : 'Help the user understand how to use these prompt chips to write better, more humane fan comments.'}
Keep answers concise and actionable.`}
              labels={{
                title: 'Prompt Chip AI',
                placeholder: activeChip ? `How do I use "${activeChip.slice(0, 30)}"?` : 'Ask how to use these prompt chips…',
                initial: activeChip
                  ? `You selected **"${activeChip}"**. I can help you craft a genuine, high-scoring comment with this chip. Ask me how!`
                  : `I have **${chips.length} prompt chips** for ${creatorHandle}. Click one above or ask me how to use them to write A-grade HumaneBench comments.`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<AuditState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleAnalyse() {
    if (!url.trim() || isRunning) return
    setState({ url: url.trim(), stage: 'scraping', progress: 'Connecting to backend…' })
    setIsRunning(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'
      const res = await fetch(
        `${backendUrl}/run-stream?url=${encodeURIComponent(url.trim())}`,
        { signal: controller.signal },
      )
      if (!res.ok || !res.body) throw new Error(`Backend returned ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed: AuditState = JSON.parse(line.slice(6))
              setState(parsed)
            } catch { /* ignore malformed */ }
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        const msg = e instanceof Error ? e.message : String(e)
        setState(prev => prev
          ? { ...prev, stage: 'error', error: msg }
          : { url: url.trim(), stage: 'error', error: msg }
        )
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setIsRunning(false)
    setState(prev => prev ? { ...prev, stage: 'idle', progress: 'Stopped.' } : null)
  }

  const stage = state?.stage ?? 'idle'
  const isDone = stage === 'done'
  const isError = stage === 'error'
  const stageIdx = STAGE_ORDER.indexOf(stage)
  // Show results progressively: blueprint card appears once blueprint is ready,
  // comment feed shows a loading skeleton during indexing/grading stages
  const hasBlueprint = !!state?.blueprint
  const showResults = hasBlueprint && (isDone || isRunning)
  const commentFeedLoading = isRunning && (stage === 'indexing' || stage === 'grading')

  return (
    <>
      <div className="min-h-screen flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-violet-200">C</div>
              <div>
                <h1 className="text-[15px] font-bold text-slate-900 leading-none">CCIP</h1>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Content Creators Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              LangGraph · WandB Weave · Redis VL
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">

          {/* URL input */}
          <div className="rounded-2xl border border-violet-200 bg-white shadow-sm shadow-violet-100 px-6 py-6">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">Multi-Agent Pipeline · Paste any link</p>
            <p className="text-sm text-slate-500 mb-4">
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
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-300 transition-all disabled:opacity-40"
              />
              <button
                onClick={isRunning ? handleStop : handleAnalyse}
                disabled={!isRunning && !url.trim()}
                className={`px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all shadow-md whitespace-nowrap disabled:opacity-40 ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-400 shadow-red-200'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-200'
                }`}
              >
                {isRunning ? 'Stop ✕' : 'Analyse →'}
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
              {['Apify scraping', 'WandB LLM', 'Redis VL', 'W&B Weave traces'].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Pipeline progress */}
          {isRunning && (
            <div className="rounded-2xl border border-violet-100 bg-white shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-sm font-semibold text-violet-700">{STAGE_LABELS[stage] ?? 'Running…'}</p>
              </div>
              <div className="flex items-center gap-1">
                {STAGE_ORDER.filter(s => s !== 'done').map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`h-1.5 flex-1 rounded-full transition-all ${
                      i < stageIdx ? 'bg-violet-500' :
                      i === stageIdx ? 'bg-violet-400 animate-pulse' :
                      'bg-slate-200'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                {['Scrape', 'Blueprint', 'Index', 'Grade'].map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              {state?.progress && (
                <p className="text-[11px] text-slate-500 font-mono">{state.progress}</p>
              )}
            </div>
          )}

          {/* Pipeline / fetch error */}
          {isError && state?.error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          {/* Content bar — shows as soon as scraping completes */}
          {state?.title && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">
                {state.platform === 'youtube' ? '▶' : '𝕏'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{state.title}</p>
                <p className="text-xs text-slate-400 truncate">{state.creator_handle}</p>
              </div>
              <span className="shrink-0 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          )}

          {/* Results — appear progressively as pipeline stages complete */}
          {showResults && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VibeBlueprintCard
                  blueprint={state!.blueprint as never}
                  creatorHandle={state!.creator_handle ?? ''}
                  platform={(state!.platform ?? 'youtube') as 'youtube' | 'x'}
                />
                <CommentGradingFeed
                  comments={(state!.graded_comments ?? []) as never[]}
                  source="live"
                  commentsUnavailable={state!.comments_unavailable}
                  loading={commentFeedLoading}
                />
              </div>

              {isDone && (state!.blueprint as Record<string, Record<string, string[]>>)?.contextual_prompts?.prompt_chips?.length > 0 && (
                <PromptChipsSection
                  chips={(state!.blueprint as Record<string, Record<string, string[]>>).contextual_prompts.prompt_chips}
                  description={(state!.blueprint as Record<string, Record<string, string | string[]>>).contextual_prompts.description as string}
                  creatorHandle={state!.creator_handle ?? ''}
                />
              )}

              {isDone && state!.analytics && (
                <VibeReport analytics={state!.analytics as never} creatorHandle={state!.creator_handle ?? ''} />
              )}
            </>
          )}

          {/* Empty state */}
          {!isRunning && !isDone && !isError && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200 mb-5">
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-base font-semibold text-slate-700 mb-2">Multi-agent pipeline ready</p>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                LangGraph supervisor coordinates 4 specialist agents — scraper, blueprint, indexer, and grader — all traced in W&B Weave.
              </p>
              <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-slate-400">
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

        <footer className="border-t border-slate-200 px-6 py-4 mt-8">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-slate-400">
            <span>CCIP · WeaveHacks 4</span>
            <span>LangGraph · OpenAI Agents SDK · WandB Weave · Redis VL · Apify</span>
          </div>
        </footer>
      </div>
    </>
  )
}
