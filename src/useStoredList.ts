import { useCallback, useEffect, useRef, useState } from 'react'

function reconcileItems<T extends { id: string }>(baseline: T[], pending: T[], latest: T[]): T[] | null {
  const before = new Map(baseline.map((item) => [item.id, item]))
  const local = new Map(pending.map((item) => [item.id, item]))
  const remote = new Map(latest.map((item) => [item.id, item]))
  const changes = new Map<string, T | undefined>()
  const same = (first: T | undefined, second: T | undefined) => JSON.stringify(first) === JSON.stringify(second)

  for (const id of new Set([...before.keys(), ...local.keys()])) {
    const original = before.get(id)
    const next = local.get(id)
    if (same(original, next)) continue
    const stored = remote.get(id)
    if (!same(original, stored) && !same(next, stored)) return null
    changes.set(id, next)
  }

  const merged = latest.flatMap((item) => {
    if (!changes.has(item.id)) return [item]
    const next = changes.get(item.id)
    return next ? [next] : []
  })
  for (const [id, next] of changes) {
    if (next && !remote.has(id)) merged.push(next)
  }
  return merged
}

export function useStoredList<T extends { id: string }>(key: string, isValid: (value: unknown) => value is T) {
  const readItems = useCallback((): T[] | null => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      return Array.isArray(stored) ? stored.filter(isValid) : []
    } catch {
      return null
    }
  }, [key, isValid])

  const [items, setItems] = useState<T[]>(() => readItems() ?? [])
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const currentItems = useRef(items)
  const persistedItems = useRef(items)
  const storageUnavailable = useRef(false)

  const updateItems = useCallback((update: (current: T[]) => T[]) => {
    const latest = readItems()
    if (!storageUnavailable.current && latest !== null) persistedItems.current = latest
    let next = update(storageUnavailable.current ? currentItems.current : latest ?? currentItems.current)
    let warning = 'Changes could not be saved permanently. Keep this tab open; unsaved changes will be lost if you reload or close it.'

    try {
      if (latest === null) throw new Error('Storage could not be read')
      const reconciled = storageUnavailable.current ? reconcileItems(persistedItems.current, next, latest) : next
      if (reconciled === null) {
        warning = 'Changes conflict with data saved in another tab and could not be saved. Keep this tab open to preserve your unsaved changes; reconcile the conflicting records before trying again.'
        throw new Error('Conflicting storage changes')
      }
      localStorage.setItem(key, JSON.stringify(reconciled))
      next = reconciled
      persistedItems.current = next
      storageUnavailable.current = false
      setPersistenceError(null)
    } catch {
      // Keep the list usable in memory when browser storage is unavailable.
      storageUnavailable.current = true
      setPersistenceError(warning)
    }

    currentItems.current = next
    setItems(next)
  }, [key, readItems])

  useEffect(() => {
    const syncItems = () => {
      if (storageUnavailable.current) return
      const latest = readItems()
      if (latest === null) return
      persistedItems.current = latest
      currentItems.current = latest
      setItems(latest)
    }

    const handleStorage = (event: StorageEvent) => {
      if (!storageUnavailable.current && event.storageArea === localStorage && (event.key === key || event.key === null)) {
        syncItems()
      }
    }

    window.addEventListener('storage', handleStorage)
    syncItems()
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, readItems])

  return [items, updateItems, persistenceError] as const
}
