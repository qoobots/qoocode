import type { OpenAIError } from 'openai'

export type APIErrorType =
  | 'authentication_error'
  | 'rate_limit_error'
  | 'invalid_request_error'
  | 'api_error'
  | 'timeout_error'
  | 'network_error'
  | 'unknown_error'

export interface APIError {
  type: APIErrorType
  message: string
  originalError?: unknown
}

/**
 * Classify OpenAI API errors into user-friendly types
 */
export function classifyOpenAIError(error: unknown): APIError {
  if (error instanceof Error) {
    // Check for timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        type: 'timeout_error',
        message: 'Request timed out. Please try again.',
        originalError: error,
      }
    }

    // Check for network errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return {
        type: 'network_error',
        message: 'Network error. Please check your connection.',
        originalError: error,
      }
    }

    // Check for authentication errors
    if (error.message.includes('401') || error.message.includes('authentication')) {
      return {
        type: 'authentication_error',
        message: 'Invalid API key. Please check your OPENAI_API_KEY.',
        originalError: error,
      }
    }

    // Check for rate limit errors
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return {
        type: 'rate_limit_error',
        message: 'Rate limit exceeded. Please try again later.',
        originalError: error,
      }
    }

    // Check for invalid request errors
    if (error.message.includes('400') || error.message.includes('invalid')) {
      return {
        type: 'invalid_request_error',
        message: 'Invalid request. Please check your input.',
        originalError: error,
      }
    }
  }

  // Default to unknown error
  return {
    type: 'unknown_error',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    originalError: error,
  }
}
