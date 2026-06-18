import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/categories', label: 'Categories' },
  { to: '/products', label: 'Products' },
  { to: '/transactions', label: 'Transactions' },
]

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Admin console</p>
        </div>
        <button type="button" className="button button-secondary" onClick={logout}>
          Sign out
        </button>
      </header>
      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
