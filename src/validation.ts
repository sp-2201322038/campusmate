import type { Assignment, Exam, Subject } from './models'

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

export function validateRequiredText(value: unknown, message: string): string {
  return isNonEmptyString(value) ? '' : message
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1]
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
    && (assignment.deadline === '' || isCalendarDate(assignment.deadline))
    && typeof assignment.completed === 'boolean'
    && (assignment.priority === 'Low' || assignment.priority === 'Medium' || assignment.priority === 'High')
}

export function isExam(value: unknown): value is Exam {
  if (typeof value !== 'object' || value === null) return false
  const exam = value as Record<string, unknown>
  return isNonEmptyString(exam.id)
    && isNonEmptyString(exam.name)
    && isNonEmptyString(exam.subjectId)
    && isCalendarDate(exam.date)
}
