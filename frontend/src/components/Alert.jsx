export default function Alert({ type = 'error', message, onClose }) {
  if (!message) {
    return null
  }

  return (
    <div className={`alert alert-${type}`} role="alert">
      <span>{message}</span>
      {onClose ? (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  )
}
