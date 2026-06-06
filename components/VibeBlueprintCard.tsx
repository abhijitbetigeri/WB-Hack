'use client'
import type { VibeBlueprint } from '@/lib/insforge'

const PRINCIPLE_LABELS: Record<string, string> = {
  'respect-user-attention': 'Attention',
  'prioritize-long-term-wellbeing': 'Wellbeing',
  'protect-dignity-and-safety': 'Safety',
  'enhance-human-capabilities': 'Growth',
}

const EMOTIONAL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  vulnerable:   { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-400' },
  aspirational: { bg: 'bg-sky-500/10',    text: 'text-sky-300',    dot: 'bg-sky-400' },
  technical:    { bg: 'bg-slate-500/10',  text: 'text-slate-300',  dot: 'bg-slate-400' },
  creative:     { bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-400' },
  exploratory:  { bg: 'bg-emerald-500/10',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  humorous:     { bg: 'bg-amber-500/10',  text: 'text-amber-300',  dot: 'bg-amber-400' },
}

interface Props {
  blueprint: VibeBlueprint
  creatorHandle: string
  platform: 'youtube' | 'x'
}

function Section({ label, principle, children }: { label: string; principle?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        {principle && (
          <span className="text-[10px] text-slate-700 font-medium">· {principle}</span>
        )}
      </div>
      {children}
    </div>
  )
}

export default function VibeBlueprintCard({ blueprint, creatorHandle, platform }: Props) {
  const emotion = EMOTIONAL_COLORS[blueprint.vibe_state.emotional_context] ?? EMOTIONAL_COLORS.technical

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1e2048] overflow-hidden flex flex-col">
      {/* Gradient header */}
      <div className="relative px-5 py-5 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 60%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-violet-200 uppercase tracking-widest mb-1">Vibe Blueprint</p>
            <h2 className="text-lg font-black text-white">{creatorHandle}</h2>
            <p className="text-xs text-violet-300 mt-0.5">HumaneBench content analysis</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white ${platform === 'youtube' ? 'bg-red-500/80' : 'bg-black/60'}`}>
            {platform === 'youtube' ? '▶' : '𝕏'}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 divide-y-0">
        <Section label="Vibe State" principle={PRINCIPLE_LABELS[blueprint.vibe_state.humanebench_principle]}>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${emotion.bg} ${emotion.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${emotion.dot}`} />
              {blueprint.vibe_state.emotional_context}
            </span>
            <p className="text-sm text-slate-400 leading-snug">{blueprint.vibe_state.description}</p>
          </div>
        </Section>

        <Section label="True Intent" principle={PRINCIPLE_LABELS[blueprint.true_intent.humanebench_principle]}>
          <p className="text-sm font-semibold text-slate-200 capitalize mb-0.5">{blueprint.true_intent.community_need}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{blueprint.true_intent.description}</p>
        </Section>

        <Section label="Interaction Boundaries" principle={PRINCIPLE_LABELS[blueprint.interaction_boundaries.humanebench_principle]}>
          <div className="flex flex-wrap gap-1.5">
            {blueprint.interaction_boundaries.avoid.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs">
                ✕ {item}
              </span>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
