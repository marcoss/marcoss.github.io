import type { ErrorData } from '../types/chat';

export function sanitizeQuestion(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatErrorMessage(errorData: ErrorData): string {
  if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
    const error = errorData.errors[0];
    return error.detail || error.title || 'An error occurred';
  }
  return 'Something went wrong. Please try again.';
}
