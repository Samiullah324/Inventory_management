import { describe, expect, it } from 'vitest'
import {
  validateCategoryForm,
  validateLogin,
  validateProductForm,
  validateTransactionForm,
} from '../utils/validation'

describe('validation', () => {
  it('validates login fields', () => {
    expect(validateLogin({ username: '', password: '' })).toEqual({
      username: 'Username is required',
      password: 'Password is required',
    })
    expect(validateLogin({ username: 'admin', password: 'secret' })).toEqual({})
  })

  it('validates product form fields', () => {
    expect(
      validateProductForm({
        name: '',
        sku: '',
        category: '',
        unit_price: '',
        minimum_stock_threshold: '',
      }),
    ).toMatchObject({
      name: 'Name is required',
      sku: 'SKU is required',
      category: 'Category is required',
    })
  })

  it('validates category form fields', () => {
    expect(validateCategoryForm({ name: '  ' })).toEqual({ name: 'Name is required' })
  })

  it('validates transaction form fields', () => {
    expect(
      validateTransactionForm({
        product: '',
        transaction_type: 'IN',
        quantity: '0',
      }),
    ).toMatchObject({
      product: 'Product is required',
      quantity: 'Quantity must be greater than zero',
    })
  })
})
