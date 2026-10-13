import type { Assignment, Exam, Subject } from './models'

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

export function validateRequiredText(value: unknown, message: string): string {
  return isNonEmptyString(value) ? '' : message
}

export function isSubject(value: unknown): value is Subject {
  if (typeof value !== 'object' || value === null) return false
  const subject = value as Record<string, unknown>
  return isNonEmptyString(subject.id) && isNonEmptyString(subject.name)
}

export function isAssignment(value: unknown): value is Assignment {
  if (typeof value !== 'object' || value === null) return false
  const assignment = value as Record<string, unknown>
  return isNonEmptyString(assignment.id)
    && isNonEmptyString(assignment.title)
    && isNonEmptyString(assignment.subjectId)
    && typeof assignment.deadline === 'string'
    && typeof assignment.completed === 'boolean'
    && (assignment.priority === 'Low' || assignment.priority === 'Medium' || assignment.priority === 'High')
}

export function isExam(value: unknown): value is Exam {
  if (typeof value !== 'object' || value === null) return false
  const exam = value as Record<string, unknown>
  return isNonEmptyString(exam.id)
    && isNonEmptyString(exam.name)
    && isNonEmptyString(exam.subjectId)
    && isNonEmptyString(exam.date)
}
