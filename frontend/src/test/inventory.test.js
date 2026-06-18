import { describe, expect, it } from 'vitest'
import {
  computeDashboardStats,
  filterProducts,
  filterTransactions,
  getStockStatus,
} from '../utils/inventory'

describe('inventory utils', () => {
  const products = [
    {
      id: 1,
      name: 'Laptop',
      sku: 'LAP-001',
      category: 1,
      stock_quantity: 0,
      minimum_stock_threshold: 5,
    },
    {
      id: 2,
      name: 'Mouse',
      sku: 'MOU-001',
      category: 1,
      stock_quantity: 3,
      minimum_stock_threshold: 5,
    },
    {
      id: 3,
      name: 'Keyboard',
      sku: 'KEY-001',
      category: 2,
      stock_quantity: 20,
      minimum_stock_threshold: 5,
    },
  ]

  it('computes dashboard stats from products', () => {
    expect(computeDashboardStats(products)).toEqual({
      totalProducts: 3,
      totalStock: 23,
      lowStock: 1,
      outOfStock: 1,
    })
  })

  it('derives stock status correctly', () => {
    expect(getStockStatus(products[0])).toBe('out')
    expect(getStockStatus(products[1])).toBe('low')
    expect(getStockStatus(products[2])).toBe('in_stock')
  })

  it('filters products by name, sku, category, and stock status', () => {
    expect(filterProducts(products, { name: 'lap' })).toHaveLength(1)
    expect(filterProducts(products, { sku: 'mou' })).toHaveLength(1)
    expect(filterProducts(products, { categoryId: '2' })).toHaveLength(1)
    expect(filterProducts(products, { stockStatus: 'low' })).toHaveLength(1)
  })

  it('filters transactions by product, type, and date', () => {
    const transactions = [
      {
        id: 1,
        product: 1,
        transaction_type: 'IN',
        timestamp: '2026-06-01T10:00:00Z',
      },
      {
        id: 2,
        product: 2,
        transaction_type: 'OUT',
        timestamp: '2026-06-10T10:00:00Z',
      },
    ]

    expect(filterTransactions(transactions, { productId: '1' })).toHaveLength(1)
    expect(filterTransactions(transactions, { type: 'OUT' })).toHaveLength(1)
    expect(
      filterTransactions(transactions, { dateFrom: '2026-06-05', dateTo: '2026-06-15' }),
    ).toHaveLength(1)
  })
})
