import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from '../pages/Dashboard'
import { NotificationProvider } from '../context/NotificationContext'

vi.mock('../services/api', () => ({
  getDashboardStats: vi.fn(),
  getLowStock: vi.fn(),
  extractErrorMessage: (error) => error.message || 'Error',
}))

import { getDashboardStats, getLowStock } from '../services/api'

function renderDashboard() {
  return render(
    <NotificationProvider>
      <Dashboard />
    </NotificationProvider>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard stats from API', async () => {
    getDashboardStats.mockResolvedValue({
      total_products: 3,
      low_stock_count: 1,
      total_stock_value: '500.00',
      recent_transactions: [
        {
          id: 1,
          product_name: 'Keyboard',
          transaction_type: 'IN',
          quantity: 5,
          notes: '',
          timestamp: '2026-06-01T10:00:00Z',
        },
      ],
    })
    getLowStock.mockResolvedValue([{ id: 2, name: 'Mouse' }])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
    expect(screen.getByText('Low Stock Items')).toBeInTheDocument()
    expect(screen.getByText(/1 product\(s\)/)).toBeInTheDocument()
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
  })

  it('shows retry UI when dashboard fetch fails', async () => {
    getDashboardStats.mockRejectedValue(new Error('Server unavailable'))
    getLowStock.mockRejectedValue(new Error('Server unavailable'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
    expect(screen.getByText('Server unavailable', { selector: '.panel--error p' })).toBeInTheDocument()
  })
})
