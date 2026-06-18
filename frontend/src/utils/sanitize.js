const HTML_TAG_PATTERN = /<[^>]*>/g

export function sanitizeText(value, maxLength = 500) {
  if (value == null) return ''
  return String(value).replace(HTML_TAG_PATTERN, '').trim().slice(0, maxLength)
}

export function sanitizeProductPayload(form) {
  return {
    name: sanitizeText(form.name, 255),
    sku: sanitizeText(form.sku, 100),
    category: form.category,
    description: sanitizeText(form.description, 5000),
    unit_price: form.unit_price,
    minimum_stock_threshold: form.minimum_stock_threshold,
  }
}

export function sanitizeCategoryPayload(form) {
  return {
    name: sanitizeText(form.name, 255),
    description: sanitizeText(form.description, 5000),
  }
}

export function sanitizeTransactionPayload(form) {
  return {
    product: form.product,
    transaction_type: form.transaction_type,
    quantity: form.quantity,
    notes: sanitizeText(form.notes, 5000),
  }
}
