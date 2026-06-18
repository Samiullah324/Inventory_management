import client from './client'

export async function fetchProducts() {
  const { data } = await client.get('/products/')
  return data
}

export async function createProduct(payload) {
  const { data } = await client.post('/products/', payload)
  return data
}

export async function updateProduct(id, payload) {
  const { data } = await client.put(`/products/${id}/`, payload)
  return data
}

export async function deleteProduct(id) {
  await client.delete(`/products/${id}/`)
}
