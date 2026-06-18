import { describe, expect, it } from 'vitest'
import {
  sanitizeCategoryPayload,
  sanitizeProductPayload,
  sanitizeText,
  sanitizeTransactionPayload,
} from '../utils/sanitize'

describe('sanitize', () => {
  it('strips HTML tags from text', () => {
    expect(sanitizeText('<script>alert(1)</script>Widget')).toBe('alert(1)Widget')
    expect(sanitizeText('<b>Bold</b> name')).toBe('Bold name')
  })

  it('enforces max length', () => {
    expect(sanitizeText('abcdef', 3)).toBe('abc')
  })

  it('sanitizes product payloads', () => {
    const result = sanitizeProductPayload({
      name: '<i>Laptop</i>',
      sku: ' SKU-1 ',
      category: '2',
      description: '<p>desc</p>',
      unit_price: '10',
      minimum_stock_threshold: '1',
    })
    expect(result.name).toBe('Laptop')
    expect(result.sku).toBe('SKU-1')
    expect(result.description).toBe('desc')
  })

  it('sanitizes category and transaction payloads', () => {
    expect(sanitizeCategoryPayload({ name: '<b>Office</b>', description: '' }).name).toBe(
      'Office',
    )
    expect(
      sanitizeTransactionPayload({
        product: '1',
        transaction_type: 'IN',
        quantity: '5',
        notes: '<script>x</script>restock',
      }).notes,
    ).toBe('xrestock')
  })
})
