import { describe, expect, it } from 'vitest'
import { extractErrorMessage } from '../api/client'

describe('extractErrorMessage', () => {
  it('returns detail message from API errors', () => {
    const error = {
      response: { data: { detail: 'Invalid credentials' } },
      message: 'Request failed',
    }
    expect(extractErrorMessage(error)).toBe('Invalid credentials')
  })

  it('formats field validation errors', () => {
    const error = {
      response: { data: { sku: ['A product with this SKU already exists.'] } },
      message: 'Request failed',
    }
    expect(extractErrorMessage(error)).toBe(
      'sku: A product with this SKU already exists.',
    )
  })
})
