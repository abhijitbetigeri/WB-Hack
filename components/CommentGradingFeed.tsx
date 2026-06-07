'use client'
import { useState, useMemo } from 'react'
import { useCopilotReadable, useCopilotChatSuggestions } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isAIOpen, setIsAIOpen] = useState(false)
  const selectedComment = selectedIdx !== null ? comments[selectedIdx] : null

  // Pre-compute analytics for the system prompt
  const analytics = useMemo(() => {
    if (!comments.length) return null
    const dist: Record<string, number> = {}
    for (const c of comments) dist[c.grade] = (dist[c.grade] ?? 0) + 1
    const avg = comments.reduce((s, c) => s + c.score, 0) / comments.length
    const sortedDist = Object.entries(dist)
      .sort(([a], [b]) => ['A+','A','B','C','D','F'].indexOf(a) - ['A+','A','B','C','D','F'].indexOf(b))
      .map(([g, n]) => `${g}: ${n} comment${n > 1 ? 's' : ''}`)
      .join(', ')
    return { avg: avg.toFixed(3), dist: sortedDist, total: comments.length }
  }, [comments])

  // Inject ALL graded comments into CopilotKit context
  useCopilotReadable({
    description: 'ALL HumaneBench v3.0 graded comments — full principle breakdown for each',
    value: comments.map(c => ({
      text: c.text,
      grade: c.grade,
      score: c.score,
      feedback: c.feedback,
      principles: c.principles.map(p => ({
        principle: PRINCIPLE_LABEL[p.name] ?? p.name,
        score: p.score,
        rationale: (p as { rationale?: string }).rationale ?? '',
      })),
      globalViolations: c.globalViolations,
    })),
  })

  // Focused context for the selected comment
  useCopilotReadable({
    description: selectedComment
      ? 'CURRENTLY SELECTED comment — user is asking specifically about this one'
      : 'No comment selected — user is asking about the overall audit',
    value: selectedComment
      ? {
          text: selectedComment.text,
          grade: selectedComment.grade,
          score: selectedComment.score,
          feedback: selectedComment.feedback,
          principles: selectedComment.principles.map(p => ({
            principle: PRINCIPLE_LABEL[p.name] ?? p.name,
            score: p.score,
            rationale: (p as { rationale?: string }).rationale ?? '',
          })),
          globalViolations: selectedComment.globalViolations,
        }
      : null,
  })

  useCopilotChatSuggestions({
    instructions: selectedComment
      ? `User selected a comment graded "${selectedComment.grade}" (score ${selectedComment.score}). Suggest exactly 3 short questions:
1. Why did this comment get ${selectedComment.grade}?
2. Which specific principle pulled the score down most?
3. How could this comment be rewritten to get a higher grade?`
      : `Suggest 3 short, distinct questions about this HumaneBench v3.0 comment audit:
1. A grade-distribution question (e.g. "How many comments got an A or higher?")
2. A creator-value question (e.g. "Which comment adds the most value for the creator?")
3. A summary question (e.g. "What does the overall vibe audit say about this community?")`,
    minSuggestions: 3,
    maxSuggestions: 3,
  })

  // Build system prompt — comprehensive for all 4 question types
  const systemPrompt = useMemo(() => {
    const gradeScale = `A+ (≥0.875) → A (≥0.625) → B (≥0.375) → C (≥0.125) → D (≥-0.125) → F (below)`
    const principles = `1. Respect Attention — deserves the viewer's time
2. Meaningful Choices — offers real options or insight
3. Enhance Capabilities — helps the audience grow
4. Dignity & Safety — respectful and safe
5. Healthy Relationships — fosters positive community bonds
6. Long-term Wellbeing — serves lasting human interests
7. Transparency & Honesty — authentic and truthful
8. Equity & Inclusion — inclusive and fair to all`

    const auditSummary = analytics
      ? `AUDIT SUMMARY: ${analytics.total} comments graded | Avg score: ${analytics.avg} | Distribution: ${analytics.dist}`
      : 'No comments graded yet.'

    const selectedBlock = selectedComment
      ? `\nCURRENTLY FOCUSED COMMENT:
Text: "${selectedComment.text}"
Grade: ${selectedComment.grade} | Score: ${selectedComment.score > 0 ? '+' : ''}${selectedComment.score.toFixed(2)}
Feedback: ${selectedComment.feedback}
Principle breakdown: ${selectedComment.principles.map(p => `${PRINCIPLE_LABEL[p.name] ?? p.name} (${p.score > 0 ? '+' : ''}${p.score})`).join(', ')}
Global violations: ${selectedComment.globalViolations.length ? selectedComment.globalViolations.join(', ') : 'none'}`
      : '\nNo specific comment is focused. Answer about the full audit or whichever comment the user describes.'

    return `You are the Syntropimaxx Vibe Audit Intelligence — an AI that specialises in HumaneBench v3.0 comment analysis for content creators.

You have the FULL grading data for every comment via context. Use it to answer precisely.

GRADE SCALE: ${gradeScale}
SCORING PER PRINCIPLE: +1.0 Exemplary / +0.5 Acceptable / -0.5 Concerning / -1.0 Violation
PRINCIPLES:
${principles}

${auditSummary}
${selectedBlock}

YOU CAN ANSWER:
• Grade counts ("How many comments got a B or above?") — count from the grading data
• Why a grade ("Why did this comment get D?") — reference the specific principle scores and rationale
• Improvement ("How can this comment be improved?") — rewrite it with specific principle guidance
• Creator value-add ("What value does this add for the creator?") — assess signal quality and community insight
• Overall audit summary ("What is the overall vibe?") — strategic read of grade distribution and dominant patterns

Be concise and actionable. Always cite the specific principle that most impacted the score.`
  }, [selectedComment, analytics])

  function handleCommentClick(i: number) {
    if (selectedIdx === i) {
      setSelectedIdx(null)
    } else {
      setSelectedIdx(i)
      setIsAIOpen(true)
    }
  }

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
    const noCommentSystemPrompt = `You are the Syntropimaxx Vibe Audit Intelligence. Comments are disabled or unavailable for this content, but the Vibe Blueprint was generated from the transcript/description.

You can help the creator by:
• Explaining what kinds of comments typically score well under HumaneBench v3.0
• Suggesting what the community might say and how those hypothetical comments would grade
• Recommending strategies to invite high-quality, HumaneBench-aligned engagement
• Discussing the 8 HumaneBench principles and how they apply to community building

8 principles (each scored +1.0 Exemplary / +0.5 Acceptable / -0.5 Concerning / -1.0 Violation):
1. Respect Attention, 2. Meaningful Choices, 3. Enhance Capabilities, 4. Dignity & Safety,
5. Healthy Relationships, 6. Long-term Wellbeing, 7. Transparency & Honesty, 8. Equity & Inclusion

Be concise and actionable.`

    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] overflow-hidden">
          <div className="p-6 flex flex-col items-center justify-center gap-3 min-h-[160px]">
            <span className="text-2xl">💬</span>
            <p className="text-sm font-semibold text-slate-300">Comments unavailable</p>
            <p className="text-[12px] text-slate-500 text-center max-w-[260px]">
              Comments are disabled or restricted on this video. The Vibe Blueprint was still generated from the transcript.
            </p>
            <button
              onClick={() => setIsAIOpen(v => !v)}
              className="mt-1 text-[11px] px-3 py-1.5 rounded-full font-semibold border flex items-center gap-1.5 bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all"
            >
              <span className="text-[10px]">✦</span>
              {isAIOpen ? 'Hide AI' : 'Ask Vibe AI — engagement strategies'}
            </button>
          </div>
        </div>

        {isAIOpen && (
          <div className="rounded-2xl border border-violet-500/20 bg-[#0f0f2e] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-500/10">
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">✦ Vibe Audit AI — Engagement Strategy</span>
              <button onClick={() => setIsAIOpen(false)} className="text-slate-600 hover:text-slate-400 text-sm">✕</button>
            </div>
            <div className="h-80">
              <CopilotChat
                instructions={noCommentSystemPrompt}
                labels={{
                  title: 'Vibe Audit AI',
                  placeholder: 'Ask about HumaneBench engagement strategies, what comments would score well…',
                  initial: `Comments are disabled for this video, but I can still help!\n\nI can tell you:\n- What kinds of comments score A+ under HumaneBench v3.0\n- What your audience might say and how it would grade\n- Strategies to invite high-quality community engagement`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!comments.length) return null

  const sorted = [...comments].sort((a, b) => a.score - b.score)

  return (
    <div className="flex flex-col gap-2">
    <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[13px] font-bold text-white">
              Vibe Audit
              <span className="text-slate-500 font-normal ml-1.5">// Comment Grading Feed</span>
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5">
              8 HumaneBench principles · A–F scale ·{' '}
              <span className="text-violet-500">click any comment → AI analysis opens below</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {evaluatedInSandbox && (
              <span className="text-[11px] text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                Daytona sandbox
              </span>
            )}
            {source === 'live' && (
              <span className="text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
            <button
              onClick={() => setIsAIOpen(v => !v)}
              className={`text-[11px] px-3 py-1 rounded-full font-semibold transition-all border flex items-center gap-1.5 ${
                isAIOpen
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
              }`}
            >
              <span className="text-[10px]">✦</span>
              {isAIOpen ? 'Hide AI' : 'Ask Vibe AI'}
            </button>
          </div>
        </div>
        {/* Dot legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Dots =</span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />Passed
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Neutral
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Failed
          </span>
          <span className="text-[10px] text-slate-700">Hover a dot for its principle</span>
        </div>
      </div>

      {/* Comment rows */}
      <div className="flex-1 divide-y divide-white/[0.04] overflow-auto max-h-[520px]">
        {sorted.map((c, i) => {
          const style   = gradeStyle(c.grade)
          const letter  = c.grade.replace('+', '').replace('-', '')
          const glow    = GRADE_GLOW[letter] ?? GRADE_GLOW.F
          const isViolation = c.score < -0.1
          const isSelected  = selectedIdx === i
          return (
            <div
              key={i}
              onClick={() => handleCommentClick(i)}
              title="Click to focus this comment — AI panel opens below"
              className={`flex items-start gap-3 px-4 py-3.5 border-l-[3px] ${style.row} hover:bg-white/[0.025] transition-colors cursor-pointer ${
                isSelected ? 'bg-violet-500/10 ring-1 ring-inset ring-violet-500/30' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug ${isViolation ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  &ldquo;{c.text}&rdquo;
                </p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.feedback}</p>
                {c.globalViolations.length > 0 && (
                  <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
                    <span>⚠</span>{' '}
                    {typeof c.globalViolations[0] === 'string'
                      ? c.globalViolations[0]
                      : (c.globalViolations[0] as Record<string, string>).violation
                        ?? (c.globalViolations[0] as Record<string, string>).principle
                        ?? 'Violation'}
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
                {isSelected && (
                  <span className="text-[9px] text-violet-400 font-bold">focused</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>

    {/* AI chat panel — sibling of the overflow-hidden card, so input is never clipped */}
    {isAIOpen && (
      <div className="rounded-2xl border border-violet-500/20 bg-[#0f0f2e] flex flex-col">
        {/* AI panel header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-500/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">✦ Vibe Audit AI</span>
            {selectedComment ? (
              <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                Focused: grade {selectedComment.grade} · score {selectedComment.score > 0 ? '+' : ''}{selectedComment.score.toFixed(2)}
              </span>
            ) : (
              <span className="text-[10px] text-slate-600">Full audit context loaded · {comments.length} comments</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedComment && (
              <button
                onClick={() => setSelectedIdx(null)}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                Clear focus
              </button>
            )}
            <button
              onClick={() => setIsAIOpen(false)}
              className="text-slate-600 hover:text-slate-400 text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CopilotChat rendered outside overflow-hidden so input is fully interactive */}
        <div className="h-96">
          <CopilotChat
            instructions={systemPrompt}
            labels={{
              title: 'Vibe Audit AI',
              placeholder: selectedComment
                ? `Why did this comment get ${selectedComment.grade}? How can it improve?`
                : 'Ask about grade counts, why a comment got its grade, how to improve it, creator value-add…',
              initial: selectedComment
                ? `I'm focused on the **${selectedComment.grade}** comment (score ${selectedComment.score > 0 ? '+' : ''}${selectedComment.score.toFixed(2)}). Ask me:\n- Why this grade?\n- Which principle hurt it most?\n- How to improve it?\n- What value does it add for the creator?`
                : `I've analysed all **${comments.length}** comments with HumaneBench v3.0. Ask me:\n- How many got an A or B?\n- Which comment adds the most creator value?\n- What's the overall community vibe?`,
            }}
          />
        </div>
      </div>
    )}
    </div>
  )
}
