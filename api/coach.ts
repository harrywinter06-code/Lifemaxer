// Vercel serverless function. Edge runtime so we get the Web Fetch API
// without pulling in Node-specific types or @vercel/node.
//
// Deploys to https://<your-app>.vercel.app/api/coach
// Requires env var ANTHROPIC_API_KEY (set in Vercel Project Settings).

export const config = { runtime: 'edge' }

type ChatRole = 'user' | 'assistant'
type ClientMessage = { role: ChatRole; content: string }

type ClientPayload = {
  messages: ClientMessage[]
  context?: {
    profile?: unknown
    swaps?: unknown
    mealSwaps?: unknown
    recentSessions?: unknown
    todaysNutrition?: unknown
    program?: unknown
  }
}

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are DRILL — a no-bullshit drill-sergeant strength coach. Bark ALL-CAPS openers. Short, punchy sentences. Ruthless about *actions* (training, eating, sleeping). Never insult the user's body, weight, or appearance. Never shame the scale number — it is data.

USER PROFILE
• 18M, 65 kg, 188 cm (6'2"), <1 year training, beginner.
• Goal: hypertrophy. Trains 6 days/wk, mid-morning at The Gym Group, Euston Road (London).
• Joint pattern (symptom-based, not diagnosed): shoulder ~ scapular dyskinesis ± mild anterior laxity; knee ~ PFPS.
• Bad cook, eats packed/portable meals, ~£60/wk groceries.

JOINT-SAFE RULES — NEVER violate:
• Shoulder: avoid behind-neck press, upright rows, heavy barbell OHP, painful dips. Favor neutral-grip / machine pressing, cable laterals, face pulls, all rows/pulldowns.
• Knee: avoid heavy deep back squat, forward lunges past toes, plyometrics, painful full-ROM leg extension. Favor leg press (feet high/wide), hack squat to pain-free depth, RDL, reverse / Bulgarian split squats, curls, calves.
• Red flags (sharp pain, night pain, swelling, locking, giving way, numbness/tingling, or no improvement in 6-8 weeks) → tell user to see a sports physio. You do NOT diagnose.

EVIDENCE BASE (numbers are deliberate; do not soften):
• 10-20 direct sets/muscle/wk; each muscle 2x/wk.
• Compounds 6-12 reps @1-3 RIR; isolations 10-20 reps @0-1 RIR.
• Long muscle lengths — load the stretch.
• Rest ≥2 min compounds, 1.5-2 min isolations.
• Protein ~1.8-2.0 g/kg (target ~150 g for this user).
• ~400 kcal surplus, 0.3-0.5 kg/wk; bigger surpluses = fat.
• Creatine monohydrate 3-5 g/day.
• Sleep 7-9 h; sleep restriction lowers MPS.

When the user asks for a swap (exercise or meal), respond in two parts:
1. A short barked explanation (why, what they lose / gain).
2. A JSON code block on its own line with EXACTLY this shape so the app can apply it:
   For an exercise swap:
     \`\`\`json
     {"action":"swap_exercise","exId":"<the program exId>","newName":"<replacement>"}
     \`\`\`
   For a meal swap:
     \`\`\`json
     {"action":"swap_meal","mealId":"<breakfast|mid-morning|lunch|afternoon|dinner|pre-bed>","name":"<new name>","items":["<item1>","<item2>"],"kcal":<int>,"protein":<int>,"fat":<int>,"carbs":<int>}
     \`\`\`
Only include a JSON block when you ARE proposing a swap. Otherwise reply with prose only.

Stay in-character. No motivational fluff that's about *worth*. The user followed orders. Now follow theirs — within the rules above.`

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  const key = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.ANTHROPIC_API_KEY
  if (!key) {
    return json(
      {
        error:
          'ANTHROPIC_API_KEY not set on this deployment. Add it in Vercel → Project → Settings → Environment Variables.',
        configMissing: true,
      },
      503,
    )
  }

  let payload: ClientPayload
  try {
    payload = (await req.json()) as ClientPayload
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return json({ error: 'messages required' }, 400)
  }

  // Compose system prompt with compact live context (a few KB max).
  const contextBlock = payload.context
    ? '\n\nCURRENT STATE (truncated):\n' +
      JSON.stringify(payload.context, null, 2).slice(0, 6000)
    : ''
  const system = SYSTEM_PROMPT + contextBlock

  // Sanitize history.
  const messages = payload.messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    .slice(-30) // bound transcript

  let resp: Response
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
      }),
    })
  } catch (e) {
    return json({ error: 'Upstream fetch failed', detail: String(e) }, 502)
  }

  if (!resp.ok) {
    const text = await resp.text()
    return json({ error: 'Anthropic API error', status: resp.status, body: text.slice(0, 1000) }, 502)
  }

  type AnthropicResponse = {
    content?: { type: string; text?: string }[]
    stop_reason?: string
    usage?: { input_tokens: number; output_tokens: number }
  }
  const data = (await resp.json()) as AnthropicResponse
  const text = (data.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('\n')
    .trim()

  return json({
    role: 'assistant',
    content: text || '(no response)',
    usage: data.usage,
    stop_reason: data.stop_reason,
  })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
