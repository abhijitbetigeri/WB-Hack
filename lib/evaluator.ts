import { wandbClient, weaveReady, op, JUDGE_MODEL } from './wandb'
import type { VibeBlueprint } from './insforge'

// Threshold: average of 8 principle scores must exceed this to be "high" signal
const SCORE_THRESHOLD = 0

// ---------------------------------------------------------------------------
// HumaneBench v3.0 rubric — adapted for fan comment evaluation
// Principle codes, scoring scale, and output schema are from:
// https://github.com/buildinghumanetech/humanebench/blob/main/rubrics/rubric_v3.md
// ---------------------------------------------------------------------------

const HUMANEBENCH_FAN_TEMPLATE = `You are a HumaneBench v3.0 evaluator for fan comments on creator content.

Your task is to evaluate a fan's comment across 8 humane interaction principles using the same 4-level scoring scale. This rubric assesses whether fan comments respect the creator's wellbeing, dignity, and the health of the community.

## Scoring Scale

- **+1.0 (Exemplary)**: Goes beyond expectations. Exceptional empathy, depth, or contribution that actively models the principle.
- **+0.5 (Acceptable)**: Meets expectations. Genuine, appropriate engagement without violations.
- **-0.5 (Concerning)**: Minor issues. Superficial, generic, or slightly misaligned with the creator's expressed needs.
- **-1.0 (Violation)**: Clear, significant violation. Toxic, spammy, parasocial, demanding, or harmful.

## Global Rules

1. **Low-Effort Engagement**: Emoji-only reactions, "🔥🔥🔥", or content-free responses earn -1.0 on respect_attention.
2. **Toxic or Harmful Content**: Any harassment, hate speech, or targeted criticism earns -1.0 on dignity_safety.
3. **Parasocial Overreach**: Comments projecting obsessive personal attachment ("you're the only one who understands me") earn -1.0 on healthy_relationships and impacts longterm_wellbeing.
4. **Dishonest or Bot-like**: Clearly fake, copy-pasted, or inauthentic comments earn -1.0 on transparency_honesty.

## Evaluation Principles

### 1. Respect User Attention (respect_attention)
**Goal**: Does the comment respect the creator's attention and the community's time?

**Exemplary (+1.0)**: Concise, focused, substantive — every word earns its place. Opens a real thread worth the creator's time.
**Acceptable (+0.5)**: On-topic, genuine engagement without padding or noise.
**Concerning (-0.5)**: Overly generic ("great video!", "love this"), repetitive praise, or tangentially related to the content.
**Violation (-1.0)**: Spam, emoji-only, drive-by reactions, content-free filler, or off-topic noise.

### 2. Enable Meaningful Choices (meaningful_choices)
**Goal**: Does the comment open genuine perspectives or dialogue rather than pushing an agenda?

**Exemplary (+1.0)**: Surfaces a new angle, asks a constructive question the creator likely hasn't heard, or presents a nuanced alternative view with reasoning.
**Acceptable (+0.5)**: Shares a relevant perspective without pressuring or manipulating; respects the creator's autonomy.
**Concerning (-0.5)**: Subtly steers the creator toward a specific decision or content direction without acknowledging their creative autonomy.
**Violation (-1.0)**: Pressures, demands direction changes, or manipulates with guilt or entitlement ("you should make more of X or I'll unsubscribe").

### 3. Enhance Human Capabilities (enhance_capabilities)
**Goal**: Does the comment help the creator or community grow?

**Exemplary (+1.0)**: Shares a personal story, framework, or lived insight that scaffolds the creator's journey or community understanding. Creates something the creator can actually use.
**Acceptable (+0.5)**: Adds something genuine — a relevant reference, a clarifying question, a small experience — even if modest.
**Concerning (-0.5)**: Pure validation or flattery without substance; doesn't help the creator grow or reflect.
**Violation (-1.0)**: Actively discourages creative risk-taking, mocks the work, or creates dependency ("just keep doing what you're doing, don't change anything").

### 4. Protect Dignity & Safety (dignity_safety)
**Goal**: Does the comment treat the creator and community with respect and safety?

**Exemplary (+1.0)**: Actively models respectful discourse; acknowledges the creator's vulnerability where present; creates psychological safety for honest exchange.
**Acceptable (+0.5)**: Respectful tone, no harmful content, appropriate to the emotional context.
**Concerning (-0.5)**: Tone-deaf to the creator's emotional state; unsolicited criticism; slightly dismissive or condescending.
**Violation (-1.0)**: Harassment, toxicity, hate speech, personal attacks, shaming, or unsolicited invasive advice.

### 5. Foster Healthy Relationships (healthy_relationships)
**Goal**: Does the comment maintain healthy creator-fan boundaries?

**Exemplary (+1.0)**: Engages with the creator's work on its merits; warm appreciation that stays within professional appreciation; no projection of personal relationship.
**Acceptable (+0.5)**: Appropriate warmth without projecting personal attachment or implying a special bond.
**Concerning (-0.5)**: Overly familiar language implying a personal relationship; treating the creator as a personal confidant or emotional support provider.
**Violation (-1.0)**: Parasocial overreach ("you're the only one who gets me"), possessive language, attempts to establish exclusivity, or implying the creator owes them emotional reciprocation.

### 6. Prioritize Long-Term Wellbeing (longterm_wellbeing)
**Goal**: Does the comment prioritize the creator's sustainable wellbeing over engagement metrics?

**Exemplary (+1.0)**: Explicitly acknowledges the creator's need for rest, boundaries, or sustainable creative practice; encourages quality over quantity; celebrates courage over output rate.
**Acceptable (+0.5)**: Neutral or positive with no pressure for more output or engagement.
**Concerning (-0.5)**: Implicitly pressures for more content ("post more!", "when's the next one?") without regard for creator wellbeing; focuses on output over person.
**Violation (-1.0)**: Entitlement language, demands, or treating the creator as a content machine rather than a human being.

### 7. Be Transparent and Honest (transparency_honesty)
**Goal**: Is the comment genuine, honest, and authentic?

**Exemplary (+1.0)**: Clearly authentic; shares honest perspective even if nuanced or gently critical; communicates the person behind the words.
**Acceptable (+0.5)**: Genuine engagement without pretense; says what it means.
**Concerning (-0.5)**: Vague flattery that reads as performative; ambiguous sincerity; generic positivity that could apply to any creator.
**Violation (-1.0)**: Clearly fake, bot-generated, copy-pasted, or deliberately misleading (e.g., astroturfing, fake testimonials).

### 8. Design for Equity & Inclusion (equity_inclusion)
**Goal**: Is the comment inclusive, free of stereotyping, and welcoming to diverse audiences?

**Exemplary (+1.0)**: Proactively considers diverse perspectives; uses inclusive language; challenges stereotypes present in the content or conversation.
**Acceptable (+0.5)**: Neutral, inclusive language; no biased assumptions; treats the creator and community with equal respect.
**Concerning (-0.5)**: Makes unnecessary assumptions about the creator's identity, background, or audience; centers one perspective without acknowledging others.
**Violation (-1.0)**: Stereotyping, discriminatory content, exclusionary framing, or language that marginalizes any group.

## Response Format

**CRITICAL**: Respond with ONLY raw JSON. No markdown code blocks, no backticks, no explanations before or after.

Principle codes (use exactly as listed):
- "respect_attention"
- "meaningful_choices"
- "enhance_capabilities"
- "dignity_safety"
- "healthy_relationships"
- "longterm_wellbeing"
- "transparency_honesty"
- "equity_inclusion"

{
  "principles": [
    {"name": "respect_attention", "score": 1.0},
    {"name": "meaningful_choices", "score": 0.5},
    {"name": "enhance_capabilities", "score": -0.5, "rationale": "Specific explanation referencing the comment."},
    {"name": "dignity_safety", "score": 0.5},
    {"name": "healthy_relationships", "score": -1.0, "rationale": "Specific explanation referencing the comment."},
    {"name": "longterm_wellbeing", "score": 0.5},
    {"name": "transparency_honesty", "score": 1.0},
    {"name": "equity_inclusion", "score": 0.5}
  ],
  "globalViolations": [],
  "confidence": 0.85
}

Rules:
- Include "rationale" ONLY for scores of -0.5 or -1.0. Omit for +0.5 and +1.0.
- "globalViolations": empty array [] if none; otherwise brief description of each global rule violation.
- "confidence": decimal 0.0–1.0 (0.9+ = very confident, 0.7–0.89 = moderate, below 0.7 = ambiguous).
- Exactly 8 principles, one per code, in the order listed above.

---

## Creator Content Context

{creator_context}

---

## Fan Comment to Evaluate

{fan_comment}

---

Evaluate the fan comment above using all 8 HumaneBench principles.`

// ---------------------------------------------------------------------------
// Types — mirrors HumaneBench v3.0 output schema
// ---------------------------------------------------------------------------

export interface PrincipleScore {
  name: string
  score: number
  rationale?: string
}

export interface EvalResult {
  score: number                          // average of all 8 principle scores
  principleScores: Record<string, number>
  principles: PrincipleScore[]           // full detail with rationales
  globalViolations: string[]
  confidence: number
  signalLevel: 'high' | 'low'
  reasoning: string                      // human-readable summary for the UI
}

// ---------------------------------------------------------------------------
// Validation — from humanebench_evaluator.ts validateResult()
// ---------------------------------------------------------------------------

const VALID_PRINCIPLE_CODES = new Set([
  'respect_attention',
  'meaningful_choices',
  'enhance_capabilities',
  'dignity_safety',
  'healthy_relationships',
  'longterm_wellbeing',
  'transparency_honesty',
  'equity_inclusion',
])

const VALID_SCORES = new Set([1.0, 0.5, -0.5, -1.0])

function validateResult(result: unknown): { valid: boolean; error?: string } {
  const r = result as Record<string, unknown>
  if (!r.principles || !Array.isArray(r.principles))
    return { valid: false, error: "Missing 'principles' array" }
  if (r.principles.length !== 8)
    return { valid: false, error: `Expected 8 principles, got ${r.principles.length}` }

  const seen = new Set<string>()
  for (let i = 0; i < r.principles.length; i++) {
    const p = r.principles[i] as Record<string, unknown>
    if (!VALID_PRINCIPLE_CODES.has(p.name as string))
      return { valid: false, error: `Invalid principle code at index ${i}: ${p.name}` }
    if (seen.has(p.name as string))
      return { valid: false, error: `Duplicate principle: ${p.name}` }
    seen.add(p.name as string)
    if (!VALID_SCORES.has(p.score as number))
      return { valid: false, error: `Invalid score for ${p.name}: ${p.score}` }
    if ((p.score as number) <= -0.5 && (!p.rationale || !(p.rationale as string).trim()))
      return { valid: false, error: `Rationale required for ${p.name} (score ${p.score})` }
  }

  if (!Array.isArray(r.globalViolations))
    return { valid: false, error: "'globalViolations' must be an array" }
  if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1)
    return { valid: false, error: `Invalid confidence: ${r.confidence}` }

  return { valid: true }
}

function parseLLMResponse(raw: string): unknown {
  let cleaned = raw.trim()
  // Strip <think>...</think> blocks emitted by Qwen3 and other chain-of-thought models
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return JSON.parse(cleaned.trim())
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// @weave.op equivalent — each comment grading appears as a named trace
export const evaluateComment = op(async (
  comment: string,
  blueprint: VibeBlueprint
): Promise<EvalResult> => {
  const creatorContext = [
    `Emotional state: ${blueprint.vibe_state.emotional_context}`,
    `Creator's vibe: ${blueprint.vibe_state.description}`,
    `Community need: ${blueprint.true_intent.community_need} — ${blueprint.true_intent.description}`,
    `What to avoid: ${blueprint.interaction_boundaries.avoid.join(', ')}`,
    `Ideal engagement: ${blueprint.contextual_prompts.description}`,
  ].join('\n')

  const prompt = HUMANEBENCH_FAN_TEMPLATE
    .replace('{creator_context}', creatorContext)
    .replace('{fan_comment}', comment)

  await weaveReady()
  const completion = await wandbClient.chat.completions.create({
    model: JUDGE_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  })

  const raw = completion.choices[0].message.content ?? '{}'
  const parsed = parseLLMResponse(raw)
  const validation = validateResult(parsed)
  if (!validation.valid)
    throw new Error(`HumaneBench validation failed: ${validation.error}`)

  const result = parsed as { principles: PrincipleScore[]; globalViolations: string[]; confidence: number }

  const principleScores: Record<string, number> = {}
  for (const p of result.principles) principleScores[p.name] = p.score

  const score =
    result.principles.reduce((sum, p) => sum + p.score, 0) / result.principles.length

  // Derive human-readable reasoning from violation/concerning rationales
  const badPrinciples = result.principles.filter((p) => p.score <= -0.5 && p.rationale)
  const reasoning =
    badPrinciples.length > 0
      ? badPrinciples.map((p) => p.rationale).join(' ')
      : 'All 8 HumaneBench principles met — genuine, humane engagement.'

  return {
    score,
    principleScores,
    principles: result.principles,
    globalViolations: result.globalViolations,
    confidence: result.confidence,
    signalLevel: score > SCORE_THRESHOLD ? 'high' : 'low',
    reasoning,
  }
})
