import type { PrincipleScore } from './evaluator'

export interface GradedComment {
  text: string
  grade: string
  score: number
  principleScores: Record<string, number>
  principles: PrincipleScore[]
  globalViolations: string[]
  confidence: number
  feedback: string
}

export interface AuditAnalytics {
  totalGraded: number
  avgScore: number
  communityAlignmentPct: number  // maps -1..+1 score to 0..100%
  tierDepth: string               // grade at 50th percentile
  depthVectorPct: number          // % of B-grade-and-above comments
  gradeDistribution: Record<string, number>
}

// Maps HumaneBench avg score (-1..+1) to letter grade
export function scoreToGrade(score: number): string {
  if (score >= 0.875) return 'A+'
  if (score >= 0.75)  return 'A'
  if (score >= 0.625) return 'B+'
  if (score >= 0.5)   return 'B'
  if (score >= 0.375) return 'C+'
  if (score >= 0.2)   return 'C'
  if (score >= 0.05)  return 'C-'
  if (score >= -0.1)  return 'D'
  return 'F'
}

export function gradeStyle(grade: string): { badge: string; row: string; dot: string } {
  const g = grade.replace('+', '').replace('-', '')
  if (g === 'A') return { badge: 'bg-green-500 text-white',  row: 'border-l-green-500',  dot: 'bg-green-500' }
  if (g === 'B') return { badge: 'bg-sky-500 text-white',    row: 'border-l-sky-500',    dot: 'bg-sky-500' }
  if (g === 'C') return { badge: 'bg-amber-500 text-white',  row: 'border-l-amber-500',  dot: 'bg-amber-500' }
  if (g === 'D') return { badge: 'bg-orange-600 text-white', row: 'border-l-orange-600', dot: 'bg-orange-600' }
  return             { badge: 'bg-red-600 text-white',       row: 'border-l-red-600',    dot: 'bg-red-600' }
}

const PRINCIPLE_LABELS: Record<string, string> = {
  respect_attention:    'Attention',
  meaningful_choices:   'Choices',
  enhance_capabilities: 'Growth',
  dignity_safety:       'Safety',
  healthy_relationships:'Boundaries',
  longterm_wellbeing:   'Wellbeing',
  transparency_honesty: 'Honesty',
  equity_inclusion:     'Inclusion',
}

// Derives human-readable feedback from the evaluation — no extra LLM call needed
export function generateFeedback(
  grade: string,
  principles: PrincipleScore[],
  globalViolations: string[]
): string {
  const violations = principles.filter((p) => p.score <= -0.5 && p.rationale)
  const strengths  = principles.filter((p) => p.score >= 0.75)

  if (grade.startsWith('A')) {
    const strong = strengths.slice(0, 2).map((p) => PRINCIPLE_LABELS[p.name] ?? p.name).join(' & ')
    return `Exemplary on ${strong}. This comment advances creator wellbeing and is exactly the kind of engagement worth amplifying.`
  }

  if (grade.startsWith('B')) {
    const strong = strengths.length ? `Solid on ${PRINCIPLE_LABELS[strengths[0].name]}. ` : ''
    const tip = violations.length
      ? `To reach A: ${violations[0].rationale}`
      : 'Add a personal story or specific insight to push into A territory.'
    return strong + tip
  }

  if (grade.startsWith('C')) {
    const issue = violations.length
      ? violations[0].rationale!
      : 'Generic engagement detected — could apply to any creator.'
    return `${issue} Share a specific personal experience tied to this content to lift to B+.`
  }

  if (grade === 'D') {
    return (
      violations.map((p) => p.rationale).filter(Boolean).join(' ') ||
      'Low signal. Lacks depth and misses the creator\'s expressed needs.'
    )
  }

  // F
  const reason = violations[0]?.rationale ?? globalViolations[0] ?? 'Significant violations of humane interaction principles.'
  return `[Violation] ${reason} This comment type actively harms creator wellbeing and community quality.`
}

export function computeAnalytics(comments: GradedComment[]): AuditAnalytics {
  const n = comments.length
  if (n === 0) {
    return { totalGraded: 0, avgScore: 0, communityAlignmentPct: 50, tierDepth: 'N/A', depthVectorPct: 0, gradeDistribution: {} }
  }

  const scores = comments.map((c) => c.score).sort((a, b) => a - b)
  const avgScore = scores.reduce((s, v) => s + v, 0) / n
  const communityAlignmentPct = Math.round(((avgScore + 1) / 2) * 100)

  const median = scores[Math.floor(n / 2)]
  const tierDepth = scoreToGrade(median)

  const highTierCount = comments.filter((c) => c.score >= 0.5).length
  const depthVectorPct = Math.round((highTierCount / n) * 100)

  const gradeDistribution: Record<string, number> = {}
  for (const c of comments) {
    gradeDistribution[c.grade] = (gradeDistribution[c.grade] ?? 0) + 1
  }

  return { totalGraded: n, avgScore, communityAlignmentPct, tierDepth, depthVectorPct, gradeDistribution }
}

// Representative demo comments per platform — used only for the explicit demo path
// (when a user clicks a pre-loaded demo, not when grading a live URL).
export const DEMO_COMMENTS: Record<'youtube' | 'x', string[]> = {
  youtube: [
    'Change your thumbnail contrast ratio to increase your CTR. Growth hack 101.',
    'Wow, icon! 🔥',
    'I hit this exact wall last year. I had to completely disconnect on weekends to survive. Your courage naming this out loud matters.',
    'Post more consistently bro, consistency is the only thing the algorithm rewards.',
    'This really resonated. I deleted a whole year of design work once because I thought none of it was good enough.',
    'What camera do you use? Trying to grow my own channel.',
    'Thank you for being honest about the cost nobody talks about. You didn\'t have to share this.',
    'If you\'re feeling burnt out maybe content creation isn\'t for you 🤷',
  ],
  x: [
    'Ship faster, the market waits for no one',
    'Real talk. The vulnerability in this thread is rare. Most founders perform confidence.',
    'What\'s your MRR? That\'s all that matters at the end of the day',
    'I\'ve been building in public for 8 months and the anxiety never fully goes away. You\'re not alone in this.',
    'Follow for follow? Let\'s collab!',
    'Metrics are everything, get with it or get left behind',
    'This is exactly why I stopped sharing my journey publicly — the pressure became unbearable.',
    'Have you tried the Pomodoro technique? It fixed my focus problems completely.',
  ],
}
