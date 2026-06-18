import { useCallback, useEffect, useState } from 'react'
import { extractErrorMessage, getDashboardStats, getLowStock } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useNotification } from '../context/NotificationContext'
import { formatCurrency, formatDateTime } from '../utils/formatters'

export default function Dashboard() {
  const { notify } = useNotification()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [lowStockProducts, setLowStockProducts] = useState([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardStats, lowStock] = await Promise.all([
        getDashboardStats(),
        getLowStock(),
      ])
      setStats(dashboardStats)
      setLowStockProducts(lowStock)
    } catch (err) {
      const message = extractErrorMessage(err)
      setError(message)
      notify(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 60000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  if (loading) return <LoadingSpinner label="Loading dashboard..." />

  if (error) {
    return (
      <div className="page">
        <div className="page__header">
          <h2>Dashboard</h2>
        </div>
        <div className="panel panel--error">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Total Products', value: stats.total_products },
    { label: 'Low Stock Items', value: stats.low_stock_count, tone: 'warning' },
    {
      label: 'Total Inventory Value',
      value: formatCurrency(stats.total_stock_value),
    },
  ]

  return (
    <div className="page">
      <div className="page__header page__header--actions">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of inventory health and recent activity</p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="alert alert--warning" role="alert">
          <strong>{lowStockProducts.length} product(s)</strong> are at or below their minimum
          stock threshold.
        </div>
      )}

      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.label} className={`stat-card stat-card--${card.tone || 'default'}`}>
            <span className="stat-card__label">{card.label}</span>
            <strong className="stat-card__value">{card.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel__header">
          <h3>Recent Inventory Activity</h3>
        </div>
        {stats.recent_transactions.length === 0 ? (
          <p className="empty-state">No transactions recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.timestamp)}</td>
                    <td>{tx.product_name}</td>
                    <td>
                      <span className={`badge badge--${tx.transaction_type.toLowerCase()}`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td>{tx.quantity}</td>
                    <td>{tx.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
