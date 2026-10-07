export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

export function validateRequiredText(value: unknown, message: string): string {
  return isNonEmptyString(value) ? '' : message
}
