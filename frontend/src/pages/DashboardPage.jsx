import { useEffect, useState } from 'react';
import { fetchDashboard } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { escapeHtml } from '../utils/security';

function StatCard({ label, value, tone = 'default' }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default function DashboardPage() {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const data = await fetchDashboard();
        if (active) {
          setDashboard(data);
        }
      } catch (error) {
        notify(error.message || 'Failed to load dashboard', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [notify]);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of inventory health and recent activity.</p>
        </div>
      </header>

      <section className="stat-grid">
        <StatCard label="Total products" value={dashboard?.total_products ?? 0} />
        <StatCard label="Total stock" value={dashboard?.total_stock ?? 0} tone="info" />
        <StatCard label="Low stock items" value={dashboard?.low_stock_items ?? 0} tone="warning" />
        <StatCard label="Out-of-stock items" value={dashboard?.out_of_stock_items ?? 0} tone="danger" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Recent inventory activity</h2>
        </div>
        {!dashboard?.recent_activity?.length ? (
          <p className="empty-state">No transactions recorded yet.</p>
        ) : (
          <div className="table-wrapper">
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
                {dashboard.recent_activity.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                    <td>{escapeHtml(transaction.product_name)}</td>
                    <td>
                      <span className={`badge badge-${transaction.transaction_type.toLowerCase()}`}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td>{transaction.quantity}</td>
                    <td>{transaction.notes ? escapeHtml(transaction.notes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
