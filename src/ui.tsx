import type { ReactNode } from 'react'

const icons = {
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  edit: <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 5Z" /></>,
} as const

export type IconName = keyof typeof icons

export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[name]}</svg>
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ReadableDate({ date }: { date: string }) {
  return <time dateTime={date}>{formatDate(date)}</time>
}

export function DateBadge({ date }: { date: string }) {
  return (
    <time className="deadline-date" dateTime={date} aria-label={formatDate(date)}>
      <span className="deadline-day">{date.slice(8, 10)}</span>
      <span>{new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })} {date.slice(0, 4)}</span>
    </time>
  )
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}
