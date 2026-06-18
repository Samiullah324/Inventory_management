export function validateRequired(value, label) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} is required.`
  }
  return null
}

export function validatePositiveNumber(value, label) {
  const number = Number(value)
  if (Number.isNaN(number) || number <= 0) {
    return `${label} must be greater than zero.`
  }
  return null
}

export function validateNonNegativeNumber(value, label) {
  const number = Number(value)
  if (Number.isNaN(number) || number < 0) {
    return `${label} must be zero or greater.`
  }
  return null
}
