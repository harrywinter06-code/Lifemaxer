// Request persistent storage so iOS / browsers don't evict our IndexedDB
// under storage pressure. Honored on installed PWAs (iOS 17+, Chrome,
// Edge, Firefox).

export type StorageStatus = {
  supported: boolean
  persisted: boolean
  quota?: number
  usage?: number
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { supported: false, persisted: false }
  }
  const persisted = navigator.storage.persisted
    ? await navigator.storage.persisted()
    : false
  let quota: number | undefined
  let usage: number | undefined
  if (navigator.storage.estimate) {
    const est = await navigator.storage.estimate()
    quota = est.quota
    usage = est.usage
  }
  return { supported: true, persisted, quota, usage }
}

/** Best-effort. Returns the new persisted state. */
export async function requestPersistent(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
