// Quick smoke test for Vercel AI Gateway.
//
// Prereqs:
//   1. npm install      (already done; brings in `ai`)
//   2. vc link          (link this folder to your Vercel project, one-time)
//   3. vc env pull .env.local   (writes VERCEL_OIDC_TOKEN, valid ~12h)
//   4. node --env-file=.env.local index.mjs
//
// Swap the model string to try others. Vercel AI Gateway routes by
// `<provider>/<model-id>` — e.g. anthropic/claude-haiku-4-5,
// anthropic/claude-sonnet-4-6, openai/gpt-5, google/gemini-2.5-pro, etc.

import { streamText } from 'ai'

const result = streamText({
  model: 'anthropic/claude-haiku-4-5',
  prompt: 'In one bark, what should a beginner lifter do tonight if the gym is packed?',
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}
process.stdout.write('\n')
