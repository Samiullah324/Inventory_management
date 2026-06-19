import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Products from '../pages/Products'
import { NotificationProvider } from '../context/NotificationContext'

vi.mock('../services/api', () => ({
  getProducts: vi.fn(),
  getCategories: vi.fn(),
  extractErrorMessage: (error) => error.message || 'Error',
}))

import { getCategories, getProducts } from '../services/api'

function renderProducts() {
  return render(
    <NotificationProvider>
      <Products />
    </NotificationProvider>,
  )
}

describe('Products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('loads products from the API on mount', async () => {
    getProducts.mockResolvedValue([
      {
        id: 1,
        name: 'Laptop',
        sku: 'LAP-001',
        category: 1,
        category_name: 'Electronics',
        unit_price: '999.99',
        stock_quantity: 5,
        minimum_stock_threshold: 2,
      },
    ])
    getCategories.mockResolvedValue([{ id: 1, name: 'Electronics' }])

    renderProducts()

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument()
    })
    expect(getProducts).toHaveBeenCalledTimes(1)
    expect(getCategories).toHaveBeenCalledTimes(1)
  })

  it('uses getProducts API helper to prevent fetchProducts regression', async () => {
    getProducts.mockResolvedValue([])
    getCategories.mockResolvedValue([])

    renderProducts()

    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledTimes(1)
    })
    expect(globalThis.fetchProducts).toBeUndefined()
  })
})
