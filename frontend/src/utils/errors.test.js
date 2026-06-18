import { describe, expect, it } from 'vitest'
import { formatApiError } from './errors'

describe('formatApiError', () => {
  it('returns a default message for empty errors', () => {
    expect(formatApiError(null)).toBe('An unexpected error occurred.')
  })

  it('formats field validation errors', () => {
    expect(formatApiError({ quantity: ['Insufficient stock.'] }))
      .toBe('quantity: Insufficient stock.')
  })

  it('returns detail messages from the API', () => {
    expect(formatApiError({ detail: 'Invalid credentials.' }))
      .toBe('Invalid credentials.')
  })
})
