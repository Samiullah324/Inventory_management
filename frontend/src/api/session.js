export const SESSION_EXPIRED_EVENT = 'inventory:session-expired'

export function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
}
