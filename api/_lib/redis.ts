import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function redis(): Redis {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set',
    )
  }
  _redis = new Redis({ url, token })
  return _redis
}

/** Keyspace (single tenant). */
export const KEYS = {
  subList: 'push:subs',                                  // SET of endpoints
  sub: (endpoint: string) => `push:sub:${hash(endpoint)}`, // HASH of subscription record
  fired: (dateKey: string, endpointHash: string, nagKey: string) =>
    `push:fired:${dateKey}:${endpointHash}:${nagKey}`,
}

export function hash(endpoint: string): string {
  // Endpoints are long URLs; a stable short hash avoids Redis key sprawl.
  // FNV-1a 32-bit, hex.
  let h = 0x811c9dc5
  for (let i = 0; i < endpoint.length; i++) {
    h ^= endpoint.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
