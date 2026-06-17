import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

let notificationId = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message, type = 'info') => {
    const id = ++notificationId;
    setNotifications((current) => [...current, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const value = useMemo(() => ({ notifications, notify, dismiss }), [notifications, notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-container" aria-live="polite">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            role="status"
          >
            <span>{notification.message}</span>
            <button type="button" onClick={() => dismiss(notification.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
