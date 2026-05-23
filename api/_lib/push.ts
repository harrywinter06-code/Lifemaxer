import webpush from 'web-push'

let configured = false

export function configureVapid(): typeof webpush {
  if (!configured) {
    const subject = process.env.VAPID_SUBJECT
    const pub = process.env.VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    if (!subject || !pub || !priv) {
      throw new Error('VAPID env vars missing (VAPID_SUBJECT/PUBLIC/PRIVATE)')
    }
    webpush.setVapidDetails(subject, pub, priv)
    configured = true
  }
  return webpush
}

export type StoredSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  schedule: { wake: string; train: string; bed: string }
  tz: string
  createdAt: number
}

export type Nag = {
  key: string
  title: string
  body: string
  tag: string
}
