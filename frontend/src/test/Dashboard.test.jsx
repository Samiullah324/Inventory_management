import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from '../pages/Dashboard'
import { NotificationProvider } from '../context/NotificationContext'

vi.mock('../utils/auth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    DASHBOARD_POLL_MS: 1000,
  }
})

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
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    getDashboardStats.mockResolvedValue({
      total_products: 3,
      low_stock_count: 1,
      total_stock_value: '500.00',
      recent_transactions: [],
    })
    getLowStock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders dashboard stats from API', async () => {
    getLowStock.mockResolvedValue([{ id: 2, name: 'Mouse' }])
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

  it('polls dashboard data on an interval and cleans up on unmount', async () => {
    const { unmount } = renderDashboard()

    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalledTimes(1)
    })

    await vi.advanceTimersByTimeAsync(1000)

    expect(getDashboardStats).toHaveBeenCalledTimes(2)

    const callsBeforeUnmount = getDashboardStats.mock.calls.length
    unmount()

    await vi.advanceTimersByTimeAsync(3000)

    expect(getDashboardStats.mock.calls.length).toBe(callsBeforeUnmount)
  })

  it('pauses polling when the document is hidden', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalledTimes(1)
    })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    await vi.advanceTimersByTimeAsync(3000)
    expect(getDashboardStats).toHaveBeenCalledTimes(1)
  })
})
