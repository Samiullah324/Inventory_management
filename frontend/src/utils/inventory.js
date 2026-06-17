export function getStockStatusLabel(status) {
  switch (status) {
    case 'out_of_stock':
      return 'Out of stock';
    case 'low_stock':
      return 'Low stock';
    default:
      return 'In stock';
  }
}

export function validateProductForm(values) {
  const errors = {};
  if (!values.name?.trim()) {
    errors.name = 'Name is required';
  }
  if (!values.sku?.trim()) {
    errors.sku = 'SKU is required';
  }
  if (!values.category) {
    errors.category = 'Category is required';
  }
  const price = Number(values.unit_price);
  if (values.unit_price === '' || Number.isNaN(price) || price < 0) {
    errors.unit_price = 'Enter a valid unit price';
  }
  const threshold = Number(values.minimum_stock_threshold);
  if (
    values.minimum_stock_threshold === '' ||
    Number.isNaN(threshold) ||
    threshold < 0 ||
    !Number.isInteger(threshold)
  ) {
    errors.minimum_stock_threshold = 'Enter a valid minimum stock threshold';
  }
  return errors;
}

export function validateCategoryForm(values) {
  const errors = {};
  if (!values.name?.trim()) {
    errors.name = 'Name is required';
  }
  return errors;
}

export function validateTransactionForm(values) {
  const errors = {};
  if (!values.product) {
    errors.product = 'Product is required';
  }
  if (!values.transaction_type) {
    errors.transaction_type = 'Transaction type is required';
  }
  const quantity = Number(values.quantity);
  if (values.quantity === '' || Number.isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    errors.quantity = 'Enter a valid quantity greater than zero';
  }
  return errors;
}

export function getTotalPages(count, pageSize = 20) {
  return Math.max(1, Math.ceil(count / pageSize));
}
