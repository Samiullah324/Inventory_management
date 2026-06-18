import { describe, expect, it } from 'vitest'
import { extractErrorMessage, extractFieldErrors } from '../services/api'

describe('api error parsing', () => {
  it('extractErrorMessage handles structured backend errors', () => {
    const error = {
      response: { data: { error: 'Validation failed', details: { sku: ['Duplicate SKU'] } } },
    }
    expect(extractErrorMessage(error)).toBe('Validation failed')
  })

  it('extractErrorMessage handles network failures', () => {
    expect(extractErrorMessage(new Error('Network Error'))).toBe(
      'Unable to connect to the server. Please try again.',
    )
  })

  it('extractFieldErrors maps validation details to field messages', () => {
    const error = {
      response: {
        data: {
          error: 'Validation failed',
          details: { sku: ['A product with this SKU already exists.'] },
        },
      },
    }
    expect(extractFieldErrors(error)).toEqual({
      sku: 'A product with this SKU already exists.',
    })
  })
})
