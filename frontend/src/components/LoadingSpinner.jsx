export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading__spinner" />
      <span>{label}</span>
    </div>
  )
}
