export function getStockStatus(product) {
  if (product.stock_quantity === 0) return 'out'
  if (product.stock_quantity <= product.minimum_stock_threshold) return 'low'
  return 'in_stock'
}

export function isLowStock(product) {
  return getStockStatus(product) === 'low'
}

export function getLocalDateString(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getStockStatusLabel(status) {
  switch (status) {
    case 'out':
      return 'Out of stock'
    case 'low':
      return 'Low stock'
    default:
      return 'In stock'
  }
}

export function computeDashboardStats(products) {
  return {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.stock_quantity, 0),
    lowStock: products.filter((p) => getStockStatus(p) === 'low').length,
    outOfStock: products.filter((p) => getStockStatus(p) === 'out').length,
  }
}

export function filterProducts(products, { name, sku, categoryId, stockStatus }) {
  return products.filter((product) => {
    if (name && !product.name.toLowerCase().includes(name.toLowerCase())) return false
    if (sku && !product.sku.toLowerCase().includes(sku.toLowerCase())) return false
    if (categoryId && String(product.category) !== String(categoryId)) return false
    if (stockStatus && getStockStatus(product) !== stockStatus) return false
    return true
  })
}

export function filterTransactions(transactions, { productId, type, dateFrom, dateTo }) {
  return transactions.filter((tx) => {
    if (productId && String(tx.product) !== String(productId)) return false
    if (type && tx.transaction_type !== type) return false
    if (dateFrom) {
      const txDate = getLocalDateString(tx.timestamp)
      if (txDate < dateFrom) return false
    }
    if (dateTo) {
      const txDate = getLocalDateString(tx.timestamp)
      if (txDate > dateTo) return false
    }
    return true
  })
}
