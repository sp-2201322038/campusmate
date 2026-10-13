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
  const currentItems = useRef(items)
  const storageUnavailable = useRef(false)

  const updateItems = useCallback((update: (current: T[]) => T[]) => {
    const latest = storageUnavailable.current ? currentItems.current : readItems(currentItems.current)
    const next = update(latest)

    try {
      localStorage.setItem(key, JSON.stringify(next))
      storageUnavailable.current = false
    } catch {
      // Keep the list usable in memory when browser storage is unavailable.
      storageUnavailable.current = true
    }

    currentItems.current = next
    setItems(next)
  }, [key, readItems])

  useEffect(() => {
    const syncItems = () => {
      const latest = readItems(currentItems.current)
      currentItems.current = latest
      setItems(latest)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) {
        syncItems()
      }
    }

    window.addEventListener('storage', handleStorage)
    syncItems()
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, readItems])

  return [items, updateItems] as const
}
