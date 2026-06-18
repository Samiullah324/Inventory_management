import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const notify = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setNotifications((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notifications" aria-live="polite">
        {notifications.map((n) => (
          <div key={n.id} className={`notification notification--${n.type}`}>
            <span>{n.message}</span>
            <button type="button" onClick={() => dismiss(n.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
