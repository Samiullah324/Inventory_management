import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../api/client'
import { fetchProducts } from '../api/products'
import { fetchTransactions } from '../api/transactions'
import LoadingSpinner from '../components/LoadingSpinner'
import { useNotification } from '../context/NotificationContext'
import { formatDateTime } from '../utils/formatters'
import { computeDashboardStats } from '../utils/inventory'

export default function Dashboard() {
  const { notify } = useNotification()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const [products, transactions] = await Promise.all([
          fetchProducts(),
          fetchTransactions(),
        ])
        if (!active) return
        setStats(computeDashboardStats(products))
        setRecentTransactions(transactions.slice(0, 10))
      } catch (error) {
        if (active) notify(extractErrorMessage(error), 'error')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [notify])

  if (loading) return <LoadingSpinner label="Loading dashboard..." />

  const cards = [
    { label: 'Total Products', value: stats.totalProducts },
    { label: 'Total Stock', value: stats.totalStock },
    { label: 'Low Stock Items', value: stats.lowStock, tone: 'warning' },
    { label: 'Out of Stock', value: stats.outOfStock, tone: 'danger' },
  ]

  return (
    <div className="page">
      <div className="page__header">
        <h2>Dashboard</h2>
        <p>Overview of inventory health and recent activity</p>
      </div>

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
        {recentTransactions.length === 0 ? (
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
                {recentTransactions.map((tx) => (
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
