const CONTROL_CHARS = /[\0\x08\x0B\x0C\x0E-\x1F]/g;
const HTML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function sanitizeTextInput(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(CONTROL_CHARS, '').trim();
}

export function sanitizePayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload);
  }
  if (payload && typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, sanitizePayload(value)]),
    );
  }
  if (typeof payload === 'string') {
    return sanitizeTextInput(payload);
  }
  return payload;
}

export function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred.';
  }
  const cleaned = message.replace(CONTROL_CHARS, '').slice(0, 500);
  return cleaned.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] || char);
}

export function escapeHtml(value) {
  if (value == null) {
    return '';
  }
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] || char);
}
