import { describe, expect, it } from 'vitest'
import {
  validateNonNegativeNumber,
  validatePositiveNumber,
  validateRequired,
} from './validation'

describe('validation helpers', () => {
  it('validates required fields', () => {
    expect(validateRequired('', 'Name')).toBe('Name is required.')
    expect(validateRequired('Keyboard', 'Name')).toBeNull()
  })

  it('validates positive numbers', () => {
    expect(validatePositiveNumber(0, 'Quantity')).toBe('Quantity must be greater than zero.')
    expect(validatePositiveNumber(5, 'Quantity')).toBeNull()
  })

  it('validates non-negative numbers', () => {
    expect(validateNonNegativeNumber(-1, 'Threshold')).toBe('Threshold must be zero or greater.')
    expect(validateNonNegativeNumber(0, 'Threshold')).toBeNull()
  })
})
