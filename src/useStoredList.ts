import { useEffect, useState } from 'react'

export function useStoredList<T>(key: string, isValid: (value: unknown) => value is T) {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      return Array.isArray(stored) ? stored.filter(isValid) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items))
    } catch {
      // Keep the list usable in memory when browser storage is unavailable.
    }
  }, [key, items])

  return [items, setItems] as const
}
