'use client'
import { gradeStyle, type GradedComment } from '@/lib/grader'

const PRINCIPLE_LABEL: Record<string, string> = {
  respect_attention:    'Respect Attention',
  meaningful_choices:   'Meaningful Choices',
  enhance_capabilities: 'Enhance Capabilities',
  dignity_safety:       'Dignity & Safety',
  healthy_relationships:'Healthy Relationships',
  longterm_wellbeing:   'Long-term Wellbeing',
  transparency_honesty: 'Transparency & Honesty',
  equity_inclusion:     'Equity & Inclusion',
}

function PrincipleDots({ principles }: { principles: GradedComment['principles'] }) {
  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {principles.map((p) => {
        const color =
          p.score >= 0.5 ? 'bg-emerald-400' :
          p.score >= 0   ? 'bg-amber-400' : 'bg-red-400'
        const label = PRINCIPLE_LABEL[p.name] ?? p.name
        const scoreStr = `${p.score > 0 ? '+' : ''}${p.score}`
        return (
          <span
            key={p.name}
            title={`${label}: ${scoreStr}`}
            className={`w-2.5 h-2.5 rounded-full ${color} cursor-help`}
          />
        )
      })}
    </div>
  )
}

const GRADE_GLOW: Record<string, string> = {
  A: 'shadow-emerald-500/30',
  B: 'shadow-sky-500/30',
  C: 'shadow-amber-500/30',
  D: 'shadow-orange-500/30',
  F: 'shadow-red-500/30',
}

interface Props {
  comments: GradedComment[]
  source?: 'demo' | 'live'
  evaluatedInSandbox?: boolean
  commentsUnavailable?: boolean
  loading?: boolean
}

export default function CommentGradingFeed({ comments, source, evaluatedInSandbox, commentsUnavailable, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Grading with HumaneBench v3.0…</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (commentsUnavailable) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <span className="text-2xl">💬</span>
        <p className="text-sm font-semibold text-slate-300">Comments unavailable</p>
        <p className="text-[12px] text-slate-500 text-center max-w-[260px]">
          Comments are disabled or restricted on this video. The Vibe Blueprint above was still generated from the transcript.
        </p>
      </div>
    )
  }

  if (!comments.length) return null

  const sorted = [...comments].sort((a, b) => a.score - b.score)

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[13px] font-bold text-white">
              Vibe Audit
              <span className="text-slate-500 font-normal ml-1.5">// Comment Grading Feed</span>
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5">8 HumaneBench principles · A–F scale</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {evaluatedInSandbox && (
              <span className="text-[11px] text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                Daytona sandbox
              </span>
            )}
            {source === 'demo' && (
              <span className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full font-medium">
                Example set
              </span>
            )}
            {source === 'live' && (
              <span className="text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live comments
              </span>
            )}
          </div>
        </div>
        {/* Dot legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Dots =</span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Passed (+0.5 / +1.0)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Neutral (0)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Failed (−0.5 / −1.0)
          </span>
          <span className="text-[10px] text-slate-700">Hover a dot for its principle</span>
        </div>
      </div>

      {/* Comment rows */}
      <div className="flex-1 divide-y divide-white/[0.04] overflow-auto max-h-[520px]">
        {sorted.map((c, i) => {
          const style  = gradeStyle(c.grade)
          const letter = c.grade.replace('+', '').replace('-', '')
          const glow   = GRADE_GLOW[letter] ?? GRADE_GLOW.F
          const isViolation = c.score < -0.1
          return (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3.5 border-l-[3px] ${style.row} hover:bg-white/[0.025] transition-colors group`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug ${isViolation ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  &ldquo;{c.text}&rdquo;
                </p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.feedback}</p>
                {c.globalViolations.length > 0 && (
                  <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
                    <span>⚠</span> {c.globalViolations[0]}
                  </p>
                )}
                <PrincipleDots principles={c.principles} />
              </div>

              <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                <span className={`text-[13px] font-black px-2.5 py-1 rounded-lg ${style.badge} min-w-[48px] text-center shadow-lg ${glow}`}>
                  {c.grade}
                </span>
                <span className="text-[10px] text-slate-700 font-mono">
                  {c.score > 0 ? '+' : ''}{c.score.toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
