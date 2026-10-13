import type { Assignment } from './models'

export function isOverdue(assignment: Assignment, today: string): boolean {
  return !assignment.completed && Boolean(assignment.deadline) && assignment.deadline < today
}
