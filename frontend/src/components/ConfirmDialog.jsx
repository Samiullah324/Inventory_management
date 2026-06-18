import Modal from './Modal.jsx'

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
