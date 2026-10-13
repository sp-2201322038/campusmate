import { useCallback, useEffect, useRef, useState } from 'react'

export function useStoredList<T>(key: string, isValid: (value: unknown) => value is T) {
  const readItems = useCallback((fallback: T[] = []) => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      return Array.isArray(stored) ? stored.filter(isValid) : []
    } catch {
      return fallback
    }
  }, [key, isValid])

  const [items, setItems] = useState<T[]>(() => readItems())
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const currentItems = useRef(items)
  const storageUnavailable = useRef(false)

  const updateItems = useCallback((update: (current: T[]) => T[]) => {
    const latest = storageUnavailable.current ? currentItems.current : readItems(currentItems.current)
    const next = update(latest)

    try {
      localStorage.setItem(key, JSON.stringify(next))
      storageUnavailable.current = false
      setPersistenceError(null)
    } catch {
      // Keep the list usable in memory when browser storage is unavailable.
      storageUnavailable.current = true
      setPersistenceError('Changes could not be saved permanently. Keep this tab open; unsaved changes will be lost if you reload or close it.')
    }

    currentItems.current = next
    setItems(next)
  }, [key, readItems])

  useEffect(() => {
    const syncItems = () => {
      if (storageUnavailable.current) return
      const latest = readItems(currentItems.current)
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
