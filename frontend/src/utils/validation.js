export function validateLogin({ username, password }) {
  const errors = {}
  if (!username?.trim()) errors.username = 'Username is required'
  if (!password) errors.password = 'Password is required'
  return errors
}

export function validateProductForm(form) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Name is required'
  if (!form.sku?.trim()) errors.sku = 'SKU is required'
  if (!form.category) errors.category = 'Category is required'
  if (!form.unit_price || Number(form.unit_price) < 0) {
    errors.unit_price = 'Valid unit price is required'
  }
  if (form.minimum_stock_threshold === '' || Number(form.minimum_stock_threshold) < 0) {
    errors.minimum_stock_threshold = 'Threshold must be zero or greater'
  }
  return errors
}

export function validateCategoryForm(form) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Name is required'
  return errors
}

export function validateTransactionForm(form) {
  const errors = {}
  if (!form.product) errors.product = 'Product is required'
  if (!form.transaction_type) errors.transaction_type = 'Type is required'
  if (!form.quantity || Number(form.quantity) <= 0) {
    errors.quantity = 'Quantity must be greater than zero'
  }
  return errors
}
