import { getWandbClient, weaveReady, LLM_MODEL } from './wandb'
import type { VibeBlueprint } from './insforge'

const BLUEPRINT_SYSTEM = `You are Syntropimaxx, an AI that analyzes creator content and returns a Vibe Blueprint JSON.
The Vibe Blueprint maps the creator's content to HumaneBench principles to guide community engagement.

Return ONLY valid JSON matching this exact schema:
{
  "vibe_state": {
    "humanebench_principle": "respect-user-attention",
    "emotional_context": "<one of: humorous|aspirational|technical|creative|exploratory|vulnerable>",
    "description": "<one sentence: the mental space the creator occupies>"
  },
  "true_intent": {
    "humanebench_principle": "prioritize-long-term-wellbeing",
    "community_need": "<one of: shared narratives|contextual tips|conscientious questions|peer accountability>",
    "description": "<one sentence: what the creator actually needs from their community>"
  },
  "interaction_boundaries": {
    "humanebench_principle": "protect-dignity-and-safety",
    "avoid": ["<2-4 specific things to avoid>"],
    "description": "<one sentence: what would harm the creator or community>"
  },
  "contextual_prompts": {
    "humanebench_principle": "enhance-human-capabilities",
    "prompt_chips": ["<3 specific, actionable prompt chips for fans>"],
    "description": "<one sentence: how fans should engage>"
  }
}`

export async function generateVibeBlueprint(transcript: string): Promise<VibeBlueprint> {
  await weaveReady()
  const completion = await getWandbClient().chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: BLUEPRINT_SYSTEM },
      {
        role: 'user',
        content: `Analyze this creator content and return the Vibe Blueprint JSON:\n\n${transcript}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const raw = completion.choices[0].message.content ?? '{}'
  return JSON.parse(raw) as VibeBlueprint
}

export async function generatePromptChips(
  blueprint: VibeBlueprint,
  lowSignalComment: string
): Promise<string[]> {
  await weaveReady()
  const completion = await getWandbClient().chat.completions.create({
    model: LLM_MODEL,
    messages: [
      {
        role: 'system',
        content: `You generate 3 contextual prompt chips to replace a low-signal comment.
Each chip should encourage genuine, peer-to-peer engagement aligned with the creator's Vibe Blueprint.
Return ONLY a JSON array of 3 short strings (under 12 words each). No explanation.`,
      },
      {
        role: 'user',
        content: `Vibe Blueprint:
${JSON.stringify(blueprint, null, 2)}

Low-signal comment: "${lowSignalComment}"

Generate 3 replacement prompt chips that would lead to high-quality responses.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const raw = completion.choices[0].message.content ?? '[]'
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : parsed.chips ?? blueprint.contextual_prompts.prompt_chips
}
