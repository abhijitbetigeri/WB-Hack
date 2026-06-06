'use client'
import type { AuditAnalytics } from '@/lib/grader'
import { gradeStyle } from '@/lib/grader'

const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'C-', 'D', 'F']

interface Props {
  analytics: AuditAnalytics
  creatorHandle: string
}

function Stat({
  label, value, sub, trend, accent,
}: {
  label: string; value: string; sub: string; trend?: string; accent: string
}) {
  return (
    <div className={`relative rounded-xl border p-5 overflow-hidden ${accent}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-black text-white leading-none mb-1">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
      {trend && (
        <span className="absolute top-4 right-4 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      )}
    </div>
  )
}

export default function VibeReport({ analytics, creatorHandle }: Props) {
  const { communityAlignmentPct, tierDepth, depthVectorPct, gradeDistribution, totalGraded } = analytics

  const alignmentLabel =
    communityAlignmentPct >= 75 ? 'Positive Growth Signal' :
    communityAlignmentPct >= 50 ? 'Neutral Engagement' : 'High Toxicity Risk'

  const depthLabel =
    depthVectorPct >= 60 ? 'High Engagement Depth' :
    depthVectorPct >= 30 ? 'Mixed Signal Quality' : 'Low Signal Ratio'

  const alignmentTrend =
    communityAlignmentPct >= 75 ? '↑ Healthy' :
    communityAlignmentPct >= 50 ? '→ Neutral' : '↓ Risk'

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-white">
            Monetizable Retention State
            <span className="text-slate-500 font-normal ml-1.5">// Vibe Report</span>
          </h3>
          <p className="text-[11px] text-slate-600 mt-0.5">{creatorHandle} · {totalGraded} comments graded</p>
        </div>
        <div className="text-[11px] text-violet-400 bg-violet-400/10 border border-violet-400/20 px-3 py-1 rounded-full font-medium">
          HumaneBench v3.0
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="True Audience Sentiment"
            value={`${communityAlignmentPct}%`}
            sub={alignmentLabel}
            trend={alignmentTrend}
            accent="border-white/[0.10] bg-white/[0.05]"
          />
          <Stat
            label="Community Tier Depth"
            value={tierDepth}
            sub="Median grade (50th percentile)"
            accent="border-white/[0.10] bg-white/[0.05]"
          />
          <Stat
            label="High-Signal Ratio"
            value={`${depthVectorPct}%`}
            sub={depthLabel}
            accent="border-white/[0.10] bg-white/[0.05]"
          />
        </div>

        {/* Grade distribution */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Grade Distribution</p>
          <div className="flex gap-0.5 h-9 rounded-xl overflow-hidden">
            {GRADE_ORDER.map((grade) => {
              const count = gradeDistribution[grade] ?? 0
              if (count === 0) return null
              const pct = Math.round((count / totalGraded) * 100)
              const style = gradeStyle(grade)
              return (
                <div
                  key={grade}
                  title={`${grade}: ${count} comments (${pct}%)`}
                  className={`flex items-center justify-center text-[10px] font-black text-white ${style.badge.replace('text-white', '')} transition-all`}
                  style={{ width: `${pct}%`, minWidth: pct > 0 ? '28px' : '0' }}
                >
                  {pct >= 8 ? grade : ''}
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 flex-wrap mt-2.5">
            {GRADE_ORDER.map((grade) => {
              const count = gradeDistribution[grade] ?? 0
              if (count === 0) return null
              const style = gradeStyle(grade)
              const pct = Math.round((count / totalGraded) * 100)
              return (
                <span key={grade} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`w-2 h-2 rounded-sm ${style.dot}`} />
                  {grade} <span className="text-slate-700">({count}, {pct}%)</span>
                </span>
              )
            })}
          </div>
        </div>

        {/* Recommended action */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <p className="text-[11px] font-bold text-violet-300 uppercase tracking-widest">Recommended Action</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {depthVectorPct >= 50
              ? `${depthVectorPct}% of your audience is delivering high-signal engagement. Pin the A-grade comments to surface genuine community voice and attract similar contributors.`
              : communityAlignmentPct < 50
              ? `Significant low-signal noise detected. Deploy the contextual prompt chips to redirect engagement toward depth — your community wants to connect, they need a frame to do it in.`
              : `Mixed signal quality. Use A-grade comments as pinned responses to shape community norms upward and raise the baseline for new contributors.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}
