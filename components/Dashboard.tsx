'use client'
import { useEffect, useState, useCallback } from 'react'
import type { Comment } from '@/lib/insforge'

interface Stats {
  totalAccepted: number
  avgCommunityContributionScore: number
}

interface Props {
  contentItemId: string
  refreshTrigger: number
}

export default function Dashboard({ contentItemId, refreshTrigger }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/comments?contentItemId=${contentItemId}`)
    if (!res.ok) return
    const data = await res.json()
    setComments(data.comments ?? [])
    setStats(data.stats)
    setLoading(false)
  }, [contentItemId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments, refreshTrigger])

  const scoreColor = (score: number) =>
    score >= 0.5 ? 'text-green-600' : score >= 0 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 px-4 py-3">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
            High-Signal Responses
          </p>
          <p className="text-2xl font-bold text-violet-700 mt-1">
            {loading ? '—' : stats?.totalAccepted ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 px-4 py-3">
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
            Avg Contribution Score
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {loading ? '—' : stats ? `${stats.avgCommunityContributionScore.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Comment list */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">True Audience Sentiment</h3>
          <span className="text-xs text-slate-400">HumaneBench scored</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No high-signal responses yet. Submit a meaningful comment above.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {comments.map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-relaxed">{c.raw_text}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(c.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-sm font-bold ${scoreColor(c.humane_score)}`}>
                    {c.humane_score > 0 ? '+' : ''}{c.humane_score.toFixed(2)}
                  </span>
                  <p className="text-xs text-slate-400">CCS</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
