import type { VibeBlueprint } from './insforge'
import type { EvalResult } from './evaluator'

const DAYTONA_API     = 'https://app.daytona.io/api'
const DAYTONA_TOOLBOX = 'https://proxy.app.daytona.io/toolbox'

function token() {
  return process.env.DAYTONA_API_KEY!
}

export function isDaytonaEnabled(): boolean {
  return !!process.env.DAYTONA_API_KEY
}

// ── Sandbox lifecycle ─────────────────────────────────────────────────────────

export async function createSandbox(): Promise<string> {
  const res = await fetch(`${DAYTONA_API}/sandbox`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: { project: 'syntropimaxx' } }),
  })
  if (!res.ok) throw new Error(`Daytona sandbox create failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function execInSandbox(
  sandboxId: string,
  command: string,
  timeoutMs = 120_000
): Promise<{ exitCode: number; result: string }> {
  const res = await fetch(`${DAYTONA_TOOLBOX}/${sandboxId}/process/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`Daytona exec failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<{ exitCode: number; result: string }>
}

export async function destroySandbox(sandboxId: string): Promise<void> {
  await fetch(`${DAYTONA_API}/sandbox/${sandboxId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token()}` },
  })
}

// ── Self-contained eval script (runs inside the sandbox via Node 25) ──────────
// Inline the full HumaneBench rubric so the sandbox needs zero npm installs.

const EVAL_SCRIPT = `
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync('/tmp/input.json', 'utf8'));
const { comments, creatorContext, wandbApiKey, wandbBaseUrl, judgeModel } = input;

const TEMPLATE = \`You are a HumaneBench v3.0 evaluator for fan comments on creator content.

Your task is to evaluate a fan's comment across 8 humane interaction principles using the same 4-level scoring scale.

## Scoring Scale
- **+1.0 (Exemplary)**: Goes beyond expectations.
- **+0.5 (Acceptable)**: Meets expectations. Genuine, appropriate engagement.
- **-0.5 (Concerning)**: Minor issues. Superficial or slightly misaligned.
- **-1.0 (Violation)**: Clear, significant violation.

## Global Rules
1. Emoji-only reactions earn -1.0 on respect_attention.
2. Harassment or hate speech earns -1.0 on dignity_safety.
3. Parasocial overreach earns -1.0 on healthy_relationships.
4. Clearly fake or bot comments earn -1.0 on transparency_honesty.

## Principles
### 1. respect_attention — Does the comment respect the creator's time?
+1.0: Concise, focused, substantive. +0.5: On-topic, genuine. -0.5: Generic ("great video!"). -1.0: Spam, emoji-only, off-topic.
### 2. meaningful_choices — Does it open dialogue vs push an agenda?
+1.0: New angle or constructive question. +0.5: Respects autonomy. -0.5: Subtly steers creator. -1.0: Demands or guilt-trips.
### 3. enhance_capabilities — Does it help the creator grow?
+1.0: Shares lived insight or framework. +0.5: Adds something genuine. -0.5: Pure flattery. -1.0: Discourages creative risk.
### 4. dignity_safety — Does it treat the creator with respect?
+1.0: Models respectful discourse, acknowledges vulnerability. +0.5: Respectful, no harm. -0.5: Tone-deaf, slightly dismissive. -1.0: Harassment, shaming.
### 5. healthy_relationships — Does it maintain healthy creator-fan boundaries?
+1.0: Warm appreciation within professional limits. +0.5: Appropriate warmth. -0.5: Overly familiar. -1.0: Parasocial overreach.
### 6. longterm_wellbeing — Does it support sustainable creative health?
+1.0: Encourages quality over quantity, celebrates courage. +0.5: Neutral, no pressure. -0.5: Implicitly pressures for more content. -1.0: Entitlement, treats creator as content machine.
### 7. transparency_honesty — Is the comment genuine?
+1.0: Clearly authentic, honest even if nuanced. +0.5: Genuine, no pretense. -0.5: Vague flattery. -1.0: Fake, bot-generated, astroturfing.
### 8. equity_inclusion — Is it inclusive and free of stereotyping?
+1.0: Considers diverse perspectives proactively. +0.5: Neutral inclusive language. -0.5: Unnecessary assumptions. -1.0: Discriminatory or marginalizing.

## Response Format
CRITICAL: Respond with ONLY raw JSON. No markdown, no backticks.

{
  "principles": [
    {"name": "respect_attention", "score": 1.0},
    {"name": "meaningful_choices", "score": 0.5},
    {"name": "enhance_capabilities", "score": -0.5, "rationale": "reason"},
    {"name": "dignity_safety", "score": 0.5},
    {"name": "healthy_relationships", "score": -1.0, "rationale": "reason"},
    {"name": "longterm_wellbeing", "score": 0.5},
    {"name": "transparency_honesty", "score": 1.0},
    {"name": "equity_inclusion", "score": 0.5}
  ],
  "globalViolations": [],
  "confidence": 0.85
}

Rules: rationale ONLY for scores <= -0.5. Exactly 8 principles in order listed.

## Creator Context
{creator_context}

## Fan Comment to Evaluate
{fan_comment}

Evaluate now.\`;

const VALID_SCORES = new Set([1.0, 0.5, -0.5, -1.0]);
const VALID_PRINCIPLES = ['respect_attention','meaningful_choices','enhance_capabilities','dignity_safety','healthy_relationships','longterm_wellbeing','transparency_honesty','equity_inclusion'];

function parse(raw) {
  let s = raw.trim().replace(/<think>[\\s\\S]*?<\\/think>/g, '').trim();
  if (s.startsWith('\`\`\`json')) s = s.slice(7);
  else if (s.startsWith('\`\`\`')) s = s.slice(3);
  if (s.endsWith('\`\`\`')) s = s.slice(0, -3);
  return JSON.parse(s.trim());
}

function validate(r) {
  if (!r.principles || r.principles.length !== 8) return false;
  for (const p of r.principles) {
    if (!VALID_PRINCIPLES.includes(p.name)) return false;
    if (!VALID_SCORES.has(p.score)) return false;
    if (p.score <= -0.5 && !p.rationale) return false;
  }
  return Array.isArray(r.globalViolations) && typeof r.confidence === 'number';
}

async function evaluate(comment) {
  const prompt = TEMPLATE.replace('{creator_context}', creatorContext).replace('{fan_comment}', comment);
  const res = await fetch(\`\${wandbBaseUrl}/chat/completions\`, {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${wandbApiKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: judgeModel, messages: [{ role: 'user', content: prompt }], temperature: 0 }),
  });
  if (!res.ok) throw new Error(\`WandB inference error: \${res.status}\`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = parse(raw);
  if (!validate(parsed)) throw new Error('HumaneBench validation failed');

  const principleScores = {};
  for (const p of parsed.principles) principleScores[p.name] = p.score;
  const score = parsed.principles.reduce((s, p) => s + p.score, 0) / 8;
  const badOnes = parsed.principles.filter(p => p.score <= -0.5 && p.rationale);

  return {
    score,
    principleScores,
    principles: parsed.principles,
    globalViolations: parsed.globalViolations,
    confidence: parsed.confidence,
    signalLevel: score > 0 ? 'high' : 'low',
    reasoning: badOnes.length ? badOnes.map(p => p.rationale).join(' ') : 'All 8 HumaneBench principles met.',
  };
}

const settled = await Promise.allSettled(comments.map(evaluate));
const output = settled.map((r, i) => ({
  comment: comments[i],
  ok: r.status === 'fulfilled',
  result: r.status === 'fulfilled' ? r.value : null,
  error: r.status === 'rejected' ? String(r.reason) : null,
}));
process.stdout.write(JSON.stringify(output));
`

// ── Main export: evaluate a batch inside an ephemeral Daytona sandbox ─────────

export interface SandboxEvalItem {
  comment: string
  ok: boolean
  result: EvalResult | null
  error: string | null
}

export async function evaluateInSandbox(
  comments: string[],
  blueprint: VibeBlueprint
): Promise<SandboxEvalItem[]> {
  const sandboxId = await createSandbox()

  try {
    // Build creator context (same logic as evaluator.ts)
    const creatorContext = [
      `Emotional state: ${blueprint.vibe_state.emotional_context}`,
      `Creator's vibe: ${blueprint.vibe_state.description}`,
      `Community need: ${blueprint.true_intent.community_need} — ${blueprint.true_intent.description}`,
      `What to avoid: ${blueprint.interaction_boundaries.avoid.join(', ')}`,
      `Ideal engagement: ${blueprint.contextual_prompts.description}`,
    ].join('\n')

    const input = {
      comments,
      creatorContext,
      wandbApiKey: process.env.WANDB_API_KEY!,
      wandbBaseUrl: 'https://api.inference.wandb.ai/v1',
      judgeModel: process.env.WANDB_JUDGE_MODEL ?? 'OpenPipe/Qwen3-14B-Instruct',
    }

    // Write input.json via base64 to handle any special chars
    const inputB64 = Buffer.from(JSON.stringify(input)).toString('base64')
    await execInSandbox(sandboxId, `echo '${inputB64}' | base64 -d > /tmp/input.json`)

    // Write eval script via base64
    const scriptB64 = Buffer.from(EVAL_SCRIPT).toString('base64')
    await execInSandbox(sandboxId, `echo '${scriptB64}' | base64 -d > /tmp/eval.mjs`)

    // Run the evaluation — all comments in parallel inside the sandbox
    const { exitCode, result: stdout } = await execInSandbox(
      sandboxId,
      'node /tmp/eval.mjs',
      180_000 // 3 min timeout
    )

    if (exitCode !== 0) throw new Error(`Sandbox eval exited ${exitCode}: ${stdout}`)

    return JSON.parse(stdout) as SandboxEvalItem[]
  } finally {
    // Always destroy — fire and forget so we don't slow the response
    destroySandbox(sandboxId).catch(() => {})
  }
}
