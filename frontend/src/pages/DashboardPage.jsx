import { useEffect, useState } from 'react'
import Alert from '../components/Alert'
import Loading from '../components/Loading'
import { dashboardApi } from '../api/services'
import { formatApiError } from '../utils/errors'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadStats() {
      setLoading(true)
      setError('')
      try {
        const data = await dashboardApi.getStats()
        if (active) {
          setStats(data)
        }
      } catch (err) {
        if (active) {
          setError(formatApiError(err))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()
    return () => {
      active = false
    }
  }, [refreshKey])

  if (loading) {
    return <Loading label="Loading dashboard..." />
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Real-time inventory overview</p>
        </div>
        <button type="button" className="button button-secondary" onClick={() => setRefreshKey((key) => key + 1)}>
          Refresh
        </button>
      </div>

      <Alert message={error} onClose={() => setError('')} />

      {stats ? (
        <>
          <section className="stats-grid">
            <article className="stat-card">
              <span>Total products</span>
              <strong>{stats.total_products}</strong>
            </article>
            <article className="stat-card">
              <span>Categories</span>
              <strong>{stats.total_categories}</strong>
            </article>
            <article className="stat-card">
              <span>Total stock units</span>
              <strong>{stats.total_stock_units}</strong>
            </article>
            <article className="stat-card warning">
              <span>Low stock alerts</span>
              <strong>{stats.low_stock_products.length}</strong>
            </article>
          </section>

          <section className="panel-grid">
            <article className="card">
              <h3>Low stock products</h3>
              {stats.low_stock_products.length === 0 ? (
                <p className="muted">All products are above their minimum thresholds.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.low_stock_products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.stock_quantity}</td>
                        <td>{product.minimum_stock_threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            <article className="card">
              <h3>Recent inventory movement</h3>
              {stats.recent_transactions.length === 0 ? (
                <p className="muted">No transactions recorded yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                        <td>{transaction.product_name}</td>
                        <td>{transaction.transaction_type}</td>
                        <td>{transaction.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}
