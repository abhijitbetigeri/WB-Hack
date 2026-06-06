'use client'
import { useState } from 'react'
import type { VibeBlueprint } from '@/lib/insforge'

interface PrincipleScore {
  name: string
  score: number
  rationale?: string
}

interface EvalResponse {
  signalLevel: 'high' | 'low'
  score: number
  principleScores: Record<string, number>
  principles: PrincipleScore[]
  globalViolations: string[]
  confidence: number
  reasoning: string
  promptChips: string[] | null
}

const PRINCIPLE_LABELS: Record<string, string> = {
  respect_attention:    'Attention',
  meaningful_choices:   'Choices',
  enhance_capabilities: 'Capabilities',
  dignity_safety:       'Safety',
  healthy_relationships:'Relationships',
  longterm_wellbeing:   'Wellbeing',
  transparency_honesty: 'Honesty',
  equity_inclusion:     'Inclusion',
}

function scoreColor(score: number) {
  if (score >= 0.5) return 'text-green-600'
  if (score >= 0)   return 'text-amber-500'
  return 'text-red-500'
}

function scoreBg(score: number) {
  if (score >= 0.5) return 'bg-green-50 border-green-100'
  if (score >= 0)   return 'bg-amber-50 border-amber-100'
  return 'bg-red-50 border-red-100'
}

interface Props {
  contentItemId: string
  blueprint: VibeBlueprint
  onHighSignal: () => void
}

export default function CommentBox({ contentItemId, blueprint, onHighSignal }: Props) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EvalResponse | null>(null)
  const [accepted, setAccepted] = useState(false)

  async function handleSubmit() {
    if (!comment.trim() || loading) return
    setLoading(true)
    setResult(null)
    setAccepted(false)

    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, contentItemId }),
    })
    const data: EvalResponse = await res.json()
    setResult(data)
    setLoading(false)

    if (data.signalLevel === 'high') {
      setAccepted(true)
      setComment('')
      onHighSignal()
    }
  }

  function useChip(chip: string) {
    setComment(chip + ' ')
    setResult(null)
  }

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="relative">
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            if (result) setResult(null)
          }}
          placeholder={`What's your response to ${blueprint.vibe_state.emotional_context} content like this?`}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!comment.trim() || loading}
          className="absolute bottom-3 right-3 px-4 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors"
        >
          {loading ? '...' : 'Submit'}
        </button>
      </div>

      {/* High-signal accepted */}
      {accepted && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <span className="text-lg">✓</span>
          <div>
            <p className="font-semibold">High-signal response accepted</p>
            <p className="text-xs text-green-600 mt-0.5">Added to the creator&apos;s HumaneBench dashboard.</p>
          </div>
        </div>
      )}

      {/* Low-signal + prompt chips */}
      {result?.signalLevel === 'low' && result.promptChips && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg">⚡</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Low-signal submission detected</p>
              <p className="text-xs text-amber-600 mt-0.5">{result.reasoning}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Try one of these instead:</p>
          <div className="flex flex-wrap gap-2">
            {result.promptChips.map((chip) => (
              <button
                key={chip}
                onClick={() => useChip(chip)}
                className="px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global violations */}
      {result && result.globalViolations.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-600 mb-1">Global violations</p>
          {result.globalViolations.map((v, i) => (
            <p key={i} className="text-xs text-red-500">{v}</p>
          ))}
        </div>
      )}

      {/* 8-principle HumaneBench breakdown */}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              HumaneBench v3.0 — 8 Principles
            </p>
            <span className="text-xs text-slate-400">
              confidence {Math.round(result.confidence * 100)}%
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {result.principles.map((p) => (
              <div
                key={p.name}
                title={p.rationale ?? PRINCIPLE_LABELS[p.name]}
                className={`rounded-lg border px-2 py-1.5 ${scoreBg(p.score)}`}
              >
                <p className="text-[10px] text-slate-500 leading-tight truncate">
                  {PRINCIPLE_LABELS[p.name] ?? p.name}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${scoreColor(p.score)}`}>
                  {p.score > 0 ? '+' : ''}{p.score.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
          {/* Rationales for violations */}
          {result.principles.filter(p => p.score <= -0.5 && p.rationale).map((p) => (
            <p key={p.name} className="text-xs text-red-500 mt-1.5">
              <span className="font-medium">{PRINCIPLE_LABELS[p.name]}:</span> {p.rationale}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
