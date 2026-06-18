export function formatApiError(error) {
  if (!error) {
    return 'An unexpected error occurred.'
  }

  if (typeof error === 'string') {
    return error
  }

  if (error.detail) {
    return typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
  }

  const messages = []
  for (const [field, value] of Object.entries(error)) {
    if (Array.isArray(value)) {
      messages.push(`${field}: ${value.join(', ')}`)
    } else if (typeof value === 'string') {
      messages.push(`${field}: ${value}`)
    }
  }

  return messages.length > 0 ? messages.join(' ') : 'Request failed.'
}
