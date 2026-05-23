#!/usr/bin/env node
// One-shot script: generate a VAPID keypair for Web Push.
// Run once locally:  node scripts/gen-vapid.mjs
// Then paste the printed values into Vercel → Project → Settings → Environment Variables.

import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log('\n# Add these to Vercel → Project → Settings → Environment Variables')
console.log('# (and also to .env.local if you want to test locally)\n')
console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
console.log(`VAPID_SUBJECT=mailto:harrywinter06@gmail.com`)
console.log('\n# Also set these (for protecting the cron + Upstash):')
console.log('CRON_SECRET=<paste a long random string here, e.g. openssl rand -hex 32>')
console.log('UPSTASH_REDIS_REST_URL=<from upstash.com, create a free Redis DB>')
console.log('UPSTASH_REDIS_REST_TOKEN=<from upstash.com>')
console.log('\n# The VITE_VAPID_PUBLIC_KEY (same value as VAPID_PUBLIC_KEY)')
console.log('# is also needed at BUILD time so the client SW can subscribe.')
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`)
console.log('')
