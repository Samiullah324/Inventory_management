import { describe, expect, it } from 'vitest';
import { getStockStatusLabel, getTotalPages, validateProductForm } from '../utils/inventory';

describe('inventory utils', () => {
  it('maps stock status labels from backend values', () => {
    expect(getStockStatusLabel('low_stock')).toBe('Low stock');
    expect(getStockStatusLabel('out_of_stock')).toBe('Out of stock');
  });

  it('validates product form for UX feedback', () => {
    expect(validateProductForm({})).toMatchObject({
      name: expect.any(String),
      sku: expect.any(String),
      category: expect.any(String),
    });
  });

  it('calculates total pages for server pagination', () => {
    expect(getTotalPages(41, 20)).toBe(3);
    expect(getTotalPages(0, 20)).toBe(1);
  });
});
